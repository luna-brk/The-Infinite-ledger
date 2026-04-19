/**
 * Currency Converter Component
 * Dynamically loads and parses the multiversal manifest with high-precision categorization.
 */
class CurrencyConverter {
  constructor(mountPointSelector = '#currency-converter-mount') {
    this.mountPoint = document.querySelector(mountPointSelector);
    this.CURRENCY_DATA = [];
    this.sourceId = ''; 
    this.targetId = '';
    this.activeSlot = null;
    this.currentCat = 'all';

    this.PLANE_ALIGNMENTS = {
      'sigil': 'N', 'astral': 'N', 'prime': 'N', 'shadowfell': 'N', 'feywild': 'CN',
      'celestia': 'LG', 'arcadia': 'LN', 'mechanus': 'LN', 'bytopia': 'NG', 'elysium': 'NG', 
      'beastlands': 'CG', 'arborea': 'CG', 'ysgard': 'CN', 'limbo': 'CN', 'pandemonium': 'CE',
      'abyss': 'CE', 'carceri': 'NE', 'hades': 'NE', 'gehenna': 'LE', 'hells': 'LE', 'acheron': 'LN',
      'fire': 'N', 'water': 'N', 'earth': 'N', 'air': 'N'
    };

    if (this.mountPoint) {
      this.init();
    }
  }

  async init() {
    try {
      const htmlResponse = await fetch('components/currency-converter/currency-converter.html?v=' + Date.now());
      this.mountPoint.innerHTML = await htmlResponse.text();

      await this.loadManifest();
      this.setupEventListeners();
      this.setupInteraction();
      
      if (this.CURRENCY_DATA.length > 0) {
        const jinx = this.CURRENCY_DATA.find(c => c.id.includes('jinx') && c.id.includes('standard'));
        this.sourceId = jinx ? jinx.id : this.CURRENCY_DATA[0].id;
        const gold = this.CURRENCY_DATA.find(c => c.id.includes('oerth') && c.id.includes('gold-piece'));
        this.targetId = gold ? gold.id : (this.CURRENCY_DATA[1] ? this.CURRENCY_DATA[1].id : this.CURRENCY_DATA[0].id);
      }

      this.updateSlotUI('source', this.sourceId);
      this.updateSlotUI('target', this.targetId);

    } catch (e) {
      console.error('CurrencyConverter initialization failed:', e);
    }
  }

  async loadManifest() {
    const response = await fetch('components/currency-converter/all-currencies.txt?v=' + Date.now());
    const text = await response.text();
    this.CURRENCY_DATA = this.parseManifest(text);
  }

