/**
 * Folio Toolbar Component
 * Dynamically loads and initializes the bottom-right toolbar.
 */
class FolioToolbar {
  constructor(mountPointSelector = '#folio-toolbar-mount') {
    this.mountPoint = document.querySelector(mountPointSelector);
    if (this.mountPoint) {
      this.init();
    }
  }

  async init() {
    try {
      // 1. Fetch HTML with a cache-buster for testing
      const response = await fetch('components/folio-toolbar/folio-toolbar.html?v=' + Date.now());
      const html = await response.text();
      this.mountPoint.innerHTML = html;

      // 2. Setup Listeners
      this.setupEventListeners();
    } catch (e) {
      console.error('FolioToolbar initialization failed:', e);
    }
  }

  setupEventListeners() {
    // Use scoped selectors within the mount point for maximum reliability
    const toolbar = this.mountPoint.querySelector('.folio-toolbar');
    const toggleMainBtn = this.mountPoint.querySelector('#toolbar-toggle-btn');
    const toggleAllBtn = this.mountPoint.querySelector('#toggle-all-sections');
    const scrollBtn = this.mountPoint.querySelector('#scroll-top-btn');
    const lensBtn = this.mountPoint.querySelector('#consortium-lens-btn');

    if (toggleMainBtn && toolbar) {
      toggleMainBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toolbar.classList.toggle('collapsed');
      });
    }

    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const bodies = document.querySelectorAll('.section-body');
        if (bodies.length === 0) return;
        
        const shouldCollapse = bodies[0] && !bodies[0].classList.contains('collapsed');

        bodies.forEach(body => {
          const header = body.previousElementSibling;
          if (!header) return;

          if (shouldCollapse) {
            body.style.maxHeight = body.scrollHeight + 'px';
            body.offsetHeight;
            body.classList.add('collapsed');
            header.classList.add('collapsed');
            body.style.maxHeight = '0px';
          } else {
            body.style.display = 'block';
            body.classList.remove('collapsed');
            body.style.maxHeight = 'none';
            const targetHeight = body.scrollHeight + 4;
            body.classList.add('collapsed');
            body.style.maxHeight = '0px';
            body.offsetHeight;
            body.classList.remove('collapsed');
            header.classList.remove('collapsed');
            body.style.maxHeight = targetHeight + 'px';
            
            const onEnd = (event) => {
              if (event.propertyName === 'max-height') {
                setTimeout(() => {
                  if (!body.classList.contains('collapsed')) {
                    body.style.maxHeight = 'none';
                  }
                }, 20);
                body.removeEventListener('transitionend', onEnd);
              }
            };
            body.addEventListener('transitionend', onEnd);
          }
        });
      });
    }

    if (scrollBtn) {
      scrollBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (lensBtn) {
      lensBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('consortium-lens-active');
        const isActive = document.body.classList.contains('consortium-lens-active');
        lensBtn.style.color = isActive ? 'var(--sigil-blue-mid)' : 'var(--bronze-bright)';
      });
    }
  }
}

// Robust auto-initialization
const runInit = () => {
  if (!window.folioToolbar) {
    window.folioToolbar = new FolioToolbar();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runInit);
} else {
  runInit();
}
