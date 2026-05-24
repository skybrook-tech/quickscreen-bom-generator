# 019 — Page-level UI cleanup (header, hamburger, initial state, redundant UI)

Branch: `codex/brief-019-page-cleanup`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 017 (PR #51) merged.

Use npm 10.x if package-lock.json needs touching.

## Goal

Clean up the `CalculatorV3Page.tsx` surface in one coordinated pass:
- Remove redundant UI text and buttons
- Add a live price display to the title bar
- Move destructive actions (Clear Job) into the hamburger menu
- Surface offline status in the hamburger (only when offline)
- Open on the Job tab by default
- Fix the stale-price bug when sections/runs are deleted
- Fix sticky action bar overlapping tab nav
- Fix title bar in landscape orientation

This is a chunky brief intentionally — every item touches `CalculatorV3Page.tsx`, and prior parallel PRs on this file produced bad-merge regressions. Better to do them as one atomic change.

## Pre-flight check

Confirm the bundled icon assets exist in `_briefs/assets/`:

```bash
test -f _briefs/assets/glass-outlet-symbol.svg && \
  test -f _briefs/assets/glass-outlet-symbol-192.png && \
  test -f _briefs/assets/glass-outlet-symbol-512.png && \
  test -f _briefs/assets/apple-touch-icon.png && \
  test -f _briefs/assets/save-icon.png && \
  echo "Assets OK" || echo "MISSING assets — pause this brief"
```

If any asset is missing from `_briefs/assets/` → move brief to `03-paused/` and report "Brief 019 paused: bundled assets missing from `_briefs/assets/`. Liam needs to re-extract the batch archive."

## What to implement

### Step 0 — Deploy bundled icon assets to `public/icons/`

**This brief is the asset-deployment brief for the entire batch.** Briefs 022 and 023 depend on the icon files being on master. Do this BEFORE any code changes:

1. Create `public/icons/` if it doesn't exist (`mkdir -p public/icons`).
2. Copy the bundled assets:
   ```bash
   cp _briefs/assets/glass-outlet-symbol.svg public/icons/
   cp _briefs/assets/glass-outlet-symbol-192.png public/icons/
   cp _briefs/assets/glass-outlet-symbol-512.png public/icons/
   cp _briefs/assets/apple-touch-icon.png public/icons/
   cp _briefs/assets/save-icon.png public/icons/
   ```
3. Stage them: `git add public/icons/glass-outlet-symbol.svg public/icons/glass-outlet-symbol-192.png public/icons/glass-outlet-symbol-512.png public/icons/apple-touch-icon.png public/icons/save-icon.png`
4. Continue to Step A. The assets will be part of the same commit/PR as the code changes — one atomic change that lands all required brand assets on master.

### A. Title bar redesign

1. **Remove the "New Job" text** from the stationary title bar.
2. **Replace the "Glass Outlet QuickScreen BOM Generator" title text** with an `<img>` tag pointing at `/icons/glass-outlet-symbol.svg`. Size it appropriately (e.g., 32px height on mobile, 40px on desktop). Include `alt="Glass Outlet"`.
3. **Add a live price display** to the right side of the title bar:
   - Bind to the BOM total (the same value shown on the BOM tab footer)
   - Format: just the number with currency symbol and thousands separator (e.g., `$2,450`)
   - Hide entirely when the total is 0 — render nothing, no `$0`, no placeholder
   - Update reactively as runs/sections are added/removed
4. **Landscape mode fix**: in landscape orientation on mobile (`window.matchMedia('(orientation: landscape)')`), the title bar layout currently breaks (overflow or content cut off). Audit and adjust: ensure logo, price, and hamburger button all remain visible without overflow.

### B. Hamburger menu (slide-out)

5. **Add "Clear Job" item** to the hamburger menu. When tapped: show "Are you sure? This will delete all runs, sections, and the current address. This cannot be undone." with Cancel / Clear buttons. On Clear: reset the page state.
6. **Add offline indicator** as a menu item that ONLY appears when `navigator.onLine === false`. Use something visually clear (e.g., a red dot icon + "Offline — quotes can't save"). When back online, the item disappears entirely. **Do not show "Online" status when online** — only the offline state.
7. **Remove the existing offline banner** that PR #51 added (the standalone banner that appears at the top of the page). Its functionality is now consolidated into the hamburger menu.

### C. Initial state / routing

8. **Default tab is Job** on first load. Currently the app opens on BOM. Change the initial tab state in `CalculatorV3Page.tsx` from `'bom'` (or whatever it is now) to `'job'`.
9. **Remove the "Property Map" heading** from the Job screen.
10. **Remove the "Enter an address to locate the property" subtext** from the Job screen.

### D. Remove redundant buttons

11. **Remove the "Generate" button** (if it exists).
12. **Remove the "Generate BOM" button** (if it exists). BOM calculation already happens automatically as state changes — these buttons are decorative.
13. **Verify auto-calculation still works** after removal: add a run, see BOM update without any button press.

### E. Bug fixes

14. **Price clearing bug**: when a user deletes a section or run, the BOM total currently does NOT clear/recalculate — the stale value stays. Find the delete handler(s) for sections and runs and ensure they trigger a BOM recalc. The new title-bar price (item 3) must reflect this fix.
15. **Sticky action bar overlap**: on small viewports (<400px height in landscape, or short screens), the sticky bottom action bar overlaps the tab nav. Audit z-index and bottom positioning. Goal: tab nav always sits above the action bar, both reachable.

## Files likely involved

- `src/pages/CalculatorV3Page.tsx` (heavy)
- `src/components/header/*` (title bar, hamburger menu components — actual paths TBD)
- `src/components/JobTab.tsx` or similar (the Job screen content)
- `src/components/ConfirmDialog.tsx` (may need to create or reuse for Clear Job confirmation)
- Possibly `src/hooks/useBomTotal.ts` or wherever BOM total is computed
- `src/index.css` or styling files for sticky bar z-index fixes

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- BOM calculation logic (only fix the trigger for recalc)
- `canonicalAdapter.ts` public function signatures
- `canvasEngine.ts`
- `package.json` beyond strictly necessary
- Existing desktop behavior (verify desktop layout still works after each change)
- PDF export logic (price display is render-time only; PDFs still use the full BOM)
- Snapshot architecture, Edit Gate workflow

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on dev server:
  1. Open `/fence-calculator` → lands on Job tab (NOT BOM)
  2. Job screen shows no "Property Map" or "Enter an address..." text
  3. Title bar: Glass Outlet symbol on left, no "New Job" text. Price hidden (total is 0).
  4. Add a run with some sections → title bar price appears with correct total
  5. Delete a run → price decreases to reflect remaining items
  6. Delete all items → price disappears (back to hidden)
  7. Open hamburger menu → see "Clear Job" item. Tap → confirmation dialog. Confirm → state resets.
  8. Toggle DevTools "Offline" → hamburger menu now shows offline indicator. Toggle back online → indicator disappears.
  9. Rotate device to landscape → title bar still renders cleanly, no overflow
  10. Add several runs → BOM tab still updates automatically (no Generate button needed)
  11. Small viewport simulation (375×600) → tab nav and any remaining action bar do not overlap

New tests:
- Initial tab is 'job' on first mount
- BOM total recalculates after a run deletion (use a state snapshot before/after delete)
- Offline indicator renders only when `navigator.onLine === false`
- Confirmation dialog appears before Clear Job destroys state

## Manual reproduction (for PR description)

1. Open `npm run dev`, go to `/fence-calculator`
2. Confirm landing on Job tab
3. Tap header to open hamburger → verify Clear Job item is present
4. Add 2-3 runs with sections, confirm price appears in title bar
5. Delete one run → price decreases
6. Tap Clear Job → confirm dialog → confirm → state clears, price disappears
7. Open Chrome DevTools → Network tab → "Offline" → see offline indicator in hamburger

## Risk

**MEDIUM** — large surface in `CalculatorV3Page.tsx`. Mitigations:
- All changes consolidated into ONE PR (no parallel PRs on this file)
- Each sub-item is independently testable
- No `localBomCalculator.ts` changes; no canvas changes; no save flow changes
- Desktop behavior preservation is explicitly verified