  parseManifest(text) {
    const lines = text.split('\n');
    const data = [];
    let currentCategory = 'Other';
    let currentPlane = 'Unknown';
    let currentPlaneFlavor = '';
    let lastAsset = null;
    
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      let line = rawLine.trim();
      if (!line) continue;

      // Primary Category Detection: Triggered by Section Header Pattern (surrounded by ---)
      if (line.match(/^-{10,}$/) && i + 1 < lines.length) {
        const headerText = lines[i + 1].toUpperCase();
        if (headerText.match(/^\d+\.\s+/)) {
          if (headerText.includes('PRIME MATERIAL')) currentCategory = 'Prime';
          else if (headerText.includes('TRANSITIVE') || headerText.includes('MIRROR')) currentCategory = 'Transitive';
          else if (headerText.includes('PRIME ELEMENTAL')) currentCategory = 'Classical';
          else if (headerText.includes('BORDER') || headerText.includes('PARA') || headerText.includes('QUASI') || headerText.includes('ENERGIZED')) currentCategory = 'Border';
          else if (headerText.includes('ENERGY PLANES')) currentCategory = 'Border'; // Groups with quasi/para
          else if (headerText.includes('UPPER')) currentCategory = 'Upper';
          else if (headerText.includes('LOWER')) currentCategory = 'Lower';
          else if (headerText.includes('NEUTRAL') || headerText.includes('LAW & CHAOS')) currentCategory = 'Neutral';
          else if (headerText.includes('HUB')) currentCategory = 'Reserves';
          else if (headerText.includes('METAPHYSICAL')) currentCategory = 'Metaphysical';
          
          i += 2; // Skip the text line and the bottom separator
          lastAsset = null;
          continue;
        }
      }

      // Plane/World Detection: [ NAME ]
      if (line.startsWith('[') && line.includes(']')) {
        currentPlane = line.match(/\[(.*?)\]/)[1].trim();
        currentPlaneFlavor = '';
        lastAsset = null;
        continue;
      }

      // Plane Flavor: Flavor: "..."
      if (line.startsWith('Flavor:')) {
        currentPlaneFlavor = line.replace('Flavor:', '').trim().replace(/^"|"$/g, '');
        lastAsset = null;
        continue;
      }

      // Asset Entry: "- Name: Value gp. (Desc)"
      if (line.startsWith('- ')) {
        const parts = line.substring(2).split(':');
        if (parts.length < 2) continue;

        const nameRaw = parts[0].trim();
        const name = nameRaw.replace(/^\d+\s+/, ''); 
        const valuePart = parts[1].trim();
        
        let val = 0;
        const valMatch = valuePart.match(/([\d,.]+)\s*gp/);
        if (valMatch) val = parseFloat(valMatch[1].replace(/,/g, ''));
        else if (valuePart.toLowerCase().includes('variable')) val = 1.0; 

        const id = (currentPlane + '-' + name).toLowerCase().replace(/\(.*\)/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); 

        let itemDesc = valuePart.replace(/[\d,.]+\s*gp\.?/, '').trim().replace(/^"|"$/g, '').replace(/^\(|\)$/g, '');

        let finalDesc = '';
        if (currentPlaneFlavor) finalDesc += currentPlaneFlavor + ' — ';
        finalDesc += itemDesc;

        lastAsset = {
          id, name, cat: currentCategory, plane: currentPlane, val: val, 
          icon: this.getIcon(name), 
          desc: finalDesc.trim(),
          friction: this.getInherentFriction(currentCategory),
          alignment: this.detectAlignment(currentPlane)
        };
        data.push(lastAsset);
      } else if (lastAsset && rawLine.startsWith('  ')) {
        const cont = line.replace(/^"|"$/g, '').replace(/^\(|\)$/g, '').trim();
        if (cont) lastAsset.desc += ' ' + cont;
      }
    }
    return data;
  }

  getIcon(name) {
    if (name.includes('Gold') || name.includes('Solar') || name.includes('Crown')) return '🟡';
    if (name.includes('Silver') || name.includes('Mark') || name.includes('Shilling')) return '⚪';
    if (name.includes('Iron') || name.includes('Steel') || name.includes('Cube')) return '⬛';
    if (name.includes('Gem') || name.includes('Crystal') || name.includes('Diamond')) return '💎';
    if (name.includes('Jinx')) return '🪙';
    if (name.includes('Soul') || name.includes('Shell')) return '🐚';
    if (name.includes('Vial') || name.includes('Essence') || name.includes('Water')) return '🧪';
    return '📜';
  }

  detectAlignment(plane) {
    const p = plane.toLowerCase();
    if (p.includes('celestia') || p.includes('arcadia')) return 'LG';
    if (p.includes('bytopia') || p.includes('elysium')) return 'NG';
    if (p.includes('beastlands') || p.includes('arborea')) return 'CG';
    if (p.includes('ysgard') || p.includes('limbo')) return 'CN';
    if (p.includes('pandemonium') || p.includes('abyss')) return 'CE';
    if (p.includes('carceri') || p.includes('hades') || p.includes('waste')) return 'NE';
    if (p.includes('baator') || p.includes('hells') || p.includes('gehenna')) return 'LE';
    if (p.includes('mechanus') || p.includes('acheron')) return 'LN';
    return 'N';
  }

  getInherentFriction(cat) {
    const c = cat.toLowerCase();
    if (c === 'reserves') return 0.01;
    if (c === 'prime') return 0.03;
    if (c === 'classical' || c === 'border') return 0.07;
    if (c === 'metaphysical') return 0.15;
    return 0.05;
  }

  calculate() {
    const amt = parseFloat(document.getElementById('conv-amount').value) || 0;
    const src = this.CURRENCY_DATA.find(c => c.id === this.sourceId);
    const tgt = this.CURRENCY_DATA.find(c => c.id === this.targetId);
    if (!src || !tgt) return;

    const locId = document.getElementById('conv-plane').value;
    const locAlign = this.PLANE_ALIGNMENTS[locId] || 'N';
    const inherent = Math.max(src.friction, tgt.friction);
    
    let conflict = 0;
    const getAxis = (a) => ({ g: a.includes('G'), e: a.includes('E'), l: a.includes('L'), c: a.includes('C') });
    const locAx = getAxis(locAlign);
    const srcAx = getAxis(src.alignment);
    const tgtAx = getAxis(tgt.alignment);

    if ((locAx.g && (srcAx.e || tgtAx.e)) || (locAx.e && (srcAx.g || tgtAx.g))) conflict += 0.10;
    if ((locAx.l && (srcAx.c || tgtAx.c)) || (locAx.c && (srcAx.l || tgtAx.l))) conflict += 0.10;
    
    let manual = 0;
    if (document.getElementById('ov-specialist')?.checked) manual -= 0.03;
    if (document.getElementById('ov-friend')?.checked) manual -= 0.02;
    if (document.getElementById('ov-emergency')?.checked) manual += 0.15;
    if (document.getElementById('ov-bulk')?.checked) manual -= 0.02;

    const totalFriction = Math.max(0, inherent + conflict + manual);
    const rawVal = (amt * src.val) / tgt.val;
    const payout = rawVal * (1 - totalFriction);

    const pluralize = (name, count) => {
      if (count === 1) return name;
      if (name.match(/(s|x|z|ch|sh)$/i)) return name + 'es';
      if (name.includes('Piece')) return name.replace('Piece', 'Pieces');
      if (name.includes('Mark')) return name.replace('Mark', 'Marks');
      if (name.includes('Standard')) return name.replace('Standard', 'Standards');
      return name + 's';
    };

    document.getElementById('rec-source-val').textContent = amt.toLocaleString() + ' ' + src.icon;
    document.getElementById('rec-target-val').textContent = rawVal.toLocaleString(undefined, {maximumFractionDigits: 2}) + ' ' + tgt.icon;
    document.getElementById('rec-inherent').textContent = `-${(inherent * 100).toFixed(1)}%`;
    document.getElementById('rec-conflict').textContent = `-${(conflict * 100).toFixed(1)}%`;
    document.getElementById('rec-manual').textContent = (manual >= 0 ? '+' : '') + (manual * 100).toFixed(0) + '%';
    document.getElementById('rec-payout').textContent = payout.toLocaleString(undefined, {maximumFractionDigits: 2}) + ' ' + pluralize(tgt.name, payout);
    
    const rec = document.querySelector('.converter-receipt');
    if (rec) { rec.classList.remove('printing'); void rec.offsetWidth; rec.classList.add('printing'); }
  }

  setupInteraction() {
    const drawer = document.getElementById('converter-drawer');
    const header = drawer?.querySelector('.drawer-header.draggable');
    const resizeHandle = drawer?.querySelector('.drawer-resize-handle');
    if (!drawer) return;

    let isInteracting = false;
    let mode = null; 
    let startX, startY, startLeft, startTop, startWidth, startHeight;

    const onMouseDown = (e, interactionMode) => {
      if (e.target.closest('button')) return;
      isInteracting = true; mode = interactionMode; startX = e.clientX; startY = e.clientY;
      const rect = drawer.getBoundingClientRect(); startLeft = rect.left; startTop = rect.top; startWidth = rect.width; startHeight = rect.height;
      drawer.style.transition = 'none'; drawer.style.bottom = 'auto'; drawer.style.right = 'auto'; drawer.style.margin = '0';
      drawer.style.left = startLeft + 'px'; drawer.style.top = startTop + 'px';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isInteracting) return;
      if (mode === 'drag') {
        let nl = startLeft + (e.clientX - startX), nt = startTop + (e.clientY - startY);
        nl = Math.max(0, Math.min(nl, window.innerWidth - drawer.offsetWidth));
        nt = Math.max(0, Math.min(nt, window.innerHeight - drawer.offsetHeight));
        drawer.style.left = nl + 'px'; drawer.style.top = nt + 'px';
      } else if (mode === 'resize') {
        drawer.style.width = Math.max(320, startWidth + (e.clientX - startX)) + 'px';
        drawer.style.height = Math.max(400, startHeight + (e.clientY - startY)) + 'px';
      }
    };

    const onMouseUp = () => { isInteracting = false; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
    if (header) header.addEventListener('mousedown', (e) => onMouseDown(e, 'drag'));
    if (resizeHandle) resizeHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'resize'));
  }

  setupEventListeners() {
    const drawer = document.getElementById('converter-drawer');
    const modal = document.getElementById('currency-picker-modal');
    const search = document.getElementById('picker-search');
    const closePicker = modal?.querySelector('.picker-close');
    const drawerClose = drawer?.querySelector('.drawer-close');
    const openBtn = document.getElementById('open-converter-btn');

    if (openBtn) openBtn.onclick = () => { drawer.classList.toggle('open'); openBtn.classList.toggle('active'); };
    if (drawerClose) drawerClose.onclick = () => { drawer.classList.remove('open'); openBtn?.classList.remove('active'); };

    document.querySelectorAll('.exchange-slot').forEach(slot => {
      slot.onclick = () => {
        this.activeSlot = slot.id.includes('source') ? 'source' : 'target';
        modal.classList.add('active');
        this.renderPickerGrid('');
        search.focus();
      };
    });

    modal?.querySelectorAll('.manifest-tab').forEach(tab => {
      tab.onclick = () => {
        modal.querySelectorAll('.manifest-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCat = tab.dataset.cat;
        this.renderPickerGrid(search.value);
      };
    });

    if (closePicker) closePicker.onclick = () => modal.classList.remove('active');
    if (search) search.oninput = (e) => this.renderPickerGrid(e.target.value);
    if (document.getElementById('conv-calculate')) document.getElementById('conv-calculate').onclick = () => this.calculate();
  }

  renderPickerGrid(q = '') {
    const grid = document.getElementById('picker-grid');
    if (!grid) return;
    grid.innerHTML = ''; 
    const activeCat = this.currentCat.toLowerCase();
    let filtered = this.CURRENCY_DATA;
    if (activeCat !== 'all') filtered = filtered.filter(c => c.cat.toLowerCase() === activeCat);
    if (q) {
      const lowQ = q.toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(lowQ) || c.plane.toLowerCase().includes(lowQ) || c.cat.toLowerCase().includes(lowQ));
    }
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'market-card';
      card.innerHTML = `
        <div class="market-header"><span class="market-name">${item.icon} ${item.name}</span><span class="market-tier">${item.plane}</span></div>
        <div class="market-stats">
          <div class="market-stat"><span class="market-label">Value</span><span class="market-value">${item.val.toFixed(2)} gp</span></div>
          <div class="market-stat"><span class="market-label">Align</span><span class="market-value">${item.alignment}</span></div>
        </div>
        <div class="market-flavor">${item.desc || ''}</div>
      `;
      card.onclick = () => {
        if (this.activeSlot === 'source') this.sourceId = item.id; else this.targetId = item.id;
        this.updateSlotUI(this.activeSlot, item.id);
        document.getElementById('currency-picker-modal').classList.remove('active');
      };
      grid.appendChild(card);
    });
  }

  updateSlotUI(slotType, id) {
    const item = this.CURRENCY_DATA.find(c => c.id === id);
    if (!item) return;
    const s = document.getElementById(`slot-${slotType}`);
    if (!s) return;
    s.querySelector('.slot-icon').textContent = item.icon;
    s.querySelector('.slot-name').textContent = item.name;
    s.querySelector('.slot-sub').textContent = `${item.plane} (${item.val.toFixed(2)} gp)`;
  }
}

window.addEventListener('DOMContentLoaded', () => { window.currencyConverter = new CurrencyConverter(); });
