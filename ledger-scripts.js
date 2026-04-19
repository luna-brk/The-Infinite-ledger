/* =============================================================================
   THE INFINITE LEDGER — Reusable JavaScript
   Version 1.0 • MMXXVI • Merkhant Consortium
   =============================================================================

   This single file powers ALL interactive elements across every Consortium page:
   • Drifting planar motes / ember background
   • Great Wheel token builder (auto-runs on any page with .great-wheel)
   • Module grid filter + search (auto-runs on any page with #moduleGrid)
   • Keyboard shortcuts (/ to focus search, Esc to clear)

   HOW TO INCLUDE ON ANY PAGE:
   <script src="ledger-scripts.js" defer></script>

   Just drop this script after your CSS and the page will instantly feel like
   the original Infinite Ledger prospectus.
   ============================================================================= */

(function () {

  /* ─── MOTES: cursor-reactive planar embers ─── */
  function initMotes() {
    const canvas = document.getElementById('motes');
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const motes = [];
    const COUNT = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 18000));

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function rand(a, b) { return a + Math.random() * (b - a); }

    function spawn(fromEdge = false) {
      const amber = Math.random() < 0.7;
      const angle = rand(0, Math.PI * 2);
      const speed = rand(0.08, 0.22);
      let x, y;
      if (fromEdge) {
        const side = Math.floor(rand(0, 4));
        if (side === 0) { x = rand(0, W); y = -rand(10, 60); }
        else if (side === 1) { x = W + rand(10, 60); y = rand(0, H); }
        else if (side === 2) { x = rand(0, W); y = H + rand(10, 60); }
        else { x = -rand(10, 60); y = rand(0, H); }
      } else {
        x = rand(0, W); y = rand(0, H);
      }
      return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: rand(0.8, 2.2),
        hueAmber: amber,
        pulse: rand(0, Math.PI * 2),
        pulseSpeed: rand(0.012, 0.03)
      };
    }

    for (let i = 0; i < COUNT; i++) motes.push(spawn());

    const mouse = { x: -9999, y: -9999, active: false };
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
    window.addEventListener('mouseleave', () => { mouse.active = false; });
    window.addEventListener('touchmove', e => {
      if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.active = true; }
    }, { passive: true });

    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.vx += rand(-0.003, 0.003);
        m.vy += rand(-0.003, 0.003);
        m.vx *= 0.992; m.vy *= 0.992;
        const sp = Math.hypot(m.vx, m.vy);
        if (sp > 1.1) { const f = 1.1 / sp; m.vx *= f; m.vy *= f; }

        if (mouse.active) {
          const dx = m.x - mouse.x, dy = m.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 12100 && d2 > 0.1) {
            const d = Math.sqrt(d2);
            const force = (1 - d / 110) * 1.8;
            m.vx += (dx / d) * force;
            m.vy += (dy / d) * force * 0.8;
          }
        }

        m.x += m.vx; m.y += m.vy;
        m.pulse += m.pulseSpeed;

        // Screen wrap — reappear on the opposite edge
        if (m.x < 0)  m.x = W;
        if (m.x > W)  m.x = 0;
        if (m.y < 0)  m.y = H;
        if (m.y > H)  m.y = 0;

        const flicker = 0.55 + 0.35 * Math.sin(m.pulse);
        const r = m.r;
        const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 5);
        if (m.hueAmber) {
          grad.addColorStop(0, `rgba(255,225,165,${0.95 * flicker})`);
          grad.addColorStop(0.35, `rgba(217,169,87,${0.55 * flicker})`);
          grad.addColorStop(1, 'rgba(184,135,59,0)');
        } else {
          grad.addColorStop(0, `rgba(200,220,255,${0.85 * flicker})`);
          grad.addColorStop(0.4, `rgba(130,160,220,${0.40 * flicker})`);
          grad.addColorStop(1, 'rgba(80,110,180,0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(m.x, m.y, r * 5, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = m.hueAmber
          ? `rgba(255,240,200,${flicker})`
          : `rgba(230,240,255,${flicker * 0.9})`;
        ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ─── GREAT WHEEL BUILDER ─── */
  function buildGreatWheel() {
    const wheelContainer = document.querySelector('.great-wheel');
    if (!wheelContainer) return;

    const svg = wheelContainer.querySelector('svg');
    if (!svg) return;

    const CX = 330, CY = 330;
    const TOKEN_RADIUS = 252;
    const DISC_R = 28;
    const svgNS = 'http://www.w3.org/2000/svg';

    const tokensGroup = svg.getElementById('planeTokens');
    const spokesGroup = svg.getElementById('wheelSpokes');
    if (!tokensGroup || !spokesGroup) return;

    const planes = [
      ['ELYSIUM',        'elysium'],
      ['THE BEASTLANDS', 'beastlands'],
      ['ARBOREA',        'arborea'],
      ['YSGARD',         'ysgard'],
      ['LIMBO',          'limbo'],
      ['PANDEMONIUM',    'pandemonium'],
      ['THE ABYSS',      'abyss'],
      ['CARCERI',        'carceri'],
      ['HADES',          'hades'],
      ['GEHENNA',        'gehenna'],
      ['THE NINE HELLS', 'hells'],
      ['ACHERON',        'acheron'],
      ['MECHANUS',       'mechanus'],
      ['ARCADIA',        'arcadia'],
      ['MOUNT CELESTIA', 'celestia'],
      ['BYTOPIA',        'bytopia']
    ];

    const G = '#E6C483';
    const glyphs = { /* full glyph definitions — same as original */ 
      elysium: `<path d="M-8 5 A 8 8 0 0 1 8 5" fill="none" stroke="${G}" stroke-width="1.3"/><path d="M-5 5 A 5 5 0 0 1 5 5" fill="none" stroke="${G}" stroke-width="1.3"/><circle cx="0" cy="5" r="1.4" fill="${G}"/>`,
      beastlands: `<circle cx="0" cy="1" r="3" fill="${G}"/><circle cx="-5" cy="-3" r="1.7" fill="${G}"/><circle cx="5" cy="-3" r="1.7" fill="${G}"/><circle cx="-3.5" cy="4" r="1.5" fill="${G}"/><circle cx="3.5" cy="4" r="1.5" fill="${G}"/>`,
      arborea: `<path d="M-9 6 L -3 -4 L 0 1 L 3 -6 L 9 6 Z" fill="none" stroke="${G}" stroke-width="1.3" stroke-linejoin="round"/>`,
      ysgard: `<line x1="0" y1="-9" x2="0" y2="9" stroke="${G}" stroke-width="1.4"/><line x1="0" y1="-3" x2="6" y2="-9" stroke="${G}" stroke-width="1.4"/><line x1="0" y1="3" x2="-6" y2="9" stroke="${G}" stroke-width="1.4"/>`,
      limbo: `<path d="M-9 -4 Q -4.5 -8, 0 -4 T 9 -4" fill="none" stroke="${G}" stroke-width="1.3"/><path d="M-9 0 Q -4.5 -4, 0 0 T 9 0" fill="none" stroke="${G}" stroke-width="1.3"/><path d="M-9 4 Q -4.5 0, 0 4 T 9 4" fill="none" stroke="${G}" stroke-width="1.3"/>`,
      pandemonium: `<path d="M 0 0 m 0 -7 a 7 7 0 1 1 -0.1 0 m 0.1 3 a 4 4 0 1 0 0.1 0" fill="none" stroke="${G}" stroke-width="1.2"/>`,
      abyss: `<path d="M -8 0 C -8 -6, -2 -6, 0 0 S 8 6, 8 0 S 2 -6, 0 0 S -8 6, -8 0 Z" fill="none" stroke="${G}" stroke-width="1.3"/>`,
      carceri: `<rect x="-8" y="-8" width="16" height="16" fill="none" stroke="${G}" stroke-width="1.2"/><rect x="-4" y="-4" width="8" height="8" fill="none" stroke="${G}" stroke-width="1"/>`,
      hades: `<line x1="-5" y1="-8" x2="-5" y2="8" stroke="${G}" stroke-width="1.5"/><line x1="5" y1="-8" x2="5" y2="8" stroke="${G}" stroke-width="1.5"/><line x1="-5" y1="0" x2="5" y2="0" stroke="${G}" stroke-width="1.5"/>`,
      gehenna: `<path d="M0 -9 L 9 7 L -9 7 Z" fill="none" stroke="${G}" stroke-width="1.3" stroke-linejoin="round"/><path d="M0 -4 L 5 4 L -5 4 Z" fill="none" stroke="${G}" stroke-width="1.1" stroke-linejoin="round"/>`,
      hells: `<line x1="0" y1="-9" x2="0" y2="9" stroke="${G}" stroke-width="1.5"/><line x1="-6" y1="-5" x2="-6" y2="4" stroke="${G}" stroke-width="1.3"/><line x1="6" y1="-5" x2="6" y2="4" stroke="${G}" stroke-width="1.3"/><line x1="-7" y1="4" x2="7" y2="4" stroke="${G}" stroke-width="1.3"/><line x1="-3" y1="-9" x2="3" y2="-9" stroke="${G}" stroke-width="1.3"/>`,
      acheron: `<rect x="-7" y="-7" width="14" height="14" fill="none" stroke="${G}" stroke-width="1.3"/><line x1="-7" y1="-7" x2="7" y2="7" stroke="${G}" stroke-width="1"/><line x1="7" y1="-7" x2="-7" y2="7" stroke="${G}" stroke-width="1"/>`,
      mechanus: `<circle cx="0" cy="0" r="4.2" fill="none" stroke="${G}" stroke-width="1.3"/><g stroke="${G}" stroke-width="1.3" stroke-linecap="round"><line x1="0" y1="-9" x2="0" y2="-6"/><line x1="0" y1="6" x2="0" y2="9"/><line x1="-9" y1="0" x2="-6" y2="0"/><line x1="6" y1="0" x2="9" y2="0"/><line x1="-6.4" y1="-6.4" x2="-4.2" y2="-4.2"/><line x1="6.4" y1="6.4" x2="4.2" y2="4.2"/><line x1="-6.4" y1="6.4" x2="-4.2" y2="4.2"/><line x1="6.4" y1="-6.4" x2="4.2" y2="-4.2"/></g>`,
      arcadia: `<circle cx="0" cy="0" r="2.6" fill="${G}"/><g stroke="${G}" stroke-width="1.2" stroke-linecap="round"><line x1="0" y1="-9" x2="0" y2="-5"/><line x1="0" y1="5" x2="0" y2="9"/><line x1="-9" y1="0" x2="-5" y2="0"/><line x1="5" y1="0" x2="9" y2="0"/><line x1="-6.4" y1="-6.4" x2="-3.8" y2="-3.8"/><line x1="6.4" y1="6.4" x2="3.8" y2="3.8"/><line x1="-6.4" y1="6.4" x2="-3.8" y2="3.8"/><line x1="6.4" y1="-6.4" x2="3.8" y2="-3.8"/></g>`,
      celestia: `<path d="M0 -9 L 8 7 L -8 7 Z" fill="none" stroke="${G}" stroke-width="1.4" stroke-linejoin="round"/><line x1="-5" y1="1" x2="5" y2="1" stroke="${G}" stroke-width="1"/>`,
      bytopia: `<path d="M-7 -8 L 7 -8 L -7 8 L 7 8 Z" fill="none" stroke="${G}" stroke-width="1.3" stroke-linejoin="round"/>`
    };

    const N = planes.length;
    for (let i = 0; i < N; i++) {
      const [name, key] = planes[i];
      const angle = (i * 360) / N;
      const rad = (angle - 90) * Math.PI / 180;

      // Spoke runs from inner separator to outer ring, passing through the token disc
      const sp = document.createElementNS(svgNS, 'line');
      sp.setAttribute('x1', (CX + 176 * Math.cos(rad)).toFixed(2));
      sp.setAttribute('y1', (CY + 176 * Math.sin(rad)).toFixed(2));
      sp.setAttribute('x2', (CX + 330 * Math.cos(rad)).toFixed(2));
      sp.setAttribute('y2', (CY + 330 * Math.sin(rad)).toFixed(2));
      spokesGroup.appendChild(sp);

      // Token
      const tokenWrap = document.createElementNS(svgNS, 'g');
      tokenWrap.setAttribute('transform', `translate(${CX} ${CY}) rotate(${angle}) translate(0 -${TOKEN_RADIUS}) rotate(${-angle})`);

      const counter = document.createElementNS(svgNS, 'g');
      counter.setAttribute('class', 'wheel-counter');
      counter.innerHTML = `
        <circle r="${DISC_R+2}" fill="none" stroke="#3E2C12" stroke-width="0.6" opacity="0.6"/>
        <circle r="${DISC_R}" fill="#120C05" stroke="#B8873B" stroke-width="1" filter="url(#tokenGlow)"/>
        <circle r="${DISC_R-3}" fill="none" stroke="#7A5820" stroke-width="0.35" opacity="0.7"/>
        <g transform="translate(0 -2)">${glyphs[key] || ''}</g>
        <text y="${DISC_R + 14}" font-family="Cinzel, serif" font-size="8.5" font-weight="600" fill="#E6C483" text-anchor="middle" letter-spacing="0.22em">${name}</text>
      `;

      tokenWrap.appendChild(counter);
      tokensGroup.appendChild(tokenWrap);
    }
  }

  /* ─── MODULE FILTER + SEARCH ─── */
  function initModuleFilter() {
    const grid = document.getElementById('moduleGrid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.module-card'));
    const tabs = document.querySelectorAll('.filter-tab');
    const searchInp = document.getElementById('moduleSearch');
    const noResults = document.getElementById('noResults');
    let currentFilter = 'all';

    function applyFilters() {
      const q = (searchInp ? searchInp.value : '').trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach(card => {
        const status = card.dataset.status || '';
        const tags = (card.dataset.tags || '').toLowerCase();
        const title = (card.querySelector('.module-title') || {}).textContent?.toLowerCase() || '';
        const desc = (card.querySelector('.module-desc') || {}).textContent?.toLowerCase() || '';

        const passesFilter = currentFilter === 'all' || status === currentFilter;
        const passesSearch = !q || tags.includes(q) || title.includes(q) || desc.includes(q);

        if (passesFilter && passesSearch) {
          card.classList.remove('filtered-out');
          visibleCount++;
        } else {
          card.classList.add('filtered-out');
        }
      });

      if (noResults) noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        applyFilters();
      });
    });

    if (searchInp) searchInp.addEventListener('input', applyFilters);

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== searchInp) {
        e.preventDefault();
        searchInp?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInp) {
        searchInp.value = '';
        applyFilters();
        searchInp.blur();
      }
    });
  }

  /* ─── MODULE PAGE: SIDEBAR TOGGLE (mobile) ─── */
  function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const toggle = document.getElementById('nav-toggle');
    if (toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!sidebar.classList.contains('open')) return;
      if (!sidebar.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
        sidebar.classList.remove('open');
      }
    });
  }

  /* ─── MODULE PAGE: COLLAPSIBLE SECTIONS ─── */
  function initSectionCollapse() {
    document.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        if (!body) return;
        const collapsed = body.classList.toggle('collapsed');
        header.classList.toggle('collapsed', collapsed);
      });
    });
  }

  /* ─── MODULE PAGE: SCROLL TRACKING ─── */
  /* Handles reading-progress bar, scroll-to-top button visibility,
     and active sidebar nav-link highlighting — all from one scroll listener.
     Returns silently if none of the relevant elements are present. */
  function initScrollTracking() {
    const fillEl    = document.getElementById('progress-fill');
    const pctEl     = document.getElementById('progress-pct');
    const scrollBtn = document.getElementById('scroll-top');
    const navLinks  = document.querySelectorAll('.nav-link[data-section]');
    // Discover sections dynamically — no hardcoded IDs required
    const sectionEls = Array.from(document.querySelectorAll('.content-section[id], section[id]'));

    if (!fillEl && !pctEl && !scrollBtn && !navLinks.length) return;

    if (scrollBtn) {
      scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    function onScroll() {
      const doc     = document.documentElement;
      const scrolled = doc.scrollTop || document.body.scrollTop;
      const total   = doc.scrollHeight - doc.clientHeight;
      const pct     = total > 0 ? Math.round((scrolled / total) * 100) : 0;

      if (fillEl) fillEl.style.width = pct + '%';
      if (pctEl)  pctEl.textContent  = pct + '%';
      if (scrollBtn) scrollBtn.classList.toggle('visible', scrolled > 400);

      if (navLinks.length && sectionEls.length) {
        let current = '';
        sectionEls.forEach(el => {
          if (el.getBoundingClientRect().top <= 100) current = el.id;
        });
        navLinks.forEach(link =>
          link.classList.toggle('active', link.dataset.section === current)
        );
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ─── MODULE PAGE: CONTENT SEARCH + KEYBOARD SHORTCUTS ─── */
  /* Operates on .section-body elements. Pressing / focuses the
     sidebar search; Esc clears it. Returns silently if #search-input
     is not present (e.g. on the main prospectus page). */
  function initContentSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;

    function clearHighlights() {
      document.querySelectorAll('.highlight').forEach(h => {
        h.parentNode.replaceChild(document.createTextNode(h.textContent), h);
        h.parentNode.normalize();
      });
    }

    function doSearch(query) {
      clearHighlights();
      if (!query || query.length < 2) return;
      const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      document.querySelectorAll('.section-body').forEach(body => {
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let node;
        while (node = walker.nextNode()) { if (re.test(node.textContent)) nodes.push(node); }
        nodes.forEach(n => {
          const span = document.createElement('span');
          span.innerHTML = n.textContent.replace(re, '<mark class="highlight">$1</mark>');
          n.parentNode.replaceChild(span, n);
        });
        if (body.querySelector('.highlight')) {
          body.classList.remove('collapsed');
          body.previousElementSibling?.classList.remove('collapsed');
        }
      });
      const first = document.querySelector('.highlight');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    input.addEventListener('input', () => doSearch(input.value));

    document.addEventListener('keydown', e => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault(); input.focus();
      }
      if (e.key === 'Escape' && document.activeElement === input) {
        input.value = ''; clearHighlights(); input.blur();
      }
    });
  }

  /* ─── SITEWIDE BOOKMARKS ─── */
  function initBookmarks() {
    const BOOKMARKS_KEY = 'infinite-ledger-bookmarks-v1';
    const container = document.getElementById('bookmarks-container');
    if (!container) return;

    function getCurrentPagePath() {
      let path = window.location.pathname;

      // For local files, extract just the relative part after project name
      if (path.includes('The-Infinite-ledger-main')) {
        path = path.substring(path.indexOf('The-Infinite-ledger-main') + 'The-Infinite-ledger-main'.length);
      }

      if (path.endsWith('/')) path = path.slice(0, -1);
      if (!path || path === '') path = '/index.html';
      else if (!path.includes('.html')) path += '/index.html';

      return path;
    }

    function getBookmarks() {
      try {
        const stored = localStorage.getItem(BOOKMARKS_KEY);
        if (!stored) return [];

        const parsed = JSON.parse(stored);

        // Handle old format (object) vs new format (array)
        if (Array.isArray(parsed)) {
          return parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Migrate old object format to new array format
          return Object.entries(parsed).map(([sectionId, title]) => ({
            sectionId,
            title,
            page: '/',
            url: `/#${sectionId}`
          }));
        }
        return [];
      } catch (e) {
        console.error('Error loading bookmarks:', e);
        return [];
      }
    }

    function saveBookmarks(bookmarks) {
      try {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
        window.dispatchEvent(new CustomEvent('bookmarksUpdated', { detail: bookmarks }));
      } catch (e) {
        console.error('Error saving bookmarks:', e);
      }
    }

    function renderBookmarks() {
      try {
        const bookmarks = getBookmarks();
        console.log('[Bookmarks] Container found:', container ? 'yes' : 'no');
        console.log('[Bookmarks] Stored bookmarks:', bookmarks);

        if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
          container.innerHTML = '<div style="color: var(--ink-faint); font-style: italic; padding: 8px 0;">No bookmarks yet. Click ★ on any section.</div>';
          console.log('[Bookmarks] No bookmarks to display');
          return;
        }

        let html = '';
        bookmarks.forEach((bookmark, index) => {
          const url = bookmark.url || `${bookmark.page || '/'}#${bookmark.sectionId}`;
          const displayUrl = url.replace(/^\//, '');
          html += `<a href="${url}" class="bookmark-link" title="${displayUrl}">★ ${bookmark.title}<span class="bookmark-remove" onclick="window.ledgerAPI.removeBookmark(${index}); event.preventDefault();" style="float: right; font-size: 12px; color: var(--ink-faint); cursor: pointer; padding: 0 4px;">✕</span></a>`;
        });
        container.innerHTML = html;

        // Re-attach click handlers
        document.querySelectorAll('#bookmarks-container .bookmark-link').forEach(link => {
          link.addEventListener('click', function(e) {
            if (!e.target.classList.contains('bookmark-remove')) {
              const href = this.getAttribute('href');
              const currentPage = getCurrentPagePath();
              const bookmarkPage = href.split('#')[0] || '/';

              if (bookmarkPage !== '/' && bookmarkPage !== '' && !currentPage.includes(bookmarkPage)) {
                window.location.href = href;
              } else {
                e.preventDefault();
                const sectionId = href.split('#')[1];
                if (sectionId) {
                  const target = document.getElementById(sectionId);
                  if (target) target.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }
          });
        });
      } catch (e) {
        console.error('Error rendering bookmarks:', e);
      }
    }

    // Global API for bookmarks
    window.ledgerAPI = window.ledgerAPI || {};

    window.ledgerAPI.toggleBookmark = function(sectionId, sectionTitle) {
      try {
        const bookmarks = getBookmarks();
        const pagePath = getCurrentPagePath();
        const bookmarkUrl = `${pagePath}#${sectionId}`;

        console.log('[Bookmarks] Toggle bookmark:', sectionId, 'Page:', pagePath);

        const existingIndex = bookmarks.findIndex(b => b.sectionId === sectionId && (b.page === pagePath || b.url === bookmarkUrl));
        const btn = document.querySelector(`[data-section-id="${sectionId}"]`);

        if (existingIndex >= 0) {
          bookmarks.splice(existingIndex, 1);
          console.log('[Bookmarks] Removed bookmark:', sectionId);
          if (btn) {
            btn.classList.remove('bookmarked');
            btn.textContent = '☆';
          }
        } else {
          bookmarks.push({ sectionId, title: sectionTitle, page: pagePath, url: bookmarkUrl });
          console.log('[Bookmarks] Added bookmark:', { sectionId, title: sectionTitle, page: pagePath, url: bookmarkUrl });
          if (btn) {
            btn.classList.add('bookmarked');
            btn.textContent = '★';
          }
        }
        saveBookmarks(bookmarks);
        renderBookmarks();
      } catch (e) {
        console.error('Error toggling bookmark:', e);
      }
    };

    window.ledgerAPI.removeBookmark = function(index) {
      try {
        const bookmarks = getBookmarks();
        if (index >= 0 && index < bookmarks.length) {
          const bookmark = bookmarks[index];
          bookmarks.splice(index, 1);
          saveBookmarks(bookmarks);

          const btn = document.querySelector(`[data-section-id="${bookmark.sectionId}"]`);
          if (btn) {
            btn.classList.remove('bookmarked');
            btn.textContent = '☆';
          }
          renderBookmarks();
        }
      } catch (e) {
        console.error('Error removing bookmark:', e);
      }
    };

    // Auto-add bookmark buttons to all section headers (excluding sidebar)
    function addAutoBookmarks() {
      const sections = document.querySelectorAll('.section-header, .content-section > .section-header');
      sections.forEach(section => {
        if (section.querySelector('.bookmark-btn')) return;

        const parent = section.closest('[id]');
        if (!parent || !parent.id) return;

        // Skip sidebar headers
        if (parent.classList.contains('sidebar-header')) return;

        const title = section.textContent.trim().substring(0, 50);
        const btn = document.createElement('button');
        btn.className = 'bookmark-btn';
        btn.setAttribute('data-section-id', parent.id);
        btn.setAttribute('data-section-title', title);
        btn.setAttribute('aria-label', 'Bookmark this section');
        btn.textContent = '☆';

        section.appendChild(btn);

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          window.ledgerAPI.toggleBookmark(parent.id, title);
        });
      });
    }

    // Initialize
    try {
      renderBookmarks();
      addAutoBookmarks();

      // Mark already-bookmarked sections on current page
      const bookmarks = getBookmarks();
      const pagePath = getCurrentPagePath();

      bookmarks.forEach(bookmark => {
        // Check if this bookmark belongs to the current page
        const bookmarkPath = bookmark.page || '';
        const isCurrentPage = bookmarkPath === pagePath ||
                            (bookmark.url && bookmark.url.split('#')[0].includes(pagePath)) ||
                            (bookmark.url && pagePath.includes(bookmarkPath));

        if (isCurrentPage) {
          const btn = document.querySelector(`[data-section-id="${bookmark.sectionId}"]`);
          if (btn) {
            btn.classList.add('bookmarked');
            btn.textContent = '★';
          }
        }
      });

      // Handle manual bookmark buttons
      document.addEventListener('click', function(e) {
        if (e.target.classList.contains('bookmark-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const sectionId = e.target.getAttribute('data-section-id');
          const sectionTitle = e.target.getAttribute('data-section-title');
          window.ledgerAPI.toggleBookmark(sectionId, sectionTitle);
        }
      });

      window.addEventListener('bookmarksUpdated', renderBookmarks);
    } catch (e) {
      console.error('Error initializing bookmarks:', e);
    }
  }

  /* ─── SIDEBAR TOGGLE ─── */
  function initSidebarToggle() {
    const toggle = document.getElementById('nav-toggle');
    const sidebar = document.getElementById('sidebar');
    const body = document.body;

    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      sidebar.classList.toggle('collapsed');
      body.classList.toggle('sidebar-collapsed');
    });
  }

  /* ─── SIDEBAR COMPONENTS INJECTION ─── */
  /* Ensures all sidebar features (bookmarks, etc.) are present on every page.
     Add new sidebar features here and they'll automatically appear everywhere. */
  function ensureSidebarComponents() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Ensure bookmarks section exists
    if (!document.getElementById('bookmarks-container')) {
      const bookmarksSection = document.createElement('div');
      bookmarksSection.className = 'nav-section';
      bookmarksSection.innerHTML = `
        <div class="nav-section-label">★ Bookmarks</div>
        <div id="bookmarks-container">
          <div style="color: var(--ink-faint); font-style: italic; padding: 8px 0;">No bookmarks yet</div>
        </div>
      `;

      // Insert after search if it exists, otherwise at the beginning
      const searchSection = sidebar.querySelector('.sidebar-search');
      if (searchSection) {
        searchSection.after(bookmarksSection);
      } else {
        sidebar.insertBefore(bookmarksSection, sidebar.firstChild);
      }
    }
  }

  /* ─── Initialize everything ─── */
  /* Each function guards against missing elements, so this call is
     safe on any Consortium page regardless of which components it uses. */
  window.addEventListener('load', () => {
    initMotes();
    buildGreatWheel();
    initModuleFilter();
    initSidebar();
    initSidebarToggle();
    ensureSidebarComponents();
    initBookmarks();
    initSectionCollapse();
    initScrollTracking();
    initContentSearch();
  });

})();
