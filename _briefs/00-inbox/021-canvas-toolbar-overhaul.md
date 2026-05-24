# 021 — Canvas toolbar overhaul (Move/Edit, Undo, Redo, Clear, remove zoom buttons)

Branch: `codex/brief-021-canvas-toolbar-overhaul`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 020 merged.

Use npm 10.x if package-lock.json needs touching.

## Goal

Replace the current canvas toolbar with a tighter, more functional set:
- Remove zoom in/out buttons (use native pinch only — saves screen space)
- Rename "Move" → "Move/Edit" (clearer about what the button does)
- Add Undo / Redo (essential for any drawing surface)
- Add Clear (with confirmation — destructive)
- Fix the layers bottom-sheet that doesn't open fully
- Fix the map "off" button regression (toggle doesn't actually hide the map layer)

## What to implement

### A. Remove zoom controls

1. Delete the zoom-in button and zoom-out button from `CanvasToolbar.tsx`.
2. Delete or stub the corresponding handlers in `canvasEngine.ts` (if they're public methods called from the toolbar, only — internal zoom logic for pinch must stay).
3. Pinch-zoom (from brief 020) is now the only zoom mechanism on mobile. Desktop users can use scroll wheel (if implemented) or trackpad pinch.

### B. Rename "Move" to "Move/Edit"

4. Find the toolbar button labeled "Move" and change its label/title to "Move/Edit".
5. The icon and behavior do NOT change — only the label. This is a clarity fix because the button does both panning AND editing existing fence vertices.

### C. Add Undo, Redo, Clear buttons

6. Add three new toolbar buttons after Move/Edit:
   - **Undo** — reverts the last canvas action (point placed, run finished, gate added, vertex moved)
   - **Redo** — re-applies an undone action
   - **Clear** — wipes the entire canvas state (all runs, all gates, captured map snapshot stays)
7. **Undo/redo stack implementation**:
   - Track a stack of canvas state snapshots (or a command-pattern action log) — pick whichever fits the existing architecture
   - Stack max depth: 20 actions
   - Undo button is disabled (greyed) when stack is empty
   - Redo button is disabled when no undone action is pending
   - The stack resets when Clear is invoked (or persists across Clear — pick one and document)
   - The stack does NOT need to persist across page reloads (in-memory only)
8. **Clear button confirmation**:
   - Tap Clear → modal dialog: "Are you sure? This will delete all runs and gates. The map snapshot will be kept. This can be undone."
   - Buttons: Cancel / Clear
   - Clear: wipes all canvas state, BOM updates accordingly (price goes to 0 → hidden by brief 019's title bar logic)
   - The map snapshot (captured satellite/roadmap image) is NOT cleared — only fence drawings
9. Style the new buttons consistently with existing toolbar buttons (same height, padding, hover/active states). Use icon + text label so tradies can identify them quickly.

### D. Fix layers bottom-sheet

10. The layers bottom-sheet currently doesn't open fully — it stops short of the top of the viewport.
11. Audit the sheet's height/max-height CSS. Likely capped at a wrong percentage or missing a `dvh` (dynamic viewport height) unit.
12. Goal: when fully expanded, the sheet should cover ~90% of the viewport height, allowing all layer options (Satellite / Roadmap / Drawing) to be visible AND interacted with.

### E. Fix map "off" button regression

13. The "off" button (or layer toggle) for the map currently doesn't actually hide the map layer — both desktop and mobile.
14. Audit the toggle handler — likely a stale state binding or a missing CSS class application.
15. Goal: tap "off" / toggle off → satellite layer becomes invisible (or background becomes transparent so canvas fence drawings appear over plain white/dark canvas). Tap again → map returns.

## Files likely involved

- `src/components/canvas/CanvasToolbar.tsx` (heavy)
- `src/components/canvas/FenceLayoutCanvas.tsx`
- `src/components/canvas/canvasEngine.ts` (undo/redo stack logic, public types MAY change for new actions — document any signature changes in PR description)
- `src/components/canvas/LayersBottomSheet.tsx` (or similar — layers sheet component)
- `src/components/ConfirmDialog.tsx` (reuse from brief 019)
- CSS files for sheet height fix

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- `canonicalAdapter.ts` public function signatures
- `package.json` beyond strictly necessary
- Snapshot architecture (Clear keeps the captured map)
- Existing pan behavior (Move/Edit button)

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on mobile + desktop:
  1. Canvas toolbar has buttons: Move/Edit, Undo, Redo, Clear (and any existing fence-drawing-mode buttons). NO zoom in/out buttons.
  2. Place a point → tap Undo → point disappears → tap Redo → point reappears
  3. Place 21 actions → Undo 20 times → stack empty → Undo button disabled
  4. Tap Clear → confirmation dialog appears → Cancel → state preserved
  5. Tap Clear → Confirm → all fence drawings removed, map snapshot remains, title bar price hides (back to 0)
  6. Open layers bottom-sheet → sheet expands to ~90% viewport height, all options visible
  7. Tap "off" on the map layer → satellite/roadmap layer becomes invisible, fence drawings still visible
  8. Tap "off" again or toggle back → map returns
- Desktop:
  - Toolbar buttons render at same size as mobile (no separate desktop layout regressions)
  - Undo/Redo work with mouse interactions too

New tests:
- Undo/Redo stack pushes correctly on each action type
- Undo/Redo stack respects max depth of 20
- Clear button triggers confirmation, not immediate wipe
- Layers sheet expanded state height >= 90vh

## Manual reproduction (for PR description)

1. Open `npm run dev`, go to `/fence-calculator`, capture map, enter canvas
2. Verify toolbar buttons match the new set
3. Place 5 points → tap Undo 5 times → all removed
4. Tap Redo 5 times → all reappear
5. Tap Clear → confirm dialog → Confirm → drawings cleared, map snapshot intact
6. Open layers sheet → confirm full expansion
7. Toggle map layer off → confirm satellite hides

## Risk

**MEDIUM** — undo/redo stack is new infrastructure. Layers sheet and map-off fixes touch existing CSS that may have other consumers. Mitigations:
- Stack scoped to canvas only (doesn't touch BOM/save flow)
- CSS changes verified on both mobile and desktop viewports
- Confirmation dialog component reused from brief 019 (no new dialog primitive)
