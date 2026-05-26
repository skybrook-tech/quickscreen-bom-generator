# Master Brief: Process the brief queue, open PRs, DO NOT auto-merge

> Paste this ENTIRE file into Codex. It will work through `_briefs/00-inbox/` in numerical order, opening a draft PR for each brief, but **NOT merging**. After all independent briefs in the current batch are PR'd, Codex stops and reports. The user reviews and merges each PR manually, then re-pastes this Master Brief to continue with the next batch.

You are an autonomous brief-executor for the QuickScreen BOM Generator repo (`github.com/skybrook-tech/quickscreen-bom-generator`). Process the folder-based queue at `_briefs/` until you either exhaust the inbox or hit a hard stop. **You do not merge PRs** — you only open them.

## The loop

Repeat until the inbox is empty OR a dependency boundary blocks you OR you hit a hard stop:

### Phase A — Baseline check

Before starting ANY brief in this invocation, run `npm run typecheck`, `npm run test`, `npm run build`. If any fail on the current master:
- STOP immediately. Do NOT start any brief.
- Report the baseline failure clearly with the error messages and which file(s) are broken.
- Suggest the user run the `fix-master-baseline` brief first.
- Exit cleanly.

This guards against compounding bad code on a broken baseline.

### Phase B — Pick the next brief

1. Look at `_briefs/00-inbox/`. Find the lowest-numbered `.md` file by leading numeric prefix.
   - **Empty inbox**: report "Brief queue empty — all briefs have been processed." Exit.
   - **Otherwise**: that's the next brief.

