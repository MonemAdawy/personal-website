// Sends scripts/projects-content.json to the Projects API (PATCH /api/projects/:id).
//
// Needs the NEW Projects API to be deployed (the old one drops unknown fields).
//
// Usage (Node 18+), from the repo root:
//   node scripts/update-projects.mjs                  # dry run: validate and print what would be sent
//   API_TOKEN=<token cookie> node scripts/update-projects.mjs --apply
//   ADMIN_USERNAME=... ADMIN_PASSWORD=... node scripts/update-projects.mjs --apply
//
// API_TOKEN is the value of the "token" cookie you get after logging in to the
// admin dashboard (DevTools → Application → Cookies). Never commit it.

import { readFile } from "node:fs/promises";

const API = process.env.API_BASE_URL || "https://portfolio-api-qkqf0a.fly.dev/api";
const APPLY = process.argv.includes("--apply");

// Sent as JSON strings in multipart/form-data, per the API doc
const JSON_FIELDS = ["links", "client", "duration", "proof", "challenges", "metrics", "techStack", "features"];
const CATEGORIES = ["web", "mobile", "backend", "fullstack", "desktop", "other"];
const STATUSES = ["completed", "in-progress", "maintained"];
const VISIBILITIES = ["open-source", "private", "nda"];

const { projects } = JSON.parse(await readFile(new URL("./projects-content.json", import.meta.url), "utf8"));

function validate(id, p) {
  const problems = [];
  if (!/^[a-f0-9]{24}$/.test(id)) problems.push("key is not a Mongo id");
  if (!p.title) problems.push("title missing");
  if (p.summary && p.summary.length > 200) problems.push(`summary is ${p.summary.length} chars (max 200)`);
  if (p.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) problems.push("slug must be kebab-case");
  if (p.category && !CATEGORIES.includes(p.category)) problems.push(`bad category ${p.category}`);
  if (p.status && !STATUSES.includes(p.status)) problems.push(`bad status ${p.status}`);
  if (p.visibility && !VISIBILITIES.includes(p.visibility)) problems.push(`bad visibility ${p.visibility}`);
  if (p.teamSize != null && !(Number.isInteger(p.teamSize) && p.teamSize >= 1)) problems.push("teamSize must be an integer ≥ 1");
  (p.challenges || []).forEach((c, i) => { if (!c.challenge || !c.approach) problems.push(`challenge ${i + 1} needs challenge + approach`); });
  (p.proof?.languages || []).forEach((l) => { if (!(l.percent >= 0 && l.percent <= 100)) problems.push(`language ${l.name} percent out of range`); });
  if (p.proof?.lastCommitSha && !/^[0-9a-f]{7,40}$/i.test(p.proof.lastCommitSha)) problems.push("lastCommitSha must be 7–40 hex chars");
  return problems;
}

function toFormData(p) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(p)) {
    if (value === undefined || value === null) continue;
    fd.append(key, JSON_FIELDS.includes(key) ? JSON.stringify(value) : String(value));
  }
  return fd;
}

async function getToken() {
  if (process.env.API_TOKEN) return process.env.API_TOKEN;
  // the API logs in with a username (ADMIN_USERNAME on the server), not an email
  const { ADMIN_USERNAME: username, ADMIN_PASSWORD: password } = process.env;
  if (!username || !password) throw new Error("Set API_TOKEN, or ADMIN_USERNAME and ADMIN_PASSWORD");
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(`Login failed: HTTP ${res.status} ${await res.text()}`);
  const token = (res.headers.getSetCookie?.() || [res.headers.get("set-cookie") || ""])
    .map((c) => c.match(/(?:^|;\s*)token=([^;]+)/)?.[1])
    .find(Boolean);
  if (!token) throw new Error("Login succeeded but no token cookie came back");
  return token;
}

// ---- validate everything first ----
let invalid = false;
for (const [id, p] of Object.entries(projects)) {
  const problems = validate(id, p);
  if (problems.length) {
    invalid = true;
    console.error(`✗ ${p.title || id}: ${problems.join("; ")}`);
  }
}
if (invalid) process.exit(1);
console.log(`✓ ${Object.keys(projects).length} projects valid`);

if (!APPLY) {
  for (const [id, p] of Object.entries(projects)) {
    console.log(`\nPATCH ${API}/projects/${id}  (${p.title})`);
    for (const [k, v] of Object.entries(p)) {
      const shown = JSON_FIELDS.includes(k) ? JSON.stringify(v) : String(v);
      console.log(`  ${k} = ${shown.length > 110 ? shown.slice(0, 107) + "..." : shown}`);
    }
  }
  console.log("\nDry run only. Add --apply to send.");
  process.exit(0);
}

// ---- make sure the new API is live ----
const probe = await fetch(`${API}/projects?page=1&limit=1`).then((r) => r.json()).catch(() => null);
if (!probe || Array.isArray(probe) || !("data" in probe)) {
  console.error("The API still returns the old format. Deploy the new Projects API first; the old one would drop these fields.");
  process.exit(1);
}

const token = await getToken();
let failed = 0;
for (const [id, p] of Object.entries(projects)) {
  const res = await fetch(`${API}/projects/${id}`, { method: "PATCH", headers: { Cookie: `token=${token}` }, body: toFormData(p) });
  if (res.ok) console.log(`✓ ${p.title}`);
  else {
    failed++;
    console.error(`✗ ${p.title}: HTTP ${res.status} ${await res.text()}`);
  }
}
process.exit(failed ? 1 : 0);
