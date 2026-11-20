// Regenerates sitemap.xml from the Projects API: the home page plus one
// /projects/<slug> URL per published project (with its screenshots).
// Run after adding or editing projects, then deploy:
//   node scripts/generate-sitemap.mjs

import { writeFile } from "node:fs/promises";

const SITE = "https://monem-one.vercel.app";
const API = process.env.API_BASE_URL || "https://portfolio-api-qkqf0a.fly.dev/api";

const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const day = (d) => new Date(d || Date.now()).toISOString().slice(0, 10);

const res = await fetch(`${API}/projects?page=1&limit=50`);
if (!res.ok) throw new Error(`API responded ${res.status}`);
const body = await res.json();
// Old API: plain array; new API: { data: [...] }
const projects = Array.isArray(body) ? body : body.data ?? [];

const entry = ({ loc, lastmod, priority, images = [] }) => `  <url>
    <loc>${xml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>${images
      .filter(Boolean)
      .slice(0, 5)
      .map((src) => `\n    <image:image><image:loc>${xml(src)}</image:loc></image:image>`)
      .join("")}
  </url>`;

const urls = [
  entry({ loc: `${SITE}/`, lastmod: day(), priority: "1.0", images: [`${SITE}/assets/images/myPhoto22.jpeg`] }),
  ...projects.map((p) =>
    entry({
      loc: `${SITE}/projects/${encodeURIComponent(p.slug || p.id || p._id)}`,
      lastmod: day(p.updatedAt || p.createdAt),
      priority: p.featured ? "0.9" : "0.8",
      images: p.cover ? [p.cover] : (p.images || []).map((i) => (typeof i === "string" ? i : i.secure_url))
    })
  )
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>
`;

await writeFile(new URL("../sitemap.xml", import.meta.url), sitemap);
console.log(`sitemap.xml written: ${urls.length} URLs (${projects.length} projects)`);
