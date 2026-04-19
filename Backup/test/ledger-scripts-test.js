/* =============================================================================
   THE INFINITE LEDGER — Reusable JavaScript
   Version 1.0 • MMXXVI • Merkhant Consortium
   =============================================================================

   This single file powers ALL interactive elements across every Consortium page:
   • Drifting planar motes / ember background
   • Great Wheel token builder (auto-runs on any page with .great-wheel)
   • Module grid filter + search (auto-runs on any page with #moduleGrid)
   • Keyboard shortcuts (/ to focus search, Esc to clear)
   ============================================================================= */

(function () {

  /* ─── MOTES: cursor-reactive planar embers ─── */
  function initMotes() {
    const canvas = document.getElementById('motes');
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let collisionBoxes = [];
    const motes = [];
    
    // --- PHYSICS CONSTANTS ---
    const COUNT = Math.min(120, Math.floor((window.innerWidth * window.innerHeight) / 15000));
    const G = 0.00045;         // Universal Gravitational Constant
    const SOFTENING = 55;      // Smooths out close-range forces
    const VISCOSITY = 0.999;   // Near-zero friction for orbital persistence
    const SPEED_LIMIT_LOW = 0.18; // Even slower base stately speed
    const SPEED_LIMIT_HI  = 2.2;  // Maximum interactive velocity
    const SUN_MASS_MULT = 120; // Suns are heavy anchors
    const SOI_SUN = 550;       // Sun's gravitational reach
    const SOI_PLANET = 220;    // Planet's gravitational reach
    const REPULSION_BASE = 2.0; 
    const SUN_REPULSION = 6000; 

    function updateCollisionBoxes() {
      const selectors = '.page, .corner, .header-band, .preamble, .module-card, .three-pillars, .medallion, .section-heading, .rule-line, .top-ribbon, .search-bar, .content-section, .module-banner, .module-nav, #sidebar';
      const elements = document.querySelectorAll(selectors);
      collisionBoxes = Array.from(elements).map(el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }).filter(box => box.right > 0 && box.bottom > 0); // Only track visible elements
    }

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateCollisionBoxes();
    }

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', updateCollisionBoxes, { passive: true });
    setInterval(updateCollisionBoxes, 3000);
    resize();

    function rand(a, b) { return a + Math.random() * (b - a); }

    function spawn(fromEdge = false) {
      const isSun = Math.random() < 0.07; 
      const angle = rand(0, Math.PI * 2);
      const speed = isSun ? 0 : rand(0.04, 0.18); 
      
      let x, y, attempts = 0;
      const findSafeSpot = () => {
        let tx = rand(0, W), ty = rand(0, H);
        if (fromEdge) {
          const side = Math.floor(rand(0, 4));
          if (side === 0) { tx = rand(0, W); ty = -30; }
          else if (side === 1) { tx = W + 30; ty = rand(0, H); }
          else if (side === 2) { tx = rand(0, W); ty = H + 30; }
          else { tx = -30; ty = rand(0, H); }
        }
        // Check if point is inside any collision box
        const isUnsafe = collisionBoxes.some(b => tx > b.left - 20 && tx < b.right + 20 && ty > b.top - 20 && ty < b.bottom + 20);
        if (isUnsafe && attempts < 10) { attempts++; return findSafeSpot(); }
        return { x: tx, y: ty };
      };

      const pos = findSafeSpot();
      x = pos.x; y = pos.y;
      
      const r = isSun ? rand(3.5, 5.8) : rand(0.6, 1.4);
      return {
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r, mass: isSun ? r * r * SUN_MASS_MULT : r * r,
        isSun, flash: 0, hueAmber: isSun || Math.random() < 0.35,
        pulse: rand(0, Math.PI * 2), pulseSpeed: isSun ? 0.008 : 0.03
      };
    }

    for (let i = 0; i < COUNT; i++) motes.push(spawn());

    const mouse = { x: -9999, y: -9999, active: false };
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
    window.addEventListener('mouseleave', () => { mouse.active = false; });

    function tick() {
      ctx.clearRect(0, 0, W, H);

      // 1. INTER-PARTICLE PHYSICS
      for (let i = 0; i < motes.length; i++) {
        const m1 = motes[i];
        for (let j = i + 1; j < motes.length; j++) {
          const m2 = motes[j];
          
          let dx = m2.x - m1.x;
          if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
          let dy = m2.y - m1.y;
          if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
          
          const d2 = dx * dx + dy * dy;
          const d = Math.sqrt(d2);
          const minDist = m1.r + m2.r;
          const soi = (m1.isSun || m2.isSun) ? SOI_SUN : SOI_PLANET;

          if (d < minDist && d > 0.1) {
            const nx = dx / d, ny = dy / d;
            const relVx = m1.vx - m2.vx, relVy = m1.vy - m2.vy;
            const p = 1.4 * (relVx * nx + relVy * ny) / (m1.mass + m2.mass);
            if (!isNaN(p)) {
              m1.vx -= p * m2.mass * nx; m1.vy -= p * m2.mass * ny;
              m2.vx += p * m1.mass * nx; m2.vy += p * m1.mass * ny;
            }
            const overlap = minDist - d;
            m1.x -= nx * overlap * 0.5; m1.y -= ny * overlap * 0.5;
            m2.x += nx * overlap * 0.5; m2.y += ny * overlap * 0.5;
            m1.flash = 0.5; m2.flash = 0.5;
          } else if (d < soi && d > 0.1) { 
            const falloff = Math.pow(1 - d / soi, 3);
            const fGrav = (G * m1.mass * m2.mass * falloff) / (d2 + SOFTENING);
            const fRepel = d < minDist * 5 ? (REPULSION_BASE * (minDist * 6) / d2) : 0;
            const fSun = (m1.isSun && m2.isSun && d < 600) ? (SUN_REPULSION / (d2 + SOFTENING)) : 0;
            
            const totalF = fGrav - fRepel - fSun;
            const ax = (dx / d) * totalF;
            const ay = (dy / d) * totalF;

            const relVx = m2.vx - m1.vx, relVy = m2.vy - m1.vy;
            const angular = dx * relVy - dy * relVx;
            const swirl = 0.0003 * (angular > 0 ? 1 : -1) * falloff;

            const dvx1 = (ax / m1.mass) + (dy / d) * swirl;
            const dvy1 = (ay / m1.mass) - (dx / d) * swirl;
            if (!isNaN(dvx1)) { m1.vx += dvx1; m1.vy += dvy1; }
            
            const dvx2 = (ax / m2.mass) + (dy / d) * swirl;
            const dvy2 = (ay / m2.mass) - (dx / d) * swirl;
            if (!isNaN(dvx2)) { m2.vx -= dvx2; m2.vy -= dvy2; }
          }
        }
      }

      // 2. INDIVIDUAL UPDATES
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        
        m.vx *= VISCOSITY; m.vy *= VISCOSITY;
        m.vx += rand(-0.0001, 0.0001);
        m.vy += rand(-0.0001, 0.0001);

        let mouseInf = false;
        if (mouse.active) {
          const dx = m.x - mouse.x, dy = m.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 12100 && d2 > 0) {
            mouseInf = true;
            const d = Math.sqrt(d2);
            const strength = m.isSun ? 0.01 : 0.45;
            const force = (1 - d / 110) * strength;
            m.vx += (dx / d) * force;
            m.vy += (dy / d) * force;
          }
        }

        const sp = Math.hypot(m.vx, m.vy);
        const limit = (mouseInf || m.flash > 0.05) ? SPEED_LIMIT_HI : SPEED_LIMIT_LOW;
        if (sp > limit) {
          const brake = m.isSun ? 0.98 : 0.996;
          m.vx *= brake; m.vy *= brake;
        }

        if (!isNaN(m.vx) && !isNaN(m.vy)) {
          m.x += m.vx; m.y += m.vy;
        }

        for (let b = 0; b < collisionBoxes.length; b++) {
          const box = collisionBoxes[b];
          if (m.x + m.r > box.left && m.x - m.r < box.right && m.y + m.r > box.top && m.y - m.r < box.bottom) {
            const dL = Math.abs((m.x + m.r) - box.left), dR = Math.abs((m.x - m.r) - box.right);
            const dT = Math.abs((m.y + m.r) - box.top),  dB = Math.abs((m.y - m.r) - box.bottom);
            const min = Math.min(dL, dR, dT, dB);
            // Deflect with energy loss (0.9x)
            if (min === dL) { m.vx = -Math.abs(m.vx) * 0.9; m.x = box.left - (m.r + 3); }
            else if (min === dR) { m.vx = Math.abs(m.vx) * 0.9; m.x = box.right + (m.r + 3); }
            else if (min === dT) { m.vy = -Math.abs(m.vy) * 0.9; m.y = box.top - (m.r + 3); }
            else { m.vy = Math.abs(m.vy) * 0.9; m.y = box.bottom + (m.r + 4); }
            m.flash = 0.2; break;
          }
        }

        if (m.x < 0) m.x = W; else if (m.x > W) m.x = 0;
        if (m.y < 0) m.y = H; else if (m.y > H) m.y = 0;

        m.pulse += m.pulseSpeed;
        m.flash = Math.max(0, m.flash - 0.04);
        const flicker = (0.55 + 0.35 * Math.sin(m.pulse)) + m.flash * 0.4;
        const r = m.r * (1 + m.flash * 0.3);
        const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 5);
        if (m.hueAmber) {
          grad.addColorStop(0, `rgba(255,225,165,${Math.min(1, 0.9 * flicker)})`);
          grad.addColorStop(0.3, `rgba(217,169,87,${Math.min(1, 0.5 * flicker)})`);
          grad.addColorStop(1, 'rgba(184,135,59,0)');
        } else {
          grad.addColorStop(0, `rgba(200,220,255,${Math.min(1, 0.8 * flicker)})`);
          grad.addColorStop(0.4, `rgba(130,160,220,${Math.min(1, 0.4 * flicker)})`);
          grad.addColorStop(1, 'rgba(80,110,180,0)');
        }
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(m.x, m.y, r * 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = m.hueAmber
          ? `rgba(255,${240 + m.flash * 15},${200 + m.flash * 55},${Math.min(1, flicker)})`
          : `rgba(${230 + m.flash * 25},${240 + m.flash * 15},255,${Math.min(1, flicker * 0.9)})`;
        ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ─── GREAT WHEEL BUILDER ─── */
  function buildGreatWheel() {
    const wheelContainer = document.querySelector('.great-wheel'); if (!wheelContainer) return;
    const svg = wheelContainer.querySelector('svg'); if (!svg) return;
    const CX = 330, CY = 330, TOKEN_RADIUS = 252, DISC_R = 28, svgNS = 'http://www.w3.org/2000/svg';
    const tokensGroup = document.getElementById('planeTokens'), spokesGroup = document.getElementById('wheelSpokes');
    if (!tokensGroup || !spokesGroup) return;
    const planes = [['ELYSIUM','elysium'],['THE BEASTLANDS','beastlands'],['ARBOREA','arborea'],['YSGARD','ysgard'],['LIMBO','limbo'],['PANDEMONIUM','pandemonium'],['THE ABYSS','abyss'],['CARCERI','carceri'],['HADES','hades'],['GEHENNA','gehenna'],['THE NINE HELLS','hells'],['ACHERON','acheron'],['MECHANUS','mechanus'],['ARCADIA','arcadia'],['MOUNT CELESTIA','celestia'],['BYTOPIA','bytopia']];
    const G = '#E6C483';
    const glyphs = {elysium:`<path d="M-8 5 A 8 8 0 0 1 8 5" fill="none" stroke="${G}" stroke-width="1.3"/><path d="M-5 5 A 5 5 0 0 1 5 5" fill="none" stroke="${G}" stroke-width="1.3"/><circle cx="0" cy="5" r="1.4" fill="${G}"/>`,beastlands:`<circle cx="0" cy="1" r="3" fill="${G}"/><circle cx="-5" cy="-3" r="1.7" fill="${G}"/><circle cx="5" cy="-3" r="1.7" fill="${G}"/><circle cx="-3.5" cy="4" r="1.5" fill="${G}"/><circle cx="3.5" cy="4" r="1.5" fill="${G}"/>`,arborea:`<path d="M-9 6 L -3 -4 L 0 1 L 3 -6 L 9 6 Z" fill="none" stroke="${G}" stroke-width="1.3" stroke-linejoin="round"/>`,ysgard:`<line x1="0" y1="-9" x2="0" y2="9" stroke="${G}" stroke-width="1.4"/><line x1="0" y1="-3" x2="6" y2="-9" stroke="${G}" stroke-width="1.4"/><line x1="0" y1="3" x2="-6" y2="9" stroke="${G}" stroke-width="1.4"/>`,limbo:`<path d="M-9 -4 Q -4.5 -8, 0 -4 T 9 -4" fill="none" stroke="${G}" stroke-width="1.3"/><path d="M-9 0 Q -4.5 -4, 0 0 T 9 0" fill="none" stroke="${G}" stroke-width="1.3"/><path d="M-9 4 Q -4.5 0, 0 4 T 9 4" fill="none" stroke="${G}" stroke-width="1.3"/>`,pandemonium:`<path d="M 0 0 m 0 -7 a 7 7 0 1 1 -0.1 0 m 0.1 3 a 4 4 0 1 0 0.1 0" fill="none" stroke="${G}" stroke-width="1.2"/>`,abyss:`<path d="M -8 0 C -8 -6, -2 -6, 0 0 S 8 6, 8 0 S 2 -6, 0 0 S -8 6, -8 0 Z" fill="none" stroke="${G}" stroke-width="1.3"/>`,carceri:`<rect x="-8" y="-8" width="16" height="16" fill="none" stroke="${G}" stroke-width="1.2"/><rect x="-4" y="-4" width="8" height="8" fill="none" stroke="${G}" stroke-width="1"/>`,hades:`<line x1="-5" y1="-8" x2="-5" y2="8" stroke="${G}" stroke-width="1.5"/><line x1="5" y1="-8" x2="5" y2="8" stroke="${G}" stroke-width="1.5"/><line x1="-5" y1="0" x2="5" y2="0" stroke="${G}" stroke-width="1.5"/>`,gehenna:`<path d="M0 -9 L 9 7 L -9 7 Z" fill="none" stroke="${G}" stroke-width="1.3" stroke-linejoin="round"/><path d="M0 -4 L 5 4 L -5 4 Z" fill="none" stroke="${G}" stroke-width="1.1" stroke-linejoin="round"/>`,hells:`<line x1="0" y1="-9" x2="0" y2="9" stroke="${G}" stroke-width="1.2"/><line x1="-7" y1="-3" x2="7" y2="-3" stroke="${G}" stroke-width="1.2"/><line x1="-7" y1="3" x2="7" y2="3" stroke="${G}" stroke-width="1.2"/>`,acheron:`<rect x="-7" y="-7" width="14" height="14" fill="none" stroke="${G}" stroke-width="1.3"/><line x1="-7" y1="-7" x2="7" y2="7" stroke="${G}" stroke-width="0.8"/><line x1="7" y1="-7" x2="-7" y2="7" stroke="${G}" stroke-width="0.8"/>`,mechanus:`<circle cx="0" cy="0" r="7" fill="none" stroke="${G}" stroke-width="1.3"/><path d="M-2 -9 L 2 -9 L 2 -7 L -2 -7 Z M-2 7 L 2 7 L 2 9 L -2 9 Z M7 -2 L 9 -2 L 9 2 L 7 2 Z M-9 -2 L -7 -2 L -7 2 L -9 2 Z" fill="${G}"/>`,arcadia:`<rect x="-8" y="-8" width="16" height="16" fill="none" stroke="${G}" stroke-width="1.2"/><line x1="0" y1="-8" x2="0" y2="8" stroke="${G}" stroke-width="1"/><line x1="-8" y1="0" x2="8" y2="0" stroke="${G}" stroke-width="1"/>`,celestia:`<path d="M0 -9 L 8 6 L -8 6 Z" fill="none" stroke="${G}" stroke-width="1.3"/><circle cx="0" cy="-1" r="2.5" fill="none" stroke="${G}" stroke-width="1"/>`,bytopia:`<path d="M-8 -6 L 8 -6 L 0 8 Z" fill="none" stroke="${G}" stroke-width="1.2"/><path d="M-8 6 L 8 6 L 0 -8 Z" fill="none" stroke="${G}" stroke-width="1.2"/>`};
    const N = planes.length;
    for (let i = 0; i < N; i++) {
      const [name, key] = planes[i];
      const angle = (i * 360) / N, rad = (angle - 90) * Math.PI / 180;
      const sp = document.createElementNS(svgNS, 'line');
      sp.setAttribute('x1', (CX + 176 * Math.cos(rad)).toFixed(2)); sp.setAttribute('y1', (CY + 176 * Math.sin(rad)).toFixed(2));
      sp.setAttribute('x2', (CX + 330 * Math.cos(rad)).toFixed(2)); sp.setAttribute('y2', (CY + 330 * Math.sin(rad)).toFixed(2));
      spokesGroup.appendChild(sp);
      const tokenWrap = document.createElementNS(svgNS, 'g');
      tokenWrap.setAttribute('transform', `translate(${CX} ${CY}) rotate(${angle}) translate(0 -${TOKEN_RADIUS}) rotate(${-angle})`);
      const counter = document.createElementNS(svgNS, 'g');
      counter.setAttribute('class', 'wheel-counter');
      counter.innerHTML = `<circle r="${DISC_R+2}" fill="none" stroke="#3E2C12" stroke-width="0.6" opacity="0.6"/><circle r="${DISC_R}" fill="#120C05" stroke="#B8873B" stroke-width="1" filter="url(#tokenGlow)"/><circle r="${DISC_R-3}" fill="none" stroke="#7A5820" stroke-width="0.35" opacity="0.7"/><g transform="translate(0 -2)">${glyphs[key] || ''}</g><text y="${DISC_R + 14}" font-family="Cinzel, serif" font-size="8.5" font-weight="600" fill="#E6C483" text-anchor="middle" letter-spacing="0.22em">${name}</text>`;
      tokenWrap.appendChild(counter); tokensGroup.appendChild(tokenWrap);
    }
  }

  function initModuleFilter() {
    const grid = document.getElementById('moduleGrid'); if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.module-card')), tabs = document.querySelectorAll('.filter-tab'), searchInp = document.getElementById('moduleSearch'), noResults = document.getElementById('noResults');
    let currentFilter = 'all';
    function applyFilters() {
      const q = (searchInp ? searchInp.value : '').trim().toLowerCase();
      let visibleCount = 0;
      cards.forEach(card => {
        const status = card.dataset.status || '', tags = (card.dataset.tags || '').toLowerCase(), title = (card.querySelector('.module-title') || {}).textContent?.toLowerCase() || '', desc = (card.querySelector('.module-desc') || {}).textContent?.toLowerCase() || '';
        const passesFilter = currentFilter === 'all' || status === currentFilter, passesSearch = !q || tags.includes(q) || title.includes(q) || desc.includes(q);
        if (passesFilter && passesSearch) { card.classList.remove('filtered-out'); visibleCount++; } else card.classList.add('filtered-out');
      });
      if (noResults) noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }
    tabs.forEach(tab => { tab.addEventListener('click', () => { tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); currentFilter = tab.dataset.filter; applyFilters(); }); });
    if (searchInp) searchInp.addEventListener('input', applyFilters);
    document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement !== searchInp) { e.preventDefault(); searchInp?.focus(); } if (e.key === 'Escape' && document.activeElement === searchInp) { searchInp.value = ''; applyFilters(); searchInp.blur(); } });
  }

  function initSidebar() {
    const sidebar = document.getElementById('sidebar'); if (!sidebar) return;
    const toggle = document.getElementById('nav-toggle'); if (toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', e => { if (!sidebar.classList.contains('open')) return; if (!sidebar.contains(e.target) && (!toggle || !toggle.contains(e.target))) sidebar.classList.remove('open'); });
  }

  function initSectionCollapse() { 
    try {
      document.querySelectorAll('.section-header').forEach(header => { 
        const body = header.nextElementSibling; if (!body) return;
        if (!body.classList.contains('collapsed')) body.style.maxHeight = body.scrollHeight + 'px'; else body.style.maxHeight = '0px';
        header.addEventListener('click', (e) => { 
          if (e.target.closest('button')) return; const isCollapsed = body.classList.contains('collapsed');
          const onTransitionEnd = (event) => { if (event.propertyName === 'max-height') { if (!body.classList.contains('collapsed')) setTimeout(() => { if (!body.classList.contains('collapsed')) body.style.maxHeight = 'none'; }, 20); body.removeEventListener('transitionend', onTransitionEnd); } };
          body.addEventListener('transitionend', onTransitionEnd);
          if (isCollapsed) { body.style.display = 'block'; body.classList.remove('collapsed'); body.style.maxHeight = 'none'; const targetHeight = body.scrollHeight + 4; body.style.maxHeight = '0px'; body.classList.add('collapsed'); body.offsetHeight; body.classList.remove('collapsed'); header.classList.remove('collapsed'); body.style.maxHeight = targetHeight + 'px'; }
          else { body.style.maxHeight = body.scrollHeight + 'px'; body.offsetHeight; body.classList.add('collapsed'); header.classList.add('collapsed'); body.style.maxHeight = '0px'; }
        }); 
      });
      window.addEventListener('resize', () => { document.querySelectorAll('.section-body:not(.collapsed)').forEach(body => { body.style.maxHeight = 'none'; }); });
    } catch (e) { console.error('initSectionCollapse failed:', e); }
  }


  function initScrollTracking() {
    const fillEl = document.getElementById('progress-fill'), pctEl = document.getElementById('progress-pct'), scrollBtn = document.getElementById('scroll-top'), navLinks = document.querySelectorAll('.nav-link[data-section]'), sectionEls = Array.from(document.querySelectorAll('.content-section[id], section[id]'));
    if (!fillEl && !pctEl && !scrollBtn && !navLinks.length) return;
    if (scrollBtn) scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    function onScroll() {
      const doc = document.documentElement, scrolled = doc.scrollTop || document.body.scrollTop, total = doc.scrollHeight - doc.clientHeight, pct = total > 0 ? Math.round((scrolled / total) * 100) : 0;
      if (fillEl) fillEl.style.width = pct + '%'; if (pctEl) pctEl.textContent = pct + '%'; if (scrollBtn) scrollBtn.classList.toggle('visible', scrolled > 400);
      if (navLinks.length && sectionEls.length) { let current = ''; sectionEls.forEach(el => { if (el.getBoundingClientRect().top <= 100) current = el.id; }); navLinks.forEach(link => link.classList.toggle('active', link.dataset.section === current)); }
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  function initContentSearch() {
    const input = document.getElementById('search-input'); if (!input) return;
    function clearHighlights() { document.querySelectorAll('.highlight').forEach(h => { h.parentNode.replaceChild(document.createTextNode(h.textContent), h); h.parentNode.normalize(); }); }
    function doSearch(query) {
      clearHighlights(); if (!query || query.length < 2) return;
      const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      document.querySelectorAll('.section-body').forEach(body => {
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        const nodes = []; let node; while (node = walker.nextNode()) if (re.test(node.textContent)) nodes.push(node);
        nodes.forEach(n => { const span = document.createElement('span'); span.innerHTML = n.textContent.replace(re, '<mark class="highlight">$1</mark>'); n.parentNode.replaceChild(span, n); });
        if (body.querySelector('.highlight')) { body.classList.remove('collapsed'); body.previousElementSibling?.classList.remove('collapsed'); }
      });
      const first = document.querySelector('.highlight'); if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    input.addEventListener('input', () => doSearch(input.value));
    document.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); input.focus(); } if (e.key === 'Escape' && document.activeElement === input) { input.value = ''; clearHighlights(); input.blur(); } });
  }

  function initBookmarks() {
    const BOOKMARKS_KEY = 'infinite-ledger-bookmarks-v1', container = document.getElementById('bookmarks-container'); if (!container) return;
    function getCurrentPagePath() { let path = window.location.pathname; if (path.includes('The-Infinite-ledger-main')) path = path.substring(path.indexOf('The-Infinite-ledger-main') + 'The-Infinite-ledger-main'.length); if (path.endsWith('/')) path = path.slice(0, -1); if (!path || path === '') path = '/index.html'; else if (!path.includes('.html')) path += '/index.html'; return path; }
    function getBookmarks() { try { const stored = localStorage.getItem(BOOKMARKS_KEY); if (!stored) return []; const parsed = JSON.parse(stored); if (Array.isArray(parsed)) return parsed; if (typeof parsed === 'object' && parsed !== null) return Object.entries(parsed).map(([sectionId, title]) => ({ sectionId, title, page: '/', url: `/#${sectionId}` })); return []; } catch (e) { return []; } }
    function saveBookmarks(bookmarks) { try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks)); window.dispatchEvent(new CustomEvent('bookmarksUpdated', { detail: bookmarks })); } catch (e) {} }
    function renderBookmarks() {
      try {
        const bookmarks = getBookmarks();
        if (!Array.isArray(bookmarks) || bookmarks.length === 0) { container.innerHTML = '<div style="color: var(--ink-faint); font-style: italic; padding: 8px 0;">No bookmarks yet. Click ★ on any section.</div>'; return; }
        let html = ''; bookmarks.forEach((bookmark, index) => { const url = bookmark.url || `${bookmark.page || '/'}#${bookmark.sectionId}`, displayUrl = url.replace(/^\//, ''); html += `<a href="${url}" class="bookmark-link" title="${displayUrl}">★ ${bookmark.title}<span class="bookmark-remove" onclick="window.ledgerAPI.removeBookmark(${index}); event.preventDefault();" style="float: right; font-size: 12px; color: var(--ink-faint); cursor: pointer; padding: 0 4px;">✕</span></a>`; });
        container.innerHTML = html;
        document.querySelectorAll('#bookmarks-container .bookmark-link').forEach(link => { link.addEventListener('click', function(e) { if (!e.target.classList.contains('bookmark-remove')) { const href = this.getAttribute('href'), currentPage = getCurrentPagePath(), bookmarkPage = href.split('#')[0] || '/'; if (bookmarkPage !== '/' && bookmarkPage !== '' && !currentPage.includes(bookmarkPage)) window.location.href = href; else { e.preventDefault(); const sectionId = href.split('#')[1]; if (sectionId) { const target = document.getElementById(sectionId); if (target) target.scrollIntoView({ behavior: 'smooth' }); } } } }); });
      } catch (e) {}
    }
    window.ledgerAPI = window.ledgerAPI || {};
    window.ledgerAPI.toggleBookmark = function(sectionId, sectionTitle) { try { const bookmarks = getBookmarks(), pagePath = getCurrentPagePath(), bookmarkUrl = `${pagePath}#${sectionId}`, existingIndex = bookmarks.findIndex(b => b.sectionId === sectionId && (b.page === pagePath || b.url === bookmarkUrl)), btn = document.querySelector(`[data-section-id="${sectionId}"]`); if (existingIndex >= 0) { bookmarks.splice(existingIndex, 1); if (btn) { btn.classList.remove('bookmarked'); btn.textContent = '☆'; } } else { bookmarks.push({ sectionId, title: sectionTitle, page: pagePath, url: bookmarkUrl }); if (btn) { btn.classList.add('bookmarked'); btn.textContent = '★'; } } saveBookmarks(bookmarks); renderBookmarks(); } catch (e) {} };
    window.ledgerAPI.removeBookmark = function(index) { try { const bookmarks = getBookmarks(); if (index >= 0 && index < bookmarks.length) { const bookmark = bookmarks[index]; bookmarks.splice(index, 1); saveBookmarks(bookmarks); const btn = document.querySelector(`[data-section-id="${bookmark.sectionId}"]`); if (btn) { btn.classList.remove('bookmarked'); btn.textContent = '☆'; } renderBookmarks(); } } catch (e) {} };
    function addAutoBookmarks() { const sections = document.querySelectorAll('.section-header, .content-section > .section-header'); sections.forEach(section => { if (section.querySelector('.bookmark-btn')) return; const parent = section.closest('[id]'); if (!parent || !parent.id || parent.classList.contains('sidebar-header')) return; const title = section.textContent.trim().substring(0, 50), btn = document.createElement('button'); btn.className = 'bookmark-btn'; btn.setAttribute('data-section-id', parent.id); btn.setAttribute('data-section-title', title); btn.setAttribute('aria-label', 'Bookmark this section'); btn.textContent = '☆'; section.appendChild(btn); btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); window.ledgerAPI.toggleBookmark(parent.id, title); }); }); }
    try { renderBookmarks(); addAutoBookmarks(); const bookmarks = getBookmarks(), pagePath = getCurrentPagePath(); bookmarks.forEach(bookmark => { const bookmarkPath = bookmark.page || '', isCurrentPage = bookmarkPath === pagePath || (bookmark.url && bookmark.url.split('#')[0].includes(pagePath)) || (bookmark.url && pagePath.includes(bookmarkPath)); if (isCurrentPage) { const btn = document.querySelector(`[data-section-id="${bookmark.sectionId}"]`); if (btn) { btn.classList.add('bookmarked'); btn.textContent = '★'; } } }); document.addEventListener('click', function(e) { if (e.target.classList.contains('bookmark-btn')) { e.preventDefault(); e.stopPropagation(); const sectionId = e.target.getAttribute('data-section-id'), sectionTitle = e.target.getAttribute('data-section-title'); window.ledgerAPI.toggleBookmark(sectionId, sectionTitle); } }); window.addEventListener('bookmarksUpdated', renderBookmarks); } catch (e) {}
  }

  function initSidebarToggle() { const toggle = document.getElementById('nav-toggle'), sidebar = document.getElementById('sidebar'), body = document.body; if (!toggle || !sidebar) return; toggle.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); sidebar.classList.toggle('collapsed'); body.classList.toggle('sidebar-collapsed'); }); }

  function ensureSidebarComponents() { const sidebar = document.getElementById('sidebar'); if (!sidebar) return; if (!document.getElementById('bookmarks-container')) { const bookmarksSection = document.createElement('div'); bookmarksSection.className = 'nav-section'; bookmarksSection.innerHTML = `<div class="nav-section-label">★ Bookmarks</div><div id="bookmarks-container"><div style="color: var(--ink-faint); font-style: italic; padding: 8px 0;">No bookmarks yet</div></div>`; const searchSection = sidebar.querySelector('.sidebar-search'); if (searchSection) searchSection.after(bookmarksSection); else sidebar.insertBefore(bookmarksSection, sidebar.firstChild); } }

  /* ─── CUTTER NOTES: Global & Dynamic System ─── */
  const SCRAWLS_KEY = 'infinite-ledger-scrawls-v1';

  function createNoteElement(text, signature, side, topOffset = null) {
    const note = document.createElement('div');
    note.className = `cutter-note ${side}`;
    if (topOffset !== null) note.style.top = typeof topOffset === 'number' ? `${topOffset}px` : topOffset;

    const scrawl = document.createElement('em');
    scrawl.className = 'scrawl';
    
    // Split text into spans for ink-bloom animation
    [...text].forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = 'char';
      span.style.animationDelay = `${i * 22}ms`;
      scrawl.appendChild(span);
    });

    note.appendChild(scrawl);

    if (signature) {
      const sig = document.createElement('span');
      sig.className = 'signature';
      sig.textContent = signature;
      note.appendChild(sig);
    }

    note.classList.add('js-ready');
    return note;
  }

  function initCutterNotes() {
    // 1. Initialize static notes already in the HTML
    const staticNotes = document.querySelectorAll('.cutter-note:not(.js-ready)');
    staticNotes.forEach(note => {
      const scrawl = note.querySelector('.scrawl');
      if (!scrawl) return;
      const text = scrawl.textContent.trim();
      const signature = note.querySelector('.signature')?.textContent.trim();
      const side = note.classList.contains('right') ? 'right' : 'left';
      const top = note.style.top;
      
      // Replace with animated version
      const animatedNote = createNoteElement(text, signature, side, top);
      note.replaceWith(animatedNote);
    });

    // 2. Set up IntersectionObserver for all notes (static + dynamic)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    function observeNotes() {
      document.querySelectorAll('.cutter-note.js-ready:not(.observed)').forEach(note => {
        observer.observe(note);
        note.classList.add('observed');
      });
    }

    observeNotes();
    // Re-run observation when new notes are added
    window.addEventListener('scrawlAdded', observeNotes);
  }

  function initUserScrawls() {
    window.ledgerAPI = window.ledgerAPI || {};

    const getScrawls = () => {
      try {
        const stored = localStorage.getItem(SCRAWLS_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (e) { return []; }
    };

    const saveScrawls = (scrawls) => {
      localStorage.setItem(SCRAWLS_KEY, JSON.stringify(scrawls));
      window.dispatchEvent(new CustomEvent('scrawlsUpdated'));
    };

    window.ledgerAPI.addScrawl = function(sectionId, text, signature, side = 'left', top = 20) {
      const scrawls = getScrawls();
      const pagePath = window.location.pathname;
      scrawls.push({ sectionId, text, signature, side, top, pagePath });
      saveScrawls(scrawls);
      renderUserScrawls();
      window.dispatchEvent(new CustomEvent('scrawlAdded'));
    };

    window.ledgerAPI.deleteScrawl = function(index) {
      const scrawls = getScrawls();
      scrawls.splice(index, 1);
      saveScrawls(scrawls);
      renderUserScrawls();
    };

    function renderUserScrawls() {
      // Remove existing dynamic scrawls to re-render
      document.querySelectorAll('.cutter-note.dynamic-scrawl').forEach(n => n.remove());
      
      const scrawls = getScrawls();
      
      // Robust path normalization
      function normalizePath(p) {
        if (!p) return '';
        // 1. Remove protocol and hostname if present
        let path = p.split(/[#?]/)[0]; // Remove hash and query
        // 2. Normalize slashes
        path = path.replace(/\\/g, '/');
        // 3. Remove drive letters (Windows)
        path = path.replace(/^[a-zA-Z]:/, '');
        // 4. Ensure it doesn't end with a trailing slash
        if (path.endsWith('/')) path += 'index.html';
        // 5. Only keep the last two segments (e.g., module-1/index.html)
        const parts = path.split('/');
        return parts.slice(-2).join('/');
      }

      const currentPage = normalizePath(window.location.pathname);

      scrawls.forEach((data, index) => {
        const storedPage = normalizePath(data.pagePath);
        
        if (currentPage !== storedPage) return;

        const target = document.getElementById(data.sectionId);
        if (!target) return;

        const note = createNoteElement(data.text, data.signature, data.side, data.top || 20);
        note.classList.add('dynamic-scrawl');
        
        const del = document.createElement('button');
        del.className = 'scrawl-delete';
        del.innerHTML = '✕';
        del.title = 'Erase scrawl';
        del.onclick = (e) => { e.stopPropagation(); window.ledgerAPI.deleteScrawl(index); };
        note.appendChild(del);

        target.appendChild(note);
      });

      // CRITICAL: Trigger observer for newly rendered notes
      window.dispatchEvent(new CustomEvent('scrawlAdded'));
    }

    function openComposer(sectionId) {
      const overlay = document.createElement('div');
      overlay.className = 'composer-overlay';
      const composer = document.createElement('div');
      composer.className = 'scrawl-composer';
      
      composer.innerHTML = `
        <div class="composer-title">Mark the Ledger</div>
        <div class="composer-field">
          <label class="composer-label">The Scrawl</label>
          <textarea class="composer-textarea" placeholder="Keep it brief, cutter..." id="scrawl-text"></textarea>
        </div>
        <div class="composer-field">
          <label class="composer-label">The Mark (Signature)</label>
          <input type="text" class="composer-input" placeholder="— Your Name" id="scrawl-sig">
        </div>
        <div class="composer-row">
          <div class="composer-field">
            <label class="composer-label">Margin</label>
            <select class="composer-select" id="scrawl-side">
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div class="composer-field">
            <label class="composer-label">Vertical Offset (px)</label>
            <input type="number" class="composer-input" value="20" id="scrawl-top" style="width: 70px;">
          </div>
        </div>
        <div class="composer-actions">
          <button class="composer-btn" id="scrawl-cancel">Discard</button>
          <button class="composer-btn primary" id="scrawl-submit">Seal Mark</button>
        </div>
      `;

      document.body.appendChild(overlay);
      document.body.appendChild(composer);

      const close = () => { overlay.remove(); composer.remove(); };
      overlay.onclick = close;
      composer.querySelector('#scrawl-cancel').onclick = close;
      
      composer.querySelector('#scrawl-submit').onclick = () => {
        const text = composer.querySelector('#scrawl-text').value.trim();
        const sig = composer.querySelector('#scrawl-sig').value.trim() || '— Anonymous';
        const side = composer.querySelector('#scrawl-side').value;
        const top = parseInt(composer.querySelector('#scrawl-top').value) || 20;

        if (text) {
          window.ledgerAPI.addScrawl(sectionId, text, sig, side, top);
          close();
        }
      };
    }

    // Add "Scrawl" buttons to section headers (like bookmarks)
    function addScrawlTriggers() {
      const headers = document.querySelectorAll('.section-header');
      headers.forEach(header => {
        if (header.querySelector('.scrawl-trigger')) return;
        const parent = header.closest('[id]');
        if (!parent || !parent.id) return;

        const btn = document.createElement('button');
        btn.className = 'scrawl-trigger';
        btn.innerHTML = '✎';
        btn.title = 'Add a margin scrawl';
        btn.onclick = (e) => {
          e.stopPropagation();
          openComposer(parent.id);
        };
        header.appendChild(btn);
      });
    }

    renderUserScrawls();
    addScrawlTriggers();
    window.addEventListener('scrawlsUpdated', renderUserScrawls);
  }

  /* ─── DYNAMIC PLANAR PARALLAX ─── */
  function initParallax() {
    const vellum = document.querySelector('.layer-vellum-deep');
    const mists = document.querySelector('.layer-mists');
    if (!vellum || !mists) return;

    window.addEventListener('mousemove', e => {
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;

      vellum.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
      mists.style.transform = `translate(${x * 50}px, ${y * 50}px)`;
    });

    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      vellum.style.transform = `translateY(${scrolled * 0.1}px)`;
      mists.style.transform = `translateY(${scrolled * 0.25}px)`;
    });
  }

  /* ─── INTERACTIVE BORDERS (Intersection Observer) ─── */
  function initSectionObservers() {
    const sections = document.querySelectorAll('.content-section');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.2 });

    sections.forEach(s => observer.observe(s));
  }

  // ─── INITIALIZATION ───
  function init() {
    // 1. Critical UI components (run as soon as DOM is ready)
    initSidebar();
    initSidebarToggle();
    ensureSidebarComponents();
    initBookmarks();
    initSectionCollapse();
    initScrollTracking();
    initContentSearch();

    // 2. Scrawl systems (need to be ready before load)
    initCutterNotes();
    initUserScrawls();
  }

  // Run UI init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Run heavy/canvas systems on window.load
  window.addEventListener('load', () => {
    initMotes();
    initParallax();
    initSectionObservers();
    buildGreatWheel();
    initModuleFilter();
  });
})();
