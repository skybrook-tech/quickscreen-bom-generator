# 032 — UI polish: hamburger menu, title bar centering, run/section/gate formatting, dropdown fixes

Branch: `codex/brief-032-ui-polish-and-hamburger-menu`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 031 (PR #71) merged. This brief builds on 031's settings UI consistency work.

Use npm 10.x if package-lock.json needs touching.

## Goal

A multi-area UI polish pass to bring the calculator to a more presentable state. Touches settings dropdowns, hamburger menu (add to desktop, reorganize contents), title bar layout, run/section/gate card formatting, button styling, and confirmation flows. Every change must work on BOTH mobile and desktop surfaces.

## What to implement

### A. Settings data + dropdown fixes (small, do these first)

1. **Vertical slat default height 1770 → 1800**. Open `src/data/systems/vs.json` (or equivalent VS system seed file). Find the default height field (e.g., `defaultHeightMm` or similar). Change `1770` to `1800` so the run-level default matches the section-level default. Verify by inspecting the BOM output for a VS run (should be unchanged in dimensions, just the default starting value updates).

2. **Move "Alternate Post Color" to the Slat Colors and Spacings dropdown**. Currently it's in the wrong dropdown. The Run Settings and Section Settings third dropdown (or wherever "Alt Post Color" currently lives) should NOT have it anymore.

3. **Reorder the Slat Colors and Spacings dropdown** to this exact order:
   - Slat Range
   - Color (slat color)
   - Alternate Post Color (button or toggle as today, just moved here)
   - Slat Size
   - Slat Gap (combined gap type + gap size, per brief 031)
   - **Remove "Finish"** entirely from this dropdown — Finish should not appear here (it may belong elsewhere or be removed completely; check existing usage and either move to a different dropdown if essential or delete if redundant)

4. **Apply the same order + removals to Section Settings**. Section Settings' Slat Colors and Spacings dropdown should mirror Run Settings exactly (per brief 031's stated goal). If brief 031 didn't fully achieve this, this brief is the cleanup pass.

### B. Hamburger menu (add to desktop, reorganize contents)

5. **Add a hamburger menu to the desktop surface**. Currently the mobile surface has a hamburger; desktop does not. Add one to the desktop title bar (right side, matching the mobile pattern). Same hamburger icon, same slide-out / dropdown panel behavior. Use the existing mobile hamburger component if it can be made responsive; otherwise extract the component to be shared.

