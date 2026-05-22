# Canvas Engine Map Overlay Refactor Discovery

Stage 1 discovery only. This document inventories the current pixel-coordinate canvas flow before any implementation changes for the Google Maps overlay refactor.

## A. Imports From `canvasEngine.ts` Or `canonicalAdapter.ts`

Direct importers found with `rg -n "canvasEngine|canonicalAdapter" src`:

- `src/components/calculator-v3/LayoutCanvasV3.tsx:5-9` imports `canvasLayoutToCanonical`, `canonicalToCanvasLayout`, and `mergeCanonicalPreservingSegmentMeta` from `../canvas/canonicalAdapter`.
- `src/components/calculator-v3/LayoutCanvasV3.tsx:19-20` imports canvas types and `initCanvasEngine` type from `../canvas/canvasEngine`.
- `src/components/calculator-v4/LayoutMap/FenceLayoutCanvasV4.tsx:6-11` imports `buildStableIdMapForLayoutSync`, `canvasLayoutToCanonical`, `canonicalToCanvasLayout`, and `mergeCanonicalPreservingSegmentMeta` from `../../canvas/canonicalAdapter`.
- `src/components/calculator-v4/LayoutMap/FenceLayoutCanvasV4.tsx:12-13` imports `CanvasLayout` and `initCanvasEngine` types from `../../canvas/canvasEngine`.
- `src/components/canvas/MapControls.tsx:5` imports `initCanvasEngine` type from `./canvasEngine`.
- `src/components/canvas/LayoutMinimap.tsx:3` imports `CanvasLayout` type from `./canvasEngine`.
- `src/components/canvas/FenceLayoutCanvas.v2.tsx:4` imports `initCanvasEngine` from `./canvasEngine`.
- `src/components/canvas/FenceLayoutCanvas.v2.tsx:12` imports `CanvasLayout` and `CanvasRunSummary` types from `./canvasEngine`.
- `src/components/canvas/FenceLayoutCanvas.tsx:2` imports `initCanvasEngine` from `./canvasEngine`.
- `src/components/canvas/FenceLayoutCanvas.tsx:13-19` imports `CanvasGateSlidingSide`, `CanvasGateType`, `CanvasGateVisual`, `CanvasLayout`, and `CanvasRunSummary` types from `./canvasEngine`.
- `src/components/canvas/CanvasToolbar.tsx:22` imports `initCanvasEngine` type from `./canvasEngine`.
- `src/components/canvas/canonicalAdapter.ts:30-36` imports canvas engine types from `./canvasEngine`.
- `src/components/canvas/canonicalAdapter.propertyAnchor.test.ts:4` imports `mergeCanonicalPreservingSegmentMeta` from `./canonicalAdapter`.

Related references that are not direct imports:

- `src/hooks/useGoogleMaps.test.tsx:8` imports `../components/canvas/canonicalAdapter.propertyAnchor.test`, so the canonical adapter test is pulled into the shared test entrypoint indirectly.
- `src/components/calculator-v4/LayoutMap/LayoutMapPane.tsx:13` references `canvasEngine.ts` in a comment only.
- `src/lib/canvasBbox.ts:5` references the canonical adapter scale convention in a comment only.
- `src/lib/runLineColors.ts:3` references `RUN_COLORS` in `canvasEngine.ts` in a comment only.

## B. Pixel Coordinate Usage

The current engine's canvas "world" is pixel-based. Screen coordinates are converted through pan and zoom into this world space, then exported as `x`/`y` geometry.

### `src/components/canvas/canvasEngine.ts`

