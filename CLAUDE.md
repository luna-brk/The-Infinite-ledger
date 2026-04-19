# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**The Infinite Ledger** is a static, no-build Planescape-flavoured D&D trade economics reference site. There is no framework, no package manager, no bundler, and no test suite. All development is edit-and-refresh in a browser.

To preview: open `index.html` directly in a browser, or use any static file server (e.g. `npx serve .`). There are no compile or lint steps.

---

## Project Structure Mapping

```
/
├── index.html              ← Main prospectus / ledger index (the "home" page)
├── infinite-ledger.css     ← Single master stylesheet for ALL pages
├── ledger-scripts.js       ← Single reusable JS file for ALL pages
├── CLAUDE.md               ← This file
├── README.md               ← Project readme
├── assets/
│   ├── consortium-seal.png ← Wax-seal image used in the footer medallion
│   └── placeholder.md      ← Asset folder placeholder
├── module-1/
│   └── index.html          ← Ledger I full article page (sidebar layout)
└── test/
    └── index.html          ← Scratch/dev sandbox page
```

Every page links the same `infinite-ledger.css` and `ledger-scripts.js`. New ledger module pages (module-2/, module-3/, etc.) follow the `module-1/index.html` pattern exactly — sidebar layout with `<main id="main">` and `.page-container`.

---

## Site Anatomy Guide

### index.html — Prospectus / Index Page

```
<body class="sidebar-collapsed">
  <canvas id="motes">              ← Particle canvas (JS-driven)
  <button id="nav-toggle">         ← Mobile sidebar toggle
  <nav id="sidebar">               ← Bookmarks-only sidebar (no section nav on index)
  <div class="top-ribbon">         ← Folio label + search bar (#moduleSearch)
  <div class="page">               ← Outer parchment card (820px max-width)
    <div class="bookmark">         ← Decorative leather bookmark tab (top-right)
    <div class="corner corner-tl/tr/bl/br"> ← Four SVG corner ornaments
    <div class="cutter-note left/right">    ← NPC margin scrawls (decorative)
    <div class="page-inner">       ← All readable content lives here
      <div class="header-band">    ← Dark astronomical header with title
      <div class="rule-line">      ← Bronze divider line (reused throughout)
      <div class="preamble">       ← Introductory body text
      <div class="great-wheel">    ← 600×600 SVG Great Wheel (JS populates tokens)
      <p class="wheel-label">      ← Caption beneath the wheel
      <p class="section-heading">  ← "Standing Index of Ledgers" heading
      <div class="filter-tabs">    ← ALL / ACTIVE / IN DRAFT / REFERENCE tabs
      <div class="module-grid" id="moduleGrid">  ← 2-col grid of .module-card elements
      <div id="noResults">         ← Hidden; shown when search/filter yields nothing
      <div class="footer-area">    ← Three Pillars + medallion seal + edition mark
```

### module-1/index.html — Article / Module Page

```
<body>                             ← No sidebar-collapsed class; sidebar starts open
  <canvas id="motes">
  <button id="nav-toggle">
  <nav id="sidebar">               ← Full navigation sidebar with section links,
                                     search input, reading progress bar, bookmarks
  <main id="main">
    <div class="page-container">   ← 820px centred content column
      <!-- Module Banner, content-section blocks, etc. -->
```

Content sections use `.content-section[id]` + `.section-header` + `.section-body` for the collapsible accordion behaviour.

---

## Component Documentation

### Great Wheel (`buildGreatWheel()` — ledger-scripts.js:133)
- Runs once on `window load`.
- Reads the `<svg>` inside `.great-wheel`, finds `#planeTokens` and `#wheelSpokes` groups, then appends 16 spoke `<line>` elements and 16 token `<g>` elements (one per Outer Plane).
- Each token is a `<g class="wheel-counter">` nested inside a rotated wrapper so the plane label always reads upright while the outer ring spins.
- CSS animations `rotate-slow` (240 s) and `rotate-reverse` (240 s) on `.wheel-spin` / `.wheel-counter` drive the spin; `will-change: transform` promotes them to compositor layers.
- The wheel is defined entirely in `index.html`'s inline SVG (`<defs>`, gradients, filter `#tokenGlow`). The JS only appends dynamic children; the static rings, labels, and Sigil centrepiece are hard-coded in HTML.

### Module Grid Filter (`initModuleFilter()` — ledger-scripts.js:222)
- Targets `#moduleGrid`. Each `.module-card` carries `data-status` (`active`, `skeleton`, `reference`) and `data-tags`.
- Clicking a `.filter-tab` sets `currentFilter` and calls `applyFilters()`, which toggles `.filtered-out` (`display: none`) on non-matching cards.
- The search input `#moduleSearch` runs the same `applyFilters()` on every keystroke, filtering by title, description, and tags simultaneously.

### Motes (`initMotes()` — ledger-scripts.js:22)
- Canvas `#motes` is `position: fixed; inset: 0` — it overlays the entire viewport but is `pointer-events: none`.
- Spawns up to 90 particles. Each has Brownian drift and mouse-repulsion within 110 px. Particles wrap at viewport edges.
- Amber particles (70% probability) use gold tones; the rest use cool blue-silver tones.
- Respects `prefers-reduced-motion`.

### Bookmarks (`initBookmarks()` — ledger-scripts.js:401)
- Persisted to `localStorage` under key `infinite-ledger-bookmarks-v1` as a JSON array.
- `window.ledgerAPI.toggleBookmark(sectionId, title)` is exposed globally so any page can call it.
- `ensureSidebarComponents()` (ledger-scripts.js:649) injects the bookmarks `<div>` into any sidebar that doesn't already have one, so module pages get bookmarks automatically without extra HTML.