6. **Hamburger menu contents** (mobile + desktop, identical):
   - **Customer Mode** — toggle that hides BOM costs (this already exists from brief 017; move it here if it's currently elsewhere)
   - **Offline Status** — appears in the menu ONLY when `navigator.onLine === false`. Shows something like "Offline — quotes can't be saved" with a red dot or warning icon. Hidden entirely when online.
   - **Install Videos** — opens a modal / page / drawer showing product installation tutorial videos. Initial scaffold can be a placeholder with `<a>` links to YouTube playlist URLs (Liam will provide actual URLs later). At minimum, render a section with headings like "QSHS installation", "XPL installation", "VS installation", "BAYG installation" with placeholder `<a href="https://youtube.com/...">Watch on YouTube</a>` links. Liam can swap real URLs in via a follow-up edit or directly in the source file.

7. **Remove the offline access banner**. The current visible banner that appears at the top of the page when offline (added by brief 017 / brief 019) should be REMOVED entirely. The offline state is now surfaced ONLY via the hamburger menu item per point 6.

8. **Clear Job and Save Job stay where they are**. Do NOT move them into the hamburger:
   - Mobile (PWA): Save = bottom nav 4th button (brief 022), Clear = hamburger menu (brief 019)
   - Desktop: Save and Clear stay at the bottom of the sidebar (their current location)

9. **Saved quote history is NOT in the hamburger**. It already lives behind the existing "Quotes" button in the title bar. Leave that as is.

### C. Title bar layout

10. **Center the job name and the price in the title bar**. Currently they're left/right aligned. Move both to a centered horizontal group. Specifically:
    - Title bar layout (left to right): [hamburger / menu]   [job name]   [price]   [other right-side controls]
    - The job name + price group should be horizontally centered in the title bar
    - Job name and price are shown together, with the price next to the name. E.g., "Smith House 123 Main · $2,450"
    - When price is $0, show only the job name (price hidden, per brief 019)

11. **Price typography matches job name**. Currently the price might be smaller / different weight. Make it identical font, size, and weight to the job name so they read as a unified pair.

12. **Remove the "enter job name" field from the sidebar**. The dedicated sidebar input for the job name is removed entirely. The job name is set ONLY at Save time via the Save Job dialog (brief 022).

13. The Save Job dialog already pre-fills with the existing job name or "Untitled Job (date)". After successful save, the title bar updates to show the saved name (per brief 026).

### D. Run / Section / Gate card formatting cleanup

14. **Audit current typography across Run, Section, Gate cards**. Look at:
    - Heading font, size, weight
    - Subheading font, size, weight
    - Right-side action buttons positioning (Run Settings, Section Settings, Gate Settings buttons; Remove, Add buttons; etc.)
    - Spacing between elements

15. **Goal**: every card type follows the same visual rhythm. Headings use the same typography. Subheadings use the same typography (one size smaller, lighter color). Right-side action buttons line up vertically in a neat column down the right edge of each card.

16. **Right-side button column**: all action buttons (settings buttons, remove X, etc.) on the right side of each card should be aligned in a single vertical column. Same horizontal position across Run, Section, and Gate cards. Use flexbox or grid to enforce this.

17. **Run heading typography for the system type** (per item 25 below): the system type text after the total length should be CENTERED in the heading row, in a fancy display font (e.g., a Google Fonts serif like "Playfair Display", "Cormorant Garamond", or "DM Serif Display" — pick something elegant). The font should clearly stand out from the rest of the UI's sans-serif body type. Load via `<link>` in `index.html` or via the existing Google Fonts setup.

### E. Specific UI element changes

18. **"Remove Run" button**: change to a slightly bigger X icon (e.g., from `size={16}` to `size={20}` if using Lucide). When tapped, open a confirmation dialog:
    - Title: "Remove this run?"
    - Body: "This will delete the entire run and all its sections and gates. This cannot be undone."
    - Buttons: Cancel (left, neutral) + Remove (right, red/destructive style)
    - On Remove tap: actually remove the run. Existing behavior otherwise.

19. **"Add Section" and "Add Gate" buttons**: change styling to dark blue background + white text.
    - Dark blue can be `bg-blue-700` or `bg-blue-800` (Tailwind), or a brand-matched dark blue (~`#1e40af` or `#1e3a8a`).
    - White text: `text-white`.
    - Keep existing button dimensions, hover state, disabled state, etc. — only change the colors.

20. **Remove the "Gates" light grey label** that appears above Gate 1 in a run. The first gate card should NOT have a "Gates" label/header above it. Gates are visually distinct enough on their own; no section header needed.

21. **System type in Run heading: centered + fancy font**. Already covered in item 17 — implement both pieces (centering layout + fancy font).

### F. Mobile + desktop parity

22. Every change above applies to BOTH mobile and desktop. Test in both Chrome DevTools mobile viewport simulator (375px wide for iPhone target) AND desktop browser default size.

23. Where mobile and desktop layouts differ (e.g., desktop has a sidebar, mobile has bottom nav), preserve those structural differences but ensure typography, button styling, hamburger contents, and dropdown layouts are identical.

## Files likely involved

- `src/data/systems/vs.json` (default height fix)
- `src/components/calculator-v3/RunSettings.tsx` (dropdown reorganization)
- `src/components/calculator-v3/SectionSettings.tsx` (mirror dropdown reorganization)
- `src/components/calculator-v3/RunCard.tsx` (heading, system type centering, font, button column)
- `src/components/calculator-v3/SectionCard.tsx` (heading, button column, Add Section button)
- `src/components/calculator-v3/GateCard.tsx` (heading, button column)
- `src/components/layout/Header.tsx` and/or `src/components/layout/AppShell.tsx` (title bar centering, hamburger on desktop)
- `src/components/HamburgerMenu.tsx` or equivalent (add Install Videos item, ensure shared between mobile + desktop)
- `src/components/InstallVideos.tsx` (new — placeholder modal/page with system video links)
- `src/components/OfflineBanner.tsx` or wherever the offline banner is — remove it
- The "Add Section" / "Add Gate" button components (styling change)
- `src/pages/CalculatorV3Page.tsx` (sidebar layout — remove job name input field)
- `src/components/SaveJobDialog.tsx` (verify it handles the case where there's no pre-filled name from sidebar)
- `index.html` (add Google Fonts link for the fancy display font)
- Tests across `src/components/calculator-v3/` and `src/components/layout/`

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts` (no changes — pure data model, BOM regression guard)
- `canonicalAdapter.ts` public function signatures
- `canvasEngine.ts`
- Canvas / drawing functionality (this is a non-canvas brief)
- The PWA manifest, service worker, or any PWA-layer code
- The Save Job persistence flow (only the trigger UX changes — Save still writes the same data)
- Existing BOM math, pricing, calculation outputs
- `package.json` — except adding a Google Fonts link in `index.html` doesn't require any package change. If you must add a font package, justify in the PR description.

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on Netlify preview (mobile + desktop):

  **Settings dropdowns:**
  1. VS run created → default height shows 1800mm in both Run Settings and Section Settings (no mismatch)
  2. Open Run Settings → Slat Colors and Spacings dropdown → confirm order: Slat Range / Color / Alt Post Color / Slat Size / Slat Gap (no Finish)
  3. Open Section Settings → same dropdown → same order, same content as Run Settings

  **Hamburger menu:**
  4. Desktop: hamburger icon visible in title bar, opens slide-out / dropdown menu
  5. Mobile: hamburger still works as before
  6. Both: menu contents = Customer Mode toggle + Offline status (visible only when offline) + Install Videos link
  7. Install Videos link opens placeholder modal/page with QSHS / XPL / VS / BAYG installation video sections
  8. Offline banner is gone (no visible banner at top of page when offline; offline shows in hamburger only)

  **Title bar:**
  9. Job name + price are centered horizontally in title bar
  10. Same typography for both (size, weight, font family)
  11. When price is $0, only job name shows (no "$0" placeholder)
  12. Sidebar no longer has a job name input field
  13. Tapping Save (bottom nav on mobile, sidebar on desktop) opens dialog with name pre-filled; can edit name; saves correctly

  **Card formatting:**
  14. Run heading: total length + system type centered, system type in fancy display font (clearly visually distinct)
  15. Run / Section / Gate card right-side buttons all line up in a vertical column at the same horizontal position
  16. Heading and subheading typography consistent across all three card types

  **Specific UI elements:**
  17. Remove Run X is slightly larger than before
  18. Tap Remove Run X → confirmation dialog appears → Cancel works (no removal) → Remove confirms (removal happens)
  19. Add Section button is dark blue with white text
  20. Add Gate button is dark blue with white text
  21. No "Gates" light grey label above the first gate in any run

- Both mobile (375px viewport) AND desktop (default browser) render every change correctly

New tests:
- VS default height is 1800 (snapshot of seed file or unit test of the system loader)
- Run Settings Slat Colors and Spacings dropdown contains: Slat Range, Color, Alt Post Color, Slat Size, Slat Gap (no Finish)
- Section Settings same dropdown matches Run Settings exactly
- Hamburger menu renders Customer Mode + Install Videos always; Offline only when `navigator.onLine === false`
- Title bar centers job name + price horizontally
- Remove Run dialog asks for confirmation; Cancel does not remove, Remove does

## Manual reproduction (for PR description)

1. Open `npm run dev`, desktop browser on `/fence-calculator`
2. Create a new VS run → verify height defaults to 1800 (not 1770)
3. Click "Run Settings ▾" → verify dropdown order and contents
4. Click hamburger menu in title bar → verify Customer Mode, Install Videos visible
5. Click Install Videos → verify modal opens with placeholder content
6. Center alignment of job name + price visible
7. Click Remove Run X → confirmation dialog
8. Mobile viewport: repeat all of the above

## Risk

**MEDIUM-HIGH** — biggest UI brief yet. Touches 10+ component files, settings data, layout components, new modal component, font loading. Risk areas:

- **Title bar centering** can squeeze hamburger / quotes button if not careful with flex layout
- **Removing offline banner + ensuring offline status surfaces in hamburger** requires careful state wiring
- **Install Videos modal** is a new component — keep it minimal (placeholder content), avoid scope creep
- **Card right-side button alignment** across Run/Section/Gate cards requires a shared layout primitive or careful matching of flex/grid columns
- **Section Settings mirroring Run Settings** is brief 031's stated goal — if brief 031 fully achieved it, this brief just needs to verify and add the Alt Post Color move + Finish removal. If brief 031 partially achieved it, this brief is the cleanup.

**Plan for one round of fix-up** after this PR opens. Real-device testing will likely surface a few alignment issues that CI tests don't catch.

## Open question for Liam (flag in PR body)

- Install Videos: Liam said "install videos" without specifying. This brief assumes PRODUCT installation videos (how tradies install QSHS, XPL, etc.). If you actually meant PWA install instructions (Add to Home Screen walkthrough), tell us and we'll swap the implementation. Current scaffold is placeholder; real video URLs to be supplied later.
