function getIcon(name) {
  const n = name.toLowerCase();

  if (n.includes("mongo") || n.includes("sql")) return "storage";
  if (n.includes("redis")) return "dns";
  if (n.includes("cloud") || n.includes("aws")) return "cloud";
  if (n.includes("api")) return "api";
  if (n.includes("security")) return "security";
  if (n.includes("devops") || n.includes("ci")) return "view_kanban";

  return "code";
}

export async function loadSkills() {
  const skillsGrid = document.getElementById("skills-grid");

  if (!skillsGrid) return;

  try {
    const res = await fetch(`${window.API_BASE_URL}/skill`);
    const skills = await res.json();

    skillsGrid.innerHTML = "";

    skills.forEach(skill => {
      const skillCard = document.createElement("div");

      skillCard.className =
        "p-6 rounded-md bg-surface-container-high border border-outline-variant/10 flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform skill-item";

      // generate subskills HTML
      const subSkillsHTML = skill.subSkills?.length
        ? skill.subSkills
            .map(
              sub => `
                <span class="text-[12px] text-outline">${sub.name}</span>
              `
            )
            .join("")
        : `<span class="text-[15px] text-outline">No sub-skills</span>`;

      skillCard.innerHTML = `
        <span class="material-symbols-outlined text-primary mb-4 text-3xl">
          ${getIcon(skill.name)}
        </span>

        <span class="mono-label text-xs font-bold uppercase tracking-widest mb-2">
          ${skill.name}
        </span>

        <div class="flex flex-col gap-1 mt-2">
          ${subSkillsHTML}
        </div>
      `;

      skillsGrid.appendChild(skillCard);
    });
  } catch (err) {
    console.error("Error loading skills:", err);
  }
}