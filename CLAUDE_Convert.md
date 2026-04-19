# Module Conversion Process: Markdown to Consortium HTML

## Overview
This document outlines the systematic conversion of high-density raw markdown lore into the high-fidelity, interactive HTML structure used by **The Infinite Ledger**.

## Conversion Strategy
Due to the immense size of raw modules (e.g., Module II @ 193KB), manual conversion is token-inefficient and prone to error. We utilize a custom Node.js build script (`convert-module-v3.js`) leveraging the `marked` library.

### 1. Architectural Mapping
- **H2 Headings:** Map to major Sidebar Navigation Groups.
- **H3 Headings:** Map to individual `.content-section` accordion blocks.
- **Blockquotes:** Automatically converted to `.callout.note`.
- **Special Keywords:** Lines starting with `**GM Note:**` or `**Mechanical ruling:**` are surgically upgraded to `.callout.danger` for high visibility.
- **Tables:** Every GFM table is wrapped in a `.table-wrap` container for responsive, themed display.

### 2. ID Normalization
To ensure persistence of "Cutter Scrawls" and Bookmarks:
- IDs are generated from normalized slugs of the H3 titles.
- Suffixes (e.g., `-0`, `-1`) are appended to prevent collisions in high-density reference modules.

### 3. Visual Refinement
Post-conversion, the module is manually refined using Senior Engineering patterns:
- **Zone Grids:** Regional data (e.g., Elemental Planes) is clustered into 2x2 or 3x3 grids.
- **Safeguard Lists:** Sequential rules are formatted into the numbered `.safeguard-list` pattern.

## Script Usage
```bash
# Process Raw Module II
node convert-module-v3.js
```
The script outputs `module-2/index.html` with a full sidebar, normalized IDs, and themed containers.
