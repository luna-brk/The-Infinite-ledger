# GEMINI.md

## Project Overview
**The Infinite Ledger** is a static, no-build Planescape-themed D&D trade economics reference system for Pathfinder 1e. It provides a comprehensive framework for planar economies, currencies, and arbitrage.

The project is designed with a "vanilla-first" philosophy: no frameworks, no package managers, and no build steps. All development is done via direct editing of HTML, CSS, and JS files, with live previewing in a browser.

### Core Technologies
- **HTML5:** Semantic structure for index and module pages.
- **CSS3:** A single master stylesheet (`infinite-ledger.css`) using CSS Custom Properties for theming and complex animations.
- **JavaScript (ES6+):** A single reusable script (`ledger-scripts.js`) powering all interactive components (Canvas motes, SVG Great Wheel, filtering, bookmarks).

---

## Building and Running
As a no-build project, there are no compilation or installation steps.

### Previewing the Site
- **Direct Access:** Open `index.html` directly in any modern web browser.
- **Static Server:** Run a simple static server from the root directory:
  - `npx serve .`
  - `python -m http.server`
  - `php -S localhost:8000`

---

## Project Structure
- `index.html`: The "Prospectus" or hub page.
- `infinite-ledger.css`: Master stylesheet for the entire project.
- `ledger-scripts.js`: Master interactive script for all pages.
- `module-*/index.html`: Individual ledger modules (e.g., Module I: Framework & Skeleton).
- `assets/`: Images and static resources.
- `test/index.html`: A sandbox for testing new UI components or layouts.

---

## Development Conventions

### General Principles
- **No Dependencies:** Avoid adding external libraries or frameworks. Use vanilla JS and CSS.
- **Shared Assets:** All pages must link to the root `infinite-ledger.css` and `ledger-scripts.js`.
- **Edit-and-Refresh:** Changes are verified by refreshing the browser. No HMR or build watchers are configured.

### Adding New Modules
1. Create a new directory (e.g., `module-2/`).
2. Copy `module-1/index.html` as a template.
3. Update the sidebar navigation and content sections.
4. Use `.content-section[id]` with `.section-header` and `.section-body` to maintain collapsible accordion behavior.

### CSS & Styling
- **Custom Properties:** Use the variables defined in `:root` for colors and spacing to ensure consistency.
- **Responsive Design:** The layout is optimized for desktops but includes breakpoints for mobile (≤ 820px).
- **Animations:** Performance-critical animations (Great Wheel, Motes) use `will-change: transform` and are handled via the GPU.

### JavaScript Interactivity
- **Initialization:** Most features (motes, wheel, filters) auto-initialize based on the presence of specific DOM IDs or classes.
- **Global API:** `window.ledgerAPI` provides shared functionality like bookmark toggling.
- **Bookmarks:** Persisted in `localStorage` under `infinite-ledger-bookmarks-v1`.

---

## Site Anatomy

### Index Page Layout
- `#motes`: Particle canvas background.
- `.top-ribbon`: Search bar and folio label.
- `.page`: The main "parchment" container with decorative SVG corners.
- `.great-wheel`: Dynamic SVG component.

### Module Page Layout
- `body`: Uses `flex-direction: row` to accommodate the sidebar.
- `#sidebar`: Persistent navigation with search, progress bar, and bookmarks.
- `main#main`: Content area with `.page-container`.