- `src/components/canvas/canvasEngine.ts:4-14` defines `CanvasSegment.startX`, `startY`, `endX`, and `endY`.
- `src/components/canvas/canvasEngine.ts:94-120` defines `CanvasTextNote.x/y`, `CanvasSiteMarker.x/y`, and `CanvasFreehandStroke.points`.
- `src/components/canvas/canvasEngine.ts:130-146` defines the internal `Point` and `Segment` geometry model; `Segment.p1/p2` are pixel-space points.
- `src/components/canvas/canvasEngine.ts:211-217` stores each `Run.points` array as the engine's primary drawn geometry.
- `src/components/canvas/canvasEngine.ts:575-580` stores `runs`, `activeRunIdx`, and `scale = DEFAULT_SCALE` as mutable canvas state.
- `src/components/canvas/canvasEngine.ts:602-605` tracks `mouseCanvas`, `panStart`, and `panOrigin` in canvas/screen point space.
- `src/components/canvas/canvasEngine.ts:616-618` stores text notes, site markers, and freehand strokes in pixel coordinate collections.
- `src/components/canvas/canvasEngine.ts:656` stores `postPositions` as `{ x, y }` canvas-world positions.
- `src/components/canvas/canvasEngine.ts:730-740` converts internal segments into exported `CanvasSegment` start/end pixel fields.
- `src/components/canvas/canvasEngine.ts:770-774` creates site markers at `point.x` and `point.y`.
- `src/components/canvas/canvasEngine.ts:803-804` inserts a split point into a run and rebuilds pixel-derived segments.
- `src/components/canvas/canvasEngine.ts:893-926` edits a segment length by moving downstream `run.points` in pixel world space.
- `src/components/canvas/canvasEngine.ts:932-955` snaps candidate drawing points against current pixel-space run points.
- `src/components/canvas/canvasEngine.ts:955-1044` exports `getLayout()` with flat `segments`, `boundaries`, run summaries, text notes, site markers, and freehand strokes.
- `src/components/canvas/canvasEngine.ts:1137-1154` draws building/boundary paths from `run.points`.
- `src/components/canvas/canvasEngine.ts:1173-1183` draws the active boundary preview from the last point to `mouseCanvas`.
- `src/components/canvas/canvasEngine.ts:1197-1246` draws the active fence preview from `run.points` to `mouseCanvas`, including a pixel-distance length label.
- `src/components/canvas/canvasEngine.ts:1275-1300` projects the mouse to the closest segment and draws gate-placement previews over pixel segments.
- `src/components/canvas/canvasEngine.ts:1333-1363` draws post labels and cursor helper text using canvas-to-screen point projection.
- `src/components/canvas/canvasEngine.ts:1473-1496` anchors hover summary popovers and post overlays to screen positions derived from pixel points.
- `src/components/canvas/canvasEngine.ts:1589-1590` converts visible screen bounds to canvas coordinates before drawing grid/background content.
- `src/components/canvas/canvasEngine.ts:1773-1836` draws freehand strokes and text notes from stored pixel points.
- `src/components/canvas/canvasEngine.ts:1897-1902` draws site markers from stored pixel positions.
- `src/components/canvas/canvasEngine.ts:2256-2264` converts mouse event `clientX/clientY` into screen and canvas points.
- `src/components/canvas/canvasEngine.ts:2294-2399` hit-tests text notes, buildings, boundary runs, markers, and freehand strokes using pixel points.
- `src/components/canvas/canvasEngine.ts:2416-2447` computes an active-run preview label from pixel-space points.
- `src/components/canvas/canvasEngine.ts:2525-2569` deletes, duplicates, offsets, and rebuilds pixel-space run/note/marker/stroke geometry.
- `src/components/canvas/canvasEngine.ts:2601-2629` moves/resizes text notes and markers by pixel deltas.
- `src/components/canvas/canvasEngine.ts:2703-2723` starts pan/drag actions from event-derived screen/canvas points.
- `src/components/canvas/canvasEngine.ts:2744-2773` starts marker and label interactions from pixel-space hit tests.
- `src/components/canvas/canvasEngine.ts:2856-2898` starts/resumes a drawn run and pushes `worldPt` into `run.points`.
- `src/components/canvas/canvasEngine.ts:2905-2932` starts or chains boundary/building runs from `worldPt`.
- `src/components/canvas/canvasEngine.ts:2983-2998` hit-tests draggable run nodes by converting pixel points to screen pixels.
- `src/components/canvas/canvasEngine.ts:3008-3090` pans, drags, resizes, and updates run points using canvas/screen deltas.
- `src/components/canvas/canvasEngine.ts:3142-3163` hover logic compares event screen points with converted run points.
- `src/components/canvas/canvasEngine.ts:3202-3237` creates building rectangles and labels from pixel-space drag points.
- `src/components/canvas/canvasEngine.ts:3245-3278` stores freehand and text note points from `eventToCanvas`.
- `src/components/canvas/canvasEngine.ts:3304-3402` uses screen/canvas event points for touch end, double-click finish, and label editing.
- `src/components/canvas/canvasEngine.ts:3440-3456` handles wheel zoom and hover location from event-derived screen/canvas points.
- `src/components/canvas/canvasEngine.ts:3489-3495` updates pan during zoom around a screen point.
- `src/components/canvas/canvasEngine.ts:3798-3828` fits the canvas viewport around pixel-space drawing bounds.
- `src/components/canvas/canvasEngine.ts:3984-3987` accepts post positions in canvas-world coordinates.
- `src/components/canvas/canvasEngine.ts:4061-4072` computes drawing bounds from run points, note positions, marker extents, and freehand points.
- `src/components/canvas/canvasEngine.ts:4191-4297` reloads a `CanvasLayout` by rebuilding run point arrays from exported pixel segment endpoints.

