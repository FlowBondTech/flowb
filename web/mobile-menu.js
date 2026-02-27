// Mobile hamburger menu - shared across all pages
(function initMobileMenu() {
  const toggle = document.getElementById('navToggle');
  if (!toggle) return;

  const nav = document.querySelector('.header-nav');
  if (!nav) return;

  // Build mobile menu from nav links
  const menu = document.createElement('div');
  menu.className = 'mobile-menu';
  menu.id = 'mobileMenu';

  const backdrop = document.createElement('div');
  backdrop.className = 'mobile-menu-backdrop';
  backdrop.id = 'mobileMenuBackdrop';

  nav.querySelectorAll('.header-nav-link').forEach(link => {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.textContent;
    if (link.classList.contains('active')) a.classList.add('active');
    menu.appendChild(a);
  });

  document.body.appendChild(menu);
  document.body.appendChild(backdrop);

  function openMenu() {
    toggle.classList.add('active');
    menu.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    toggle.classList.remove('active');
    menu.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });

  backdrop.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
  });

  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', closeMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && menu.classList.contains('open')) closeMenu();
  });
})();
