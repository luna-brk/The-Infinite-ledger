const fs = require('fs');
const marked = require('marked');

const mdPath = 'Raw Modules/Module_II_Complete.md';
const htmlPath = 'module-2/index.html';
const mdContent = fs.readFileSync(mdPath, 'utf8');

const tokens = marked.lexer(mdContent);

let sections = [];
let currentSection = null;
let navGroups = [];
let currentNavGroup = null;

function renderToken(token) {
    if (token.type === 'table') return `<div class="table-wrap">\n${marked.parser([token])}\n</div>\n`;
    if (token.type === 'blockquote') return `<div class="callout note">\n${marked.parser([token])}\n</div>\n`;
    if (token.type === 'paragraph' && (token.text.startsWith('**GM Note:**') || token.text.startsWith('**GM note:**'))) {
        const text = token.text.replace(/^\*\*GM [Nn]ote:\*\*/, '<strong>GM Note:</strong>');
        return `<div class="callout danger">\n  <p>${text}</p>\n</div>\n`;
    }
    if (token.type === 'paragraph' && token.text.startsWith('**Mechanical ruling:**')) {
        const text = token.text.replace(/^\*\*Mechanical ruling:\*\*/, '<strong>Mechanical Ruling:</strong>');
        return `<div class="callout danger">\n  <p>${text}</p>\n</div>\n`;
    }
    return marked.parser([token]);
}

let sectionCounter = 0;

for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 1) continue;
    if (token.type === 'heading' && token.depth === 2 && token.text.includes('*The Infinite Ledger')) continue;
    if (token.type === 'hr') continue;
    
    if (token.type === 'heading' && token.depth === 2) {
        // Start a new Nav Group
        let rawText = token.text;
        let title = rawText.replace(/^([A-Z0-9\.]+)\s*[—\-]\s*/, '');
        
        currentNavGroup = { label: title, links: [] };
        navGroups.push(currentNavGroup);
        
        // Also start an overview section for this h2
        if (currentSection) sections.push(currentSection);
        
        let id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        currentSection = {
            id: id,
            numeral: '',
            title: title + ' (Overview)',
            html: '',
            isOverview: true
        };
        currentNavGroup.links.push({ id, text: 'Overview' });
        
    } else if (token.type === 'heading' && token.depth === 3) {
        if (currentSection) {
            // If the overview section is empty, drop it
            if (currentSection.isOverview && currentSection.html.trim() === '') {
                currentNavGroup.links.pop(); // Remove overview link
            } else {
                sections.push(currentSection);
            }
        }
        
        let rawText = token.text;
        let numeral = '';
        let title = rawText;
        
        const match = rawText.match(/^([A-Z0-9\.]+)\s*[—\-]\s*(.+)$/);
        if (match) {
            numeral = match[1];
            title = match[2];
        }
        
        let id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        currentSection = {
            id: id + '-' + sectionCounter++,
            numeral: numeral ? `§ ${numeral.replace('II.', '2.')}` : '',
            title: title,
            html: '',
            isOverview: false
        };
        
        if (currentNavGroup) {
            currentNavGroup.links.push({ id: currentSection.id, text: numeral ? `${numeral} — ${title}` : title });
        }
        
    } else if (currentSection) {
        if (token.type === 'heading' && token.depth > 3) {
             currentSection.html += `<h${token.depth}>${token.text}</h${token.depth}>\n`;
        } else {
             currentSection.html += renderToken(token);
        }
    }
}
if (currentSection) {
    if (!(currentSection.isOverview && currentSection.html.trim() === '')) {
        sections.push(currentSection);
    }
}

// Build Sidebar HTML
let navHtml = '';
for (const group of navGroups) {
    if (group.links.length === 0) continue;
    navHtml += `  <div class="nav-section">\n    <div class="nav-section-label">${group.label}</div>\n`;
    for (const link of group.links) {
        navHtml += `    <a href="#${link.id}" class="nav-link" data-section="${link.id}">${link.text}</a>\n`;
    }
    navHtml += `  </div>\n\n`;
}