### Other Canvas/UI Files

- `src/components/canvas/LayoutMinimap.tsx:22-28` computes a minimap bounding box from `seg.startX/startY/endX/endY`.
- `src/components/canvas/LayoutMinimap.tsx:36-37` translates pixel x/y into minimap SVG coordinates.
- `src/components/canvas/LayoutMinimap.tsx:65-66` positions gate overlays from pixel segment geometry.
- `src/components/canvas/LayoutMinimap.tsx:82-83` renders segment SVG line endpoints from pixel segment geometry.
- `src/components/calculator-v4/LayoutMap/FenceLayoutCanvasV4.tsx:77-82` stores a context-menu screen position as `x/y`.
- `src/components/calculator-v4/LayoutMap/FenceLayoutCanvasV4.tsx:233-243` opens the context menu at `screenX/screenY`.
- `src/pages/CalculatorV3Page.tsx:584-586` creates fallback straight-line canonical geometry with points `{ x: 0, y: 0 }` and `{ x: runLength / 10, y: 0 }`.

### Canonical/Persistence Helpers That Manipulate Pixel Geometry

- `src/components/canvas/canonicalAdapter.ts:600-616` writes canvas segment endpoints into canonical `geometry.points`.
- `src/components/canvas/canonicalAdapter.ts:683-708` treats stored `geometry.points` as pixel coordinates during canonical-to-canvas conversion.
- `src/components/canvas/canonicalAdapter.ts:723-735` reconstructs segment length from pixel deltas when metadata is unavailable.
- `src/components/canvas/canonicalAdapter.ts:821-857` reconstructs fallback pixel geometry from millimetre widths using the legacy `widthMm / 10` convention.
- `src/lib/canvasBbox.ts:22-38` infers pixel-per-mm scale from stored canonical `geometry.points`.
- `src/lib/canvasBbox.ts:39-60` computes bounding boxes over stored `geometry.points`.
- `src/lib/canvasBbox.ts:84-97` creates new run pixel geometry from millimetre offsets using the inferred scale.
- `src/lib/runSegmentRemove.ts:18-30` removes geometry points when gate-openings are merged back into fence runs.
- `src/lib/runSegmentRemove.ts:36-68` removes/keeps geometry points when fence segments are removed.
- `src/lib/runSegmentRemove.ts:75-133` updates a run's `geometry.points` while merging/removing sorted segments.

## C. Pixel-To-Real-World Unit Conversions

