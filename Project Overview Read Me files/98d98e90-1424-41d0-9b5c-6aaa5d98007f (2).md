# SkyBrook National Rollout Pack — Self-Extracting Bundle

> **Drop this file at `_briefs/SKYBROOK-NATIONAL-ROLLOUT-PACK.md` in the quickscreen-colorbond-generator repo, then paste `CODEX-EXTRACTION-PROMPT.md` into a fresh Codex desktop session.** Codex will read this file from disk, extract 39 nested files to their declared paths, and open a draft PR. Liam reviews and merges.
>
> This bundle contains **39 files** in total: 16 briefs (028 + 032-046), 1 paused runbook, 5 architecture/PR-description assets, 9 seed JSON files (DF: 3, AF: 6), and 3 skill files (Anyfence Supplier Pack Builder).
>
> **Amazing Fencing has REAL tier2 trade pricing** from Liam's Cin7 export — ~40 priced SKUs across timber-paling + retaining-wall. The other 4 AF instances (Colorbond, PermaSteel, slat screen, chainwire) stay pricing-pending until separate PDFs arrive.

## How extraction works

Each embedded file begins with a line that exactly matches the regex:

`^<!-- SKYBROOK-PACK-FILE-START: (.+) -->$`

The captured group is the destination path relative to the repo root. The file content runs from the line after the marker to either the next `SKYBROOK-PACK-FILE-START` marker or the `SKYBROOK-PACK-BUNDLE-END` marker — whichever comes first. Strip leading/trailing blank lines.

## File index

| # | Destination path |
|---|---|
| 1 | `_briefs/MASTER-BRIEF.md` |
| 2 | `_briefs/00-inbox/028-multi-supplier-foundation-housekeeping.md` |
| 3 | `_briefs/00-inbox/032-supplier-archetype-instance-schema.md` |
| 4 | `_briefs/00-inbox/033-data-backfill-glass-outlet-archetypes-instances.md` |
| 5 | `_briefs/00-inbox/034-versioned-price-books-and-quote-pinning.md` |
| 6 | `_briefs/00-inbox/035-admin-ui-suppliers-and-instances-crud.md` |
| 7 | `_briefs/00-inbox/036-admin-ui-products-and-bulk-import.md` |
| 8 | `_briefs/00-inbox/037-admin-ui-rule-authoring.md` |
| 9 | `_briefs/00-inbox/038-workbook-regression-upload-and-diff.md` |
| 10 | `_briefs/00-inbox/039-user-scoped-authoring-and-rls.md` |
| 11 | `_briefs/00-inbox/040-community-publication-path.md` |
| 12 | `_briefs/00-inbox/041-quality-reports-and-demotion.md` |
| 13 | `_briefs/00-inbox/042-discount-fencing-supplier-and-instances.md` |
| 14 | `_briefs/00-inbox/043-discount-fencing-seed-data-and-price-book.md` |
| 15 | `_briefs/00-inbox/044-platform-org-and-visibility-layer.md` |
| 16 | `_briefs/00-inbox/045-amazing-fencing-supplier-and-instances.md` |
| 17 | `_briefs/00-inbox/046-amazing-fencing-seed-data-and-price-book.md` |
| 18 | `_briefs/03-paused/production-cutover-runbook.md` |
| 19 | `_briefs/assets/030a-MASTER-BRIEF.md` |
| 20 | `_briefs/assets/030a-multi-supplier-platform-architecture.md` |
| 21 | `_briefs/assets/030a-system-authoring-process.md` |
| 22 | `_briefs/assets/028-production-cutover-runbook.md` |
| 23 | `_briefs/assets/028-pre-release-pr-descriptions/README.md` |
| 24 | `_briefs/assets/028-pre-release-pr-descriptions/pr-1-colorbond-ui-consistency.md` |
| 25 | `_briefs/assets/028-pre-release-pr-descriptions/pr-2-rollout-setup-cherry-pick.md` |
| 26 | `_briefs/assets/028-pre-release-pr-descriptions/pr-3-qsg-sliding-gates.md` |
| 27 | `_briefs/assets/028-pre-release-pr-descriptions/qsg-workbook-regression-checklist.md` |
| 28 | `_briefs/assets/043-discount-fencing-seeds/cca-pine-paling.json` |
| 29 | `_briefs/assets/043-discount-fencing-seeds/aluminium-pool.json` |
| 30 | `_briefs/assets/043-discount-fencing-seeds/aluminium-slat-gate.json` |
| 31 | `_briefs/assets/046-amazing-fencing-seeds/colorbond.json` |
| 32 | `_briefs/assets/046-amazing-fencing-seeds/permasteel.json` |
| 33 | `_briefs/assets/046-amazing-fencing-seeds/timber-paling.json` |
| 34 | `_briefs/assets/046-amazing-fencing-seeds/timber-slat-screen.json` |
| 35 | `_briefs/assets/046-amazing-fencing-seeds/chainwire-security.json` |
| 36 | `_briefs/assets/046-amazing-fencing-seeds/retaining-wall.json` |
| 37 | `skills/anyfence-supplier-pack-builder/SKILL.md` |
| 38 | `skills/anyfence-supplier-pack-builder/validate_seed.py` |
| 39 | `skills/anyfence-supplier-pack-builder/render_briefs.py` |

---

# Embedded files


<!-- SKYBROOK-PACK-FILE-START: _briefs/MASTER-BRIEF.md -->

# MASTER-BRIEF — Codex Orchestration Prompt (quickscreen-colorbond-generator)

**Paste this to a fresh Codex desktop session whenever you want to advance the brief queue.**

You are the resident Codex agent on `github.com/skybrookai-atlas/quickscreen-colorbond-generator` (default branch `main`, NOT `master`). Your job is to pick up the lowest-numbered brief from `_briefs/00-inbox/`, execute it in full, and open a **draft PR**. You stop at the first hardcoded stop point.

---

## How to pick the next brief

1. List files in `_briefs/00-inbox/` sorted lexicographically.
2. Read the lowest-numbered brief.
3. Check `Depends on:` at the top.
   - If it references an unmerged PR or a brief still in `00-inbox`/`01-in-progress`, **STOP** and exit with the message: "Brief NNN depends on MMM; MMM not yet merged. Re-paste after MMM is merged."
   - If all deps are satisfied, proceed.
4. Move the brief file to `_briefs/01-in-progress/` as your first commit.
5. Execute the brief verbatim, per its hard rules.
6. Open a **draft PR** with the brief's PR description template.
7. Move the brief to `_briefs/02-done/` (do NOT delete it).
8. Loop back to step 1.
9. When `_briefs/00-inbox/` is empty, stop with the message: "Inbox empty."

---

## Hard rules every brief observes (do not override unless a brief explicitly says so)

- **PR base branch is `main`**, NOT `master`. Verify in the GitHub UI before opening.
- **Draft PR only.** Never set the PR to ready-for-review and never auto-merge.
- **`src/lib/localBomCalculator.ts` must not be modified.** Its public signature and behaviour are the BOM regression guard.
- **`src/lib/localBomCalculator.test.ts` must pass UNCHANGED** in every brief PR. If it doesn't pass, you have broken something — fix it before opening the PR.
- **`src/components/canvas/canonicalAdapter.ts` public function signatures must not change.**
- **`src/components/canvas/canvasEngine.ts` public types must not change** except where a brief explicitly authorises it.
- **Skip the Deno integration job.** Known red on the XP-BTP-B fixture; pre-existing, out of scope.
- **Use npm 10.x** when touching `package-lock.json`. The repo's `engines` declares Node 20 / npm 10.
- **No two briefs in flight on the same hot file** (`CalculatorV3Page.tsx`, `FenceLayoutCanvas.tsx`, central seed files). The strict-sequential `Depends on:` rule is what prevents bad-merge regressions — respect it.
- **After merge: run `npm run seed:products`** if a brief touched seed JSON. The edge function reads from Postgres, not from repo JSON.

---

## Stop points (mandatory pauses for human review)

Stop and exit (do not proceed to the next brief) when any of these happen:

- A `Depends on:` reference is unsatisfied.
- A brief has an explicit **Stop point** section that triggers (e.g. "if `auth_org_id()` differs from migration 025, surface and pause").
- A test suite fails after a reasonable fix attempt.
- An ALTER TABLE / DROP statement would touch existing live data.
- A migration would replace a file in the protected list.
- You cannot determine the correct base branch.

---

## Reference docs (read before you execute)

Inside the repo:

- `docs/multi-supplier-platform-architecture.md` — the 5-layer model (Geometry / Catalogue / Rules / Pricing / Visibility). The source of truth for all architectural questions.
- `docs/system-authoring-process.md` — the three-tier identity model (supplier / archetype / instance), authoring workflow, trust tiers, brief sequence 032-043.
- `docs/calculator-architecture-tradeoffs.md` — Approach A (server-side BOM via `bom-calculator` edge function) is the canonical execution path. The new architecture builds on this — do NOT re-decide it.
- `docs/catalogue-gap-analysis.md` — SKU and rule gaps that drive the first wave of seed data.
- `docs/seed-data-mapping-spec.md`, `docs/canonical-payload.md`, `docs/engine-schema.md` — existing contracts that any new schema must extend (not replace).

If a brief and one of these docs disagree, **the doc wins**. Surface the conflict in the PR description; do not silently diverge.

---

## Existing protected paths (reference list)

| Path | Why |
|---|---|
| `src/lib/localBomCalculator.ts` | BOM regression guard |
| `src/lib/localBomCalculator.test.ts` | Must pass unchanged |
| `src/components/canvas/canonicalAdapter.ts` | Public signatures stable |
| `src/components/canvas/canvasEngine.ts` | Public types stable |
| `supabase/functions/bom-calculator/` | Canonical server-side BOM engine |
| `package.json` | Touch only when strictly necessary; npm 10.x for lockfile changes |
| Migrations `001` through `031` | Already applied; new work uses `032+` |

---

## PR style

- One brief per PR. **No stacked branches with multiple logical changes.**
- Branch name: `codex/brief-NNN-<short-slug>` (matches existing convention).
- PR title: `Brief NNN — <title>`.
- PR description: use the template at the bottom of the brief file.
- Mark the PR as **draft** before opening.
- Liam reviews on iPhone via the Netlify deploy preview (`deploy-preview-XX--tiny-kangaroo-8f7016.netlify.app`) and merges in the GitHub web UI.

---

## After a brief merges

The brief author has listed the post-merge actions in the brief itself (typically: run `npm run seed:products`, re-point Netlify, etc.). Do not skip them — they are part of the brief, not optional cleanup.

---

## Working folder convention

```
_briefs/
├── 00-inbox/          ← queued; you pick from here
├── 01-in-progress/    ← max 1 file; you put your current brief here
├── 02-done/           ← briefs whose PRs are open or merged
├── 03-paused/         ← blocked; needs Liam attention
├── assets/            ← binary assets bundled with briefs
├── MASTER-BRIEF.md    ← this file
└── INVENTORY.md       ← status table (you keep this in sync with reality)
```

Update `INVENTORY.md` when you open or close a brief. Cosmetic, but Liam reads it.

---

## When you finish a pass

Print a short summary:

```
Brief NNN — opened draft PR #X (or: STOPPED at brief NNN because Y)
Next: brief MMM (waiting on Z) or "Inbox empty"
```

That's it. Re-paste this MASTER-BRIEF to continue.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/028-multi-supplier-foundation-housekeeping.md -->

# Brief 028 — Multi-Supplier Foundation Housekeeping

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main` (NOT `master`)
**Depends on:** nothing — this is the first brief in the new repo's multi-supplier rollout. Ships before brief 032.
**Estimated PR size:** small (docs landing, file moves, cleanup; no code, no schema)
**Primary reference:** the two architecture docs landing in this brief (`docs/multi-supplier-platform-architecture.md`, `docs/system-authoring-process.md`)

---

## Goal

Lay down the foundation so the multi-supplier brief queue (032 onwards) can execute autonomously:

1. Land the two canonical architecture docs on `main` (currently they sit on the unmerged `codex/glass-outlet-calculator-rollout-setup` branch and have never reached `main`).
2. Land `_briefs/MASTER-BRIEF.md` (the orchestration prompt Liam pastes to Codex; new repo doesn't have one yet).
3. Land `_briefs/INVENTORY.md` (the status table).
4. Clean stale briefs `022-bottom-nav-save-button.md` and `023-app-icon-swap.md` out of `_briefs/00-inbox/` — they were merged in the original `skybrook-tech/quickscreen-bom-generator` repo and are leftovers from the 2026-05-26 fork.
5. Move the obsoleted `030-catalogue-model.md` (if any sibling appears in the queue) to `_briefs/03-paused/obsoleted/` with a NOTE.md explaining the conflict (migrations 030/031 are already used; this brief proposed a conflicting `products` table).
6. Document the three unmerged stacked Codex branches (`codex/brief-031-run-section-gate-ui-consistency`, `codex/glass-outlet-calculator-rollout-setup`, `codex/qsg-sliding-gates-calculator`) so Liam can open their PRs in the GitHub UI — these were Codex's prior work that never reached PR.
7. Copy the production cutover runbook from the asset bundle to `_briefs/03-paused/production-cutover-runbook.md` and the pre-release PR descriptions to `_briefs/03-paused/pre-release-pr-descriptions/` (Liam executes these manually; they're not Codex briefs).

After this lands, the queue is clean and the multi-supplier architecture docs are the canonical source of truth referenced by every following brief.

## Hard rules

- **PR base branch is `main`** (NOT `master`).
- **Draft PR only.** Human review gate.
- **`src/lib/localBomCalculator.ts` must not be modified** (and isn't — this brief is docs/files only).
- **`localBomCalculator.test.ts` passes UNCHANGED.**
- **Do NOT touch `package.json`, `package-lock.json`, or any TypeScript files.** This brief is markdown + file moves only.
- **Do NOT rebase / merge the three unmerged Codex branches.** That's a human decision (they have known stacking and need careful review). The brief only documents them.
- **Skip the Deno integration job** — known red on XP-BTP-B fixture, pre-existing.

## Files this brief touches

| File | Type of change |
|---|---|
| `docs/multi-supplier-platform-architecture.md` | NEW (or replace if already present) — copy from `_briefs/assets/030a-multi-supplier-platform-architecture.md` |
| `docs/system-authoring-process.md` | NEW (or replace if already present) — copy from `_briefs/assets/030a-system-authoring-process.md` |
| `_briefs/MASTER-BRIEF.md` | NEW — copy from `_briefs/assets/030a-MASTER-BRIEF.md` |
| `_briefs/INVENTORY.md` | NEW — initial status table (see template below) |
| `_briefs/00-inbox/022-bottom-nav-save-button.md` | DELETE — already merged in original repo |
| `_briefs/00-inbox/023-app-icon-swap.md` | DELETE — already merged in original repo |
| `_briefs/03-paused/PRE-RELEASE-CODEX-BRANCHES.md` | NEW — documents the three stacked Codex branches (uses template below) |
| `_briefs/03-paused/pre-release-pr-descriptions/` | NEW — copy from `_briefs/assets/028-pre-release-pr-descriptions/` (4 files: README.md + 3 PR description templates + 1 workbook regression checklist) |
| `_briefs/03-paused/production-cutover-runbook.md` | NEW — copy from `_briefs/assets/028-production-cutover-runbook.md` (Liam executes when ready to point Netlify at the new repo) |
| `_briefs/00-inbox/028-multi-supplier-foundation-housekeeping.md` → `_briefs/02-done/028-multi-supplier-foundation-housekeeping.md` | MOVE — this brief moves to done after PR opens |

**Explicitly NOT touched:**

- Anything under `src/`
- Anything under `supabase/`
- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`
- The three unmerged Codex branches
- Any existing seed JSON

## Assets bundled with this brief

The architecture docs, MASTER-BRIEF, pre-release PR descriptions, and production cutover runbook are pre-staged in `_briefs/assets/` (Liam extracts the housekeeping tarball before pasting MASTER-BRIEF to Codex):

- `_briefs/assets/030a-multi-supplier-platform-architecture.md`
- `_briefs/assets/030a-system-authoring-process.md`
- `_briefs/assets/030a-MASTER-BRIEF.md`
- `_briefs/assets/028-pre-release-pr-descriptions/` (4 files)
- `_briefs/assets/028-production-cutover-runbook.md`

Step 0 of execution:
1. Copy the architecture docs and MASTER-BRIEF to their destinations
2. Copy the entire `028-pre-release-pr-descriptions/` directory to `_briefs/03-paused/pre-release-pr-descriptions/`
3. Copy the production cutover runbook to `_briefs/03-paused/production-cutover-runbook.md`

## INVENTORY.md template

Create `_briefs/INVENTORY.md` with this initial content:

```markdown
# Brief Inventory — quickscreen-colorbond-generator

| # | Title | Status | PR | Notes |
|---|---|---|---|---|
| 028 | Multi-supplier foundation housekeeping | in-progress | — | This brief |
| 032 | Supplier + Archetype + Instance schema | inbox | — | Depends on 028 |
| 033 | Data backfill — Glass Outlet supplier + archetypes + instances + provenance | inbox | — | Depends on 032 |
| 034 | Versioned price books + quote pinning | inbox | — | Depends on 033 |
| 035 | Admin UI — Suppliers + Instances CRUD | inbox | — | Depends on 033 |
| 036 | Admin UI — Products CRUD + bulk CSV/Cin7 import | inbox | — | Depends on 035 |
| 037 | Admin UI — Rule authoring (template + data) | inbox | — | Depends on 036 |
| 038 | Workbook regression upload + diff | inbox | — | Depends on 037 |
| 039 | User-scoped authoring + RLS | inbox | — | Depends on 035 |
| 040 | Community publication path | inbox | — | Depends on 038 + 039 |
| 041 | Quality reports + demotion automation | inbox | — | Depends on 040 |
| 042 | Discount Fencing — supplier + system instances (6 instances incl. aluminium slat gate) | inbox | — | Depends on 033 |
| 043 | Discount Fencing — seed data + price book v1 (3 seeded instances: timber, aluminium pool, slat gate) | inbox | — | Depends on 042 + 034 |
| 044 | Platform org + visibility layer (Layer 5) | inbox | — | Depends on 043 |
| 045 | Amazing Fencing — supplier + system instances (6 instances: ColorBond, PermaSteel, timber paling, slat screen, chainwire, retaining wall) | inbox | — | Depends on 033 |
| 046 | Amazing Fencing — seed data + PUBLISHED tier2 trade price book (6 instances; ~40 SKUs priced from Cin7 export; ColorBond/PermaSteel/slat/chainwire pricing pending) | inbox | — | Depends on 045 + 034 |

## Pre-release Codex branches (not in the brief queue)

| Branch | Commit | Status |
|---|---|---|
| `codex/brief-031-run-section-gate-ui-consistency` | dec7b59 | Awaiting PR from Liam |
| `codex/glass-outlet-calculator-rollout-setup` | 4b2d70a | Superseded by brief 028 (architecture docs now land via this brief) |
| `codex/qsg-sliding-gates-calculator` | 7c955a2 | Awaiting PR + workbook regression |

See `_briefs/03-paused/PRE-RELEASE-CODEX-BRANCHES.md` for the review plan.

## Stop points encountered

(empty)
```

## PRE-RELEASE-CODEX-BRANCHES.md template

Create `_briefs/03-paused/PRE-RELEASE-CODEX-BRANCHES.md` with this content:

```markdown
# Pre-release Codex branches awaiting human review

Three branches were committed by Codex agents before the brief queue stabilised. They are stacked (each one was started from the previous one, not from `main`) and so cannot all be merged independently.

## codex/brief-031-run-section-gate-ui-consistency (dec7b59)

ColorBond components + UI consistency. 22 files. Earliest in the stack.

**Recommended action:** Liam opens a PR with base `main`, reviews, and merges. This unblocks the rest of the stack.

## codex/glass-outlet-calculator-rollout-setup (4b2d70a)

Was originally going to add `docs/multi-supplier-platform-architecture.md`, `docs/glass-outlet-range-rollout.md`, and update `app-overview.md` + `tasks.md`. **Superseded:** brief 028 now lands the architecture docs directly to `main`. This branch can be cherry-picked for the `glass-outlet-range-rollout.md` and the `app-overview.md` updates, or closed without merging.

**Recommended action:** Cherry-pick the non-architecture-doc files into a small follow-up PR, then close this branch without merging.

## codex/qsg-sliding-gates-calculator (7c955a2)

QSG sliding gate calculator: extends `qs_gate.json` with the full sliding gate variant (7 new variables, 58 sliding rules, 47 selectors, 5 validations), small `bom-calculator/lib.ts` typing fix, minor UI changes in `GateSegmentDetails.tsx`.

**Workbook regression required:** `Order-Form+QSG+Sliding+Gates~V2-T1.xlsx` against 3-5 representative sliding-gate configs. Until this passes, the PR should NOT merge.

**Recommended action:** Once brief 031 lands (so the stack base is on `main`), open a PR for this branch. Run workbook regression. Merge only after regression passes line-by-line on at least 3 configs.

## Common gotchas

- The QSG branch builds on the rollout-setup branch, which builds on the brief-031 branch. Rebase order matters.
- Codex's earlier "PR link: open on GitHub" message was inaccurate — the PRs were never actually opened. Verify in the GitHub UI.
- Run `npm run seed:products` after merging anything that touches seed JSON.

This file moves out of `03-paused/` once all three branches are merged or closed.
```

## Tests

No code changes; no new tests. CI must still pass:

- `npm run typecheck` — green (unchanged code)
- `npm run test` — green (including `localBomCalculator.test.ts` unchanged)
- `npm run build` — green
- Deno integration job — skip (known red)

## CI checks expected to pass

- typecheck ✓
- unit tests ✓
- build ✓
- deploy preview matches `main` visually (intentional — no UI changes)

## PR description template

```markdown
## Brief 028 — Multi-Supplier Foundation Housekeeping

Lays down the orchestration foundation for the multi-supplier brief queue (briefs 032-043).

### What's in this PR

- Lands `docs/multi-supplier-platform-architecture.md` (the 5-layer model — canonical architecture reference)
- Lands `docs/system-authoring-process.md` (the three-tier identity model + authoring workflow + trust tiers)
- Lands `_briefs/MASTER-BRIEF.md` (the orchestration prompt Liam pastes to Codex)
- Lands `_briefs/INVENTORY.md` (status table)
- Removes stale briefs `022-bottom-nav-save-button.md` and `023-app-icon-swap.md` from `_briefs/00-inbox/` (merged in the original repo; leftovers from the 2026-05-26 fork)
- Documents the three unmerged stacked Codex branches in `_briefs/03-paused/PRE-RELEASE-CODEX-BRANCHES.md`

### What's NOT in this PR (by design)

- No code changes
- No schema changes
- No changes to the three unmerged Codex branches (separate human review)
- No changes to `localBomCalculator.ts`, `canonicalAdapter.ts`, or `canvasEngine.ts`

### Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes including `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run build` passes
- [ ] No visible changes in the deploy preview
- [ ] PR base branch is `main` (NOT `master`)
```

## Stop points

If the housekeeping tarball's `_briefs/assets/` doesn't contain the three architecture / master-brief files, **STOP** — you can't fabricate them. Surface and ask Liam to re-upload.

If `docs/multi-supplier-platform-architecture.md` or `docs/system-authoring-process.md` already exist on `main` (someone landed them via another path), prefer the version in `_briefs/assets/` — it's the current canonical version per the 2026-05-27 design.

## After this PR merges

The brief queue is unblocked. Brief 032 can now reference `docs/multi-supplier-platform-architecture.md` and `docs/system-authoring-process.md` and find them.

Recommended order from here:
- Open PRs for the three pre-release Codex branches (per `PRE-RELEASE-CODEX-BRANCHES.md`)
- Then re-paste MASTER-BRIEF to pick up brief 032

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/032-supplier-archetype-instance-schema.md -->

# Brief 032 — Supplier + Archetype + Instance Schema (schema only)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main` (NOT `master`)
**Depends on:** brief 028 merged (architecture docs + MASTER-BRIEF + INVENTORY on `main`)
**Estimated PR size:** medium (one schema migration + types + Zod validators + read-only query helpers; no UI; no calculator runtime change)
**Primary reference:** `docs/system-authoring-process.md` (Section 5 "Schema Additions") and `docs/multi-supplier-platform-architecture.md` (Layer 2 — Catalogue)

> **This brief supersedes** the obsoleted `_briefs/asset-archive/030-catalogue-model.md` draft from the architecture phase (which proposed a conflicting new `products` table; migrations 030 and 031 are already used in this repo). This brief uses migration **032** and **extends** the existing v3 catalogue tables rather than replacing them.

---

## Goal

Add the three-tier identity tables (`suppliers`, `system_archetypes`, `system_instances`) plus support tables (`system_instance_grants`, `system_instance_reports`). Add nullable provenance columns on the existing v3 catalogue tables (`products`, `product_components`, `product_variables`, `product_rules`, `product_component_selectors`, `product_companion_rules`, `pricing_rules`) so every entity can be tagged with which supplier, system archetype, and system instance it belongs to.

**This is a pure schema brief.** No UI changes. No calculator changes. No behaviour changes in production. Existing Glass Outlet seed JSON continues to deploy correctly via `npm run seed:products`. The deploy preview should look identical to `main`.

After this lands, **brief 033** backfills Glass Outlet supplier + the 12 archetype rows + system_instance rows for existing seed files + provenance on all existing rows.

## Verified preconditions (already confirmed in repo, do not re-derive)

- **Admin check pattern (canonical):** `(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'` — established in migration 025_admin_rls.sql.
- **Org lookup pattern (canonical):** `public.user_org_id()` SECURITY DEFINER function — established in migration 002_create_profiles.sql. **Use this, do NOT define a new `auth_org_id()` helper.**
- **`profiles.role` column type:** declared TEXT in 002 with check `('owner', 'admin', 'member')`; migration 019 added a `user_role` enum but its `ADD COLUMN IF NOT EXISTS` is a no-op on the already-existing column. The column stays TEXT. The `= 'admin'` comparison works either way.
- **UUID generation:** `gen_random_uuid()` from `pgcrypto` is in use across existing migrations (e.g. 003, 008). The extension is enabled.
- **Updated-at trigger:** `public.touch_updated_at()` already exists from migration 008. **Reuse it exactly — do NOT redefine; do NOT alias as `set_updated_at`.**
- **`products` already has RLS:** migration 010 enabled `products_select_own_org` on `org_id = public.user_org_id()`. This brief adds nullable columns; it does not change products' existing RLS.
- **`pricing_rules` shape (after migration 008):** columns are `id, org_id, component_id (FK → product_components.id), tier_code, rule (math.js expression), price NUMERIC(10,2), priority, active, valid_from, valid_to, updated_at`. **There is NO `sku` column** — SKU is accessed via the `pricing_rules_with_sku` VIEW. Brief 032 only ADDs nullable `supplier_id` and `system_instance_id`; the existing columns stay.
- **`product_variables` shape (after migration 012):** columns are `id, org_id, product_id, name, label, data_type, unit, required, default_value_json, options_json, scope, sort_order, active`. **Note `name` not `variable_key`; `default_value_json`/`options_json` not `variable_value`.** Brief 033 must use these column names.

## Hard rules

- **`src/lib/localBomCalculator.ts` must NOT be modified.** Test suite (`localBomCalculator.test.ts`) must pass UNCHANGED.
- **`canonicalAdapter.ts` public function signatures must not be modified.**
- **`canvasEngine.ts` public types must not be modified.**
- **Do NOT create a new `products` table.** The existing one stays; we ADD nullable columns to it.
- **Do NOT touch `pricing_rules` data** — only ADD nullable `supplier_id` and `system_instance_id` columns.
- **Do NOT touch `package.json`** unless strictly necessary.
- **PR base branch is `main`** (NOT `master`). Verify before opening.
- **Skip the Deno integration job** — known red on XP-BTP-B fixture, pre-existing.
- **Draft PR only.** Human review gate.
- After merge: brief 033 must run before any code reads from the new tables in earnest. Brief 032 alone is safe to deploy — new columns are nullable, new tables are empty but valid.

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/032_supplier_archetype_instance_schema.sql` | NEW — schema migration |
| `src/types/multiSupplier.ts` | NEW — TypeScript types |
| `src/lib/multiSupplier/schemas.ts` | NEW — Zod runtime schemas |
| `src/lib/multiSupplier/queries.ts` | NEW — read-only query helpers |
| `src/lib/multiSupplier/index.ts` | NEW — public export surface |
| `src/lib/multiSupplier/__tests__/schemas.test.ts` | NEW — smoke tests |
| `docs/app-overview.md` | UPDATE — append `multiSupplier` module to the file map |

**Explicitly NOT touched:**

- `src/lib/localBomCalculator.ts`
- `src/lib/localBomCalculator.test.ts`
- `src/components/canvas/canvasEngine.ts`
- `src/components/canvas/canonicalAdapter.ts`
- `src/pages/CalculatorV3Page.tsx`
- Any other UI component
- Any existing seed JSON (`supabase/seeds/glass-outlet/products/*.json`)
- Any existing migration file
- `supabase/functions/bom-calculator/`

## Migration SQL

Create `supabase/migrations/032_supplier_archetype_instance_schema.sql`:

```sql
-- ============================================================================
-- 032_supplier_archetype_instance_schema.sql
--
-- Adds the three-tier identity model (supplier / archetype / instance) for the
-- multi-supplier platform rollout. See docs/system-authoring-process.md for the
-- full design. Reuses existing patterns:
--   - admin check: (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
--   - org lookup:  public.user_org_id()  (from migration 002)
--   - updated_at trigger: public.set_updated_at()  (from migration 008)
--   - UUID generation: gen_random_uuid()  (pgcrypto already enabled)
-- ============================================================================

-- ─── Suppliers ──────────────────────────────────────────────────────────────
-- Lightweight, growable. Can be platform-owned, verified-supplier-owned, or
-- user-created. Carried on every catalogue entity.
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  logo_url      TEXT,
  brand_colour  TEXT,
  contact_email TEXT,
  trust_tier    TEXT NOT NULL DEFAULT 'user'
                CHECK (trust_tier IN ('platform','verified','community','user')),
  authored_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  org_id        UUID REFERENCES organisations(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','hidden','draft','discontinued')),
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_slug ON suppliers(slug);
CREATE INDEX idx_suppliers_trust_tier ON suppliers(trust_tier);
CREATE INDEX idx_suppliers_org ON suppliers(org_id) WHERE org_id IS NOT NULL;

-- ─── System archetypes ──────────────────────────────────────────────────────
-- Abstract patterns shared across suppliers (slat-fence, panel-fence, etc.).
-- Controlled vocabulary. Admin-managed.
CREATE TABLE system_archetypes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  family             TEXT NOT NULL
                     CHECK (family IN ('fence','gate','pool-fence','balustrade','screen','enclosure','shower','other')),
  geometry_module    TEXT NOT NULL,  -- name of the canvas geometry adapter, e.g. 'fence_runs_v1'
  variable_schema    JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule_template_ids  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  description        TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','hidden','draft')),
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_archetypes_family ON system_archetypes(family);
CREATE INDEX idx_archetypes_status ON system_archetypes(status);

-- ─── System instances ───────────────────────────────────────────────────────
-- supplier × archetype + supplier-specific config. What users actually pick
-- in the calculator picker.
CREATE TABLE system_instances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id      UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  archetype_id    UUID NOT NULL REFERENCES system_archetypes(id) ON DELETE RESTRICT,
  slug             TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','active','hidden','discontinued')),
  readiness_status TEXT NOT NULL DEFAULT 'draft'
                   CHECK (readiness_status IN ('draft','imported','calculator_ready','price_checked','spreadsheet_tested','approved')),
  trust_tier       TEXT NOT NULL DEFAULT 'user'
                   CHECK (trust_tier IN ('platform','verified','community','user')),
  visibility       TEXT NOT NULL DEFAULT 'private'
                   CHECK (visibility IN ('private','org_shared','public')),
  authored_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  org_id           UUID REFERENCES organisations(id) ON DELETE SET NULL,
  approved_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  readiness_notes  TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, slug)
);

CREATE INDEX idx_system_instances_supplier   ON system_instances(supplier_id);
CREATE INDEX idx_system_instances_archetype  ON system_instances(archetype_id);
CREATE INDEX idx_system_instances_status     ON system_instances(status);
CREATE INDEX idx_system_instances_visibility ON system_instances(visibility);
CREATE INDEX idx_system_instances_readiness  ON system_instances(readiness_status);
CREATE INDEX idx_system_instances_authored   ON system_instances(authored_by) WHERE authored_by IS NOT NULL;
CREATE INDEX idx_system_instances_org        ON system_instances(org_id) WHERE org_id IS NOT NULL;

-- ─── System instance grants (B2B sharing) ──────────────────────────────────
-- Lets an admin grant a specific system_instance to another org.
CREATE TABLE system_instance_grants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_instance_id UUID NOT NULL REFERENCES system_instances(id) ON DELETE CASCADE,
  org_id             UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  granted_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  granted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (system_instance_id, org_id)
);

CREATE INDEX idx_instance_grants_instance ON system_instance_grants(system_instance_id);
CREATE INDEX idx_instance_grants_org      ON system_instance_grants(org_id);

-- ─── System instance reports (community moderation) ────────────────────────
-- Quality reports on community-tier content. Used by brief 041 for demotion.
CREATE TABLE system_instance_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_instance_id UUID NOT NULL REFERENCES system_instances(id) ON DELETE CASCADE,
  reported_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason             TEXT NOT NULL,
  details            TEXT,
  status             TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','reviewing','resolved','dismissed')),
  resolved_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at        TIMESTAMPTZ,
  resolution_note    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instance_reports_instance ON system_instance_reports(system_instance_id);
CREATE INDEX idx_instance_reports_status   ON system_instance_reports(status);

-- ─── Provenance columns on existing v3 catalogue tables ────────────────────
-- ALL new columns nullable initially. Brief 033 backfills them.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_id        UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS authored_by        UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_supplier
  ON products(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_system_instance
  ON products(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE product_components
  ADD COLUMN IF NOT EXISTS supplier_id        UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_components_supplier
  ON product_components(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_components_system_instance
  ON product_components(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE product_variables
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_variables_system_instance
  ON product_variables(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE product_rules
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_rules_system_instance
  ON product_rules(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE product_component_selectors
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_component_selectors_system_instance
  ON product_component_selectors(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE product_companion_rules
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_companion_rules_system_instance
  ON product_companion_rules(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE pricing_rules
  ADD COLUMN IF NOT EXISTS supplier_id        UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_rules_supplier
  ON pricing_rules(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_rules_system_instance
  ON pricing_rules(system_instance_id) WHERE system_instance_id IS NOT NULL;

-- ─── updated_at triggers ────────────────────────────────────────────────────
-- public.touch_updated_at() already exists from migration 008. Reuse exactly.
CREATE TRIGGER trigger_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trigger_system_archetypes_updated_at
  BEFORE UPDATE ON system_archetypes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trigger_system_instances_updated_at
  BEFORE UPDATE ON system_instances
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_archetypes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_instances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_instance_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_instance_reports ENABLE ROW LEVEL SECURITY;

-- Suppliers: platform + verified + community visible to everyone; user-tier
-- visible only to author or same org. Admin can do anything.
CREATE POLICY "suppliers_read" ON suppliers FOR SELECT TO authenticated
  USING (
    trust_tier IN ('platform','verified','community')
    OR authored_by = auth.uid()
    OR org_id = public.user_org_id()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (authored_by IS NULL OR authored_by = auth.uid())
  );

CREATE POLICY "suppliers_update_author" ON suppliers FOR UPDATE TO authenticated
  USING (authored_by = auth.uid())
  WITH CHECK (authored_by = auth.uid());

CREATE POLICY "suppliers_update_admin" ON suppliers FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "suppliers_delete_admin" ON suppliers FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON suppliers TO authenticated;

-- Archetypes: controlled vocab. Read open to all authenticated; write admin-only.
CREATE POLICY "archetypes_read" ON system_archetypes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "archetypes_insert_admin" ON system_archetypes FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "archetypes_update_admin" ON system_archetypes FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "archetypes_delete_admin" ON system_archetypes FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON system_archetypes TO authenticated;

-- System instances: visibility-aware read; author or admin write.
CREATE POLICY "system_instances_read" ON system_instances FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR (visibility = 'org_shared' AND id IN (
        SELECT system_instance_id FROM system_instance_grants WHERE org_id = public.user_org_id()
    ))
    OR org_id = public.user_org_id()
    OR authored_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "system_instances_insert" ON system_instances FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (authored_by IS NULL OR authored_by = auth.uid())
  );

CREATE POLICY "system_instances_update_author" ON system_instances FOR UPDATE TO authenticated
  USING (authored_by = auth.uid())
  WITH CHECK (authored_by = auth.uid());

CREATE POLICY "system_instances_update_admin" ON system_instances FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "system_instances_delete_admin" ON system_instances FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON system_instances TO authenticated;

-- Grants: read by org members or admin; write admin-only.
CREATE POLICY "instance_grants_read" ON system_instance_grants FOR SELECT TO authenticated
  USING (
    org_id = public.user_org_id()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "instance_grants_write_admin" ON system_instance_grants FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON system_instance_grants TO authenticated;

-- Reports: reporter sees own; admin sees all; any authenticated can file.
CREATE POLICY "instance_reports_read" ON system_instance_reports FOR SELECT TO authenticated
  USING (
    reported_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "instance_reports_insert" ON system_instance_reports FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (reported_by IS NULL OR reported_by = auth.uid())
  );

CREATE POLICY "instance_reports_update_admin" ON system_instance_reports FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE ON system_instance_reports TO authenticated;
```

## TypeScript types

Create `src/types/multiSupplier.ts`:

```typescript
export type TrustTier = 'platform' | 'verified' | 'community' | 'user';
export type EntityStatus = 'active' | 'hidden' | 'draft' | 'discontinued';
export type ReadinessStatus =
  | 'draft' | 'imported' | 'calculator_ready'
  | 'price_checked' | 'spreadsheet_tested' | 'approved';
export type Visibility = 'private' | 'org_shared' | 'public';
export type ArchetypeFamily =
  | 'fence' | 'gate' | 'pool-fence' | 'balustrade'
  | 'screen' | 'enclosure' | 'shower' | 'other';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface Supplier {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  brandColour?: string;
  contactEmail?: string;
  trustTier: TrustTier;
  authoredBy?: string;
  orgId?: string;
  status: EntityStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SystemArchetype {
  id: string;
  slug: string;
  name: string;
  family: ArchetypeFamily;
  geometryModule: string;
  variableSchema: Record<string, unknown>;
  ruleTemplateIds: string[];
  description?: string;
  status: 'active' | 'hidden' | 'draft';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SystemInstance {
  id: string;
  supplierId: string;
  archetypeId: string;
  slug: string;
  name: string;
  description?: string;
  status: EntityStatus;
  readinessStatus: ReadinessStatus;
  trustTier: TrustTier;
  visibility: Visibility;
  authoredBy?: string;
  orgId?: string;
  approvedBy?: string;
  approvedAt?: string;
  readinessNotes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SystemInstanceGrant {
  id: string;
  systemInstanceId: string;
  orgId: string;
  grantedBy?: string;
  grantedAt: string;
}

export interface SystemInstanceReport {
  id: string;
  systemInstanceId: string;
  reportedBy?: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
}
```

## Zod schemas

Create `src/lib/multiSupplier/schemas.ts`:

```typescript
import { z } from 'zod';

export const trustTierSchema = z.enum(['platform', 'verified', 'community', 'user']);
export const entityStatusSchema = z.enum(['active', 'hidden', 'draft', 'discontinued']);
export const readinessStatusSchema = z.enum([
  'draft','imported','calculator_ready','price_checked','spreadsheet_tested','approved',
]);
export const visibilitySchema = z.enum(['private', 'org_shared', 'public']);
export const archetypeFamilySchema = z.enum([
  'fence','gate','pool-fence','balustrade','screen','enclosure','shower','other',
]);
export const reportStatusSchema = z.enum(['open', 'reviewing', 'resolved', 'dismissed']);

export const supplierSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.string().url().optional(),
  brandColour: z.string().optional(),
  contactEmail: z.string().email().optional(),
  trustTier: trustTierSchema,
  authoredBy: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  status: entityStatusSchema,
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const systemArchetypeSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  family: archetypeFamilySchema,
  geometryModule: z.string().min(1),
  variableSchema: z.record(z.unknown()),
  ruleTemplateIds: z.array(z.string()),
  description: z.string().optional(),
  status: z.enum(['active', 'hidden', 'draft']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const systemInstanceSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  archetypeId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: entityStatusSchema,
  readinessStatus: readinessStatusSchema,
  trustTier: trustTierSchema,
  visibility: visibilitySchema,
  authoredBy: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.string().optional(),
  readinessNotes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

## Query helpers

Create `src/lib/multiSupplier/queries.ts`:

```typescript
import { supabase } from '@/lib/supabaseClient'; // adjust to repo's actual import path
import type { Supplier, SystemArchetype, SystemInstance } from '@/types/multiSupplier';

// All queries below are read-only. Writes happen via the admin UI in brief 035+.

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers').select('*').eq('status', 'active').order('name');
  if (error) throw error;
  return (data ?? []).map(rowToSupplier);
}

export async function getSupplierBySlug(slug: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? rowToSupplier(data) : null;
}

export async function listArchetypes(): Promise<SystemArchetype[]> {
  const { data, error } = await supabase
    .from('system_archetypes').select('*').eq('status', 'active').order('family').order('name');
  if (error) throw error;
  return (data ?? []).map(rowToArchetype);
}

export async function listSystemInstances(opts: {
  supplierId?: string;
  archetypeId?: string;
  status?: 'active' | 'hidden' | 'draft' | 'discontinued';
} = {}): Promise<SystemInstance[]> {
  let q = supabase.from('system_instances').select('*');
  if (opts.supplierId) q = q.eq('supplier_id', opts.supplierId);
  if (opts.archetypeId) q = q.eq('archetype_id', opts.archetypeId);
  if (opts.status) q = q.eq('status', opts.status);
  q = q.order('name');
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToSystemInstance);
}

function rowToSupplier(row: any): Supplier {
  return {
    id: row.id, slug: row.slug, name: row.name,
    logoUrl: row.logo_url ?? undefined,
    brandColour: row.brand_colour ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    trustTier: row.trust_tier,
    authoredBy: row.authored_by ?? undefined,
    orgId: row.org_id ?? undefined,
    status: row.status, metadata: row.metadata ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function rowToArchetype(row: any): SystemArchetype {
  return {
    id: row.id, slug: row.slug, name: row.name, family: row.family,
    geometryModule: row.geometry_module,
    variableSchema: row.variable_schema ?? {},
    ruleTemplateIds: row.rule_template_ids ?? [],
    description: row.description ?? undefined,
    status: row.status, metadata: row.metadata ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function rowToSystemInstance(row: any): SystemInstance {
  return {
    id: row.id, supplierId: row.supplier_id, archetypeId: row.archetype_id,
    slug: row.slug, name: row.name,
    description: row.description ?? undefined,
    status: row.status, readinessStatus: row.readiness_status,
    trustTier: row.trust_tier, visibility: row.visibility,
    authoredBy: row.authored_by ?? undefined,
    orgId: row.org_id ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    readinessNotes: row.readiness_notes ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
```

> **Note:** Verify the supabase client import path. The current repo uses `@/lib/supabaseClient` (`supabaseClient.ts` exporting `supabase`). If that has changed, align.

## Public exports

Create `src/lib/multiSupplier/index.ts`:

```typescript
export * from './queries';
export * as multiSupplierSchemas from './schemas';
```

## Tests

Create `src/lib/multiSupplier/__tests__/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  supplierSchema, systemArchetypeSchema, systemInstanceSchema,
  trustTierSchema, readinessStatusSchema, archetypeFamilySchema,
} from '../schemas';

describe('multiSupplier schemas', () => {
  const now = new Date().toISOString();
  const u = '11111111-1111-1111-1111-111111111111';

  it('parses a valid supplier row', () => {
    const ok = supplierSchema.safeParse({
      id: u, slug: 'glass-outlet', name: 'Glass Outlet',
      trustTier: 'platform', status: 'active', createdAt: now, updatedAt: now,
    });
    expect(ok.success).toBe(true);
  });

  it('rejects an invalid trust_tier', () => {
    expect(trustTierSchema.safeParse('founder').success).toBe(false);
  });

  it('rejects an invalid readiness_status', () => {
    expect(readinessStatusSchema.safeParse('shipping').success).toBe(false);
  });

  it('parses each archetype family', () => {
    const families = ['fence','gate','pool-fence','balustrade','screen','enclosure','shower','other'];
    for (const f of families) expect(archetypeFamilySchema.safeParse(f).success).toBe(true);
    expect(archetypeFamilySchema.safeParse('roof').success).toBe(false);
  });

  it('parses a valid system_archetype row', () => {
    const ok = systemArchetypeSchema.safeParse({
      id: u, slug: 'slat-fence', name: 'Slat Fence', family: 'fence',
      geometryModule: 'fence_runs_v1', variableSchema: {},
      ruleTemplateIds: ['slat_counting_v1'], status: 'active',
      createdAt: now, updatedAt: now,
    });
    expect(ok.success).toBe(true);
  });

  it('parses a valid system_instance row', () => {
    const ok = systemInstanceSchema.safeParse({
      id: u, supplierId: u, archetypeId: u, slug: 'qshs',
      name: 'QuickScreen Horizontal Slat', status: 'active',
      readinessStatus: 'approved', trustTier: 'platform', visibility: 'public',
      createdAt: now, updatedAt: now,
    });
    expect(ok.success).toBe(true);
  });
});
```

**Critical:** `localBomCalculator.test.ts` must continue to pass UNCHANGED.

## CI checks expected to pass

- `npm run typecheck` — green
- `npm run test` — green (`localBomCalculator.test.ts` UNCHANGED)
- `npm run build` — green
- Migration applies cleanly to a fresh Supabase instance
- Deno integration job — skip (known red)

## PR description template

```markdown
## Brief 032 — Supplier + Archetype + Instance Schema (schema only)

Implements the three-tier identity model (supplier / archetype / instance) defined in `docs/system-authoring-process.md` Section 2. Pure schema brief — no UI changes, no calculator changes, no behaviour changes in production.

### What's in this PR

- Migration `032_supplier_archetype_instance_schema.sql`:
  - Tables: `suppliers`, `system_archetypes`, `system_instances`, `system_instance_grants`, `system_instance_reports`
  - Nullable provenance columns: `products.{supplier_id, system_instance_id, authored_by}`, `product_components.{supplier_id, system_instance_id}`, `product_variables.system_instance_id`, `product_rules.system_instance_id`, `product_component_selectors.system_instance_id`, `product_companion_rules.system_instance_id`, `pricing_rules.{supplier_id, system_instance_id}`
  - Visibility-aware RLS policies (reuse `public.user_org_id()` and the existing admin-role pattern from migration 025)
- TypeScript types: `src/types/multiSupplier.ts`
- Zod schemas: `src/lib/multiSupplier/schemas.ts`
- Read-only query helpers: `src/lib/multiSupplier/queries.ts`
- Smoke tests: `src/lib/multiSupplier/__tests__/schemas.test.ts`
- Updated `docs/app-overview.md`

### What's NOT in this PR (by design)

- No UI changes
- No calculator behaviour changes
- No data population (brief 033 backfills Glass Outlet + existing system instances + provenance)
- No admin UI (brief 035)
- No modifications to `localBomCalculator.ts`, `canonicalAdapter.ts`, `canvasEngine.ts`, or seed JSON

### Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes including `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run build` passes
- [ ] Migration applies cleanly to a fresh Supabase instance
- [ ] No visible changes in the deploy preview (intentional — schema-only)
- [ ] PR base branch is `main` (NOT `master`)
```

## Stop points

If any of these are encountered, **PAUSE** and surface to Liam:

1. **Supabase client import path mismatch.** Check `src/lib/supabaseClient.ts` (or wherever the existing client lives) for the current export shape before pasting into `queries.ts`.

2. **RLS policy name collisions.** If a policy name in this migration already exists from a prior migration (unlikely — these names are scoped to the new tables), surface and rename.

3. **`public.touch_updated_at()` missing.** It should exist from migration 008 (verified by inspecting the migration via GitHub API). If not, add a guarded `CREATE OR REPLACE FUNCTION` at the top of this migration. **Do NOT use the name `set_updated_at` — the canonical name is `touch_updated_at`.**

4. **`pgcrypto` not enabled.** `gen_random_uuid()` should work because earlier migrations use it. If it errors, add `CREATE EXTENSION IF NOT EXISTS pgcrypto;` at the top.

5. **profiles.role column type confusion.** Migrations 002 (TEXT) and 019 (`user_role` enum, no-op ADD COLUMN) leave this ambiguous in theory. In practice the column is TEXT and the comparison `= 'admin'` works either way. If the deploy fails on RLS check, surface and inspect the actual column type.

## After this PR merges

- **Brief 033** runs immediately: backfill Glass Outlet supplier, the 12 archetype rows, system_instance rows for existing seed files, and provenance on all existing products / components / variables / rules / selectors / companion_rules / pricing_rules.
- **Brief 034** runs after 033: versioned price books + quote pinning (the pricing layer of the 5-layer architecture).
- **Brief 035** runs after 033: admin CRUD UI for suppliers + system_instances.

The platform now has identity, but is not yet usable end-to-end until 033-035 land.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/033-data-backfill-glass-outlet-archetypes-instances.md -->

# Brief 033 — Data backfill: Glass Outlet supplier + archetypes + system instances + provenance

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main` (NOT `master`)
**Depends on:** brief 032 merged (the new tables exist; provenance columns are nullable but present)
**Estimated PR size:** medium (one data migration, no code changes other than seed script touch-up if needed)
**Primary reference:** `docs/system-authoring-process.md` (Appendix A "Initial Archetype Seed") + `docs/multi-supplier-platform-architecture.md`

---

## Goal

Populate the new identity tables and backfill provenance on existing rows so the platform's current Glass Outlet data has supplier + archetype + system_instance tagging. After this lands:

- Every existing product / component / variable / rule / selector / companion_rule / pricing_rule is tagged with `supplier_id = glass-outlet` and the appropriate `system_instance_id`.
- The 12 canonical archetypes (per `system-authoring-process.md` Appendix A) exist as rows.
- 8 system_instance rows exist representing the Glass Outlet seed files (QSHS, VS, XPL, BAYG, ColorBond, QS_GATE swing, QSG sliding, XPSG_GATE).
- Liam's existing calculator continues to work unchanged — no behaviour change, no UI change.

After this lands, **brief 034** adds the versioned-price-books layer and **brief 035** adds the admin CRUD UI.

## Hard rules

- **`src/lib/localBomCalculator.ts` must NOT be modified.** Test suite passes UNCHANGED.
- **Do NOT change existing data values.** Only ADD `supplier_id` / `system_instance_id` references via UPDATE.
- **Do NOT change the seed JSON files in this brief.** They keep their current shape. Mapping to system_instances happens at DB-update time, not at JSON-edit time. (Brief 034+ may evolve the seed shape; not here.)
- **Treat the data migration as idempotent.** Use `ON CONFLICT DO NOTHING` on inserts; use guarded UPDATEs (`WHERE supplier_id IS NULL`).
- **PR base branch is `main`** (NOT `master`).
- **Skip the Deno integration job** — known red on XP-BTP-B fixture, pre-existing.
- **Draft PR only.** Human review gate.
- **After merge:** run `npm run seed:products` to confirm the seed script still works against the augmented schema. Brief 036 will eventually update the seed script to carry supplier_id / system_instance_id on every row it upserts; for now, the seed JSON has no provenance fields and `seed:products` should be unaffected.

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/033_backfill_glass_outlet_supplier_and_instances.sql` | NEW — data migration |
| `docs/system-authoring-process.md` | UPDATE — append a row to the "Decision log" noting backfill date and admin choice (Glass Outlet trust_tier remains `platform` for now; Liam can demote to `verified` later via the admin UI in brief 035) |

**Explicitly NOT touched:**

- `src/lib/localBomCalculator.ts`
- `localBomCalculator.test.ts`
- `canonicalAdapter.ts`, `canvasEngine.ts`
- Any UI file
- Existing migration files
- Existing seed JSON
- `supabase/functions/bom-calculator/`

## Mapping table (seed file → system_instance)

Used in the migration SQL below.

| Seed file | system_type | supplier slug | archetype slug | system_instance slug | system_instance name | trust_tier | readiness_status |
|---|---|---|---|---|---|---|---|
| `qshs.json` | `QSHS` | glass-outlet | slat-fence | qshs | QuickScreen Horizontal Slat | platform | approved |
| `vs.json` | `VS` | glass-outlet | slat-fence | vs | QuickScreen Vertical Slat | platform | approved |
| `xpl.json` | `XPL` | glass-outlet | slat-fence | xpl | XPress Plus | platform | approved |
| `bayg.json` | `BAYG` | glass-outlet | slat-fence | bayg | Buy As You Go | platform | approved |
| `colorbond.json` | `ColorBond` | glass-outlet | panel-fence | go-colorbond | Glass Outlet ColorBond | platform | calculator_ready |
| `qs_gate.json` | `QS_GATE` | glass-outlet | swing-gate | qs-gate | QS Gate (swing + sliding variants) | platform | calculator_ready |
| `xpsg_gate.json` | `XPSG_GATE` | glass-outlet | sliding-gate | xpsg-gate | XP Sliding Gate component catalogue | platform | approved |

ColorBond and QS Gate are at `calculator_ready` (not `approved`) until workbook regression passes (the QSG sliding work from 2026-05-27 is still pending workbook regression).

**Important architectural note (corrected after schema audit):** The existing schema enforces `UNIQUE (org_id, system_type)` on `products` (migration 022). The `qs_gate.json` seed file produces a SINGLE row in `products` with `system_type='QS_GATE'` that internally covers BOTH swing AND sliding gate variants via product_variables + rules (the prior `codex/qsg-sliding-gates-calculator` branch extends `qs_gate.json` for the sliding variant within the same product). We therefore tag it with ONE `system_instance_id = qs-gate` against archetype `swing-gate` (the original). The sliding variant lives WITHIN that instance via existing rule machinery. If we ever want to split into two product rows, that requires schema change to relax the uniqueness — out of scope for this brief.

**Column references (canonical from schema audit):**
- `products.system_type` — TEXT
- `pricing_rules` has NO `sku` column; it joins via `pricing_rules.component_id → product_components.id → product_components.product_id → products.id`
- `product_variables` columns are `name`, `default_value_json`, `options_json` (NOT `variable_key`, `variable_value`)
- All existing rows have `org_id = (the glass-outlet org)`; new `supplier_id` is conceptually different from `org_id` (org = the tenant on the platform; supplier = who makes the product)

## Migration SQL

Create `supabase/migrations/033_backfill_glass_outlet_supplier_and_instances.sql`:

```sql
-- ============================================================================
-- 033_backfill_glass_outlet_supplier_and_instances.sql
--
-- Populates the new identity tables (suppliers, system_archetypes, system_instances)
-- and backfills supplier_id + system_instance_id on existing v3 catalogue rows.
--
-- Idempotent: re-running is a no-op.
-- ============================================================================

-- ─── 1. Suppliers ───────────────────────────────────────────────────────────
INSERT INTO suppliers (slug, name, trust_tier, status, metadata)
VALUES (
  'glass-outlet',
  'Glass Outlet',
  'platform',
  'active',
  '{"description":"The Glass Outlet - aluminium slat fencing, gates, and ColorBond. The original supplier on the platform.","website":"https://glassoutlet.com.au"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. System archetypes (per docs/system-authoring-process.md Appendix A) ──
INSERT INTO system_archetypes (slug, name, family, geometry_module, rule_template_ids, description) VALUES
  ('slat-fence',           'Slat Fence',            'fence',       'fence_runs_v1',   ARRAY['slat_counting_v1','bay_post_v1','rail_cut_v1'],
    'Horizontal or vertical slat-based fence systems.'),
  ('panel-fence',          'Panel Fence',           'fence',       'fence_runs_v1',   ARRAY['panel_per_bay_v1','bay_post_v1'],
    'Steel / aluminium panel systems like ColorBond.'),
  ('mesh-fence',           'Mesh Fence',            'fence',       'fence_runs_v1',   ARRAY['panel_per_bay_v1','bay_post_v1'],
    'Chainwire / weldmesh fencing.'),
  ('timber-fence',         'Timber Fence',          'fence',       'fence_runs_v1',   ARRAY['paling_count_v1','rail_per_bay_v1','bay_post_v1'],
    'Timber paling and lap-and-cap fences.'),
  ('glass-pool-fence',     'Glass Pool Fence',      'pool-fence',  'panel_runs_v1',   ARRAY['glass_panel_v1','spigot_per_panel_v1'],
    'Frameless glass pool fencing with spigots / clamps.'),
  ('aluminium-pool-fence', 'Aluminium Pool Fence',  'pool-fence',  'panel_runs_v1',   ARRAY['panel_per_bay_v1','bay_post_v1'],
    'Aluminium pool fencing — Trojan / flat-top / spear-top style.'),
  ('balustrade',           'Balustrade',            'balustrade',  'balustrade_v1',   ARRAY['panel_per_bay_v1','handrail_v1'],
    'Balcony / staircase balustrade systems.'),
  ('swing-gate',           'Swing Gate',            'gate',        'gate_segment_v1', ARRAY['swing_gate_hardware_v1'],
    'Single / double swing gates.'),
  ('sliding-gate',         'Sliding Gate',          'gate',        'gate_segment_v1', ARRAY['sliding_track_v1','sliding_hardware_v1'],
    'Sliding gates including automated.'),
  ('equipment-enclosure',  'Equipment Enclosure',   'enclosure',   'enclosure_v1',    ARRAY['enclosure_wall_v1','enclosure_door_v1'],
    'CTS-style enclosed equipment housing.'),
  ('screen',               'Privacy Screen',        'screen',      'screen_panel_v1', ARRAY['panel_per_bay_v1'],
    'Privacy / decorative screens.'),
  ('shower',               'Shower Enclosure',      'shower',      'shower_v1',       ARRAY['glass_panel_v1','channel_cut_v1'],
    'Frameless / semi-frameless shower screens.')
ON CONFLICT (slug) DO NOTHING;

-- ─── 3. System instances for existing Glass Outlet seed files ────────────────
WITH go AS (SELECT id FROM suppliers WHERE slug = 'glass-outlet')
INSERT INTO system_instances (supplier_id, archetype_id, slug, name, status, readiness_status, trust_tier, visibility, description) VALUES
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'qshs', 'QuickScreen Horizontal Slat', 'active', 'approved', 'platform', 'public',
    'Glass Outlet flagship horizontal slat fence. 65mm and 90mm slat sizes; multiple gap presets; full colour range.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'vs', 'QuickScreen Vertical Slat', 'active', 'approved', 'platform', 'public',
    'Vertical orientation variant of QuickScreen slat fencing.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'xpl', 'XPress Plus', 'active', 'approved', 'platform', 'public',
    'Friction-fit post system. 1W/2W/90 post types; no side frames; restricted option set.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'bayg', 'Buy As You Go', 'active', 'approved', 'platform', 'public',
    'Per-panel retail model. 3000mm panels; explicit panel_quantity input. Alumawood finish via AW- prefix.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'go-colorbond', 'Glass Outlet ColorBond', 'active', 'calculator_ready', 'platform', 'public',
    'ColorBond steel panel fencing supplied by Glass Outlet. Workbook regression pending.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='swing-gate'),
    'qs-gate', 'QS Gate (swing + sliding variants)', 'active', 'calculator_ready', 'platform', 'public',
    'QuickScreen pedestrian gate. Swing variant is the historical default; sliding variant (QSG Sliding) was added in the 2026-05-27 Codex work and shares the same product row + rule set. Compatible with QSHS / VS / XPL / BAYG. Workbook regression pending against Order-Form+QSG+Sliding+Gates+V2-T1.xlsx.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='sliding-gate'),
    'xpsg-gate', 'XP Sliding Gate components', 'active', 'approved', 'platform', 'public',
    'XPSG sliding gate component catalogue consumed by QS Gate sliding rules.')
ON CONFLICT (supplier_id, slug) DO NOTHING;

-- ─── 4. Backfill provenance on existing rows ────────────────────────────────
-- supplier_id = glass-outlet on every Glass-Outlet-era row.

UPDATE products            SET supplier_id = (SELECT id FROM suppliers WHERE slug='glass-outlet') WHERE supplier_id IS NULL;
UPDATE product_components  SET supplier_id = (SELECT id FROM suppliers WHERE slug='glass-outlet') WHERE supplier_id IS NULL;
UPDATE pricing_rules       SET supplier_id = (SELECT id FROM suppliers WHERE slug='glass-outlet') WHERE supplier_id IS NULL;

-- system_instance_id on products by system_type. UNIQUE(org_id, system_type) per
-- migration 022 means at most one row per (org, system_type) — straightforward 1:1 map.

UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='qshs')         WHERE system_instance_id IS NULL AND system_type = 'QSHS';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='vs')           WHERE system_instance_id IS NULL AND system_type = 'VS';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='xpl')          WHERE system_instance_id IS NULL AND system_type = 'XPL';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='bayg')         WHERE system_instance_id IS NULL AND system_type = 'BAYG';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='go-colorbond') WHERE system_instance_id IS NULL AND system_type = 'ColorBond';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='qs-gate')      WHERE system_instance_id IS NULL AND system_type = 'QS_GATE';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='xpsg-gate')    WHERE system_instance_id IS NULL AND system_type = 'XPSG_GATE';

-- Backfill the related v3-engine tables by joining through to their parent product.

UPDATE product_components pc
   SET system_instance_id = p.system_instance_id
  FROM products p
 WHERE pc.product_id = p.id
   AND pc.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

UPDATE product_variables pv
   SET system_instance_id = p.system_instance_id
  FROM products p
 WHERE pv.product_id = p.id
   AND pv.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

UPDATE product_rules pr
   SET system_instance_id = p.system_instance_id
  FROM products p
 WHERE pr.product_id = p.id
   AND pr.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

UPDATE product_component_selectors pcs
   SET system_instance_id = p.system_instance_id
  FROM products p
 WHERE pcs.product_id = p.id
   AND pcs.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

UPDATE product_companion_rules pcr
   SET system_instance_id = p.system_instance_id
  FROM products p
 WHERE pcr.product_id = p.id
   AND pcr.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

-- pricing_rules joins via pricing_rules.component_id → product_components.id → product_components.product_id → products.system_instance_id.
-- (After migration 008, pricing_rules has NO sku column; component_id is the canonical FK.)
UPDATE pricing_rules pr
   SET system_instance_id = p.system_instance_id
  FROM product_components pc
  JOIN products p ON p.id = pc.product_id
 WHERE pr.component_id = pc.id
   AND pr.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

-- ─── 5. Sanity check: log any rows that didn't get tagged ───────────────────
-- These should be 0. If non-zero, surface to Liam — there's an unmapped system_type
-- or a join column shape that differs from what this brief assumes.

DO $$
DECLARE
  v_unmapped_products INT;
  v_unmapped_components INT;
  v_unmapped_pricing INT;
BEGIN
  SELECT COUNT(*) INTO v_unmapped_products
    FROM products WHERE supplier_id IS NULL OR system_instance_id IS NULL;
  SELECT COUNT(*) INTO v_unmapped_components
    FROM product_components WHERE supplier_id IS NULL OR system_instance_id IS NULL;
  SELECT COUNT(*) INTO v_unmapped_pricing
    FROM pricing_rules WHERE supplier_id IS NULL OR system_instance_id IS NULL;
  RAISE NOTICE 'backfill complete. unmapped: products=%, components=%, pricing_rules=%',
    v_unmapped_products, v_unmapped_components, v_unmapped_pricing;
END $$;
```

> **Note on schema assumptions:** This migration assumes `products.system_type` (text), `product_variables.{product_id, variable_key, variable_value}`, and `pricing_rules.product_sku` exist in the current schema. Verify against `supabase/migrations/008_restructure_schema.sql` and `011_engine_core.sql` before applying. If column names differ, adjust the UPDATE join keys but keep the logic identical.

## CI checks expected to pass

- `npm run typecheck` — green (no code changes)
- `npm run test` — green (`localBomCalculator.test.ts` UNCHANGED)
- `npm run build` — green
- Migration applies cleanly to a Supabase instance that has migration 032 + the existing Glass Outlet seed data
- The migration's `RAISE NOTICE` should show `unmapped: products=0, components=0, pricing_rules=0` on a fully-seeded DB

## PR description template

```markdown
## Brief 033 — Data backfill: Glass Outlet + archetypes + system instances + provenance

Pure data migration. Populates the identity tables introduced in brief 032 and tags every existing Glass Outlet row with supplier + system_instance provenance.

### What's in this PR

- Migration `033_backfill_glass_outlet_supplier_and_instances.sql`:
  - INSERT INTO suppliers — `glass-outlet` row (trust_tier = `platform`)
  - INSERT INTO system_archetypes — the 12 canonical archetypes (per `docs/system-authoring-process.md` Appendix A)
  - INSERT INTO system_instances — 8 Glass Outlet instances (QSHS, VS, XPL, BAYG, go-colorbond, qs-gate-swing, qsg-sliding, xpsg-gate)
  - UPDATE products / product_components / product_variables / product_rules / product_component_selectors / product_companion_rules / pricing_rules — backfill supplier_id + system_instance_id
- Updated `docs/system-authoring-process.md` Decision log

### What's NOT in this PR (by design)

- No schema changes (brief 032 covered those)
- No code changes
- No UI changes
- No seed JSON changes (brief 036 evolves the seed shape)

### Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes including `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run build` passes
- [ ] Migration applies cleanly to a fresh Supabase instance with brief 032 applied
- [ ] `RAISE NOTICE` shows `unmapped: products=0, components=0, pricing_rules=0` on the fully-seeded DB
- [ ] PR base branch is `main` (NOT `master`)
```

## Stop points

If `unmapped > 0` for any table after the migration runs, **STOP** and report which rows weren't tagged. The most likely cause: a `system_type` value in seed JSON that isn't in the mapping table above (e.g. `gate_legacy.json.disabled` was reactivated, or a new seed was added that this brief didn't account for). Surface to Liam — extending the mapping is a one-line change.

If any of the schema assumptions verified in this brief turn out to be different on the actual DB (column names, FK shapes), **STOP** and surface the actual schema. The most safety-critical ones (already audited via GitHub API for this brief):
- `pricing_rules.component_id` (FK → `product_components.id`) — verified
- `product_components.product_id` (FK → `products.id`) — verified (migrations 006 + 008)
- `products.system_type` — verified (migration 005 + 022)
- `pricing_rules` has NO `sku` column — verified (dropped in migration 008)

## After this PR merges

- **Run** `npm run seed:products` to confirm the seed script still works (it should — seed JSON hasn't changed).
- **Brief 034** runs: versioned price books + quote pinning. After 034 lands, every existing pricing_rule has a price_book entry too.
- **Brief 035** runs: admin CRUD UI for suppliers + instances. After 035 lands, Liam can promote/demote suppliers, edit instance metadata, and change readiness_status through the UI.

The platform is now "identity-aware" — every entity carries supplier + system_instance provenance. Visibility and trust-tier policies are enforceable. The next phase is adding the pricing layer (034) and the admin UI surface (035).

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/034-versioned-price-books-and-quote-pinning.md -->

# Brief 034 — Versioned Price Books + Quote Pinning (schema + bom-calculator update)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 033 merged
**Estimated PR size:** medium (one schema migration + a small bom-calculator helper + types + tests)
**Primary reference:** `docs/multi-supplier-platform-architecture.md` Layer 4 — Pricing & Price Books

---

## Goal

Implement Layer 4 of the architecture: **versioned price books with quote pinning.** Today, `pricing_rules` is flat and there's no version history. After this brief, every supplier can have a series of price books (draft → reviewed → published → archived), and every saved quote remembers which published book it priced against.

**Why this matters:** without this, when a supplier updates their pricing, every old quote silently re-prices. That destroys margin accountability and breaks the "real margin before you send" thesis.

After this lands, **brief 035** adds the admin UI for managing price books, and **brief 036** adds CSV/Cin7 bulk-import staging.

## Hard rules

- **`localBomCalculator.ts` must NOT change.** It's the offline path; it reads from seed JSON and is not pricing-aware in the production sense. The server-side `bom-calculator` edge function gets the pricing-resolution helper.
- **`localBomCalculator.test.ts` passes UNCHANGED.**
- **Existing `pricing_rules` rows continue to work.** This brief introduces price_books / price_book_items in parallel; the resolver prefers the new path but falls back to `pricing_rules` if no published book matches.
- **Do NOT touch the seed JSON files.** Brief 036 evolves seed shape; this brief is schema + resolver only.
- **PR base branch is `main`.**
- **Skip Deno integration job.**
- **Draft PR only.**

## Verified preconditions (audited via GitHub API for this brief)

- **`pricing_rules` shape (after migration 008):** `id, org_id, component_id (FK → product_components.id), tier_code, rule (math.js), price NUMERIC(10,2), priority, active, valid_from, valid_to, updated_at`. **No `sku` column.** SKU is accessed via the `pricing_rules_with_sku` VIEW (defined in migration 008).
- **`product_components.sku`** is the canonical SKU surface — joined to via `component_id`.
- **`pricing_rules.price` is NUMERIC dollars**, not cents. New tables in this brief use `price_cents INTEGER` for the new path; the resolver translates `NUMERIC * 100 → cents` for the legacy fallback.
- **`public.touch_updated_at()`** is the canonical updated_at trigger function (migration 008). Do NOT redefine.

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/034_versioned_price_books.sql` | NEW — schema migration |
| `supabase/functions/bom-calculator/lib.ts` | UPDATE — **one-shot migration**: every existing pricing lookup is replaced with a call to `resolvePriceCents()` which wraps `public.resolve_price_cents()` (the SQL function). No parallel pricing paths after this PR. |
| `supabase/functions/bom-calculator/__tests__/pricing.test.ts` | NEW — Deno tests for the resolver (mocked DB rows) |
| `supabase/functions/bom-calculator/__tests__/regression.test.ts` | NEW — diff existing edge function output against the new path on a known Glass Outlet fixture (tier1) to confirm zero behavioural change for the no-price-book case |
| `src/types/pricing.ts` | NEW — TypeScript types for PriceBook + PriceBookItem |
| `src/lib/pricing/schemas.ts` | NEW — Zod validators |
| `src/lib/pricing/queries.ts` | NEW — read-only client queries (list published books for a supplier, get item for SKU+tier+qty) |
| `src/lib/pricing/__tests__/schemas.test.ts` | NEW — smoke tests |
| `docs/multi-supplier-platform-architecture.md` | UPDATE — Decision log row for "Brief 034 ships Layer 4; edge function migrated one-shot" |

**Explicitly NOT touched:** `localBomCalculator.ts`, canonical adapter, canvas engine, calculator UI, seed JSON, quotes table data.

## Trade pricing tier convention (committed in this brief)

Adopted as platform-wide convention (matches the existing Glass Outlet `pricing_rules` data):

- **`tier1`** = list / public retail / RRP (factor 1.0 from sticker)
- **`tier2`** = trade / reseller (Glass Outlet factor 0.86)
- **`tier3`** = volume / bulk (Glass Outlet factor 0.74)

When a supplier's price book is uploaded, `tier1` is the assumed default unless the source file explicitly indicates a discount tier. Discount Fencing's public retail prices (brief 043) seed as `tier1`. Their trade pricing PDF (when supplied) will seed as `tier2`. Verified suppliers can self-publish multiple tiers in one book.

## Migration SQL

```sql
-- ============================================================================
-- 034_versioned_price_books.sql
-- ============================================================================

-- ─── Price books (a versioned snapshot of pricing for a supplier) ──────────
CREATE TABLE price_books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  source_file     TEXT,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','reviewed','published','archived')),
  published_at    TIMESTAMPTZ,
  published_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  authored_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_books_supplier ON price_books(supplier_id);
CREATE INDEX idx_price_books_status   ON price_books(status);
CREATE INDEX idx_price_books_active   ON price_books(supplier_id, status, effective_from)
  WHERE status = 'published';

-- ─── Price book items (per-SKU per-tier per-qty-break) ─────────────────────
CREATE TABLE price_book_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_book_id  UUID NOT NULL REFERENCES price_books(id) ON DELETE CASCADE,
  sku            TEXT NOT NULL,
  tier_code      TEXT NOT NULL DEFAULT 'tier1',
  min_quantity   INTEGER NOT NULL DEFAULT 1,
  price_cents    INTEGER NOT NULL CHECK (price_cents >= 0),
  currency       TEXT NOT NULL DEFAULT 'AUD',
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (price_book_id, sku, tier_code, min_quantity)
);

CREATE INDEX idx_price_book_items_book ON price_book_items(price_book_id);
CREATE INDEX idx_price_book_items_lookup
  ON price_book_items(price_book_id, sku, tier_code, min_quantity DESC);

-- ─── Quote pinning ──────────────────────────────────────────────────────────
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS price_book_version_id UUID REFERENCES price_books(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_price_book_version
  ON quotes(price_book_version_id) WHERE price_book_version_id IS NOT NULL;

-- ─── Updated_at trigger ─────────────────────────────────────────────────────
CREATE TRIGGER trigger_price_books_updated_at
  BEFORE UPDATE ON price_books
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE price_books      ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_book_items ENABLE ROW LEVEL SECURITY;

-- price_books: read published books for any supplier the user can see; read all books
-- for own org; admin reads everything.
CREATE POLICY "price_books_read_published" ON price_books FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR authored_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "price_books_insert" ON price_books FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (authored_by IS NULL OR authored_by = auth.uid())
  );

CREATE POLICY "price_books_update_author" ON price_books FOR UPDATE TO authenticated
  USING (authored_by = auth.uid() AND status IN ('draft','reviewed'))
  WITH CHECK (authored_by = auth.uid());

CREATE POLICY "price_books_update_admin" ON price_books FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "price_books_delete_admin" ON price_books FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON price_books TO authenticated;

-- price_book_items: read follows the parent book; admin writes only.
CREATE POLICY "price_book_items_read" ON price_book_items FOR SELECT TO authenticated
  USING (
    price_book_id IN (
      SELECT id FROM price_books
      WHERE status = 'published'
        OR authored_by = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
  );

CREATE POLICY "price_book_items_write_admin" ON price_book_items FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON price_book_items TO authenticated;

-- ─── Resolver helper (SQL function for the edge function to call) ──────────
-- Returns the effective price_cents for (supplier, sku, tier, quantity, at_time).
-- Prefers the active published price_book; falls back to legacy pricing_rules
-- (which stores price NUMERIC dollars → translated × 100 to cents here).

CREATE OR REPLACE FUNCTION public.resolve_price_cents(
  p_supplier_id UUID,
  p_sku         TEXT,
  p_tier_code   TEXT DEFAULT 'tier1',
  p_quantity    INTEGER DEFAULT 1,
  p_at          TIMESTAMPTZ DEFAULT now()
) RETURNS INTEGER
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_price_cents INTEGER;
  v_price_dollars NUMERIC(10,2);
BEGIN
  -- Path 1: active published price book (new, native cents)
  SELECT pbi.price_cents INTO v_price_cents
    FROM price_book_items pbi
    JOIN price_books pb ON pb.id = pbi.price_book_id
   WHERE pb.supplier_id = p_supplier_id
     AND pb.status = 'published'
     AND pb.effective_from <= p_at
     AND (pb.effective_to IS NULL OR pb.effective_to > p_at)
     AND pbi.sku = p_sku
     AND pbi.tier_code = p_tier_code
     AND pbi.min_quantity <= p_quantity
   ORDER BY pbi.min_quantity DESC
   LIMIT 1;
  IF v_price_cents IS NOT NULL THEN RETURN v_price_cents; END IF;

  -- Path 2: legacy pricing_rules fallback. Join via pricing_rules_with_sku VIEW
  -- (created in migration 008) which exposes sku via product_components.
  -- Price is NUMERIC(10,2) dollars → multiply by 100 to return cents.
  SELECT prws.price INTO v_price_dollars
    FROM pricing_rules_with_sku prws
   WHERE prws.sku = p_sku
     AND prws.tier_code = p_tier_code
     AND prws.active = TRUE
     AND (prws.valid_from IS NULL OR prws.valid_from <= p_at)
     AND (prws.valid_to   IS NULL OR prws.valid_to   >  p_at)
   ORDER BY prws.priority DESC
   LIMIT 1;
  IF v_price_dollars IS NOT NULL THEN
    RETURN ROUND(v_price_dollars * 100)::INTEGER;
  END IF;

  RETURN NULL;
END $$;

-- Service-role-only access to match the existing pricing_rules / pricing_rules_with_sku grants.
REVOKE ALL ON FUNCTION public.resolve_price_cents(UUID, TEXT, TEXT, INTEGER, TIMESTAMPTZ) FROM anon, authenticated;
```

> **Schema notes (audited):** `pricing_rules` has NO `sku` column after migration 008 — SKU joins via `pricing_rules.component_id → product_components.id → product_components.sku`. The `pricing_rules_with_sku` VIEW (created in migration 008) exposes this join. `pricing_rules.price` is `NUMERIC(10,2)` dollars; this brief multiplies by 100 to translate to cents at the fallback path. New `price_book_items.price_cents` stays as INTEGER cents (cleaner for new code).
>
> **Supplier scope on the fallback path:** pricing_rules doesn't carry `supplier_id` until brief 032 adds it as nullable. Until brief 033 backfills (after 032 lands), the fallback path returns the first matching SKU regardless of supplier — fine for the single-supplier Glass Outlet era, problematic once Discount Fencing's SKUs are in the same table. Brief 033 backfills `supplier_id` on pricing_rules, after which the fallback can be tightened by adding `AND prws.supplier_id = p_supplier_id` to the legacy path (TODO comment in the SQL — done in a follow-on brief once pricing_rules_with_sku is rebuilt to expose supplier_id).

## Edge function update

In `supabase/functions/bom-calculator/lib.ts`, expose a `resolvePriceCents(supabase, ctx)` helper that wraps the SQL function and is used at every spot the calculator currently reads `pricing_rules` directly. Add Deno tests with mocked supabase response.

## TypeScript types

```typescript
// src/types/pricing.ts
export type PriceBookStatus = 'draft' | 'reviewed' | 'published' | 'archived';

export interface PriceBook {
  id: string;
  supplierId: string;
  name: string;
  sourceFile?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: PriceBookStatus;
  publishedAt?: string;
  publishedBy?: string;
  authoredBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PriceBookItem {
  id: string;
  priceBookId: string;
  sku: string;
  tierCode: string;
  minQuantity: number;
  priceCents: number;
  currency: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

(Zod schemas and query helpers follow the same pattern as `multiSupplier/` — `priceBookSchema`, `priceBookItemSchema`, `listPublishedBooks(supplierId)`, `getPriceForSku(supplierId, sku, tier, qty)`.)

## Tests

- Resolver test: insert a published book + items, assert the SQL function returns the correct quantity-break price.
- Quantity break test: with min_quantity rows of (1, 10, 100), assert qty=1 returns the 1-row price, qty=15 returns the 10-row price, qty=200 returns the 100-row price.
- Fallback test: with NO published book but a legacy pricing_rules row, assert the SQL function returns the legacy price.
- Pin test: insert a published book, save a quote, archive the book and publish a new one with different prices, assert the quote re-reads the OLD price via its pinned `price_book_version_id`. (This proves quote pinning works.)

## PR description template

```markdown
## Brief 034 — Versioned Price Books + Quote Pinning

Implements Layer 4 of the architecture: versioned price books with status lifecycle (draft → reviewed → published → archived) and quote-level pinning. Old quotes never silently re-price.

### What's in this PR

- Migration 034: tables `price_books`, `price_book_items`; column `quotes.price_book_version_id`; SQL function `public.resolve_price_cents()`
- Edge function helper `resolvePriceCents()` (price-book-aware, with legacy `pricing_rules` fallback)
- TypeScript types, Zod schemas, query helpers, tests
- Doc update

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Deno tests for `resolvePriceCents()` pass
- [ ] Migration applies cleanly
- [ ] Existing quotes still load (no schema break)
- [ ] PR base branch is `main`
```

## Stop points

- If `pricing_rules_with_sku` view doesn't include `tier_code`, `priority`, `active`, `valid_from`, `valid_to`, **STOP** and rebuild the view to expose them. The legacy fallback path needs them.
- If the existing `bom-calculator` edge function imports `pricing_rules_with_sku` via a different name or shape, surface and align.
- If `quotes.price_book_version_id` already exists (unlikely), confirm with Liam before reusing.

## After this PR merges

Brief 035 (Admin CRUD UI for suppliers + instances) can ship in parallel with brief 036 (Admin Products + bulk import, which will start using `price_books` for new imports). Until 035/036 land, price books are managed via direct SQL only.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/035-admin-ui-suppliers-and-instances-crud.md -->

# Brief 035 — Admin UI: Suppliers + System Instances CRUD

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 033 merged
**Estimated PR size:** medium (new admin pages, form components, no schema change)
**Primary reference:** `docs/system-authoring-process.md` Section 3 (Authoring Workflow) — Steps 1 + 2

---

## Goal

Build the first slice of the form-driven authoring surface: Liam can add new suppliers and system_instances through the admin UI without editing JSON or running raw SQL. This is the click-path that replaces "edit seed JSON, commit, push" for the supplier/instance level. Products + rules come in briefs 036 + 037.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Admin gating:** all new routes require `profiles.role = 'admin'` (matches existing migration 025 pattern).
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `src/pages/admin/SuppliersListPage.tsx` | NEW — table view + "New supplier" button |
| `src/pages/admin/SupplierEditPage.tsx` | NEW — create / edit one supplier |
| `src/pages/admin/SystemInstancesListPage.tsx` | NEW — filter by supplier, by archetype |
| `src/pages/admin/SystemInstanceEditPage.tsx` | NEW — create / edit one instance; readiness_status, trust_tier, visibility fields |
| `src/components/admin/SupplierForm.tsx` | NEW — controlled form, hooks into multiSupplier queries from brief 032 |
| `src/components/admin/SystemInstanceForm.tsx` | NEW — controlled form |
| `src/lib/multiSupplier/mutations.ts` | NEW — Supabase upsert/update/delete (admin-only via RLS) |
| `src/App.tsx` (or equivalent router config) | UPDATE — add admin routes under `/admin/...` with admin guard |
| `src/components/admin/AdminGuard.tsx` | NEW — reads profile.role, redirects non-admins |
| Tests | `src/components/admin/__tests__/SupplierForm.test.tsx`, ditto for SystemInstanceForm |
| `docs/app-overview.md` | UPDATE — list new admin routes |

## Routes

- `/admin/suppliers` — list, search, create
- `/admin/suppliers/:slug/edit` — edit one supplier
- `/admin/system-instances` — list, filter by supplier or archetype
- `/admin/system-instances/:id/edit` — edit one instance

## Form spec — Supplier

Fields (matches `suppliers` columns):
- Slug (text, lowercase-hyphenated, required, unique)
- Name (text, required)
- Logo URL (text, optional)
- Brand colour (text, hex format, optional)
- Contact email (text, optional, valid email)
- Trust tier (select: platform / verified / community / user) — **only admins can set platform/verified; non-admins forced to `user`**
- Status (select: active / hidden / draft / discontinued)
- Metadata (textarea, JSON) — collapsed by default

Validation via the Zod schema from brief 032 (`supplierSchema`).

## Form spec — System Instance

Fields:
- Supplier (select — populated from `listSuppliers()`)
- Archetype (select — populated from `listArchetypes()`, grouped by family)
- Slug (text, lowercase-hyphenated, required, unique within supplier)
- Name (text, required)
- Description (textarea)
- Status (select)
- Readiness status (select — informational only here; transitions handled in brief 037/038)
- Trust tier (select; admin-only for platform/verified)
- Visibility (select: private / org_shared / public)
- Readiness notes (textarea)

## Empty states + helpers

- "No suppliers yet" empty state on `/admin/suppliers` with a "Create your first supplier" button
- Slug auto-generation from Name on supplier create (slugify, lowercase)
- "Promote to verified" / "Demote to community" buttons on supplier edit (admin only, gated by trust_tier dropdown)

## Tests

- Form renders all fields
- Submit calls the right mutation with snake_cased payload
- Zod validation surfaces errors inline
- AdminGuard redirects non-admins to `/`

## PR description template

```markdown
## Brief 035 — Admin UI: Suppliers + System Instances CRUD

First slice of the form-driven authoring surface. Liam can now create / edit suppliers and system instances through the UI instead of seeded JSON.

### Routes added

- `/admin/suppliers` (list)
- `/admin/suppliers/:slug/edit`
- `/admin/system-instances` (list + filters)
- `/admin/system-instances/:id/edit`

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Non-admin redirected from /admin routes
- [ ] Supplier CRUD: create → edit → archive works end-to-end
- [ ] System instance CRUD: same
- [ ] Trust tier dropdown hides platform/verified for non-admin
- [ ] PR base branch is `main`
```

## Stop points

- If routing library differs from what this brief assumes (currently react-router-dom v6), align route definitions.
- If existing admin sections live somewhere other than `/admin/...`, surface and align naming.

## After this PR merges

Brief 036 (Products CRUD + bulk CSV import) builds on these admin pages, so the same shell/layout/AdminGuard components get reused.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/036-admin-ui-products-and-bulk-import.md -->

# Brief 036 — Admin UI: Products CRUD + Bulk CSV / Cin7 Mass-Download Import (staging + diff)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 035 merged
**Estimated PR size:** large (one schema migration for staging tables + parser + diff UI + Products CRUD)
**Primary reference:** `docs/multi-supplier-platform-architecture.md` "Import & Review Pipeline"

---

## Goal

Build the product authoring surface, including the **staging + diff** import pipeline that takes a supplier's mass-download (CSV or Cin7-style XLSX) and turns it into approved catalogue rows + price book items.

Today: Liam edits seed JSON files by hand. After this brief: Liam uploads a Cin7 mass-download or a CSV, sees a diff against the current catalogue, approves item-by-item, and publishes. The system writes to `products`, `pricing_rules` (legacy fallback), and (via brief 034) `price_books` + `price_book_items`.

**Reference format:** Cin7 Inventory mass-download (XLSX) with the columns we've observed in Liam's wholesale timber supplier export:
- `ProductId`, `ManufacturerSKU`, `SupplierSKU`, `ShortDescription`, `Size`, `Colour`
- `Custom1`, `Custom2`, `Custom3` (free-text taxonomy slots — used by some suppliers as category / sub-category)
- `SupplierBuy`, `BuyPriceEx`, `DirectCosts`, `RRP`, `POSPriceMarkupTarget`
- (51 columns total; only ~15 are typically used)

The parser is **format-pluggable** — Cin7 mass-download is the first parser; generic CSV is the second; further per-supplier parsers are additive.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Imports write to staging tables only.** Live catalogue / pricing tables are touched only on approval.
- **Approval is item-by-item** — never bulk-approve without explicit click.
- **Admin only:** the import UI requires `profiles.role = 'admin'`.
- **PR base branch is `main`.**
- **Draft PR only.**
- **Skip Deno integration job.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/036_staging_tables.sql` | NEW — `staging_products`, `staging_price_book_items`, `import_runs` tables |
| `src/lib/imports/parsers/cin7-mass-download.ts` | NEW — XLSX → staging rows |
| `src/lib/imports/parsers/generic-csv.ts` | NEW — CSV → staging rows |
| `src/lib/imports/parsers/index.ts` | NEW — registry of parsers by format |
| `src/lib/imports/diff.ts` | NEW — diff staging vs current catalogue (new / changed / unmapped / removed) |
| `src/lib/imports/__tests__/cin7-parser.test.ts` | NEW — sample input → expected staging rows |
| `src/lib/imports/__tests__/diff.test.ts` | NEW |
| `src/pages/admin/ProductsListPage.tsx` | NEW — filter by supplier/instance |
| `src/pages/admin/ProductEditPage.tsx` | NEW — create/edit one product |
| `src/pages/admin/ImportPage.tsx` | NEW — upload, parse, diff, approve flow |
| `src/components/admin/ProductForm.tsx` | NEW |
| `src/components/admin/DiffTable.tsx` | NEW — three-column diff view |
| `docs/seed-data-mapping-spec.md` | UPDATE — add Cin7 mass-download mapping table |
| `docs/app-overview.md` | UPDATE — list new admin routes |

## Staging tables

```sql
-- 036_staging_tables.sql
CREATE TABLE import_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  source_format   TEXT NOT NULL,            -- 'cin7_mass_download', 'generic_csv', etc.
  source_filename TEXT,
  status          TEXT NOT NULL DEFAULT 'parsing'
                  CHECK (status IN ('parsing','ready_for_review','approved','rejected','imported')),
  row_count       INTEGER,
  authored_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staging_products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id  UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  supplier_id    UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  sku            TEXT,
  name           TEXT,
  raw_payload    JSONB NOT NULL,            -- the original row, verbatim
  mapped_payload JSONB,                     -- normalised against canonical product schema
  decision       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (decision IN ('pending','approve','reject','needs_review')),
  decision_note  TEXT,
  decided_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at     TIMESTAMPTZ
);

CREATE TABLE staging_price_book_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id  UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  sku            TEXT NOT NULL,
  tier_code      TEXT NOT NULL DEFAULT 'tier1',
  min_quantity   INTEGER NOT NULL DEFAULT 1,
  price_cents    INTEGER,
  raw_payload    JSONB
);

-- Standard indexes + admin-only RLS (matches brief 032 pattern).
```

## Cin7 parser sketch

```typescript
// src/lib/imports/parsers/cin7-mass-download.ts
import { read, utils } from 'xlsx';
import { z } from 'zod';

const Cin7Row = z.object({
  ProductId: z.number().or(z.string()),
  ManufacturerSKU: z.string().nullable().optional(),
  SupplierSKU: z.string().nullable().optional(),
  ShortDescription: z.string(),
  Size: z.string().nullable().optional(),
  Colour: z.string().nullable().optional(),
  Custom1: z.string().nullable().optional(),
  Custom2: z.string().nullable().optional(),
  Custom3: z.string().nullable().optional(),
  BuyPriceEx: z.number().nullable().optional(),
  RRP: z.number().nullable().optional(),
});

export async function parseCin7MassDownload(
  fileBuffer: ArrayBuffer,
): Promise<ParsedRow[]> {
  const wb = read(fileBuffer);
  const ws = wb.Sheets['Product Master'];
  // Header row is the row whose A column = 'ProductId' (typically row 10).
  const headerRow = findHeaderRow(ws, 'ProductId');
  const rows = utils.sheet_to_json(ws, { range: headerRow, defval: null });
  return rows
    .map((r) => Cin7Row.safeParse(r))
    .filter((r) => r.success)
    .map((r) => normaliseCin7Row(r.data));
}

function normaliseCin7Row(row): ParsedRow {
  // sku = ManufacturerSKU || SupplierSKU || `cin7-${ProductId}`
  // name = ShortDescription
  // type inferred from ShortDescription tokens or from Custom1/2/3
  // dimensions parsed from Size string ("100 x 75", "1800") with regex
  // price_cents = Math.round(BuyPriceEx * 100)
  // ...
}
```

## Diff UI

A three-column view per row:

| Column | Content |
|---|---|
| Current catalogue | The existing product row (if any) matching by SKU |
| Staged | The parsed row from the upload |
| Decision | Buttons: Approve · Reject · Needs review · (auto-mapped if identical) |

Bulk actions (top of table): "Approve all new", "Approve all unchanged" (no-op confirmation), "Reject all unmapped".

## PR description template

```markdown
## Brief 036 — Admin UI: Products CRUD + Bulk CSV / Cin7 Import

Adds the product authoring surface and a staging-and-diff bulk-import pipeline. Cin7 mass-download is the first parser; generic CSV is the second.

### Routes added

- `/admin/products` (list, filter by supplier/instance)
- `/admin/products/:id/edit`
- `/admin/imports/new` (upload + parse)
- `/admin/imports/:runId/review` (diff + approve)

### Staging tables added (migration 036)

- `import_runs`
- `staging_products`
- `staging_price_book_items`

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Cin7 sample fixture parses correctly (52 rows → 52 staged products)
- [ ] Diff view correctly classifies new / changed / unchanged / unmapped
- [ ] Approving a row creates a `products` row tagged with the right supplier + instance
- [ ] Approving rows with prices creates `price_book_items` rows
- [ ] PR base branch is `main`
```

## Stop points

- Cin7 column variation: if a supplier's mass-download is missing the `Custom1/2/3` slots or uses different price column names (`SaleUnitPrice`, `DefaultPriceTier1`), the parser must surface unmapped fields rather than silently dropping them.
- Existing image upload pipeline: if Supabase storage isn't wired up, product image upload is a stop-point — surface and skip image fields in this brief.

## After this PR merges

Brief 037 builds the **rule authoring** form (template binding + data-driven math) on top of these admin pages. Brief 038 builds the workbook regression upload + diff view, which is the bridge from `imported` → `calculator_ready` → `approved` for new system instances.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/037-admin-ui-rule-authoring.md -->

# Brief 037 — Admin UI: Rule authoring (template binding + data-driven math)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 036 merged
**Estimated PR size:** medium (no new tables; new admin pages, rule template registry, form components)
**Primary reference:** `docs/system-authoring-process.md` Section 3 Step 4 + `docs/multi-supplier-platform-architecture.md` "Three-Tier Rule Storage"

---

## Goal

Build the rule-authoring surface so Liam (admin) can attach rules to a system_instance through a form: pick a rule template + fill parameters (Tier A), or enter math.js expressions directly (Tier B). Tier C (custom code modules) stays platform-team-only and is **not exposed** in this UI.

After this brief, Liam can complete the system-instance-build path entirely click-driven: pick supplier + archetype → enter products → attach rules → set readiness.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **No Tier C in UI.** Custom code modules require a PR.
- **Math.js string comparison gotcha:** the form helper should auto-rewrite `==` on strings to `equalText()` before saving. Documented in `discovery.md` after the QSG sliding gates work.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `src/lib/bom/templates/registry.ts` | NEW — TypeScript map of template_id → metadata (parameter schema, formula, output spec). Initial templates: `slat_counting_v1`, `bay_post_v1`, `rail_cut_v1`, `panel_per_bay_v1`, `paling_count_v1`, `glass_panel_v1`, `spigot_per_panel_v1`, `swing_gate_hardware_v1`, `sliding_track_v1`, `sliding_hardware_v1` (matches archetype seed in brief 033) |
| `src/lib/bom/templates/types.ts` | NEW |
| `src/pages/admin/RulesListPage.tsx` | NEW — filter by system_instance |
| `src/pages/admin/RuleEditPage.tsx` | NEW — Template / Data tabs |
| `src/components/admin/TemplateBindingForm.tsx` | NEW — Tier A |
| `src/components/admin/DataRuleForm.tsx` | NEW — Tier B (math.js expression editor) |
| `src/lib/bom/templates/__tests__/registry.test.ts` | NEW |
| `docs/app-overview.md` | UPDATE |

## Template registry (Tier A) shape

```typescript
// src/lib/bom/templates/types.ts
export interface RuleTemplate {
  id: string;
  describes: string;
  inputs: Record<string, RuleParamSpec>;
  formula: string;                // math.js expression
  output: { sku: string; taxonomy: 'auto_add'|'suggested'|'optional'|'warning' };
}

export interface RuleParamSpec {
  type: 'number' | 'string' | 'sku' | 'product_lookup';
  source: 'variable' | 'product' | 'literal';
  hint?: string;                   // free text help
  defaults?: Record<string, unknown>;
}
```

```typescript
// src/lib/bom/templates/registry.ts
export const RULE_TEMPLATES: Record<string, RuleTemplate> = {
  slat_counting_v1: {
    id: 'slat_counting_v1',
    describes: 'Slat count per segment for slat-based systems',
    inputs: {
      segment_width_mm:   { type: 'number', source: 'variable' },
      post_diameter_mm:   { type: 'product_lookup', source: 'product', hint: 'products[type=post].diameter' },
      slat_width_mm:      { type: 'product_lookup', source: 'product', hint: 'products[type=slat].width' },
      gap_mm:             { type: 'number', source: 'literal', defaults: { common: [9, 12, 20] } },
    },
    formula: 'ceil((segment_width_mm - 2 * post_diameter_mm) / (slat_width_mm + gap_mm))',
    output: { sku: 'products[type=slat].sku', taxonomy: 'auto_add' },
  },
  // ... etc for the other templates
};
```

## Tier B: Data rule form

A simple form with:
- Stage selector (derive / stock / accessory / component) — matches the `rule_stage` enum from migration 012
- Selector match JSON (read-only preview, follows the QSHS `match_json:{}` pattern from `product_component_selectors`)
- Math.js expression (textarea with syntax-highlight + linter that auto-rewrites string `==` to `equalText()`)
- Output key (text)
- Taxonomy (radio: auto_add / suggested / optional / warning) — stored alongside in `product_rules.notes` or a new column if the team decides
- Priority (number, default 0)
- Notes (textarea)

**Schema note (verified):** `product_rules` requires `org_id`, `product_id`, `rule_set_id`, `version_id`, `stage`, `name`, `expression`, `output_key`. The form must look up or create a `rule_set` + `rule_version` for the (org, product) pair if one doesn't exist (the engine reads the version with `is_current = true`). Convention: one rule_set per product named `<system_type>_default_rules`, one current version per rule_set.

Form persists via the existing `product_rules` table. Tag rows with the new `system_instance_id` (from the page context, set by brief 032).

## Tests

- Template registry: every template has well-formed inputs and formula
- Form: submits the correct payload to `product_rules`
- Math.js linter rewrites `name == "QSG"` to `equalText(name, "QSG")` on save

## PR description template

```markdown
## Brief 037 — Admin UI: Rule authoring

Adds the form-driven rule authoring surface (Template binding / Data rule tabs). Tier C (custom code modules) remains a PR-only path.

### Routes added

- `/admin/system-instances/:id/rules` (list, filter)
- `/admin/system-instances/:id/rules/new`
- `/admin/system-instances/:id/rules/:ruleId/edit`

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Template form: bind a template → save → row in `product_rules` with correct system_instance_id
- [ ] Data form: enter math.js expression → save → row in `product_rules`
- [ ] String-comparison auto-rewrite (`==` → `equalText()`) works
- [ ] PR base branch is `main`
```

## Stop points

- If the math.js editor library choice is contentious (currently default to CodeMirror 6 with a math.js mode), surface and confirm.

## After this PR merges

Brief 038 ships **workbook regression upload + diff** — the gate from `calculator_ready` to `spreadsheet_tested`. With 037 + 038 together, Liam can author and validate a new system without writing JSON or code.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/038-workbook-regression-upload-and-diff.md -->

# Brief 038 — Workbook Regression Upload + Diff View

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 037 merged
**Estimated PR size:** medium (one schema migration + parser + edge function call to run BOM + diff UI)
**Primary reference:** `docs/system-authoring-process.md` Section 3 Step 5 + Step 7 ("Workbook regression check")

---

## Goal

Bridge the readiness states `calculator_ready` → `spreadsheet_tested` → `approved`. Liam (or any author) uploads the supplier's formulated Excel workbook with 3-5 representative job configurations. The system runs the BOM through the canonical `bom-calculator` edge function for each configuration and diffs the output line-by-line against the workbook's expected values. The system_instance only advances to `spreadsheet_tested` when all configs pass.

This is the **trust anchor** of the platform — calculators that haven't passed workbook regression aren't shippable to tradies.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Workbook regression is non-bypassable for `approved` transition.** A system_instance cannot move from `calculator_ready` to `approved` without at least 3 passing configs.
- **PR base branch is `main`.**
- **Draft PR only.**
- **Skip Deno integration job.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/038_regression_runs.sql` | NEW — `regression_runs`, `regression_configs`, `regression_results` tables |
| `src/lib/regression/workbook-parser.ts` | NEW — Excel parser; reads named ranges or labelled rows for input → expected output |
| `src/lib/regression/runner.ts` | NEW — calls `bom-calculator` for each config, persists results |
| `src/lib/regression/diff.ts` | NEW — line-by-line diff (qty, sku, taxonomy) |
| `src/pages/admin/RegressionPage.tsx` | NEW — upload + run + results |
| `src/components/admin/RegressionDiffTable.tsx` | NEW |
| `src/lib/regression/__tests__/*.test.ts` | NEW |
| `docs/app-overview.md` | UPDATE |

## Workbook format expectations

The brief assumes Liam's workbooks follow a convention:

- Sheet `Inputs_<configName>` with named cells for each canonical-payload field (`segments`, `gates`, `corners`, system-specific variables)
- Sheet `Expected_<configName>` with rows of `(sku, qty, taxonomy)` — the expected BOM lines
- A `Configs` sheet listing all configuration names

If a workbook doesn't follow this convention, the upload surfaces "needs mapping" and asks the user to declare which sheet is which (parser falls back to per-supplier custom parsers, registered by file fingerprint).

## Tables

```sql
CREATE TABLE regression_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_instance_id  UUID NOT NULL REFERENCES system_instances(id) ON DELETE CASCADE,
  workbook_file       TEXT,
  config_count        INTEGER NOT NULL,
  passing_count       INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'running'
                      CHECK (status IN ('running','complete','failed','aborted')),
  authored_by         UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE TABLE regression_configs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regression_run_id   UUID NOT NULL REFERENCES regression_runs(id) ON DELETE CASCADE,
  config_name         TEXT NOT NULL,
  input_payload       JSONB NOT NULL,
  expected_payload    JSONB NOT NULL,
  actual_payload      JSONB,
  result              TEXT CHECK (result IN ('pass','fail','error')),
  diff_summary        JSONB,
  ran_at              TIMESTAMPTZ
);

-- regression_results becomes a derived/joined view as needed
```

## Readiness transition rules

When a regression_run completes with `passing_count >= 3` AND `passing_count = config_count`:
- A "Promote to spreadsheet_tested" button appears on the system_instance edit page (admin-only)
- Clicking it sets `readiness_status = 'spreadsheet_tested'`
- A second action "Approve" sets `readiness_status = 'approved'` + `approved_by` + `approved_at`

If the regression_run fails partially:
- The diff is preserved
- The system_instance stays at `calculator_ready`
- The author can iterate on rules and re-run

## PR description template

```markdown
## Brief 038 — Workbook Regression Upload + Diff View

Adds the trust anchor of the platform: every new system_instance must pass workbook regression on 3+ configurations before it can be `approved`.

### Routes added

- `/admin/system-instances/:id/regression` (history)
- `/admin/system-instances/:id/regression/new` (upload + run)
- `/admin/system-instances/:id/regression/:runId` (diff + promote)

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Sample workbook fixture (3 QSHS configs) round-trips correctly
- [ ] Mismatched config shows the diff with row-level pass/fail
- [ ] Promote-to-spreadsheet_tested button only appears when 3+ pass
- [ ] PR base branch is `main`
```

## Stop points

- Workbook convention mismatch (no `Inputs_*` / `Expected_*` sheets): surface and prompt user to map sheets manually.

## After this PR merges

The platform's authoring path is complete end-to-end: pick supplier → add products → attach rules → upload workbook → see diff → approve. Briefs 039-041 then open this surface to non-admin users with appropriate guardrails.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/039-user-scoped-authoring-and-rls.md -->

# Brief 039 — User-Scoped Authoring + RLS

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 035 merged (admin CRUD UI shell exists)
**Estimated PR size:** medium (RLS adjustments, form surface mirrors admin, restricted defaults)
**Primary reference:** `docs/system-authoring-process.md` Section 4 (Trust & Moderation Tiers) + Section 7

---

## Goal

Open the authoring surface to logged-in non-admin users with appropriate guardrails:

- Users can create their own `suppliers` (auto-assigned `trust_tier = 'user'`)
- Users can create `system_instances` (auto-assigned `trust_tier = 'user'`, `visibility = 'private'`)
- Users can manage their own products + rules + price books on instances they author
- Users CANNOT promote trust_tier or visibility — those require admin action (until brief 040 ships the community path)
- Quotes built on a user-authored instance are tagged with the user's authored_by and pin the user's own price_book

The user gets a "My Calculators" surface to manage their stuff.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **RLS does the heavy lifting** — frontend reads/writes use the same Supabase client; RLS enforces who can see/write what.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/039_user_authoring_rls.sql` | UPDATE — tighten / loosen RLS policies introduced in 032 + 034 + 036 + 038 so non-admin users can author within scope |
| `src/pages/my/MyCalculatorsPage.tsx` | NEW — list of user-authored system_instances |
| `src/pages/my/MyCalculatorEditPage.tsx` | NEW — reuses `SystemInstanceForm` from admin with restricted fields |
| `src/components/auth/UserOrAdminGuard.tsx` | NEW — allows authenticated users (admin path stays separate) |
| Tests | RLS denial test cases: user A cannot edit user B's supplier; user A's `trust_tier = 'platform'` insert is denied |
| `docs/system-authoring-process.md` | UPDATE Section 7 with user-path runbook |

## RLS adjustments (vs brief 032 baseline)

Brief 032 already allows:
- Anyone authenticated to insert suppliers / system_instances
- Author or admin to update
- Visibility-aware read

Brief 039 tightens:
- INSERT WITH CHECK on `suppliers` adds: `trust_tier IN ('user') OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'` — non-admins forced to `user` tier
- INSERT WITH CHECK on `system_instances` adds the same trust_tier restriction PLUS `visibility = 'private' OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'` — non-admins forced to private
- UPDATE WITH CHECK on `suppliers` blocks non-admins from changing `trust_tier` — the simplest implementation is a trigger that resets `trust_tier` to the previous value if the actor isn't admin
- Mirror policies on `price_books`: non-admins can author/edit drafts; publishing requires admin OR (post-brief-040) verified-supplier role

```sql
-- 039_user_authoring_rls.sql (skeleton)
CREATE OR REPLACE FUNCTION public.enforce_supplier_tier_user_only()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trust_tier <> 'user' AND (SELECT role FROM profiles WHERE id = auth.uid()) <> 'admin' THEN
    NEW.trust_tier := COALESCE(OLD.trust_tier, 'user');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER supplier_tier_guard BEFORE INSERT OR UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_supplier_tier_user_only();

-- Analogous trigger on system_instances for trust_tier + visibility.
```

## My Calculators routes

- `/my/calculators` — user's system_instances
- `/my/calculators/new`
- `/my/calculators/:id/edit`
- `/my/calculators/:id/products` etc — mirrors admin surface but scoped

## PR description template

```markdown
## Brief 039 — User-Scoped Authoring + RLS

Opens the authoring surface to non-admin users with trust_tier + visibility guardrails. Non-admins cannot self-promote to platform/verified or publish publicly without admin approval (briefs 040-041 add that path).

### Routes added

- `/my/calculators` (and child routes)

### Schema added

- Migration 039: triggers on `suppliers` + `system_instances` enforcing user-tier defaults

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] User A's INSERT with `trust_tier = 'platform'` is silently coerced to `user`
- [ ] User A cannot read User B's private `system_instance`
- [ ] User A CAN read public `system_instance` from another supplier
- [ ] Admin can still set any trust_tier
- [ ] PR base branch is `main`
```

## Stop points

- If the existing org model implies team-shared authoring (per-org scope), the policies need org_id checks too. Surface and confirm with Liam: "private" = author-only or org-shared by default?

## After this PR merges

Brief 040 ships the **community publication path** — user can request promotion of their private instance to community-tier public, going through a moderation queue.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/040-community-publication-path.md -->

# Brief 040 — Community Publication Path (moderation queue + verified auto-approve)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 038 merged + brief 039 merged
**Estimated PR size:** medium (schema migration + workflow logic + admin moderation surface + user request flow)
**Primary reference:** `docs/system-authoring-process.md` Section 4

---

## Goal

Users can request promotion of a private user-tier `system_instance` to a community-tier public one. Verified-supplier-authored instances bypass the queue (auto-approve). Pricing stays per-user even when the structure is shared.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Public publication requires `readiness_status = 'spreadsheet_tested'` minimum** (from brief 038). Lower readiness = "not ready to publish".
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/040_publication_requests.sql` | NEW — `publication_requests` table |
| `src/pages/my/MyCalculatorEditPage.tsx` | UPDATE — add "Request public publication" button |
| `src/pages/admin/ModerationQueuePage.tsx` | NEW — admin reviews requests |
| `src/lib/publication/requests.ts` | NEW — create / approve / reject helpers |
| `src/pages/CalculatorPickerPage.tsx` (or wherever public picker lives) | UPDATE — surface community-tier instances behind a feature flag |
| Tests | Workflow: user requests → admin approves → instance flips to `community` + `public` |
| `docs/system-authoring-process.md` | UPDATE — moderation flow runbook |

## Schema

```sql
CREATE TABLE publication_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_instance_id  UUID NOT NULL REFERENCES system_instances(id) ON DELETE CASCADE,
  requested_by        UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','withdrawn')),
  message             TEXT,
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,
  decision_note       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publication_requests_status ON publication_requests(status);
CREATE INDEX idx_publication_requests_instance ON publication_requests(system_instance_id);
```

## Workflow

1. User on `/my/calculators/:id/edit` clicks "Request public publication" (visible only when `readiness_status >= spreadsheet_tested`)
2. Request row inserted with `status = 'pending'`
3. Admin sees the request in `/admin/moderation`
4. Approve: `system_instances.visibility = 'public'`, `trust_tier = 'community'`, request `status = 'approved'`
5. Reject: instance unchanged, request `status = 'rejected'` with decision_note (surfaces to user as "needs work")
6. Verified-supplier authorship (the user's `suppliers.trust_tier = 'verified'`) auto-approves on request

## PR description template

```markdown
## Brief 040 — Community Publication Path

Adds the request-and-approve workflow for promoting private user-authored system_instances to community-tier public. Verified-supplier authorship auto-approves.

### Routes added

- `/admin/moderation` (admin queue)
- "Request public publication" button on `/my/calculators/:id/edit`

### Schema

- Migration 040: `publication_requests` table

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] User can request from a `spreadsheet_tested` instance
- [ ] User CANNOT request from a `calculator_ready` or lower instance
- [ ] Admin approve flips visibility + trust_tier
- [ ] Verified-supplier request auto-approves
- [ ] PR base branch is `main`
```

## Stop points

- If "verified supplier" verification flow doesn't exist yet (it's a future brief), the auto-approve check just looks at `suppliers.trust_tier = 'verified'` and trusts an admin must have set that. Acceptable; surface to Liam.

## After this PR merges

Brief 041 adds **quality reports + demotion automation** — the safety valve for community content.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/041-quality-reports-and-demotion.md -->

# Brief 041 — Quality Reports + Demotion Automation

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 040 merged
**Estimated PR size:** small-medium (one trigger + admin queue UI + report button on public instances)
**Primary reference:** `docs/system-authoring-process.md` Section 4 (Trust tier demotion)

---

## Goal

Every public community-tier instance has a "Report a problem" button. Three open quality reports against the same instance automatically demote it from `community` back to `user` (private). Admin can manually adjust at any time.

This is the safety valve that keeps the community tier from filling with junk.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **`system_instance_reports` table already exists** from brief 032.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/041_demotion_trigger.sql` | NEW — trigger on `system_instance_reports` that auto-demotes at threshold |
| `src/components/calculator/ReportInstanceButton.tsx` | NEW — visible on community-tier public instances |
| `src/pages/admin/ReportsQueuePage.tsx` | NEW — admin reviews open reports |
| `src/lib/moderation/reports.ts` | NEW — file / resolve / dismiss helpers |
| Tests | Three reports → instance demoted automatically; admin can resolve a report |
| `docs/system-authoring-process.md` | UPDATE — demotion runbook |

## Trigger

```sql
CREATE OR REPLACE FUNCTION public.demote_instance_on_threshold()
RETURNS TRIGGER AS $$
DECLARE
  v_open_count INTEGER;
  v_threshold  INTEGER := 3;
BEGIN
  SELECT COUNT(*) INTO v_open_count
    FROM system_instance_reports
   WHERE system_instance_id = NEW.system_instance_id
     AND status = 'open';
  IF v_open_count >= v_threshold THEN
    UPDATE system_instances
       SET trust_tier = 'user',
           visibility = 'private',
           readiness_notes = COALESCE(readiness_notes, '') ||
             E'\n[auto-demoted ' || now()::text || ' after ' || v_open_count || ' open reports]'
     WHERE id = NEW.system_instance_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER instance_reports_demote AFTER INSERT ON system_instance_reports
  FOR EACH ROW EXECUTE FUNCTION public.demote_instance_on_threshold();
```

## Admin queue

`/admin/reports` shows open reports grouped by `system_instance_id`. Each report can be:
- **Resolved** — sets `status = 'resolved'`; the instance count goes down (no automatic re-promotion, admin must manually restore community status)
- **Dismissed** — sets `status = 'dismissed'`; doesn't affect demotion count
- **Reviewing** — intermediate state

## PR description template

```markdown
## Brief 041 — Quality Reports + Demotion Automation

Adds the "Report a problem" surface on public community-tier instances. Three open reports auto-demote the instance.

### Routes added

- `/admin/reports`
- Report button inline on community-tier calculator pages

### Schema

- Migration 041: trigger on `system_instance_reports` for auto-demotion

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Filing 3 reports demotes the instance to user / private
- [ ] Admin can resolve / dismiss reports
- [ ] PR base branch is `main`
```

## Stop points

- Demotion threshold: 3 may need tuning. Mark it `v_threshold INTEGER := 3;` and surface a TODO comment in the migration so it's findable.

## After this PR merges

The multi-supplier foundation is complete. The remaining briefs (042 + 043) add Discount Fencing as the second supplier on the platform, demonstrating end-to-end that the architecture scales without code changes.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/042-discount-fencing-supplier-and-instances.md -->

# Brief 042 — Discount Fencing: Supplier + System Instances

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 033 merged (Glass Outlet + the 12 archetypes exist)
**Estimated PR size:** small (one data migration; no schema; no UI; no code)
**Primary reference:** `docs/system-authoring-process.md` Section 7 (admin runbook) + `https://www.dfsau.com.au/products` (source-of-truth product range)

---

## Goal

Add Discount Fencing as the **second supplier** on the platform. Create the supplier row + six `system_instances` matching their public product categories. No products / prices / rules in this brief — that's brief 043. This brief is the "we are now multi-supplier in fact, not just in theory" milestone.

**Updated 2026-05-28 after fresh site crawl:**
- `dfsau-aluminium-security` archetype changed from `mesh-fence` → `panel-fence` (structurally more accurate; mesh-fence is chainwire/weldmesh, this is panel-based vertical-bar aluminium)
- Added `dfsau-aluminium-slat-gate` instance for the $399 930×1800 aluminium slat gate promoted on the Colorbond page
- Confirmed `/hampton-pvc`, `/aluminium-custom`, `/rural-and-chainwire` pages are 404 on the live site — those product categories are no longer offered or have moved; removed from the README TODO list

**Strategic note:** Discount Fencing is being added as a `platform`-tier supplier authored by SkyBrookAI (Liam), because Liam holds the source material and is responsible for the data quality. When Discount Fencing later signs the verified-supplier agreement (per brief 040's verification process), the trust_tier can be demoted to `verified` via the admin UI (brief 035) — that's a clean one-row update, no migration needed.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **No fork.** This is a deliberate architectural choice — the multi-supplier platform is precisely the path that avoids forking per supplier. Adding Discount Fencing here demonstrates the value of the architecture.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/042_discount_fencing_supplier_and_instances.sql` | NEW — data migration |
| `catalogues/discount-fencing/README.md` | NEW — pointer to dfsau.com.au product pages + downloadable PDFs |
| `docs/system-authoring-process.md` | UPDATE — Decision log row: "Discount Fencing onboarded as platform-tier 2026-06-XX" |

**Explicitly NOT touched:** no code, no UI, no seed JSON yet (brief 043).

## Source material

Public product pages on `dfsau.com.au` as of 2026-05-28:

| Page | Product family | Notes |
|---|---|---|
| `/timber-fencing` | CCA Pine palings, posts, rails, sleepers | Concrete prices listed on page |
| `/aluminium-pool-fencing` | Flat-top, spear-top, loop-top panels | Concrete prices listed on page |
| `/glass-fencing` | 12mm frameless glass panels 100-2000mm × 1200H | "Fully Frameless Glass From $129/LM"; full SKU detail in downloadable price PDF |
| `/colorbond` | Bluescope Lysaght (12 colours), Metroll (9 colours), Smartascreen, Neetascreen, Metzag, Trimclad | "Click here to download our pricing" — needs PDF |
| `/colorbond` (promo product) | 930×1800 Aluminium Slat Gate at $399 in 8 colours | Companion gate; modelled as standalone `swing-gate` instance `dfsau-aluminium-slat-gate` |
| `/security-fencing` | Black aluminium panels (1800/2100H), swing/sliding security gates | "Click here to download our pricing" — needs PDF |
| `/insulated-patios` | Delta Panel patio systems | Not a fence — separate archetype (`enclosure` family) — out of scope for this brief |
| `/concrete-sleepers`, `/letterboxes`, `/gate-motors` | Accessories | Not separate calculator instances; will be modelled as auxiliary products under the fence instances they accompany |
| ~~`/hampton-pvc`~~ | ~~Hampton PVC fencing~~ | **404 on live site (verified 2026-05-28)** — page no longer exists |
| ~~`/aluminium-custom`~~ | ~~Custom aluminium~~ | **404** — folded into `/aluminium-pool-fencing` and `/security-fencing` |
| ~~`/rural-and-chainwire`~~ | ~~Rural / chainwire~~ | **404** — not currently offered |

Discount Fencing is located at **11 William Banks Drive, Burleigh Heads, Gold Coast QLD 4220**. Mon-Thu 7am-3pm, Fri 7am-2pm. Family-owned; Dave has 30+ years fencing experience and an in-house powder coating facility.

## Migration SQL

```sql
-- ============================================================================
-- 042_discount_fencing_supplier_and_instances.sql
-- ============================================================================

-- ─── Supplier row ───────────────────────────────────────────────────────────
INSERT INTO suppliers (slug, name, brand_colour, contact_email, trust_tier, status, metadata)
VALUES (
  'discount-fencing',
  'Discount Fencing Supplies',
  '#1f3b5c',
  NULL,
  'platform',
  'active',
  jsonb_build_object(
    'website', 'https://www.dfsau.com.au',
    'address', '11 William Banks Drive, Burleigh Heads, QLD 4220',
    'region', 'Gold Coast QLD',
    'hours', 'Mon-Thu 7am-3pm, Fri 7am-2pm',
    'principal', 'Dave (30+ years fencing experience)',
    'capabilities', jsonb_build_array('custom_fabrication','in_house_powder_coating','pool_fence_compliance')
  )
)
ON CONFLICT (slug) DO NOTHING;

-- ─── System instances ───────────────────────────────────────────────────────
WITH df AS (SELECT id FROM suppliers WHERE slug = 'discount-fencing')
INSERT INTO system_instances (
  supplier_id, archetype_id, slug, name, status, readiness_status,
  trust_tier, visibility, description, metadata
) VALUES
  -- Timber fence (CCA Pine palings)
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='timber-fence'),
    'dfsau-cca-pine-paling', 'Discount Fencing — CCA Pine Paling Fence',
    'active', 'imported', 'platform', 'public',
    'CCA Pine paling fence with 100x16 palings, 100x75 pine posts, 75x38 or 100x38 pine rails. Sourced from Discount Fencing Supplies (Burleigh Heads, QLD).',
    jsonb_build_object('source_page','https://www.dfsau.com.au/timber-fencing','pricing_basis','public_retail_2026_05')),

  -- Aluminium pool fence (flat top, spear top, loop top)
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='aluminium-pool-fence'),
    'dfsau-aluminium-pool', 'Discount Fencing — Aluminium Pool Fence',
    'active', 'imported', 'platform', 'public',
    'Aluminium pool fencing in flat-top, spear-top, and loop-top profiles. Compliant with Australian pool safety standards; Form 15 supplied. Black stock + powdercoat-to-order in any colour.',
    jsonb_build_object('source_page','https://www.dfsau.com.au/aluminium-pool-fencing','form_15_available',true,'profiles',jsonb_build_array('flat_top','spear_top','loop_top'))),

  -- Glass pool fence (12mm frameless)
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='glass-pool-fence'),
    'dfsau-frameless-glass-pool', 'Discount Fencing — Frameless Glass Pool Fence',
    'active', 'draft', 'platform', 'public',
    '12mm fully frameless tempered glass pool fence. Panels 100-2000mm wide × 1200mm high. Compliant with Australian pool safety standards.',
    jsonb_build_object('source_page','https://www.dfsau.com.au/glass-fencing','panel_thickness_mm',12,'panel_height_mm',1200,'pricing_pending','PDF download')),

  -- ColorBond panel fence (multi-brand: Bluescope, Metroll, Smartascreen, Neetascreen, Metzag, Trimclad)
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'dfsau-colorbond', 'Discount Fencing — ColorBond',
    'active', 'draft', 'platform', 'public',
    'ColorBond steel panel fencing. Brand options: Bluescope Lysaght (premium, 12 stocked colours), Metroll (9 stocked colours), Smartascreen, Neetascreen, Metzag, Trimclad. Brand selected as a variant on the calculator.',
    jsonb_build_object(
      'source_page','https://www.dfsau.com.au/colorbond',
      'brand_variants',jsonb_build_array('bluescope_lysaght','metroll','smartascreen','neetascreen','metzag','trimclad'),
      'pricing_pending','PDF download'
    )),

  -- Aluminium security fence (panel-fence archetype — panel-based vertical-bar
  -- system structurally similar to aluminium-pool-fence but for security at
  -- 1800/2100mm heights, no pool-compliance constraint)
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'dfsau-aluminium-security', 'Discount Fencing — Aluminium Security Fence',
    'active', 'draft', 'platform', 'public',
    'Aluminium security fencing — stock black panels at 1800/2100 high, plus custom-made swing and sliding security gates, raked / custom-height panels, powder coating to any colour.',
    jsonb_build_object(
      'source_page','https://www.dfsau.com.au/security-fencing',
      'stock_heights_mm',jsonb_build_array(1800,2100),
      'custom_capabilities',jsonb_build_array('raked','custom_height','swing_gate','sliding_gate','powdercoat_to_colour'),
      'pricing_pending','PDF download',
      'archetype_note','Tagged as panel-fence; consider promoting to dedicated tubular-fence archetype in a future architecture iteration (the structural pattern differs from ColorBond panel sheets — vertical bars between posts, like aluminium-pool-fence at non-pool heights).'
    )),

  -- Aluminium slat gates (companion product line for the ColorBond + Security
  -- instances). Sold as 930mm × 1800mm at $399 in 8 colours per current
  -- /colorbond page promo. Modelled as a swing-gate archetype instance so it
  -- can carry its own pricing + colour selection rules separately from the
  -- panel systems it complements.
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='swing-gate'),
    'dfsau-aluminium-slat-gate', 'Discount Fencing — Aluminium Slat Gate',
    'active', 'imported', 'platform', 'public',
    '930mm × 1800mm aluminium slat swing gate, available in 8 colours at $399. Promoted as a companion gate on the ColorBond and Security fence pages.',
    jsonb_build_object(
      'source_page','https://www.dfsau.com.au/colorbond',
      'standard_size_mm',jsonb_build_object('width',930,'height',1800),
      'standard_price_aud',399,
      'colour_count',8,
      'pricing_basis','public_retail_2026_05'
    ))
ON CONFLICT (supplier_id, slug) DO NOTHING;

-- ─── Sanity log ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_supplier UUID; v_instance_count INT;
BEGIN
  SELECT id INTO v_supplier FROM suppliers WHERE slug = 'discount-fencing';
  IF v_supplier IS NULL THEN
    RAISE EXCEPTION 'Discount Fencing supplier row not inserted';
  END IF;
  SELECT COUNT(*) INTO v_instance_count FROM system_instances WHERE supplier_id = v_supplier;
  RAISE NOTICE 'Discount Fencing seeded: supplier %, % system_instances', v_supplier, v_instance_count;
END $$;
```

## Catalogue README

Create `catalogues/discount-fencing/README.md`:

```markdown
# Discount Fencing — source material

Supplier: Discount Fencing Supplies, 11 William Banks Drive, Burleigh Heads, QLD 4220.
Website: https://www.dfsau.com.au

## Product pages

| Family | Page | Pricing |
|---|---|---|
| CCA Pine Paling | https://www.dfsau.com.au/timber-fencing | Public retail prices on page (2026-05) |
| Aluminium Pool Fence | https://www.dfsau.com.au/aluminium-pool-fencing | Public retail prices on page (2026-05) |
| Frameless Glass Pool | https://www.dfsau.com.au/glass-fencing | "From $129/LM"; full SKU detail in PDF (TODO: download) |
| ColorBond | https://www.dfsau.com.au/colorbond | "Click here to download our pricing" (TODO: download) |
| Aluminium Security | https://www.dfsau.com.au/security-fencing | "Click here to download our pricing" (TODO: download) |
| Hampton PVC | https://www.dfsau.com.au/hampton-pvc | Page failed to crawl 2026-05-28; needs manual fetch |
| Insulated Patios (Delta) | https://www.dfsau.com.au/insulated-patios | Out of scope — separate `enclosure` archetype |

## Brand partners (under ColorBond)

- **Bluescope Lysaght** — premium brand, 12 stocked colours
- **Metroll** — 9 stocked colours
- **Smartascreen**, **Neetascreen**, **Metzag**, **Trimclad**

## TODOs

- [ ] Download the public pricing PDFs from /colorbond, /security-fencing, /glass-fencing
- [ ] Fetch /hampton-pvc product detail via Browser tool
- [ ] Walk Discount Fencing through the supplier verification process; on completion, demote trust_tier from `platform` to `verified` via admin UI
```

## PR description template

```markdown
## Brief 042 — Discount Fencing: Supplier + System Instances

Adds the second supplier on the platform: Discount Fencing Supplies (Gold Coast). Creates 5 system_instances spanning their public product range. No products / prices / rules in this brief — see brief 043.

### Why no fork

The multi-supplier architecture (briefs 028-041) is specifically the path that avoids per-supplier forks. Adding Discount Fencing here proves the architecture scales: zero TypeScript changes, zero new tables, one data migration.

### What's added

- `suppliers` row: `discount-fencing` (trust_tier `platform`, can be demoted to `verified` after verification)
- 5 `system_instances`: cca-pine-paling, aluminium-pool, frameless-glass-pool, colorbond, aluminium-security
- `catalogues/discount-fencing/README.md` with source pointers

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Migration applies cleanly
- [ ] `NOTICE` message logs the supplier UUID + 5 instances
- [ ] Querying `system_instances` filtered to supplier=discount-fencing returns the 5 rows
- [ ] Calculator picker (when re-opened post-brief-035) lists Discount Fencing as a choice
- [ ] PR base branch is `main`
```

## Stop points

- If brief 033 didn't seed all 12 archetypes (incomplete migration), some of the INSERTs here will fail. Surface and fix 033 first.
- Discount Fencing's actual brand colour from their site logo — current value `#1f3b5c` is an inferred estimate. Replace with the real one if Liam has it.

## After this PR merges

Brief 043 ships the seed data (products + price book v1 + rules wiring) for the two instances where retail pricing is public (timber + aluminium pool). The other three instances (glass, colorbond, security) wait for the pricing PDFs to be downloaded and parsed — those land in follow-up briefs.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/043-discount-fencing-seed-data-and-price-book.md -->

# Brief 043 — Discount Fencing: Seed Data + Price Book v1 (timber + aluminium pool)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 042 merged + brief 034 merged (price_books table exists)
**Estimated PR size:** medium (two seed JSON files + a data migration for the price book + tests against the seed script)
**Primary reference:** `_briefs/assets/043-discount-fencing-seeds/` (bundled with this brief) — the seed JSON to drop into `supabase/seeds/discount-fencing/products/`

---

## Goal

Seed the **three Discount Fencing system_instances** that have public retail pricing on their website:

1. **`dfsau-cca-pine-paling`** — CCA Pine Paling Fence (timber-fence archetype)
2. **`dfsau-aluminium-pool`** — Aluminium Pool Fence (aluminium-pool-fence archetype)
3. **`dfsau-aluminium-slat-gate`** — $399 aluminium slat swing gate, 8 colours, 930×1800 (swing-gate archetype)

For each: 1 row in `products` + N rows in `product_components` (one per SKU) + 1 published `price_book` per supplier + `price_book_items` mirroring the public retail pricing as of 2026-05.

**Out of scope for this brief: variables, rules, selectors, validations.** Those are wired up via the admin Rule-Authoring UI (brief 037) after this seed lands. The system_instances move from `imported` to `calculator_ready` once that's done. (This separation matches the readiness lifecycle defined in `docs/system-authoring-process.md`.)

The other three Discount Fencing instances (glass-pool, colorbond, security) stay at `readiness_status = 'draft'` pending PDF pricing extraction. They get their own follow-up briefs once Liam supplies the pricing source.

## Verified preconditions (audited via GitHub API for this brief)

- **Canonical seed shape** matches `supabase/seeds/glass-outlet/products/vs.json` (verified) — top-level `org_slug`, `products[]` with `system_type`/`product_type`/`name`/`description`/`active`/`sort_order`/`metadata`, `product_components[]` with `sku`/`name`/`description`/`category`/`unit`/`default_price` (NUMERIC dollars)/`system_types` (TEXT[])/`metadata`/`active`/`subCategory`/`sortPriority`.
- **`products.system_type` UNIQUE per `(org_id, system_type)`** (migration 022). Discount Fencing products use the prefix `DF_*` (e.g. `DF_CCA_PAL`, `DF_AL_POOL`) to namespace away from the Glass Outlet system_types under the same org.
- **`product_components.default_price`** is NUMERIC(10,2) dollars (migration 008). New `price_book_items.price_cents` is INTEGER cents.
- **Provenance:** seed loader must resolve `supplier_id` from `supplier_slug` and `system_instance_id` from `(supplier_slug, system_instance_slug)` at upsert time and stamp the resulting rows. If the seed loader doesn't yet support this (it currently only handles `org_id`), this brief extends it.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Use the rule template registry from brief 037** wherever possible — `paling_count_v1`, `bay_post_v1`, `rail_per_bay_v1`, `panel_per_bay_v1`.
- **All seed rows carry `supplier_id = discount-fencing`** and the appropriate `system_instance_id`.
- **Price book is `published`** so quotes can immediately pin against it.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/seeds/discount-fencing/products/cca-pine-paling.json` | NEW — products + components for the timber fence |
| `supabase/seeds/discount-fencing/products/aluminium-pool.json` | NEW — products + components for aluminium pool fence |
| `supabase/seeds/discount-fencing/products/aluminium-slat-gate.json` | NEW — products + components for the $399 slat gate companion product |
| `supabase/seeds/discount-fencing/price-books/2026-05-public.json` | NEW — published price book with all SKUs from both instances |
| `supabase/migrations/043_discount_fencing_seed_priceboook.sql` | NEW — `INSERT INTO price_books` + `INSERT INTO price_book_items` from the JSON above (data migration form, idempotent) |
| `supabase/seeds/run-seeds.ts` (or wherever the seed loader lives) | UPDATE — extend the loader to read from `supabase/seeds/<supplier>/products/*.json` for any supplier, not just glass-outlet |
| `catalogues/discount-fencing/source-prices-2026-05.md` | NEW — verbatim copy of the public price text from `/timber-fencing` and `/aluminium-pool-fencing` (audit trail) |

## Source pricing (verbatim, 2026-05-28, from dfsau.com.au)

**CCA Pine Palings** (`/timber-fencing`):
```
100 x 16 CCA PINE PALINGS
1200 - $1.74
1800 - $2.15
2100 - $2.90
2400 - $3.40

75 x 38 x 4800 CCA PINE RAIL - $12.10
100 x 38 x 4800 CCA PINE RAIL ARRISSED - $17.00

100 x 75 CCA PINE POST
1800 - $14.70
2400 - $19.60
3000 - $24.50

200 x 50 CCA PINE ARRISSED SLEEPER
2400 - $24.80
3000 - $30.00

200 x 75 CCA PINE ARRISSED SLEEPER
2400 - $33.00
3000 - $40.00
```

**Aluminium Pool Fencing** (`/aluminium-pool-fencing`):
```
Flat Top Pool Panels — BLACK
2450 $94.00
3000 $129.00
975 GATES $69.00
ADJUSTABLE 1515 WIDE GATES $113.00
SHROUDS $3.00 EACH
1800 POSTS $26.00
2100 POSTS $28.00
1300 FLANGED POST $29.00
1600 FLANGED POST $31.00

Flat Top Pool Panels — OTHER COLOURS
2475 $115
3000 $150
975 GATE $115
SHROUDS $3.00
1800 POST $32
2100 POST $35
1300 FLANGED POST $42
1500 FLANGED POST $44

Aluminium Spear Top Pool Panels — 2400 wide × 1200 high — $155 per panel (Black stock)
Aluminium Loop Top Pool Panels — 2400 wide × 1200 high — (Black stock; mill finish available for powder coat)
```

> **Currency note:** all prices are AUD inc-GST per source (Discount Fencing displays retail). Brief 043 stores them as `price_cents` (AUD) on the `price_book_items` rows.
>
> **Tier convention** (per brief 034 decision):
> - `tier1` = list / public retail / RRP — what's seeded here
> - `tier2` = trade — pending Discount Fencing trade pricing PDF
> - `tier3` = volume / bulk — pending; reserve for big-volume contract pricing

## Seed JSON shape

Matches the canonical Glass Outlet seed shape (see `supabase/seeds/glass-outlet/products/vs.json` for reference). Top-level:

```json
{
  "org_slug": "glass-outlet",
  "supplier_slug": "discount-fencing",
  "system_instance_slug": "dfsau-cca-pine-paling",
  "products": [
    {
      "system_type": "DF_CCA_PAL",
      "product_type": "fence",
      "name": "Discount Fencing — CCA Pine Paling Fence",
      "description": "...",
      "active": true,
      "sort_order": 100,
      "metadata": { "options": {...}, "_provenance": {...} }
    }
  ],
  "product_components": [
    {
      "sku": "DF-PAL-100x16-1200",
      "name": "CCA Pine Paling 100×16×1200mm",
      "description": "...",
      "category": "paling",
      "unit": "each",
      "default_price": 1.74,
      "system_types": ["DF_CCA_PAL"],
      "metadata": { "height_mm": 1200, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine" },
      "active": true,
      "subCategory": "palings",
      "sortPriority": 10
    }
    // ... etc
  ]
}
```

Key differences from a from-scratch design:
- Two-level: **`products`** is the system-level (one row per Discount Fencing fence type); **`product_components`** is SKU-level (one row per actual stock-keeping unit).
- **`system_types`** on each component is an array — the same component CAN serve multiple system_types (compare to Glass Outlet's shared slat SKUs across QSHS / VS / XPL). For Discount Fencing we use single-element arrays for now.
- **`default_price`** is NUMERIC dollars (matches existing `pricing_rules.price` shape).
- **`system_type` namespace:** uses `DF_*` prefix to stay unique under the Glass Outlet org (UNIQUE constraint per migration 022). When the multi-org redesign lands, these can be re-namespaced.

Full JSON files are in `_briefs/assets/043-discount-fencing-seeds/cca-pine-paling.json` and `_briefs/assets/043-discount-fencing-seeds/aluminium-pool.json` (bundled with the brief tarball).

## Price book SQL (data migration form)

```sql
-- ============================================================================
-- 043_discount_fencing_seed_priceboook.sql
-- ============================================================================

WITH df AS (SELECT id FROM suppliers WHERE slug='discount-fencing'),
     pb AS (
       INSERT INTO price_books (supplier_id, name, source_file, status, effective_from, metadata)
       VALUES (
         (SELECT id FROM df),
         'Discount Fencing 2026-05 Public Retail',
         'https://www.dfsau.com.au (timber-fencing + aluminium-pool-fencing pages)',
         'published',
         '2026-05-01'::timestamptz,
         jsonb_build_object('basis','public_retail','currency','AUD','tax_inclusive',true)
       )
       ON CONFLICT DO NOTHING
       RETURNING id
     )
INSERT INTO price_book_items (price_book_id, sku, tier_code, min_quantity, price_cents, currency)
SELECT (SELECT id FROM pb), v.sku, 'tier1', 1, v.price_cents, 'AUD'
FROM (VALUES
  -- Timber palings
  ('DF-PAL-100x16-1200',     174),
  ('DF-PAL-100x16-1800',     215),
  ('DF-PAL-100x16-2100',     290),
  ('DF-PAL-100x16-2400',     340),
  ('DF-RAIL-75x38',         1210),
  ('DF-RAIL-100x38-ARRISSED', 1700),
  ('DF-POST-100x75-1800',   1470),
  ('DF-POST-100x75-2400',   1960),
  ('DF-POST-100x75-3000',   2450),
  ('DF-SLEEPER-200x50-2400', 2480),
  ('DF-SLEEPER-200x50-3000', 3000),
  ('DF-SLEEPER-200x75-2400', 3300),
  ('DF-SLEEPER-200x75-3000', 4000),

  -- Aluminium pool — Black (flat top)
  ('DF-AP-FT-BLK-2450',      9400),
  ('DF-AP-FT-BLK-3000',     12900),
  ('DF-AP-GATE-975-BLK',     6900),
  ('DF-AP-GATE-1515-ADJ-BLK', 11300),
  ('DF-AP-SHROUD-BLK',        300),
  ('DF-AP-POST-1800-BLK',    2600),
  ('DF-AP-POST-2100-BLK',    2800),
  ('DF-AP-FLPOST-1300-BLK',  2900),
  ('DF-AP-FLPOST-1600-BLK',  3100),

  -- Aluminium pool — Other colours (flat top)
  ('DF-AP-FT-COL-2475',     11500),
  ('DF-AP-FT-COL-3000',     15000),
  ('DF-AP-GATE-975-COL',    11500),
  ('DF-AP-SHROUD-COL',        300),
  ('DF-AP-POST-1800-COL',    3200),
  ('DF-AP-POST-2100-COL',    3500),
  ('DF-AP-FLPOST-1300-COL',  4200),
  ('DF-AP-FLPOST-1500-COL',  4400),

  -- Aluminium pool — Spear top (Black stock)
  ('DF-AP-SPEAR-2400x1200-BLK', 15500),
  -- Loop-top pricing not on public page — left out; covered by 'POA' marker in seed JSON.

  -- Aluminium slat gate companion product (8 colours, single size, single price)
  ('DF-ALG-930x1800-BLK', 39900),
  ('DF-ALG-930x1800-COL', 39900)
) v(sku, price_cents)
ON CONFLICT (price_book_id, sku, tier_code, min_quantity) DO NOTHING;

-- Sanity log
DO $$ DECLARE v_items INT;
BEGIN
  SELECT COUNT(*) INTO v_items FROM price_book_items pbi
    JOIN price_books pb ON pb.id = pbi.price_book_id
   WHERE pb.supplier_id = (SELECT id FROM suppliers WHERE slug='discount-fencing');
  RAISE NOTICE 'Discount Fencing price book seeded: % items', v_items;
END $$;
```

## Tests / verification

- `npm run seed:products` succeeds for the new supplier folder (no errors loading `supabase/seeds/discount-fencing/products/*.json`)
- Querying `/api/.../bom-calculator` for a Discount Fencing CCA Pine Paling 1800mm-high segment returns the right SKUs at the right quantities (one workbook regression config minimum)
- `resolve_price_cents(<dfsau supplier_id>, 'DF-PAL-100x16-1800', 'tier1', 1, now())` returns `215` (cents)
- `localBomCalculator.test.ts` UNCHANGED

## PR description template

```markdown
## Brief 043 — Discount Fencing: Seed Data + Price Book v1

Seeds the two Discount Fencing instances with public-pricing data: CCA Pine Paling fence + Aluminium Pool fence. Adds a published price book (`Discount Fencing 2026-05 Public Retail`).

### What's added

- `supabase/seeds/discount-fencing/products/cca-pine-paling.json` (13 products, ~3 template-bound rules)
- `supabase/seeds/discount-fencing/products/aluminium-pool.json` (16 products, ~4 template-bound rules)
- Migration 043: published `price_books` row + ~30 `price_book_items` mirroring public retail prices
- Seed loader extended to handle multiple supplier folders

### What's NOT added

- Glass pool / ColorBond / Security instances (pending PDF pricing — follow-up briefs)
- Trade pricing tiers (tier2/tier3 — pending Discount Fencing trade price PDF)

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run seed:products` ingests both supplier folders cleanly
- [ ] BOM run on a sample DF CCA Pine Paling config returns expected SKUs
- [ ] `resolve_price_cents` returns the expected cents for a known SKU
- [ ] PR base branch is `main`
```

## Stop points

- If the seed loader's resolution of `supplier_slug` and `system_instance_slug` isn't trivial to extend (e.g. the loader is heavily coupled to `org_slug`), surface and consider a smaller change: seed loader looks up supplier + system_instance by slug at upsert time and stamps the resulting `products.{supplier_id, system_instance_id}` + `product_components.{supplier_id, system_instance_id}` columns from brief 032.
- If `pricing_rules.supplier_id` (added in brief 032, backfilled in brief 033) hasn't actually been backfilled by the time 043 runs, the price book inserts work fine but the legacy fallback path in `resolve_price_cents` may return Glass Outlet prices for Discount Fencing SKUs. The `resolve_price_cents` price-book path takes precedence so this is mostly a non-issue, but flag if observed.
- The loop-top aluminium pool panel doesn't have a public price (POA in the seed JSON). Surface to Liam if a pricing PDF is available.

## After this PR merges

- **Run** `npm run seed:products` against the target Supabase project.
- **Run** a workbook regression for each instance (brief 038) once Liam supplies the Excel order forms.
- **Follow-up briefs** for glass-pool, colorbond, and security will land once Liam downloads the public pricing PDFs from dfsau.com.au.
- Discount Fencing's `dfsau-cca-pine-paling` and `dfsau-aluminium-pool` instances move from `readiness_status = 'imported'` to `'calculator_ready'` automatically once rules wire up.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/044-platform-org-and-visibility-layer.md -->

# Brief 044 — Platform Org + Visibility Layer (Layer 5)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 043 merged
**Estimated PR size:** large (schema migration + data migration + RLS rework + admin UI surface for visibility)
**Primary reference:** `docs/multi-supplier-platform-architecture.md` Layer 5 ("Visibility & Access") + the deferred architectural decision noted in briefs 042 and 043

---

## Goal

Resolve the deferred multi-org architectural question by introducing **first-class visibility tables** (Layer 5 of the architecture) and a **`skybrook-platform` org** that owns the shared multi-supplier catalogue. Tradies' own orgs read from the platform catalogue via visibility rules, not via `org_id = mine` RLS.

**Before this brief:** all products live under the `glass-outlet` org (with Discount Fencing namespaced via `DF_*` system_type prefixes). Tradies who aren't in the Glass Outlet org can't see anything via the existing `products.org_id = public.user_org_id()` policy.

**After this brief:**
- A new `skybrook-platform` organisation row owns the canonical catalogue.
- All `products` / `product_components` rows migrate to the platform org.
- `supplier_visibility` / `system_visibility` / `product_visibility` tables exist (per architecture doc).
- RLS on `products` updates to: "row is visible if user's org has a visibility grant for the row's supplier × system_instance, OR the row is `visibility = 'public'` AND `trust_tier IN ('platform', 'verified')`, OR user is admin."
- The Glass Outlet org keeps existing — but its meaning shifts from "the catalogue owner" to "Liam's Glass Outlet tradie tenant" (which it's always actually been).

## Why this is brief 044 (and why deferred from 042-043)

The current pack (briefs 028-043) ships under Option A (DF products under glass-outlet org, namespaced by `DF_*`). That works **but** is conceptually muddy:

- "Discount Fencing products live in The Glass Outlet's organisation row" is wrong as a long-term identity statement.
- The moment a third supplier signs on, the cracks widen.
- B2B scoping ("Customer X sees ColorBond only, not Stratco") is impossible without a real visibility layer.

Brief 044 is the architectural fix. It's deferred to 044 (not bolted into 042-043) because:
1. It's a sizeable schema + RLS rework.
2. It requires the multi-supplier identity (032-033) and pricing (034) to be in place first.
3. The current arrangement is reversible — moving products from one `org_id` to another is one UPDATE statement.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Data migration is idempotent.** Re-running is a no-op.
- **Existing customer access continues** — Liam's Byron and Beyond Fencing org continues to see Glass Outlet (and now Discount Fencing) products without any frontend change. The RLS rewrite preserves this.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/044_platform_org_and_visibility.sql` | NEW — schema + data migration |
| `src/lib/visibility/queries.ts` | NEW — visibility resolution helpers |
| `src/lib/visibility/schemas.ts` | NEW — Zod types |
| `src/pages/admin/VisibilityPage.tsx` | NEW — admin UI for grant management |
| `docs/multi-supplier-platform-architecture.md` | UPDATE — Decision log row |
| `docs/system-authoring-process.md` | UPDATE — Section 4 (the role of `skybrook-platform` org) |

## Schema additions

```sql
-- Visibility tables (per architecture doc Layer 5)
CREATE TABLE supplier_visibility (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  scope_type  TEXT NOT NULL CHECK (scope_type IN ('global','org','user','customer_group','region')),
  scope_id    TEXT,
  visible     BOOLEAN NOT NULL DEFAULT true,
  granted_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE system_visibility (
  -- analogous shape, references system_instances(id)
);

CREATE TABLE product_visibility (
  -- analogous shape, references products(id) — finest-grained
);
```

## Data migration

```sql
-- 1. Create skybrook-platform org
INSERT INTO organisations (slug, name, ...) VALUES ('skybrook-platform', 'SkyBrookAI Platform', ...);

-- 2. Migrate all catalogue rows (products / product_components / product_rules /
--    product_variables / etc) to the platform org
UPDATE products            SET org_id = (SELECT id FROM organisations WHERE slug='skybrook-platform');
UPDATE product_components  SET org_id = (SELECT id FROM organisations WHERE slug='skybrook-platform');
UPDATE pricing_rules       SET org_id = (SELECT id FROM organisations WHERE slug='skybrook-platform');
-- (and the engine v3 tables: product_rules, product_variables, product_component_selectors, product_companion_rules, rule_sets, rule_versions)

-- 3. Seed default visibility: every existing tradie org sees the platform's catalogue
INSERT INTO supplier_visibility (supplier_id, scope_type, scope_id, visible)
SELECT id, 'global', NULL, true FROM suppliers WHERE trust_tier IN ('platform','verified');
```

## RLS rewrite

```sql
-- products: replace the strict org_id check with visibility-aware logic
DROP POLICY IF EXISTS products_select_own_org ON products;

CREATE POLICY products_select_visible ON products FOR SELECT TO authenticated
USING (
  -- Admin sees all
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  -- User's own org's products (private tenant data)
  OR org_id = public.user_org_id()
  -- Platform/verified supplier products via visibility resolution
  OR EXISTS (
    SELECT 1 FROM supplier_visibility sv
    WHERE sv.supplier_id = products.supplier_id
      AND sv.visible = true
      AND (
        sv.scope_type = 'global'
        OR (sv.scope_type = 'org' AND sv.scope_id = public.user_org_id()::TEXT)
        OR (sv.scope_type = 'user' AND sv.scope_id = auth.uid()::TEXT)
      )
  )
);
```

(Analogous changes to `product_components`, `pricing_rules` visibility post-migration.)

## Open decisions

These need Liam's input during brief execution, not before staging:

1. **What happens to the `glass-outlet` org row?** Stays as Liam's tenant org (with its existing customer data — quotes, profiles); OR retired in favour of a new `byron-and-beyond-fencing` org for Liam's actual business; OR demoted. The pack assumes "stays as-is" but flag for explicit decision when brief lands.

2. **B2B grant policy.** When Discount Fencing's `trust_tier` is `platform` (per brief 042), the `supplier_visibility` row seeded above defaults to `global` (everyone sees it). When DF moves to `verified`, that may want to flip to `org-by-org grant` per supplier-customer agreements. Default for now: global visibility for `platform`/`verified` suppliers.

## Stop points

- If the `glass-outlet` org's existing quote rows reference products via FK that would break after the `org_id` migration, **STOP** and surface. Quotes should be invariant to where products live in the org tree — but verify.
- If existing edge function code depends on `products.org_id` for any logic beyond RLS, surface and refactor.

## After this PR merges

- The multi-supplier architecture is fully ship-shape: identity (032) + provenance (033) + pricing (034) + admin authoring (035-038) + community (039-041) + Discount Fencing (042-043) + visibility (044) all integrated.
- Adding the 5th supplier becomes ~50 lines of data migration (per brief 042's pattern), with no RLS changes needed.
- Tradies' orgs become first-class tenants reading from a shared catalogue. The B2B story is unlocked.
- A natural follow-on is to convert the Glass Outlet "platform" tier supplier to "verified" once Glass Outlet signs a supplier agreement — one-row admin UI update.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/045-amazing-fencing-supplier-and-instances.md -->

# Brief 045 — Amazing Fencing: Supplier + System Instances

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 033 merged (Glass Outlet + the 12 archetypes exist)
**Estimated PR size:** small (one data migration; no schema; no UI; no code)
**Primary reference:** `docs/system-authoring-process.md` Section 7 (admin runbook) + `https://amazingfencing.com.au` (install-side) + `https://www.fencing-supplies.com.au` (supply-side, sister site)

---

## Goal

Add **Amazing Fencing** as the **third supplier** on the platform (after Glass Outlet and Discount Fencing). Create the supplier row + **6 `system_instances`** matching their public product categories. No products / prices / rules in this brief — that's brief 046.

**Updated 2026-05-28:** Added `amazing-retaining-wall` instance after fresh website crawl confirmed retaining walls as a distinct Amazing Fencing product line operating in QLD / NSW / VIC. Liam supplied the Cin7 trade pricing export (`MassDownloadProducts_20260526_0305PM.xlsx`); brief 046 now ships a PUBLISHED tier2 price book with real items.

**Strategic note:** Amazing Fencing is unusual on the platform because they're a **contractor + supplier hybrid**. The install business (`amazingfencing.com.au`) operates across NSW, VIC, QLD, Gold Coast. The supply business (`fencing-supplies.com.au`) is the sister site that publishes the SKU catalogue (no prices publicly). Onboarded as `platform`-tier authored by SkyBrookAI; when they sign the verified-supplier agreement, demote to `verified` via admin UI (brief 035).

**Multi-state implication:** Amazing Fencing operates across 4 metro areas. The visibility layer (brief 044) becomes immediately relevant — NSW Amazing Fencing branch may have different inventory / lead times than QLD branch. For this brief, single-supplier-row with multi-state metadata is sufficient; per-region scoping can be added via brief 046+ or a future brief once Liam confirms operational model.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/045_amazing_fencing_supplier_and_instances.sql` | NEW — data migration |
| `catalogues/amazing-fencing/README.md` | NEW — pointer to source pages + brand partners + TODO list |

**Explicitly NOT touched:** no code, no UI, no seed JSON yet (brief 046).

## Source material

Public pages on `amazingfencing.com.au` and `fencing-supplies.com.au` as of 2026-05-28:

| Page | Product family | Notes |
|---|---|---|
| `amazingfencing.com.au/products/colorbond-fencing/` | ColorBond steel | Multi-brand: Gramline, Lysaght, Oxworks, ColorMAX, PermaSteel |
| `amazingfencing.com.au/products/permasteel-fencing/` | PermaSteel modular | Proprietary "PermaSteel" brand — their flagship modular system. Heights 1.5/1.8/2.1/2.4m as GP bundles. |
| `amazingfencing.com.au/products/timber-fencing/` | Treated pine paling | H3/H4 treated pine; Colonial / Lapped / Lapped&Capped / Paling styles. AS 1604 compliant. |
| `amazingfencing.com.au/products/slat-screen-fence/` | Timber slat screen | Galvanised steel posts + treated pine OR hardwood slats. |
| `amazingfencing.com.au/products/chainwire-security/` | Chain wire / security | Galvanised + PVC-coated options (green or black). |
| `amazingfencing.com.au/products/fence-gates/` | Fence gates | Sold as components within their fence families; not a separate instance. |
| `fencing-supplies.com.au/colorbond-steel-fencing-supplies/` | Full SKU list (steel) | Posts/rails/sheets/gates/hardware enumerated. **No public prices.** |
| `fencing-supplies.com.au/timber-fencing-supplies/` | Full SKU list (timber) | Pickets/posts/rails/lattice/screening enumerated. **No public prices.** |

**Pricing status:** Amazing Fencing does NOT publish wholesale or retail prices online. Pricing PDF must be obtained directly from them before brief 046 can promote any instance past `readiness_status = 'imported'`. The seed JSON in brief 046 includes SKUs with `default_price: null`.

Amazing Fencing operates across:
- **NSW** — Sydney metro
- **VIC** — Melbourne metro
- **QLD** — Brisbane metro
- **Gold Coast** — separate from Brisbane per their site

Founded ~30 years ago (~1995). Phone: 1800 739 359.

## Migration SQL

```sql
-- ============================================================================
-- 045_amazing_fencing_supplier_and_instances.sql
-- ============================================================================

-- ─── Supplier row ───────────────────────────────────────────────────────────
INSERT INTO suppliers (slug, name, brand_colour, contact_email, trust_tier, status, metadata)
VALUES (
  'amazing-fencing',
  'Amazing Fencing',
  '#0d3b66',
  NULL,
  'platform',
  'active',
  jsonb_build_object(
    'website', 'https://amazingfencing.com.au',
    'sister_site', 'https://www.fencing-supplies.com.au',
    'phone', '1800 739 359',
    'service_states', jsonb_build_array('NSW','VIC','QLD'),
    'service_metros', jsonb_build_array('Sydney','Melbourne','Brisbane','Gold Coast'),
    'business_model', 'Contractor + supplier hybrid (install business + sister supply business)',
    'founded_approx', '1995',
    'capabilities', jsonb_build_array('install','supply','custom_fabrication','multi_state'),
    'brand_partners', jsonb_build_array(
      'Gramline',
      'Lysaght',
      'Oxworks',
      'ColorMAX',
      'PermaSteel (proprietary)'
    )
  )
)
ON CONFLICT (slug) DO NOTHING;

-- ─── System instances ───────────────────────────────────────────────────────
WITH af AS (SELECT id FROM suppliers WHERE slug = 'amazing-fencing')
INSERT INTO system_instances (
  supplier_id, archetype_id, slug, name, status, readiness_status,
  trust_tier, visibility, description, metadata
) VALUES
  -- ColorBond steel (generic, multi-brand)
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'amazing-colorbond', 'Amazing Fencing — ColorBond Steel',
    'active', 'imported', 'platform', 'public',
    'Standard ColorBond steel panel fencing sourced from multiple brand partners (Gramline, Lysaght, Oxworks, ColorMAX). Available with C posts in 2.1/2.4/2.7/3.0m and sheets in 1.5/1.8/2.1/2.4m heights.',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/colorbond-fencing/',
      'brand_partners',jsonb_build_array('Gramline','Lysaght','Oxworks','ColorMAX'),
      'standard_heights_m',jsonb_build_array(1.5,1.8,2.1,2.4),
      'pricing_pending','Trade pricing PDF needed from Amazing Fencing direct'
    )),

  -- PermaSteel (their proprietary brand)
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'amazing-permasteel', 'Amazing Fencing — PermaSteel',
    'active', 'imported', 'platform', 'public',
    'PermaSteel modular fencing — Amazing Fencing''s proprietary brand. Sold as GP bundles in 1.5/1.8/2.1/2.4m heights. Distinct C-post profiles and sheet thicknesses (0.95mm posts, 0.8mm rails, 0.35mm sheets).',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/permasteel-fencing/',
      'brand','PermaSteel (proprietary)',
      'standard_heights_m',jsonb_build_array(1.5,1.8,2.1,2.4),
      'post_bm_thickness_mm',0.95,
      'rail_bm_thickness_mm',0.8,
      'sheet_bm_thickness_mm',0.35,
      'sold_as','GP bundles',
      'pricing_pending','Trade pricing PDF needed'
    )),

  -- Timber paling (treated pine, multiple styles)
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='timber-fence'),
    'amazing-timber-paling', 'Amazing Fencing — Treated Pine Paling',
    'active', 'imported', 'platform', 'public',
    'Treated pine paling fencing in Colonial / Lapped / Lapped-and-Capped / Paling styles. H3 above-ground and H4 in-ground treatment per AS 1604. Posts in 90x90 F7 (1.8-3.6m) and 125x50 (2.4-3.0m). Pickets 70x22 in 0.9-1.8m.',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/timber-fencing/',
      'styles',jsonb_build_array('colonial','lapped','lapped_and_capped','paling'),
      'compliance','AS 1604',
      'treatment_levels',jsonb_build_array('H3 above-ground','H4 in-ground'),
      'pricing_pending','Trade pricing PDF needed'
    )),

  -- Timber slat screen
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'amazing-timber-slat-screen', 'Amazing Fencing — Timber Slat Screen',
    'active', 'imported', 'platform', 'public',
    'Modern timber slat screen fencing on galvanised steel posts. Slats in treated pine OR hardwood. Boundary fencing, area screening, aesthetic screening, garden privacy screen variants. Matching steel gate frames.',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/slat-screen-fence/',
      'post_material','galvanised steel',
      'slat_options',jsonb_build_array('treated_pine','hardwood'),
      'use_cases',jsonb_build_array('boundary_fencing','area_screening','aesthetic_screening','garden_privacy_screen'),
      'pricing_pending','Trade pricing PDF needed'
    )),

  -- Chain wire / security
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='mesh-fence'),
    'amazing-chainwire-security', 'Amazing Fencing — Chain Wire & Security',
    'active', 'imported', 'platform', 'public',
    'Chain wire fencing for residential and commercial. Raw galvanised + PVC-coated options (green or black). Customisable for unusual terrain or layouts. Optional aluminium garden-fence variant.',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/chainwire-security/',
      'finishes',jsonb_build_array('galvanised','pvc_coated_green','pvc_coated_black'),
      'use_cases',jsonb_build_array('residential','commercial','security'),
      'customisable',true,
      'pricing_pending','Trade pricing PDF needed (chainwire not in the 2026-05-26 Cin7 timber export)'
    )),

  -- Retaining walls (timber sleepers — pine + hardwood)
  -- Tagged as timber-fence archetype with metadata flag; future architectural
  -- iteration could introduce a dedicated 'retaining-wall' archetype.
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='timber-fence'),
    'amazing-retaining-wall', 'Amazing Fencing — Timber Retaining Wall',
    'active', 'imported', 'platform', 'public',
    'Timber retaining walls using treated pine OR hardwood sleepers. Plantation-grown CCA pine + H4 hardwood. Multi-state install (NSW, VIC, QLD, Gold Coast). State-specific zoning compliance (QLD zoning regulations explicitly noted).',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/retaining-walls/',
      'archetype_note','Tagged as timber-fence archetype with use_case=retaining_wall; consider promoting to dedicated retaining-wall archetype in a future architectural iteration.',
      'use_cases',jsonb_build_array('correct_uneven_terrain','garden_protection','walkway_protection','reclaim_sloped_land'),
      'materials',jsonb_build_array('treated_pine_H4','treated_hardwood_H4'),
      'compliance_notes',jsonb_build_array('QLD zoning regulations vary by state','AS 1604 treated timber')
    ))
ON CONFLICT (supplier_id, slug) DO NOTHING;

-- ─── Sanity log ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_supplier UUID; v_instance_count INT;
BEGIN
  SELECT id INTO v_supplier FROM suppliers WHERE slug = 'amazing-fencing';
  IF v_supplier IS NULL THEN
    RAISE EXCEPTION 'Amazing Fencing supplier row not inserted';
  END IF;
  SELECT COUNT(*) INTO v_instance_count FROM system_instances WHERE supplier_id = v_supplier;
  RAISE NOTICE 'Amazing Fencing seeded: supplier %, % system_instances', v_supplier, v_instance_count;
END $$;
```

## Catalogue README

Create `catalogues/amazing-fencing/README.md`:

```markdown
# Amazing Fencing — source material

Supplier: Amazing Fencing (install + supply hybrid). Multi-state operations.
- Install business: https://amazingfencing.com.au
- Supply business: https://www.fencing-supplies.com.au
- Phone: 1800 739 359
- Service area: NSW, VIC, QLD (Sydney, Melbourne, Brisbane, Gold Coast)

## Product pages

| Family | Page | SKU detail | Pricing |
|---|---|---|---|
| ColorBond Steel | https://amazingfencing.com.au/products/colorbond-fencing/ + https://www.fencing-supplies.com.au/colorbond-steel-fencing-supplies/ | Full SKU list captured | TODO: obtain trade pricing PDF |
| PermaSteel (proprietary) | https://amazingfencing.com.au/products/permasteel-fencing/ | GP bundles enumerated | TODO: obtain trade pricing PDF |
| Treated Pine Paling | https://amazingfencing.com.au/products/timber-fencing/ + https://www.fencing-supplies.com.au/timber-fencing-supplies/ | Full SKU list captured | TODO: obtain trade pricing PDF |
| Slat / Screen | https://amazingfencing.com.au/products/slat-screen-fence/ | Material spec captured | TODO: obtain trade pricing PDF |
| Chain Wire / Security | https://amazingfencing.com.au/products/chainwire-security/ | Material spec captured | TODO: obtain trade pricing PDF |
| Retaining Walls | (referenced on main products page) | Out of scope — not a fence calculator | n/a |
| Fence Gates | https://amazingfencing.com.au/products/fence-gates/ | Folded into each fence family's SKU list | n/a as separate instance |

## Brand partners (under ColorBond)

- **Gramline** — common steel fence brand
- **Lysaght (BlueScope)** — premium Colorbond brand
- **Oxworks** — Colorbond manufacturer
- **ColorMAX** — Colorbond alternative
- **PermaSteel** — Amazing Fencing's proprietary modular brand

## SKU catalogue captured (no prices)

Brief 046 includes seed JSON for all five instances with the full SKU lists from
fencing-supplies.com.au. Prices are null pending trade pricing PDF.

## TODOs (block readiness promotion beyond 'imported')

- [ ] Obtain trade pricing PDF from Amazing Fencing direct (call 1800 739 359 or email)
- [ ] Confirm whether NSW / VIC / QLD inventories carry different stock — if so, may need per-region price book variants (see brief 046's multi-region note)
- [ ] Confirm relationship between install business and supply business — does the install side mark up the supply pricing?
- [ ] Walk Amazing Fencing through the verified-supplier process; on completion, demote trust_tier from `platform` to `verified` via admin UI
- [ ] Workbook regression for at least 3 configs per instance once pricing arrives
```

## PR description template

```markdown
## Brief 045 — Amazing Fencing: Supplier + System Instances

Adds Amazing Fencing as the third supplier on the platform after Glass Outlet and Discount Fencing. Multi-state install + supply hybrid operating across NSW / VIC / QLD / Gold Coast.

### What's added

- `suppliers` row: `amazing-fencing` (trust_tier `platform`, can be demoted to `verified` after verification)
- 5 `system_instances`: amazing-colorbond, amazing-permasteel, amazing-timber-paling, amazing-timber-slat-screen, amazing-chainwire-security
- `catalogues/amazing-fencing/README.md`

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Migration applies cleanly
- [ ] `NOTICE` logs the supplier UUID + 5 instances
- [ ] PR base branch is `main`
```

## Stop points

- If the brief 033 archetype seed didn't run, INSERTs here will fail on the `system_archetypes WHERE slug='...'` subqueries. Surface and fix 033 first.
- The PermaSteel proprietary brand could justify its own archetype (`tubular-fence` or `modular-steel-fence`) in a future architectural iteration. For now, `panel-fence` archetype with metadata covers it.

## After this PR merges

Brief 046 ships the SKU catalogue seed JSON for all 5 instances + a draft price book (status='draft', no items yet) ready for the trade pricing PDF to populate.

<!-- SKYBROOK-PACK-FILE-START: _briefs/00-inbox/046-amazing-fencing-seed-data-and-price-book.md -->

# Brief 046 — Amazing Fencing: Seed Data + Draft Price Book

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 045 merged + brief 034 merged (price_books table exists)
**Estimated PR size:** large (5 seed JSON files + 1 data migration for the draft price book)
**Primary reference:** `_briefs/assets/046-amazing-fencing-seeds/` (bundled with this brief) — the seed JSON files that drop into `supabase/seeds/amazing-fencing/products/`

---

## Goal

Seed the **six Amazing Fencing system_instances** (created in brief 045) with their full SKU catalogues. Liam supplied the Cin7 trade pricing export (`MassDownloadProducts_20260526_0305PM.xlsx`, 52 SKUs); this brief ships a **PUBLISHED tier2 (trade) price book** populated from `BuyPriceEx`, covering the timber-paling and retaining-wall instances. The remaining 4 instances (Colorbond, PermaSteel, slat screen, chainwire) still have pricing pending — their SKUs seed with `default_price: null` and stay at `readiness_status = 'imported'`.

This proves the architecture handles **a mixed-pricing supplier** — some instances fully priced from a Cin7 export, some pending separate PDFs from the same supplier.

**Updated 2026-05-28:** Pricing populated for timber + retaining-wall. New 6th instance (retaining wall) added.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **All `default_price` fields are `null`** in the seed components. Migration creates a DRAFT price book with zero items.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/seeds/amazing-fencing/products/colorbond.json` | NEW — products + components for ColorBond (no prices, pricing PDF still pending) |
| `supabase/seeds/amazing-fencing/products/permasteel.json` | NEW — products + components for PermaSteel modular bundles (no prices) |
| `supabase/seeds/amazing-fencing/products/timber-paling.json` | NEW — products + components for treated pine + hardwood paling, **with tier2 prices from Cin7** (40+ SKUs) |
| `supabase/seeds/amazing-fencing/products/timber-slat-screen.json` | NEW — products + components for timber slat screening (no prices) |
| `supabase/seeds/amazing-fencing/products/chainwire-security.json` | NEW — products + components for chainwire / security (no prices) |
| `supabase/seeds/amazing-fencing/products/retaining-wall.json` | NEW — pine + hardwood sleepers, **with tier2 prices from Cin7** (9 SKUs) |
| `supabase/migrations/046_amazing_fencing_trade_price_book.sql` | NEW — **PUBLISHED tier2 trade price book** with items for timber + retaining wall (BuyPriceEx from Cin7 export); pricing for other instances remains pending |
| `catalogues/amazing-fencing/source-skus-2026-05.md` | NEW — verbatim copy of the supply-side SKU lists (audit trail) |

## SKU catalogue source

Full SKU lists captured from `fencing-supplies.com.au` on 2026-05-28:

### Steel / ColorBond / PermaSteel

**Posts:**
- C Posts (PermaSteel): 2.1, 2.4, 2.7, 3.0m
- PERMA-STEEL C Posts × 0.95mm: 2.4, 2.7, 3.0m
- Coloured Posts: 50×50 in 2.4 and 3.0m; 65×65 in 2.4 and 3.0m
- P/Coated Galv Posts: 50×50 in 2.4/3.0/3.6m; 65×65 in 2.4/3.0/4.0m
- Steel Posts (generic): 50×50 in 2.4/3.0/3.6m; 65×65 in 2.4/3.0/3.6m

**Rails:**
- Rails: 2.35m, 3.10m
- PERMA-STEEL rail × 0.8mm: 2.35m, 3.10m

**Sheets:**
- Standard sheets: 1.5m, 1.8m, 2.1m, 2.4m heights
- PERMA-STEEL new-style sheets × 0.35mm: 1190mm, 1490mm, 1790mm, 2090mm, 2390mm (raked / standard)

**PermaSteel GP bundles:**
- 1.5m, 1.8m, 2.1m, 2.4m

**Gates (single):**
- Standard Single Gate GP Bundle: 0.9, 1.2, 1.5, 1.8, 2.1m
- PermaSteel Single Gate GP Bundle: 0.9, 1.5, 1.8, 2.1m
- Gate Styles: 1.2, 1.5, 1.8, 2.1m
- 50×50 P/Coated Gate Style: 1.5h, 1.8h, 2.1h

**Gates (double):**
- Standard Double Gate GP Bundle: 0.9, 1.2, 1.5, 1.8, 2.1m
- PermaSteel Double Gate GP Bundle: 1.2, 1.5, 1.8, 2.1m

**Gate hardware:**
- Butt Hinges, "D" Latch & Striker & Handle, Double set, Drop Bolt, Single set, Handle for D Latch 170mm, Anti-rattle sleeve

**Lattice:**
- Lattice Sheet 2.35m, 3.10m
- 300mm × 2.35m DIA PERMA-STEEL Lattice
- 300mm × 3.1m DIA PERMA-STEEL Lattice

**Screws:**
- Bugel (timber): 50mm, 75mm, 100mm
- Tek (metal): 20mm, 35mm, 45mm, 65mm, 75mm
- Coloured Screw SD 10-16 × 16mm Hex (each)

**Caps & accessories:**
- 100×100 Sqr Metal Cap
- 100×50 Black Plastic Cap (timber)
- Touch-up Paint

**Sleepers (steel range):**
- 150×50 in 2.4m, 3.0m
- 200×50 in 2.4m, 3.0m

### Timber

**Pickets:**
- 70×22 H3 T/P × 0.9, 1.2, 1.5, 1.8m

**Posts:**
- 90×90 H4 F7 × 1.8, 2.4, 3.0, 3.6m
- 125×50 H4 × 2.4, 3.0m

**Rails:**
- 70×35 H3 × 4.8m F7 (per each)

**Screening (per linear metre):**
- 70×22 H3 T/P DAR — per metre
- 90×22 H3 T/P DAR — per metre
- 90×19 H/W Merbau — per metre

**Pool-safe rail:**
- 75×50 H3 T/P Spliced "Pool Safe" Rail (per each)

**Lattice + lattice surround:**
- Lattice surround 70×35 H3 × 4.8m and 5.4m
- Lattice 300mm × 2.4m H3 DAR T/P (Dia and Sqr)
- Lattice 600mm × 2.4m H3 DAR T/P (Dia and Sqr)
- Lattice 600mm × 3.0m H3 DAR T/P (Dia and Sqr)

**Sleepers (timber):**
- 125×50 H4 T/P × 2.4, 3.0m
- 200×100 H4 T/P × 2.4, 3.0m

**Garden edge:**
- 100×25 H4 T/P × 4.8, 5.4m
- 150×25 H4 T/P × 4.8, 5.4m
- 200×25 H4 T/P × 4.8, 5.4m

**Hardware:**
- Dyna Bolts (galv) — 10mm × 50/60/77/97/125mm, 12mm range
- Champher and Routing (timber finishing accessory)

## Price book SQL (data migration form)

```sql
-- ============================================================================
-- 046_amazing_fencing_trade_price_book.sql
--
-- Published tier2 (trade) price book sourced from Amazing Fencing's
-- Cin7 mass-download export (BuyPriceEx column).
-- File: MassDownloadProducts_20260526_0305PM.xlsx (supplied by Liam, 2026-05-28).
-- Covers timber-paling + retaining-wall instances. Other instances'
-- pricing remains pending separate PDFs.
-- ============================================================================

WITH af AS (SELECT id FROM suppliers WHERE slug='amazing-fencing'),
     pb AS (
       INSERT INTO price_books (supplier_id, name, source_file, status, effective_from, metadata)
       VALUES (
         (SELECT id FROM af),
         'Amazing Fencing 2026-05 Trade Pricing (Cin7 timber + retaining)',
         'MassDownloadProducts_20260526_0305PM.xlsx (Cin7 mass-download export)',
         'published',
         '2026-05-01'::timestamptz,
         jsonb_build_object(
           'basis','trade',
           'currency','AUD',
           'tax_inclusive',false,
           'pricing_source','Cin7 mass-download',
           'tier_code','tier2',
           'covers',jsonb_build_array('amazing-timber-paling','amazing-retaining-wall'),
           'pending',jsonb_build_array('amazing-colorbond','amazing-permasteel','amazing-timber-slat-screen','amazing-chainwire-security')
         )
       )
       ON CONFLICT DO NOTHING
       RETURNING id
     )
INSERT INTO price_book_items (price_book_id, sku, tier_code, min_quantity, price_cents, currency)
SELECT (SELECT id FROM pb), v.sku, 'tier2', 1, v.price_cents, 'AUD'
FROM (VALUES
  -- Palings (CCA Pine 100×16)
  ('AF-PAL-100x16-1200',  33),
  ('AF-PAL-100x16-1500', 154),
  ('AF-PAL-100x16-1800', 178),
  -- AF-PAL-100x16-2100 — out of stock; no item
  ('AF-PAL-100x16-2400', 250),

  -- Paddle Pop Palings
  ('AF-PAL-PP-100x16-1200', 130),
  ('AF-PAL-PP-100x16-1500', 170),

  -- Pine Posts (CCA H4)
  ('AF-POST-PINE-100x75-1800', 1071),
  ('AF-POST-PINE-100x75-2400', 1428),
  ('AF-POST-PINE-100x75-3000', 1785),
  ('AF-POST-PINE-100x100-2400', 2568),
  ('AF-POST-PINE-100x100-3000', 3210),

  -- Hardwood Posts (H4)
  ('AF-POST-HWD-100x75-1800', 1681),
  ('AF-POST-HWD-100x75-2100', 2079),
  ('AF-POST-HWD-100x75-2400', 2243),
  ('AF-POST-HWD-100x75-2700', 2543),
  ('AF-POST-HWD-100x75-3000', 2841),
  ('AF-POST-HWD-100x100-1800', 2241),
  ('AF-POST-HWD-100x100-2400', 2988),
  ('AF-POST-HWD-100x100-2700', 3362),

  -- Pine Rails
  ('AF-RAIL-PINE-75x38-4800', 864),
  ('AF-RAIL-PINE-100x38-4800', 1152),
  ('AF-RAIL-PINE-ARR-100x38-4800', 1296),

  -- Hardwood Rails
  ('AF-RAIL-HWD-75x38-4800', 1784),
  ('AF-RAIL-HWD-100x38-4800', 2676),

  -- Nails
  ('AF-NAIL-COIL-45-9000', 5800),
  ('AF-NAIL-COIL-57-9000', 8900),
  ('AF-NAIL-COIL-45-250', 247),
  ('AF-NAIL-COIL-57-250', 380),
  ('AF-NAIL-HD-32-6000', 5000),
  ('AF-NAIL-HD-32-200', 166),
  ('AF-NAIL-SS-45-1800', 14800),

  -- Screws
  ('AF-SCR-BB-14g-75-500', 3637),
  ('AF-SCR-BB-14g-100-500', 1213),
  ('AF-SCR-BB-14g-125-500', 994),

  -- Concrete
  ('AF-CON-RAPID-30', 1104),
  ('AF-CON-POSTMIX-30', 980),
  ('AF-CON-GP-20', 668),

  -- Retaining wall sleepers (hardwood)
  ('AF-RW-SLEEPER-HWD-200x50-2400', 2498),
  ('AF-RW-SLEEPER-HWD-200x50-3000', 3140),
  ('AF-RW-SLEEPER-HWD-200x75-1800', 3000),
  ('AF-RW-SLEEPER-HWD-200x75-2400', 3749),
  ('AF-RW-SLEEPER-HWD-200x75-3000', 4861)
  -- Pine sleepers in retaining-wall.json have null price; not seeded here.
  -- Colonial Pickets also null; defer until Cin7 column lookup confirmed.
) v(sku, price_cents)
ON CONFLICT (price_book_id, sku, tier_code, min_quantity) DO NOTHING;

-- Sanity log
DO $$ DECLARE v_book UUID; v_items INT;
BEGIN
  SELECT pb.id INTO v_book FROM price_books pb
    JOIN suppliers s ON s.id = pb.supplier_id
   WHERE s.slug = 'amazing-fencing' AND pb.status = 'published' LIMIT 1;
  IF v_book IS NULL THEN
    RAISE EXCEPTION 'Amazing Fencing trade price book not created';
  END IF;
  SELECT COUNT(*) INTO v_items FROM price_book_items WHERE price_book_id = v_book;
  RAISE NOTICE 'Amazing Fencing trade price book: % items at tier2', v_items;
END $$;
```

## Tests / verification

- `npm run seed:products` succeeds for the new `supabase/seeds/amazing-fencing/products/*.json` folder
- All 5 instances have product + product_component rows after seeding
- All product_components have `default_price = NULL`
- The draft price book has zero `price_book_items` (intentional — populated later)
- `localBomCalculator.test.ts` UNCHANGED

## PR description template

```markdown
## Brief 046 — Amazing Fencing: Seed Data + Draft Price Book

Seeds the 5 Amazing Fencing instances with full SKU catalogues. Prices are null pending trade pricing PDF; draft price book created with zero items, ready to populate.

### What's added

- 5 seed JSON files: colorbond.json, permasteel.json, timber-paling.json, timber-slat-screen.json, chainwire-security.json
- Migration 046: draft `price_books` row + 0 `price_book_items` (intentional)
- Seed loader extended to handle `supabase/seeds/amazing-fencing/` folder

### What's NOT added (pending)

- Pricing — needs Amazing Fencing's trade pricing PDF
- Workbook regression — needs pricing first

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run seed:products` ingests `amazing-fencing/` folder cleanly
- [ ] 5 instances have products + components after seed
- [ ] All `default_price` are NULL on amazing-fencing components
- [ ] Draft price book exists with 0 items
- [ ] PR base branch is `main`
```

## Stop points

- If the seed loader doesn't enumerate supplier folders (currently hardcoded to `glass-outlet/`), surface and adjust to walk `supabase/seeds/*/products/*.json`. Same stop-point already identified in brief 043.
- If `pricing_rules.supplier_id` (added in brief 032) hasn't been backfilled by brief 033 by the time 046 runs, surface — the fallback path in `resolve_price_cents` may not scope by supplier correctly.

## After this PR merges

- Amazing Fencing's 5 instances appear in the calculator picker (per brief 035's admin UI / brief 044's visibility rules)
- All instances at `readiness_status = 'imported'`
- A draft price book exists; populating it is the next manual step once Liam obtains the trade pricing PDF
- Workbook regression (brief 038) can run once 3-5 representative job configs from Amazing Fencing's order workflow are available

<!-- SKYBROOK-PACK-FILE-START: _briefs/03-paused/production-cutover-runbook.md -->

# Production Cutover Runbook (paused — execute when ready)

**Status:** PAUSED — Liam decides when to execute
**Goal:** point the production Netlify site `tiny-kangaroo-8f7016` at the new repo `quickscreen-colorbond-generator` instead of the original `quickscreen-bom-generator`

---

## When to execute this

Recommended trigger: **after brief 038 merges** (workbook regression infrastructure exists, you trust the platform) AND **before brief 043 merges** (Discount Fencing goes live for your customers).

Earlier than 038 = risk shipping unverified BOMs to real customers. Later than 043 = Discount Fencing seeded but Glass Outlet's customers are still hitting the old repo and won't see DF.

Reasonable cutover candidates:
- After brief 038 — earliest safe cutover
- After brief 041 — full multi-supplier authoring + community path is in
- After brief 044 — visibility layer in place (cleanest end state)

If your existing Glass Outlet customers are running quotes that need pricing accuracy guaranteed during the cutover window, do the cutover during a low-traffic window (typically Saturday morning in Australia).

---

## Pre-cutover checklist

- [ ] All briefs through your chosen cutover point are merged on `main`
- [ ] Migrations have been applied to the production Supabase project
- [ ] `npm run seed:products` has been run against the production Supabase project
- [ ] Smoke test on the new repo's Netlify deploy preview: load 3 Glass Outlet quote types, generate a BOM, confirm pricing matches the current production
- [ ] Customer mode toggle still works
- [ ] PWA install + offline mode still work on iPhone Safari deploy preview
- [ ] The original repo's last commit hash is recorded as a rollback target

## Cutover procedure

### Option A — Re-point existing Netlify project (recommended)

1. In the Netlify UI (`tiny-kangaroo-8f7016`), go to Site settings → Build & deploy → Repository
2. Change the linked repository from `skybrook-tech/quickscreen-bom-generator` to `skybrookai-atlas/quickscreen-colorbond-generator`
3. Set production branch to `main` (not `master`)
4. Trigger a manual deploy
5. Verify the production URL (your tradies' bookmark) now serves the new repo
6. Verify all environment variables (Supabase URL, Google Maps key, etc.) are present

### Option B — New Netlify project + DNS swap

If you'd rather build confidence on a parallel deployment first:

1. Create a new Netlify project pointing at `skybrookai-atlas/quickscreen-colorbond-generator` (default branch `main`)
2. Configure all env vars matching the existing project
3. Wait until ready
4. Update DNS to point the production URL at the new Netlify project
5. Decommission `tiny-kangaroo-8f7016` after a 1-2 week confidence window

Option B is safer (instant DNS rollback). Option A is simpler.

## Post-cutover verification

- [ ] Production URL serves the new repo (confirm via inspect → service worker → cache name reflects new repo)
- [ ] An existing customer's saved quote loads and re-prices to the same total as before cutover
- [ ] A new quote creates correctly and saves to the production Supabase project
- [ ] PDF generation works on iPhone Safari
- [ ] Customer mode still hides cost columns
- [ ] No 4xx/5xx errors in Netlify function logs for ~24 hours post-cutover

## Rollback procedure (if needed)

### From Option A

1. In Netlify UI, change repository back to `skybrook-tech/quickscreen-bom-generator`, branch `master`
2. Trigger manual deploy
3. Verify production URL is serving the old repo again

Rollback window: data divergence depends on what changed between old and new Supabase. If both repos hit the same Supabase project, data is the same; if migrations are not backward-compatible (e.g. brief 032's new tables), the old repo just doesn't see them — non-breaking. **Brief 032's schema is additive (nullable columns + new tables); old repo continues to work against it.**

### From Option B

1. Update DNS back to the old Netlify project
2. Done

---

## Things this runbook does NOT cover

- Domain/SSL changes (assumed: production URL stays the same; only the underlying Netlify project changes)
- Supabase project changes (assumed: same project)
- Customer communication (probably no email needed — cutover is invisible to customers if done right)
- Analytics / observability (separate setup; whatever you have on the current project carries over via Option A, or needs to be re-wired in Option B)

---

## Why this isn't a Codex brief

Codex can't sign in to Netlify or change DNS. This is a Liam-only action. The runbook documents the steps so you don't have to think about them when the time comes.

---

## When you execute this, also...

- Update `_briefs/INVENTORY.md` to record the cutover date
- Update `docs/system-authoring-process.md` Decision log
- Archive the original repo `skybrook-tech/quickscreen-bom-generator` (mark as read-only on GitHub) once the new repo is stable for 2+ weeks
- Notify any Codex agents on the old repo that PRs from there are no longer the production path

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/030a-MASTER-BRIEF.md -->

# MASTER-BRIEF — Codex Orchestration Prompt (quickscreen-colorbond-generator)

**Paste this to a fresh Codex desktop session whenever you want to advance the brief queue.**

You are the resident Codex agent on `github.com/skybrookai-atlas/quickscreen-colorbond-generator` (default branch `main`, NOT `master`). Your job is to pick up the lowest-numbered brief from `_briefs/00-inbox/`, execute it in full, and open a **draft PR**. You stop at the first hardcoded stop point.

---

## How to pick the next brief

1. List files in `_briefs/00-inbox/` sorted lexicographically.
2. Read the lowest-numbered brief.
3. Check `Depends on:` at the top.
   - If it references an unmerged PR or a brief still in `00-inbox`/`01-in-progress`, **STOP** and exit with the message: "Brief NNN depends on MMM; MMM not yet merged. Re-paste after MMM is merged."
   - If all deps are satisfied, proceed.
4. Move the brief file to `_briefs/01-in-progress/` as your first commit.
5. Execute the brief verbatim, per its hard rules.
6. Open a **draft PR** with the brief's PR description template.
7. Move the brief to `_briefs/02-done/` (do NOT delete it).
8. Loop back to step 1.
9. When `_briefs/00-inbox/` is empty, stop with the message: "Inbox empty."

---

## Hard rules every brief observes (do not override unless a brief explicitly says so)

- **PR base branch is `main`**, NOT `master`. Verify in the GitHub UI before opening.
- **Draft PR only.** Never set the PR to ready-for-review and never auto-merge.
- **`src/lib/localBomCalculator.ts` must not be modified.** Its public signature and behaviour are the BOM regression guard.
- **`src/lib/localBomCalculator.test.ts` must pass UNCHANGED** in every brief PR. If it doesn't pass, you have broken something — fix it before opening the PR.
- **`src/components/canvas/canonicalAdapter.ts` public function signatures must not change.**
- **`src/components/canvas/canvasEngine.ts` public types must not change** except where a brief explicitly authorises it.
- **Skip the Deno integration job.** Known red on the XP-BTP-B fixture; pre-existing, out of scope.
- **Use npm 10.x** when touching `package-lock.json`. The repo's `engines` declares Node 20 / npm 10.
- **No two briefs in flight on the same hot file** (`CalculatorV3Page.tsx`, `FenceLayoutCanvas.tsx`, central seed files). The strict-sequential `Depends on:` rule is what prevents bad-merge regressions — respect it.
- **After merge: run `npm run seed:products`** if a brief touched seed JSON. The edge function reads from Postgres, not from repo JSON.

---

## Stop points (mandatory pauses for human review)

Stop and exit (do not proceed to the next brief) when any of these happen:

- A `Depends on:` reference is unsatisfied.
- A brief has an explicit **Stop point** section that triggers (e.g. "if `auth_org_id()` differs from migration 025, surface and pause").
- A test suite fails after a reasonable fix attempt.
- An ALTER TABLE / DROP statement would touch existing live data.
- A migration would replace a file in the protected list.
- You cannot determine the correct base branch.

---

## Reference docs (read before you execute)

Inside the repo:

- `docs/multi-supplier-platform-architecture.md` — the 5-layer model (Geometry / Catalogue / Rules / Pricing / Visibility). The source of truth for all architectural questions.
- `docs/system-authoring-process.md` — the three-tier identity model (supplier / archetype / instance), authoring workflow, trust tiers, brief sequence 032-043.
- `docs/calculator-architecture-tradeoffs.md` — Approach A (server-side BOM via `bom-calculator` edge function) is the canonical execution path. The new architecture builds on this — do NOT re-decide it.
- `docs/catalogue-gap-analysis.md` — SKU and rule gaps that drive the first wave of seed data.
- `docs/seed-data-mapping-spec.md`, `docs/canonical-payload.md`, `docs/engine-schema.md` — existing contracts that any new schema must extend (not replace).

If a brief and one of these docs disagree, **the doc wins**. Surface the conflict in the PR description; do not silently diverge.

---

## Existing protected paths (reference list)

| Path | Why |
|---|---|
| `src/lib/localBomCalculator.ts` | BOM regression guard |
| `src/lib/localBomCalculator.test.ts` | Must pass unchanged |
| `src/components/canvas/canonicalAdapter.ts` | Public signatures stable |
| `src/components/canvas/canvasEngine.ts` | Public types stable |
| `supabase/functions/bom-calculator/` | Canonical server-side BOM engine |
| `package.json` | Touch only when strictly necessary; npm 10.x for lockfile changes |
| Migrations `001` through `031` | Already applied; new work uses `032+` |

---

## PR style

- One brief per PR. **No stacked branches with multiple logical changes.**
- Branch name: `codex/brief-NNN-<short-slug>` (matches existing convention).
- PR title: `Brief NNN — <title>`.
- PR description: use the template at the bottom of the brief file.
- Mark the PR as **draft** before opening.
- Liam reviews on iPhone via the Netlify deploy preview (`deploy-preview-XX--tiny-kangaroo-8f7016.netlify.app`) and merges in the GitHub web UI.

---

## After a brief merges

The brief author has listed the post-merge actions in the brief itself (typically: run `npm run seed:products`, re-point Netlify, etc.). Do not skip them — they are part of the brief, not optional cleanup.

---

## Working folder convention

```
_briefs/
├── 00-inbox/          ← queued; you pick from here
├── 01-in-progress/    ← max 1 file; you put your current brief here
├── 02-done/           ← briefs whose PRs are open or merged
├── 03-paused/         ← blocked; needs Liam attention
├── assets/            ← binary assets bundled with briefs
├── MASTER-BRIEF.md    ← this file
└── INVENTORY.md       ← status table (you keep this in sync with reality)
```

Update `INVENTORY.md` when you open or close a brief. Cosmetic, but Liam reads it.

---

## When you finish a pass

Print a short summary:

```
Brief NNN — opened draft PR #X (or: STOPPED at brief NNN because Y)
Next: brief MMM (waiting on Z) or "Inbox empty"
```

That's it. Re-paste this MASTER-BRIEF to continue.

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/030a-multi-supplier-platform-architecture.md -->

# Multi-Supplier Platform Architecture

> **Source of truth for the QuickScreen platform's evolution from a single-supplier calculator into a multi-supplier catalogue platform.** All future Codex briefs reference this document. If a brief and this doc disagree, this doc wins until updated here first.

**Status:** Draft v1
**Last updated:** 2026-05-26
**Authors:** Liam Boyd, plus architectural synthesis from Hyperagent thread (Codex + developer consultation)
**Audience:** Codex agents, future developers, SkyBrookAI dev org
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator` (forked from `skybrook-tech/quickscreen-bom-generator` 2026-05-26, default branch `main`)

## Relationship to existing docs

This architecture **extends** the decisions in two existing documents in this repo. It does not re-decide them.

- **`docs/calculator-architecture-tradeoffs.md`** — already chose **Approach A (server-side BOM via `bom-calculator` Supabase Edge function + Postgres-driven seeds)** as the canonical production path, with client-side calculation explicitly marked non-authoritative. Every layer described below operates inside that decision.
- **`docs/catalogue-gap-analysis.md`** — already enumerates the SKU and rule gaps that need to flow into the new catalogue schema. The first wave of seed data after brief 030 lands comes from this gap analysis (QSHS coloured SKUs, XPL extrusions, QS_GATE rails, BAYG Island Grey, ColorBond, sliding gate system, Alumawall).
- **`docs/seed-data-mapping-spec.md`**, **`docs/canonical-payload.md`**, **`docs/engine-schema.md`** — current contracts that the catalogue schema must extend cleanly without breaking.
- **`catalogues/`** — source-of-truth PDFs and text extractions Liam is feeding into the gap analysis and eventually the staging-and-publish pipeline.

If this doc and one of those disagree, the question is whether to update this doc or the other — never silently diverge.

---

## Executive Summary

The current QuickScreen app is a single-supplier (Glass Outlet) BOM calculator. It works in production and serves Glass Outlet's product range well. To grow into a platform that supports hundreds of products across many suppliers and systems, the architecture has to shift from **"the calculator that has products added to it"** to **"a catalogue platform with a calculator on top."**

This is a mindset shift, not just a refactor. The calculator becomes one consumer of catalogue data, not the system that owns the data.

The architecture has **five layers**:

1. **Geometry** — universal, hardcoded. Runs, segments, gates, corners, canvas behaviour, canonical payloads. Same for every supplier.
2. **Catalogue** — fully data-driven. Suppliers, systems, product families, SKUs, colours, profiles, heights, accessories, documents, diagrams.
3. **System Rules** — hybrid, three tiers. Reusable rule templates for simple systems, data-driven math for medium-complexity systems, custom code modules behind a stable interface for unusual systems.
4. **Pricing & Price Books** — versioned, with status lifecycle (draft / reviewed / published / archived). Quotes remember which price book version they used, so old quotes never silently drift.
5. **Visibility & Access** — first-class. Backend-resolved rules for which suppliers, systems, and products each user sees. Not frontend `if` statements.

The rollout is **admin-first then self-serve**: Liam ingests supplier price lists via an admin workflow today; the data model and APIs are designed so suppliers can self-serve their own uploads in phase two without retrofit.

The deliverable from this architecture is a phased migration that ships as a series of Codex briefs, each respecting the protected files (`localBomCalculator.ts`, `canonicalAdapter.ts` public signatures, `canvasEngine.ts` public types) and the strict-sequential dependency rule that has prevented bad-merge regressions.

---

## Current State Audit

### What is already data-driven (good — keep extending this)

- **Supabase tables** for products, product_variables, product_rules, selectors, companion rules, warnings, pricing rules (v3 rule tables)
- **Seed JSON** at `supabase/seeds/{supplier}/products/{family}.json` for the structured product catalogue
- **Schema-driven form rendering** via `SchemaDrivenForm.tsx` — pure renderer that reads field definitions and produces UI without per-system hardcoding
- **Canonical form** as a stable contract between UI, canvas, and BOM calculator

### What still forces code changes (the problem we are solving)

- **`src/lib/productOptionRules.ts`** — per-system option logic still in TypeScript. Adding a new system means editing this file.
- **`src/lib/localBomCalculator.ts`** — 1334 lines of BOM rules embedded in code. Some logic genuinely needs to be code (algorithmic edge cases); much of it is parametric and could be data.
- **Hardcoded UI metadata** — labels, helper text, option ordering, group headings sometimes live in code rather than per-product data
- **Hardcoded supplier visibility** — Glass Outlet is the only supplier; there is no real visibility/scoping layer yet
- **Pricing model is too thin** — `(sku, tier_code)` keyed pricing without effective dates, status, or version history
- **No import pipeline** — supplier updates today happen by editing seed JSON files by hand
- **No QA / readiness tracking** — no formal lifecycle for "is this system ready to ship?"

### Scaling pain points concretely

- Adding ColorBond (panel-based fencing) today requires: a new seed JSON, new option rules in `productOptionRules.ts`, new BOM branches in `localBomCalculator.ts`, and UI updates to surface the new system. That is ~4 files changed and the `if (system === 'ColorBond')` anti-pattern starts to take hold.
- Updating Glass Outlet pricing today means editing seed JSON manually. There is no diff view, no review step, no rollback, and no history of what price was used on which quote.
- Hiding discontinued products requires a code deploy.
- Restricting a customer to a subset of suppliers (B2B scenario) is not possible without code.

The architecture below resolves all of these.

---

## The 5-Layer Model

### Layer 1: Geometry (stays hardcoded)

**Responsibilities:**

- Fence runs, segments, gates, corners, terminations
- Layout canvas behaviour (drawing, zoom, undo/redo, touch gestures)
- Heights, widths, and other dimensional inputs
- Canonical payload shape — the contract every other layer reads from
- Quote payload structure persisted to Supabase

**What stays in code:**

- `src/components/canvas/canvasEngine.ts` (internal coordinate refactor allowed, public types stable)
- `src/components/canvas/canonicalAdapter.ts` (signatures stable across V2/V3/V4)
- `src/components/canvas/FenceLayoutCanvas.tsx`
- All canvas toolbars, gesture handlers, and overlay components
- Canonical form TypeScript types and Zod schemas

**Why:** This is the "shape of a job." It is supplier-agnostic and changes only when the platform itself evolves (e.g., adding a new geometric primitive). It is also where physics, UX, and platform-level performance live — none of that belongs in data.

### Layer 2: Catalogue (data-driven)

**Responsibilities:**

- Suppliers
- Systems / product families
- Products / SKUs / components
- Colours, finishes, profiles
- Heights, widths, slat sizes, gap presets, post types
- Accessories (gates, end posts, brackets, hardware)
- Documents (installation guides, spec sheets)
- Diagrams (component-numbered images for "what is this part?")
- Compatibility relationships (which gates work with which systems)

**Where it lives:** Supabase tables (canonical), seed JSON (development + version control + initial import), admin UI for editing (phase 2).

**What stays in code:**

- The schemas (TypeScript types + Zod validators) for these entities
- Query / mutation helpers
- Migration files

**Why data-driven:** This is where supplier diversity lives. Glass Outlet has slat-based systems; ColorBond will be panel-based; future suppliers will have their own taxonomies. Forcing this into code creates `if (system === X)` branches that compound over time.

### Layer 3: System Rules (hybrid, three tiers)

**Responsibilities:**

- BOM calculation logic per system
- Component selection (which SKUs feed into a segment of length L at height H)
- Quantity formulas (how many sheets per bay, how many posts per run, etc.)
- Warning/optional/suggested rules
- Cut-list generation

**Three tiers** (this is the most important section of the doc — read carefully):

#### Tier 3a: Reusable rule templates

For systems that share patterns (e.g., QSHS / VS / XPL all share gate compatibility logic and slat-based BOM math), define **rule templates** — parameterised formulas with named placeholders:

```yaml
template: slat_count_per_segment
formula: ceil((segment_width_mm - 2 * post_diameter_mm) / (slat_width_mm + gap_mm))
parameters:
  post_diameter_mm: from products[type=post].diameter
  slat_width_mm: from products[type=slat].width
  gap_mm: from system.default_gap_mm
```

Instances of the template bind concrete data. New systems that match a known pattern get a template binding instead of new code.

#### Tier 3b: Data-driven math (current v3 engine)

For systems with system-specific but expressible math, define rules directly in the product_rules / pricing_rules tables. This is what the current v3 engine already does and should be extended.

```yaml
rule: bay_screw_count
input: bay_width_mm
output_sku: GO-SCREW-50
formula: ceil(bay_width_mm / 600) * 2
taxonomy: auto_add
```

#### Tier 3c: Custom code modules behind a stable interface

For systems with truly unusual logic that resists expression as a formula (e.g., conditional channel-post placement that depends on terrain or a particular supplier's quirky install rule), allow a **per-system code module** with a stable interface:

```typescript
// src/lib/bom/systems/colorbond.ts
export const colorbondRules: SystemRuleModule = {
  systemId: 'colorbond',
  computeBomForSegment(segment, context): BomLine[] { ... },
  computeBomForRun(run, context): BomLine[] { ... },
  computeBomForJob(job, context): BomLine[] { ... },
};
```

A dispatcher at `src/lib/bom/index.ts` routes by `systemId` to the right module. The dispatcher reads the `system` row from the catalogue layer (which declares `rule_strategy: 'template' | 'data' | 'custom_module'` and the relevant binding/template/module name) and applies the right tier.

**Preserving the BOM rule taxonomy:** The existing taxonomy of `auto_add / suggested / optional / warning` is preserved across all three tiers. Every rule, whether template, data, or code, produces line items tagged with one of these taxonomies. UI rendering and customer mode behaviour depend on this taxonomy.

**Why hybrid:** Pure data is too brittle for algorithmic edge cases. Pure code is too inflexible for the scale we want (hundreds of products). The three-tier approach lets simple cases stay declarative and complex cases stay maintainable.

### Layer 4: Pricing & Price Books (data-driven, versioned)

**Responsibilities:**

- Per-supplier, per-SKU pricing
- Quantity breaks
- Trade tier discounts
- Effective dates (when did this price apply?)
- Status lifecycle (draft / reviewed / published / archived)
- Quote-level pinning (which version did this quote use?)

**Schema:**

```sql
CREATE TABLE price_books (
  id uuid PRIMARY KEY,
  supplier_id uuid REFERENCES suppliers(id),
  name text NOT NULL,              -- e.g. "Glass Outlet 2026 Q2 Trade Pricing"
  source_file text,                -- original workbook filename / URL
  effective_from timestamp,
  effective_to timestamp,          -- null = current
  status text CHECK (status IN ('draft','reviewed','published','archived')),
  created_at timestamp DEFAULT now(),
  published_at timestamp,
  published_by uuid REFERENCES users(id),
  metadata jsonb                   -- importer notes, tier mappings, etc.
);

CREATE TABLE price_book_items (
  id uuid PRIMARY KEY,
  price_book_id uuid REFERENCES price_books(id),
  sku text NOT NULL,
  tier_code text,                  -- e.g. 'trade_1', 'trade_2', 'rrp'
  min_quantity int DEFAULT 1,
  price_cents int NOT NULL,
  currency text DEFAULT 'AUD',
  UNIQUE(price_book_id, sku, tier_code, min_quantity)
);

ALTER TABLE quotes ADD COLUMN price_book_version_id uuid REFERENCES price_books(id);
```

**Quote pinning:** When a quote is saved, the `price_book_version_id` of the active published book is captured. Recalculating an old quote uses the pinned version. This means a quote sent in March doesn't silently change in May when the supplier issues a new price list.

**Why separate from catalogue:** Catalogue changes infrequently (a supplier adds a new SKU or discontinues an old one a few times a year). Pricing changes frequently (weekly is normal for some suppliers). They need different update cadences, different review workflows, and different ownership.

### Layer 5: Visibility & Access (data-driven, first-class)

**Responsibilities:**

- Which suppliers does this user / organisation see?
- Which systems are visible to which customer group?
- Which products are active / hidden / draft / discontinued / internal-only?
- Which products are available in which region (depot-based)?

**Schema:**

```sql
CREATE TABLE supplier_visibility (
  id uuid PRIMARY KEY,
  supplier_id uuid REFERENCES suppliers(id),
  scope_type text CHECK (scope_type IN ('global','org','user','customer_group','region')),
  scope_id text,                   -- null for global, org_id for org, etc.
  visible boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE TABLE system_visibility (
  -- analogous to supplier_visibility
);

CREATE TABLE product_visibility (
  -- analogous to supplier_visibility
);

-- Product-level status flag (separate concern from visibility)
ALTER TABLE products ADD COLUMN status text
  CHECK (status IN ('active','hidden','draft','discontinued','internal_only'))
  DEFAULT 'active';
```

**Resolution:** Backend resolves visibility at query time. The frontend asks "what systems can this user see?" and the backend returns the filtered list. The frontend never carries `if user.org === X` logic.

**Why first-class:** B2B platforms inevitably need scoping. Glass Outlet is the obvious example today, but the moment a second supplier signs on, you need "show ColorBond only to customers who have agreed to ColorBond pricing terms." This is impossible without a visibility layer and painful to retrofit later.

---

## What Stays Hardcoded (explicit list)

These belong in code and should never become data:

- Authentication, session, RLS policies
- Canvas / layout / drawing behaviour
- Canonical payload shape (TypeScript types + Zod)
- Generic form renderer (`SchemaDrivenForm.tsx`)
- Generic BOM table component
- Quote workflow and lifecycle
- PDF generation layout (template structure; per-row content is data)
- CSV export layout
- Save / load quote mechanics
- Rule evaluator engine (the dispatcher + template runner; the rules themselves are data)
- Import pipeline code (the staging-and-diff machinery; the data flowing through it is data)
- Regression tests
- Stable calculator APIs (`canonicalAdapter.ts` signatures, `canvasEngine.ts` public types)

## What Moves Into Data (explicit list)

These belong in Supabase / seed files and should never be hardcoded:

- Supplier names and metadata
- Systems and product families
- Products / SKUs / components
- Colours, finishes, profiles
- Heights, widths, slat sizes, gap presets, post types
- Accessories
- Component diagrams / installation guides / spec sheets
- BOM rules (as templates, data-driven math, or pointers to code modules — but the routing is data)
- Compatibility relationships (which gate works with which system)
- Warnings, install notes, suggested upgrades
- Product availability per region / depot
- Pricing (all of it — base, tiered, quantity-broken, regional)
- Price book history
- Supplier / system / product visibility rules
- Capability flags (see below)

---

## Catalogue Schema (full)

### Core tables

```sql
CREATE TABLE suppliers (
  id uuid PRIMARY KEY,
  slug text UNIQUE NOT NULL,        -- e.g. 'glass-outlet'
  name text NOT NULL,
  logo_url text,
  brand_color text,
  metadata jsonb,
  created_at timestamp DEFAULT now()
);

CREATE TABLE systems (
  id uuid PRIMARY KEY,
  supplier_id uuid REFERENCES suppliers(id),
  slug text NOT NULL,               -- e.g. 'quickscreen-horizontal-slat'
  name text NOT NULL,
  family text NOT NULL,             -- 'slat-based', 'panel-based', 'mesh', 'glass'
  rule_strategy text CHECK (rule_strategy IN ('template','data','custom_module')),
  rule_binding text,                -- template name, ruleset id, or module id
  description text,
  metadata jsonb,
  status text DEFAULT 'active',
  UNIQUE(supplier_id, slug)
);

CREATE TABLE product_families (
  id uuid PRIMARY KEY,
  system_id uuid REFERENCES systems(id),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  metadata jsonb
);

CREATE TABLE products (
  id uuid PRIMARY KEY,
  product_family_id uuid REFERENCES product_families(id),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  type text,                        -- 'slat', 'post', 'rail', 'screw', 'gate', etc.
  status text DEFAULT 'active',
  metadata jsonb,                   -- dimensions, weight, etc.
  created_at timestamp DEFAULT now()
);

CREATE TABLE product_options (
  id uuid PRIMARY KEY,
  product_id uuid REFERENCES products(id),
  option_type text NOT NULL,        -- 'colour', 'finish', 'profile', 'height'
  value text NOT NULL,
  display_order int DEFAULT 0,
  metadata jsonb
);

CREATE TABLE compatibility (
  id uuid PRIMARY KEY,
  parent_product_id uuid REFERENCES products(id),
  child_product_id uuid REFERENCES products(id),
  relation text NOT NULL,           -- 'requires', 'compatible_with', 'replaces'
  metadata jsonb
);

CREATE TABLE documents (
  id uuid PRIMARY KEY,
  system_id uuid REFERENCES systems(id),
  product_id uuid REFERENCES products(id),
  doc_type text,                    -- 'install_guide', 'spec_sheet', 'warranty', 'diagram'
  url text NOT NULL,
  metadata jsonb
);
```

### Capability flags (next section)

The above plus capability flags (see Capability Model section) form the full catalogue schema.

---

## Capability Model

Per-system and per-product capability flags so the UI knows what to render without hardcoding:

```sql
CREATE TABLE system_capabilities (
  system_id uuid REFERENCES systems(id) PRIMARY KEY,
  supports_gates boolean DEFAULT true,
  supports_canvas boolean DEFAULT true,
  supports_voice_input boolean DEFAULT true,
  has_install_diagram boolean DEFAULT false,
  uses_colourbond_profiles boolean DEFAULT false,
  requires_cut_list boolean DEFAULT false,
  requires_height_picker boolean DEFAULT true,
  uses_slat_calculator boolean DEFAULT false,
  metadata jsonb
);

CREATE TABLE product_capabilities (
  product_id uuid REFERENCES products(id) PRIMARY KEY,
  has_diagram boolean DEFAULT false,
  has_install_video boolean DEFAULT false,
  is_consumable boolean DEFAULT false,
  metadata jsonb
);
```

The UI reads capability flags to decide which form sections, calculator modes, and product pickers to surface. New capabilities can be added by inserting a column (schema migration) — UI then enables them via data flag, not code branch.

---

## Visibility & Access Schema

(Already shown above in Layer 5.)

**Resolution at query time:**

```typescript
// Conceptual: backend resolves what the user sees
async function listVisibleSystems(userId: string): Promise<System[]> {
  const userOrg = await getOrgForUser(userId);
  return supabase.rpc('list_visible_systems', { user_id: userId, org_id: userOrg });
}
```

The RPC function applies all visibility rules in order of specificity (user > org > customer_group > region > global default). No frontend `if` statements.

---

## Pricing & Price-Book Schema

(Already shown above in Layer 4.)

**Effective price lookup at quote time:**

```sql
-- Pseudocode for the lookup
SELECT pbi.price_cents
FROM price_book_items pbi
JOIN price_books pb ON pb.id = pbi.price_book_id
WHERE pb.supplier_id = $supplier_id
  AND pbi.sku = $sku
  AND pbi.tier_code = $user_tier
  AND pb.status = 'published'
  AND pb.effective_from <= now()
  AND (pb.effective_to IS NULL OR pb.effective_to > now())
  AND pbi.min_quantity <= $quantity
ORDER BY pbi.min_quantity DESC
LIMIT 1;
```

The active published book for the supplier at the moment of quote creation is the pinned version (stored on the quote row).

---

## Three-Tier Rule Storage (deep dive)

### When to use each tier

| Situation | Tier | Example |
|---|---|---|
| New system uses a known calculation pattern | **Template (3a)** | QSHS, VS, XPL all share slat-counting logic — define one template, bind three instances |
| System has unique but expressible math | **Data (3b)** | A supplier's specific bay-screw count formula |
| System has algorithmic logic that resists data expression | **Custom module (3c)** | ColorBond's panel placement with terrain-dependent fasteners |

### Template format (proposed)

Templates live in `src/lib/bom/templates/` as TypeScript files (so they get type-checking and tooling), but they are **declarative** — they describe formulas, not procedures.

```typescript
// src/lib/bom/templates/slat-counting.ts
export const slatCountingTemplate: RuleTemplate = {
  id: 'slat_counting_v1',
  describes: 'Slat count per segment for slat-based systems',
  inputs: {
    segment_width_mm: 'number',
    post_diameter_mm: 'number from products[type=post].diameter',
    slat_width_mm: 'number from products[type=slat].width',
    gap_mm: 'number from system.default_gap_mm',
  },
  formula: 'ceil((segment_width_mm - 2 * post_diameter_mm) / (slat_width_mm + gap_mm))',
  output: { sku: 'from products[type=slat].sku', taxonomy: 'auto_add' },
};
```

Catalogue rows bind templates:

```sql
INSERT INTO system_rule_bindings (system_id, template_id, parameter_overrides)
VALUES ('uuid_for_qshs', 'slat_counting_v1', '{"gap_mm": 12}');
```

### Custom module interface

```typescript
// src/lib/bom/index.ts
import { SystemRuleModule } from './types';
import { colorbondRules } from './systems/colorbond';
import { qshsRules } from './systems/qshs';
// etc.

const moduleRegistry: Record<string, SystemRuleModule> = {
  colorbond: colorbondRules,
  qshs: qshsRules,
  // ...
};

export function computeBom(canonical: CanonicalForm, context: Context): BomResult {
  const system = lookupSystem(canonical.systemId);
  switch (system.rule_strategy) {
    case 'template': return computeFromTemplate(canonical, system, context);
    case 'data':     return computeFromDataRules(canonical, system, context);
    case 'custom_module': return moduleRegistry[system.rule_binding].computeBomForJob(canonical, context);
  }
}
```

### Preserving the BOM rule taxonomy

Every rule output, regardless of tier, produces a `BomLine` tagged with one of:

- `auto_add` — added without prompting
- `suggested` — added by default but user can remove
- `optional` — not added by default, surfaced as a recommendation
- `warning` — not added, but flagged as something the installer should think about

This taxonomy is **not** going to change. UI components, customer mode logic, and PDF formatting all depend on it. Templates and data rules and custom modules all emit `BomLine` with `taxonomy: ...`.

### Where `localBomCalculator.ts` fits

`localBomCalculator.ts` becomes the **template + data rule runner**. Custom modules are imported and dispatched. The public function signature stays unchanged (`computeBom(canonical) → BomResult`). The internals refactor to dispatch through the new system, but the regression test suite (`localBomCalculator.test.ts`) continues to pass unchanged because the function signature and behaviour for existing Glass Outlet inputs is identical.

This is the protection strategy — the file evolves internally while the contract stays stable.

---

## Import & Review Pipeline

The pipeline that takes a supplier's update (workbook, CSV, PDF) and turns it into a published catalogue + price book.

### Stages

1. **Source** — supplier sends a workbook, CSV, or PDF. **The workbook is the trust anchor.** Excel formulas are pre-validated against real jobs before being entered into staging. This is established practice and must be preserved.
2. **Parse** — automated parser extracts rows into staging tables (`staging_products`, `staging_prices`). Parser is per-source-format (one for Glass Outlet's workbook, one for ColorBond's CSV, etc.).
3. **Map** — staging rows are mapped to canonical SKUs / products. Unmapped rows surface as "needs review" for human resolution.
4. **Diff** — staged catalogue is diffed against the currently published one: new SKUs, changed prices, removed items, changed metadata. Diff view is the human review surface.
5. **Approve** — human (Liam today; supplier in phase two) approves the diff. Each item can be approved/rejected individually.
6. **Publish** — a new price book row is created with `status = 'published'`, old published book moves to `archived` (but stays accessible for historical quote lookups). Catalogue changes are applied. Quotes created from this moment forward pin to the new book.

### Self-serve path (phase two)

The schema and APIs support self-serve from day one. The phase-two work is just the supplier-facing UI:

- Supplier logs in to their portal
- Uploads workbook
- Sees their own staging diff
- Submits for SkyBrookAI review (or auto-publishes within their scope, depending on trust tier)

### Workbook-as-source-of-truth

The pipeline never lets supplier uploads write straight into live catalogue / pricing tables. All updates flow through staging → diff → review → publish. This is non-negotiable.

---

## QA & Readiness Dashboard

Each system tracks its own lifecycle state so the team knows what is shippable:

```sql
ALTER TABLE systems ADD COLUMN readiness_status text
  CHECK (readiness_status IN (
    'draft',                  -- created, not ready
    'imported',               -- catalogue data loaded, not yet calculator-ready
    'calculator_ready',       -- BOM rules wired up, tested in isolation
    'price_checked',          -- price book validated against supplier workbook
    'spreadsheet_tested',     -- BOM output cross-checked against Excel for sample jobs
    'approved'                -- ready for tradies to use in production
  ))
  DEFAULT 'draft';

ALTER TABLE systems ADD COLUMN readiness_notes text;
ALTER TABLE systems ADD COLUMN approved_by uuid REFERENCES users(id);
ALTER TABLE systems ADD COLUMN approved_at timestamp;
```

Surface this in an internal admin dashboard. Systems below `approved` are not shown to tradies (except admins in test mode).

---

## Migration Sequence (9 steps → Codex briefs)

Each step maps to one or more Codex briefs that respect strict dependencies and protected files.

| Step | Brief # (proposed) | Depends on | Touches |
|---|---|---|---|
| 1. Architecture audit doc | (this document) | — | docs only |
| 2. Catalogue model schema | 030 | this doc merged | new migrations, new types, no UI |
| 3. Price-book versioning | 031 | 030 merged | new migrations, quotes table change, no UI |
| 4. Visibility model | 032 | 030 merged | new migrations, no UI |
| 5. Capability model | 033 | 030 merged | new migrations, no UI |
| 6. Rule template runner | 034 | 030 + 033 merged | new code in `src/lib/bom/templates/`, dispatcher in `src/lib/bom/index.ts`, no change to `localBomCalculator.ts` public signature |
| 7. Retire hardcoded option rules | 035-040 (one per system) | 034 merged | `productOptionRules.ts` shrinks per brief, replaced by data + templates |
| 8. Admin import / review MVP | 041 | 030 + 031 merged | new admin routes, new staging tables, no impact on calculator |
| 9. QA readiness dashboard | 042 | 030 merged | new admin route, schema change to `systems` table |

### Hard rules

- Every brief PR must pass `localBomCalculator.test.ts` **unchanged**
- No brief modifies `localBomCalculator.ts` internals until step 6 (rule template runner), and even then only as a dispatcher addition, not a behavioural change
- No two briefs touching the same file are in flight simultaneously
- Briefs 030-033 are pure schema; they can ship in parallel after 030 lands
- Brief 034 is the first one that touches code paths the calculator reads from, so a bigger fix-up budget is warranted
- **PR base branch is `main`** (this repo's default), not `master` (which was the original `skybrook-tech` repo's default)

### Where catalogue data comes from for the first wave

`docs/catalogue-gap-analysis.md` enumerates the existing SKU and rule gaps across QSHS, XPL, QS_GATE, BAYG, plus the upcoming sliding gate system and Alumawall. After brief 030 deploys the schema, the data wave that populates the new catalogue tables is driven by that gap analysis. The `catalogues/` directory holds the source-of-truth PDFs and text extractions feeding it. ColorBond catalogue extraction (`docs/colorbond-catalogue-extraction.md`) provides the first non-Glass-Outlet system.

---

## Protecting `localBomCalculator.ts` Through the Migration

This file is the BOM regression guard. The strategy:

**Phase 1 (briefs 030-033):** No changes. The file continues to consume canonical form and produce BOM output exactly as today.

**Phase 2 (brief 034):** Internal refactor only. Public function signature stays identical. The internal implementation grows a dispatcher that calls into the new template runner for systems flagged `rule_strategy = 'template'`. For systems still flagged `data` (default), behaviour is unchanged — same code path as today. The test suite passes unchanged because the test inputs are existing Glass Outlet systems on the `data` path.

**Phase 3 (briefs 035-040):** As individual systems migrate to `template` rule_strategy (or new systems are added with `custom_module`), the dispatcher routes them differently. The data path for existing systems remains until they are explicitly migrated. The test suite continues to pass unchanged because the original Glass Outlet behaviour is preserved bit-for-bit.

**Phase 4 (future):** Once all systems have migrated off the `data` path, the legacy code in `localBomCalculator.ts` can be deleted. But this is a years-out cleanup, not an immediate concern.

**Guarantee:** At no point does `localBomCalculator.test.ts` need to change. The regression guard remains intact.

---

## Open Decisions

### Server-side vs client-side BOM calculation — ALREADY DECIDED

This is **not open**. `docs/calculator-architecture-tradeoffs.md` already chose **Approach A — server-side BOM via the `bom-calculator` Supabase Edge function with Postgres-driven seeds** as the canonical production path. Client-side calculation (`localBomCalculator.ts` and friends) is explicitly **non-authoritative** — it remains in the codebase as a sandbox / offline-estimate path, but real quotes always go through the edge function.

This architecture is **fully consistent with that decision**. The three-tier rule storage (templates / data / custom modules) lives server-side. The dispatcher described in this doc runs inside the edge function. Templates and data rules are interpreted server-side against the active price book. Custom code modules are also server-side TypeScript imported by the edge function.

**Implication for design:** Module interfaces and template runners must be pure functions (no DOM, no `window`, no React imports inside rule code). This was already a requirement of Approach A and is reaffirmed here.

**Local `localBomCalculator.ts` status:** The protection strategy in this doc (signature stable, test suite passes unchanged) still applies — it remains the regression guard for the canonical-form contract and the offline-estimate path. But the server engine is the authoritative one going forward.

### Multi-tenancy model

**Current state:** Effectively single-tenant — Glass Outlet's data is the only data.

**Future:** Multi-tenant SkyBrookAI with many suppliers and many tradie organisations.

**Decision:** Defer the full multi-tenancy migration. But every new table designed in this architecture includes scope-aware columns (`supplier_id`, `org_id` where relevant) and RLS policies are stubbed in.

### Self-serve supplier portal

**Phase one:** Admin-managed. Liam approves all updates.

**Phase two:** Self-serve with tiered trust. Suppliers can submit their own updates; high-trust suppliers can publish within their scope without review.

**Decision:** Build the data model to support self-serve from day one. UI ships in phase two.

---

## Appendix A: Mapping to Codex Brief Queue

The 9-step migration becomes ~13 Codex briefs (some steps split into multiple briefs to respect file-overlap rules). See the "Migration Sequence" section for the table.

**First brief (030 — Catalogue Model):** Adds the catalogue schema as a Supabase migration plus TypeScript types. No UI changes, no calculator changes, no impact on production. Glass Outlet's existing data continues to flow through unchanged. The new tables exist but are not yet populated. Subsequent briefs populate them.

This brief is drafted alongside this architecture document — see `_briefs/00-inbox/030-catalogue-model.md`.

---

## Appendix B: Glossary

- **Catalogue layer** — the data describing what products and systems exist
- **Rule engine** — the system that computes a BOM from a canonical form
- **Price book** — a versioned snapshot of pricing for a supplier
- **Capability flag** — a boolean on a system or product describing what features it supports
- **Visibility rule** — a row controlling who can see what
- **Workbook** — the supplier's Excel source-of-truth file
- **Staging** — the area where incoming supplier data lives before being approved
- **Quote pinning** — a quote remembering which price book version it was calculated against

---

## Appendix C: Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-26 | Adopt "catalogue platform with calculator on top" framing | Developer's mindset shift; supports scaling to hundreds of products |
| 2026-05-26 | 5-layer model | Synthesised across three architectural opinions in thread |
| 2026-05-26 | Three-tier rule storage | Avoids both "all code" and "all data" extremes |
| 2026-05-26 | Versioned price books with quote pinning | Historical quote integrity |
| 2026-05-26 | Capability flags on systems & products | UI knows what to render without hardcoding |
| 2026-05-26 | First-class visibility tables | B2B scoping; multi-supplier readiness |
| 2026-05-26 | Admin-first then self-serve, data model supports both | User decision in Hyperagent thread |
| (pre-existing) | Server-side BOM is canonical (Approach A) | Per `docs/calculator-architecture-tradeoffs.md` — not re-decided here |
| 2026-05-26 | `localBomCalculator.ts` evolves internally, signature stable | Preserves regression guard; remains the offline-estimate path |
| 2026-05-26 | New repo `quickscreen-colorbond-generator` (fork of `quickscreen-bom-generator`) | Liam's call — clean slate for the multi-supplier rollout; default branch `main` |

---

*This document is the canonical reference. Every future Codex brief in this project should cite the relevant section. Updates land here first, then propagate to briefs.*

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/030a-system-authoring-process.md -->

# System Authoring — How Products and System Types Get Added

> Companion document to `docs/multi-supplier-platform-architecture.md`. Defines the process for introducing new products and system types. Used by Liam today as an admin; designed to extend to end-users (tradies authoring their own calculators) in phase two.

**Status:** Draft v1
**Last updated:** 2026-05-27
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Source of strategic decision:** Liam, Hyperagent thread 2026-05-27 — "make the system versatile so users can pick their own suppliers and system types... if we make it easy for users to build their own systems then we won't have to do it all and they can do it themselves and we can distribute the app much cheaper."

---

## 1. Strategic Direction

This document encodes a deliberate strategic shift in how the platform scales:

**From:** SkyBrookAI hand-builds a calculator for every supplier × system combination.
**To:** SkyBrookAI builds the calculator-building machinery; anyone (Liam, suppliers, tradies) builds calculators on top.

The implication: instead of every new supplier being a 1-4 week build for the SkyBrookAI team, a new supplier is hours of self-service authoring by the person who actually knows that supplier's products. The platform scales without SkyBrookAI being the bottleneck.

The tradeoffs (real, addressable):

- **Quality control** — user-authored calculators can be wrong. Need explicit readiness states, workbook regression gates, and visibility tiers so untested calculators don't blow up real quotes.
- **Liability** — if a tradie self-authors a calculator that under-quotes a job, who pays? Need clear T&Cs, "untested" warnings on draft calculators, and audit trail on every quote (which calculator version, which price book version).
- **Curation** — a public marketplace of calculators fills with junk fast. Two paths: light-touch (auto-publish, take-down on report) or active gatekeeping (verified-supplier route only). Recommendation: start with active gatekeeping, loosen later.
- **Pricing isolation** — a user-authored calculator runs on the user's own price book, which is commercially sensitive. The calculator structure can be shared publicly; the prices cannot. Visibility model treats these separately.

---

## 2. The Three-Tier Identity Model

Every product, component, rule, and selector in the platform carries three identity attributes. This is the most important architectural addition.

### 2.1 Supplier

**Who makes the products.** Lightweight entity: name, slug, logo, brand colour, contact, trust tier.

Examples today: Glass Outlet. Examples coming: ColorBond / Bluescope, Stratco, Stoddart, Whites, Bunnings (depot pricing), individual tradies' preferred local suppliers.

### 2.2 System Archetype

**The abstract pattern.** Shared across suppliers. Defines geometry, UI form schema, and rule template library.

Examples (the controlled vocabulary):

| Archetype | Family | Geometry | Examples in market |
|---|---|---|---|
| `slat-fence` | fence | runs / segments / posts / slats | Glass Outlet QSHS, ColorBond Slatted, any horizontal-slat aluminium fence |
| `panel-fence` | fence | runs / segments / posts / panels | ColorBond Steel Fence, Trimdek, Stratco Smartspan |
| `mesh-fence` | fence | runs / panels / posts | Chainwire, weldmesh, ProtectaScreen |
| `timber-fence` | fence | runs / panels / posts / rails / palings | Hardwood paling, treated pine lap-and-cap |
| `glass-pool-fence` | pool-fence | panels / spigots / gates / clamps | Frameless glass pool fencing |
| `aluminium-pool-fence` | pool-fence | panels / posts / gates | Trojan aluminium pool fence |
| `balustrade` | balustrade | runs / panels / posts / handrail | Frameless glass, semi-frameless, aluminium |
| `sliding-gate` | gate | gate / track / motor / hardware | QSG sliding, CTS Hamptons, Stratco sliding |
| `swing-gate` | gate | gate / hinges / latch | QS Gate swing, custom timber, ColorBond gate |
| `equipment-enclosure` | enclosure | walls / roof / doors / ventilation | CTS equipment enclosures |
| `screen` | screen | panels / posts / fixings | Privacy screens, decorative screens |
| `shower` | shower | screens / channels / doors / hinges | Frameless glass showers |

This list is extensible. New archetypes are added as new product categories show up. **An archetype is added when no existing one fits;** instances of an existing archetype don't trigger a new one.

### 2.3 System Instance

**The supplier-specific implementation.** What users actually pick in the calculator picker.

Example: "Glass Outlet QuickScreen Horizontal Slat" is the instance — supplier `glass-outlet`, archetype `slat-fence`. "ColorBond Slatted by Bluescope" would be a different instance — supplier `bluescope`, archetype `slat-fence` (same archetype, different supplier).

### 2.4 Why this matters in concrete terms

- **Cross-supplier swap, same UI.** A user who switches from Glass Outlet's slat fence to a competitor's slat fence sees the same form fields, same canvas, same BOM categorisation — because they're the same archetype. Only the SKUs and rule details differ.
- **Rule templates are archetype-scoped, not supplier-scoped.** The `slat_counting_v1` rule template lives at the archetype layer. A new supplier's slat fence inherits all the archetype's templates by selecting the archetype — the new supplier only fills in their parameter values.
- **Onboarding gets simple.** "Which archetypes do you work with?" → "Which suppliers within each?" The cross-product is the user's calculator universe.
- **Pricing stays per supplier.** Same archetype across suppliers, different price books per supplier. Users can compare BOM costs across suppliers for the same job (a feature unlocked by this model).

---

## 3. Authoring Workflow

Same machinery for admin (Liam) and user (tradies). Only the trust tier and visibility defaults differ.

### Step 1: Choose / create the archetype

**Existing archetype:** pick from the controlled vocabulary above.
**New archetype:** triggers a deeper process — see Section 6 ("Adding a new archetype").

### Step 2: Declare the system instance

Form fields:
- Supplier — existing or create new (suppliers are lightweight)
- Archetype — locked to choice from Step 1
- Instance name — e.g. "ColorBond Slatted Fence", "Trojan Aluminium Pool"
- Slug — auto-generated, editable
- Description — one-paragraph, surfaces in calculator picker
- Initial readiness status — `draft`
- Visibility — `private` by default

### Step 3: Add products / SKUs

Form-driven entry per product. For each:
- SKU
- Display name
- Type — controlled vocab per archetype (slat / post / rail / panel / sheet / screw / gate / bracket / accessory)
- Dimensions — height / width / thickness / stock length (per type)
- Option types — colour, profile, finish, height variant — each with its own option values
- Status — `active` by default
- Optional: image URL, install diagram, spec sheet URL

**Bulk import path** for high-volume catalogues:
1. Upload CSV or workbook
2. Parser maps rows to staging table (per supplier-format)
3. Diff view: new SKUs / changed SKUs / removed SKUs / unmapped rows
4. Reviewer approves item-by-item
5. Commit to live catalogue

### Step 4: Add rules

Three tiers:

**Tier A — Template binding (preferred).** Pick a rule template from the archetype's library. Fill in parameters.

```
Template: slat_counting_v1
Parameter bindings:
  segment_width_mm: variable
  post_diameter_mm: products[type=post].diameter
  slat_width_mm: products[type=slat].width
  gap_mm: 12  ← supplier-specific
```

**Tier B — Data-driven math.** Direct entry in the v3 engine format — math.js expression + selector match. For rules that don't match any template but are still expressible as a formula.

```
Stage: derive
Expression: ceil(bay_width_mm / 600) * 2
Output: qty_screw_50
Selector match: {sku_pattern: "GO-SCREW-50-{colour}"}
Taxonomy: auto_add
```

**Tier C — Custom code module.** TypeScript module behind a stable interface. Reserved for genuinely algorithmic rules that don't express well as data (e.g. terrain-dependent panel placement, compliance edge cases). **End users cannot self-author code modules** — Tier C is a platform-team-only path that requires a code PR and admin approval.

Every rule output, regardless of tier, carries the taxonomy: `auto_add | suggested | optional | warning`.

### Step 5: Workbook regression check

Upload the supplier's formulated workbook (Excel) or known job examples. Pick 3-5 representative configurations covering the typical range — small / standard / large / edge case / with-gate.

For each configuration:
1. Enter the inputs in the calculator
2. Run the BOM
3. Diff line-by-line against the workbook's expected output
4. Mismatches → fix the seed; iterate

Until ALL configurations match, readiness status stays at `calculator_ready`. Passing all → `spreadsheet_tested`. Admin sign-off → `approved`.

### Step 6: Visibility

Choose one:
- **Private** — visible only to authoring user / org
- **Org-shared** — visible to specific other organisations (B2B agreements)
- **Public (community)** — visible to all users; enters moderation queue unless author has verified-supplier status

### Step 7: Submit / publish

- **Admin path** (Liam): instance moves to `approved` immediately on his say-so.
- **User path** (tradie): instance is auto-approved within their own scope. Public-visibility requests enter a moderation queue; verified-supplier authorship earns auto-approval.

---

## 4. Trust & Moderation Tiers

Four trust tiers carried on `suppliers` and `system_instances`:

| Tier | Who | Authoring | Visibility default | Quality signal |
|---|---|---|---|---|
| `platform` | SkyBrookAI's own catalogues | Liam / SkyBrookAI staff | Public, prominent | "Built by SkyBrookAI" badge |
| `verified` | Suppliers who've passed verification (real business, validated catalogue, signed T&Cs) | Supplier's own admin user | Public, prominent | "Verified supplier" badge |
| `community` | User-authored, opted into public | Any logged-in user | Public, lower prominence | "Community-built" badge with author |
| `user` | User-authored, private | Any logged-in user | Private to user / org | None |

**Promotion paths:**
- `user` → `community`: opt-in, light moderation (calculator passes workbook regression for 3+ configs)
- `community` → `verified`: full supplier verification (business registration, catalogue audit, signed agreement)
- `platform` is reserved for direct SkyBrookAI work

**Demotion:** any tier can be demoted on quality reports (auto-demote `community` items with 3+ "wrong BOM" reports back to `user`).

---

## 5. Schema Additions

All in migrations 032+ to extend (not replace) the existing v3 schema.

### 5.1 New tables

```sql
-- Suppliers: lightweight, growable, can be platform-owned or user-created
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_url text,
  brand_colour text,
  contact_email text,
  trust_tier text CHECK (trust_tier IN ('platform','verified','community','user')) DEFAULT 'user',
  authored_by uuid REFERENCES profiles(id),
  org_id uuid REFERENCES organisations(id),
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- System archetypes: abstract patterns shared across suppliers
CREATE TABLE system_archetypes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  family text NOT NULL CHECK (family IN ('fence','gate','pool-fence','balustrade','screen','enclosure','shower','other')),
  geometry_module text NOT NULL,    -- name of the canvas geometry adapter
  variable_schema jsonb NOT NULL,   -- declarative form-field schema shared by all instances
  rule_template_ids text[],         -- which rule templates apply (template registry keys)
  description text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- System instances: supplier × archetype + supplier-specific config
CREATE TABLE system_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT,
  archetype_id uuid REFERENCES system_archetypes(id) ON DELETE RESTRICT,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  status text CHECK (status IN ('draft','active','hidden','discontinued')) DEFAULT 'draft',
  readiness_status text CHECK (readiness_status IN ('draft','imported','calculator_ready','price_checked','spreadsheet_tested','approved')) DEFAULT 'draft',
  trust_tier text CHECK (trust_tier IN ('platform','verified','community','user')) DEFAULT 'user',
  visibility text CHECK (visibility IN ('private','org_shared','public')) DEFAULT 'private',
  authored_by uuid REFERENCES profiles(id),
  org_id uuid REFERENCES organisations(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, slug)
);

-- Organisation-level access to system instances (B2B sharing)
CREATE TABLE system_instance_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_instance_id uuid REFERENCES system_instances(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(system_instance_id, org_id)
);

-- Quality reports on community-tier content
CREATE TABLE system_instance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_instance_id uuid REFERENCES system_instances(id) ON DELETE CASCADE,
  reported_by uuid REFERENCES profiles(id),
  reason text NOT NULL,
  details text,
  status text CHECK (status IN ('open','reviewing','resolved','dismissed')) DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);
```

### 5.2 Backfill columns on existing tables

```sql
-- Carry supplier + system-instance provenance on every catalogue entity
ALTER TABLE products            ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
ALTER TABLE products            ADD COLUMN system_instance_id uuid REFERENCES system_instances(id);
ALTER TABLE products            ADD COLUMN authored_by uuid REFERENCES profiles(id);

ALTER TABLE product_components  ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
ALTER TABLE product_components  ADD COLUMN system_instance_id uuid REFERENCES system_instances(id);

ALTER TABLE product_variables   ADD COLUMN system_instance_id uuid REFERENCES system_instances(id);
ALTER TABLE product_rules       ADD COLUMN system_instance_id uuid REFERENCES system_instances(id);
ALTER TABLE product_component_selectors ADD COLUMN system_instance_id uuid REFERENCES system_instances(id);
ALTER TABLE product_companion_rules     ADD COLUMN system_instance_id uuid REFERENCES system_instances(id);
ALTER TABLE pricing_rules       ADD COLUMN supplier_id uuid REFERENCES suppliers(id);

-- All new columns nullable initially; backfilled by a data migration
```

### 5.3 Backfill data migration

```sql
-- Create the Glass Outlet supplier row
INSERT INTO suppliers (slug, name, trust_tier) VALUES ('glass-outlet', 'Glass Outlet', 'platform');

-- Create the seven archetype rows (slat-fence, panel-fence, etc.)
-- ... (see Appendix A for full archetype seed)

-- Create system instances for existing seed files
INSERT INTO system_instances (supplier_id, archetype_id, slug, name, readiness_status, trust_tier)
  SELECT s.id, a.id, 'qshs', 'QuickScreen Horizontal Slat', 'approved', 'platform'
  FROM suppliers s, system_archetypes a
  WHERE s.slug = 'glass-outlet' AND a.slug = 'slat-fence';

-- (repeat for vs, xpl, bayg, colorbond, qs-gate-swing, qs-gate-sliding, xpsg-gate)

-- Backfill supplier_id + system_instance_id on existing products
UPDATE products SET supplier_id = (SELECT id FROM suppliers WHERE slug='glass-outlet');
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug=<seed_system_type_to_instance_map>);
-- (and equivalently for product_components, product_variables, product_rules, etc.)
```

### 5.4 RLS for user-authored content

```sql
-- Suppliers: see platform-tier + own org + public verified
CREATE POLICY suppliers_visibility ON suppliers FOR SELECT
  USING (
    trust_tier IN ('platform', 'verified')
    OR org_id = auth.org_id()
    OR authored_by = auth.uid()
  );

-- System instances: visibility-aware
CREATE POLICY system_instances_visibility ON system_instances FOR SELECT
  USING (
    visibility = 'public'
    OR (visibility = 'org_shared' AND id IN (
        SELECT system_instance_id FROM system_instance_grants WHERE org_id = auth.org_id()
    ))
    OR org_id = auth.org_id()
    OR authored_by = auth.uid()
  );

-- Writes: only authoring user or admin
CREATE POLICY system_instances_write ON system_instances FOR INSERT
  WITH CHECK (authored_by = auth.uid());
CREATE POLICY system_instances_update ON system_instances FOR UPDATE
  USING (authored_by = auth.uid() OR auth.is_admin());
```

---

## 6. Adding a New Archetype (the deeper process)

Most new systems are new instances of existing archetypes. Occasionally a genuinely new pattern shows up that no archetype fits. Adding a new archetype is a bigger commitment because:

1. **Geometry adapter** — what does a "shower" look like as runs / segments / panels? May need a new canvas geometry module.
2. **Variable schema** — what form fields does this archetype need? May not fit the existing variable types.
3. **Rule template library** — at least 3-5 reusable rule templates need to be designed so future suppliers' instances can bind to them.

Process:
1. Confirm no existing archetype fits.
2. Designer + Liam sketch the new archetype: geometry, form fields, rule templates needed.
3. Build the geometry adapter (code module, behind `canvasEngine.ts` extension).
4. Build the variable schema (data, in `system_archetypes.variable_schema`).
5. Build the initial rule templates (code, in `src/lib/bom/templates/`).
6. Seed the archetype row.
7. Then proceed with Section 3 to add the first instance.

Adding a new archetype is a Codex brief-sized piece of work. Adding an instance under an existing archetype is form-driven authoring.

---

## 7. Adding a New System Today (admin runbook for Liam)

This is the runbook to use right now to add e.g. CTS Hamptons sliding gates, Glass Pool Fencing, etc.

**Step 0:** Identify scope. Is this a new supplier? A new instance under an existing supplier? A new archetype? Most are new instances.

**Step 1:** Gather source material:
- Supplier catalogue PDF (drop in `catalogues/`)
- Price list workbook / CSV
- Installation guide (if applicable)
- 3-5 worked examples of real jobs (Order Form workbooks or known quote PDFs)

**Step 2:** Identify the archetype. Cross-reference Section 2.2 above. If the archetype doesn't exist, see Section 6 first.

**Step 3:** (Today, manual; future, form-driven) Add or extend the seed JSON:
- For an entirely new product file: copy an existing one as a template, swap out the SKUs and rules
- For a new instance under an existing product file (e.g. Hamptons inside `qs_gate.json`): add a new `gate_build` enum value, add the supplier-specific rules guarded by that enum

**Step 4:** Add rules. Prefer template binding from the archetype library. Fall back to data-driven math. Avoid custom code modules unless absolutely needed.

**Step 5:** Workbook regression. Pick 3-5 configurations from the source workbook. Run them through the local calculator. Diff line-by-line. Iterate until matched.

**Step 6:** Set readiness status to `spreadsheet_tested`. Test in production preview.

**Step 7:** Set readiness status to `approved`. Set visibility to `public`.

**Today the form-driven authoring UI doesn't yet exist** — Steps 3 and 4 are manual JSON editing. Briefs 034-036 below build out the form path so this becomes click-driven.

---

## 8. Brief Sequence to Ship This

All briefs use migrations 032+ (030 and 031 already used in this repo).

| # | Title | Depends on | Scope |
|---|---|---|---|
| 032 | Supplier + Archetype + Instance schema | this doc landed | New tables, ALTER TABLE for nullable provenance columns, no UI, no calculator change. `localBomCalculator.test.ts` passes unchanged. |
| 033 | Backfill Glass Outlet supplier + existing instances | 032 merged | Data-only migration. Sets supplier_id + system_instance_id on all existing rows. |
| 034 | Admin UI — Suppliers + Instances CRUD | 033 merged | Form-driven admin pages. Liam can add new suppliers / instances without editing JSON. |
| 035 | Admin UI — Products CRUD + bulk CSV import | 034 merged | Form for individual products, staging-and-diff for CSV. |
| 036 | Admin UI — Rules (template binding + data-driven math entry) | 035 merged | Form for Tier A and Tier B rule entry. No Tier C self-serve. |
| 037 | Workbook regression upload + diff view | 036 merged | Admin uploads workbook + configurations; calculator runs them; diff surfaces. |
| 038 | User-scoped authoring (RLS + org-level visibility) | 034 merged | Logged-in users can author within their own scope. Visibility defaults to `private`. |
| 039 | Community publication path | 038 + 037 merged | User can request public; moderation queue; verified-supplier auto-approve. |
| 040 | Quality reports + demotion automation | 039 merged | Report button on community calculators; auto-demote on threshold. |

This is ~3 months of Codex work if shipped one brief per week. Brief 032-033 are foundational and unblock everything else; should ship first.

---

## 9. Open Strategic Questions for Liam

These are decisions that affect the build but haven't been made:

1. **Pricing visibility for community calculators.** A user shares their slat-fence calculator publicly. The calculator structure is shared, but the user's price book stays private. **Confirm:** community calculators show structure only, never prices? Each user runs the shared calculator against their own price book?

2. **Supplier verification process.** What does "verified supplier" mean concretely? Business registration check? SkyBrookAI staff catalogue audit? Signed T&Cs? Annual recheck? **Recommendation:** start with manual verification by SkyBrookAI; automate later.

3. **Moderation tooling for community content.** Light-touch (auto-publish, take-down on report) or active gatekeeping (verified-supplier-only public route, user calculators stay private)? **Recommendation:** start with active gatekeeping; loosen if community demand grows.

4. **Revenue model implications.** Self-service authoring changes the unit economics. Is the platform free for tradies and paid for verified suppliers? Subscription? Per-quote fee? **Out of scope for this document but the answer affects how aggressively we push the community tier.**

5. **Migration of existing Glass Outlet content.** Glass Outlet's content is currently `platform` tier by default in the schema above. Liam can choose to mark it `verified` instead and treat Glass Outlet as the first verified supplier. Affects future positioning.

---

## Appendix A — Initial Archetype Seed

The first migration includes seed rows for these archetypes (slug, family, geometry_module, rule_template_ids):

```sql
INSERT INTO system_archetypes (slug, name, family, geometry_module, rule_template_ids, description) VALUES
  ('slat-fence',           'Slat Fence',            'fence',       'fence_runs_v1',   ARRAY['slat_counting_v1','bay_post_v1','rail_cut_v1'],
    'Horizontal or vertical slat-based fence systems.'),
  ('panel-fence',          'Panel Fence',           'fence',       'fence_runs_v1',   ARRAY['panel_per_bay_v1','bay_post_v1'],
    'Steel / aluminium panel systems like ColorBond.'),
  ('mesh-fence',           'Mesh Fence',            'fence',       'fence_runs_v1',   ARRAY['panel_per_bay_v1','bay_post_v1'],
    'Chainwire / weldmesh fencing.'),
  ('timber-fence',         'Timber Fence',          'fence',       'fence_runs_v1',   ARRAY['paling_count_v1','rail_per_bay_v1','bay_post_v1'],
    'Timber paling and lap-and-cap fences.'),
  ('glass-pool-fence',     'Glass Pool Fence',      'pool-fence',  'panel_runs_v1',   ARRAY['glass_panel_v1','spigot_per_panel_v1'],
    'Frameless glass pool fencing with spigots / clamps.'),
  ('aluminium-pool-fence', 'Aluminium Pool Fence',  'pool-fence',  'panel_runs_v1',   ARRAY['panel_per_bay_v1','bay_post_v1'],
    'Aluminium pool fencing — Trojan style.'),
  ('balustrade',           'Balustrade',            'balustrade',  'balustrade_v1',   ARRAY['panel_per_bay_v1','handrail_v1'],
    'Balcony / staircase balustrade systems.'),
  ('swing-gate',           'Swing Gate',            'gate',        'gate_segment_v1', ARRAY['swing_gate_hardware_v1'],
    'Single / double swing gates.'),
  ('sliding-gate',         'Sliding Gate',          'gate',        'gate_segment_v1', ARRAY['sliding_track_v1','sliding_hardware_v1'],
    'Sliding gates including automated.'),
  ('equipment-enclosure',  'Equipment Enclosure',   'enclosure',   'enclosure_v1',    ARRAY['enclosure_wall_v1','enclosure_door_v1'],
    'CTS-style enclosed equipment housing.'),
  ('screen',               'Privacy Screen',        'screen',      'screen_panel_v1', ARRAY['panel_per_bay_v1'],
    'Privacy / decorative screens.'),
  ('shower',               'Shower Enclosure',      'shower',      'shower_v1',       ARRAY['glass_panel_v1','channel_cut_v1'],
    'Frameless / semi-frameless shower screens.');
```

Geometry modules and rule template implementations are referenced by name; the actual code lives in `src/lib/bom/templates/` and `src/components/canvas/`. **Most do not exist yet** — they ship per archetype as that archetype's first instance is built. The seed list is the menu; the implementations are filled in over time.

---

## Appendix B — Example: ColorBond authoring on top of this model

Concretely, how does adding ColorBond Slatted Fence work in this model?

1. **Supplier:** `bluescope` already exists (created when adding ColorBond Steel earlier). Skip Step 1.
2. **Archetype:** `slat-fence` already exists. Skip Step 6 archetype-add process.
3. **Instance:** New row in `system_instances`: supplier=`bluescope`, archetype=`slat-fence`, slug=`colorbond-slatted`, name="ColorBond Slatted Fence", readiness=`draft`.
4. **Products:** Add ColorBond slat SKUs, post SKUs, rail SKUs to `products`, all tagged with `supplier_id = bluescope` and `system_instance_id = colorbond-slatted`.
5. **Rules:** Bind `slat_counting_v1` template with ColorBond's slat dimensions; bind `bay_post_v1` with ColorBond's post spacing; bind `rail_cut_v1` with ColorBond's rail stock lengths.
6. **Workbook regression:** Use `GO+Cat+Xpress+Alumawood+V4_lowres.pdf` examples (or the actual Bluescope ColorBond install guide); pick 3-5 configs; run; diff; iterate.
7. **Publish:** `readiness_status` → `approved`, `visibility` → `public`, `trust_tier` → `verified` (assuming Bluescope is verified).

**Total authoring time at platform maturity:** 2-4 hours for someone who knows the supplier's catalogue. Compared to building a new bespoke calculator codebase, this is 100x faster.

---

*This document is the canonical reference for the system authoring process. Updates here propagate to briefs and tooling. Lives at `docs/system-authoring-process.md` in the repo.*

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/028-production-cutover-runbook.md -->

# Production Cutover Runbook (paused — execute when ready)

**Status:** PAUSED — Liam decides when to execute
**Goal:** point the production Netlify site `tiny-kangaroo-8f7016` at the new repo `quickscreen-colorbond-generator` instead of the original `quickscreen-bom-generator`

---

## When to execute this

Recommended trigger: **after brief 038 merges** (workbook regression infrastructure exists, you trust the platform) AND **before brief 043 merges** (Discount Fencing goes live for your customers).

Earlier than 038 = risk shipping unverified BOMs to real customers. Later than 043 = Discount Fencing seeded but Glass Outlet's customers are still hitting the old repo and won't see DF.

Reasonable cutover candidates:
- After brief 038 — earliest safe cutover
- After brief 041 — full multi-supplier authoring + community path is in
- After brief 044 — visibility layer in place (cleanest end state)

If your existing Glass Outlet customers are running quotes that need pricing accuracy guaranteed during the cutover window, do the cutover during a low-traffic window (typically Saturday morning in Australia).

---

## Pre-cutover checklist

- [ ] All briefs through your chosen cutover point are merged on `main`
- [ ] Migrations have been applied to the production Supabase project
- [ ] `npm run seed:products` has been run against the production Supabase project
- [ ] Smoke test on the new repo's Netlify deploy preview: load 3 Glass Outlet quote types, generate a BOM, confirm pricing matches the current production
- [ ] Customer mode toggle still works
- [ ] PWA install + offline mode still work on iPhone Safari deploy preview
- [ ] The original repo's last commit hash is recorded as a rollback target

## Cutover procedure

### Option A — Re-point existing Netlify project (recommended)

1. In the Netlify UI (`tiny-kangaroo-8f7016`), go to Site settings → Build & deploy → Repository
2. Change the linked repository from `skybrook-tech/quickscreen-bom-generator` to `skybrookai-atlas/quickscreen-colorbond-generator`
3. Set production branch to `main` (not `master`)
4. Trigger a manual deploy
5. Verify the production URL (your tradies' bookmark) now serves the new repo
6. Verify all environment variables (Supabase URL, Google Maps key, etc.) are present

### Option B — New Netlify project + DNS swap

If you'd rather build confidence on a parallel deployment first:

1. Create a new Netlify project pointing at `skybrookai-atlas/quickscreen-colorbond-generator` (default branch `main`)
2. Configure all env vars matching the existing project
3. Wait until ready
4. Update DNS to point the production URL at the new Netlify project
5. Decommission `tiny-kangaroo-8f7016` after a 1-2 week confidence window

Option B is safer (instant DNS rollback). Option A is simpler.

## Post-cutover verification

- [ ] Production URL serves the new repo (confirm via inspect → service worker → cache name reflects new repo)
- [ ] An existing customer's saved quote loads and re-prices to the same total as before cutover
- [ ] A new quote creates correctly and saves to the production Supabase project
- [ ] PDF generation works on iPhone Safari
- [ ] Customer mode still hides cost columns
- [ ] No 4xx/5xx errors in Netlify function logs for ~24 hours post-cutover

## Rollback procedure (if needed)

### From Option A

1. In Netlify UI, change repository back to `skybrook-tech/quickscreen-bom-generator`, branch `master`
2. Trigger manual deploy
3. Verify production URL is serving the old repo again

Rollback window: data divergence depends on what changed between old and new Supabase. If both repos hit the same Supabase project, data is the same; if migrations are not backward-compatible (e.g. brief 032's new tables), the old repo just doesn't see them — non-breaking. **Brief 032's schema is additive (nullable columns + new tables); old repo continues to work against it.**

### From Option B

1. Update DNS back to the old Netlify project
2. Done

---

## Things this runbook does NOT cover

- Domain/SSL changes (assumed: production URL stays the same; only the underlying Netlify project changes)
- Supabase project changes (assumed: same project)
- Customer communication (probably no email needed — cutover is invisible to customers if done right)
- Analytics / observability (separate setup; whatever you have on the current project carries over via Option A, or needs to be re-wired in Option B)

---

## Why this isn't a Codex brief

Codex can't sign in to Netlify or change DNS. This is a Liam-only action. The runbook documents the steps so you don't have to think about them when the time comes.

---

## When you execute this, also...

- Update `_briefs/INVENTORY.md` to record the cutover date
- Update `docs/system-authoring-process.md` Decision log
- Archive the original repo `skybrook-tech/quickscreen-bom-generator` (mark as read-only on GitHub) once the new repo is stable for 2+ weeks
- Notify any Codex agents on the old repo that PRs from there are no longer the production path

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/028-pre-release-pr-descriptions/README.md -->

# Pre-release Codex branches — PR descriptions + merge order

Three branches were committed by Codex agents before the brief queue stabilised. They need to be opened as PRs in the GitHub UI and reviewed before the multi-supplier brief queue (028+) runs.

**Recommended merge order:**

1. `codex/brief-031-run-section-gate-ui-consistency` (dec7b59) — opens FIRST, base `main`. UI cleanup; no calculator behaviour change. Foundation for the stack.
2. `codex/glass-outlet-calculator-rollout-setup` (4b2d70a) — **cherry-pick selectively, then close branch**. The architecture docs are now landed via brief 028; the docs/glass-outlet-range-rollout.md + tasks.md + app-overview.md updates from this branch should be cherry-picked into a small follow-up PR. Then close the branch without merging.
3. `codex/qsg-sliding-gates-calculator` (7c955a2) — opens LAST, base `main`. Rebase on top of (1) after (1) merges. **Do not merge until QSG workbook regression passes** (see `qsg-workbook-regression-checklist.md` in this folder).

The three PR description templates are in this folder. Copy them verbatim when opening each PR.

If you (Liam) prefer to skip the rebase-and-merge dance for the three pre-release branches and instead let them age out in favour of fresh briefs, that's a valid alternative — the brief queue 028-044 doesn't depend on any of this work specifically. The ColorBond UI cleanup is the only piece that would meaningfully impact user experience; the rest is either superseded (rollout-setup) or pending validation (QSG sliding).

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/028-pre-release-pr-descriptions/pr-1-colorbond-ui-consistency.md -->

# PR — Run/Section/Gate UI consistency (ColorBond components)

**Branch:** `codex/brief-031-run-section-gate-ui-consistency` (commit dec7b59)
**Base:** `main`
**Mark as:** Draft

---

## Summary

UI consistency pass across run / section / gate components, with first ColorBond visual treatment. 22 files touched, no calculator-behaviour changes.

## What's in this PR

- ColorBond component visual styling (matches the existing system family conventions)
- Run / section / gate UI alignment (spacing, sizing, icon usage)
- Minor `tasks.md` + `app-overview.md` housekeeping

## Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes including `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run build` passes
- [ ] Netlify deploy preview renders the ColorBond surface on iPhone Safari
- [ ] Run / section / gate tap targets are reachable on iPhone (44px minimum)
- [ ] No regression on the existing QSHS / VS / XPL / BAYG UI surfaces
- [ ] PR base branch is `main` (NOT `master`)

## Notes

- This branch was committed by Codex on 2026-05-27. It has been sitting unmerged pending PR opening. No rebase needed if it still applies cleanly to current `main`; if it conflicts, rebase before opening.
- This is the FOUNDATION of the stack — `codex/qsg-sliding-gates-calculator` was started from this branch's tip, so this must merge first.

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/028-pre-release-pr-descriptions/pr-2-rollout-setup-cherry-pick.md -->

# PR — Glass Outlet range rollout docs (cherry-picked from rollout-setup branch)

**Original branch:** `codex/glass-outlet-calculator-rollout-setup` (commit 4b2d70a)
**Strategy:** **cherry-pick selectively, then close the original branch without merging**
**Base:** `main`
**Mark as:** Draft

---

## Why cherry-pick instead of merge

The original `codex/glass-outlet-calculator-rollout-setup` branch added two files:
- `docs/multi-supplier-platform-architecture.md` — **SUPERSEDED** by brief 028 which lands a corrected version of this doc directly to `main`
- `docs/glass-outlet-range-rollout.md` — **KEEP** as-is (Codex's planned Glass Outlet range build order)
- `docs/tasks.md` and `docs/app-overview.md` updates — **KEEP** (housekeeping)
- `docs/canvas-engine-refactor-discovery.md` updates — **KEEP** (canvas history record)

Merging the whole branch would collide with brief 028's architecture-doc land. Cherry-pick only the docs that don't collide.

## Steps

```bash
# Start from main
git checkout main
git pull
git checkout -b chore/cherry-pick-rollout-setup-docs

# Cherry-pick the relevant files (NOT the architecture doc — that's superseded)
git checkout 4b2d70a -- docs/glass-outlet-range-rollout.md docs/tasks.md docs/app-overview.md docs/canvas-engine-refactor-discovery.md

git add docs/glass-outlet-range-rollout.md docs/tasks.md docs/app-overview.md docs/canvas-engine-refactor-discovery.md
git commit -m "chore: cherry-pick Glass Outlet rollout docs from codex/glass-outlet-calculator-rollout-setup (4b2d70a)"
git push -u origin chore/cherry-pick-rollout-setup-docs
```

Open a PR with the description below.

After merge, **close the `codex/glass-outlet-calculator-rollout-setup` branch without merging** — its remaining content is the architecture doc which brief 028 lands separately.

---

## PR description (copy verbatim)

```markdown
## Cherry-pick: Glass Outlet rollout docs from rollout-setup branch

Pulls the non-architecture-doc files from `codex/glass-outlet-calculator-rollout-setup` (4b2d70a) so they reach `main`. The architecture doc itself is superseded by brief 028's version.

### Files cherry-picked

- `docs/glass-outlet-range-rollout.md` — Codex's planned build order for the Glass Outlet range (QSG sliding → ColorBond verification → Glass Pool → Aluminium Pool → Hamptons / Zeus / PIC → Screening → Balustrade)
- `docs/tasks.md` — task tracker updates
- `docs/app-overview.md` — app file map updates
- `docs/canvas-engine-refactor-discovery.md` — canvas refactor history

### Verification

- [ ] `npm run typecheck` passes (docs-only PR; should pass trivially)
- [ ] `npm run test` passes including `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run build` passes
- [ ] No file conflicts with brief 028's planned changes (architecture doc lands separately)
- [ ] PR base branch is `main`

### After merge

Close the source branch `codex/glass-outlet-calculator-rollout-setup` without merging — its architecture doc is already superseded.
```

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/028-pre-release-pr-descriptions/pr-3-qsg-sliding-gates.md -->

# PR — QSG Sliding Gates calculator

**Branch:** `codex/qsg-sliding-gates-calculator` (commit 7c955a2)
**Base:** `main`
**Mark as:** Draft
**Blocked on:** PR #1 (ColorBond UI consistency) must merge first. Then **rebase this branch** before opening this PR.

---

## Summary

Extends `qs_gate.json` with the full QSG sliding gate variant via Codex's data-driven pattern: 7 new variables, 58 sliding rules, 47 selectors, 5 validations. Small `bom-calculator/lib.ts` typing fix. Minor UI changes in `GateSegmentDetails.tsx` (constrains swing slats to 65mm, restricts gaps to seeded 5/9/20mm).

## What's in this PR

- `supabase/seeds/glass-outlet/products/qs_gate.json` — extended with QSG sliding variant
- `supabase/functions/bom-calculator/lib.ts` — small typing fix
- `src/components/calculator-v3/GateSegmentDetails.tsx` — UI constraints for sliding gates

## Critical: workbook regression required

This PR **must not merge** until QSG sliding gates passes workbook regression on at least 3 representative configurations from `Order-Form+QSG+Sliding+Gates~V2-T1.xlsx`. See `qsg-workbook-regression-checklist.md` in the same folder.

The pattern Codex demonstrated (data-driven sliding gate as a `gate_movement` variant on the existing QS_GATE product, no new TypeScript calculator logic) is the right architectural model — proves that adding gate variants is data-driven authoring, not code. But the math.js expressions and selector matches need workbook validation before going live.

## Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes including `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run build` passes
- [ ] `npm run seed:products` succeeds against the target Supabase project (after merge)
- [ ] **Workbook regression: at least 3 configurations from QSG sliding gates V2-T1 workbook match line-for-line.**
- [ ] Netlify deploy preview: a sliding gate added to a fence renders correctly on iPhone Safari, with the right hardware in the BOM
- [ ] PR base branch is `main` (NOT `master`)
- [ ] Branch was rebased on top of PR #1 (ColorBond UI consistency) before opening this PR
- [ ] Math.js string comparisons use `equalText()` not `==` (per `discovery.md`)

## Known gotcha

The QSG sliding work introduces `gate_movement` as a per-quote variable on the existing QS_GATE product. After brief 033 lands, all QS_GATE rows are tagged with `system_instance_id = qs-gate` (combined swing + sliding) — see brief 033's mapping table for the rationale.

## After merge

- Run `npm run seed:products` to push the extended qs_gate.json to Supabase.
- Update `readiness_status` on the `qs-gate` system_instance from `calculator_ready` to `spreadsheet_tested` once workbook regression is in.
- Update `readiness_status` to `approved` once admin signs off (manual via brief 035's admin UI once that ships).

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/028-pre-release-pr-descriptions/qsg-workbook-regression-checklist.md -->

# QSG Sliding Gates — Workbook Regression Checklist

**Source workbook:** `Order-Form+QSG+Sliding+Gates~V2-T1.xlsx` (uploaded to a prior Hyperagent thread; Liam will need to re-upload to this thread or extract to repo's `_briefs/assets/qsg-workbook/`)
**Target:** unblock the `codex/qsg-sliding-gates-calculator` PR for merge

---

## The 3-5 configurations to regress

Pick configurations that span the typical range. Minimum 3; up to 5 ideal:

1. **Small standard sliding gate** — single slide, ~3.0m clear opening, 65mm slat, 9mm gap, single colour (Black or Monument)
2. **Standard sliding gate** — single slide, ~4.5m clear opening, 65mm slat, 9mm gap, default colour
3. **Large sliding gate with cantilever offset** — single slide, ~5.5m clear opening, 65mm slat, 20mm gap, default colour
4. (Optional) **Double-leaf sliding gate** — bi-parting if the system supports it
5. (Optional) **Edge case** — non-standard slat width or gap that exercises the validation rules

For each configuration:

## The regression procedure

### Step 1 — capture the inputs

From the workbook's Inputs tab:
- Clear opening width (mm)
- Gate height (mm)
- Slat size (65 / 90)
- Gap (5 / 9 / 20)
- Colour
- Post type (1W / 2W / 90)
- Any optional accessories (clamps, latches, motor pre-wire)

### Step 2 — capture the expected outputs

From the workbook's BOM tab:
- Every line item: `(sku, qty, taxonomy)`
- Note any optional rows the workbook surfaces (vs. auto-add only)

### Step 3 — run the calculator

In a fresh quote on the deploy preview for `codex/qsg-sliding-gates-calculator`:
- Enter inputs verbatim
- Add a sliding gate of the configured size
- Generate BOM

### Step 4 — diff line-by-line

Use this template:

| SKU | Expected qty | Actual qty | Expected taxonomy | Actual taxonomy | Match? |
|---|---|---|---|---|---|
| QSG-… | 5 | 5 | auto_add | auto_add | ✓ |
| QSG-… | 3 | 2 | auto_add | auto_add | **✗** |

Any row with `Match? = ✗` is a regression bug. The PR cannot merge until all configurations show 100% line-by-line match.

### Step 5 — file the diff in the PR

Paste the diff table into the PR body as a comment. Tag Codex (or open a follow-up brief) for any mismatches.

---

## Common failure modes (from prior gates work)

- **Math.js string comparison** — `gate_movement == "sliding"` evaluates wrong; must use `equalText(gate_movement, "sliding")`. Codex's discovery.md flags this.
- **Off-by-one bay count** — sliding gates measure clear opening DIFFERENTLY from swing (they need overlap and tail support; the bay calc must account for that).
- **Missing cantilever offset adders** — sliding gates that overhang need extra hardware (rollers, end stops, anti-lift). The selector matches must surface these.
- **Wrong post count** — sliding gates typically need 2 posts on the latch side OR a wall pocket. Make sure the post count rule isn't reusing the swing-gate formula.

---

## If regression passes

Update the PR description to add:

> **Workbook regression: ✓ 3 (or 5) configurations match line-for-line against `Order-Form+QSG+Sliding+Gates~V2-T1.xlsx`. Diff results pasted in PR comments below.**

Then the PR can be marked ready for review (still draft until merged though — never set ready-for-review without Liam clicking that).

## If regression fails on ≥1 config

Don't merge. Either:
1. Fix the seed JSON rules in a follow-up commit on the same branch, re-run regression, repeat until clean
2. OR split the QSG sliding work into smaller pieces — merge what's correct, open a follow-up brief for what's not

The trust anchor is the workbook. Don't ship sliding gates that under-quote a real job — that's a refund email Liam doesn't want.

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/043-discount-fencing-seeds/cca-pine-paling.json -->

{
  "org_slug": "glass-outlet",
  "supplier_slug": "discount-fencing",
  "system_instance_slug": "dfsau-cca-pine-paling",
  "_format_note": "Matches the canonical seed shape used by Glass Outlet seed files (org_slug + products[] + product_components[]). Rules, variables, selectors, validations are NOT in this seed file — they are wired up via the admin Rule-Authoring UI (brief 037) after this seed lands, with the system_instance moving from 'imported' to 'calculator_ready' once that's done.",
  "_source": "https://www.dfsau.com.au/timber-fencing (public retail prices observed 2026-05-28)",
  "products": [
    {
      "system_type": "DF_CCA_PAL",
      "product_type": "fence",
      "name": "Discount Fencing — CCA Pine Paling Fence",
      "description": "CCA Pine paling fence using 100×16 palings, 100×75 pine posts, 75×38 or 100×38 pine rails. Sourced from Discount Fencing Supplies (Burleigh Heads, QLD). Seed-time the seed loader resolves supplier_id from supplier_slug + system_instance_id from (supplier_slug, system_instance_slug) and stamps the row.",
      "active": true,
      "sort_order": 100,
      "metadata": {
        "_provenance": {
          "supplier_slug": "discount-fencing",
          "system_instance_slug": "dfsau-cca-pine-paling"
        },
        "allowedAngles": [90, 135, 180],
        "options": {
          "fenceHeight": ["1200", "1500", "1800", "2100", "2400"],
          "railCount": ["2", "3"],
          "railProfile": ["75x38", "100x38_arrissed"]
        },
        "notes": "Concrete bags for post setting are sold under a separate 'consumable' category that lives outside this seed (Discount Fencing doesn't ship concrete in their public price list — sourced separately)."
      }
    }
  ],
  "product_components": [
    {
      "sku": "DF-PAL-100x16-1200",
      "name": "CCA Pine Paling 100×16×1200mm",
      "description": "CCA Treated Pine paling, 100mm wide × 16mm thick, 1200mm length",
      "category": "paling",
      "unit": "each",
      "default_price": 1.74,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "height_mm": 1200, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "palings", "sortPriority": 10
    },
    {
      "sku": "DF-PAL-100x16-1800",
      "name": "CCA Pine Paling 100×16×1800mm",
      "description": "CCA Treated Pine paling, 100mm wide × 16mm thick, 1800mm length",
      "category": "paling",
      "unit": "each",
      "default_price": 2.15,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "height_mm": 1800, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "palings", "sortPriority": 10
    },
    {
      "sku": "DF-PAL-100x16-2100",
      "name": "CCA Pine Paling 100×16×2100mm",
      "description": "CCA Treated Pine paling, 100mm wide × 16mm thick, 2100mm length",
      "category": "paling",
      "unit": "each",
      "default_price": 2.90,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "height_mm": 2100, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "palings", "sortPriority": 10
    },
    {
      "sku": "DF-PAL-100x16-2400",
      "name": "CCA Pine Paling 100×16×2400mm",
      "description": "CCA Treated Pine paling, 100mm wide × 16mm thick, 2400mm length",
      "category": "paling",
      "unit": "each",
      "default_price": 3.40,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "height_mm": 2400, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "palings", "sortPriority": 10
    },
    {
      "sku": "DF-POST-100x75-1800",
      "name": "CCA Pine Post 100×75×1800mm",
      "description": "CCA Treated Pine post, 100×75mm, 1800mm length",
      "category": "post",
      "unit": "each",
      "default_price": 14.70,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "length_mm": 1800, "width_mm": 100, "depth_mm": 75, "material": "CCA Pine",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 20
    },
    {
      "sku": "DF-POST-100x75-2400",
      "name": "CCA Pine Post 100×75×2400mm",
      "description": "CCA Treated Pine post, 100×75mm, 2400mm length",
      "category": "post",
      "unit": "each",
      "default_price": 19.60,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "length_mm": 2400, "width_mm": 100, "depth_mm": 75, "material": "CCA Pine",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 20
    },
    {
      "sku": "DF-POST-100x75-3000",
      "name": "CCA Pine Post 100×75×3000mm",
      "description": "CCA Treated Pine post, 100×75mm, 3000mm length",
      "category": "post",
      "unit": "each",
      "default_price": 24.50,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "length_mm": 3000, "width_mm": 100, "depth_mm": 75, "material": "CCA Pine",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 20
    },
    {
      "sku": "DF-RAIL-75x38-4800",
      "name": "CCA Pine Rail 75×38×4800mm",
      "description": "CCA Treated Pine rail, 75×38mm, 4800mm stock length",
      "category": "rail",
      "unit": "length",
      "default_price": 12.10,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "length_mm": 4800, "width_mm": 75, "thickness_mm": 38, "material": "CCA Pine",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "rails", "sortPriority": 30
    },
    {
      "sku": "DF-RAIL-100x38-ARR-4800",
      "name": "CCA Pine Rail Arrissed 100×38×4800mm",
      "description": "CCA Treated Pine arrissed (eased-edge) rail, 100×38mm, 4800mm stock length",
      "category": "rail",
      "unit": "length",
      "default_price": 17.00,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "length_mm": 4800, "width_mm": 100, "thickness_mm": 38, "material": "CCA Pine", "profile": "arrissed",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "rails", "sortPriority": 30
    },
    {
      "sku": "DF-SLEEPER-200x50-2400",
      "name": "CCA Pine Arrissed Sleeper 200×50×2400mm",
      "description": "CCA Treated Pine retaining-wall sleeper, arrissed edges, 200×50mm, 2400mm length",
      "category": "sleeper",
      "unit": "each",
      "default_price": 24.80,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "length_mm": 2400, "width_mm": 200, "thickness_mm": 50, "material": "CCA Pine", "profile": "arrissed",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "sleepers", "sortPriority": 40
    },
    {
      "sku": "DF-SLEEPER-200x50-3000",
      "name": "CCA Pine Arrissed Sleeper 200×50×3000mm",
      "description": "CCA Treated Pine retaining-wall sleeper, arrissed edges, 200×50mm, 3000mm length",
      "category": "sleeper",
      "unit": "each",
      "default_price": 30.00,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "length_mm": 3000, "width_mm": 200, "thickness_mm": 50, "material": "CCA Pine", "profile": "arrissed",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "sleepers", "sortPriority": 40
    },
    {
      "sku": "DF-SLEEPER-200x75-2400",
      "name": "CCA Pine Arrissed Sleeper 200×75×2400mm",
      "description": "CCA Treated Pine retaining-wall sleeper, arrissed edges, 200×75mm, 2400mm length",
      "category": "sleeper",
      "unit": "each",
      "default_price": 33.00,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "length_mm": 2400, "width_mm": 200, "thickness_mm": 75, "material": "CCA Pine", "profile": "arrissed",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "sleepers", "sortPriority": 40
    },
    {
      "sku": "DF-SLEEPER-200x75-3000",
      "name": "CCA Pine Arrissed Sleeper 200×75×3000mm",
      "description": "CCA Treated Pine retaining-wall sleeper, arrissed edges, 200×75mm, 3000mm length",
      "category": "sleeper",
      "unit": "each",
      "default_price": 40.00,
      "system_types": ["DF_CCA_PAL"],
      "metadata": {
        "length_mm": 3000, "width_mm": 200, "thickness_mm": 75, "material": "CCA Pine", "profile": "arrissed",
        "price_source": "dfsau.com.au/timber-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "sleepers", "sortPriority": 40
    }
  ]
}

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/043-discount-fencing-seeds/aluminium-pool.json -->

{
  "org_slug": "glass-outlet",
  "supplier_slug": "discount-fencing",
  "system_instance_slug": "dfsau-aluminium-pool",
  "_format_note": "Matches the canonical seed shape used by Glass Outlet seed files (org_slug + products[] + product_components[]). Rules, variables, selectors, validations are NOT in this seed file — they are wired up via the admin Rule-Authoring UI (brief 037) after this seed lands.",
  "_source": "https://www.dfsau.com.au/aluminium-pool-fencing (public retail prices observed 2026-05-28). All panels compliant with Australian pool safety standards; Form 15 supplied on request.",
  "products": [
    {
      "system_type": "DF_AL_POOL",
      "product_type": "fence",
      "name": "Discount Fencing — Aluminium Pool Fence",
      "description": "Aluminium pool fencing in flat-top, spear-top, and loop-top profiles. Black stock + powder coat to any colour. Form 15 pool safety certificate supplied on request.",
      "active": true,
      "sort_order": 110,
      "metadata": {
        "_provenance": {
          "supplier_slug": "discount-fencing",
          "system_instance_slug": "dfsau-aluminium-pool"
        },
        "allowedAngles": [90, 135, 180],
        "options": {
          "panelProfile": ["flat_top", "spear_top", "loop_top"],
          "panelColour": ["black", "powdercoat_choice"],
          "postFixing": ["core_drill", "flanged"],
          "panelWidth": ["2400", "2450", "2475", "3000"]
        },
        "compliance": "AS_pool_safety",
        "form_15_available": true,
        "notes": "Custom panels priced on application; Dave handles pool fence certification design."
      }
    }
  ],
  "product_components": [
    {
      "sku": "DF-AP-FT-BLK-2450",
      "name": "Flat-top Pool Panel 2450mm — Black",
      "description": "Aluminium flat-top pool panel, 2450mm wide × 1200mm high, Black",
      "category": "panel",
      "unit": "each",
      "default_price": 94.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "width_mm": 2450, "height_mm": 1200, "profile": "flat_top", "colour": "black",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "panels", "sortPriority": 10
    },
    {
      "sku": "DF-AP-FT-BLK-3000",
      "name": "Flat-top Pool Panel 3000mm — Black",
      "description": "Aluminium flat-top pool panel, 3000mm wide × 1200mm high, Black",
      "category": "panel",
      "unit": "each",
      "default_price": 129.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "width_mm": 3000, "height_mm": 1200, "profile": "flat_top", "colour": "black",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "panels", "sortPriority": 10
    },
    {
      "sku": "DF-AP-FT-COL-2475",
      "name": "Flat-top Pool Panel 2475mm — Powdercoat",
      "description": "Aluminium flat-top pool panel, 2475mm wide × 1200mm high, powder-coated to chosen colour",
      "category": "panel",
      "unit": "each",
      "default_price": 115.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "width_mm": 2475, "height_mm": 1200, "profile": "flat_top", "colour": "powdercoat_choice",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28",
        "lead_time": "1-2 weeks"
      },
      "active": true, "subCategory": "panels", "sortPriority": 10
    },
    {
      "sku": "DF-AP-FT-COL-3000",
      "name": "Flat-top Pool Panel 3000mm — Powdercoat",
      "description": "Aluminium flat-top pool panel, 3000mm wide × 1200mm high, powder-coated to chosen colour",
      "category": "panel",
      "unit": "each",
      "default_price": 150.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "width_mm": 3000, "height_mm": 1200, "profile": "flat_top", "colour": "powdercoat_choice",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28",
        "lead_time": "1-2 weeks"
      },
      "active": true, "subCategory": "panels", "sortPriority": 10
    },
    {
      "sku": "DF-AP-SPEAR-2400x1200-BLK",
      "name": "Spear-top Pool Panel 2400×1200 — Black",
      "description": "Aluminium spear-top pool panel, 2400mm wide × 1200mm high, Black",
      "category": "panel",
      "unit": "each",
      "default_price": 155.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "width_mm": 2400, "height_mm": 1200, "profile": "spear_top", "colour": "black",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "panels", "sortPriority": 12
    },
    {
      "sku": "DF-AP-LOOP-2400x1200-BLK",
      "name": "Loop-top Pool Panel 2400×1200 — Black",
      "description": "Aluminium loop-top pool panel, 2400mm wide × 1200mm high, Black (POA — needs concrete pricing from supplier)",
      "category": "panel",
      "unit": "each",
      "default_price": null,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "width_mm": 2400, "height_mm": 1200, "profile": "loop_top", "colour": "black",
        "price_status": "POA",
        "price_source": "dfsau.com.au/aluminium-pool-fencing (price not shown on public page; needs PDF)",
        "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "panels", "sortPriority": 14
    },
    {
      "sku": "DF-AP-GATE-975-BLK",
      "name": "Pool Gate 975mm — Black",
      "description": "Standard pool gate, 975mm wide × 1200mm high, Black, swing",
      "category": "gate",
      "unit": "each",
      "default_price": 69.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "width_mm": 975, "height_mm": 1200, "colour": "black", "gate_movement": "swing",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "gates", "sortPriority": 20
    },
    {
      "sku": "DF-AP-GATE-975-COL",
      "name": "Pool Gate 975mm — Powdercoat",
      "description": "Standard pool gate, 975mm wide × 1200mm high, powder-coated to chosen colour, swing",
      "category": "gate",
      "unit": "each",
      "default_price": 115.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "width_mm": 975, "height_mm": 1200, "colour": "powdercoat_choice", "gate_movement": "swing",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "gates", "sortPriority": 20
    },
    {
      "sku": "DF-AP-GATE-1515-ADJ-BLK",
      "name": "Adjustable Pool Gate 1515mm — Black",
      "description": "Adjustable pool gate, 1515mm wide × 1200mm high, Black",
      "category": "gate",
      "unit": "each",
      "default_price": 113.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "width_mm": 1515, "height_mm": 1200, "colour": "black", "adjustable": true,
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "gates", "sortPriority": 22
    },
    {
      "sku": "DF-AP-POST-1800-BLK",
      "name": "Pool Post 1800mm — Black",
      "description": "Core-drill pool post, 1800mm length, Black",
      "category": "post",
      "unit": "each",
      "default_price": 26.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "length_mm": 1800, "colour": "black", "fixing": "core_drill",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 30
    },
    {
      "sku": "DF-AP-POST-2100-BLK",
      "name": "Pool Post 2100mm — Black",
      "description": "Core-drill pool post, 2100mm length, Black",
      "category": "post",
      "unit": "each",
      "default_price": 28.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "length_mm": 2100, "colour": "black", "fixing": "core_drill",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 30
    },
    {
      "sku": "DF-AP-POST-1800-COL",
      "name": "Pool Post 1800mm — Powdercoat",
      "description": "Core-drill pool post, 1800mm length, powder-coated",
      "category": "post",
      "unit": "each",
      "default_price": 32.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "length_mm": 1800, "colour": "powdercoat_choice", "fixing": "core_drill",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 30
    },
    {
      "sku": "DF-AP-POST-2100-COL",
      "name": "Pool Post 2100mm — Powdercoat",
      "description": "Core-drill pool post, 2100mm length, powder-coated",
      "category": "post",
      "unit": "each",
      "default_price": 35.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "length_mm": 2100, "colour": "powdercoat_choice", "fixing": "core_drill",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 30
    },
    {
      "sku": "DF-AP-FLPOST-1300-BLK",
      "name": "Flanged Post 1300mm — Black",
      "description": "Flanged pool post, 1300mm length, Black",
      "category": "post",
      "unit": "each",
      "default_price": 29.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "length_mm": 1300, "colour": "black", "fixing": "flanged",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 32
    },
    {
      "sku": "DF-AP-FLPOST-1600-BLK",
      "name": "Flanged Post 1600mm — Black",
      "description": "Flanged pool post, 1600mm length, Black",
      "category": "post",
      "unit": "each",
      "default_price": 31.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "length_mm": 1600, "colour": "black", "fixing": "flanged",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 32
    },
    {
      "sku": "DF-AP-FLPOST-1300-COL",
      "name": "Flanged Post 1300mm — Powdercoat",
      "description": "Flanged pool post, 1300mm length, powder-coated",
      "category": "post",
      "unit": "each",
      "default_price": 42.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "length_mm": 1300, "colour": "powdercoat_choice", "fixing": "flanged",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 32
    },
    {
      "sku": "DF-AP-FLPOST-1500-COL",
      "name": "Flanged Post 1500mm — Powdercoat",
      "description": "Flanged pool post, 1500mm length, powder-coated",
      "category": "post",
      "unit": "each",
      "default_price": 44.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "length_mm": 1500, "colour": "powdercoat_choice", "fixing": "flanged",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "posts", "sortPriority": 32
    },
    {
      "sku": "DF-AP-SHROUD-BLK",
      "name": "Post Shroud — Black",
      "description": "Decorative shroud cover for pool post, Black",
      "category": "accessory",
      "unit": "each",
      "default_price": 3.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "colour": "black", "fits": "post",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "accessories", "sortPriority": 40
    },
    {
      "sku": "DF-AP-SHROUD-COL",
      "name": "Post Shroud — Powdercoat",
      "description": "Decorative shroud cover for pool post, powder-coated",
      "category": "accessory",
      "unit": "each",
      "default_price": 3.00,
      "system_types": ["DF_AL_POOL"],
      "metadata": {
        "colour": "powdercoat_choice", "fits": "post",
        "price_source": "dfsau.com.au/aluminium-pool-fencing", "price_verified_date": "2026-05-28"
      },
      "active": true, "subCategory": "accessories", "sortPriority": 40
    }
  ]
}

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/043-discount-fencing-seeds/aluminium-slat-gate.json -->

{
  "org_slug": "glass-outlet",
  "supplier_slug": "discount-fencing",
  "system_instance_slug": "dfsau-aluminium-slat-gate",
  "_format_note": "Standalone instance for the $399 aluminium slat gate promoted on the Discount Fencing Colorbond page. Single SKU; gate companion product. Rules/variables wired via admin UI in brief 037 after this seeds.",
  "_source": "https://www.dfsau.com.au/colorbond (public retail prices observed 2026-05-28: '930 X 1800 HIGH ALUMINIUM SLAT GATES $399 AVAILABLE IN 8 COLORS')",
  "products": [
    {
      "system_type": "DF_AL_SLAT_GATE",
      "product_type": "gate",
      "name": "Discount Fencing — Aluminium Slat Gate (930 × 1800)",
      "description": "Single-leaf aluminium slat swing gate, 930mm wide × 1800mm high. Available in 8 colours at $399. Promoted as a companion gate for ColorBond and Security fence installations.",
      "active": true,
      "sort_order": 130,
      "metadata": {
        "_provenance": {
          "supplier_slug": "discount-fencing",
          "system_instance_slug": "dfsau-aluminium-slat-gate"
        },
        "standard_size_mm": { "width": 930, "height": 1800 },
        "available_colours_count": 8,
        "gate_movement": "swing",
        "_note": "Companion gate — pairs with dfsau-colorbond and dfsau-aluminium-security instances."
      }
    }
  ],
  "product_components": [
    {
      "sku": "DF-ALG-930x1800-BLK",
      "name": "Aluminium Slat Gate 930×1800 — Black",
      "description": "Aluminium slat swing gate, 930mm wide × 1800mm high, Black",
      "category": "gate",
      "unit": "each",
      "default_price": 399.00,
      "system_types": ["DF_AL_SLAT_GATE"],
      "metadata": {
        "width_mm": 930, "height_mm": 1800, "colour": "black", "gate_movement": "swing",
        "price_source": "dfsau.com.au/colorbond promo banner", "price_verified_date": "2026-05-28"
      },
      "active": true,
      "subCategory": "gates",
      "sortPriority": 10
    },
    {
      "sku": "DF-ALG-930x1800-COL",
      "name": "Aluminium Slat Gate 930×1800 — Colour (any of 8)",
      "description": "Aluminium slat swing gate, 930mm wide × 1800mm high, available in 8 powdercoat colours (specify on order)",
      "category": "gate",
      "unit": "each",
      "default_price": 399.00,
      "system_types": ["DF_AL_SLAT_GATE"],
      "metadata": {
        "width_mm": 930, "height_mm": 1800, "colour": "powdercoat_choice_of_8", "gate_movement": "swing",
        "price_source": "dfsau.com.au/colorbond promo banner", "price_verified_date": "2026-05-28",
        "_note": "Confirm 8 specific colours from supplier on order. Price is the same across all 8 colours per the public promo."
      },
      "active": true,
      "subCategory": "gates",
      "sortPriority": 12
    }
  ]
}

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/046-amazing-fencing-seeds/colorbond.json -->

{
  "org_slug": "glass-outlet",
  "supplier_slug": "amazing-fencing",
  "system_instance_slug": "amazing-colorbond",
  "_format_note": "ColorBond steel panel fencing as sold by Amazing Fencing using multi-brand sheets (Gramline / Lysaght / Oxworks / ColorMAX). Standard galvanised + coloured posts/rails/sheets. Prices null — trade pricing PDF required.",
  "_source": "https://amazingfencing.com.au/products/colorbond-fencing/ + https://www.fencing-supplies.com.au/colorbond-steel-fencing-supplies/ (SKU list 2026-05-28)",
  "products": [
    {
      "system_type": "AF_COLORBOND",
      "product_type": "fence",
      "name": "Amazing Fencing — ColorBond Steel",
      "description": "Standard ColorBond steel panel fence using sheets + posts + rails. Multi-brand sourcing (Gramline / Lysaght / Oxworks / ColorMAX). C posts in 2.1/2.4/2.7/3.0m; sheets in 1.5/1.8/2.1/2.4m heights.",
      "active": true,
      "sort_order": 200,
      "metadata": {
        "_provenance": {"supplier_slug": "amazing-fencing", "system_instance_slug": "amazing-colorbond"},
        "brand_partners": ["Gramline", "Lysaght", "Oxworks", "ColorMAX"],
        "standard_heights_m": [1.5, 1.8, 2.1, 2.4]
      }
    }
  ],
  "product_components": [
    {"sku": "AF-CBD-CPOST-2.1", "name": "C Post 2.1m (ColorBond)", "description": "C post 2.1m, generic steel", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 2.1, "post_type": "C"}, "active": true, "subCategory": "posts", "sortPriority": 10},
    {"sku": "AF-CBD-CPOST-2.4", "name": "C Post 2.4m (ColorBond)", "description": "C post 2.4m, generic steel", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 2.4, "post_type": "C"}, "active": true, "subCategory": "posts", "sortPriority": 10},
    {"sku": "AF-CBD-CPOST-2.7", "name": "C Post 2.7m (ColorBond)", "description": "C post 2.7m, generic steel", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 2.7, "post_type": "C"}, "active": true, "subCategory": "posts", "sortPriority": 10},
    {"sku": "AF-CBD-CPOST-3.0", "name": "C Post 3.0m (ColorBond)", "description": "C post 3.0m, generic steel", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 3.0, "post_type": "C"}, "active": true, "subCategory": "posts", "sortPriority": 10},

    {"sku": "AF-CBD-COLPOST-50x50-2.4", "name": "Coloured Post 50×50 × 2.4m", "description": "Coloured steel post, 50×50mm × 2.4m", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 2.4, "width_mm": 50, "depth_mm": 50, "finish": "powdercoat"}, "active": true, "subCategory": "posts", "sortPriority": 12},
    {"sku": "AF-CBD-COLPOST-50x50-3.0", "name": "Coloured Post 50×50 × 3.0m", "description": "Coloured steel post, 50×50mm × 3.0m", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 3.0, "width_mm": 50, "depth_mm": 50, "finish": "powdercoat"}, "active": true, "subCategory": "posts", "sortPriority": 12},
    {"sku": "AF-CBD-COLPOST-65x65-2.4", "name": "Coloured Post 65×65 × 2.4m", "description": "Coloured steel post, 65×65mm × 2.4m", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 2.4, "width_mm": 65, "depth_mm": 65, "finish": "powdercoat"}, "active": true, "subCategory": "posts", "sortPriority": 12},
    {"sku": "AF-CBD-COLPOST-65x65-3.0", "name": "Coloured Post 65×65 × 3.0m", "description": "Coloured steel post, 65×65mm × 3.0m", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 3.0, "width_mm": 65, "depth_mm": 65, "finish": "powdercoat"}, "active": true, "subCategory": "posts", "sortPriority": 12},

    {"sku": "AF-CBD-GALVPOST-50x50-2.4", "name": "P/Coated Galv Post 50×50 × 2.4m", "description": "Powdercoated galvanised post, 50×50mm × 2.4m", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 2.4, "width_mm": 50, "depth_mm": 50, "finish": "p_coated_galv"}, "active": true, "subCategory": "posts", "sortPriority": 14},
    {"sku": "AF-CBD-GALVPOST-50x50-3.0", "name": "P/Coated Galv Post 50×50 × 3.0m", "description": "Powdercoated galvanised post, 50×50mm × 3.0m", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 3.0, "width_mm": 50, "depth_mm": 50, "finish": "p_coated_galv"}, "active": true, "subCategory": "posts", "sortPriority": 14},
    {"sku": "AF-CBD-GALVPOST-65x65-2.4", "name": "P/Coated Galv Post 65×65 × 2.4m", "description": "Powdercoated galvanised post, 65×65mm × 2.4m", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 2.4, "width_mm": 65, "depth_mm": 65, "finish": "p_coated_galv"}, "active": true, "subCategory": "posts", "sortPriority": 14},
    {"sku": "AF-CBD-GALVPOST-65x65-3.0", "name": "P/Coated Galv Post 65×65 × 3.0m", "description": "Powdercoated galvanised post, 65×65mm × 3.0m", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND", "AF_TIMBER_SLAT"], "metadata": {"length_m": 3.0, "width_mm": 65, "depth_mm": 65, "finish": "p_coated_galv"}, "active": true, "subCategory": "posts", "sortPriority": 14},
    {"sku": "AF-CBD-GALVPOST-65x65-4.0", "name": "P/Coated Galv Post 65×65 × 4.0m", "description": "Powdercoated galvanised post, 65×65mm × 4.0m", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 4.0, "width_mm": 65, "depth_mm": 65, "finish": "p_coated_galv"}, "active": true, "subCategory": "posts", "sortPriority": 14},

    {"sku": "AF-CBD-RAIL-2.35", "name": "Rail 2.35m", "description": "Standard rail 2.35m", "category": "rail", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 2.35}, "active": true, "subCategory": "rails", "sortPriority": 20},
    {"sku": "AF-CBD-RAIL-3.10", "name": "Rail 3.10m", "description": "Standard rail 3.10m", "category": "rail", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 3.10}, "active": true, "subCategory": "rails", "sortPriority": 20},

    {"sku": "AF-CBD-SHEET-1.5", "name": "Sheet 1.5m height", "description": "ColorBond sheet, 1.5m height", "category": "sheet", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"height_m": 1.5}, "active": true, "subCategory": "sheets", "sortPriority": 30},
    {"sku": "AF-CBD-SHEET-1.8", "name": "Sheet 1.8m height", "description": "ColorBond sheet, 1.8m height", "category": "sheet", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"height_m": 1.8}, "active": true, "subCategory": "sheets", "sortPriority": 30},
    {"sku": "AF-CBD-SHEET-2.1", "name": "Sheet 2.1m height", "description": "ColorBond sheet, 2.1m height", "category": "sheet", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"height_m": 2.1}, "active": true, "subCategory": "sheets", "sortPriority": 30},
    {"sku": "AF-CBD-SHEET-2.4", "name": "Sheet 2.4m height", "description": "ColorBond sheet, 2.4m height", "category": "sheet", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"height_m": 2.4}, "active": true, "subCategory": "sheets", "sortPriority": 30},

    {"sku": "AF-CBD-GATE-STD-SGL-0.9", "name": "Standard Single Gate 0.9m (GP Bundle)", "description": "Standard single gate, 0.9m wide, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"width_m": 0.9, "gate_movement": "swing", "bundle": "GP"}, "active": true, "subCategory": "gates", "sortPriority": 40},
    {"sku": "AF-CBD-GATE-STD-SGL-1.2", "name": "Standard Single Gate 1.2m (GP Bundle)", "description": "Standard single gate, 1.2m wide, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"width_m": 1.2, "gate_movement": "swing", "bundle": "GP"}, "active": true, "subCategory": "gates", "sortPriority": 40},
    {"sku": "AF-CBD-GATE-STD-SGL-1.5", "name": "Standard Single Gate 1.5m (GP Bundle)", "description": "Standard single gate, 1.5m wide, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"width_m": 1.5, "gate_movement": "swing", "bundle": "GP"}, "active": true, "subCategory": "gates", "sortPriority": 40},
    {"sku": "AF-CBD-GATE-STD-SGL-1.8", "name": "Standard Single Gate 1.8m (GP Bundle)", "description": "Standard single gate, 1.8m wide, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"width_m": 1.8, "gate_movement": "swing", "bundle": "GP"}, "active": true, "subCategory": "gates", "sortPriority": 40},
    {"sku": "AF-CBD-GATE-STD-SGL-2.1", "name": "Standard Single Gate 2.1m (GP Bundle)", "description": "Standard single gate, 2.1m wide, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"width_m": 2.1, "gate_movement": "swing", "bundle": "GP"}, "active": true, "subCategory": "gates", "sortPriority": 40},

    {"sku": "AF-CBD-GATE-STD-DBL-0.9", "name": "Standard Double Gate 0.9m (GP Bundle)", "description": "Standard double gate, 0.9m total, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"width_m": 0.9, "gate_movement": "swing", "bundle": "GP", "leaves": 2}, "active": true, "subCategory": "gates", "sortPriority": 42},
    {"sku": "AF-CBD-GATE-STD-DBL-1.2", "name": "Standard Double Gate 1.2m (GP Bundle)", "description": "Standard double gate, 1.2m total, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"width_m": 1.2, "gate_movement": "swing", "bundle": "GP", "leaves": 2}, "active": true, "subCategory": "gates", "sortPriority": 42},
    {"sku": "AF-CBD-GATE-STD-DBL-1.5", "name": "Standard Double Gate 1.5m (GP Bundle)", "description": "Standard double gate, 1.5m total, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"width_m": 1.5, "gate_movement": "swing", "bundle": "GP", "leaves": 2}, "active": true, "subCategory": "gates", "sortPriority": 42},
    {"sku": "AF-CBD-GATE-STD-DBL-1.8", "name": "Standard Double Gate 1.8m (GP Bundle)", "description": "Standard double gate, 1.8m total, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"width_m": 1.8, "gate_movement": "swing", "bundle": "GP", "leaves": 2}, "active": true, "subCategory": "gates", "sortPriority": 42},
    {"sku": "AF-CBD-GATE-STD-DBL-2.1", "name": "Standard Double Gate 2.1m (GP Bundle)", "description": "Standard double gate, 2.1m total, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"width_m": 2.1, "gate_movement": "swing", "bundle": "GP", "leaves": 2}, "active": true, "subCategory": "gates", "sortPriority": 42},

    {"sku": "AF-CBD-GATEHW-BUTT-HINGE", "name": "Gate Hardware — Butt Hinges", "description": "Pair of butt hinges for gate", "category": "hardware", "unit": "pack", "default_price": null, "system_types": ["AF_COLORBOND", "AF_PERMASTEEL"], "metadata": {}, "active": true, "subCategory": "hardware", "sortPriority": 50},
    {"sku": "AF-CBD-GATEHW-D-LATCH", "name": "Gate Hardware — D Latch + Striker + Handle", "description": "D-latch kit including striker and handle", "category": "hardware", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND", "AF_PERMASTEEL"], "metadata": {}, "active": true, "subCategory": "hardware", "sortPriority": 50},
    {"sku": "AF-CBD-GATEHW-DOUBLE-SET", "name": "Gate Hardware — Double Gate Set", "description": "Hardware kit for double swing gate", "category": "hardware", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND", "AF_PERMASTEEL"], "metadata": {}, "active": true, "subCategory": "hardware", "sortPriority": 50},
    {"sku": "AF-CBD-GATEHW-DROP-BOLT", "name": "Gate Hardware — Drop Bolt", "description": "Drop bolt for double gates", "category": "hardware", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND", "AF_PERMASTEEL"], "metadata": {}, "active": true, "subCategory": "hardware", "sortPriority": 50},

    {"sku": "AF-CBD-LATTICE-2.35", "name": "Lattice Sheet 2.35m", "description": "Lattice sheet 2.35m", "category": "lattice", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 2.35}, "active": true, "subCategory": "lattice", "sortPriority": 60},
    {"sku": "AF-CBD-LATTICE-3.10", "name": "Lattice Sheet 3.10m", "description": "Lattice sheet 3.10m", "category": "lattice", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_m": 3.10}, "active": true, "subCategory": "lattice", "sortPriority": 60},

    {"sku": "AF-CBD-CAP-100x100", "name": "100×100 Square Metal Cap", "description": "Post cap for 100×100 posts", "category": "cap", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND", "AF_PERMASTEEL"], "metadata": {}, "active": true, "subCategory": "caps", "sortPriority": 70},

    {"sku": "AF-CBD-SCREW-BUGEL-50", "name": "Bugel Batten Screw 50mm", "description": "Bugel batten screw 50mm", "category": "screw", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND", "AF_TIMBER_PALING", "AF_TIMBER_SLAT"], "metadata": {"length_mm": 50, "type": "bugel_batten"}, "active": true, "subCategory": "screws", "sortPriority": 80},
    {"sku": "AF-CBD-SCREW-BUGEL-75", "name": "Bugel Batten Screw 75mm", "description": "Bugel batten screw 75mm", "category": "screw", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND", "AF_TIMBER_PALING", "AF_TIMBER_SLAT"], "metadata": {"length_mm": 75, "type": "bugel_batten"}, "active": true, "subCategory": "screws", "sortPriority": 80},
    {"sku": "AF-CBD-SCREW-BUGEL-100", "name": "Bugel Batten Screw 100mm", "description": "Bugel batten screw 100mm", "category": "screw", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND", "AF_TIMBER_PALING"], "metadata": {"length_mm": 100, "type": "bugel_batten"}, "active": true, "subCategory": "screws", "sortPriority": 80},
    {"sku": "AF-CBD-SCREW-TEK-20", "name": "Metal Tek Screw 20mm", "description": "Tek screw 20mm for metal", "category": "screw", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_mm": 20, "type": "tek"}, "active": true, "subCategory": "screws", "sortPriority": 80},
    {"sku": "AF-CBD-SCREW-TEK-35", "name": "Metal Tek Screw 35mm", "description": "Tek screw 35mm for metal", "category": "screw", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"length_mm": 35, "type": "tek"}, "active": true, "subCategory": "screws", "sortPriority": 80},
    {"sku": "AF-CBD-SCREW-COLOURED-SD10", "name": "Coloured Screw SD 10-16 × 16mm Hex", "description": "Coloured hex screw, SD 10-16 × 16mm", "category": "screw", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND"], "metadata": {"type": "hex_coloured"}, "active": true, "subCategory": "screws", "sortPriority": 82},

    {"sku": "AF-CBD-TOUCHUP-PAINT", "name": "Touch-up Paint", "description": "Colour-matched touch-up paint for steel fence", "category": "accessory", "unit": "each", "default_price": null, "system_types": ["AF_COLORBOND", "AF_PERMASTEEL"], "metadata": {}, "active": true, "subCategory": "accessories", "sortPriority": 90}
  ]
}

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/046-amazing-fencing-seeds/permasteel.json -->

{
  "org_slug": "glass-outlet",
  "supplier_slug": "amazing-fencing",
  "system_instance_slug": "amazing-permasteel",
  "_format_note": "PermaSteel is Amazing Fencing's proprietary modular fencing brand. Sold as GP bundles in standard heights (1.5/1.8/2.1/2.4m). Distinct from generic ColorBond — PermaSteel has its own C-post profile and sheet thicknesses. Prices null pending trade pricing PDF.",
  "_source": "https://amazingfencing.com.au/products/permasteel-fencing/ + https://www.fencing-supplies.com.au/colorbond-steel-fencing-supplies/ (SKU list 2026-05-28)",
  "products": [
    {
      "system_type": "AF_PERMASTEEL",
      "product_type": "fence",
      "name": "Amazing Fencing — PermaSteel",
      "description": "PermaSteel modular fencing system — Amazing Fencing's proprietary brand. Sold as GP bundles in 1.5/1.8/2.1/2.4m heights with proprietary C posts (0.95mm), rails (0.8mm), and sheets (0.35mm).",
      "active": true,
      "sort_order": 210,
      "metadata": {
        "_provenance": {"supplier_slug": "amazing-fencing", "system_instance_slug": "amazing-permasteel"},
        "brand": "PermaSteel (proprietary)",
        "standard_heights_m": [1.5, 1.8, 2.1, 2.4],
        "post_bm_thickness_mm": 0.95,
        "rail_bm_thickness_mm": 0.8,
        "sheet_bm_thickness_mm": 0.35,
        "sold_as": "GP bundles"
      }
    }
  ],
  "product_components": [
    {"sku": "AF-PMS-CPOST-2.4", "name": "PERMA-STEEL C Post 2.4m × 0.95mm", "description": "PermaSteel proprietary C post, 2.4m × 0.95mm BMT", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"length_m": 2.4, "bm_thickness_mm": 0.95, "post_type": "C"}, "active": true, "subCategory": "posts", "sortPriority": 10},
    {"sku": "AF-PMS-CPOST-2.7", "name": "PERMA-STEEL C Post 2.7m × 0.95mm", "description": "PermaSteel proprietary C post, 2.7m × 0.95mm BMT", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"length_m": 2.7, "bm_thickness_mm": 0.95, "post_type": "C"}, "active": true, "subCategory": "posts", "sortPriority": 10},
    {"sku": "AF-PMS-CPOST-3.0", "name": "PERMA-STEEL C Post 3.0m × 0.95mm", "description": "PermaSteel proprietary C post, 3.0m × 0.95mm BMT", "category": "post", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"length_m": 3.0, "bm_thickness_mm": 0.95, "post_type": "C"}, "active": true, "subCategory": "posts", "sortPriority": 10},

    {"sku": "AF-PMS-RAIL-2.35", "name": "PERMA-STEEL Rail 2.35m × 0.8mm", "description": "PermaSteel proprietary rail, 2.35m × 0.8mm BMT", "category": "rail", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"length_m": 2.35, "bm_thickness_mm": 0.8}, "active": true, "subCategory": "rails", "sortPriority": 20},
    {"sku": "AF-PMS-RAIL-3.10", "name": "PERMA-STEEL Rail 3.10m × 0.8mm", "description": "PermaSteel proprietary rail, 3.10m × 0.8mm BMT", "category": "rail", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"length_m": 3.10, "bm_thickness_mm": 0.8}, "active": true, "subCategory": "rails", "sortPriority": 20},

    {"sku": "AF-PMS-SHEET-1190", "name": "PERMA-STEEL Sheet 1190mm × 0.35mm", "description": "PermaSteel new-style sheet, 1190mm wide × 0.35mm BMT", "category": "sheet", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_mm": 1190, "bm_thickness_mm": 0.35, "raked": true}, "active": true, "subCategory": "sheets", "sortPriority": 30},
    {"sku": "AF-PMS-SHEET-1490", "name": "PERMA-STEEL Sheet 1490mm × 0.35mm", "description": "PermaSteel new-style sheet, 1490mm wide × 0.35mm BMT", "category": "sheet", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_mm": 1490, "bm_thickness_mm": 0.35}, "active": true, "subCategory": "sheets", "sortPriority": 30},
    {"sku": "AF-PMS-SHEET-1790", "name": "PERMA-STEEL Sheet 1790mm × 0.35mm", "description": "PermaSteel new-style sheet, 1790mm wide × 0.35mm BMT", "category": "sheet", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_mm": 1790, "bm_thickness_mm": 0.35}, "active": true, "subCategory": "sheets", "sortPriority": 30},
    {"sku": "AF-PMS-SHEET-2090", "name": "PERMA-STEEL Sheet 2090mm × 0.35mm", "description": "PermaSteel new-style sheet, 2090mm wide × 0.35mm BMT", "category": "sheet", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_mm": 2090, "bm_thickness_mm": 0.35}, "active": true, "subCategory": "sheets", "sortPriority": 30},
    {"sku": "AF-PMS-SHEET-2390", "name": "PERMA-STEEL Sheet 2390mm × 0.35mm", "description": "PermaSteel new-style sheet, 2390mm wide × 0.35mm BMT", "category": "sheet", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_mm": 2390, "bm_thickness_mm": 0.35}, "active": true, "subCategory": "sheets", "sortPriority": 30},

    {"sku": "AF-PMS-BUNDLE-1.5", "name": "Permasteel GP Bundle 1.5m", "description": "Permasteel GP fencing bundle, 1.5m height (panels + posts + rails + sheets + screws)", "category": "panel", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"height_m": 1.5, "bundle_type": "GP", "_note": "Complete panel bundle; quantity per linear metre depends on supplier rules"}, "active": true, "subCategory": "panels", "sortPriority": 5},
    {"sku": "AF-PMS-BUNDLE-1.8", "name": "Permasteel GP Bundle 1.8m", "description": "Permasteel GP fencing bundle, 1.8m height", "category": "panel", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"height_m": 1.8, "bundle_type": "GP"}, "active": true, "subCategory": "panels", "sortPriority": 5},
    {"sku": "AF-PMS-BUNDLE-2.1", "name": "Permasteel GP Bundle 2.1m", "description": "Permasteel GP fencing bundle, 2.1m height", "category": "panel", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"height_m": 2.1, "bundle_type": "GP"}, "active": true, "subCategory": "panels", "sortPriority": 5},
    {"sku": "AF-PMS-BUNDLE-2.4", "name": "Permasteel GP Bundle 2.4m", "description": "Permasteel GP fencing bundle, 2.4m height", "category": "panel", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"height_m": 2.4, "bundle_type": "GP"}, "active": true, "subCategory": "panels", "sortPriority": 5},

    {"sku": "AF-PMS-GATE-SGL-0.9", "name": "Permasteel Single Gate 0.9m (GP Bundle)", "description": "Permasteel single swing gate, 0.9m wide, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_m": 0.9, "gate_movement": "swing", "bundle": "GP"}, "active": true, "subCategory": "gates", "sortPriority": 40},
    {"sku": "AF-PMS-GATE-SGL-1.5", "name": "Permasteel Single Gate 1.5m (GP Bundle)", "description": "Permasteel single swing gate, 1.5m wide, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_m": 1.5, "gate_movement": "swing", "bundle": "GP"}, "active": true, "subCategory": "gates", "sortPriority": 40},
    {"sku": "AF-PMS-GATE-SGL-1.8", "name": "Permasteel Single Gate 1.8m (GP Bundle)", "description": "Permasteel single swing gate, 1.8m wide, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_m": 1.8, "gate_movement": "swing", "bundle": "GP"}, "active": true, "subCategory": "gates", "sortPriority": 40},
    {"sku": "AF-PMS-GATE-SGL-2.1", "name": "Permasteel Single Gate 2.1m (GP Bundle)", "description": "Permasteel single swing gate, 2.1m wide, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_m": 2.1, "gate_movement": "swing", "bundle": "GP"}, "active": true, "subCategory": "gates", "sortPriority": 40},

    {"sku": "AF-PMS-GATE-DBL-1.2", "name": "Permasteel Double Gate 1.2m (GP Bundle)", "description": "Permasteel double swing gate, 1.2m total, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_m": 1.2, "gate_movement": "swing", "bundle": "GP", "leaves": 2}, "active": true, "subCategory": "gates", "sortPriority": 42},
    {"sku": "AF-PMS-GATE-DBL-1.5", "name": "Permasteel Double Gate 1.5m (GP Bundle)", "description": "Permasteel double swing gate, 1.5m total, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_m": 1.5, "gate_movement": "swing", "bundle": "GP", "leaves": 2}, "active": true, "subCategory": "gates", "sortPriority": 42},
    {"sku": "AF-PMS-GATE-DBL-1.8", "name": "Permasteel Double Gate 1.8m (GP Bundle)", "description": "Permasteel double swing gate, 1.8m total, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_m": 1.8, "gate_movement": "swing", "bundle": "GP", "leaves": 2}, "active": true, "subCategory": "gates", "sortPriority": 42},
    {"sku": "AF-PMS-GATE-DBL-2.1", "name": "Permasteel Double Gate 2.1m (GP Bundle)", "description": "Permasteel double swing gate, 2.1m total, GP bundle", "category": "gate", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_m": 2.1, "gate_movement": "swing", "bundle": "GP", "leaves": 2}, "active": true, "subCategory": "gates", "sortPriority": 42},

    {"sku": "AF-PMS-LATTICE-2.35", "name": "PERMA-STEEL Lattice 300mm × 2.35m DIA", "description": "PermaSteel diamond lattice, 300mm wide × 2.35m", "category": "lattice", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_mm": 300, "length_m": 2.35, "pattern": "diamond"}, "active": true, "subCategory": "lattice", "sortPriority": 60},
    {"sku": "AF-PMS-LATTICE-3.10", "name": "PERMA-STEEL Lattice 300mm × 3.10m DIA", "description": "PermaSteel diamond lattice, 300mm wide × 3.10m", "category": "lattice", "unit": "each", "default_price": null, "system_types": ["AF_PERMASTEEL"], "metadata": {"width_mm": 300, "length_m": 3.10, "pattern": "diamond"}, "active": true, "subCategory": "lattice", "sortPriority": 60}
  ]
}

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/046-amazing-fencing-seeds/timber-paling.json -->

{
  "org_slug": "glass-outlet",
  "supplier_slug": "amazing-fencing",
  "system_instance_slug": "amazing-timber-paling",
  "_format_note": "Treated pine paling + hardwood paling fence components from Amazing Fencing's Cin7 mass-download 2026-05-26. Includes 100x16 palings, paddle pop palings, Colonial pickets (75x16), pine posts, hardwood posts, pine + hardwood rails, plus accessories (nails, batten screws, concrete). Prices are TRADE (tier2 in our convention) — populated from BuyPriceEx in the Cin7 export.",
  "_source": "Amazing Fencing Cin7 export (MassDownloadProducts_20260526_0305PM.xlsx) supplied by Liam direct + amazingfencing.com.au/products/timber-fencing/",
  "products": [
    {
      "system_type": "AF_TIMBER_PALING",
      "product_type": "fence",
      "name": "Amazing Fencing — Treated Pine + Hardwood Paling",
      "description": "Treated pine and hardwood paling fencing using 100x16 palings (CCA pine) or 75x16 Colonial pickets, supported by H3/H4 treated pine OR H4 treated hardwood posts. AS 1604 compliant.",
      "active": true,
      "sort_order": 220,
      "metadata": {
        "_provenance": {"supplier_slug": "amazing-fencing", "system_instance_slug": "amazing-timber-paling"},
        "styles": ["paling", "paddle_pop_paling", "colonial_picket"],
        "compliance": "AS 1604",
        "treatments": ["H3 above-ground", "H4 in-ground"],
        "materials": ["treated_pine", "treated_hardwood"]
      }
    }
  ],
  "product_components": [
    {"sku": "AF-PAL-100x16-1200", "name": "CCA Pine Paling 100×16×1200mm", "description": "CCA treated pine paling 100×16×1200mm", "category": "paling", "unit": "each", "default_price": 0.33, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1200, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine", "treatment": "H3", "manufacturer_sku": "PL100x16x1200", "supplier_product_id": 124002}, "active": true, "subCategory": "palings", "sortPriority": 10},
    {"sku": "AF-PAL-100x16-1500", "name": "CCA Pine Paling 100×16×1500mm", "description": "CCA treated pine paling 100×16×1500mm", "category": "paling", "unit": "each", "default_price": 1.54, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1500, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine", "treatment": "H3", "manufacturer_sku": "PL100x16x1500", "supplier_product_id": 124003}, "active": true, "subCategory": "palings", "sortPriority": 10},
    {"sku": "AF-PAL-100x16-1800", "name": "CCA Pine Paling 100×16×1800mm", "description": "CCA treated pine paling 100×16×1800mm", "category": "paling", "unit": "each", "default_price": 1.78, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1800, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine", "treatment": "H3", "manufacturer_sku": "PL100x16x1800", "supplier_product_id": 124004}, "active": true, "subCategory": "palings", "sortPriority": 10},
    {"sku": "AF-PAL-100x16-2100", "name": "CCA Pine Paling 100×16×2100mm (out of stock)", "description": "CCA treated pine paling 100×16×2100mm — currently $0 in Cin7, treat as out of stock", "category": "paling", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 2100, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine", "treatment": "H3", "manufacturer_sku": "PL100x16x2100", "supplier_product_id": 124005, "_stock_status": "Cin7 BuyPriceEx = $0; treat as unavailable or confirm with supplier"}, "active": false, "subCategory": "palings", "sortPriority": 10},
    {"sku": "AF-PAL-100x16-2400", "name": "CCA Pine Paling 100×16×2400mm", "description": "CCA treated pine paling 100×16×2400mm", "category": "paling", "unit": "each", "default_price": 2.50, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 2400, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine", "treatment": "H3", "manufacturer_sku": "PL100x16x2400", "supplier_product_id": 124006}, "active": true, "subCategory": "palings", "sortPriority": 10},

    {"sku": "AF-PAL-PP-100x16-1200", "name": "CCA Pine Paddle Pop Paling 100×16×1200mm", "description": "CCA treated pine Paddle Pop paling (rounded top), 100×16×1200mm", "category": "paling", "unit": "each", "default_price": 1.30, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1200, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine", "treatment": "H3", "profile": "paddle_pop", "manufacturer_sku": "100x1200x16Paddle", "supplier_product_id": 126126, "_note": "Paddle Pop = decorative rounded-top paling. Price approximate — confirm against Cin7 export."}, "active": true, "subCategory": "palings", "sortPriority": 12},
    {"sku": "AF-PAL-PP-100x16-1500", "name": "CCA Pine Paddle Pop Paling 100×16×1500mm", "description": "CCA treated pine Paddle Pop paling, 100×16×1500mm", "category": "paling", "unit": "each", "default_price": 1.70, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1500, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine", "treatment": "H3", "profile": "paddle_pop", "manufacturer_sku": "100x1500x16Paddle", "supplier_product_id": 126127}, "active": true, "subCategory": "palings", "sortPriority": 12},

    {"sku": "AF-PIC-CW-75x16-1200", "name": "Colonial Picket 75×16×1200mm", "description": "Colonial-style picket fence material, 75×16×1200mm, treated pine", "category": "pickets", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1200, "width_mm": 75, "thickness_mm": 16, "material": "treated_pine", "profile": "colonial", "_pricing_note": "BuyPriceEx for Colonial Pickets needs Cin7 column lookup; defer until pricing run-2"}, "active": true, "subCategory": "pickets", "sortPriority": 14},
    {"sku": "AF-PIC-CW-75x16-1500", "name": "Colonial Picket 75×16×1500mm", "description": "Colonial-style picket fence material, 75×16×1500mm", "category": "pickets", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1500, "width_mm": 75, "thickness_mm": 16, "material": "treated_pine", "profile": "colonial"}, "active": true, "subCategory": "pickets", "sortPriority": 14},
    {"sku": "AF-PIC-CW-75x16-1800", "name": "Colonial Picket 75×16×1800mm", "description": "Colonial-style picket fence material, 75×16×1800mm", "category": "pickets", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1800, "width_mm": 75, "thickness_mm": 16, "material": "treated_pine", "profile": "colonial"}, "active": true, "subCategory": "pickets", "sortPriority": 14},

    {"sku": "AF-POST-PINE-100x75-1800", "name": "CCA Pine Post 100×75×1800mm", "description": "CCA treated pine post 100×75×1800mm", "category": "post", "unit": "each", "default_price": 10.71, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1800, "width_mm": 100, "depth_mm": 75, "material": "CCA Pine", "treatment": "H4"}, "active": true, "subCategory": "posts", "sortPriority": 20},
    {"sku": "AF-POST-PINE-100x75-2400", "name": "CCA Pine Post 100×75×2400mm", "description": "CCA treated pine post 100×75×2400mm", "category": "post", "unit": "each", "default_price": 14.28, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 2400, "width_mm": 100, "depth_mm": 75, "material": "CCA Pine", "treatment": "H4"}, "active": true, "subCategory": "posts", "sortPriority": 20},
    {"sku": "AF-POST-PINE-100x75-3000", "name": "CCA Pine Post 100×75×3000mm", "description": "CCA treated pine post 100×75×3000mm", "category": "post", "unit": "each", "default_price": 17.85, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 3000, "width_mm": 100, "depth_mm": 75, "material": "CCA Pine", "treatment": "H4"}, "active": true, "subCategory": "posts", "sortPriority": 20},
    {"sku": "AF-POST-PINE-100x100-2400", "name": "CCA Pine Post 100×100×2400mm", "description": "CCA treated pine post 100×100×2400mm", "category": "post", "unit": "each", "default_price": 25.68, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 2400, "width_mm": 100, "depth_mm": 100, "material": "CCA Pine", "treatment": "H4"}, "active": true, "subCategory": "posts", "sortPriority": 22},
    {"sku": "AF-POST-PINE-100x100-3000", "name": "CCA Pine Post 100×100×3000mm", "description": "CCA treated pine post 100×100×3000mm", "category": "post", "unit": "each", "default_price": 32.10, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 3000, "width_mm": 100, "depth_mm": 100, "material": "CCA Pine", "treatment": "H4"}, "active": true, "subCategory": "posts", "sortPriority": 22},

    {"sku": "AF-POST-HWD-100x75-1800", "name": "H4 Hardwood Post 100×75×1800mm", "description": "H4 treated hardwood post 100×75×1800mm", "category": "post", "unit": "each", "default_price": 16.81, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1800, "width_mm": 100, "depth_mm": 75, "material": "hardwood", "treatment": "H4", "manufacturer_sku": "hw100x75x1800", "supplier_product_id": 124079}, "active": true, "subCategory": "posts", "sortPriority": 24},
    {"sku": "AF-POST-HWD-100x75-2100", "name": "H4 Hardwood Post 100×75×2100mm", "description": "H4 treated hardwood post 100×75×2100mm", "category": "post", "unit": "each", "default_price": 20.79, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 2100, "width_mm": 100, "depth_mm": 75, "material": "hardwood", "treatment": "H4", "manufacturer_sku": "Futhw100x75x2100", "supplier_product_id": 124082}, "active": true, "subCategory": "posts", "sortPriority": 24},
    {"sku": "AF-POST-HWD-100x75-2400", "name": "H4 Hardwood Post 100×75×2400mm", "description": "H4 treated hardwood post 100×75×2400mm", "category": "post", "unit": "each", "default_price": 22.43, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 2400, "width_mm": 100, "depth_mm": 75, "material": "hardwood", "treatment": "H4", "manufacturer_sku": "hw100x75x2400", "supplier_product_id": 124080}, "active": true, "subCategory": "posts", "sortPriority": 24},
    {"sku": "AF-POST-HWD-100x75-2700", "name": "H4 Hardwood Post 100×75×2700mm", "description": "H4 treated hardwood post 100×75×2700mm", "category": "post", "unit": "each", "default_price": 25.43, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 2700, "width_mm": 100, "depth_mm": 75, "material": "hardwood", "treatment": "H4", "manufacturer_sku": "hw100x75x2700", "supplier_product_id": 124081}, "active": true, "subCategory": "posts", "sortPriority": 24},
    {"sku": "AF-POST-HWD-100x75-3000", "name": "H4 Hardwood Post 100×75×3000mm", "description": "H4 treated hardwood post 100×75×3000mm", "category": "post", "unit": "each", "default_price": 28.41, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 3000, "width_mm": 100, "depth_mm": 75, "material": "hardwood", "treatment": "H4", "manufacturer_sku": "hw100x75x3000", "supplier_product_id": 124083}, "active": true, "subCategory": "posts", "sortPriority": 24},
    {"sku": "AF-POST-HWD-100x100-1800", "name": "H4 Hardwood Post 100×100×1800mm", "description": "H4 treated hardwood post 100×100×1800mm", "category": "post", "unit": "each", "default_price": 22.41, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 1800, "width_mm": 100, "depth_mm": 100, "material": "hardwood", "treatment": "H4"}, "active": true, "subCategory": "posts", "sortPriority": 26},
    {"sku": "AF-POST-HWD-100x100-2400", "name": "H4 Hardwood Post 100×100×2400mm", "description": "H4 treated hardwood post 100×100×2400mm", "category": "post", "unit": "each", "default_price": 29.88, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 2400, "width_mm": 100, "depth_mm": 100, "material": "hardwood", "treatment": "H4"}, "active": true, "subCategory": "posts", "sortPriority": 26},
    {"sku": "AF-POST-HWD-100x100-2700", "name": "H4 Hardwood Post 100×100×2700mm", "description": "H4 treated hardwood post 100×100×2700mm", "category": "post", "unit": "each", "default_price": 33.62, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 2700, "width_mm": 100, "depth_mm": 100, "material": "hardwood", "treatment": "H4"}, "active": true, "subCategory": "posts", "sortPriority": 26},

    {"sku": "AF-RAIL-PINE-75x38-4800", "name": "Pine Rail 75×38×4800mm", "description": "Treated pine rail 75×38×4800mm", "category": "rail", "unit": "each", "default_price": 8.64, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 4800, "width_mm": 75, "thickness_mm": 38, "material": "treated_pine", "treatment": "H3"}, "active": true, "subCategory": "rails", "sortPriority": 30},
    {"sku": "AF-RAIL-PINE-100x38-4800", "name": "Pine Rail 100×38×4800mm", "description": "Treated pine rail 100×38×4800mm", "category": "rail", "unit": "each", "default_price": 11.52, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 4800, "width_mm": 100, "thickness_mm": 38, "material": "treated_pine", "treatment": "H3"}, "active": true, "subCategory": "rails", "sortPriority": 30},
    {"sku": "AF-RAIL-PINE-ARR-100x38-4800", "name": "Pine Arrissed Rail 100×38×4800mm", "description": "Treated pine arrissed (eased-edge) rail 100×38×4800mm", "category": "rail", "unit": "each", "default_price": 12.96, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 4800, "width_mm": 100, "thickness_mm": 38, "material": "treated_pine", "treatment": "H3", "profile": "arrissed"}, "active": true, "subCategory": "rails", "sortPriority": 32},
    {"sku": "AF-RAIL-HWD-75x38-4800", "name": "Hardwood Rail 75×38×4800mm", "description": "Treated hardwood rail 75×38×4800mm", "category": "rail", "unit": "each", "default_price": 17.84, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 4800, "width_mm": 75, "thickness_mm": 38, "material": "hardwood", "treatment": "H3"}, "active": true, "subCategory": "rails", "sortPriority": 34},
    {"sku": "AF-RAIL-HWD-100x38-4800", "name": "Hardwood Rail 100×38×4800mm", "description": "Treated hardwood rail 100×38×4800mm", "category": "rail", "unit": "each", "default_price": 26.76, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 4800, "width_mm": 100, "thickness_mm": 38, "material": "hardwood", "treatment": "H3"}, "active": true, "subCategory": "rails", "sortPriority": 34},

    {"sku": "AF-NAIL-COIL-45-9000", "name": "Coil Nails 45mm Ring M Gal (9000 box)", "description": "Coil nails 15Deg 2.5×45mm Ring Galv, bulk box 9000", "category": "fixing", "unit": "pack", "default_price": 58.00, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 45, "diameter_mm": 2.5, "pack_size": 9000, "finish": "galvanised", "manufacturer_sku": "CN2545RMG"}, "active": true, "subCategory": "fixings", "sortPriority": 50},
    {"sku": "AF-NAIL-COIL-57-9000", "name": "Coil Nails 57mm Ring M Gal (9000 box)", "description": "Coil nails 15Deg 2.5×57mm Ring Galv, bulk box 9000", "category": "fixing", "unit": "pack", "default_price": 89.00, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 57, "diameter_mm": 2.5, "pack_size": 9000, "finish": "galvanised", "manufacturer_sku": "CN2557RMG"}, "active": true, "subCategory": "fixings", "sortPriority": 50},
    {"sku": "AF-NAIL-COIL-45-250", "name": "Coil Nails 45mm Ring M Gal (250 single coil)", "description": "Single coil 250 nails, 2.5×45mm Ring Galv", "category": "fixing", "unit": "pack", "default_price": 2.47, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 45, "diameter_mm": 2.5, "pack_size": 250, "finish": "galvanised", "manufacturer_sku": "CN2545RMGSINCOIL"}, "active": true, "subCategory": "fixings", "sortPriority": 50},
    {"sku": "AF-NAIL-COIL-57-250", "name": "Coil Nails 57mm Ring M Gal (250 single coil)", "description": "Single coil 250 nails, 2.5×57mm Ring Galv", "category": "fixing", "unit": "pack", "default_price": 3.80, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 57, "diameter_mm": 2.5, "pack_size": 250, "finish": "galvanised", "manufacturer_sku": "CN2557RMGSINCOIL"}, "active": true, "subCategory": "fixings", "sortPriority": 50},
    {"sku": "AF-NAIL-HD-32-6000", "name": "Hardened Coil Nail 32mm (6000 box)", "description": "Hardened coil nails 15Deg 2.5×32mm bulk 6000", "category": "fixing", "unit": "pack", "default_price": 50.00, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 32, "diameter_mm": 2.5, "pack_size": 6000, "finish": "hardened", "manufacturer_sku": "CNHD32"}, "active": true, "subCategory": "fixings", "sortPriority": 52},
    {"sku": "AF-NAIL-HD-32-200", "name": "Hardened Coil Nail 32mm (200 single coil)", "description": "Hardened coil nails 2.5×32mm single coil 200", "category": "fixing", "unit": "pack", "default_price": 1.66, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 32, "diameter_mm": 2.5, "pack_size": 200, "finish": "hardened", "manufacturer_sku": "CNHD32Single"}, "active": true, "subCategory": "fixings", "sortPriority": 52},
    {"sku": "AF-NAIL-SS-45-1800", "name": "Coil Nails 45mm Stainless Steel (1800 box)", "description": "Coil nails 45mm stainless steel bulk 1800", "category": "fixing", "unit": "pack", "default_price": 148.00, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 45, "pack_size": 1800, "finish": "stainless_steel", "manufacturer_sku": "YF452563F"}, "active": true, "subCategory": "fixings", "sortPriority": 54},

    {"sku": "AF-SCR-BB-14g-75-500", "name": "Batten Screws 14g × 75mm Galv (500 pack)", "description": "Batten screws 14g × 75mm, galvanised, 500 pack", "category": "screw", "unit": "pack", "default_price": 36.37, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 75, "gauge": "14g", "pack_size": 500, "finish": "galvanised", "manufacturer_sku": "BBEG14755"}, "active": true, "subCategory": "screws", "sortPriority": 60},
    {"sku": "AF-SCR-BB-14g-100-500", "name": "Batten Screws 14g × 100mm Galv (500 pack)", "description": "Batten screws 14g × 100mm, galvanised, 500 pack", "category": "screw", "unit": "pack", "default_price": 12.13, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 100, "gauge": "14g", "pack_size": 500, "finish": "galvanised", "manufacturer_sku": "BBEG141005"}, "active": true, "subCategory": "screws", "sortPriority": 60},
    {"sku": "AF-SCR-BB-14g-125-500", "name": "Batten Screws 14g × 125mm Galv (500 pack)", "description": "Batten screws 14g × 125mm, galvanised, 500 pack", "category": "screw", "unit": "pack", "default_price": 9.94, "system_types": ["AF_TIMBER_PALING"], "metadata": {"length_mm": 125, "gauge": "14g", "pack_size": 500, "finish": "galvanised", "manufacturer_sku": "BBEG141255"}, "active": true, "subCategory": "screws", "sortPriority": 60},

    {"sku": "AF-CON-RAPID-30", "name": "Rapid Set 30kg", "description": "Rapid set concrete 30kg bag", "category": "concrete", "unit": "bag", "default_price": 11.04, "system_types": ["AF_TIMBER_PALING"], "metadata": {"weight_kg": 30, "type": "rapid_set", "manufacturer_sku": "DMR3056LD"}, "active": true, "subCategory": "concrete", "sortPriority": 70},
    {"sku": "AF-CON-POSTMIX-30", "name": "Post Mix 30kg", "description": "Post mix concrete 30kg bag", "category": "concrete", "unit": "bag", "default_price": 9.80, "system_types": ["AF_TIMBER_PALING"], "metadata": {"weight_kg": 30, "type": "post_mix", "manufacturer_sku": "DMPM3056LD"}, "active": true, "subCategory": "concrete", "sortPriority": 70},
    {"sku": "AF-CON-GP-20", "name": "GP Cement 20kg", "description": "General-purpose cement 20kg bag", "category": "concrete", "unit": "bag", "default_price": 6.68, "system_types": ["AF_TIMBER_PALING"], "metadata": {"weight_kg": 20, "type": "general_purpose", "manufacturer_sku": "CG2CD"}, "active": true, "subCategory": "concrete", "sortPriority": 70}
  ]
}

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/046-amazing-fencing-seeds/timber-slat-screen.json -->

{
  "org_slug": "glass-outlet",
  "supplier_slug": "amazing-fencing",
  "system_instance_slug": "amazing-timber-slat-screen",
  "_format_note": "Timber slat screen fencing on galvanised steel posts. Slats in treated pine (H3 DAR) or hardwood (Merbau). Prices null pending trade pricing PDF.",
  "_source": "https://amazingfencing.com.au/products/slat-screen-fence/ (2026-05-28)",
  "products": [
    {
      "system_type": "AF_TIMBER_SLAT",
      "product_type": "fence",
      "name": "Amazing Fencing — Timber Slat Screen",
      "description": "Modern timber slat screen fencing on galvanised steel posts. Slats in treated pine (H3 DAR) or hardwood (Merbau). For boundary fencing, area screening, aesthetic screening, garden privacy screens.",
      "active": true,
      "sort_order": 230,
      "metadata": {
        "_provenance": {"supplier_slug": "amazing-fencing", "system_instance_slug": "amazing-timber-slat-screen"},
        "post_material": "galvanised steel (shared with amazing-colorbond posts)",
        "slat_options": ["treated_pine", "hardwood"],
        "use_cases": ["boundary_fencing", "area_screening", "aesthetic_screening", "garden_privacy_screen"]
      }
    }
  ],
  "product_components": [
    {"sku": "AF-TSL-SLAT-70x22-DAR-LM", "name": "Slat 70×22 H3 T/P DAR — per metre", "description": "Treated pine DAR screening, 70×22mm, sold per linear metre", "category": "screening", "unit": "linear-metre", "default_price": null, "system_types": ["AF_TIMBER_SLAT"], "metadata": {"width_mm": 70, "thickness_mm": 22, "treatment": "H3", "finish": "DAR", "material": "treated_pine"}, "active": true, "subCategory": "screening", "sortPriority": 10},
    {"sku": "AF-TSL-SLAT-90x22-DAR-LM", "name": "Slat 90×22 H3 T/P DAR — per metre", "description": "Treated pine DAR screening, 90×22mm, sold per linear metre", "category": "screening", "unit": "linear-metre", "default_price": null, "system_types": ["AF_TIMBER_SLAT"], "metadata": {"width_mm": 90, "thickness_mm": 22, "treatment": "H3", "finish": "DAR", "material": "treated_pine"}, "active": true, "subCategory": "screening", "sortPriority": 10},

    {"sku": "AF-TSL-SLAT-90x19-MERBAU-LM", "name": "Slat 90×19 Merbau hardwood — per metre", "description": "Merbau hardwood screening slat, 90×19mm, sold per linear metre", "category": "screening", "unit": "linear-metre", "default_price": null, "system_types": ["AF_TIMBER_SLAT"], "metadata": {"width_mm": 90, "thickness_mm": 19, "material": "hardwood_merbau"}, "active": true, "subCategory": "screening", "sortPriority": 12},

    {"sku": "AF-TSL-LATTSURR-70x35-4.8", "name": "Lattice Surround 70×35 H3 × 4.8m", "description": "H3 treated pine lattice surround / slat frame, 70×35mm × 4.8m", "category": "rail", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_SLAT", "AF_TIMBER_PALING"], "metadata": {"width_mm": 70, "thickness_mm": 35, "length_m": 4.8, "treatment": "H3"}, "active": true, "subCategory": "rails", "sortPriority": 20},
    {"sku": "AF-TSL-LATTSURR-70x35-5.4", "name": "Lattice Surround 70×35 H3 × 5.4m", "description": "H3 treated pine lattice surround / slat frame, 70×35mm × 5.4m", "category": "rail", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_SLAT", "AF_TIMBER_PALING"], "metadata": {"width_mm": 70, "thickness_mm": 35, "length_m": 5.4, "treatment": "H3"}, "active": true, "subCategory": "rails", "sortPriority": 20},

    {"sku": "AF-TSL-EDGE-100x25-4.8", "name": "Garden Edge 100×25 × 4.8m H4 T/P", "description": "Treated pine garden edge, 100×25mm × 4.8m, H4", "category": "accessory", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_SLAT"], "metadata": {"width_mm": 100, "thickness_mm": 25, "length_m": 4.8, "treatment": "H4"}, "active": true, "subCategory": "accessories", "sortPriority": 50},
    {"sku": "AF-TSL-EDGE-100x25-5.4", "name": "Garden Edge 100×25 × 5.4m H4 T/P", "description": "Treated pine garden edge, 100×25mm × 5.4m, H4", "category": "accessory", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_SLAT"], "metadata": {"width_mm": 100, "thickness_mm": 25, "length_m": 5.4, "treatment": "H4"}, "active": true, "subCategory": "accessories", "sortPriority": 50},
    {"sku": "AF-TSL-EDGE-150x25-4.8", "name": "Garden Edge 150×25 × 4.8m H4 T/P", "description": "Treated pine garden edge, 150×25mm × 4.8m, H4", "category": "accessory", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_SLAT"], "metadata": {"width_mm": 150, "thickness_mm": 25, "length_m": 4.8, "treatment": "H4"}, "active": true, "subCategory": "accessories", "sortPriority": 50},
    {"sku": "AF-TSL-EDGE-150x25-5.4", "name": "Garden Edge 150×25 × 5.4m H4 T/P", "description": "Treated pine garden edge, 150×25mm × 5.4m, H4", "category": "accessory", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_SLAT"], "metadata": {"width_mm": 150, "thickness_mm": 25, "length_m": 5.4, "treatment": "H4"}, "active": true, "subCategory": "accessories", "sortPriority": 50},
    {"sku": "AF-TSL-EDGE-200x25-4.8", "name": "Garden Edge 200×25 × 4.8m H4 T/P", "description": "Treated pine garden edge, 200×25mm × 4.8m, H4", "category": "accessory", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_SLAT"], "metadata": {"width_mm": 200, "thickness_mm": 25, "length_m": 4.8, "treatment": "H4"}, "active": true, "subCategory": "accessories", "sortPriority": 50},
    {"sku": "AF-TSL-EDGE-200x25-5.4", "name": "Garden Edge 200×25 × 5.4m H4 T/P", "description": "Treated pine garden edge, 200×25mm × 5.4m, H4", "category": "accessory", "unit": "each", "default_price": null, "system_types": ["AF_TIMBER_SLAT"], "metadata": {"width_mm": 200, "thickness_mm": 25, "length_m": 5.4, "treatment": "H4"}, "active": true, "subCategory": "accessories", "sortPriority": 50}
  ]
}

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/046-amazing-fencing-seeds/chainwire-security.json -->

{
  "org_slug": "glass-outlet",
  "supplier_slug": "amazing-fencing",
  "system_instance_slug": "amazing-chainwire-security",
  "_format_note": "Chain wire / security fencing as supplied by Amazing Fencing. Galvanised + PVC-coated (green/black) options. SKU detail not enumerated on the install-side site; this seed is skeletal pending the supply-side chainwire catalogue.",
  "_source": "https://amazingfencing.com.au/products/chainwire-security/ (2026-05-28)",
  "products": [
    {
      "system_type": "AF_CHAINWIRE",
      "product_type": "fence",
      "name": "Amazing Fencing — Chain Wire & Security",
      "description": "Chain wire fencing for residential and commercial. Raw galvanised + PVC-coated options (green or black). Customisable for unusual terrain or layouts. Optional aluminium garden-fence variant.",
      "active": true,
      "sort_order": 240,
      "metadata": {
        "_provenance": {"supplier_slug": "amazing-fencing", "system_instance_slug": "amazing-chainwire-security"},
        "finishes": ["galvanised", "pvc_coated_green", "pvc_coated_black"],
        "use_cases": ["residential", "commercial", "security"],
        "customisable": true,
        "_status_note": "Skeletal seed — SKU detail pending. The supply-side site doesn't enumerate chainwire SKUs publicly; full mesh / hardware / post / tensioner list to be added once the supplier provides catalogue data."
      }
    }
  ],
  "product_components": [
    {"sku": "AF-CHW-MESH-GALV-15M", "name": "Chain Wire Mesh — Galvanised — 15m roll (PLACEHOLDER)", "description": "Galvanised chain wire mesh roll, dimensions TBC. Placeholder pending supplier catalogue.", "category": "panel", "unit": "roll", "default_price": null, "system_types": ["AF_CHAINWIRE"], "metadata": {"finish": "galvanised", "_placeholder": true}, "active": true, "subCategory": "mesh", "sortPriority": 10},
    {"sku": "AF-CHW-MESH-PVC-GREEN-15M", "name": "Chain Wire Mesh — PVC Green — 15m roll (PLACEHOLDER)", "description": "PVC-coated green chain wire mesh roll. Placeholder pending supplier catalogue.", "category": "panel", "unit": "roll", "default_price": null, "system_types": ["AF_CHAINWIRE"], "metadata": {"finish": "pvc_coated_green", "_placeholder": true}, "active": true, "subCategory": "mesh", "sortPriority": 10},
    {"sku": "AF-CHW-MESH-PVC-BLACK-15M", "name": "Chain Wire Mesh — PVC Black — 15m roll (PLACEHOLDER)", "description": "PVC-coated black chain wire mesh roll. Placeholder pending supplier catalogue.", "category": "panel", "unit": "roll", "default_price": null, "system_types": ["AF_CHAINWIRE"], "metadata": {"finish": "pvc_coated_black", "_placeholder": true}, "active": true, "subCategory": "mesh", "sortPriority": 10}
  ]
}

<!-- SKYBROOK-PACK-FILE-START: _briefs/assets/046-amazing-fencing-seeds/retaining-wall.json -->

{
  "org_slug": "glass-outlet",
  "supplier_slug": "amazing-fencing",
  "system_instance_slug": "amazing-retaining-wall",
  "_format_note": "Timber retaining wall sleepers from Amazing Fencing's Cin7 export 2026-05-26. Retaining walls are not fences but use the same supply pipeline (sleepers + posts). Modelled as a timber-fence archetype instance with metadata flagging 'retaining' use_case until a dedicated retaining-wall archetype is added in a future architectural iteration. Prices are TRADE (tier2 in our convention) from Cin7 BuyPriceEx.",
  "_source": "Amazing Fencing Cin7 export (MassDownloadProducts_20260526_0305PM.xlsx) + amazingfencing.com.au/products/retaining-walls/",
  "products": [
    {
      "system_type": "AF_RETAINING_WALL",
      "product_type": "other",
      "name": "Amazing Fencing — Timber Retaining Wall",
      "description": "Timber retaining walls using treated pine OR hardwood sleepers with corresponding posts. Plantation-grown CCA pine + H4 hardwood. Compliant with QLD zoning and similar state regulations.",
      "active": true,
      "sort_order": 250,
      "metadata": {
        "_provenance": {"supplier_slug": "amazing-fencing", "system_instance_slug": "amazing-retaining-wall"},
        "_archetype_note": "Modelled as timber-fence archetype with use_case='retaining_wall'. The fence_runs_v1 geometry isn't a perfect fit (retaining walls are typically single-segment linear runs) but works for v1. Future architecture: dedicated 'retaining-wall' archetype.",
        "use_cases": ["correct_uneven_terrain", "garden_protection", "walkway_protection", "reclaim_sloped_land"],
        "materials": ["treated_pine_H4", "treated_hardwood_H4"],
        "compliance_notes": ["QLD zoning regulations (varies by state)", "AS 1604 for treated timber"]
      }
    }
  ],
  "product_components": [
    {"sku": "AF-RW-SLEEPER-PINE-200x50-2400", "name": "CCA Pine Sleeper 200×50×2400mm", "description": "CCA treated pine retaining-wall sleeper, 200×50mm × 2400mm", "category": "sleeper", "unit": "each", "default_price": null, "system_types": ["AF_RETAINING_WALL"], "metadata": {"length_mm": 2400, "width_mm": 200, "thickness_mm": 50, "material": "CCA Pine", "treatment": "H4", "_pricing_note": "BuyPriceEx in Cin7 for pine sleepers needs separate lookup; defer until pricing run-2"}, "active": true, "subCategory": "sleepers", "sortPriority": 10},
    {"sku": "AF-RW-SLEEPER-PINE-200x50-3000", "name": "CCA Pine Sleeper 200×50×3000mm", "description": "CCA treated pine retaining-wall sleeper, 200×50mm × 3000mm", "category": "sleeper", "unit": "each", "default_price": null, "system_types": ["AF_RETAINING_WALL"], "metadata": {"length_mm": 3000, "width_mm": 200, "thickness_mm": 50, "material": "CCA Pine", "treatment": "H4"}, "active": true, "subCategory": "sleepers", "sortPriority": 10},
    {"sku": "AF-RW-SLEEPER-PINE-200x75-2400", "name": "CCA Pine Sleeper 200×75×2400mm", "description": "CCA treated pine retaining-wall sleeper, 200×75mm × 2400mm", "category": "sleeper", "unit": "each", "default_price": null, "system_types": ["AF_RETAINING_WALL"], "metadata": {"length_mm": 2400, "width_mm": 200, "thickness_mm": 75, "material": "CCA Pine", "treatment": "H4"}, "active": true, "subCategory": "sleepers", "sortPriority": 10},
    {"sku": "AF-RW-SLEEPER-PINE-200x75-3000", "name": "CCA Pine Sleeper 200×75×3000mm", "description": "CCA treated pine retaining-wall sleeper, 200×75mm × 3000mm", "category": "sleeper", "unit": "each", "default_price": null, "system_types": ["AF_RETAINING_WALL"], "metadata": {"length_mm": 3000, "width_mm": 200, "thickness_mm": 75, "material": "CCA Pine", "treatment": "H4"}, "active": true, "subCategory": "sleepers", "sortPriority": 10},

    {"sku": "AF-RW-SLEEPER-HWD-200x50-2400", "name": "H4 Hardwood Sleeper 200×50×2400mm", "description": "H4 treated hardwood retaining-wall sleeper, 200×50mm × 2400mm", "category": "sleeper", "unit": "each", "default_price": 24.98, "system_types": ["AF_RETAINING_WALL"], "metadata": {"length_mm": 2400, "width_mm": 200, "thickness_mm": 50, "material": "hardwood", "treatment": "H4", "manufacturer_sku": "HS200x50x2400"}, "active": true, "subCategory": "sleepers", "sortPriority": 20},
    {"sku": "AF-RW-SLEEPER-HWD-200x50-3000", "name": "H4 Hardwood Sleeper 200×50×3000mm", "description": "H4 treated hardwood retaining-wall sleeper, 200×50mm × 3000mm", "category": "sleeper", "unit": "each", "default_price": 31.40, "system_types": ["AF_RETAINING_WALL"], "metadata": {"length_mm": 3000, "width_mm": 200, "thickness_mm": 50, "material": "hardwood", "treatment": "H4", "manufacturer_sku": "HS200x50x3000"}, "active": true, "subCategory": "sleepers", "sortPriority": 20},
    {"sku": "AF-RW-SLEEPER-HWD-200x75-1800", "name": "H4 Hardwood Sleeper 200×75×1800mm", "description": "H4 treated hardwood retaining-wall sleeper, 200×75mm × 1800mm", "category": "sleeper", "unit": "each", "default_price": 30.00, "system_types": ["AF_RETAINING_WALL"], "metadata": {"length_mm": 1800, "width_mm": 200, "thickness_mm": 75, "material": "hardwood", "treatment": "H4", "manufacturer_sku": "HS200x75x1800"}, "active": true, "subCategory": "sleepers", "sortPriority": 20},
    {"sku": "AF-RW-SLEEPER-HWD-200x75-2400", "name": "H4 Hardwood Sleeper 200×75×2400mm", "description": "H4 treated hardwood retaining-wall sleeper, 200×75mm × 2400mm", "category": "sleeper", "unit": "each", "default_price": 37.49, "system_types": ["AF_RETAINING_WALL"], "metadata": {"length_mm": 2400, "width_mm": 200, "thickness_mm": 75, "material": "hardwood", "treatment": "H4", "manufacturer_sku": "HS200x75x2400"}, "active": true, "subCategory": "sleepers", "sortPriority": 20},
    {"sku": "AF-RW-SLEEPER-HWD-200x75-3000", "name": "H4 Hardwood Sleeper 200×75×3000mm", "description": "H4 treated hardwood retaining-wall sleeper, 200×75mm × 3000mm", "category": "sleeper", "unit": "each", "default_price": 48.61, "system_types": ["AF_RETAINING_WALL"], "metadata": {"length_mm": 3000, "width_mm": 200, "thickness_mm": 75, "material": "hardwood", "treatment": "H4", "manufacturer_sku": "HS200x75x3000"}, "active": true, "subCategory": "sleepers", "sortPriority": 20}
  ]
}

<!-- SKYBROOK-PACK-FILE-START: skills/anyfence-supplier-pack-builder/SKILL.md -->

# Anyfence Supplier Onboarding Pack Builder

**Skill type:** Documentation + Python validators
**When to use:** Whenever producing the brief queue + seed JSON for a new fencing supplier on the Anyfence platform.
**Status:** Bundled as a standalone resource. Once skill-creation tooling is available, install via the Learning page.

---

## What this skill produces

Given a fencing supplier's name + website + (optionally) their pricing source material, this skill is the template/recipe + validators for producing a two-brief supplier-onboarding pack that adds them as a new supplier on the multi-supplier calculator platform:

1. **Brief NXX — `{supplier-slug}` Supplier + System Instances** (matches brief 042 / 045 in the canonical pack)
   - Creates the supplier row in `suppliers`
   - Creates N rows in `system_instances` mapping the supplier's product families to canonical archetypes
   - Writes a `catalogues/{supplier-slug}/README.md` with source pointers + TODOs

2. **Brief NXX+1 — `{supplier-slug}` Seed Data + Price Book** (matches brief 043 / 046)
   - N seed JSON files (one per system_instance) in `supabase/seeds/{supplier-slug}/products/`
   - A `price_books` row + `price_book_items` rows mirroring known pricing (or a draft price book with zero items if pricing pending)

Together these two briefs onboard a supplier without any TypeScript changes. Codex executes both autonomously per the MASTER-BRIEF orchestration loop.

## Canonical seed JSON shape

```json
{
  "org_slug": "glass-outlet",                         // The existing platform org (catalogue lives here pre-brief-044)
  "supplier_slug": "discount-fencing",                // New supplier
  "system_instance_slug": "dfsau-cca-pine-paling",    // Specific instance within the supplier
  "_format_note": "...",                              // Optional audit
  "_source": "URL where pricing came from",           // Optional citation
  "products": [
    {
      "system_type": "DF_CCA_PAL",                    // XX_CATEGORY pattern, UNIQUE per (org_id, system_type) — migration 022
      "product_type": "fence" | "gate" | "other",
      "name": "Discount Fencing — CCA Pine Paling Fence",
      "description": "...",
      "active": true,
      "sort_order": 100,
      "metadata": {
        "_provenance": {"supplier_slug": "...", "system_instance_slug": "..."},
        // ... archetype-specific keys (options, allowedAngles, compliance, etc.)
      }
    }
  ],
  "product_components": [
    {
      "sku": "DF-PAL-100x16-1200",
      "name": "CCA Pine Paling 100×16×1200mm",
      "description": "...",
      "category": "paling",                          // See "Canonical component categories" below
      "unit": "each",                                 // See "Canonical units" below
      "default_price": 1.74,                          // NUMERIC dollars (NOT cents) — matches existing pricing_rules schema
      "system_types": ["DF_CCA_PAL"],                 // Array; one component MAY appear in multiple system_types
      "metadata": {
        "height_mm": 1200, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine",
        "price_source": "URL", "price_verified_date": "2026-05-28"
      },
      "active": true,
      "subCategory": "palings",
      "sortPriority": 10
    }
  ]
}
```

## The 12 canonical archetypes

Use these slugs in `system_instances.archetype_id` lookups. Seeded by brief 033.

| Archetype | Family | Use for |
|---|---|---|
| `slat-fence` | fence | Horizontal/vertical aluminium or timber slat fencing |
| `panel-fence` | fence | ColorBond steel + vertical-bar aluminium security panels |
| `mesh-fence` | fence | Chainwire / weldmesh (NOT aluminium tubular — that's panel-fence) |
| `timber-fence` | fence | Treated pine paling, lap-and-cap, picket |
| `glass-pool-fence` | pool-fence | Frameless glass with spigots/clamps |
| `aluminium-pool-fence` | pool-fence | Flat-top, spear-top, loop-top aluminium pool fencing (AS1926.1) |
| `balustrade` | balustrade | Balcony / staircase balustrade |
| `swing-gate` | gate | Single/double swing gates (residential standard) |
| `sliding-gate` | gate | Sliding gates incl. automated |
| `equipment-enclosure` | enclosure | CTS-style equipment housing (not residential fencing) |
| `screen` | screen | Privacy / decorative screens |
| `shower` | shower | Frameless/semi-frameless shower screens |

**Common archetype-mapping mistakes:**
- "Aluminium security fence" is `panel-fence`, NOT `mesh-fence` (it's panel-based vertical bars, not chainwire)
- "Slat fence" with timber slats on steel posts is `slat-fence`, NOT `timber-fence` (the slat-counting math is the differentiator)
- "Chainwire" is `mesh-fence`. ANYTHING with rigid panel structure (sheet, tubular, slat) is NOT mesh.

If a supplier offers something that genuinely doesn't fit any of the 12 (e.g. "tubular pool-style fence at non-pool heights"), tag it with the closest existing archetype + metadata flagging the archetype-mismatch, then propose a new archetype brief later. **Don't invent new archetype slugs in seed JSON** — they must exist in `system_archetypes` first (via brief 033 or a follow-on).

## system_type namespacing rules

`products.system_type` is `UNIQUE (org_id, system_type)` per migration 022. Until brief 044's multi-org migration lands, ALL suppliers live under `org_slug='glass-outlet'`, so system_types must be globally unique within that org.

**Convention:** `{XX}_{CATEGORY}` where XX is a 2-3 letter supplier short code:

| Supplier | Prefix | Examples |
|---|---|---|
| Glass Outlet (legacy) | (none) | `QSHS`, `VS`, `XPL`, `BAYG`, `ColorBond`, `QS_GATE`, `XPSG_GATE` |
| Discount Fencing | `DF_` | `DF_CCA_PAL`, `DF_AL_POOL`, `DF_AL_SLAT_GATE`, `DF_GLASS`, `DF_COLORBOND` |
| Amazing Fencing | `AF_` | `AF_COLORBOND`, `AF_PERMASTEEL`, `AF_TIMBER_PALING`, `AF_TIMBER_SLAT`, `AF_CHAINWIRE` |

For the third+ suppliers, pick a 2-3 letter prefix that's mnemonic + unique. Avoid single-letter prefixes (collide too easily).

## Canonical component categories

`product_components.category` should be one of:

`paling, post, rail, panel, gate, sleeper, accessory, screw, fixing, bracket, hardware, cap, shroud, lattice, pickets, screening, sheet, rail-cap, infill, consumable, concrete, membrane`

If a supplier sells something outside this list (e.g. "letterbox", "gate motor"), add a metadata-only entry and flag it for a future canonical-categories update. Don't silently extend the set.

## Canonical units

`product_components.unit` should be one of:

`each, length, metre, linear-metre, bag, kg, pack, roll`

## Workflow — onboarding a new supplier from scratch

1. **Research** — visit the supplier's website. Capture:
   - Public product categories (the columns/menu items)
   - SKU detail (from any catalogue page or supply-side sister site)
   - Public pricing (often on a "click to download our pricing" PDF — get the PDF)
   - Brand partners (which manufacturers they resell)
   - Service region (state, metros)
2. **Archetype mapping** — for each product category, identify the canonical archetype (see table above).
3. **Choose `XX_` prefix** for system_type namespacing.
4. **Write brief NXX (supplier + instances)** — copy brief 042 or 045 as the template; adjust supplier metadata, instance list, archetype references.
5. **Write seed JSON files** — one per system_instance. Use the canonical shape above. Validate with `validate_seed.py`.
6. **Write brief NXX+1 (seed data + price book)** — copy brief 043 or 046 as the template; adjust SKU lists in the SQL price book migration.
7. **Update INVENTORY** in brief 028 with the two new briefs.
8. **Rebuild the bundle** — regenerate `SKYBROOK-NATIONAL-ROLLOUT-PACK.md` with the new files.

## Common pitfalls (from earlier supplier onboarding)

- **Used `set_updated_at` instead of `touch_updated_at`** — the canonical updated_at trigger function is `touch_updated_at()` (migration 008). Always verify against the actual repo.
- **Assumed `pricing_rules.sku` exists** — it doesn't. SKU joins via `pricing_rules.component_id → product_components.id → product_components.sku`. Use the `pricing_rules_with_sku` VIEW for legacy lookups.
- **Stored prices as cents in seed JSON** — DON'T. The canonical schema has `default_price NUMERIC(10,2)` (dollars). Cents are reserved for the new `price_book_items.price_cents` (brief 034+).
- **Tagged a security-aluminium instance as `mesh-fence`** — wrong. Aluminium security panels are `panel-fence` (structural pattern: vertical bars between posts).
- **Used `variable_key`/`variable_value` on `product_variables`** — wrong. Actual column shape (migration 012) is `name`, `default_value_json`, `options_json`.
- **Forgot the system_type UNIQUE constraint** — `(org_id, system_type)` is unique. Two suppliers can't both have `system_type='COLORBOND'` under the same org. Use the `XX_` prefix.

## Scripts in this skill

- `validate_seed.py` — Validates one or more seed JSON files against the canonical shape. Use BEFORE committing seed JSON to the repo.
  - Usage: `python3 validate_seed.py path/to/seed1.json path/to/seed2.json ...`
  - Output: errors (block) + warnings (informational, e.g. cross-instance system_types)
- `render_briefs.py` — Renders boilerplate supplier brief markdown from a YAML spec. Skeleton/scaffold to reduce copy-paste between suppliers; the seed JSON files are typically hand-authored since SKU detail varies per supplier.
  - Usage: `python3 render_briefs.py spec.yaml --output-dir _briefs/00-inbox/`

## Validators

`validate_seed.py` checks:
- Top-level required fields (`org_slug`, `supplier_slug`, `system_instance_slug`, `products`, `product_components`)
- Product required fields (`system_type`, `product_type`, `name`)
- `product_type` is in canonical set
- `system_type` follows `XX_CATEGORY` pattern
- Component required fields (`sku`, `name`, `category`, `unit`, `system_types`)
- Component `category` and `unit` are in canonical sets (warns if not)
- `default_price` is numeric dollars (warns if >10000 — might be cents)
- `system_types` is an array
- Each component's `system_types` reference a system_type declared in the file (warns if cross-instance)
- No duplicate SKUs within a file

## Reference examples in this pack

- `_briefs/00-inbox/042-discount-fencing-supplier-and-instances.md` — canonical supplier+instances brief
- `_briefs/00-inbox/043-discount-fencing-seed-data-and-price-book.md` — canonical seed+price brief (with public pricing populated)
- `_briefs/00-inbox/045-amazing-fencing-supplier-and-instances.md` — canonical multi-state contractor+supplier hybrid supplier brief
- `_briefs/00-inbox/046-amazing-fencing-seed-data-and-price-book.md` — canonical seed brief with DRAFT price book (pricing pending)
- `_briefs/assets/043-discount-fencing-seeds/*.json` — seeds with prices populated
- `_briefs/assets/046-amazing-fencing-seeds/*.json` — seeds with prices null

## Future scope

Things this skill doesn't yet handle (room for expansion):
- Per-region price books (e.g. Amazing Fencing NSW vs QLD inventory)
- Tier 2 (trade) / Tier 3 (volume) price book layering
- Workbook regression input generation (brief 038's input fixtures)
- Custom archetype proposal (new archetype slug + geometry adapter + rule templates)
- PDF parsing — currently relies on Liam supplying pricing PDFs manually

<!-- SKYBROOK-PACK-FILE-START: skills/anyfence-supplier-pack-builder/validate_seed.py -->

#!/usr/bin/env python3
"""
Validates an Anyfence supplier seed JSON file against the canonical shape.

Canonical seed JSON shape (matches Glass Outlet's qshs.json / vs.json patterns
in the quickscreen-colorbond-generator repo):

{
  "org_slug": "<existing-org-slug>",          # e.g. "glass-outlet"
  "supplier_slug": "<new-supplier-slug>",     # e.g. "discount-fencing", "amazing-fencing"
  "system_instance_slug": "<instance-slug>",  # e.g. "dfsau-cca-pine-paling"
  "_format_note": "...",                       # optional, audit string
  "_source": "...",                            # optional, URL/citation for pricing
  "products": [
    {
      "system_type": "DF_CCA_PAL",            # XX_CATEGORY pattern, UNIQUE per org_id
      "product_type": "fence" | "gate" | "other",
      "name": "...",
      "description": "...",
      "active": true,
      "sort_order": 100,
      "metadata": {...}
    }
  ],
  "product_components": [
    {
      "sku": "DF-PAL-100x16-1200",
      "name": "...",
      "description": "...",
      "category": "paling" | "post" | "rail" | "panel" | "gate" | "sleeper" | "accessory" | ...,
      "unit": "each" | "length" | "metre" | "bag" | "kg" | ...,
      "default_price": 1.74,                  # NUMERIC dollars, NOT cents
      "system_types": ["DF_CCA_PAL"],         # array; one component may belong to multiple
      "metadata": {...},
      "active": true,
      "subCategory": "palings",
      "sortPriority": 10
    }
  ]
}

Usage:
    python3 validate_seed.py path/to/seed.json [path/to/another.json ...]
"""
import json
import sys
from pathlib import Path

CANONICAL_ARCHETYPES = {
    "slat-fence", "panel-fence", "mesh-fence", "timber-fence",
    "glass-pool-fence", "aluminium-pool-fence", "balustrade",
    "swing-gate", "sliding-gate", "equipment-enclosure", "screen", "shower",
}

CANONICAL_PRODUCT_TYPES = {"fence", "gate", "other"}

CANONICAL_COMPONENT_CATEGORIES = {
    # Common fence components
    "paling", "post", "rail", "panel", "gate", "sleeper", "accessory",
    "screw", "fixing", "bracket", "hardware", "cap", "shroud", "lattice",
    "pickets", "screening", "sheet", "rail-cap", "infill",
    # Special-purpose
    "consumable", "concrete", "membrane",
}

CANONICAL_UNITS = {"each", "length", "metre", "linear-metre", "bag", "kg", "pack", "roll"}

errors = []
warnings = []

def check(seed_path):
    """Validate a single seed JSON file. Returns (errors, warnings)."""
    p = Path(seed_path)
    if not p.exists():
        return [f"{p}: file not found"], []

    try:
        data = json.loads(p.read_text())
    except json.JSONDecodeError as e:
        return [f"{p}: JSON parse error: {e}"], []

    file_errors = []
    file_warnings = []

    # Top-level required fields
    for required in ("org_slug", "supplier_slug", "system_instance_slug"):
        if required not in data:
            file_errors.append(f"{p}: missing required top-level field '{required}'")

    if "products" not in data or not isinstance(data["products"], list):
        file_errors.append(f"{p}: 'products' must be a list")
    if "product_components" not in data or not isinstance(data["product_components"], list):
        file_errors.append(f"{p}: 'product_components' must be a list")

    # If we can't proceed, return early
    if file_errors:
        return file_errors, file_warnings

    # Products validation
    system_types = set()
    for i, prod in enumerate(data["products"]):
        prefix = f"{p}: products[{i}]"

        for required in ("system_type", "product_type", "name"):
            if required not in prod:
                file_errors.append(f"{prefix}: missing required field '{required}'")

        if "system_type" in prod:
            system_types.add(prod["system_type"])
            # System type should follow XX_CATEGORY pattern (uppercase + underscore)
            if not prod["system_type"].replace("_", "").isalnum():
                file_warnings.append(f"{prefix}: system_type '{prod['system_type']}' should be uppercase + underscore (e.g. DF_CCA_PAL)")
            if "_" not in prod["system_type"]:
                file_warnings.append(f"{prefix}: system_type '{prod['system_type']}' has no supplier prefix; recommend XX_CATEGORY pattern")

        if "product_type" in prod and prod["product_type"] not in CANONICAL_PRODUCT_TYPES:
            file_errors.append(f"{prefix}: product_type '{prod['product_type']}' must be one of {CANONICAL_PRODUCT_TYPES}")

        if "active" not in prod:
            file_warnings.append(f"{prefix}: missing 'active' field (defaults to true if absent)")

    # Product components validation
    skus_seen = set()
    for i, comp in enumerate(data["product_components"]):
        prefix = f"{p}: product_components[{i}]"

        for required in ("sku", "name", "category", "unit", "system_types"):
            if required not in comp:
                file_errors.append(f"{prefix}: missing required field '{required}'")

        if "sku" in comp:
            if comp["sku"] in skus_seen:
                file_errors.append(f"{prefix}: duplicate SKU '{comp['sku']}'")
            skus_seen.add(comp["sku"])

        if "category" in comp and comp["category"] not in CANONICAL_COMPONENT_CATEGORIES:
            file_warnings.append(f"{prefix}: category '{comp['category']}' not in canonical set {sorted(CANONICAL_COMPONENT_CATEGORIES)}; check if intentional")

        if "unit" in comp and comp["unit"] not in CANONICAL_UNITS:
            file_warnings.append(f"{prefix}: unit '{comp['unit']}' not in canonical set {sorted(CANONICAL_UNITS)}")

        if "default_price" in comp and comp["default_price"] is not None:
            if not isinstance(comp["default_price"], (int, float)):
                file_errors.append(f"{prefix}: default_price must be numeric dollars (e.g. 1.74), got {type(comp['default_price']).__name__}")
            elif comp["default_price"] > 10000:
                file_warnings.append(f"{prefix}: default_price ${comp['default_price']} seems very high; confirm this isn't cents")
            elif comp["default_price"] < 0:
                file_errors.append(f"{prefix}: default_price cannot be negative")

        if "system_types" in comp:
            if not isinstance(comp["system_types"], list):
                file_errors.append(f"{prefix}: system_types must be an array (one component may belong to multiple system_types)")
            else:
                for st in comp["system_types"]:
                    if st not in system_types:
                        file_warnings.append(f"{prefix}: system_type '{st}' not declared in the top-level 'products' list")

        if "active" not in comp:
            file_warnings.append(f"{prefix}: missing 'active' field (defaults to true if absent)")

    return file_errors, file_warnings


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 validate_seed.py <seed.json> [<seed.json> ...]", file=sys.stderr)
        sys.exit(2)

    all_errors = []
    all_warnings = []
    for path in sys.argv[1:]:
        errs, warns = check(path)
        all_errors.extend(errs)
        all_warnings.extend(warns)

    if all_warnings:
        print(f"\n--- {len(all_warnings)} WARNING(S) ---", file=sys.stderr)
        for w in all_warnings:
            print(f"  ⚠ {w}", file=sys.stderr)

    if all_errors:
        print(f"\n--- {len(all_errors)} ERROR(S) ---", file=sys.stderr)
        for e in all_errors:
            print(f"  ✗ {e}", file=sys.stderr)
        sys.exit(1)

    print(f"\n✓ All {len(sys.argv) - 1} seed file(s) validated successfully", file=sys.stderr)
    sys.exit(0)


if __name__ == "__main__":
    main()

<!-- SKYBROOK-PACK-FILE-START: skills/anyfence-supplier-pack-builder/render_briefs.py -->

#!/usr/bin/env python3
"""
Renders the two-brief supplier-onboarding pack (supplier+instances brief +
seed-data+price-book brief) from a structured YAML spec.

Usage:
    python3 render_briefs.py spec.yaml --output-dir _briefs/00-inbox/ --asset-dir _briefs/assets/

Spec format (YAML):
    supplier:
      slug: amazing-fencing
      name: Amazing Fencing
      brand_colour: "#1a3a5c"
      contact_email: ~
      trust_tier: platform
      website: https://amazingfencing.com.au
      address: "Multi-state: Sydney, Melbourne, Brisbane, Gold Coast"
      region: "NSW, VIC, QLD"
      metadata:
        founded: ~30 years ago (~1995)
        services: install + supply (sister site: fencing-supplies.com.au)

    archetype_seed_required: false  # true if first instance of a new archetype

    instances:
      - slug: amazing-permasteel
        archetype: panel-fence
        name: "Amazing Fencing — Permasteel"
        status: active
        readiness_status: draft
        trust_tier: platform
        visibility: public
        description: "PermaSteel modular fencing system in 1.5/1.8/2.1/2.4m heights"
        metadata:
          source_page: https://amazingfencing.com.au/products/permasteel-fencing/
          available_heights_m: [1.5, 1.8, 2.1, 2.4]
          pricing_pending: "publicly unlisted; needs supply-side price PDF"

    seed_files:
      - filename: permasteel.json
        instance_slug: amazing-permasteel
        # ... (see canonical seed JSON shape)

    price_book:
      name: "Amazing Fencing 2026-05 Trade Pricing"
      source: "Internal trade pricing PDF (TODO: obtain)"
      effective_from: "2026-05-01"
      status: draft   # use 'published' once verified
      tier_code: tier1
      items: []      # populated when pricing PDF supplied

    brief_number_supplier_and_instances: 047
    brief_number_seed_and_price_book: 048

This script is the SECOND step of the workflow. The FIRST step is the human
authoring of the spec file based on supplier research. Use this to render
the boilerplate so each new supplier doesn't require copy-pasting from
brief 042 / 043.

Output files (when --output-dir and --asset-dir are set):
- {output_dir}/{N}-{supplier_slug}-supplier-and-instances.md
- {output_dir}/{N+1}-{supplier_slug}-seed-data-and-price-book.md
- {asset_dir}/{N+1}-{supplier_slug}-seeds/  (the seed JSON files referenced by the brief)
"""
import argparse
import sys
import json
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Install pyyaml: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

SUPPLIER_BRIEF_TEMPLATE = """# Brief {n_supplier} — {supplier_name}: Supplier + System Instances

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 033 merged (Glass Outlet + the 12 archetypes exist)
**Estimated PR size:** small (one data migration; no schema; no UI; no code)
**Primary reference:** `docs/system-authoring-process.md` Section 7 (admin runbook) + `{website}` (source-of-truth product range)

---

## Goal

Add **{supplier_name}** as a supplier on the Anyfence platform. Create the supplier row + {n_instances} `system_instances` matching their public product categories. No products / prices / rules in this brief — that's brief {n_seed}.

**Strategic note:** {supplier_name} is being added as a `{trust_tier}`-tier supplier authored by SkyBrookAI (Liam), because Liam holds the source material and is responsible for the data quality. When {supplier_name} later signs the verified-supplier agreement (per brief 040's verification process), the trust_tier can be demoted to `verified` via the admin UI (brief 035) — that's a clean one-row update, no migration needed.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/{n_supplier}_{supplier_slug_underscore}_supplier_and_instances.sql` | NEW — data migration |
| `catalogues/{supplier_slug}/README.md` | NEW — pointer to source pages + downloadable PDFs |

**Explicitly NOT touched:** no code, no UI, no seed JSON yet (brief {n_seed}).

## Migration SQL

```sql
-- ============================================================================
-- {n_supplier}_{supplier_slug_underscore}_supplier_and_instances.sql
-- ============================================================================

-- ─── Supplier row ───────────────────────────────────────────────────────────
INSERT INTO suppliers (slug, name, brand_colour, contact_email, trust_tier, status, metadata)
VALUES (
  '{supplier_slug}',
  '{supplier_name}',
  {brand_colour_sql},
  {contact_email_sql},
  '{trust_tier}',
  'active',
  {metadata_sql}
)
ON CONFLICT (slug) DO NOTHING;

-- ─── System instances ───────────────────────────────────────────────────────
WITH s AS (SELECT id FROM suppliers WHERE slug = '{supplier_slug}')
INSERT INTO system_instances (
  supplier_id, archetype_id, slug, name, status, readiness_status,
  trust_tier, visibility, description, metadata
) VALUES
{instance_values}
ON CONFLICT (supplier_id, slug) DO NOTHING;

-- ─── Sanity log ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_supplier UUID; v_instance_count INT;
BEGIN
  SELECT id INTO v_supplier FROM suppliers WHERE slug = '{supplier_slug}';
  IF v_supplier IS NULL THEN
    RAISE EXCEPTION '{supplier_name} supplier row not inserted';
  END IF;
  SELECT COUNT(*) INTO v_instance_count FROM system_instances WHERE supplier_id = v_supplier;
  RAISE NOTICE '{supplier_name} seeded: supplier %, % system_instances', v_supplier, v_instance_count;
END $$;
```

## Catalogue README

Create `catalogues/{supplier_slug}/README.md` with source pointers, brand partner details, and TODOs.

## PR description template

```markdown
## Brief {n_supplier} — {supplier_name}: Supplier + System Instances

Adds {supplier_name} as supplier on the Anyfence platform. Creates {n_instances} system_instances. No products / prices / rules in this brief — see brief {n_seed}.

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Migration applies cleanly
- [ ] `NOTICE` message logs the supplier UUID + {n_instances} instances
- [ ] PR base branch is `main`
```

## After this PR merges

Brief {n_seed} ships the seed data (products + price book v1 + rules wiring) for the instances where pricing is available.
"""


def render_supplier_brief(spec):
    """Render the supplier+instances brief from spec."""
    s = spec["supplier"]
    instances = spec["instances"]

    n_supplier = spec.get("brief_number_supplier_and_instances", 47)
    n_seed = spec.get("brief_number_seed_and_price_book", 48)

    instance_values = []
    for inst in instances:
        meta = json.dumps(inst.get("metadata", {}), separators=(",", ":"))
        instance_values.append(
            f"  ((SELECT id FROM s), (SELECT id FROM system_archetypes WHERE slug='{inst['archetype']}'),\n"
            f"    '{inst['slug']}', '{inst['name']}',\n"
            f"    '{inst.get('status', 'active')}', '{inst.get('readiness_status', 'draft')}', "
            f"'{inst.get('trust_tier', 'platform')}', '{inst.get('visibility', 'public')}',\n"
            f"    '{inst['description'].replace(chr(39), chr(39)+chr(39))}',\n"
            f"    '{meta}'::jsonb)"
        )

    return SUPPLIER_BRIEF_TEMPLATE.format(
        n_supplier=f"{n_supplier:03d}",
        n_seed=f"{n_seed:03d}",
        supplier_name=s["name"],
        supplier_slug=s["slug"],
        supplier_slug_underscore=s["slug"].replace("-", "_"),
        website=s.get("website", "https://example.com"),
        trust_tier=s.get("trust_tier", "platform"),
        n_instances=len(instances),
        brand_colour_sql=f"'{s['brand_colour']}'" if s.get("brand_colour") else "NULL",
        contact_email_sql=f"'{s['contact_email']}'" if s.get("contact_email") else "NULL",
        metadata_sql="jsonb_build_object(" + ", ".join(
            f"'{k}', {json.dumps(v)}" for k, v in s.get("metadata", {}).items()
        ) + ")" if s.get("metadata") else "'{}'::jsonb",
        instance_values=",\n".join(instance_values),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("spec", help="Path to the YAML spec file")
    parser.add_argument("--output-dir", default=".", help="Where to write the rendered brief files")
    parser.add_argument("--asset-dir", default=None, help="Where to write seed JSON files")
    parser.add_argument("--print-only", action="store_true", help="Print the rendered brief to stdout instead of writing")
    args = parser.parse_args()

    spec = yaml.safe_load(Path(args.spec).read_text())
    supplier_brief = render_supplier_brief(spec)

    if args.print_only:
        print(supplier_brief)
        return

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    n_supplier = spec.get("brief_number_supplier_and_instances", 47)
    out_path = out_dir / f"{n_supplier:03d}-{spec['supplier']['slug']}-supplier-and-instances.md"
    out_path.write_text(supplier_brief)
    print(f"Wrote: {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()


<!-- SKYBROOK-PACK-BUNDLE-END -->

End of bundle. If Codex's extractor reached this marker without errors, all 39 files have been written. Proceed to the staging steps in `CODEX-EXTRACTION-PROMPT.md`.
