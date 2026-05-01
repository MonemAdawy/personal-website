// main.js - Main JavaScript File

// Global State
let currentTheme = 'dark';
let activeSection = 'hero';

// Utility Functions
function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

// Load Component Function
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
        console.log(`Loaded: ${componentPath}`);
        return true;
    } catch (error) {
        console.error(`Error loading ${componentPath}:`, error);
        document.getElementById(elementId).innerHTML = `<div class="text-error p-8 text-center">Failed to load ${elementId}</div>`;
        return false;
    }
}

// Initialize All Components
async function initializeApp() {
    const components = [
        { id: 'navbar', path: 'components/navbar.html' },
        { id: 'hero', path: 'components/hero.html' },
        { id: 'projects', path: 'components/projects.html' },
        { id: 'career', path: 'components/career.html' },
        { id: 'skills', path: 'components/skills.html' },
        { id: 'services', path: 'components/services.html' },
        { id: 'about', path: 'components/about.html' },
        { id: 'contact', path: 'components/contact.html' },
        { id: 'footer', path: 'components/footer.html' }
    ];

    // Load all components first
    for (const component of components) {
        await loadComponent(component.id, component.path);
    }

    // Initialize all scripts after components are loaded
    initializeEventListeners();
    startLiveClock();
    updateCopyrightYear();
    addScrollSpy();
    addBackToTopButton();
    
    // Re-initialize navbar functionality after component loads
    initializeNavbar();
    
    // Load dynamic content
    await loadDynamicContent();
}

// Initialize Navbar (Critical Fix)
function initializeNavbar() {
    // Check if navbar is already in the DOM
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    // If navbar was loaded via component, ensure all event listeners are attached
    if (mobileMenuBtn) {
        // Remove existing listeners to avoid duplicates
        const newBtn = mobileMenuBtn.cloneNode(true);
        mobileMenuBtn.parentNode.replaceChild(newBtn, mobileMenuBtn);
        
        // Add fresh click handler
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileMenu();
        });
    }
    
    // Ensure mobile menu close button works
    const closeBtn = document.querySelector('.mobile-menu-close');
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeMobileMenu();
        });
    }
    
    // Add click handlers to mobile menu links
    document.querySelectorAll('.mobile-menu-overlay .menu-items a').forEach(link => {
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
            closeMobileMenu();
        });
    });
}

// Load dynamic content
async function loadDynamicContent() {
    try {
        // Load skills
        const skillsModule = await import('./skill/skill.retrieve.js');
        if (skillsModule.loadSkills) await skillsModule.loadSkills();
        
        // Load contact
        const contactModule = await import('./contact/contact.send.js');
        if (contactModule.initContactForm) await contactModule.initContactForm();
        
        // Load projects
        const projectsModule = await import('./project/project.retrieve.js');
        if (projectsModule.loadProjects) await projectsModule.loadProjects();
        
        // Load services
        const servicesModule = await import('./service/service.retrieve.js');
        if (servicesModule.loadServices) await servicesModule.loadServices();
    } catch (error) {
        console.error('Error loading dynamic content:', error);
    }
}

// Mobile Menu Functions (Global)
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        if (menu.classList.contains('open')) {
            menu.classList.remove('open');
            document.body.classList.remove('menu-open');
        } else {
            menu.classList.add('open');
            document.body.classList.add('menu-open');
        }
    }
}

function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        menu.classList.remove('open');
        document.body.classList.remove('menu-open');
    }
}

function openMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        menu.classList.add('open');
        document.body.classList.add('menu-open');
    }
}

// Terminal and Hire Modal Functions
function openTerminal() {
    console.log('Terminal opened');
    // You can implement your terminal modal here
    alert('Terminal interface coming soon!');
}

function showHireModal() {
    console.log('Hire modal shown');
    // Scroll to contact section
    const contactSection = document.getElementById('contact');
    if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        alert('Contact section coming soon!');
    }
}

// Add Back to Top Button
function addBackToTopButton() {
    // Remove existing button if any
    const existingBtn = document.querySelector('.back-to-top');
    if (existingBtn) existingBtn.remove();
    
    const button = document.createElement('button');
    button.innerHTML = '<span class="material-symbols-outlined">arrow_upward</span>';
    button.className = 'back-to-top bg-primary text-on-primary w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-all';
    button.style.cssText = 'position: fixed; bottom: 2rem; right: 2rem; opacity: 0; visibility: hidden; transition: all 0.3s ease; z-index: 100; border: none; cursor: pointer;';
    document.body.appendChild(button);
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            button.style.opacity = '1';
            button.style.visibility = 'visible';
        } else {
            button.style.opacity = '0';
            button.style.visibility = 'hidden';
        }
    });
    
    button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Event Listeners
function initializeEventListeners() {
    // Smooth scroll for all anchor links (excluding those with specific handlers)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        // Skip if it's a mobile menu button or already has handler
        if (anchor.classList.contains('mobile-menu-btn')) return;
        if (anchor.closest('.mobile-menu-overlay')) return;
        
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Add intersection observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('section-visible');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

// Live Clock Update
function startLiveClock() {
    function updateClock() {
        const clockElement = document.getElementById('live-clock');
        if (clockElement) {
            const now = new Date();
            // Format for Cairo time (Egypt Time Zone - UTC+2)
            const cairoTime = now.toLocaleTimeString('en-US', {
                timeZone: 'Africa/Cairo',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            clockElement.textContent = `${cairoTime} Cairo Time`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// Update Copyright Year
function updateCopyrightYear() {
    const copyrightElement = document.getElementById('copyright-year');
    if (copyrightElement) {
        const year = new Date().getFullYear();
        copyrightElement.innerHTML = `© ${year} SYSTEM_ACTIVE. ALL RIGHTS RESERVED.`;
    }
}

// Scroll Spy for Navigation
function addScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('text-primary');
            link.classList.add('text-slate-400');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.remove('text-slate-400');
                link.classList.add('text-primary');
            }
        });
    });
}

// Global Functions
window.scrollToSection = function(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
};

// Make sure global functions are accessible
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.openTerminal = openTerminal;
window.showHireModal = showHireModal;
window.initializeProject = function() {
    console.log('Project initialized');
    alert('Project initialization wizard coming soon!');
};

window.viewSource = function(projectId) {
    console.log(`Viewing source for: ${projectId}`);
    window.open(`https://github.com/sys-arch/${projectId}`, '_blank');
};

window.liveDemo = function(projectId) {
    console.log(`Opening demo for: ${projectId}`);
    alert(`Live demo for ${projectId} coming soon!`);
};

window.viewSourceCode = function() {
    window.open('https://github.com/sys-arch/portfolio', '_blank');
};

window.showSystemStatus = function() {
    alert('All systems operational. Uptime: 99.99%');
};

window.downloadManifest = function() {
    console.log('Downloading manifest...');
    alert('Manifest download started. (Demo version)');
};

// Terminal Animation
window.animateTerminal = function() {
    const terminalOutput = document.getElementById('terminal-output');
    if (terminalOutput) {
        const commands = [
            '> Initializing security protocols...',
            '> Loading encryption modules...',
            '> Establishing secure channel...',
            '> System ready.'
        ];
        
        let i = 0;
        const interval = setInterval(() => {
            if (i < commands.length) {
                const p = document.createElement('p');
                p.className = 'terminal-line text-primary-dim';
                p.textContent = commands[i];
                terminalOutput.appendChild(p);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 800);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);