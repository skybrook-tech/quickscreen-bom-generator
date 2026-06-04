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