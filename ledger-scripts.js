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
    const COUNT = Math.min(38, Math.floor((window.innerWidth * window.innerHeight) / 48000));

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

        if (m.x < -30 || m.x > W + 30 || m.y < -30 || m.y > H + 30) {
          motes[i] = spawn(true);
          continue;
        }

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
    const TOKEN_RADIUS = 270;
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

      // Spoke
      const sp = document.createElementNS(svgNS, 'line');
      sp.setAttribute('x1', (CX + 176 * Math.cos(rad)).toFixed(2));
      sp.setAttribute('y1', (CY + 176 * Math.sin(rad)).toFixed(2));
      sp.setAttribute('x2', (CX + 238 * Math.cos(rad)).toFixed(2));
      sp.setAttribute('y2', (CY + 238 * Math.sin(rad)).toFixed(2));
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

  /* ─── Initialize everything ─── */
  window.addEventListener('load', () => {
    initMotes();
    buildGreatWheel();
    initModuleFilter();
  });

})();
