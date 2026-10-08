const getServicesGrid = () => document.getElementById("services-grid");

const ACCENTS = ["#3fff8b", "#7ae6ff", "#a78bfa", "#74fbbb", "#ffcb6b", "#ff8fa3"];

function getIcon(title) {
  const t = title.toLowerCase();

  if (t.includes("auth") || t.includes("secur")) return "shield_lock";
  if (t.includes("extension") || t.includes("browser")) return "extension";
  if (t.includes("full-stack") || t.includes("feature")) return "layers";
  if (t.includes("api")) return "api";
  if (t.includes("data")) return "database";
  if (t.includes("payment")) return "payments";
  if (t.includes("cloud") || t.includes("deploy") || t.includes("infra")) return "cloud";
  if (t.includes("real") || t.includes("socket") || t.includes("chat")) return "bolt";
  if (t.includes("test")) return "verified";
  if (t.includes("perform") || t.includes("optim")) return "speed";

  return "deployed_code";
}

// ================= FETCH =================
export async function loadServices() {
  try {
    const res = await fetch(`${window.API_BASE_URL}/services`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const services = await res.json();

    window.portfolioData.services = services;
    // Keep the static fallback cards if the API returns nothing
    if (services.length) renderServices(services);
  } catch (err) {
    console.error("Error fetching services:", err);
  }
}

// ================= RENDER =================
function renderServices(services) {
  const grid = getServicesGrid();

  if (!grid) {
    console.error("services-grid not found");
    return;
  }

  grid.innerHTML = "";

  services.forEach((service, index) => {
    const accent = ACCENTS[index % ACCENTS.length];
    const card = document.createElement("div");

    card.className = "glass spot lift service-card p-7 flex flex-col gap-5 reveal";
    card.style.setProperty("--d", `${(index % 3) * 0.08}s`);

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="bento-icon" style="--c:${accent}">
          <span class="material-symbols-outlined">${getIcon(service.title || "")}</span>
        </div>
        <span class="service-num">${String(index + 1).padStart(2, "0")}</span>
      </div>

      <h3 class="text-xl font-semibold tracking-tight">${window.escapeHTML(service.title)}</h3>

      <p class="text-on-surface-variant text-sm leading-relaxed">
        ${window.escapeHTML(service.description)}
      </p>

      ${
        service.features?.length
          ? `<ul class="mt-auto space-y-2 text-sm">
              ${service.features
                .map(
                  (feature) => `
                <li class="flex items-center gap-2 text-on-surface">
                  <span class="material-symbols-outlined text-[1rem]" style="color:${accent}">check_circle</span>
                  ${window.escapeHTML(feature)}
                </li>`
                )
                .join("")}
            </ul>`
          : ""
      }
    `;

    grid.appendChild(card);
  });

  window.observeReveals?.(grid);
}
