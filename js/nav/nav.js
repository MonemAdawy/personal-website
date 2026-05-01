// Mobile Menu Functionality
class MobileMenu {
    constructor() {
        this.menu = document.getElementById('mobile-menu');
        this.isOpen = false;
        this.init();
    }
    
    init() {
        // Close menu on window resize if open
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.close();
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
        
        // Handle active link highlighting
        this.setupActiveLinkHighlighting();
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        if (this.menu) {
            this.menu.classList.add('open');
            document.body.classList.add('menu-open');
            this.isOpen = true;
        }
    }
    
    close() {
        if (this.menu) {
            this.menu.classList.remove('open');
            document.body.classList.remove('menu-open');
            this.isOpen = false;
        }
    }
    
    setupActiveLinkHighlighting() {
        // Highlight active section in navigation
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.nav-link, .mobile-menu-overlay .menu-items a');
        
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
                link.classList.remove('active');
                const href = link.getAttribute('href');
                if (href === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }
}

// Initialize mobile menu
const mobileMenu = new MobileMenu();

// Global functions
function toggleMobileMenu() {
    mobileMenu.toggle();
}

function openTerminal() {
    // Your terminal logic here
    console.log('Terminal opened');
    // You can implement your terminal modal here
}

function showHireModal() {
    // Your hire modal logic here
    console.log('Hire modal shown');
    // You can implement your hire modal here
}

// Close mobile menu when clicking on a link
document.querySelectorAll('.mobile-menu-overlay .menu-items a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.close();
    });
});

// Smooth scroll for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) {
        nav.style.background = 'rgba(12, 14, 17, 0.95)';
        nav.style.backdropFilter = 'blur(20px)';
    } else {
        nav.style.background = 'rgba(12, 14, 17, 0.8)';
        nav.style.backdropFilter = 'blur(12px)';
    }
});