// ===== Mobile Bottom Nav - Shared across all pages =====
(function() {
  const nav = document.getElementById('mobileBottomNav');
  if (!nav) return;

  // Page order for directional slide animation
  const pageOrder = ['events', 'feed', 'flow', 'crews', 'points'];
  const currentItem = nav.querySelector('.mobile-nav-item.active');
  const currentPage = currentItem?.dataset?.page || 'events';
  const currentIdx = pageOrder.indexOf(currentPage);

  // --- Loading bar for page transitions ---
  function showLoadingBar() {
    let bar = document.getElementById('navLoadingBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'navLoadingBar';
      bar.className = 'nav-loading-bar';
      document.body.appendChild(bar);
    }
    bar.classList.remove('done');
    // Force reflow so animation restarts
    void bar.offsetWidth;
    bar.classList.add('active');
  }

  // Animate content in on page load (if we came from a nav tap)
  const mainContent = document.querySelector('main') || document.querySelector('.container');
  if (mainContent && sessionStorage.getItem('flowb-nav-dir')) {
    const dir = sessionStorage.getItem('flowb-nav-dir');
    mainContent.style.setProperty('--slide-from', dir === 'right' ? '60px' : '-60px');
    mainContent.classList.add('page-transition');
    sessionStorage.removeItem('flowb-nav-dir');
    mainContent.addEventListener('animationend', () => {
      mainContent.classList.remove('page-transition');
    }, { once: true });

    // Finish loading bar if present
    const bar = document.getElementById('navLoadingBar');
    if (bar) {
      bar.classList.remove('active');
      bar.classList.add('done');
    }
  }

  // Prefetch adjacent pages on idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      nav.querySelectorAll('.mobile-nav-item[href]').forEach(item => {
        const href = item.getAttribute('href');
        if (href && href !== window.location.pathname) {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = href;
          document.head.appendChild(link);
        }
      });
    });
  }

  // Intercept nav link clicks to add slide-out animation
  nav.querySelectorAll('.mobile-nav-item[href]').forEach(item => {
    item.addEventListener('click', (e) => {
      const targetPage = item.dataset.page;
      if (targetPage === currentPage) { e.preventDefault(); return; }
      const targetIdx = pageOrder.indexOf(targetPage);
      const dir = targetIdx > currentIdx ? 'right' : 'left';
      sessionStorage.setItem('flowb-nav-dir', dir);

      e.preventDefault();

      // Immediately update active state for instant feedback
      nav.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Show loading bar
      showLoadingBar();

      const mc = document.querySelector('main') || document.querySelector('.container');
      if (mc) {
        mc.style.setProperty('--slide-to', dir === 'right' ? '-60px' : '60px');
        mc.classList.add('page-transition-out');
        mc.addEventListener('animationend', () => {
          window.location.href = item.getAttribute('href');
        }, { once: true });
      } else {
        window.location.href = item.getAttribute('href');
      }
    });
  });
})();
