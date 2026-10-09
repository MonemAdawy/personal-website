import { createPager, mountLoadMore } from "../utils/paginate.js";

const getProjectsGrid = () => document.getElementById("projects-grid");
const esc = (v) => window.escapeHTML(v);

const MAX_POINTS = 4;

// ================= FETCH =================
// 3 per page keeps the featured rhythm intact: one wide card, then a pair
const PAGE_SIZE = 3;
const loadedProjects = [];

export async function loadProjects() {
  const pager = createPager("/projects", PAGE_SIZE);
  try {
    const first = await pager.next();
    getProjectsGrid().innerHTML = "";
    showProjects(first);
    mountLoadMore(document.getElementById("projects-actions"), getProjectsGrid(), pager, showProjects, "More projects");
  } catch (err) {
    console.error("Error fetching projects:", err);
    renderError();
  }
}

function showProjects({ items, total }) {
  loadedProjects.push(...items);
  window.portfolioData.projects = loadedProjects;
  window.setStat?.("stat-projects", total ?? loadedProjects.length);
  renderProjects(items, loadedProjects.length - items.length);
}

// ================= RENDER =================
// Descriptions are stored as newline-separated highlights
function toPoints(description = "") {
  return description
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
}

// Appends a page of cards; `offset` keeps numbering and layout continuous
function renderProjects(projects, offset = 0) {
  const grid = getProjectsGrid();

  if (!grid) {
    console.error("projects-grid not found");
    return;
  }

  projects.forEach((project, i) => {
    const index = offset + i;
    // Every third card spans the full row for a featured rhythm
    const featured = index % 3 === 0 && (index > 0 || projects.length > 1);
    const images = project.images || [];
    const cover = images[0]?.secure_url;
    const points = toPoints(project.description);
    const shownPoints = points.slice(0, featured ? MAX_POINTS + 1 : MAX_POINTS);
    const hiddenCount = points.length - shownPoints.length;
    const number = String(index + 1).padStart(2, "0");

    const card = document.createElement("article");
    card.className = `glass spot project-card reveal ${featured ? "lg:col-span-2 lg:flex-row" : ""}`;
    card.style.setProperty("--d", `${(index % 2) * 0.08}s`);

    card.innerHTML = `
      <div class="project-cover ${featured ? "lg:w-[55%] lg:aspect-auto lg:min-h-[380px] lg:!rounded-r-none lg:!rounded-l-[calc(1.5rem-1px)]" : ""}"
           ${images.length ? `data-gallery="${index}" role="button" tabindex="0" aria-label="Open screenshots of ${esc(project.title)}"` : ""}>
        ${
          cover
            ? `<img src="${esc(cover)}" alt="${esc(project.title)} screenshot" loading="lazy"/>`
            : `<div class="project-cover-fallback">${esc(project.title)}</div>`
        }
        <span class="project-index">${number}</span>
        ${
          images.length
            ? `<span class="project-gallery-hint"><span class="material-symbols-outlined text-[0.95rem]">photo_library</span>${images.length}</span>`
            : ""
        }
      </div>

      <div class="flex flex-col flex-1 p-6 sm:p-8 ${featured ? "lg:w-[45%]" : ""}">
        <h3 class="${featured ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"} font-semibold tracking-tight mb-4 break-words">
          ${esc(project.title)}
        </h3>

        ${
          shownPoints.length > 1
            ? `<ul class="project-points space-y-2 text-sm text-on-surface-variant leading-relaxed mb-6">
                ${shownPoints.map((p) => `<li>${esc(p)}</li>`).join("")}
                ${hiddenCount > 0 ? `<li class="!pl-0 before:!hidden text-outline">+ ${hiddenCount} more</li>` : ""}
              </ul>`
            : `<p class="text-sm text-on-surface-variant leading-relaxed mb-6">${esc(shownPoints[0] || "")}</p>`
        }

        <div class="flex flex-wrap gap-2 mb-7">
          ${(project.techStack || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}
        </div>

        <div class="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-5 border-t border-white/5">
          ${
            project.links?.github
              ? `<a href="${esc(project.links.github)}" target="_blank" rel="noopener" class="link-arrow">
                  <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
                  Source code
                </a>`
              : ""
          }
          ${
            project.links?.live
              ? `<a href="${esc(project.links.live)}" target="_blank" rel="noopener" class="link-arrow">
                  <span class="material-symbols-outlined text-[1.05rem]">open_in_new</span>
                  Live demo
                </a>`
              : ""
          }
          ${
            images.length
              ? `<button type="button" data-gallery="${index}" class="link-arrow">
                  <span class="material-symbols-outlined text-[1.05rem]">photo_library</span>
                  Screenshots
                </button>`
              : ""
          }
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  // Open the gallery from the cover or the Screenshots button
  grid.onclick = (e) => {
    const trigger = e.target.closest("[data-gallery]");
    if (trigger) openCarousel(loadedProjects[Number(trigger.dataset.gallery)].images);
  };
  grid.onkeydown = (e) => {
    const trigger = e.target.closest("[data-gallery]");
    if (trigger && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openCarousel(loadedProjects[Number(trigger.dataset.gallery)].images);
    }
  };

  window.observeReveals?.(grid);
}

function renderError() {
  const grid = getProjectsGrid();
  if (!grid) return;
  grid.innerHTML = `
    <div class="glass p-10 text-center lg:col-span-2">
      <span class="material-symbols-outlined text-4xl text-outline">cloud_off</span>
      <p class="mt-3 text-on-surface-variant">Projects couldn't be loaded right now.
        <a class="text-primary underline underline-offset-4" href="https://github.com/MonemAdawy" target="_blank" rel="noopener">Browse them on GitHub</a>.
      </p>
    </div>`;
}

// ================= CAROUSEL =================
let currentImages = [];
let currentIndex = 0;

window.openCarousel = function (images) {
  currentImages = images || [];
  currentIndex = 0;
  if (!currentImages.length) return;

  const modal = document.getElementById("image-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("modal-open");

  updateCarousel();
};

window.closeModal = function () {
  const modal = document.getElementById("image-modal");
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("modal-open");
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
  const counter = document.getElementById("image-counter");

  if (!currentImages.length) return;

  // Navigation only makes sense with more than one image
  const single = currentImages.length < 2;
  document
    .querySelectorAll('#image-modal [onclick^="prevImage"], #image-modal [onclick^="nextImage"], #modal-dots, #image-counter')
    .forEach((el) => { el.style.visibility = single ? "hidden" : ""; });

  // Restart the zoom-in animation on every change
  img.style.animation = "none";
  void img.offsetWidth;
  img.style.animation = "";
  img.src = currentImages[currentIndex].secure_url;

  if (counter) {
    counter.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${String(currentImages.length).padStart(2, "0")}`;
  }

  dots.innerHTML = currentImages
    .map(
      (_, i) => `
      <button type="button" onclick="goToImage(${i})" aria-label="Show image ${i + 1}"
        class="h-1.5 rounded-full transition-all duration-300 ${
          i === currentIndex ? "w-8 bg-primary" : "w-1.5 bg-white/25 hover:bg-white/50"
        }">
      </button>
    `
    )
    .join("");
}

// ================= UX =================
document.addEventListener("keydown", (e) => {
  const modal = document.getElementById("image-modal");
  if (!modal || modal.classList.contains("hidden")) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowRight") nextImage();
  if (e.key === "ArrowLeft") prevImage();
});
