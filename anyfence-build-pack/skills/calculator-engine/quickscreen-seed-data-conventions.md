---
skill: quickscreen-seed-data-conventions
id: cmppjzyji071o07adkp7xbe6e
description: QuickScreen BOM engine seed-data conventions: JSON files as source of truth, business-key resolution (no UUIDs), bomCategory 12-category taxonomy for BOM display ordering, companionOf/subCategory/sortPriority ordering, isOptionalAccessory pattern, allowedAngles derivation rules (including the 45/135 reasoning), stocks() math.js helper, finish_family slat-range field, and the engine-injected vs seed-writable variable lists.
whenToUse: 
tags: 
---

# QuickScreen Seed Data Conventions

The seed-authoring conventions for The Glass Outlet's QuickScreen BOM engine. Distinct from `anyfence-fence-config-schema` (which describes the Anyfence engine's universal schema) — this skill is the QuickScreen-specific contract: math.js rules, business-key resolution, bomCategory taxonomy, and the engine-injected variable contract.

## When to use

- Adding a new fencing system (VS, XPL, BAYG, HSSG, patios-as-fence) to QuickScreen seeds
- Extending an existing product's rules / colours / SKUs
- Importing pricing or SKUs from a supplier document (CSV / XLSX / PDF)
- Adding a new gate product
- Updating QSHS to support a new slat size

## Repo paths

| Artefact | Path |
|---|---|
| Per-variant product files (what you edit) | `supabase/seeds/glass-outlet/products/<variant>.json` |
| Wrapper JSON Schema (LLM output contract) | `supabase/seeds/schemas/product-file.schema.json` |
| Per-table item schemas | `supabase/seeds/schemas/<table>.schema.json` |
| Node upserter (validates + upserts via supabase-js) | `supabase/seeds/tools/seed-products.js` |
| DB → JSON dumper (bootstrap / audit) | `supabase/seeds/tools/dump-to-json.js` |
| Engine that consumes seeds at runtime | `supabase/functions/bom-calculator/index.ts` |
| Largest live worked example | `supabase/seeds/glass-outlet/products/qshs.json` |

## Workflow

1. **Understand the ask.** CSV → read a few rows for shape. Brief → extract the checklist. PDF / XLSX → use Read tool; pull the SKU/price table first.
2. **Read the closest existing file.** New fence system → template `products/qshs.json`. New gate → template `products/qs_gate.json` (note `product_type: "gate"` + `compatible_with_system_types: [...]`).
3. **Create or edit one file** under `supabase/seeds/glass-outlet/products/`.
   - New fence system → `<system-code>.json` (lowercase, e.g. `vs.json`, `xpl.json`).
   - New gate → `<gate-code>.json` with `product_type: "gate"` and a `compatible_with_system_types` array.
   - Extending an existing product → edit in place.
4. **Validate + apply** with `npm run seed:products`. The upserter validates against `product-file.schema.json`, resolves business-key FKs, and upserts every section in dependency order. Schema errors print exact JSON pointer + message. Duplicate SKUs across files = UPDATE on second encounter.
5. **Full reset** via `npm run db:reset`. Chain: `supabase db reset` (migrations + `slat-fencing.sql`) → `seed:products` → `seed:auth` → `seed:glass-outlet`. Watch for `All floors met.` in seed:products output.
6. **Show the diff** back to the user: `git diff supabase/seeds/glass-outlet/products/`.

## Hard rules (do not violate)

- **JSON files are the source of truth** for v3 engine data. No SQL is generated any more — the Node upserter writes Postgres directly via supabase-js.
- **Never hardcode UUIDs** in JSON. Always use the business-key convention (`org_slug` at file level; `product_system_type`, `rule_set_name`, `version_label`, `sku` on rows). The upserter resolves them at apply time.
- **`org_slug` is a file-level field, not a per-row field.** Do not repeat it on individual rows — the wrapper schema rejects that.
- **Colour codes** use the short form everywhere in seeds (`"B"`, `"MN"`, etc.). Long names like `"black-satin"` are UI-display only and get normalised by the engine.
- **`active: true`** by default on every row. Only set `false` to explicitly disable.
- **Seed data lives in `supabase/seeds/`, never in new migrations.** Repo-wide rule.

## Slat-range / SKU-series convention (`finish_family`)

The app's user-facing "Slat range" control is stored as `finish_family`, not a separate `slat_range` field. Current values:

| Value | What it means | SKU patterns |
|---|---|---|
| `standard` | Normal powder-coated slats | `XP-6100-S65-*`, `QS-6100-S90-*` |
| `economy` | Economy 65mm packs | `XP-6500-E65-*` |
| `alumawood` | Timber-look slats | `AW-5800-S65-*`, `AWQS-5800-S90-*` |

When adding a new product, extend `finish_family` options / normalisation **before** inventing any parallel selector.

## bomCategory taxonomy (12 categories — for BOM display ordering)

Keep `product_components[].category` as the **engine selector category** (do not rename it just to improve BOM UI). For BOM grouping in the UI, set `metadata.bomCategory` to one of:

