# Phase V3-2 — QSHS + QSHS_GATE Seeds

> **Status:** Not started
> **Depends on:** V3-1 (engine migrations applied)
> **Unblocks:** V3-4 (edge function has data to read), V3-5 (UI has form + layout schemas)

## Goal

Load the two build-pack CSV sets (`qshs_mvp_build_pack/` + `qshs_gates_build_pack/`) into the engine tables so the `bom-calculator` edge function can compute QSHS fence + QSHS_GATE pedestrian gate BOMs entirely from data.

## Output files

- `supabase/seeds/glass-outlet/qshs-v3-engine.sql` — single ordered seed file with all inserts
- `supabase/seeds/glass-outlet/verify-v3-seeds.sql` — row-count assertion queries
- `supabase/seeds/seed-auth.js` — extended to create an admin user

## UUID & FK strategy

The CSVs mix two styles:

- **MVP-pack CSVs** have explicit `id` columns with deterministic placeholders (`10000000-0000-0000-0000-000000000001`)
- **Gates-pack CSVs** have natural string keys (`selector_key`, `rule_key`, `warning_key`, `alias`) and NO `id` column

At seed-file authoring time:

1. **Generate random v4 UUIDs** for every row across both sets
2. **Store the mapping** as a SQL comment block at the top of `qshs-v3-engine.sql`:

```sql
-- CSV → UUID mapping (do not edit by hand; regenerate via scripts/regen-uuid-map.sh)
-- products[QSHS]                    → '7f9b2d4e-...-0001'
-- products[QSHS_GATE]               → '7f9b2d4e-...-0002'
-- rule_sets[qshs_fence_v1]          → 'a8c3e5f6-...-0001'
-- rule_versions[qshs_fence_v1.0.0]  → 'b9d4f607-...-0001'
-- product_rules[num_slats]          → 'c0e5f718-...-0001'
-- ...
```

3. **`product_code` FKs** (gates pack) resolve via SQL subquery, not a hard-coded UUID:

```sql
INSERT INTO product_component_selectors (…, product_id, …)
VALUES (
  gen_random_uuid(), :org_id,
  (SELECT id FROM products WHERE system_type = 'QSHS_GATE' AND org_id = :org_id AND parent_id IS NULL),
  …
);
```

This keeps the seed re-runnable without stale ID collisions.

## Load order

Ordering matters — downstream rows FK to upstream. This is the single inserts section of `qshs-v3-engine.sql`:

1. `products` — QSHS root + QSHS_GATE root (both `parent_id = NULL`, siblings)
2. `rule_sets` — one per product (`QSHS_FENCE`, `QSHS_GATE`)
3. `rule_versions` — one `v1.0.0` per rule_set, `is_current = true`
4. `product_components` — **reuse** existing `product_components` rows where SKU matches (via `ON CONFLICT (org_id, sku) DO UPDATE`). Insert new gate SKUs only:
   - `QSG-GATESF-05MM-{colour}`, `QSG-GATESF-09MM-{colour}`, `QSG-GATESF-20MM-{colour}` — gate side frames by gap
   - `QSG-JBLOCK-65-4PK`, `QSG-JBLOCK-90-4PK` — joiner blocks by slat size
   - `QSG-SC-10PK` — screw cover pack
   - `QSG-RS-10PK` — rail screw pack
   - `QSG-FTC-{size}` — frame top cap by frame size
   - Hinge SKUs per `src/lib/constants.ts` (`DD-KWIK-FIT-FIXED`, `DD-KWIK-FIT-ADJ`, `DD-HD-WELD-ON`)
   - Latch SKUs (`DD-MAGNALATCH-TP`, `DD-MAGNALATCH-LB`, `DROP-BOLT-STD`)
5. `product_constraints` — from `product_constraints.csv` (6 rows: min/max height, max panel width, CSR threshold, enum guards). Add QSHS_GATE-specific: min gate width 500, max gate width 1400 (pedestrian warning at 1200), standard gate heights enum
6. `product_variables` — from `product_variables.csv` (colour_code, slat_size_mm, slat_gap_mm, mounting_type, target_height_mm, panel_width_mm, left_boundary_type, right_boundary_type, segment_kind, bay_count). Plus QSHS_GATE additions:
   - `gate_width_mm` (number, mm, required, segment scope)
   - `gate_height_mm` (number, mm, required, segment scope)
   - `gate_qty` (integer, count, default 1, segment scope)
   - `hinge_type` (enum, job/run scope, options from constants)
   - `latch_type` (enum, job/run scope, options from constants)
   - `opening_direction` (enum: `left`, `right`, segment scope)
   - `hinge_side` (enum: `left`, `right`, segment scope)
   - `frame_cap_size` (enum: sizes from `QSG-FTC-*`, segment scope)
   - `finish_family` (enum: `standard`, `alumawood`, default `standard`, job scope) — forward-compat
   - `finish` (enum: `WRC`, `IG`, null, job scope) — forward-compat
7. `product_validations` — from `product_validations.csv` (5 rows: height range, gap allowed, slat size allowed, panel width, runs required). Add QSHS_GATE: gate_width in range, gate_height in range
8. `product_rules` — from `product_rules.csv` (15 rows covering derive/stock/accessory/component for QSHS fence). Add QSHS_GATE rules:
   - `gate_slat_count = floor((gate_height_mm - 133 + slat_gap_mm - 3) / (slat_size_mm + slat_gap_mm))` (133mm structural offset)
   - `gate_slat_cut_length_mm = gate_width_mm - 86`
   - `gate_hd_rail_cut_length_mm = gate_width_mm - 80`
   - `gate_side_frame_cut_length_mm = gate_height_mm - 3`
   - `num_gate_hinges = gate_qty * 2` (single swing uses 2 hinges; double swing doubles via variable)
   - `num_gate_latches = gate_qty` (1 per gate leaf)
   - `num_gate_frame_caps = gate_qty * 4`
