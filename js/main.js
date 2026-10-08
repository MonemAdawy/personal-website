// main.js - Main JavaScript File

const CV_URL = 'https://drive.google.com/file/d/1ZEu4qnduKk6VBfgbyiKB27UPi69Ni2_I/view?usp=sharing';
const EMAIL = 'abdoadwy208@gmail.com';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

// Shared data filled by the dynamic modules (used by the terminal)
window.portfolioData = { projects: [], skills: [], services: [], certifications: [] };

// Utility Functions
function $(selector, root = document) {
    return root.querySelector(selector);
}

function $$(selector, root = document) {
    return root.querySelectorAll(selector);
}

window.escapeHTML = function (value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
};

// Load Component Function
async function loadComponent(slotId, componentPath) {
    const slot = document.getElementById(slotId);
    try {
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        slot.innerHTML = await response.text();
        return true;
    } catch (error) {
        console.error(`Error loading ${componentPath}:`, error);
        slot.innerHTML = `<div class="text-error p-8 text-center">Failed to load ${slotId.replace('slot-', '')}</div>`;
        return false;
    }
}

// Initialize All Components
async function initializeApp() {
    const components = ['navbar', 'hero', 'about', 'career', 'certifications', 'projects', 'skills', 'services', 'contact', 'footer'];

    // Fetch in parallel; each lands in its own slot
    await Promise.all(components.map((name) => loadComponent(`slot-${name}`, `components/${name}.html`)));

    initializeNavbar();
    initializeEventListeners();
    initReveal();
    initScrollEffects();
    initRotator();
    initPointerEffects();
    initTerminal();
    startLiveClock();
    updateCopyrightYear();
    addBackToTopButton();

    hidePreloader();

    // Load dynamic content
    await loadDynamicContent();
}

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;
    // Let the first frame paint so the hero reveal plays after the loader fades
    requestAnimationFrame(() => {
        preloader.classList.add('done');
        setTimeout(() => preloader.remove(), 800);
    });
}

// Initialize Navbar
function initializeNavbar() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeBtn = document.getElementById('mobileMenuClose');

    mobileMenuBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMobileMenu();
    });

    closeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        closeMobileMenu();
    });

    $$('.mobile-menu-overlay .menu-items a').forEach((link) => {
        link.addEventListener('click', () => closeMobileMenu());
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1100) closeMobileMenu();
    });
}

// Load dynamic content (independent requests run in parallel)
async function loadDynamicContent() {
    const tasks = [
        import('./skill/skill.retrieve.js').then((m) => m.loadSkills?.()),
        import('./contact/contact.send.js').then((m) => m.initContactForm?.()),
        import('./project/project.retrieve.js').then((m) => m.loadProjects?.()),
        import('./service/service.retrieve.js').then((m) => m.loadServices?.()),
        import('./certification/certification.render.js').then((m) => m.loadCertifications?.())
    ];

    const results = await Promise.allSettled(tasks);
    results
        .filter((r) => r.status === 'rejected')
        .forEach((r) => console.error('Error loading dynamic content:', r.reason));
}

// Mobile Menu Functions (Global)
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu?.classList.contains('open')) closeMobileMenu();
    else openMobileMenu();
}

function closeMobileMenu() {
    document.getElementById('mobile-menu')?.classList.remove('open');
    document.body.classList.remove('menu-open');
}

function openMobileMenu() {
    document.getElementById('mobile-menu')?.classList.add('open');
    document.body.classList.add('menu-open');
}

function showHireModal() {
    closeMobileMenu();
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => document.getElementById('cf-name')?.focus({ preventScroll: true }), 700);
}

// Back to Top Button
function addBackToTopButton() {
    document.querySelector('.back-to-top')?.remove();

    const button = document.createElement('button');
    button.innerHTML = '<span class="material-symbols-outlined">arrow_upward</span>';
    button.className = 'back-to-top icon-btn';
    button.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(button);

    window.addEventListener('scroll', () => {
        button.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });

    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Event Listeners
function initializeEventListeners() {
    // Smooth scroll for in-page anchors
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// ================= REVEAL ON SCROLL =================
let revealObserver;

function initReveal() {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        $$('.reveal').forEach((el) => el.classList.add('is-in'));
        return;
    }

    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    observeReveals(document);
}

// Exposed so dynamically rendered cards can opt in
function observeReveals(root) {
    const items = $$('.reveal:not(.is-in)', root);
    if (!revealObserver) {
        items.forEach((el) => el.classList.add('is-in'));
        return;
    }
    items.forEach((el) => revealObserver.observe(el));
}

// ================= SCROLL EFFECTS =================
function initScrollEffects() {
    const nav = document.getElementById('nav-shell');
    const progress = document.getElementById('scroll-progress');
    const timeline = document.getElementById('timeline');
    const fill = timeline?.querySelector('.timeline-fill');

    let ticking = false;
    const update = () => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;

        nav?.classList.toggle('scrolled', y > 40);
        if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

        if (timeline && fill) {
            const rect = timeline.getBoundingClientRect();
            const start = window.innerHeight * 0.7;
            const ratio = Math.min(1, Math.max(0, (start - rect.top) / rect.height));
            fill.style.setProperty('--progress', `${ratio * 100}%`);
        }
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });
    update();

    addScrollSpy();
}

