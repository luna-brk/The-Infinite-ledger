const fs = require('fs');
const marked = require('marked');

// Read files
const mdPath = 'Raw Modules/Module_II_Complete.md';
const htmlPath = 'module-2/index.html';
const mdContent = fs.readFileSync(mdPath, 'utf8');

// Parse markdown to AST
const tokens = marked.lexer(mdContent);

let sections = [];
let currentSection = null;
let currentNavGroup = null;
let navGroups = []; // Array of { label, links: [{ id, text }] }

// Custom rendering logic for specific tokens
function renderToken(token) {
    if (token.type === 'table') {
        const html = marked.parser([token]);
        return `<div class="table-wrap">\n${html}\n</div>\n`;
    }
    if (token.type === 'blockquote') {
        const html = marked.parser([token]);
        return `<div class="callout note">\n${html}\n</div>\n`;
    }
    if (token.type === 'paragraph' && token.text.startsWith('**GM note:**')) {
        const text = token.text.replace('**GM note:**', '<strong>GM Note:</strong>');
        return `<div class="callout">\n  <p>${text}</p>\n</div>\n`;
    }
    if (token.type === 'paragraph' && token.text.startsWith('**On higher denominations:**')) {
        return marked.parser([token]); // Standard render
    }
    // Lists, paragraphs, headings (except h2), etc.
    return marked.parser([token]);
}

for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 1) {
        continue; // Skip module title
    }
    if (token.type === 'heading' && token.depth === 2 && token.text.includes('*The Infinite Ledger')) {
        continue; // Skip subtitle
    }
    if (token.type === 'hr') {
        continue; // Skip horizontal rules used for separation in MD
    }
    
    if (token.type === 'heading' && token.depth === 2) {
        // e.g. "II.1 — HARD CURRENCIES" or "SECTION BREAK — HARD CURRENCY QUICK REFERENCE"
        if (currentSection) {
            sections.push(currentSection);
        }
        
        let rawText = token.text;
        let numeral = '';
        let title = rawText;
        
        const match = rawText.match(/^(II\.\d+)\s*[—\-]\s*(.+)$/);
        if (match) {
            numeral = match[1];
            title = match[2];
        } else {
            const match2 = rawText.match(/^([A-Z0-9\.]+)\s*[—\-]\s*(.+)$/);
            if (match2) {
                numeral = match2[1];
                title = match2[2];
            }
        }
        
        let id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (id === 'module-overview') id = 'overview';
        
        currentSection = {
            id: id,
            numeral: numeral ? `§ ${numeral.replace('II.', '2.')}` : '',
            title: title,
            html: ''
        };
        
        // Navigation Grouping Logic
        if (!currentNavGroup || title === 'HARD CURRENCIES' || title === 'PRIME MATERIAL CURRENCIES' || title === 'THE TRANSITIVE PLANES') {
            let label = 'Overview';
            if (title === 'HARD CURRENCIES') label = 'Hard Currencies';
            else if (title === 'PRIME MATERIAL CURRENCIES') label = 'Prime Worlds';
            else if (title === 'THE TRANSITIVE PLANES') label = 'Transitive Planes';
            else if (title === 'THE INNER PLANES') label = 'Inner Planes';
            else if (title.includes('FEYWILD') || title.includes('SHADOWFELL') || title.includes('DOMAINS OF DREAD')) label = 'Echo Planes';
            else if (currentNavGroup && currentNavGroup.label === 'Overview') label = 'General';
            else if (currentNavGroup) label = currentNavGroup.label;

            if (!currentNavGroup || currentNavGroup.label !== label) {
                currentNavGroup = { label: label, links: [] };
                navGroups.push(currentNavGroup);
            }
        }
        
        if (title && !title.includes('SECTION BREAK')) {
           currentNavGroup.links.push({ id, text: numeral ? `${numeral} — ${title}` : title });
        }
        
    } else if (currentSection) {
        currentSection.html += renderToken(token);
    }
}
if (currentSection) sections.push(currentSection);

// Generate Sidebar HTML
let navHtml = '';
for (const group of navGroups) {
    if (group.links.length === 0) continue;
    navHtml += `  <div class="nav-section">\n    <div class="nav-section-label">${group.label}</div>\n`;
    for (const link of group.links) {
        navHtml += `    <a href="#${link.id}" class="nav-link" data-section="${link.id}">${link.text}</a>\n`;
    }
    navHtml += `  </div>\n\n`;
}

// Generate Sections HTML
let sectionsHtml = '';
for (const sec of sections) {
    if (sec.title.includes('SECTION BREAK')) {
        sectionsHtml += `<!-- ─── ${sec.title.toUpperCase()} ────────────────────────────────────── -->\n`;
        sectionsHtml += `<div style="margin: 40px 0;"><div class="rule-line"><span></span><div class="rule-diamond sm"></div><span></span></div></div>\n`;
        sectionsHtml += sec.html; // usually just a table
        sectionsHtml += `<div style="margin: 40px 0;"><div class="rule-line"><span></span><div class="rule-diamond sm"></div><span></span></div></div>\n\n`;
        continue;
    }

    sectionsHtml += `<!-- ─── ${sec.title.toUpperCase()} ────────────────────────────────────── -->\n`;
    sectionsHtml += `<section class="content-section" id="${sec.id}">\n`;
    sectionsHtml += `  <div class="section-header">\n`;
    if (sec.numeral) {
        sectionsHtml += `    <span class="section-numeral">${sec.numeral}</span>\n`;
    }
    sectionsHtml += `    <span class="section-title">${sec.title}</span>\n`;
    sectionsHtml += `    <span class="section-chevron">▾</span>\n`;
    sectionsHtml += `  </div>\n`;
    sectionsHtml += `  <div class="section-body">\n`;
    sectionsHtml += `    ${sec.html.trim().replace(/\n/g, '\n    ')}\n`;
    sectionsHtml += `  </div>\n`;
    sectionsHtml += `</section>\n\n`;
}

// Read existing HTML and replace placeholders
let template = fs.readFileSync(htmlPath, 'utf8');

// Replace sidebar nav sections (from <div class="nav-section"> until <div class="nav-section"> Navigation )
const navStartIdx = template.indexOf('<div class="nav-section">');
const navEndIdx = template.indexOf('<div class="nav-section">\n    <div class="nav-section-label">Navigation</div>');
if (navStartIdx !== -1 && navEndIdx !== -1) {
    template = template.substring(0, navStartIdx) + navHtml + template.substring(navEndIdx);
}

// Replace main content sections (from <!-- ─── PHILOSOPHY to <!-- Module Navigation -->)
const contentRegex = /<!-- ─── PHILOSOPHY ────────────────────────────────────── -->[\s\S]*?(?=<!-- Module Navigation -->)/;
template = template.replace(contentRegex, sectionsHtml);

fs.writeFileSync(htmlPath, template);
console.log('Conversion complete!');