1. `screening`
2. `frames_and_covers`
3. `posts_and_mounting`
4. `gate_components`
5. `gate_hardware`
6. `sliding_gate_running_gear`
7. `caps_and_plugs`
8. `fasteners_and_screws`
9. `spacers`
10. `fixings`
11. `tools_and_consumables`
12. `automation`

## Display-ordering metadata (per component)

Every `product_components` row should carry:

- `subCategory` — grouping within a bomCategory
- `sortPriority` — order within subCategory
- `companionOf` — SKU of the parent line (keeps required companions side by side, e.g. CFC cover beside side frame; gate screw cover beside gate rail)

## Optional accessories

Never auto-add an optional item just because the parent appears. Mark with:

```json
{
  "isOptionalAccessory": true,
  "optionalChildOf": ["PARENT-SKU"],
  "qtyPerParent": 2
}
```

Or use `qtyFormula` for derived quantities. The UI presents these inline under the selected parent; BOM only includes them when the user explicitly selects them. Example: **TruClose safety caps** use SKU `TC-CAPS3`.

## `allowedAngles` — canvas corner-snap

Drives the draw tool's corner-snap behaviour. Lives at `products[0].metadata.allowedAngles` (top-level product entry, not a component row).

| System characteristic | `allowedAngles` value |
|---|---|
| Can be cut / joined at any angle (timber, flexible systems) | Omit the key entirely (or `[]`) — no constraints, free draw |
| Rigid aluminium with 90° corner post only | `[90]` |
| Rigid aluminium with 45° mitre bracket as well | `[45, 90, 135]` |

### Deriving from catalogue / build pack

1. Scan for corner accessories — angle brackets, corner posts, mitre joiners. Each distinct angle the system *physically supports* at a post junction belongs in the array.
2. If the system has an "adjustable" angle connector covering an arbitrary range, treat it like timber — omit the key (free draw).
3. **Do NOT include 180°** — the engine always adds straight-continuation automatically.
4. **Why 45 and 135 both appear**: the engine measures the interior angle at the vertex; a 45° mitre presents as either 45° or 135° depending on draw direction, so both must be listed.
5. **If you can't confirm from source material, ask the user** — do not invent angles.

```json
"metadata": {
  "allowedAngles": [90],
  "options": { ... }
}
```

## Gates live in their own file

A gate product can pair with multiple fence systems via `compatible_with_system_types`, so it doesn't belong in any one fence file. `qs_gate.json` is the live example (compatible with QSHS, VS, XPL, BAYG).

## `stocks()` math.js helper

Available in all rule expressions:

```
stocks(cutsNeeded, stockLen, cutLen) → integer
```

Replaces every `X_cuts_per_stock` + `X_stocks` rule pair. Handles 0 / NaN gracefully.

Example: `stocks(num_slats, 6100, slat_cut_length_mm)` gives total stock lengths needed.

## Engine-injected geometry — DO NOT seed `product_rules` for these

The engine injects these into `segCtx` automatically. Writing seed rules for them silently overrides the engine's values:

```
num_panels, panel_width_mm, num_posts
system_termination_count, non_system_termination_count, non_system_wall_count
corner_count
left_is_system, right_is_system, left_is_wall, right_is_wall
left_is_non_system, right_is_non_system, left_is_join, right_is_join
left_is_corner, right_is_corner, left_angle_deg, right_angle_deg
```

## Renamed variables — use the new names

| Old name | New name |
|---|---|
| `product_post_boundary_count` | `system_termination_count` |
| `corner_post_count` | `corner_count` |
| `wall_boundary_count` | `non_system_wall_count` |
| `left_is_product_post` | `left_is_system` |
| `right_is_product_post` | `right_is_system` |
| `left_boundary_type` | structural `leftTermination` on the segment (not a variable) |
| `right_boundary_type` | structural `rightTermination` on the segment (not a variable) |
| `segment_kind` | structural `kind: 'fence' \| 'gate'` on the segment (not a variable) |

## When uncertain about a formula or convention

Check the relevant section of `qshs.json`, or ask the user. Don't invent numbers.

## After the work lands

- Update `docs/tasks.md` under the "Seed-mapping / self-serve" section with a bullet noting what was added.
- If new SKUs were introduced, confirm `v3-verify-seeds.sql` row-count floors are still satisfied (the reset output reports this).

## Lazy-loaded references (load on first use, not all at once)

| File | When to load |
|---|---|
| `references/schema-catalogue.md` | First time authoring any row — "which table does X belong in?" |
| `references/expression-syntax.md` | First time writing a math.js `expression` or `qty_formula` — full variable cheat-sheet per stage |
| `references/worked-examples/qshs-gate.md` | When adding a gate product — annotated QSHS_GATE walkthrough |
| `references/worked-examples/adding-vs.md` | When adding a new slat fencing system — full end-to-end example |

## Handoffs

- Catalogue → matrix → seed JSON flow: pair with `supplier-catalogue-extractor`.
- BOM display ordering questions: pair with `fence-calculator-ui-conventions`.
- Validating seeds against worked examples: pair with `fence-calculator-qa-tester`.