// Scroll Spy for Navigation
function addScrollSpy() {
    const navLinks = $$('.nav-link, .mobile-menu-overlay .menu-items a');
    const sections = $$('main section[id]');
    if (!('IntersectionObserver' in window)) return;

    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            navLinks.forEach((link) => {
                link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
            });
        });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((section) => spy.observe(section));
}

// ================= HERO ROTATOR =================
function initRotator() {
    const words = $$('#hero-rotator .rotator-word');
    if (words.length < 2 || prefersReducedMotion) return;

    let index = 0;
    setInterval(() => {
        const current = words[index];
        index = (index + 1) % words.length;
        const next = words[index];

        current.classList.remove('is-active');
        current.classList.add('is-leaving');
        next.classList.remove('is-leaving');
        next.classList.add('is-active');
        setTimeout(() => current.classList.remove('is-leaving'), 700);
    }, 2600);
}

// Animated number used by the hero stats
window.setStat = function (id, value) {
    const el = document.getElementById(id);
    if (!el || !value) return;

    if (prefersReducedMotion) {
        el.textContent = value;
        return;
    }

    const duration = 1400;
    const startTime = performance.now();
    const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(eased * value);
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
};

// ================= POINTER EFFECTS =================
function initPointerEffects() {
    if (!finePointer || prefersReducedMotion) return;

    const glow = document.getElementById('cursor-glow');
    document.body.classList.add('has-pointer');

    let gx = 0, gy = 0, tx = 0, ty = 0;
    const loop = () => {
        gx += (tx - gx) * 0.12;
        gy += (ty - gy) * 0.12;
        if (glow) glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    document.addEventListener('pointermove', (e) => {
        tx = e.clientX;
        ty = e.clientY;

        // Spotlight cards
        const card = e.target.closest?.('.spot');
        if (card) {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            card.style.setProperty('--my', `${e.clientY - rect.top}px`);
        }
    }, { passive: true });

    // 3D tilt on the portrait
    const portrait = document.getElementById('portrait');
    if (portrait) {
        const wrap = portrait.parentElement;
        wrap.addEventListener('pointermove', (e) => {
            const rect = wrap.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width - 0.5;
            const py = (e.clientY - rect.top) / rect.height - 0.5;
            portrait.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
        });
        wrap.addEventListener('pointerleave', () => {
            portrait.style.transform = '';
        });
    }

    // Magnetic buttons
    $$('.magnetic').forEach((btn) => {
        btn.addEventListener('pointermove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
        });
        btn.addEventListener('pointerleave', () => {
            btn.style.transform = '';
        });
    });
}

