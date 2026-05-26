# 028 — Canvas drawing refinements (first point render, anti-jump, immediate Gate dialog, hide hints after first action)

Branch: `codex/brief-028-canvas-drawing-refinements`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 021 (PR #56) merged — already true on master.

Use npm 10.x if package-lock.json needs touching.

## Goal

Four canvas UX refinements surfaced after the brief 020 + 021 ship:

1. The first fence point doesn't visually appear until the user places the SECOND point. Both should appear instantly.
2. After the second point is placed, the canvas (or the rendered line) shifts/jumps slightly. Drawing should feel stable.
3. When the user taps the Gate tool button on the toolbar, the Edit Gate window currently doesn't open until the user taps the canvas to place a gate. It should open IMMEDIATELY on Gate-button click so the user can configure first, then place.
4. The on-canvas hint text boxes (e.g., "Tap to place your first fence point" or similar instructional text) stay visible during normal use. They should disappear after the first canvas action (first point placed, first gate placed, etc.) so they don't clutter the drawing surface.

## What to implement

### A. Render the first fence point immediately on placement

1. Audit the fence-point rendering pipeline in `FenceLayoutCanvas.tsx` and `canvasEngine.ts`.
2. Likely cause: the rendering loop only redraws fence points when the run has ≥2 points (or only when a SEGMENT exists between two points). The first point in a new run has no segment, so it's not rendered.
3. Fix: render fence points individually as visible dots/markers regardless of whether they have a connecting segment. The current point should be a small filled circle at the placement coordinate.
4. Visual spec: a circle ~6-8px diameter, filled with the active run's color, with a 1-2px white outline for visibility against satellite imagery.
5. Verify: place a single point on the canvas, refresh the page (or just observe) — the point should be visible.

### B. Stop the canvas jump after the second point is placed

6. Audit the canvas state mutations on point placement in `canvasEngine.ts` and `FenceLayoutCanvas.tsx`.
7. Likely causes:
   - The canvas is auto-fitting/auto-centering to the new bounding box of placed points (recomputing the viewport)
   - A pan/zoom transform is being re-applied after placement
   - The "current preview segment" geometry is changing the rendered line endpoint slightly
8. Fix: do NOT auto-fit the viewport when the user places points during active drawing. The viewport transform should remain stable across point placements. Only the new point + segment should appear; nothing else should move.
9. If the cause is the preview-segment clearing (the in-progress segment from last point to cursor that gets finalized when a new point is placed), confirm the finalization snaps to the exact placement coordinate, no rounding drift.
10. **Acceptance**: place 5 points in a row at different locations. The previously-placed points should not move on screen between placements. The viewport stays put.

### C. Open Edit Gate dialog immediately on Gate button click

11. Audit the Gate tool flow:
    - User taps Gate button in `CanvasToolbar.tsx` → sets active tool to 'gate' → user must tap canvas to place gate → tap opens the Edit Gate dialog → user configures gate (width, type, etc.) → Save closes dialog and confirms placement
12. New flow:
    - User taps Gate button → opens the Edit Gate dialog IMMEDIATELY with default values for a new gate (width, type, etc.) — no canvas tap needed first
    - User adjusts gate settings → taps "Done" / "Place Gate" / "Continue" in the dialog → dialog closes, active tool is set to 'gate-placement-pending' with the configured gate settings stashed
    - User taps the canvas on the desired fence segment → gate placed at that location with the configured settings (no second dialog appearance)
    - If user wants to cancel before placement → toolbar tap on another tool clears the pending-gate state
13. **Default gate settings** (for the dialog's initial values): use the same defaults the existing gate placement uses (likely 1.0m width, swing gate type — confirm by reading the current code).
14. The Edit Gate dialog component shouldn't need significant changes — just call its open handler from a different code path (Gate-button-click instead of canvas-tap).

### D. Hide hint text boxes after the first canvas action

15. Audit the canvas for hint/instruction text overlays. Common patterns:
    - A `<div>` overlay with text like "Tap to place your first fence point" or "Long-press to drag a vertex"
    - Conditional rendering based on `isEmpty` or `pointCount === 0`
16. Add a state flag (e.g., `hasUserInteracted`, `firstActionTaken`) that flips to `true` when:
    - First fence point is placed, OR
    - First gate is placed, OR  
    - First text annotation is added, OR
    - Canvas is panned/zoomed manually (optional — pure viewing actions might not count)
17. Hide all hint overlays when `hasUserInteracted === true`.
18. Persist this state in component memory ONLY — do NOT save to localStorage or backend. Hints should reappear if the user creates a new quote (state reset).
19. If the user clears the canvas via brief 021's Clear button → reset `hasUserInteracted` to `false` → hints reappear.

## Files likely involved

- `src/components/canvas/FenceLayoutCanvas.tsx` (primary — rendering, state, hints, gate flow)
- `src/components/canvas/canvasEngine.ts` (rendering pipeline, viewport state)
- `src/components/canvas/CanvasToolbar.tsx` (Gate button handler)
- The Edit Gate dialog component (search for `GateDialog`, `EditGate`, `GateConfig` etc.)
- Tests in `src/components/canvas/`

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- `canonicalAdapter.ts` public function signatures
- The wins from briefs 020 and 021 — single tap places, double tap finishes, long-press drags vertex, pinch zoom suppresses placement, Undo/Redo/Clear all keep working
- The captured map snapshot architecture
- `package.json` beyond strictly necessary

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on Netlify preview (mobile):
  1. Open `/fence-calculator`, capture map, enter canvas
  2. **Hints visible** — confirm hint text overlays render on empty canvas
  3. Tap to place first fence point — **point is visibly rendered immediately**
  4. **Hints disappear** after first point placement
  5. Tap to place second point — segment connects, **neither point shifts on screen**, viewport stays stable
  6. Place 3 more points — viewport stays stable, all points visible
  7. Tap Gate button on toolbar — **Edit Gate dialog opens immediately** (no canvas tap needed)
  8. Adjust gate width in dialog → tap "Done" → dialog closes
  9. Tap a fence segment → gate placed there with the configured width, **no second dialog appearance**
  10. Tap Clear button → confirm → canvas clears, hints reappear

New tests:
- First fence point renders as a visible marker (assert canvas has a drawn point after a single placement)
- Viewport transform is stable across point placements (assert viewport matrix unchanged between point N and point N+1)
- Gate button click opens the Edit Gate dialog (test the Gate handler triggers the dialog open)
- Hint overlay is hidden when `pointCount > 0` or `gateCount > 0`
- Hint overlay reappears after Clear

## Manual reproduction (for PR description)

1. Open `npm run dev`, mobile viewport on `/fence-calculator`
2. Capture map, enter canvas
3. Note hints, place first point → both render correctly
4. Place more points → no jumping
5. Tap Gate button → dialog opens immediately
6. Configure → Done → tap to place gate

## Risk

**MEDIUM** — touches canvas core rendering and gate flow. Mitigations:
- All existing canvas tests should pass unchanged
- Add focused tests for each of the four fixes
- localBomCalculator unchanged guarantee

This is the third canvas-touching brief (020 → 021 → 028). Each previous one had real-device regressions that required fix-ups. Plan for one round of fix-up after this brief lands — test thoroughly on a real phone before merging.
