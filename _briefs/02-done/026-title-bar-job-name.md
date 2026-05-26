# 026 — Title bar: add job name, remove Glass Outlet logo

Branch: `codex/brief-026-title-bar-job-name`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 019 (PR #53) merged — already true on master.

Use npm 10.x if package-lock.json needs touching.

## Goal

Free up horizontal space in the mobile title bar by removing the Glass Outlet logo and displaying the current job name instead. Price and hamburger menu must remain visible.

Reasoning: tradies switching between quotes need to see WHICH job they're working on at a glance. The logo is redundant (they know they're in QuickScreen — that's why they opened the app). The job name is the unique identifier for "which quote am I in right now?"

## What to implement

### A. Remove Glass Outlet logo from title bar

1. Find the title bar component in `src/pages/CalculatorV3Page.tsx` (or extracted to `src/components/calculator-v3/AppHeader.tsx` or similar — search for `glass-outlet-symbol.svg` references).
2. Delete the `<img>` tag rendering `/icons/glass-outlet-symbol.svg`.
3. Delete any wrapper element that ONLY existed for the logo (preserve siblings).

### B. Add job name display

4. **Source of the job name**: the existing job-name state. Brief 022's SaveJobDialog uses this state — find where it's defined (likely a React state, context, or Zustand store). The job name is what the user types into the Save dialog.

5. **Render the job name** in the title bar where the logo used to be:
   - Element: `<h1>` or `<span>` (whatever the existing title element type is)
   - Content: bind to the current job name
   - **When no name set** (new quote, never saved): display the string `"New Quote"`
   - **When name set**: display the name. Truncate with ellipsis if it overflows the available horizontal space (CSS: `text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: [appropriate]`)
   - Typography: match the visual weight previous logo had — likely bold-ish, the size of the existing title font

6. **Live update**: if the user opens the Save dialog and edits the name, the title bar updates reactively when they save (after the dialog closes successfully).

### C. Keep price + hamburger in their existing positions

7. The live price display (added in brief 019) stays as-is — same position, same format (just the number, hide when $0).
8. The hamburger menu button stays as-is.
9. Layout (left to right):
   - [Job Name (truncated)]  ← where the logo was
   - [Price]                 ← unchanged
   - [Hamburger]             ← unchanged

10. **Spacing**: the job name should take whatever space is available between the left edge and the price. On very small viewports (320px wide), the order of overflow priority should be:
    - Hamburger: NEVER truncated, always visible
    - Price: NEVER truncated, always visible (unless $0 — already hidden then)
    - Job name: truncates with ellipsis as needed

### D. Landscape mode

11. Confirm the title bar still fits cleanly in landscape orientation. The flex/grid layout should adapt; the job name has more room and shouldn't need to truncate as aggressively.

## Files likely involved

- `src/pages/CalculatorV3Page.tsx` (primary)
- Possibly an extracted header component like `src/components/calculator-v3/AppHeader.tsx`
- The store/state file that holds the job name (search for `jobName` or `quoteName`)
- Tests for the title bar component

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- `canonicalAdapter.ts`
- The job-name state model (only READ from it — no schema changes)
- The Save dialog from brief 022 (it remains the source of name changes)
- The hamburger menu contents from brief 019
- The price display logic from brief 019
- `package.json`

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on Netlify preview:
  1. Open `/fence-calculator` on mobile viewport (375px wide)
  2. Title bar shows: "New Quote" (left) + price hidden (since $0) + hamburger (right)
  3. Add a few fence sections so price becomes non-zero
  4. Title bar updates to show: "New Quote" + "$X,XXX" + hamburger
  5. Tap Save in bottom nav → name dialog appears, type "Smith House 123 Main"
  6. After Save success → title bar updates to "Smith House 123 Main" + price + hamburger
  7. Very long name like "Smith Family Beachfront Property at 47 Beach Road" → title bar truncates with ellipsis, hamburger and price remain visible
  8. Rotate to landscape → title bar reflows, more room for job name, still no overflow
- Desktop: header still renders correctly (this brief is mobile-focused but shouldn't break desktop)

New tests:
- Title bar renders "New Quote" when no job name is set
- Title bar renders the job name when it's set
- Title bar updates when the job name state changes
- Glass Outlet logo `<img>` is no longer present
- Job name truncates with ellipsis when overflowing

## Manual reproduction (for PR description)

1. Open `npm run dev`, mobile viewport on `/fence-calculator`
2. Verify "New Quote" left of price + hamburger
3. Save a job with a name → title bar updates
4. Long name → ellipsis truncation, no layout breakage

## Risk

**LOW-MEDIUM** — small, contained UI change on `CalculatorV3Page.tsx`. The biggest risk is breaking the live price display or hamburger button positioning during flex/grid layout adjustments. Mitigation: keep the existing JSX structure and only swap the logo `<img>` for the job name `<span>`.

This is the third change in 2 weeks to `CalculatorV3Page.tsx`'s header (briefs 019 → 026). No bad-merge risk this time because briefs 020-024 all merged before this brief runs, so master is clean.
