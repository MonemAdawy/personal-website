import { createPager, mountLoadMore } from "../utils/paginate.js";

const ACCENTS = ["#3fff8b", "#7ae6ff", "#a78bfa", "#74fbbb", "#ffcb6b", "#ff8fa3"];

function getIcon(name) {
  const n = name.toLowerCase();

  if (n.includes("language")) return "code_blocks";
  if (n.includes("backend")) return "dns";
  if (n.includes("data") || n.includes("mongo") || n.includes("sql")) return "database";
  if (n.includes("redis") || n.includes("cach")) return "memory";
  if (n.includes("cloud") || n.includes("aws")) return "cloud";
  if (n.includes("devops") || n.includes("ci") || n.includes("docker")) return "deployed_code";
  if (n.includes("test")) return "verified";
  if (n.includes("api")) return "api";
  if (n.includes("security") || n.includes("auth")) return "shield_lock";
  if (n.includes("front")) return "web";
  if (n.includes("tool") || n.includes("version")) return "construction";
  if (n.includes("soft") || n.includes("team")) return "groups";

  return "terminal";
}

const PAGE_SIZE = 6;
const loadedSkills = [];

export async function loadSkills() {
  const skillsGrid = document.getElementById("skills-grid");

  if (!skillsGrid) return;

  const pager = createPager("/skill", PAGE_SIZE);
  try {
    const first = await pager.next();
    skillsGrid.innerHTML = "";
    showSkills(first);
    mountLoadMore(document.getElementById("skills-actions"), skillsGrid, pager, showSkills, "More skills");
  } catch (err) {
    console.error("Error loading skills:", err);
    skillsGrid.innerHTML = `
      <div class="glass p-8 sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
        ${["Node.js", "NestJS", "Express.js", "TypeScript", "PostgreSQL", "MongoDB", "MySQL", "Redis", "Docker", "Kafka", "JWT / OAuth", "Unit Testing"]
          .map((s) => `<span class="chip">${s}</span>`)
          .join("")}
      </div>`;
  }
}

function showSkills({ items }) {
  loadedSkills.push(...items);
  window.portfolioData.skills = loadedSkills;
  const techCount = loadedSkills.reduce((sum, s) => sum + (s.subSkills?.length || 0), 0);
  window.setStat?.("stat-tech", techCount);
  renderSkills(items, loadedSkills.length - items.length);
}

// Appends a page of cards; `offset` keeps the accent colours continuous
function renderSkills(skills, offset = 0) {
  const skillsGrid = document.getElementById("skills-grid");

  skills.forEach((skill, i) => {
    const index = offset + i;
    const accent = ACCENTS[index % ACCENTS.length];
    const skillCard = document.createElement("div");

    skillCard.className = "glass spot lift skill-card p-7 flex flex-col gap-5 reveal";
    skillCard.style.setProperty("--d", `${(index % 3) * 0.08}s`);

    const subSkillsHTML = skill.subSkills?.length
      ? skill.subSkills
          .map((sub) => `<span class="chip">${window.escapeHTML(sub.name)}</span>`)
          .join("")
      : "";

    skillCard.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="bento-icon" style="--c:${accent}">
          <span class="material-symbols-outlined">${getIcon(skill.name)}</span>
        </div>
        <span class="mono-label text-xs text-outline">${String(skill.subSkills?.length || 0).padStart(2, "0")} tools</span>
      </div>

      <h3 class="text-lg font-semibold tracking-tight">${window.escapeHTML(skill.name)}</h3>

      <div class="flex flex-wrap gap-2">
        ${subSkillsHTML}
      </div>
    `;

    skillsGrid.appendChild(skillCard);
  });

  window.observeReveals?.(skillsGrid);
}