// Build Main HTML
let sectionsHtml = '';
for (const sec of sections) {
    sectionsHtml += `<!-- ─── ${sec.title.toUpperCase()} ────────────────────────────────────── -->\n`;
    sectionsHtml += `<section class="content-section" id="${sec.id}">\n`;
    sectionsHtml += `  <div class="section-header">\n`;
    if (sec.numeral) sectionsHtml += `    <span class="section-numeral">${sec.numeral}</span>\n`;
    sectionsHtml += `    <span class="section-title">${sec.title}</span>\n`;
    sectionsHtml += `    <span class="section-chevron">▾</span>\n`;
    sectionsHtml += `  </div>\n`;
    sectionsHtml += `  <div class="section-body">\n`;
    sectionsHtml += `    ${sec.html.trim().replace(/\n/g, '\n    ')}\n`;
    sectionsHtml += `  </div>\n`;
    sectionsHtml += `</section>\n\n`;
}

let template = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Module II — Currencies &amp; Mediums of Exchange · The Infinite Ledger</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;500;600;700;900&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=IM+Fell+English+SC&family=IM+Fell+DW+Pica:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../infinite-ledger.css">
<style>
body { flex-direction: row; align-items: stretch; padding: 0; }
</style>
</head>
<body>

<canvas id="motes"></canvas>
<button id="nav-toggle" aria-label="Toggle navigation">☰</button>

<nav id="sidebar">
  <div class="sidebar-header">
    <a href="../index.html" class="sidebar-back">The Infinite Ledger</a>
    <div class="sidebar-title">Module II</div>
    <div class="sidebar-subtitle">Currencies &amp; Exchange</div>
  </div>
  <div class="sidebar-search">
    <input type="search" class="search-input" id="search-input" placeholder="Search this module…" autocomplete="off">
  </div>
  <div class="sidebar-progress">
    <div class="progress-label"><span>Reading Progress</span><span id="progress-pct">0%</span></div>
    <div class="progress-track"><div class="progress-track-fill" id="progress-fill"></div></div>
  </div>
${navHtml}
  <div class="nav-section">
    <div class="nav-section-label">Navigation</div>
    <a href="../module-1/index.html" class="nav-link">← Module I — Framework</a>
    <a href="../index.html" class="nav-link">Master Index</a>
  </div>
</nav>

<main id="main">
<div class="page-container">

<header class="module-banner">
  <div class="banner-top">
    <div class="banner-module-num">Module II · Standing Schedule</div>
    <h1 class="banner-title">Currencies &amp; Mediums of Exchange</h1>
    <div class="banner-subtitle">Coinage, Barter-Tokens, and Metaphysical Tender</div>
  </div>
  <div class="banner-body">
    <div class="status-row"><div class="status-badge"><span class="status-dot"></span>◆ Active Reference</div></div>
    <p class="covers-line">This module defines the sanctioned mediums through which planar commerce is conducted, the conversion rates observed by the Consortium, and the "Friction" costs of ideology.</p>
  </div>
</header>

${sectionsHtml}

<div class="module-nav">
  <a href="../module-1/index.html" class="module-nav-btn prev">
    <span class="nav-btn-label">Previous Module</span>
    <span class="nav-btn-title">Module I — Framework &amp; Skeleton</span>
  </a>
  <a href="../index.html" class="module-nav-btn next">
    <span class="nav-btn-label">Home</span>
    <span class="nav-btn-title">Prospectus Hub</span>
  </a>
</div>

</div>
</main>

<button id="scroll-top" aria-label="Scroll to top" title="Back to top">↑</button>
<script src="../ledger-scripts.js" defer></script>
</body>
</html>`;

fs.writeFileSync(htmlPath, template);
console.log('Conversion complete!');