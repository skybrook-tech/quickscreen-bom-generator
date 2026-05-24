# 022 — Bottom nav: add Save button (4th tab) with name-confirmation dialog

Branch: `codex/brief-022-bottom-nav-save-button`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 019 merged.

Use npm 10.x if package-lock.json needs touching.

## Goal

Add a 4th button to the mobile bottom nav: a custom Save icon (between BOM and any existing menu/profile button). Tapping it triggers a "name your job" confirmation dialog, then saves to Supabase. This consolidates the save action into the bottom nav where it's always reachable, removing the floating "Save Job" button that previously got in the way of the keyboard.

## Pre-flight check

Brief 019 deploys `public/icons/save-icon.png` as part of its first commit. Since 022 depends on 019 merged, the icon file is guaranteed to be on master by the time this brief runs.

```bash
test -f public/icons/save-icon.png || echo "MISSING — brief 019 should have deployed this"
```

If missing → move brief to `03-paused/` and report "Brief 022 paused: save-icon.png missing from public/icons/. Either brief 019 didn't deploy it correctly, or Liam removed it. Investigate before continuing."

## What to implement

### A. Add Save button to bottom nav

1. Audit current bottom nav component (likely `src/components/MobileBottomNav.tsx` or similar — search for "Job", "Canvas", "BOM" labels).
2. Add a 4th button: **Save**
   - Icon: `<img src="/icons/save-icon.png" alt="Save" />` (the custom Glass Outlet save icon Liam designed)
   - Size to match the other bottom-nav icons (typically `24-28px`)
   - Label: "Save" (below the icon, matching other buttons)
   - Position: after BOM (so order is: Job, Canvas, BOM, Save)
3. The Save button is NOT a tab (doesn't switch tabs) — it's an action button. Tapping it triggers the save flow.
4. Visual styling: same dimensions as other bottom-nav buttons, no active/selected state (since it's an action, not a route).

### B. Save flow: name-confirmation dialog

5. When Save is tapped:
   - Open a modal dialog titled "Save Job"
   - Pre-fill an input field with the current job name (from existing form state). If no name yet, default to something like "Untitled Job (May 25, 2026)".
   - Show: input field (editable), Cancel button, Save button
   - User can edit the name freely
   - Tap Save → persist the quote to Supabase with the (possibly edited) name → show a brief success toast ("Job saved"). Close the dialog.
   - Tap Cancel → close dialog, no save
6. **Persist behavior**: use the EXISTING save-to-Supabase logic that the previous Save Job button used. Do NOT re-implement the save flow. Just wire the dialog to call the same function.
7. **If save fails** (network error, Supabase error): show an error toast "Couldn't save — please try again" and keep the dialog open so the user can retry.

### C. Remove the old floating "Save Job" button

8. Find the floating/sticky "Save Job" button (likely near the bottom of `CalculatorV3Page.tsx`) and remove it. Its functionality is now in the bottom nav.
9. **Important**: brief 019 already moved Clear Job to the hamburger menu. Save Job becomes the bottom-nav button. Together, this removes ALL floating action buttons from the main page surface — the only floating UI left should be the canvas toolbar (when on the canvas tab).

## Files likely involved

- `src/components/MobileBottomNav.tsx` (or equivalent — actual filename TBD via search)
- `src/pages/CalculatorV3Page.tsx` (remove old Save button)
- `src/components/SaveJobDialog.tsx` (new component, or expand an existing dialog)
- `src/services/supabaseQuotes.ts` or similar (reuse — don't change)

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- Existing Supabase save logic (only wire the dialog to it)
- `canonicalAdapter.ts`
- Canvas files
- `package.json` beyond strictly necessary
- The icon file itself (use as-is)

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on mobile:
  1. Bottom nav shows 4 buttons: Job, Canvas, BOM, Save
  2. Save icon is the custom Glass Outlet save icon at `/icons/save-icon.png`
  3. Tap Save → dialog opens with current job name pre-filled
  4. Edit the name in the input → tap Save → success toast → dialog closes
  5. Reload the page → previously-saved job is in the saved-jobs list with the edited name
  6. Tap Save on a brand-new job (no name set) → dialog shows a sensible default name
  7. Cancel button closes the dialog without saving
  8. Simulate offline (DevTools) → tap Save → error toast appears, dialog stays open
- Desktop:
  - Bottom nav still works on desktop (or is hidden via responsive CSS — match the existing pattern)

New tests:
- Save button renders in the bottom nav
- Save dialog pre-fills with current job name
- Save dialog calls the existing save function with the (potentially edited) name

## Manual reproduction (for PR description)

1. Open `npm run dev`, go to `/fence-calculator`
2. Fill in customer details, address; draw a fence
3. Verify Save button is in bottom nav (Glass Outlet save icon)
4. Tap Save → dialog appears with job name pre-filled
5. Edit name → Save → confirm toast → reload → find job in saved list

## Risk

**LOW** — pure UI addition + dialog wiring to existing save logic. No data model changes, no calculation changes.