9. `product_input_schemas` — from `product_input_schemas.csv` (1 row: `qshs_mvp_form`). Add `qshs_gate_mvp_form`
10. `product_input_groups` — from `product_input_groups.csv` (5 rows). Add `gate_settings` group scoped to `qshs_gate_mvp_form`
11. `product_input_fields` — from `product_input_fields.csv` (9 rows). Add fields under `gate_settings`: `gate_width_mm`, `gate_height_mm`, `gate_qty`, `hinge_type`, `latch_type`, `opening_direction`, `hinge_side`, `frame_cap_size`
12. `product_layout_schemas` — from `product_layout_schemas.csv` (1 row: `qshs_multi_run_fence`). Add `qshs_gate_single` (non-multi-run)
13. `product_layout_entity_types` — from `product_layout_entity_types.csv` (4 rows: run, boundary, segment, corner). Add gate-specific: `gate_leaf` under `qshs_gate_single`
14. `product_layout_actions` — from `product_layout_actions.csv` (5 rows). Add `add_qshs_gate_segment` (on `qshs_multi_run_fence`, targets `segment` with `{"segment_kind": "gate_opening", "gate_product_code": "QSHS_GATE"}` metadata)
15. `product_component_selectors` — MVP CSV rows (10) converted: `result_sku` → `sku_pattern` (placeholders for `{colour}`). Plus gates-pack CSV rows (QSHS, QSHS_GATE, QSGH, HSSG — seed all but only QSHS + QSHS_GATE referenced in MVP). Set `selector_type` to `exact` for literal matches, `range` for matches with `lte`/`gte`/`gt`
16. `product_companion_rules` — MVP CSV rows (5) converted to gates-pack column shape. Plus gates-pack rows (QSHS fence: side frame → CFC, side frame → SF caps, CSR → caps, CSR → plates, slat → spacers by gap, slat → screws; QSHS_GATE: gate → hinges, gate → latch, gate → screw covers, gate → rail screws, gate → frame caps)
17. `product_warnings` — from gates-pack CSV. Include all QSHS + QSHS_GATE rows; skip QSVS/QSGH/HSSG/XPL_POST/ANY_AW rows (out of scope for MVP)
18. `input_aliases` — from gates-pack CSV (21 rows, scope `ALL` / `QSHS` / `HSSG` / `GATES`)
19. `pricing_rules` — existing `slat-fencing.sql` already seeds QSHS fence SKUs. Add pricing_rules for new gate SKUs × 3 tiers (`tier1`, `tier2`, `tier3`) using `ON CONFLICT (component_id, tier_code, priority) DO UPDATE`

## Admin seed user

Extend `supabase/seeds/seed-auth.js` to create:

```js
await supabase.auth.admin.createUser({
  email: 'admin@glass-outlet.com',
  password: '123456',
  email_confirm: true,
});

// After profiles row exists (via signup trigger), promote to admin
await supabase.from('profiles')
  .update({ role: 'admin' })
  .eq('email', 'admin@glass-outlet.com');
```

The trace panel (V3-6) requires this account for manual QA.

## Conflict strategy

Every insert uses `ON CONFLICT ... DO UPDATE SET ...` per CLAUDE.md §15. This is critical:

- `npm run db:reset` re-runs the seed; `DO UPDATE` means schema changes propagate to existing rows
- Natural keys that must be unique use `ON CONFLICT (org_id, product_id, selector_key)` etc.
- UUID PKs from the comment-block mapping make the `ON CONFLICT (id)` path stable across re-runs

## Verification (`verify-v3-seeds.sql`)

```sql
DO $$
DECLARE
  expected_rules INT := 15 + 7; -- MVP + QSHS_GATE
  actual_rules INT;
BEGIN
  SELECT COUNT(*) INTO actual_rules FROM product_rules WHERE active;
  IF actual_rules <> expected_rules THEN
    RAISE EXCEPTION 'product_rules count mismatch: expected %, got %', expected_rules, actual_rules;
  END IF;

  -- repeat for every table: constraints, variables, validations, selectors, companions, warnings, aliases, schemas, groups, fields, layout_schemas, entity_types, actions
END $$;

SELECT 'ok' AS v3_seeds_verified;
```

## Smoke test

After `npm run db:reset`:

1. `SELECT COUNT(*) FROM product_rules` → 22
2. `SELECT COUNT(*) FROM product_component_selectors WHERE product_id = (SELECT id FROM products WHERE system_type = 'QSHS_GATE')` → > 0
3. `SELECT * FROM pricing_rules_with_sku WHERE sku = 'QSG-GATESF-05MM-B' AND tier_code = 'tier1' AND active` → 1 row
4. Login as `admin@glass-outlet.com` / `123456` → profile has `role = 'admin'`

## Out of scope

- QSVS, QSGH, HSSG seed rows — tables support them, rows deferred
- Alumawood (finish_family = alumawood) seed rows — deferred
- Bulk import script or CSV-loader CLI tool — deferred
- Automated drift detection between CSV row count and seed row count at CI time — deferred (manual `verify-v3-seeds.sql` run is enough for MVP)
