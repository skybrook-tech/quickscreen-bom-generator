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