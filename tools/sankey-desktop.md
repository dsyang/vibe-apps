# Sankey Studio — Architecture & Handoff Document

## What This Is

A single-file HTML application (~1460 lines) for building interactive Sankey flow diagrams, primarily designed for personal income/expense modeling. The user wants a tool to create polished, customizable Sankey diagrams from that data.

The tool runs entirely client-side in a browser — no build step, no dependencies beyond Google Fonts loaded via CDN (DM Sans for UI, IBM Plex Mono for code/data). Desktop-only; designed for keyboard, mouse, and a normal monitor.

## Product Requirements

### Core
- Define diagrams via two separate JSON inputs: **Data** (nodes + links) and **Style Descriptor** (colors, layout, sizing). Separation is intentional — the same data can be restyled without editing values.
- Column 0 is the anchor column (Income). Negative columns (-1, -2) represent sources flowing in; positive columns (1, 2, 3) represent outflows. This maps naturally to income/expense modeling.
- Interactive: nodes are vertically draggable, title is freely draggable (x + y). Positions persist across re-renders within a session.
- Export to SVG or PNG. Exports can optionally embed the data JSON, style JSON, node offsets, and title offset as metadata (SVG comment or PNG text sidecar file) so the diagram can be reconstructed later.

### Viewport
- Initial render and the ⊡ reset button center the viewport horizontally on column 0.
- Scroll to pan, Ctrl+scroll to zoom. +/−/⊡ buttons for zoom control.
- Columns are vertically centered so node clusters create organic, wavy top/bottom edges rather than a flat top alignment.

