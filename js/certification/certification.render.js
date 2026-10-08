import { certifications } from "./certifications.js";

const ACCENTS = ["#3fff8b", "#7ae6ff", "#a78bfa", "#74fbbb", "#ffcb6b", "#ff8fa3"];
const esc = (v) => window.escapeHTML(v);

function initials(issuer = "") {
  return issuer
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function loadCertifications() {
  const section = document.getElementById("certifications");
  const grid = document.getElementById("certifications-grid");
  if (!section || !grid) return;

  // Nothing to show yet: hide the section and its nav links
  if (!certifications.length) {
    section.remove();
    document.querySelectorAll('a[href="#certifications"]').forEach((a) => a.remove());
    return;
  }

  window.portfolioData.certifications = certifications;
  grid.innerHTML = "";

  certifications.forEach((cert, index) => {
    const accent = ACCENTS[index % ACCENTS.length];
    const card = document.createElement("article");
    card.className = "glass spot lift cert-card flex flex-col reveal";
    card.style.setProperty("--d", `${(index % 3) * 0.08}s`);

    card.innerHTML = `
      ${
        cert.image
          ? `<div class="cert-preview" data-cert-image="${index}" role="button" tabindex="0" aria-label="View ${esc(cert.title)} certificate">
              <img src="${esc(cert.image)}" alt="${esc(cert.title)} certificate" loading="lazy"/>
              <span class="cert-preview-hint"><span class="material-symbols-outlined text-[0.95rem]">zoom_in</span>View</span>
            </div>`
          : ""
      }

      <div class="p-7 flex flex-col gap-5 flex-1">
      <div class="flex items-start justify-between gap-4">
        <div class="cert-seal" style="--c:${accent}">${esc(initials(cert.issuer)) || "✦"}</div>
        ${cert.date ? `<span class="mono-label text-xs text-on-surface-variant pt-1">${esc(cert.date)}</span>` : ""}
      </div>

      <div>
        <h3 class="text-lg font-semibold tracking-tight leading-snug">${esc(cert.title)}</h3>
        <p class="text-sm text-on-surface-variant mt-1">${esc(cert.issuer)}</p>
        ${cert.note ? `<p class="mono-label text-xs text-primary mt-3">${esc(cert.note)}</p>` : ""}
      </div>

      ${
        cert.skills?.length
          ? `<div class="flex flex-wrap gap-2">${cert.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>`
          : ""
      }

      ${cert.credentialId ? `<p class="mono-label text-[0.7rem] text-outline break-all">ID · ${esc(cert.credentialId)}</p>` : ""}

      ${
        cert.url || cert.image
          ? `<div class="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-5 border-t border-white/5">
              ${
                cert.url
                  ? `<a href="${esc(cert.url)}" target="_blank" rel="noopener" class="link-arrow">
                      <span class="material-symbols-outlined text-[1.05rem]">verified</span>
                      Verify credential
                    </a>`
                  : ""
              }
              ${
                cert.image
                  ? `<button type="button" class="link-arrow" data-cert-image="${index}">
                      <span class="material-symbols-outlined text-[1.05rem]">image</span>
                      View certificate
                    </button>`
                  : ""
              }
            </div>`
          : ""
      }
      </div>
    `;

    grid.appendChild(card);
  });

  // Reuse the project image viewer for certificate images
  grid.onclick = (e) => {
    const trigger = e.target.closest("[data-cert-image]");
    if (trigger) {
      const cert = certifications[Number(trigger.dataset.certImage)];
      window.openCarousel?.([{ secure_url: cert.image }]);
    }
  };

  grid.onkeydown = (e) => {
    const trigger = e.target.closest("[data-cert-image]");
    if (trigger && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      trigger.click();
    }
  };

  window.observeReveals?.(grid);
}
