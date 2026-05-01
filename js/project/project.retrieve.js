const getProjectsGrid = () => document.getElementById("projects-grid");

// ================= FETCH =================
export async function loadProjects() {
  try {
    const res = await fetch(`${window.API_BASE_URL}/projects`);
    const projects = await res.json();

    renderProjects(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
  }
}

// ================= RENDER =================
function renderProjects(projects) {
  const grid = getProjectsGrid();

  if (!grid) {
    console.error("projects-grid not found");
    return;
  }

  grid.innerHTML = "";

  projects.forEach((project, index) => {
    const isEvenRow = Math.floor(index / 2) % 2 === 0;
    const isFirst = index % 2 === 0;

    let colSpan = "";

    if (isEvenRow) {
      colSpan = isFirst ? "lg:col-span-2" : "lg:col-span-1";
    } else {
      colSpan = isFirst ? "lg:col-span-1" : "lg:col-span-2";
    }

    const isLarge = colSpan.includes("2");

    const card = document.createElement("div");

    card.className = `
      ${colSpan}
      group bg-surface-container-high rounded-lg p-8 
      border-l-2 border-primary project-card
    `;

    card.innerHTML = `
      <div class="flex flex-col h-full justify-between">

        <div>
          <h3 class="${isLarge ? "text-3xl" : "text-2xl"} font-bold mb-4">
            ${project.title}
          </h3>

          <p class="text-on-surface-variant ${
            isLarge ? "mb-8 max-w-xl" : "text-sm mb-6"
          }">
            ${project.description || ""}
          </p>

          <div class="flex flex-wrap gap-2">
            ${(project.techStack || [])
              .map(
                (t) => `
              <span class="px-2 py-1 bg-surface-container-highest text-[10px] rounded">
                ${t}
              </span>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="mt-8 flex gap-4 flex-wrap">

          <!-- GitHub -->
          <a href="${project.links?.github || "#"}" target="_blank"
            class="text-primary text-sm hover:underline">
            _Git_Pull
          </a>

          <!-- Live -->
          ${
            project.links?.live
              ? `<a href="${project.links.live}" target="_blank"
                  class="text-gray-300 text-sm hover:underline">
                  _Live
                </a>`
              : ""
          }

          <!-- Pictures -->
          <button onclick='openCarousel(${JSON.stringify(project.images)})'
            class="text-gray-300 text-sm hover:underline">
            _Pictures
          </button>

        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// ================= CAROUSEL =================
let currentImages = [];
let currentIndex = 0;

window.openCarousel = function (images) {
  currentImages = images || [];
  currentIndex = 0;

  const modal = document.getElementById("image-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  updateCarousel();
};

window.closeModal = function () {
  const modal = document.getElementById("image-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
};

window.nextImage = function () {
  currentIndex = (currentIndex + 1) % currentImages.length;
  updateCarousel();
};

window.prevImage = function () {
  currentIndex =
    (currentIndex - 1 + currentImages.length) % currentImages.length;
  updateCarousel();
};

window.goToImage = function (i) {
  currentIndex = i;
  updateCarousel();
};

function updateCarousel() {
  const img = document.getElementById("modal-image");
  const dots = document.getElementById("modal-dots");

  if (!currentImages.length) return;

  img.src = currentImages[currentIndex].secure_url;

  dots.innerHTML = currentImages
    .map(
      (_, i) => `
      <span onclick="goToImage(${i})"
        class="w-2 h-2 rounded-full cursor-pointer ${
          i === currentIndex ? "bg-white" : "bg-gray-500"
        }">
      </span>
    `
    )
    .join("");
}

// ================= UX =================

// ESC close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// click outside close
setTimeout(() => {
  const modal = document.getElementById("image-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.id === "image-modal") closeModal();
    });
  }
}, 1000);