### Not Yet Implemented (potential future work)
- Importing data back from an exported SVG/sidecar (the metadata is embedded but there's no import UI).
- Undo/redo for drag operations.
- Horizontal node dragging (nodes are currently locked to their column x position).
- Link label rendering on the diagram itself (labels exist in data but only show in tooltips).
- Column header labels (the style descriptor has no rendering for column labels yet).
- Dark/light theme toggle for the canvas (canvas is always light, UI chrome is always dark).
- Drag-and-drop JSON file import.
- Node sorting controls (currently: largest value first within each column).
- Minimum node height controls for very small values that become invisible.

## File Structure

Everything is in `sankey.html`. The structure is:

```
sankey.html
├── <head>
│   ├── Google Fonts (DM Sans, IBM Plex Mono)
│   └── <style> — all CSS (~300 lines)
├── <body>
│   ├── .app (CSS Grid: 380px sidebar | flex canvas, 48px topbar | flex content)
│   │   ├── .topbar — brand logo, Load Example button, Export button
│   │   ├── .sidebar — 3 tabs (Data, Style, Format)
│   │   │   ├── #tab-data — JSON textarea for data, format/render buttons
│   │   │   ├── #tab-style — JSON textarea for style descriptor, color preview
│   │   │   └── #tab-help — documentation of both JSON formats
│   │   └── .canvas-area — SVG viewport, zoom controls, status bar, drag hint
│   ├── #tooltip — floating div, positioned on hover
│   ├── #export-modal — overlay with format/scale/metadata options
│   └── <script> — all JavaScript (~1100 lines)
```

## Code Architecture

### State (global variables, line ~633)

| Variable | Type | Purpose |
|---|---|---|
| `currentData` | object\|null | Parsed data JSON |
| `currentStyle` | object\|null | Parsed style JSON |
| `computedNodes` | array | Layout-resolved node objects (with x, y, height) |
| `computedLinks` | array | Layout-resolved link objects (with sy, sh, ty, th) |
| `dragState` | object\|null | Active drag tracking (node or title) |
| `zoomLevel` | number | Current zoom multiplier |
| `nodeOffsets` | object | `{ nodeId: yPixelOffset }` — user drag positions |
| `titleDragOffset` | object | `{ x, y }` — title drag position |
| `lastCol0X` | number\|null | Pixel x of column 0 for viewport centering |

### Key Functions

#### Layout Engine — `computeLayout(data, style)` (line ~701)

This is the core algorithm. It:

1. Groups nodes by their `column` value (supports negative integers).
2. Resolves column x-positions from `columns.positions` (object keyed by column number string, values are 0–1 fractions of inner width) or falls back to even auto-spacing.
3. Builds a node map with source/target link arrays.
4. Computes node values as `max(sum of outgoing links, sum of incoming links)`.
5. Determines a global pixel scale by finding the tallest column (most total value + padding) and fitting it to the available draw height.
6. **Vertically centers** each column's nodes within the draw area (this creates the wavy top/bottom).
7. Applies stored `nodeOffsets` from user dragging.
8. Computes link attachment points (sy/sh on source side, ty/th on target side) by walking each node's sorted links.

Returns all computed state plus `col0X` for viewport centering.

#### SVG Rendering — `renderDiagram()` (line ~865)

Orchestrates a full re-render:
1. Parses both JSON editors, validates.
2. Calls `computeLayout()`.
3. Sets the SVG viewBox centered on column 0.
4. Renders: background rect (oversized at -5000,-5000 to cover any pan position), draggable title, gradient defs, link paths, node rects with labels.
5. Links use per-link linear gradients (source color → target color).
6. Link paths are cubic Bézier "ribbons" — the top and bottom edges each curve from source to target using a control point at the horizontal midpoint.

**Important**: `renderDiagram()` is called on every drag frame. It does a full SVG clear + rebuild. This is fine for the current scale (dozens of nodes) but would need optimization (e.g., only moving the dragged node's group + re-pathing its links) if diagrams grow to hundreds of nodes.

#### Node Color Resolution — `getNodeColor(id)` (line ~1069)

Checks `nodeStyles[id].color` in the style descriptor. Falls back to a deterministic hash of the node id into a 12-color palette. This means diagrams are colorful by default even without explicit styles.

#### Dragging — lines ~1114–1190

Two separate drag systems:
- **Node drag**: vertical only (y-axis). Stores offset in `nodeOffsets[id]`. Calls `renderDiagram()` on every mousemove.
- **Title drag**: free x + y. Stores offset in `titleDragOffset`. Also calls `renderDiagram()` on every mousemove.

Both use SVG coordinate transforms (`svg.getScreenCTM().inverse()`) to convert screen pixels to SVG units, which correctly handles zoom/pan.

#### Export — `doExport()` (line ~1257)

For SVG: clones the live SVG, inlines Google Fonts as an `@import` in a `<style>` element, computes a tight bounding box from node positions (with label margins), replaces the oversized background rect with a tight one, and serializes.

For PNG: renders the SVG to a canvas via `Image` + `data:` URL, then `canvas.toBlob()`. If metadata is enabled, downloads a separate `.txt` sidecar (since PNG metadata embedding is non-trivial client-side).

**Known issue with PNG export**: The `@import` font URL won't load when rendering to canvas via a data URI (CORS/security restrictions). Exported PNGs will fall back to system fonts. Fixing this properly requires either inlining the font as base64 `@font-face`, or using a library like `html2canvas`. The SVG export doesn't have this problem when opened in a browser (the import loads), but may show fallback fonts in some SVG viewers.

### Zoom & Pan

- **Zoom**: Ctrl+scroll or +/− buttons. Multiplies/divides `zoomLevel`, then recomputes viewBox dimensions centered on `lastCol0X`.
- **Pan**: Scroll (no modifier). Directly mutates the viewBox x/y by `deltaX/deltaY * 0.5 / zoomLevel`.
- **Reset (⊡)**: Sets viewBox so column 0 is horizontally centered, full height visible, zoom = 1.

## Data Format — the "Data" JSON

```json
{
  "nodes": [
    { "id": "w2", "label": "W2 Paycheck", "column": -1 },
    { "id": "income", "label": "Income", "column": 0 },
    { "id": "fixed", "label": "Fixed Expenses", "column": 1 }
  ],
  "links": [
    { "source": "w2", "target": "income", "value": 91820 },
    { "source": "income", "target": "fixed", "value": 120064, "label": "66%" }
  ]
}
```

- `nodes[].id` — unique string identifier, used as key everywhere
- `nodes[].label` — display text
- `nodes[].column` — integer, can be negative. 0 = anchor column
- `links[].source` / `links[].target` — node ids
- `links[].value` — numeric, determines ribbon thickness
- `links[].label` — optional, shown in tooltip only (not rendered on diagram)

## Style Descriptor Format — the "Style" JSON

```json
{
  "title": { "text": "Cash Flow — 2025", "fontSize": 20 },
  "canvas": {
    "width": 1400,
    "height": 700,
    "padding": [50, 180, 40, 180],
    "background": "#fafbfd"
  },
  "columns": {
    "positions": { "-1": 0.05, "0": 0.35, "1": 0.62, "2": 0.88 }
  },
  "nodeDefaults": {
    "width": 16,
    "padding": 12,
    "labelFontSize": 11,
    "valueFontSize": 9.5
  },
  "linkDefaults": { "opacity": 0.32 },
  "nodeStyles": {
    "income": { "color": "#4caf80" },
    "fixed": { "color": "#e07070", "width": 20 }
  }
}
```

- `canvas.padding` — `[top, right, bottom, left]` in pixels. Right/left padding should be generous (150-200px) to accommodate labels on edge columns.
- `columns.positions` — object keyed by column number as string. Values are 0–1 fractions of inner width (after padding). If omitted, columns auto-space evenly.
- `nodeStyles` — keyed by node id. Supports `color`, `width`, `labelColor`. Falls back to `nodeDefaults` then to hardcoded defaults.
- `nodeDefaults.padding` — vertical gap between nodes in the same column (pixels).

## Label Placement Logic

Labels for the leftmost column (min column index) render to the **left** of the node bar (text-anchor: end). All other columns render labels to the **right** (text-anchor: start). This means the leftmost sources have labels hanging left and everything else reads left-to-right after the bar. The canvas padding needs to accommodate this — hence the 180px left/right padding in the example.

## Gotchas & Things to Know

1. **Re-render on every drag frame**: `renderDiagram()` clears and rebuilds the entire SVG. This is the simplest approach but means adding complex SVG features (animations, transitions) is tricky since elements are destroyed/recreated. If you want smooth CSS transitions, you'd need to switch to a diff/update model.

2. **The oversized background rect** (`-5000, -5000, 15000x15000`): This is a hack to ensure the canvas background covers any pan position. It works but means the SVG coordinate space is larger than the content. The export function replaces it with a tight rect.

3. **`getStyleProp()` uses dot-path strings**: e.g., `getStyleProp('nodeStyles.income.color', '#000')`. This walks the style object. It returns the fallback if any segment is null/undefined. It does NOT handle array indexing — `canvas.padding` returns the whole array, not individual elements.

4. **Node sort order**: Within each column, nodes are sorted by value descending (biggest on top) during layout. There's no user control for this yet. The sort happens in `computeLayout` before y-positioning.

5. **Column positions are fractions, not pixels**: `"0": 0.35` means column 0's left edge is at 35% of the inner width (width minus left and right padding). This makes layouts responsive to canvas size changes.

6. **`nodeOffsets` and `titleDragOffset` are ephemeral**: They live in JS memory only. They're included in export metadata but there's no import path. Refreshing the page loses all drag positions. A natural improvement would be to persist these in localStorage or embed them in the style descriptor.

7. **Link gradient ids**: Each link gets a unique gradient `lg-0`, `lg-1`, etc. These are rebuilt on every render. No id collisions possible since the SVG is cleared first.

8. **The tooltip is a DOM element positioned with `position: fixed`**: It uses `clientX/clientY` from mouse events, not SVG coordinates. This means it works correctly regardless of zoom/pan state.

9. **Percentage display**: Each node shows `(X%)` where X is its value divided by the total value of all root nodes (nodes with no incoming links). This works for the income/expense model but may not make sense for all diagram types.

## UI Design Notes

- **Dark sidebar, light canvas**: The sidebar uses a dark theme (--bg: #0f1117) while the canvas area is light (#fafbfd). This is intentional — the diagram itself should look clean and printable, while the editing chrome stays out of the way.
- **Fonts**: DM Sans for all UI text and diagram labels. IBM Plex Mono for data editors, values, and status text.
- **The sidebar is fixed at 380px wide**. Not resizable. The canvas fills the remaining space.
- **Three sidebar tabs**: Data (JSON editor), Style (JSON editor + color preview), Format (documentation). The Format tab is a static reference — it doesn't update dynamically.
