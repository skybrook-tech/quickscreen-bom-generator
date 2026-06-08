---
name: canvas-drawing-tool-ux-patterns
id: cmp97rvk303o907adm5ty8h5p
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# canvas-drawing-tool-ux-patterns

> UX patterns for building professional canvas/map drawing tools. Covers toolbar organization, cursor hints, per-item delete, right-click context menu, print/export, and tool-specific interaction patterns. Researched from SmartFence, PlanSwift, Magicplan, tldraw, Excalidraw, and Figma.

## When to use
(not specified)

## Documentation
# Canvas Drawing Tool UX Patterns

## Source

Researched from professional fence-estimating tools (SmartFence, FencePro.ai, FenceBuilder Pro), site-plan tools (PlanSwift, Magicplan), modern canvas editors (tldraw, Excalidraw, Figma), and map-based drawing tools (Nearmap, Google Earth, EagleView).

## Toolbar Organization

### Layout convention
- **Desktop:** left-side vertical bar or top horizontal bar
- **Mobile:** bottom-centre floating bar
- **Tool order:** Select/Move → Primary draw tool → Secondary draw tools → Annotation tools → Action tools (undo/redo/clear)
- **Active tool:** highlighted with a clear visual state; pressing Escape always returns to select mode
- **Keyboard shortcuts:** expected by power users (V=select, D=draw, T=text, etc.)

### Grouping
Group tools into pill-shaped clusters by function:
1. **Primary tools** — Draw (the main product), Gate/Opening, Move/Edit
2. **Site tools** — Building, Boundary/Wall, Post/Pillar, Text, Free Draw
3. **Actions** — Undo, Redo, Clear, Centre, Print, Reset View
4. **View toggles** — Snap modes, Grid, Expand/Collapse

## The 10 Must-Have Patterns

### 1. Address search is step 1
Full-width search bar at the top of the map area. GPS "use my location" button. Instant fly-to animation on address selection. Auto-completes to known addresses.

### 2. Satellite/map toggle
Always visible in the corner or settings dropdown. Options: satellite, roadmap, terrain, hybrid. Tradies need satellite for property detail, roadmap for navigation context.

### 3. Click-to-draw polyline as primary tool
User is in draw mode immediately. Click to add nodes. Double-click or click on first point to finish. Segments show live length labels.

### 4. Live running measurement follows cursor
As the user moves the mouse during drawing, the distance from the last placed point follows the cursor. Total distance shown in a persistent panel.

### 5. Drag-existing-points to edit
After initial draw, switch to Move mode, drag any node to reposition. Critical for accuracy adjustments without redrawing.

### 6. Objects placed on segments
Gates, openings, and interruptions are placed by clicking on an existing drawn segment — they split the segment and insert themselves. Not drawn separately.

### 7. Escape always returns to select mode
Universal convention. Toolbar shows which tool is active with a clear highlight state.

### 8. Ortho mode toggle (90° snap)
One button, very useful for rectangular lots. When on, new segments snap to 0°/90°/180°/270°. Shift allows 45° diagonals.

### 9. PDF export with map screenshot
Print output includes: satellite/map image with drawn shapes overlaid, measurements labelled on each shape, summary block (job name, total metres, date), company branding.

### 10. Undo/redo + per-item delete + "Clear all"
Deep undo history (Ctrl+Z/Cmd+Z). Select + Delete key removes one item. "Clear map" as bulk delete with confirmation. Every competitor has single-item delete — its absence is the biggest usability gap.

## Tool-Specific Interaction Patterns

### Building tool: click-drag rectangle
Buildings are almost always rectangles. Click one corner, drag to opposite corner, release.
- **After placement:** resize handles at corners (both dimensions) and edge midpoints (one dimension)
- **Visual identity:** semi-transparent fill (hatched or tinted) + solid stroke outline
- **Label:** editable, defaults to "Building"
- **Move:** click inside and drag

### Text tool: transparent + formatting + draggable
- **Background:** transparent or very lightly tinted (map content visible through text)
- **Formatting toolbar:** appears near text box when active — font size, bold, italic, colour, bullets, alignment
- **After placement:** draggable (click and drag), resizable (edge handles), double-click to edit
- **Delete:** select + Delete key

### Free-draw tool: freehand + stamps
- **Freehand:** click-drag draws a smoothed path (Ramer-Douglas-Peucker simplification to reduce jitter)
- **Line controls:** width, colour, style (solid/dashed/dotted), opacity
- **Arrow tool:** toggle that adds arrowhead to end of drawn line
- **Site feature stamps:** pre-built shapes the user can click-drag to place:
  - Road (gray rectangle), Pool (blue rounded rect), Deck (brown/tan with hatch), Tree (green circle)
  - All stamps: movable, resizable, labelled, semi-transparent fill
- **Important:** free-draw elements are annotation only — NOT included in BOM dispatch

### Post/pillar tool: dimension inputs
After placing a post or pillar, show an input popover for width × length (mm). Sensible defaults (50mm for posts, 350mm for pillars). Rendered size on canvas reflects dimensions. Editable later via click in Move mode.

## Cursor Hints

Show contextual text hints near the cursor during drawing:
- **Draw Fence:** "Click to place fence point" → "Click to add segment · Double-click to finish"
- **Gate:** "Click on a fence segment to place gate"
- **Building:** "Click and drag to draw building"
- **Text:** "Click and drag to place text box"

Use small, muted text with slight offset from cursor. Disappears after user completes action.

## Right-Click Context Menu

Right-clicking on an item shows: Delete, Duplicate, Edit, Bring to front / Send to back.
Right-clicking on empty space shows: Paste (if applicable), Reset view, Toggle grid.
Keep menu minimal (4-6 items) and context-specific to the clicked item type.

## Print/Export Best Practices

Professional print output includes:
1. Map/satellite screenshot with all drawn elements overlaid
2. Measurement labels on every segment
3. Gate positions and widths labelled
4. Summary block: job name, total linear metres, run count, gate count, date
5. Company branding (logo, contact details)
6. `@media print` CSS for clean margins and page breaks

Use `canvas.toDataURL("image/png")` to capture the canvas, render into a print-optimized HTML page, open in new tab with `window.print()`.

## The Two Features That Define "Professional"

From the research, the clearest differentiators between amateur and professional fence-estimating tools:

1. **Live cost-as-you-draw** — total footage and estimated price update in real time with every point placed
2. **Branded PDF export** — the printed quote includes the map screenshot with measurements, company logo, and a professional layout

If you're building a tradie tool and want it to feel professional, these two features are table stakes.

## Canvas Architecture Notes

For a complex drawing tool, split the engine into modules:
- `canvasEngine/core.ts` — pan, zoom, render loop, hit-testing, undo/redo stack
- `canvasEngine/fenceTool.ts` — polyline drawing, segment snapping, length labels
- `canvasEngine/buildingTool.ts` — click-drag rectangle, resize handles
- `canvasEngine/textTool.ts` — text box creation, formatting, drag/resize
- `canvasEngine/freeDrawTool.ts` — freehand paths, smoothing, stamps
- `canvasEngine/gateTool.ts` — segment-splitting gate placement

This prevents a 3,500+ line monolith that's hard for AI agents to modify safely.

## Scripts
None
