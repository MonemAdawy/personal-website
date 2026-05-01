const getServicesGrid = () => document.getElementById("services-grid");

// ================= FETCH =================
export async function loadServices() {
  try {
    const res = await fetch(`${window.API_BASE_URL}/services`);
    const services = await res.json();

    renderServices(services);
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
    // ألوان مختلفة لكل كارت
    const colors = ["primary", "secondary", "tertiary"];
    const color = colors[index % colors.length];

    const card = document.createElement("div");

    card.className = "space-y-6 service-card";

    card.innerHTML = `
      <div class="w-12 h-1 bg-${color}"></div>

      <h3 class="text-2xl font-bold">
        ${service.title}
      </h3>

      <p class="text-on-surface-variant leading-relaxed">
        ${service.description}
      </p>

      <ul class="mono-label text-xs space-y-3 text-on-surface">
        ${(service.features || [])
          .map(
            (feature) => `
          <li class="flex items-center">
            <span class="text-${color} mr-2">&gt;&gt;</span>
            ${feature}
          </li>
        `
          )
          .join("")}
      </ul>
    `;

    grid.appendChild(card);
  });
}