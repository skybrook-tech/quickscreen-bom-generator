# Drawing toolbar inventory · 13 tools + 4 actions

Complete list of every tool that appears on the captured canvas in Stages 3-6 of the entry-page wireframe (`01-entry-page-v3.html`). Used by Brief 001 to wire up `CanvasToolbar.tsx`.

## DRAW group (6 tools, all existing in `CanvasToolbar.tsx` on master)

| Tool | Hotkey | Type | Behaviour |
|------|--------|------|-----------|
| Draw Fence | `D` | active by default | Tap corners to place fence-line nodes. Double-tap to finish a run. |
| Gate | `G` | placement | Drops a gate onto the nearest fence segment. Nudge to position. |
| Move/Edit | `E` | selection | Drag nodes, reshape runs, reposition gates. |
| Undo | — | one-shot | Step back through the canvas history. |
| Redo | — | one-shot | Step forward. |
| Clear | — | one-shot | Wipe the canvas (with confirmation). |

## SITE group (10 tools — 7 existing + 3 approved new)

### Existing (already in `CanvasToolbar.tsx`)

| Tool | Hotkey | Behaviour |
|------|--------|-----------|
| Dotted line | `B` | Neighbour fences, planned future fences, property boundary indicators |
| Arrow | `A` | Point at features for installer notes ("water meter here") |
| Building | `U` | House, shed, garage rectangles for context |
| Free Draw | `F` | Pen tool with **colour / width / line-style / opacity sub-controls** for freeform notes |
| Existing post | `P` | Posts already in the ground that the new fence reuses |
| Pillar | `I` | Brick/concrete pillars the fence must integrate with |
| Text | `T` | Free-text labels for any annotation that needs words |

### Approved new (Brief 001)

| Tool | Hotkey | Behaviour |
|------|--------|-----------|
| **Photo pin** | `O` | Tap a spot → opens file picker / camera → drops a photo marker at that location. Photo stays in the layout payload, viewable on hover, can be tapped to enlarge. Installer sees these before quote acceptance. |
| **Tree** | `R` | Tap a spot → drops a circle marker (~3m diameter in real-world scale). Customer can resize. Marks trees that affect fence runs. |
| **North arrow** | `N` | Tap once → auto-places a compass marker. Bearing pulled from `google.maps.Map.getHeading()` (snapshot at capture time). Customer can drag to a clear spot on the map. |

### Dropped from earlier proposals — DO NOT include

| Tool | Reason dropped |
|------|---------------|
| ~~Measure (ruler)~~ | Liam's call — drop |
| ~~Council setback line~~ | Liam's call — drop |
| ~~Vehicle turning circle~~ | Liam's call — drop |

## ACTIONS menu (top-right, compact 4-button stack)

Replaces the v3-era view-options panel. Sits in a `.map-actions` floating menu top-right of the captured canvas.

| Action | Hotkey | Behaviour |
|--------|--------|-----------|
| Centre | `C` | Fit-to-content; recentres on the drawn fence (`engineRef.current?.fitToContent()`) |
| Print Map | `P` | Installer-ready layout PDF (the map + the drawing + dimensions + canonical BOM) |
| Reset View | — | Reset zoom and pan back to the captured-view default (`engineRef.current?.resetView()`) |
| Drawing to screen | `F` | Canvas takes over the whole viewport — for detailed drawing on a small screen. (Was "Expand" in QuickScreen; renamed per Liam's request.) |

## Dropped from VIEW options — DO NOT include

These were in QuickScreen's existing `CanvasToolbar.tsx` but are explicitly OUT for the Anyfence rebuild:

| Removed | Reason |
|---------|--------|
| ~~Satellite layer toggle + opacity slider~~ | Captured view is locked — redundant |
| ~~Roadmap layer toggle + opacity slider~~ | Same — redundant |
| ~~Angle snap (45° / 90°)~~ | Liam's call — drop |
| ~~Gate snap 100mm~~ | Liam's call — drop |
| ~~Show grid~~ | Liam's call — drop |

## Layout

- **DRAW group**: top-left of canvas, horizontal row, 6 buttons
- **SITE group**: top-right-of-DRAW, horizontal continuation, 10 buttons
- **ACTIONS menu**: top-right of canvas, vertical 4-button stack in a white pill
- **Address bar**: top-centre, navy pill with ✓ + address + "Re-capture" link
- **Captured pill**: top-LEFT (NOT top-right — top-right is the actions menu)
- **Anyfence corner pill**: bottom-right (Brief 005 polish)
- **Anyfence watermark**: dead-centre, faint, behind everything (Brief 005 polish)

## File location

All toolbar logic lives in `src/components/canvas/CanvasToolbar.tsx`. The actions menu is being split out into a new `src/components/canvas/MapActionsMenu.tsx` per Brief 001 — keeps the toolbar focused on draw + site tools.

## Hotkey conflicts

Be aware: Free Draw's hotkey `F` collides with "Drawing to screen"'s `F`. Resolution: Free Draw stays `F` (it's the active tool that needs the shortcut); rename "Drawing to screen"'s hotkey to something else (suggestion: `Z` for zoom-fullscreen, or no hotkey at all — it's a one-shot action).
