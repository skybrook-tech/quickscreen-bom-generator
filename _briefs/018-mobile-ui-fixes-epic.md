# 018 — Mobile UI Fixes Batch (Epic Overview)

**This is a context document, NOT a brief to execute.** Codex should read this once to understand the batch's intent, then process briefs 019-024 individually from `_briefs/00-inbox/` via the regular MASTER-BRIEF flow.

## Why this batch exists

After mobile briefs 013-017 shipped (mobile shell, job tab, touch canvas, BOM cards, PWA polish), real-device testing surfaced a cluster of UX issues, bugs, and missing polish. This epic collects them into a coordinated batch with explicit sequencing to avoid the bad-merge regressions we hit on briefs 014/015/016 (which all touched `CalculatorV3Page.tsx` and produced duplicate state declarations).

## Brief list

| # | Title | Depends on | Risk | Touches |
|---|---|---|---|---|
| 019 | Page-level UI cleanup **+ asset deployment** | brief 017 merged | MEDIUM | `CalculatorV3Page.tsx`, header components, `public/icons/` |
| 020 | Canvas drawing gestures | **brief 019 merged** | MEDIUM | `FenceLayoutCanvas.tsx`, `canvasEngine.ts` |
| 021 | Canvas toolbar overhaul | **brief 020 merged** | MEDIUM | `CanvasToolbar.tsx`, canvas files |
| 022 | Bottom nav Save button | **brief 019 merged** (needs save-icon.png on master) | LOW | bottom nav component |
| 023 | App icon swap | **brief 019 merged** (needs PWA icons on master) | LOW | manifest, `index.html` |
| 024 | Voice + AI fixes | brief 017 merged | LOW-MEDIUM | voice input, AI parsing service |

## Hard sequencing rules

- **019 → 020 → 021** is a strict sequence. Each one's PR must be merged on master before the next can open.
- **019 → 022, 023** — both 022 and 023 wait on 019 because 019 deploys the icon assets they need.
- **024** is fully independent — can run as soon as 017 is merged (which it already is).

## Single-paste workflow

This batch is designed for ONE paste of `MASTER-BRIEF.md`:

1. Liam extracts `mobile-ui-fixes-batch.tar.gz` into his repo (everything lands in `_briefs/` including `_briefs/assets/`)
2. Liam commits the new files in `_briefs/` to master (`git add _briefs/ && git commit && git push`)
3. Liam pastes `MASTER-BRIEF.md` ONCE
4. Codex picks brief 024 first (no dependencies) — opens draft PR
5. Codex picks brief 019 — copies `_briefs/assets/*` to `public/icons/` as the first commit, then makes the code changes, opens draft PR
6. Codex STOPS — reports "019 PR open. 020/021/022/023 all depend on 019. Merge 019 + 024, then re-paste."
7. Liam merges 019 and 024 → master now has the icons AND voice/AI fixes
8. Liam re-pastes MASTER-BRIEF
9. Codex picks 020, 022, 023 (all unblocked) — opens 3 draft PRs in this run
10. Codex STOPS at the 020 boundary — reports "020 PR open. 021 depends on it. 022, 023 also opened."
11. Liam merges 020, 022, 023 → re-pastes → Codex does 021 → done.

**Total Codex pastes: 3.** Same as the previous batch (which is the realistic minimum given human review gates).

## Bundled assets

All required icon assets are in `_briefs/assets/`. Brief 019 deploys them automatically as part of its first commit:

| Source (in batch) | Deployed to | Used by |
|---|---|---|
| `_briefs/assets/glass-outlet-symbol.svg` | `public/icons/glass-outlet-symbol.svg` | Brief 019 (title bar) |
| `_briefs/assets/glass-outlet-symbol-192.png` | `public/icons/glass-outlet-symbol-192.png` | Brief 023 (PWA) |
| `_briefs/assets/glass-outlet-symbol-512.png` | `public/icons/glass-outlet-symbol-512.png` | Brief 023 |
| `_briefs/assets/apple-touch-icon.png` | `public/icons/apple-touch-icon.png` | Brief 023 (iOS) |
| `_briefs/assets/save-icon.png` | `public/icons/save-icon.png` | Brief 022 (bottom nav) |
| `_briefs/assets/glass-outlet-symbol-256.png` | NOT deployed by default | Optional title bar fallback if SVG is later rejected |

## Constraints (global — every brief observes these)

- **DO NOT change** `src/lib/localBomCalculator.ts` — BOM regression guard
- **DO NOT change** `canonicalAdapter.ts` public function signatures
- **DO NOT change** `canvasEngine.ts` public types except where a brief explicitly says so
- **DO NOT change** `package.json` beyond strictly necessary
- **Use npm 10.x** if `package-lock.json` needs touching
- **Skip the Deno integration job** — known red on XP-BTP-B fixture, pre-existing, out of scope
- `localBomCalculator.test.ts` must pass UNCHANGED in every PR

## Process

Same as before:

1. Liam commits the prerequisite asset files
2. Liam pastes MASTER-BRIEF.md to Codex
3. Codex processes 019, opens draft PR, stops at dependency boundary
4. Liam reviews PR, **rebases on master via "Update branch" button**, merges
5. Liam re-pastes MASTER-BRIEF; Codex proceeds to 020 (and 022/023/024 if independent)
6. Repeat until queue is empty

**The rebase-before-merge step is critical.** Briefs 014-016 produced bad-merge regressions because PRs were merged without rebasing. Even with strict sequencing, click "Update branch" on each PR before merging.

## Final report expected

After all 6 briefs ship:
- Bottom nav has 4 buttons: Job / Canvas / BOM / Save
- Title bar: Glass Outlet symbol (left) + live price (right), no "New Job" text
- Hamburger menu: Clear Job + offline status (only when offline)
- Canvas: single-tap places (debounced), double-tap finishes, long-press drags, pinch zooms cleanly
- Canvas toolbar: Move/Edit, Undo, Redo, Clear (with confirmation), no zoom buttons
- Job tab is default on first load
- BOM updates automatically (no Generate buttons), price clears when items deleted
- App icon: Glass Outlet symbol everywhere (PWA, browser tab, home screen)
- Mic button survives multiple uses, AI parsing handles fuzzy measurement input