// ================= LIVE CLOCK =================
function startLiveClock() {
    function updateClock() {
        const clockElement = document.getElementById('live-clock');
        if (clockElement) {
            const cairoTime = new Date().toLocaleTimeString('en-US', {
                timeZone: 'Africa/Cairo',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            clockElement.textContent = `${cairoTime} GMT+2`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// Update Copyright Year
function updateCopyrightYear() {
    const copyrightElement = document.getElementById('copyright-year');
    if (copyrightElement) {
        copyrightElement.textContent = `© ${new Date().getFullYear()} Monem Adawy. Designed & built with care.`;
    }
}

// ================= TOAST =================
window.showToast = function (message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = type === 'success' ? 'check_circle' : 'error';
    toast.append(icon, document.createTextNode(message));

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 2800);
};

window.copyEmail = async function (button) {
    try {
        await navigator.clipboard.writeText(EMAIL);
        showToast('Email copied to clipboard', 'success');
        const icon = button?.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.textContent = 'check';
            setTimeout(() => { icon.textContent = 'content_copy'; }, 1800);
        }
    } catch {
        window.location.href = `mailto:${EMAIL}`;
    }
};

// ================= INTERACTIVE TERMINAL =================
const terminalCommands = {
    help: () => [
        'Available commands:',
        '  <span class="text-primary">about</span>       who I am',
        '  <span class="text-primary">experience</span>  where I have worked',
        '  <span class="text-primary">projects</span>    things I have built',
        '  <span class="text-primary">certs</span>       my certifications',
        '  <span class="text-primary">skills</span>      my toolbox',
        '  <span class="text-primary">contact</span>     how to reach me',
        '  <span class="text-primary">cv</span>          open my résumé',
        '  <span class="text-primary">github</span>      open my GitHub',
        '  <span class="text-primary">linkedin</span>    open my LinkedIn',
        '  <span class="text-primary">hire</span>        jump to the contact form',
        '  <span class="text-primary">clear</span>       clear the screen',
        '  <span class="text-primary">exit</span>        close the terminal'
    ].join('\n'),
    about: () => 'Monem Adawy — Backend Engineer based in Cairo, Egypt.\nI build scalable APIs and secure systems with Node.js & NestJS:\nauth (JWT, OAuth), database design, caching, payments and more.',
    whoami: () => terminalCommands.about(),
    experience: () => [
        '<span class="text-tertiary">Jun 2026 — now</span>   Backend Developer · DataSoft',
        '<span class="text-tertiary">Oct 2025 — now</span>   Backend Node.js · Elevate Tech',
        '<span class="text-tertiary">Aug — Oct 2025</span>   MEAN Stack Developer · NTI'
    ].join('\n'),
    projects: () => {
        const projects = window.portfolioData.projects;
        if (!projects.length) return 'Projects are still loading… try again in a second.';
        return projects
            .map((p, i) => `<span class="text-tertiary">${String(i + 1).padStart(2, '0')}</span>  ${escapeHTML(p.title)}`)
            .join('\n') + '\n\nScroll to the Projects section for details and screenshots.';
    },
    certs: () => {
        const certs = window.portfolioData.certifications;
        if (!certs.length) return 'No certifications listed yet.';
        return certs
            .map((c) => `<span class="text-tertiary">${escapeHTML(c.date || '')}</span>  ${escapeHTML(c.title)} · ${escapeHTML(c.issuer)}`)
            .join('\n');
    },
    certifications: () => terminalCommands.certs(),
    skills: () => {
        const skills = window.portfolioData.skills;
        if (!skills.length) return 'Node.js · NestJS · TypeScript · PostgreSQL · MongoDB · Redis · Docker';
        return skills
            .map((s) => `<span class="text-primary">${escapeHTML(s.name)}</span>\n  ${(s.subSkills || []).map((x) => escapeHTML(x.name)).join(' · ')}`)
            .join('\n');
    },
    contact: () => `email     <a class="text-primary underline" href="mailto:${EMAIL}">${EMAIL}</a>\nlinkedin  linkedin.com/in/abdelmonem-mahmoud\ngithub    github.com/MonemAdawy`,
    cv: () => { window.open(CV_URL, '_blank', 'noopener'); return 'Opening résumé…'; },
    resume: () => terminalCommands.cv(),
    github: () => { window.open('https://github.com/MonemAdawy', '_blank', 'noopener'); return 'Opening GitHub…'; },
    linkedin: () => { window.open('https://www.linkedin.com/in/abdelmonem-mahmoud/', '_blank', 'noopener'); return 'Opening LinkedIn…'; },
    hire: () => { setTimeout(() => { closeTerminal(); showHireModal(); }, 500); return 'Great choice. Taking you to the contact form…'; },
    'sudo hire-me': () => terminalCommands.hire(),
    ls: () => 'about  experience  projects  skills  contact  cv',
    date: () => new Date().toString(),
    clear: () => { document.getElementById('terminal-output').innerHTML = ''; return null; },
    exit: () => { closeTerminal(); return null; }
};

const terminalHistory = [];
let historyIndex = -1;

function printTerminal(html, className = '') {
    const output = document.getElementById('terminal-output');
    const line = document.createElement('div');
    if (className) line.className = className;
    line.innerHTML = html;
    output.appendChild(line);
    const body = document.getElementById('terminal-body');
    body.scrollTop = body.scrollHeight;
}

function initTerminal() {
    const modal = document.getElementById('terminal-modal');
    const form = document.getElementById('terminal-form');
    const input = document.getElementById('terminal-input');
    if (!modal || !form) return;

    printTerminal('<span class="text-primary">Welcome to monem.sh</span> — an interactive way to explore this portfolio.');
    printTerminal('Type <span class="text-primary">help</span> to see what I can do.\n');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = input.value.trim();
        input.value = '';
        printTerminal(`<span class="text-primary">➜</span> <span class="text-tertiary">~</span> ${escapeHTML(raw)}`);
        if (!raw) return;

        terminalHistory.unshift(raw);
        historyIndex = -1;

        const command = terminalCommands[raw.toLowerCase()];
        const result = command
            ? command()
            : `command not found: ${escapeHTML(raw)} — type <span class="text-primary">help</span>`;
        if (result) printTerminal(result + '\n', command ? '' : 'text-error');
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' && historyIndex < terminalHistory.length - 1) {
            historyIndex++;
            input.value = terminalHistory[historyIndex];
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            historyIndex = Math.max(-1, historyIndex - 1);
            input.value = historyIndex === -1 ? '' : terminalHistory[historyIndex];
            e.preventDefault();
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-terminal-close]')) closeTerminal();
        else input.focus();
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            modal.classList.contains('open') ? closeTerminal() : openTerminal();
        } else if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeTerminal();
        }
    });
}

function openTerminal() {
    const modal = document.getElementById('terminal-modal');
    if (!modal) return;
    closeMobileMenu();
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('terminal-input')?.focus(), 50);
}

function closeTerminal() {
    document.getElementById('terminal-modal')?.classList.remove('open');
    document.body.classList.remove('modal-open');
}

// Global Functions
window.scrollToSection = function (sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
};

window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.openTerminal = openTerminal;
window.closeTerminal = closeTerminal;
window.showHireModal = showHireModal;
window.observeReveals = observeReveals;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