### Sidebar Toggle (`initSidebarToggle()` — ledger-scripts.js:631)
- `#nav-toggle` button toggles `.collapsed` on `#sidebar` and `sidebar-collapsed` on `<body>`.
- `body.sidebar-collapsed` removes the `--nav-width` padding-left (see CSS custom property `--nav-width: 280px`).

### Collapsible Sections (`initSectionCollapse()` — ledger-scripts.js:295)
- Clicking a `.section-header` toggles `.collapsed` on its immediate next sibling (`.section-body`).
- Used only on module article pages, not on the index.

---

### Advanced Visual Patterns (The High-Fidelity Toolkit)

These patterns are designed to handle the high information density of interplanar commerce while maintaining a themed, "hand-crafted" aesthetic.

| Pattern | Class | Best Used For |
|---|---|---|
| **Planar Market Card** | `.market-card` | Regional economic snapshots (Markup, Friction, AF). |
| **Comparison Ledger** | `.comparison-ledger` | Contrasting viewpoints (Official Law vs. Street Reality). |
| **Process Flow** | `.process-flow` | Step-by-step procedures (Minting, Authentication). |
| **Tome Statistics** | `.tome-stat` | Circular, iconic data points (Tax rates, WBL). |
| **Consortium Decree** | `.consortium-decree` | Formal laws and standing orders with wax seals. |
| **Trade Good Dossier** | `.good-dossier` | Commodity data with icons and categorical tags. |
| **Alignment Axis** | `.alignment-axis` | Visual sliders for ideological placement. |
| **Cutter's Cant Box** | `.cant-box` | Dashed callouts for street-level rumors/secrets. |
| **Coverage Grid** | `.coverage-grid` | Massive 2-column lists (Module topics, coverage). |
| **Usage Guide** | `.usage-guide` | Annotated, hand-written instructions. |
| **Foundational Anchor** | `.foundational-anchor` | Heavy, centered cornerstone rules (WBL anchors). |
| **Planar Pulse Map** | `.pulse-list` | Regional acceptance status with color-coded badges. |
| **Institutional Registry** | `.registry-entry` | Bundling data tables with operational context footers. |
| **Planar Directory** | `.directory-list` | Vertical indexes for locations and layers. |
| **Currency Manifest** | `.coin-grid` | Responsive cards for regional assets and coinage. |

#### Technical Implementation Notes
- **Pulse List Colors:** Use `.high`, `.mid`, `.low`, or `.none` on `.pulse-strength` for color-coding.
- **Coin Cards:** Are fully responsive; will stack on mobile and grid-fill on desktop.
- **Dossier Icons:** Intended for emoji or small SVG glyphs in the `.good-icon` container.

---

## CSS Explainer

**Single file:** `infinite-ledger.css` serves every page. Sections are clearly delimited with `/* ── SECTION NAME ── */` banners.

### Custom Properties (`:root`, lines ~60–105)
All colours, font stacks, and the sidebar width live here. Key palette:
- `--bronze` `#B8873B`, `--bronze-bright` `#D9A957`, `--bronze-pale` `#E6C483` — primary gold accent family
- `--ink` `#D4C4A0`, `--ink-faint` `#7A6A50` — body text tones
- `--astral-deep` `#070810` — deepest background
- `--nav-width: 280px` — sidebar width; toggled via `body.sidebar-collapsed`

### Global Animations (lines ~107–127)
| Name | Use |
|---|---|
| `fadeIn` | Page load fade-in on `.page` |
| `candle-flicker` | Pulsing glow on `.main-title` and the active-status dot |
| `rotate-slow` | Great Wheel outer ring (240 s, clockwise) |
| `rotate-reverse` | Plane token counter-rotation (240 s, anti-clockwise) |
| `drift-star` | `body::before` starfield opacity pulse |
| `wax-press` | Medallion seal entrance animation |

### Layout System
- **Index page:** `body` is a flex column centring `.page` (820 px max-width). `.page` is `position: relative` and contains `.page-inner` (`position: relative; z-index: 2`) where all content lives. Absolutely-positioned decorative elements (corners, bookmark tab) are children of `.page`.
- **Module pages:** `body` is a flex row. `#sidebar` is a fixed-width column (280 px); `#main` fills the rest with `flex: 1`.

### Key CSS Rules to Know

**`.page` background (line ~239):** Three layers — an SVG fractal-noise texture tile, a warm amber radial gradient, and a dark linear gradient base. Do not change the noise SVG inline; it is not a separate file.

**`.great-wheel` (line ~546):** `isolation: isolate` prevents the SVG's drop-shadow filter from blending into surrounding content. The SVG itself has `overflow: hidden; contain: paint` to clip the spinning elements cleanly.

**`.module-card.filtered-out` (line ~707):** Uses `display: none` (not `visibility` or `opacity`) — no transition. Instant hide is intentional.

**`.filter-tab.active::after` (line ~601 area):** The bronze underline indicator on active tabs is a CSS `::after` pseudo-element, not a border.

**`.bg-sigil` (line ~901):** Removed from `index.html` — the SVG watermark element no longer exists in the DOM. The CSS rule remains but is inert.

**Sidebar layout (module pages, line ~1050 area):** `#sidebar` uses `position: sticky; top: 0; height: 100vh; overflow-y: auto` so it stays fixed while main content scrolls.

### Responsive Breakpoints
- **`≤ 820px`:** Module grid drops to single column; `.great-wheel` shrinks to 360 px; cutter margin notes hidden; sidebar stacks.
- **`print`:** Background stripped to white; sidebar and canvas hidden.
