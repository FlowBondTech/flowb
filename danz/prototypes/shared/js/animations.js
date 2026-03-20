/* FlowBond Prototypes - Shared Animations & Interactions */

// Password protection functionality
const CORRECT_PASSWORD = 'flowbond';

function checkPassword() {
    const input = document.getElementById('password-input');
    const error = document.getElementById('password-error');

    if (input.value.toLowerCase() === CORRECT_PASSWORD) {
        document.getElementById('password-gate').classList.add('hidden');
        document.getElementById('main-content').classList.add('visible');
        localStorage.setItem('flowbond-auth', 'true');
    } else {
        error.classList.add('show');
        input.value = '';
        setTimeout(() => error.classList.remove('show'), 2000);
    }
}

// Initialize password protection
function initPasswordGate() {
    const passwordInput = document.getElementById('password-input');
    const passwordBtn = document.querySelector('.password-btn');

    if (passwordInput) {
        // Enter key handler
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });

        // Button click handler
        if (passwordBtn) {
            passwordBtn.addEventListener('click', checkPassword);
        }

        // Check for existing auth
        if (localStorage.getItem('flowbond-auth') === 'true') {
            document.getElementById('password-gate').classList.add('hidden');
            document.getElementById('main-content').classList.add('visible');
        }

        passwordInput.focus();
    }
}

// Smooth scroll for nav links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Scroll animations using Intersection Observer
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.bead-card, .feature, .step, .use-case').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Bead hover effects
function initBeadHoverEffects() {
    document.querySelectorAll('.bead').forEach(bead => {
        bead.addEventListener('mouseenter', function() {
            this.style.transform = this.style.transform.replace('scale(1.2)', '') + ' scale(1.2)';
        });
    });
}

// Initialize all common functionality
function initCommon() {
    initPasswordGate();
    initSmoothScroll();
    initScrollAnimations();
    initBeadHoverEffects();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initCommon);
