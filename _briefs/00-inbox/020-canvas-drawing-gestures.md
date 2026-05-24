# 020 — Canvas drawing gestures (multi-touch, tap behavior, phantom line)

Branch: `codex/brief-020-canvas-drawing-gestures`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 019 merged.

Use npm 10.x if package-lock.json needs touching.

## Goal

Make canvas drawing feel natural on touch devices. Currently:
- Pinch-zoom accidentally places fence points (every two-finger gesture creates phantom dots)
- It's unclear how to finish a fence run on mobile
- A "ghost line" briefly flashes from a previously-established point to wherever the user is about to tap, which is confusing
- Gates cannot be placed on mobile at all
- Long-press to drag a vertex must keep working

After this brief:
- Single tap = place point (debounced 250ms to prevent accidental double-fire)
- Double tap = finish the current fence run
- Long press = drag an existing vertex (preserve existing behavior)
- Pinch zoom = zooms cleanly, places NO points
- Phantom ghost line is removed/fixed
- Gates can be placed on mobile

## What to implement

### A. Multi-touch detection (pinch-zoom suppression)

1. In the canvas pointer/touch event handlers, track active pointer count.
2. When `pointerCount >= 2`, set a flag `isMultiTouching = true`. Suppress ALL drawing actions (no point placement, no preview rendering).
3. When pointer count drops back to 0, wait 150ms before re-enabling drawing — this prevents the "lift one finger" residual tap from registering as a point.
4. Pinch-zoom should otherwise behave as it does now (Google Maps native zoom, or whatever canvas zoom is in place).

### B. Tap gesture: single = place, double = finish

5. On `pointerup`:
   - If `isMultiTouching` is true (or the cooldown is active) → ignore.
   - Track the timestamp of the previous tap (`lastTapAt`).
   - If `now - lastTapAt < 300ms` AND the new tap is within 30px of the previous tap → **interpret as double-tap**. Trigger "finish run" logic: closes the current fence run (commit it, exit drawing mode for that run).
   - Otherwise → **single tap**: place a point at the tap location. Update `lastTapAt = now`.
6. Add a 250ms debounce so two single-taps within 250ms cannot both register as points (only the second counts, or only the first — pick one and document). This is independent of the double-tap detection.

### C. Long-press drag (preserve)

7. The existing long-press-to-drag-vertex behavior must continue to work. Confirm via manual test: tap and hold on an existing vertex for 500ms+ → grab handle appears → drag to relocate.
8. The new single-tap-to-place logic must NOT interfere with long-press detection. If a `pointerdown` is held past 300ms (or whatever the long-press threshold is), suppress the single-tap action.

### D. Phantom ghost line fix

9. There's currently a bug where a "preview line" briefly appears from a previously-established point to wherever the user is about to tap, flashing on every new point placement. This is confusing.
10. Audit the canvas rendering loop for the "next segment preview" code path. It should:
    - Render ONLY when there is a confirmed previous point in the current active run
    - Clear instantly after each placement (no lingering frame)
    - NOT render when the user is between runs (i.e., after a run is finished but before a new one starts)
11. The fix is likely a state-management issue (the "current draw cursor" reference isn't cleared after placement) or a rendering-frame issue (one stale frame painted before state updates).

### E. Gates on mobile

12. Gate placement currently broken on touch devices. Likely cause: gate placement handler expects mouse-specific events (`mousedown` / `mouseup`) or doesn't translate touch coordinates to canvas coordinates correctly.
13. Audit gate placement code (look for "gate" in `FenceLayoutCanvas.tsx` and `canvasEngine.ts`) and ensure:
    - Touch events translate to canvas coordinates the same way fence-point placement does
    - The "gate mode" toolbar button activates correctly on tap
    - Once gate mode is on, tapping a fence segment places a gate at that location

## Files likely involved

- `src/components/canvas/FenceLayoutCanvas.tsx`
- `src/components/canvas/canvasEngine.ts` (gesture/event handling sections)
- `src/components/canvas/CanvasToolbar.tsx` (gate button state — light touches only)

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- `canonicalAdapter.ts` public function signatures
- `canvasEngine.ts` public types (gesture handling is internal — adjust freely, but exported types unchanged)
- `package.json` beyond strictly necessary
- Existing desktop mouse behavior (mouse single-click places, double-click finishes, drag-with-hold drags — all preserved)
- Snapshot architecture
- BOM calculation logic

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on mobile device (or DevTools mobile emulation):
  1. Pinch-zoom on canvas → zooms in/out → NO phantom points placed
  2. Single tap on empty canvas area → places a fence point
  3. Two fast single-taps in different locations (>30px apart) → both placed, no double-tap interpretation
  4. Two fast taps in same location (<30px, <300ms apart) → finishes the run (does NOT place a second point on top)
  5. Long press on a vertex → grab handle appears → drag relocates vertex
  6. Place several points → no ghost line flashing between them
  7. Toggle gate mode → tap on a fence segment → gate appears
- Desktop behavior preserved:
  - Mouse click places, double-click finishes, click+drag on vertex drags

New tests (if practical with existing test framework):
- Multi-touch event handler suppresses placement when pointerCount >= 2
- Double-tap within 300ms + 30px triggers finish-run
- Single-tap debounce prevents two placements within 250ms

## Manual reproduction (for PR description)

1. Open `npm run dev`, go to `/fence-calculator` on mobile device or Chrome DevTools mobile emulation
2. Go to canvas (after capturing a map)
3. Pinch in/out → confirm no points placed
4. Place 4 points in a square → confirm no phantom lines between them
5. Double-tap → confirm run finishes (cursor reverts to "place new run" mode)
6. Tap & hold on a vertex → drag to move it

## Risk

**MEDIUM** — canvas event handling is sensitive and touches user input. Mitigations:
- Desktop mouse paths untouched (only new touch logic added)
- Existing long-press drag preserved (explicitly tested)
- Snapshot/BOM/Edit Gate workflows untouched