- `src/components/canvas/canvasEngine.ts:221` defines `DEFAULT_SCALE = 100`, documented as px per metre.
- `src/components/canvas/canvasEngine.ts:368-379` converts between screen points and canvas-world points using `pan` and `zoom`.
- `src/components/canvas/canvasEngine.ts:382-395` converts pixel distances to millimetres and derives `Segment.lengthMM` from point distances.
- `src/components/canvas/canvasEngine.ts:401-405` rebuilds segment measurements after scale changes.
- `src/components/canvas/canvasEngine.ts:437` totals run segment `lengthMM` into metres.
- `src/components/canvas/canvasEngine.ts:893-926` converts edited target millimetres into canvas-world length and moves downstream points.
- `src/components/canvas/canvasEngine.ts:1219-1239` converts active preview pixel distances to millimetres for labels.
- `src/components/canvas/canvasEngine.ts:3420-3432` calibrates `scale` from a measured segment length entered in metres or millimetres.
- `src/components/canvas/canvasEngine.ts:3798-3801` fits the viewport by mapping target metres through `scale` and `zoom`.
- `src/components/canvas/canvasEngine.ts:3873-3880` exposes `setScale(pxPerMetre)`.
- `src/components/canvas/canvasEngine.ts:3892-3923` converts static map tile metres-per-pixel into canvas-world size via the current scale.
- `src/components/canvas/canvasEngine.ts:4067-4068` converts site marker `widthMM/depthMM` to canvas-world extents.
- `src/components/canvas/canvasEngine.ts:4202-4230` rebuilds loaded runs by comparing `summary.totalLengthM * 1000` with segment `lengthMM`.
- `src/components/canvas/canonicalAdapter.ts:119-126` reconstructs run membership by comparing `summary.totalLengthM * 1000` with `seg.lengthMM`.
- `src/components/canvas/canonicalAdapter.ts:276-323` splits a segment into fence/gate pieces using `seg.lengthMM`, gate position, and gate width in millimetres.
- `src/components/canvas/canonicalAdapter.ts:542-559` writes canonical `segmentWidthMm`, `sourceSegmentLengthMm`, and `geometry_angle_deg` from canvas segment measurements.
- `src/components/canvas/canonicalAdapter.ts:725-735` reconstructs `lengthMM` from pixel deltas with `Math.hypot(...) * 10` if metadata is missing.
- `src/components/canvas/canonicalAdapter.ts:821-857` converts canonical width in millimetres back to fallback pixel lengths with `widthMm / 10`.
- `src/components/canvas/MapControls.tsx:79-82` computes real-world metres per Google static map pixel for a latitude/zoom.
- `src/components/canvas/MapControls.tsx:200-213` converts metres-per-pixel to canvas `px/m`, sets the engine scale, and loads the static map tile.
- `src/components/canvas/MapControls.tsx:362-365` lets users manually set engine scale in px/m.
- `src/components/canvas/MapControls.tsx:512-520` exposes the manual px/m scale input.
- `src/lib/canvasBbox.ts:5-14` documents the canonical pixel-per-mm convention and fallback scale.
- `src/lib/canvasBbox.ts:22-38` infers px/mm from canonical geometry and segment width.
- `src/lib/canvasBbox.ts:84-97` converts millimetre offsets and widths into new pixel geometry.
- `src/pages/CalculatorV3Page.tsx:584-586` converts run length in millimetres into fallback pixels via `runLength / 10`.
- `src/components/canvas/LayoutMinimap.tsx:11-14` formats millimetres as metres/mm labels while drawing pixel geometry.
- `src/lib/persistV3Quote.ts:120-122` persists canonical segment lengths/heights in millimetres to `quote_run_segments`.
- `src/lib/quotePayload.ts:34-42` loads persisted `length_mm` and `target_height_mm` into canonical segment millimetre fields.

## D. Persisted Fields Holding Pixel-Based Geometry

