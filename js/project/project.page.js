// project.page.js — the project case-study page.
// Served at /projects/<slug> (Vercel rewrite) or /project.html?p=<slug> locally.
//
// Loaded as a classic script at the end of <body>. When the home page has
// cached the project list, the hero renders synchronously before the first
// frame, so the clicked card's cover can morph into the hero screenshot
// (cross-document View Transition, see css/main.css). The full case study
// then comes from GET /api/projects/:idOrSlug. If that endpoint doesn't
// exist yet (older API), the page falls back to the list, where old
// documents carry their full description.

(() => {
  "use strict";

  const API = window.API_BASE_URL;
  const Model = window.ProjectModel;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const root = $("#pd-root");
  const projectKey = Model.keyFromLocation();

  let projects = []; // normalized list, for prev / next
  let current = null; // { project, index, images }

  // ================= DATA =================
  async function fetchList() {
    const res = await fetch(`${API}/projects?page=1&limit=50`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Model.unwrapList(await res.json()).map(Model.normalize);
  }

  // Resolves to the full project, or null when the API has no detail
  // endpoint / doesn't know the key (the caller then falls back to the list)
  async function fetchDetail(key) {
    const res = await fetch(`${API}/projects/${encodeURIComponent(key)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const raw = body?.data && !body.title ? body.data : body;
    return raw?.title ? Model.normalize(raw) : null;
  }

  // ================= CONTENT HELPERS =================
  const LIST_MARK = /^(?:[•\-*–]|\d+[.)])\s+/;

  // Older descriptions are newline-separated highlights, prose, or both:
  // short or bulleted lines become feature cards, long lines the overview.
  function parseDescription(text = "") {
    const overview = [];
    const features = [];
    text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
      const bulleted = LIST_MARK.test(line);
      const clean = line.replace(LIST_MARK, "").trim();
      if (!bulleted && (clean.length > 140 || clean.endsWith(":"))) overview.push(clean);
      else features.push(clean);
    });
    return { overview, features };
  }

  function contentOf(project) {
    const paragraphs = project.description.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // New API: explicit features, so the description is all overview
    const raw = project.features.length
      ? { overview: paragraphs, features: project.features }
      : parseDescription(project.description);
    return {
      overview: raw.overview,
      features: raw.features.map((f) => {
        const titled = f.match(/^([^:]{2,40}):\s+(.+)$/);
        return titled ? { title: titled[1], body: titled[2] } : { title: null, body: f };
      })
    };
  }

  // "Journal Awards: Journalism Awards Management System" → title + subtitle
  function splitTitle(title = "") {
    const m = title.match(/^(.{2,40}?):\s+(.+)$/);
    return m ? { main: m[1], sub: m[2] } : { main: title, sub: "" };
  }

  const FEATURE_ICONS = [
    [/auth|login|jwt|token|password|otp|session|sign.?in/i, "lock"],
    [/role|permission|rbac|admin/i, "admin_panel_settings"],
    [/pay|stripe|paymob|fee|checkout|billing|invoice|nbe|upg/i, "payments"],
    [/cache|redis|performance|optimi/i, "bolt"],
    [/test|e2e|jest|coverage/i, "verified"],
    [/docker|deploy|container|ci\/cd/i, "deployed_code"],
    [/real.?time|websocket|socket|sse|notif|track/i, "sensors"],
    [/search|filter|pagination/i, "manage_search"],
    [/error|exception|interceptor|logging|winston|monitor/i, "bug_report"],
    [/mail|email/i, "mail"],
    [/upload|image|cloudinary|file|attachment/i, "cloud_upload"],
    [/order|cart|product|crud|catalog|inventory|stock/i, "inventory_2"],
    [/rate.?limit|helmet|cors|secur/i, "shield"],
    [/\bai\b|gpt|llm|openai|gemini/i, "smart_toy"],
    [/i18n|language|locali|translat/i, "translate"],
    [/schedul|cron|reminder|appointment|booking|reserv|cycle/i, "event"],
    [/evaluat|judg|score|criteria|rank|award|winner/i, "emoji_events"],
    [/apply|application|registration|member|onboard/i, "how_to_reg"],
    [/report|analytic|dashboard|statistic/i, "monitoring"],
    [/vendor|multi.?tenant|store|shop/i, "storefront"],
    [/swagger|openapi|rest|api/i, "api"],
    [/database|postgres|mongo|sql|prisma|drizzle|orm|schema/i, "database"],
    [/architect|modular|monorepo|clean|structure/i, "account_tree"]
  ];
  const iconFor = (text) => FEATURE_ICONS.find(([re]) => re.test(text))?.[1] || "check_circle";

  const STATUS = {
    completed: { label: "Completed", icon: "task_alt" },
    "in-progress": { label: "In progress", icon: "pending" },
    maintained: { label: "Maintained", icon: "autorenew" }
  };
  const CATEGORY = { web: "Web", mobile: "Mobile", backend: "Backend", fullstack: "Full-stack", desktop: "Desktop", other: "Other" };
  const VISIBILITY = {
    "open-source": { label: "Open source", icon: "code", note: "The source code is public." },
    nda: { label: "Under NDA", icon: "lock", note: "Built under an NDA, so the code stays private. The details below come from the real repository." },
    private: { label: "Private codebase", icon: "lock", note: "The code is private. The details below come from the real repository." }
  };

  const monthYear = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "");
  const compact = (n) => new Intl.NumberFormat("en", { notation: "compact" }).format(n || 0);

  function timeline(duration, status) {
    if (!duration) return null;
    const start = new Date(duration.start);
    const end = duration.end ? new Date(duration.end) : null;
    if (Number.isNaN(start.getTime())) return null;
    const sameYear = end && start.getFullYear() === end.getFullYear();
    const short = (d, year) => d.toLocaleDateString("en-US", { month: "short", ...(year ? { year: "numeric" } : {}) });
    const range = end ? `${short(start, !sameYear)} – ${short(end, true)}` : `${short(start, true)} – ${status === "completed" ? "" : "Present"}`;
    const months = Math.max(1, Math.round(((end || new Date()) - start) / (30.44 * 864e5)));
    const length = months >= 12 ? `${+(months / 12).toFixed(1)} years` : `${months} month${months > 1 ? "s" : ""}`;
    return { range, length };
  }

  const projectUrl = (p) => Model.url(p);

  const GITHUB_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>`;

  // ================= RENDER =================
  // `partial`: only the overview fields are known yet (from the cached list)
  function render(project, { partial = false } = {}) {
    const index = projects.findIndex((p) => p.id === project.id);
    const images = project.images.length ? project.images : project.cover ? [project.cover] : [];
    current = { project, index, images };

    const content = contentOf(project);
    const { main, sub } = splitTitle(project.title);
    const lead = project.summary || content.overview[0] || "";
    const time = timeline(project.duration, project.status);
    const visibility = VISIBILITY[project.visibility];

    document.title = `${project.title} — Monem Adawy`;
    $('meta[name="description"]')?.setAttribute("content", lead);
    $('meta[property="og:title"]')?.setAttribute("content", `${project.title} — Monem Adawy`);
    if (project.cover) $('meta[property="og:image"]')?.setAttribute("content", project.cover);

    let n = 0;
    const num = () => pad(++n);

    root.innerHTML = `
      <section class="pd-hero">
        <div class="pd-hero-top pd-in" style="--i:0">
          <p class="eyebrow">Case study${index >= 0 ? ` · ${pad(index + 1)}` : ""}</p>
          ${badges(project, visibility)}
        </div>
        <h1 class="pd-title pd-in" style="--i:1">${esc(main)}</h1>
        ${sub ? `<p class="pd-subtitle pd-in" style="--i:2">${esc(sub)}</p>` : ""}
        ${lead ? `<p class="pd-lead pd-in" style="--i:2">${esc(lead)}</p>` : ""}

        <div class="pd-actions pd-in" style="--i:3">
          ${project.links.live ? `<a class="btn btn-primary" href="${esc(project.links.live)}" target="_blank" rel="noopener">Live demo <span class="material-symbols-outlined">north_east</span></a>` : ""}
          ${project.links.github ? `<a class="btn ${project.links.live ? "btn-ghost" : "btn-primary"}" href="${esc(project.links.github)}" target="_blank" rel="noopener">${GITHUB_SVG} Source code</a>` : ""}
          ${project.proof?.demoVideoUrl ? `<a class="btn btn-ghost" href="${esc(project.proof.demoVideoUrl)}" target="_blank" rel="noopener">Watch demo <span class="material-symbols-outlined">play_circle</span></a>` : ""}
          ${images.length ? `<button type="button" class="btn btn-ghost" data-open="0">Screenshots <span class="material-symbols-outlined">photo_library</span></button>` : ""}
        </div>

        ${statsRow(project, content, images, time)}
      </section>

      ${
        project.metrics.length
          ? `<section class="pd-metrics pd-in" style="--i:5" aria-label="Results">
               ${project.metrics.map((m) => `
                 <div class="pd-metric">
                   <span class="pd-metric-value">${esc(m.value)}</span>
                   <span class="pd-metric-label">${esc(m.label)}</span>
                 </div>`).join("")}
             </section>`
          : ""
      }

      <section class="pd-showcase pd-in" style="--i:5" aria-label="Screenshots">
        <div class="pd-frame">
          <div class="pd-frame-bar">
            <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
            <span class="pd-frame-url mono-label">${esc(project.title)}</span>
            ${images.length > 1 ? `<span class="pd-frame-count mono-label" id="pd-frame-count">01 / ${pad(images.length)}</span>` : ""}
          </div>
          ${
            images.length
              ? `<button type="button" class="pd-frame-screen" data-open="current" aria-label="View screenshot fullscreen"
                   ${project.cover ? `style="background-image:url('${esc(project.cover).replace(/'/g, "%27")}')"` : ""}>
                   <span class="pd-frame-backdrop" aria-hidden="true"></span>
                   <img id="pd-hero-img" src="${esc(images[0])}" alt="${esc(project.title)} screenshot 1" fetchpriority="high"/>
                   <span class="pd-frame-zoom"><span class="material-symbols-outlined">open_in_full</span></span>
                 </button>`
              : `<div class="pd-frame-screen pd-frame-empty"><span>${esc(main)}</span></div>`
          }
        </div>
        ${
          images.length > 1
            ? `<div class="pd-thumbs" role="tablist" aria-label="Choose screenshot">
                 ${images.map((src, i) => `
                   <button type="button" class="pd-thumb ${i === 0 ? "is-active" : ""}" data-thumb="${i}" role="tab" aria-selected="${i === 0}" aria-label="Screenshot ${i + 1}">
                     <img src="${esc(src)}" alt="" loading="lazy"/>
                   </button>`).join("")}
               </div>`
            : ""
        }
      </section>

      <div class="pd-body">
        <div class="pd-main">
          ${
            partial
              ? `<div aria-busy="true">${'<div class="skeleton pd-sk"></div>'.repeat(3)}<div class="skeleton pd-sk" style="width:60%"></div></div>`
              : [
                  content.overview.length &&
                    `<section class="pd-section reveal">
                       <h2 class="pd-h2"><span class="mono-label">${num()}</span> Overview</h2>
                       <div class="pd-prose">${content.overview.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
                     </section>`,

                  (project.problem || project.solution) &&
                    `<section class="pd-section">
                       <h2 class="pd-h2 reveal"><span class="mono-label">${num()}</span> The challenge</h2>
                       <div class="pd-ps">
                         ${project.problem ? `<article class="glass pd-ps-card pd-ps-problem reveal"><span class="pd-ps-tag mono-label"><span class="material-symbols-outlined">report</span>Problem</span><p>${esc(project.problem)}</p></article>` : ""}
                         ${project.problem && project.solution ? `<span class="pd-ps-arrow material-symbols-outlined" aria-hidden="true">arrow_forward</span>` : ""}
                         ${project.solution ? `<article class="glass pd-ps-card pd-ps-solution reveal" style="--d:.08s"><span class="pd-ps-tag mono-label"><span class="material-symbols-outlined">lightbulb</span>Solution</span><p>${esc(project.solution)}</p></article>` : ""}
                       </div>
                     </section>`,

                  content.features.length &&
                    `<section class="pd-section">
                       <h2 class="pd-h2 reveal"><span class="mono-label">${num()}</span> What I built</h2>
                       <div class="pd-features">
                         ${content.features.map((f, i) => `
                           <article class="glass spot pd-feature reveal" style="--d:${(i % 2) * 0.06}s">
                             <span class="bento-icon"><span class="material-symbols-outlined">${iconFor(`${f.title || ""} ${f.body}`)}</span></span>
                             <div>
                               ${f.title ? `<h3>${esc(f.title)}</h3>` : ""}
                               <p class="${f.title ? "" : "pd-feature-solo"}">${esc(f.body)}</p>
                             </div>
                             <span class="pd-feature-num mono-label">${pad(i + 1)}</span>
                           </article>`).join("")}
                       </div>
                     </section>`,

                  project.challenges.length &&
                    `<section class="pd-section">
                       <h2 class="pd-h2 reveal"><span class="mono-label">${num()}</span> Hard problems solved</h2>
                       <ol class="pd-challenges">
                         ${project.challenges.map((c, i) => `
                           <li class="glass pd-challenge reveal">
                             <span class="pd-challenge-num mono-label">${pad(i + 1)}</span>
                             <div>
                               <h3>${esc(c.challenge)}</h3>
                               ${c.approach ? `<p><span class="mono-label">Approach</span>${esc(c.approach)}</p>` : ""}
                             </div>
                           </li>`).join("")}
                       </ol>
                     </section>`,

                  project.architectureImage &&
                    `<section class="pd-section reveal">
                       <h2 class="pd-h2"><span class="mono-label">${num()}</span> Architecture</h2>
                       <button type="button" class="glass pd-arch" data-open-arch aria-label="View architecture diagram fullscreen">
                         <img src="${esc(project.architectureImage)}" alt="${esc(project.title)} architecture diagram" loading="lazy"/>
                         <span class="pd-frame-zoom"><span class="material-symbols-outlined">open_in_full</span></span>
                       </button>
                     </section>`,

                  project.techStack.length &&
                    `<section class="pd-section reveal">
                       <h2 class="pd-h2"><span class="mono-label">${num()}</span> Tech stack</h2>
                       <ul class="pd-stack">${project.techStack.map((t) => `<li class="chip">${esc(t)}</li>`).join("")}</ul>
                     </section>`,

                  project.proof?.testimonial && testimonial(project.proof.testimonial)
                ].filter(Boolean).join("")
          }
        </div>

        <aside class="pd-side">
          ${proofCard(project, visibility)}
          <div class="glass pd-card reveal">
            <div class="pd-card-head"><span class="mono-label">Interested?</span></div>
            <p class="pd-card-text">I'm open to backend roles and freelance work. Let's talk about what you're building.</p>
            <a class="btn btn-primary pd-card-btn" href="/#contact">Get in touch <span class="material-symbols-outlined">arrow_forward</span></a>
          </div>
        </aside>
      </div>

      ${renderPager(index)}
    `;

    syncTopbar(index);
    fitStage();
    observeReveals();
    // Later re-renders (fresh data) shouldn't replay the entrance animation
    root.dataset.settled = "";
  }

  function badges(project, visibility) {
    const items = [];
    if (project.verified) items.push(`<span class="pd-badge pd-badge-verified"><span class="material-symbols-outlined">verified</span>Verified</span>`);
    const status = STATUS[project.status];
    if (status) items.push(`<span class="pd-badge pd-badge-${esc(project.status)}"><span class="material-symbols-outlined">${status.icon}</span>${status.label}</span>`);
    if (CATEGORY[project.category]) items.push(`<span class="pd-badge">${CATEGORY[project.category]}</span>`);
    if (visibility) items.push(`<span class="pd-badge"><span class="material-symbols-outlined">${visibility.icon}</span>${visibility.label}</span>`);
    return items.length ? `<div class="pd-badges">${items.join("")}</div>` : "";
  }

  // Up to four facts, the most telling ones first
  function statsRow(project, content, images, time) {
    const stats = [
      project.role && { label: "Role", value: project.role },
      project.teamSize && { label: "Team", value: project.teamSize === 1 ? "Solo" : `${project.teamSize} people` },
      time && { label: "Timeline", value: time.length, note: time.range },
      project.client && { label: "Client", value: project.client },
      content.features.length && { label: "Key features", value: content.features.length },
      project.techStack.length && { label: "Technologies", value: project.techStack.length },
      project.images.length && { label: "Screenshots", value: project.images.length },
      project.createdAt && { label: "Added", value: monthYear(project.createdAt) }
    ].filter(Boolean).slice(0, 4);
    if (!stats.length) return "";
    return `
      <dl class="pd-stats pd-in" style="--i:4">
        ${stats.map((s) => `
          <div class="pd-stat">
            <dt>${esc(s.label)}</dt>
            <dd class="${String(s.value).length > 12 ? "pd-stat-text" : ""}">${esc(s.value)}</dd>
            ${s.note ? `<span class="pd-stat-note mono-label">${esc(s.note)}</span>` : ""}
          </div>`).join("")}
      </dl>`;
  }

  function proofCard(project, visibility) {
    const proof = project.proof;
    const facts = proof
      ? [
          proof.commitsCount != null && { icon: "commit", label: "Commits", value: compact(proof.commitsCount) },
          proof.lastCommitSha && { icon: "tag", label: "Last commit", value: proof.lastCommitSha.slice(0, 7), mono: true },
          proof.firstCommitAt && { icon: "flag", label: "First commit", value: monthYear(proof.firstCommitAt) },
          proof.lastCommitAt && { icon: "schedule", label: "Latest", value: monthYear(proof.lastCommitAt) }
        ].filter(Boolean)
      : [];
    const langs = proof?.languages || [];
    if (!facts.length && !langs.length && !project.verified && !visibility) return "";

    const total = langs.reduce((a, l) => a + l.percent, 0) || 100;
    const COLORS = ["#4f9cf9", "#3fff8b", "#a78bfa", "#ffcb6b", "#7ae6ff", "#ff8fa3"];

    return `
      <div class="glass pd-card pd-proof reveal">
        <div class="pd-card-head pd-proof-head">
          <span class="mono-label">Proof of work</span>
          ${project.verified ? `<span class="pd-badge pd-badge-verified"><span class="material-symbols-outlined">verified</span>Verified</span>` : ""}
        </div>
        ${visibility ? `<p class="pd-card-text"><span class="material-symbols-outlined pd-inline-icon">${visibility.icon}</span>${esc(visibility.note)}</p>` : ""}
        ${
          facts.length
            ? `<dl class="pd-facts">
                 ${facts.map((f) => `
                   <div class="pd-fact">
                     <span class="material-symbols-outlined">${f.icon}</span>
                     <dt>${esc(f.label)}</dt>
                     <dd class="${f.mono ? "mono" : ""}">${esc(f.value)}</dd>
                   </div>`).join("")}
               </dl>`
            : ""
        }
        ${
          langs.length
            ? `<div class="pd-sub">
                 <div class="pd-sub-title mono-label">Languages</div>
                 <div class="pd-langbar" role="img" aria-label="${esc(langs.map((l) => `${l.name} ${l.percent}%`).join(", "))}">
                   ${langs.map((l, i) => `<span style="--w:${(l.percent / total) * 100}%;--c:${COLORS[i % COLORS.length]}"></span>`).join("")}
                 </div>
                 <ul class="pd-langs">
                   ${langs.map((l, i) => `<li><i style="--c:${COLORS[i % COLORS.length]}"></i>${esc(l.name)} <span>${esc(l.percent)}%</span></li>`).join("")}
                 </ul>
               </div>`
            : ""
        }
      </div>`;
  }

  function testimonial(t) {
    const who = [t.author, t.role].filter(Boolean).map(esc).join(" · ");
    return `
      <section class="pd-section reveal">
        <figure class="glass pd-quote">
          <span class="pd-quote-mark" aria-hidden="true">“</span>
          <blockquote>${esc(t.quote)}</blockquote>
          ${
            who
              ? `<figcaption>
                   ${t.linkedin ? `<a href="${esc(t.linkedin)}" target="_blank" rel="noopener">${who} <span class="material-symbols-outlined">north_east</span></a>` : who}
                 </figcaption>`
              : ""
          }
        </figure>
      </section>`;
  }

  function neighbours(index) {
    const n = projects.length;
    if (index < 0 || n < 2) return {};
    return { prev: projects[(index - 1 + n) % n], next: projects[(index + 1) % n] };
  }

  function renderPager(index) {
    const { prev, next } = neighbours(index);
    if (!prev) return "";
    const card = (p, dir) => `
      <a class="pd-pager-card pd-pager-${dir} glass spot" href="${projectUrl(p)}">
        ${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy"/>` : ""}
        <span class="pd-pager-label mono-label">
          ${dir === "prev" ? `<span class="material-symbols-outlined">arrow_back</span> Previous` : `Next project <span class="material-symbols-outlined">arrow_forward</span>`}
        </span>
        <span class="pd-pager-title">${esc(splitTitle(p.title).main)}</span>
      </a>`;
    return `<nav class="pd-pager reveal" aria-label="More projects">${card(prev, "prev")}${card(next, "next")}</nav>`;
  }

  function syncTopbar(index) {
    const { prev, next } = neighbours(index);
    $("#pd-counter").textContent = index >= 0 ? `${pad(index + 1)} / ${pad(projects.length)}` : "";
    [["#pd-prev-mini", prev], ["#pd-next-mini", next]].forEach(([sel, p]) => {
      const el = $(sel);
      el.hidden = !p;
      if (p) {
        el.href = projectUrl(p);
        el.title = p.title;
      }
    });
  }

  function renderMessage(icon, title, text, retry = false) {
    document.title = `${title} — Monem Adawy`;
    root.innerHTML = `
      <section class="pd-message">
        <span class="material-symbols-outlined">${icon}</span>
        <h1>${esc(title)}</h1>
        <p>${esc(text)}</p>
        <div class="pd-actions">
          ${retry ? `<button type="button" class="btn btn-primary" onclick="location.reload()">Try again <span class="material-symbols-outlined">refresh</span></button>` : ""}
          <a class="btn btn-ghost" href="/#projects"><span class="material-symbols-outlined">arrow_back</span> All projects</a>
        </div>
      </section>`;
  }

  function renderSkeleton() {
    root.innerHTML = `
      <section class="pd-hero" aria-busy="true">
        <div class="skeleton" style="height:.9rem;width:9rem;margin-bottom:1.6rem"></div>
        <div class="skeleton" style="height:4rem;width:min(38rem,90%);margin-bottom:1.4rem"></div>
        <div class="skeleton" style="height:1.1rem;width:min(44rem,100%);margin-bottom:.6rem"></div>
        <div class="skeleton" style="height:1.1rem;width:min(30rem,80%)"></div>
      </section>
      <section class="pd-showcase"><div class="pd-frame"><div class="pd-frame-bar"></div><div class="pd-frame-screen skeleton" style="border-radius:0"></div></div></section>`;
  }

  // ================= SHOWCASE + LIGHTBOX =================
  let shown = 0;
  let portrait = false;

  // Phone screenshots would be cropped to a sliver in a 16:9 frame, so
  // tall images switch the stage to "contain" on a blurred backdrop
  function fitStage() {
    shown = 0;
    const img = $("#pd-hero-img");
    if (!img) return;
    const apply = () => {
      if (!img.naturalWidth) return;
      portrait = img.naturalHeight > img.naturalWidth * 0.9;
      img.closest(".pd-frame-screen").classList.toggle("is-portrait", portrait);
      $(".pd-thumbs")?.classList.toggle("is-portrait", portrait);
      setBackdrop(img.src);
    };
    img.complete ? apply() : img.addEventListener("load", apply, { once: true });
  }

  function setBackdrop(src) {
    $(".pd-frame-backdrop")?.style.setProperty("--shot", `url("${src.replace(/"/g, "%22")}")`);
  }

  function showOnStage(i) {
    const img = $("#pd-hero-img");
    if (!img || !current?.images[i]) return;
    shown = i;
    img.classList.add("is-swapping");
    const next = new Image();
    next.src = current.images[i];
    const swap = () => {
      img.src = current.images[i];
      img.alt = `${current.project.title} screenshot ${i + 1}`;
      img.classList.remove("is-swapping");
      if (portrait) setBackdrop(img.src);
    };
    next.decode ? next.decode().then(swap, swap) : (next.onload = swap);

    $$(".pd-thumb").forEach((t, n) => {
      t.classList.toggle("is-active", n === i);
      t.setAttribute("aria-selected", n === i);
    });
    $(`.pd-thumb[data-thumb="${i}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    const count = $("#pd-frame-count");
    if (count) count.textContent = `${pad(i + 1)} / ${pad(current.images.length)}`;
  }

  const lightbox = $("#pd-lightbox");
  let lb = { images: [], label: "screenshot", syncStage: false };
  let lbIndex = 0;

  function openLightbox(images, i, { label = "screenshot", syncStage = false, tall = false } = {}) {
    if (!images.length) return;
    lb = { images, label, syncStage };
    lbIndex = i;
    $("#pd-lb-thumbs").innerHTML = images
      .map((src, n) => `<button type="button" data-lb-go="${n}" aria-label="${esc(label)} ${n + 1}"><img src="${esc(src)}" alt="" loading="lazy"/></button>`)
      .join("");
    lightbox.classList.toggle("is-single", images.length < 2);
    $("#pd-lb-thumbs").classList.toggle("is-portrait", tall);
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add("open"));
    document.body.classList.add("modal-open");
    updateLightbox();
    $('[data-lb="close"]', lightbox).focus();
  }

  function closeLightbox() {
    if (lightbox.hidden) return;
    lightbox.classList.remove("open");
    document.body.classList.remove("modal-open");
    setTimeout(() => { lightbox.hidden = true; }, 300);
    if (lb.syncStage) showOnStage(lbIndex);
  }

  function stepLightbox(delta) {
    const n = lb.images.length;
    lbIndex = (lbIndex + delta + n) % n;
    updateLightbox();
  }

  function updateLightbox() {
    const img = $("#pd-lb-image");
    img.style.animation = "none";
    void img.offsetWidth;
    img.style.animation = "";
    img.src = lb.images[lbIndex];
    img.alt = `${current?.project.title || ""} ${lb.label} ${lbIndex + 1}`;
    $("#pd-lb-counter").textContent = `${pad(lbIndex + 1)} / ${pad(lb.images.length)}`;
    $$("#pd-lb-thumbs button").forEach((b, n) => b.classList.toggle("is-active", n === lbIndex));
    $(`#pd-lb-thumbs [data-lb-go="${lbIndex}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }

  lightbox.addEventListener("click", (e) => {
    const action = e.target.closest("[data-lb]")?.dataset.lb;
    const go = e.target.closest("[data-lb-go]")?.dataset.lbGo;
    if (action === "close" || e.target === lightbox || e.target.classList.contains("pd-lightbox-stage")) closeLightbox();
    else if (action === "prev") stepLightbox(-1);
    else if (action === "next") stepLightbox(1);
    else if (go !== undefined) { lbIndex = Number(go); updateLightbox(); }
  });

  // Swipe between images on touch screens
  let touchX = null;
  lightbox.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
    touchX = null;
  });

  root.addEventListener("click", (e) => {
    if (!current) return;
    const thumb = e.target.closest("[data-thumb]");
    if (thumb) return showOnStage(Number(thumb.dataset.thumb));
    const open = e.target.closest("[data-open]");
    if (open) {
      const i = open.dataset.open === "current" ? shown : Number(open.dataset.open);
      return openLightbox(current.images, i, { syncStage: true, tall: portrait });
    }
    if (e.target.closest("[data-open-arch]")) {
      openLightbox([current.project.architectureImage], 0, { label: "architecture diagram" });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!lightbox.hidden) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") stepLightbox(1);
      if (e.key === "ArrowLeft") stepLightbox(-1);
      return;
    }
    // Arrow keys flip between projects
    if (current && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const { prev, next } = neighbours(current.index);
      const target = e.key === "ArrowRight" ? next : prev;
      if (target) location.href = projectUrl(target);
    }
  });

  // ================= EFFECTS =================
  let revealObserver = null;
  function observeReveals() {
    const items = $$(".reveal:not(.is-in)", root);
    if (reducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    revealObserver ??= new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    items.forEach((el) => revealObserver.observe(el));
  }

  function initEffects() {
    const progress = $("#scroll-progress");
    const topbar = $("#pd-topbar");
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      topbar.classList.toggle("scrolled", scrollY > 30);
      ticking = false;
    };
    addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();

    if (reducedMotion || !matchMedia("(pointer: fine)").matches) return;
    const glow = $("#cursor-glow");
    document.body.classList.add("has-pointer");
    let gx = 0, gy = 0, tx = 0, ty = 0;
    const loop = () => {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.addEventListener("pointermove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
      const card = e.target.closest?.(".spot");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
    }, { passive: true });
  }

  // "All projects" returns to the home page entry in history when there is
  // one, so the visitor lands back where they were (and the cover morphs
  // back into its card) instead of reloading the home page from the top.
  $("#pd-back").addEventListener("click", (e) => {
    const nav = window.navigation;
    if (!nav?.entries || !nav.currentEntry) return;
    const entries = nav.entries();
    for (let i = nav.currentEntry.index - 1; i >= 0; i--) {
      if (!entries[i].url) break;
      const u = new URL(entries[i].url);
      if (u.origin !== location.origin) break;
      if (Model.isProjectUrl(u)) continue;
      if (/^\/(index\.html)?$/.test(u.pathname)) {
        e.preventDefault();
        nav.traverseTo(entries[i].key);
      }
      break;
    }
  });

  // Old ?id= links become the clean slug URL once the slug is known
  function canonicalize(project) {
    const wanted = Model.url(project);
    const here = location.pathname + location.search;
    if (project.slug && here !== wanted) history.replaceState(history.state, "", wanted + location.hash);
  }

  // ================= BOOT =================
  $("#pd-year").textContent = new Date().getFullYear();
  initEffects();

  if (!projectKey) {
    renderMessage("folder_open", "No project selected", "Pick a project from the portfolio to see its details.");
    return;
  }

  projects = Model.readListCache() || [];
  const cached = projects.find((p) => Model.matches(p, projectKey));
  if (cached) render(cached, { partial: !cached.detailed }); // synchronous: before the first frame
  else renderSkeleton();

  Promise.allSettled([fetchDetail(projectKey), fetchList()]).then(([detail, list]) => {
    if (list.status === "fulfilled" && list.value.length) {
      projects = list.value;
      Model.writeListCache(projects);
    }
    const project =
      (detail.status === "fulfilled" && detail.value) ||
      projects.find((p) => Model.matches(p, projectKey));

    if (project) {
      render(project);
      canonicalize(project);
    } else if (detail.status === "rejected" && list.status === "rejected") {
      console.error("Error loading project:", detail.reason, list.reason);
      if (!cached) renderMessage("cloud_off", "Couldn't load this project", "The portfolio API didn't respond. Please try again in a moment.", true);
    } else {
      renderMessage("search_off", "Project not found", "This project may have been renamed, unpublished or removed.");
    }
  });
})();