2. Check the brief's dependencies. Read the brief's intro section for a `Depends on:` line. Parse it and verify each referenced brief's PR is merged on master.

   **Dependency resolution rules** (current as of brief 018+):
   - `Depends on: none` or absent → proceed immediately
   - `Depends on: brief NNN merged` → check via `gh pr list --state merged --search "brief-NNN"` or by inspecting `_briefs/02-done/` for the file. If not merged → STOP, report, move brief back to `00-inbox/`, exit.
   - `Depends on: brief NNN (PR #XX) merged` → check via `gh pr view XX --json state` or via the search above
   - Multiple dependencies (e.g., `Depends on: brief 013 AND brief 016 merged`) → ALL must be merged before proceeding

   **Active dependency chains as of brief 028+ (current mini-batch)**:
   - Briefs 019-027 are all in flight (025/026/027 PR'd but not yet merged when this batch begins; merge expected before this batch runs)
   - Brief 028 (canvas drawing refinements) — depends on brief 021 merged ✅ (already on master)
   - Brief 029 (label decluttering + attribution crop) — depends on brief 025 (PR #64) merged
   - If brief 025 (PR #64) is NOT merged yet, brief 029 will pause. Brief 028 can still proceed in parallel.

   When a dependency isn't met: STOP this invocation, report which brief is blocked and on what, move the unprocessed brief back to `00-inbox/`, exit cleanly.

3. **Pre-flight asset check** (for brief 027): if the brief has a "Pre-flight check" section listing required asset files in `_briefs/assets/`, run those checks. If any fail → move brief to `03-paused/` and report which assets Liam needs to commit.

### Phase C — Move to in-progress, execute

3. Move the brief file from `00-inbox/` to `01-in-progress/`. Commit the move on the new branch you're about to create.

4. Checkout master, `git pull` to ensure fresh. Create the branch the brief specifies (typically `codex/brief-XXX-slug`).

5. Open the brief file. Execute its instructions verbatim:
   - Make ALL code changes in the "What to implement" section
   - Honor ALL items in "Constraints":
     - DO NOT modify `src/lib/localBomCalculator.ts`
     - DO NOT modify `canonicalAdapter.ts` public function signatures
     - DO NOT modify `canvasEngine.ts` public types unless the brief says so
     - DO NOT touch `package.json` beyond strictly necessary
     - Use npm 10.x when touching `package-lock.json`
     - Skip the Deno integration job (pre-existing red, out of scope)
   - Run `npm run typecheck`, `npm run test`, `npm run build`
   - Confirm `localBomCalculator.test.ts` passes UNCHANGED
   - **If any check fails** → STOP. Move file from `01-in-progress/` to `03-paused/`. Report which check failed. Continue to Phase D for the next brief (or exit if this is the last).

### Phase D — Open the PR, DO NOT merge

6. Push the branch to origin.

7. Open a **DRAFT** PR against master:
   - Verify the base branch dropdown shows `master` (this caught a real bug previously)
   - Title: from the brief (e.g., "Brief 001 — Remove yellow warnings")
   - Body: include the brief's "Manual reproduction" steps + a "How to verify" checklist + the brief's risk assessment
   - For briefs with dependencies (014-017): add a line "DEPENDS ON: PR #XXX (must merge first)" at the top of the PR body
   - **DO NOT mark the PR ready for review** — leave it as draft. The user will mark ready / merge themselves.

8. Move the brief file from `01-in-progress/` to `02-done/`. The "done" here means "Codex's work is shipped — PR is open and awaiting human review." If the user merges, no further file movement needed. If the user closes the PR without merging, they manually move the file to `03-paused/`.

9. Update or create `_briefs/INVENTORY.md` at the root of `_briefs/` with a running table:

   ```
   | Brief | Status | PR | Branch |
   |---|---|---|---|
   | 001-remove-warnings | PR open | #XX | codex/brief-001-remove-warnings |
   | 002-autocomplete-dismissal | PR open | #YY | codex/brief-002-autocomplete-dismissal |
   ...
   ```

   This gives the user a single place to see the status of all briefs.

### Phase E — Loop or stop

10. Return to Phase A and check the next brief.

11. **Hard-coded stop points** (Codex must stop at these and report, even if more briefs are in the inbox):
    - **No hard stops apply for the current mini-batch (briefs 028, 029).** Both can be PR'd in one invocation if 029's dependency (PR #64 merged) is met. If 029 is blocked, only 028 ships in this invocation. Natural stop is when `00-inbox/` is empty or all remaining briefs are blocked.
    - Earlier hard stops (briefs 013, 016, 019, 020 from previous batches) are no longer relevant — those briefs are merged on master.

## Self-healing

If a previous invocation of this Master Brief was interrupted:

1. Phase A still runs (baseline check)
2. Phase B finds the next brief naturally — if a file is in `01-in-progress/` (interrupted mid-execution), check if its branch + PR exist:
   - PR exists → move file to `02-done/`, update INVENTORY.md, continue with next brief
   - Branch exists but no PR → either open the PR or move file back to `01-in-progress/` to redo
   - No branch → file likely got moved into in-progress but execution didn't start; move back to `00-inbox/` and retry

## Hard rules

- **NEVER** auto-merge any PR. Always leave PRs as draft for human review.
- **NEVER** pick a brief out of numerical order from `00-inbox/`.
- **NEVER** work on more than one brief at a time (max 1 file in `01-in-progress/`).
- **NEVER** improvise architectural changes. If a brief surfaces something deeper, move to `03-paused/` and report.
- **ALWAYS** verify the PR base branch is `master`.
- **ALWAYS** keep `localBomCalculator.test.ts` passing unchanged. If a brief breaks it, STOP, move to `03-paused/`, report.

## Final report

When you exit (either successfully with batch complete, or via a stop condition), post a single final report:

- How many briefs were PR'd in this invocation
- List of PR URLs with brief names
- Briefs still in `00-inbox/` (awaiting future invocations)
- Briefs in `03-paused/` with the reason
- Any caveats the user needs to act on manually (e.g., enable an API in Cloud Console)
- The current state of `_briefs/INVENTORY.md`

## Reference

- `_briefs/README.md` — folder structure overview
- `_briefs/00-inbox/` — queued briefs
- `_briefs/01-in-progress/` — currently executing (max 1)
- `_briefs/02-done/` — PRs opened, awaiting human merge
- `_briefs/03-paused/` — blocked briefs
- `_briefs/INVENTORY.md` — running status table of all briefs

## Begin

Start with Phase A (baseline check). Then process briefs from `_briefs/00-inbox/` in numerical order, opening draft PRs without merging, until you hit a dependency boundary or empty the inbox.