- `src/types/canonical.types.ts:50-52` declares `CanonicalRun.geometry.points: Array<{ x: number; y: number }>`; these are current pixel coordinates.
- `src/schemas/canonical.schema.ts:62-64` validates `geometry.points[].x/y` on canonical payloads.
- `src/components/canvas/canonicalAdapter.ts:598-617` writes actual canvas pixel coordinates to canonical `run.geometry.points`.
- `src/lib/persistV3Quote.ts:14-23` embeds the canonical payload and `layoutGeometry` into `quotes.fence_config`.
- `src/lib/persistV3Quote.ts:98-106` persists each run's `geometry` inside `quote_runs.variables_json`.
- `src/lib/quotePayload.ts:57-73` reloads `vars.geometry` from `quote_runs.variables_json` into `CanonicalRun.geometry`.
- `src/lib/quotePayload.ts:106-113` accepts legacy `quotes.fence_config.payload` through canonical schema validation, including `geometry.points`.
- `src/components/canvas/canonicalAdapter.ts:683-735` reloads canonical pixel `geometry.points` into the canvas engine.
- `src/lib/canvasBbox.ts:22-60` consumes persisted `run.geometry.points` for scale inference and bounds.
- `src/lib/runSegmentRemove.ts:18-133` keeps persisted `geometry.points` aligned when runs/segments are removed or merged.
- `src/types/canonical.types.ts:96-97` stores `canvasSegmentIndex` and `sourceSegmentLengthMm`; these fields tie canonical segment rows back to pixel geometry segments.
- `src/schemas/canonical.schema.ts:46-47` validates `canvasSegmentIndex` and `sourceSegmentLengthMm`.
- `src/components/canvas/canonicalAdapter.ts:312`, `src/components/canvas/canonicalAdapter.ts:370`, and `src/components/canvas/canonicalAdapter.ts:558` store `geometry_angle_deg` in segment variables as a pixel-geometry angle hint.
- `src/components/canvas/canonicalAdapter.ts:837-842` reads `geometry_angle_deg` when fallback pixel geometry must be rebuilt.
- `src/lib/persistV3Quote.ts:124-128` persists segment `variables_json`, including any `geometry_angle_deg` hints.
- `src/lib/quotePayload.ts:34-50` reloads segment variables from `quote_run_segments.variables_json`.

## E. `localBomCalculator.ts` Pixel Coordinate Consumption

No BOM rule in `src/lib/localBomCalculator.ts` consumes pixel coordinates directly. Searches for `geometry`, `points`, `canvasSegmentIndex`, `sourceSegmentLengthMm`, `geometry_angle_deg`, `startX`, `startY`, `endX`, and `endY` do not find pixel geometry consumption in this file.

The local BOM calculator consumes canonical millimetre fields instead:

- `src/lib/localBomCalculator.ts:882-887` `calculateGateOpening` reads `segment.segmentWidthMm` and `segment.targetHeightMm`.
- `src/lib/localBomCalculator.ts:1172-1307` `calculateVerticalSlatRun` loops `run.segments` and calculates from `segment.segmentWidthMm`, `targetHeightMm`, and variables.
- `src/lib/localBomCalculator.ts:1211-1220` converts `segment.segmentWidthMm` into panel counts and panel width.
- `src/lib/localBomCalculator.ts:1336-1603` `calculateScreenRun` loops `run.segments` and calculates from `segment.segmentWidthMm`, `targetHeightMm`, and variables.
- `src/lib/localBomCalculator.ts:1387-1409` converts `segment.segmentWidthMm` into panel counts and panel width.
- `src/lib/localBomCalculator.ts:1609-1664` `calculateLocalBom` maps canonical runs/segments and delegates to `calculateScreenRun`; no pixel geometry is read.

Refactor implication: preserving `segmentWidthMm`, `targetHeightMm`, run/segment IDs, and variables should preserve local BOM output. Pixel-to-metres changes should be isolated before canonical millimetre fields reach `localBomCalculator.ts`.
