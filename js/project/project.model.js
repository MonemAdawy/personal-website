// project.model.js — one shape for a project, whatever the API returns.
//
// The Projects API is moving to a new format (see the "Projects API" doc):
//   GET /api/projects             → { data: [...overview], total, page, limit, pages }
//   GET /api/projects/:idOrSlug   → full case study
// The old API returned a plain array of full documents with
// images: [{ secure_url, public_id }]. normalize() accepts both, so the site
// keeps working before, during and after the backend deploy.
//
// Loaded as a classic script (before main.js and project.page.js) and
// exposed as window.ProjectModel.

(() => {
  "use strict";

  const LIST_CACHE_KEY = "portfolio:projects:v2";

  const text = (v) => (typeof v === "string" ? v.trim() : "");
  const list = (v) => (Array.isArray(v) ? v : []);
  const imageUrl = (img) => (typeof img === "string" ? img : img?.secure_url || "");

  function normalize(raw = {}) {
    const images = list(raw.images).map(imageUrl).filter(Boolean);
    const description = text(raw.description);
    const proof = raw.proof && typeof raw.proof === "object" ? raw.proof : null;

    return {
      id: String(raw.id || raw._id || ""),
      slug: text(raw.slug),
      title: text(raw.title) || "Untitled project",
      summary: text(raw.summary) || summarize(description),
      description,
      cover: text(raw.cover) || images[0] || "",
      images,
      techStack: list(raw.techStack).map(text).filter(Boolean),
      category: text(raw.category),
      status: text(raw.status),
      featured: Boolean(raw.featured),
      visibility: text(raw.visibility),
      verified: Boolean(raw.verified ?? proof?.verified),
      links: {
        live: text(raw.links?.live),
        // The new API only sends github for open-source projects
        github: text(raw.links?.github)
      },
      problem: text(raw.problem),
      solution: text(raw.solution),
      features: list(raw.features).map(text).filter(Boolean),
      challenges: list(raw.challenges)
        .map((c) => ({ challenge: text(c?.challenge), approach: text(c?.approach) }))
        .filter((c) => c.challenge),
      role: text(raw.role),
      teamSize: Number(raw.teamSize) || 0,
      duration: raw.duration?.start ? { start: raw.duration.start, end: raw.duration.end || null } : null,
      metrics: list(raw.metrics)
        .map((m) => ({ label: text(m?.label), value: text(String(m?.value ?? "")) }))
        .filter((m) => m.label && m.value),
      architectureImage: imageUrl(raw.architectureImage),
      client: typeof raw.client === "string" ? text(raw.client) : text(raw.client?.displayName),
      proof: proof
        ? {
            commitsCount: Number.isFinite(proof.commitsCount) ? proof.commitsCount : null,
            firstCommitAt: proof.firstCommitAt || null,
            lastCommitAt: proof.lastCommitAt || null,
            lastCommitSha: text(proof.lastCommitSha),
            languages: list(proof.languages)
              .map((l) => ({ name: text(l?.name), percent: Number(l?.percent) || 0 }))
              .filter((l) => l.name && l.percent > 0),
            demoVideoUrl: text(proof.demoVideoUrl),
            testimonial: text(proof.testimonial?.quote)
              ? {
                  quote: text(proof.testimonial.quote),
                  author: text(proof.testimonial.author),
                  role: text(proof.testimonial.role),
                  linkedin: text(proof.testimonial.linkedin)
                }
              : null
          }
        : null,
      createdAt: raw.createdAt || null,
      // Overview items from the new list endpoint carry no description
      detailed: Boolean(description)
    };
  }

  function summarize(description) {
    const firstLine = description.split(/\r?\n/).map((l) => l.replace(/^[\s•\-*]+/, "").trim()).find(Boolean) || "";
    return firstLine.length > 200 ? `${firstLine.slice(0, 200).replace(/\s+\S*$/, "")}…` : firstLine;
  }

  // Accepts the old array response and the new { data } envelope
  function unwrapList(body) {
    return Array.isArray(body) ? body : list(body?.data);
  }

  const keyOf = (p) => p.slug || p.id;
  const matches = (p, key) => Boolean(key) && (p.slug === key || p.id === key);

  // Clean /projects/<slug> links are served by a Vercel rewrite. Plain static
  // servers used for local development can't rewrite, so locally the page is
  // addressed as /project.html?p=<slug>.
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";

  function url(p) {
    const key = encodeURIComponent(keyOf(p));
    return isLocal ? `/project.html?p=${key}` : `/projects/${key}`;
  }

  // The project key from the current URL: /projects/<key>, ?p=<key> or the
  // older ?id=<id> links
  function keyFromLocation(loc = location) {
    const u = loc instanceof URL ? loc : new URL(loc.href);
    const fromPath = u.pathname.match(/^\/projects\/([^/]+)\/?$/)?.[1];
    const key = fromPath || u.searchParams.get("p") || u.searchParams.get("id");
    return key ? decodeURIComponent(key) : null;
  }

  const isProjectUrl = (u) => /^\/projects\/[^/]+\/?$|\/project(\.html)?$/.test(u.pathname);

  function readListCache() {
    try {
      const items = JSON.parse(sessionStorage.getItem(LIST_CACHE_KEY) || "null")?.items;
      return Array.isArray(items) && items.length ? items : null;
    } catch {
      return null;
    }
  }

  function writeListCache(items) {
    try {
      sessionStorage.setItem(LIST_CACHE_KEY, JSON.stringify({ items, at: Date.now() }));
    } catch { /* storage full or blocked: pages just fetch */ }
  }

  window.ProjectModel = { normalize, unwrapList, keyOf, matches, url, keyFromLocation, isProjectUrl, readListCache, writeListCache };
})();
