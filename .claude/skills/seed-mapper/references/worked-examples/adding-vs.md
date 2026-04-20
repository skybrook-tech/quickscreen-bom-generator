# Worked Example: Adding the VS (Vertical Slat) System

This walks through mapping a short natural-language brief into **one JSON file**
— `supabase/seeds/glass-outlet/products/vs.json` — that seeds the new fencing
system end-to-end. Useful template for BAYG / XPL / any future horizontal or
vertical slat variant.

**Output shape**: a single file with a top-level `org_slug` and one array per
table section (products, product_components, rule_sets, rule_versions,
product_constraints, product_variables, product_validations, product_rules,
product_component_selectors, product_companion_rules, product_warnings,
pricing_rules). The fragments below show each section's contents — in the
actual file, collect them into one top-level object keyed by table name. See
`supabase/seeds/schemas/product-file.schema.json` for the wrapper.

> **Do not** create separate files for gates. If this system had a VS gate,
> its rows would live inside this same `vs.json`.

## The brief

> **VS — Vertical Slat Screen.** Vertical slat orientation: slats insert into
> top and bottom rails rather than slotted posts. Same colour range as QSHS
> (B, MN, G, SM, W, BS, D, M, P, PB, S). 65mm or 90mm slats. Allowed gaps:
> 5, 9, 20mm (note: no 0mm unlike QSHS).
>
> **Dimensional bounds**: height 300–2400mm (lower max than QSHS because
> posts don't go as tall), max panel 2600mm, panels ≥ 2000mm require a CSR
> (same rule as QSHS).
>
> **Slat cut length** = panel_width_mm − 10 (vertical slats insert into the
> full rail; 5mm clearance each side).
>
> **Panel structure**: 2 side frames per panel, 1 top rail + 1 bottom rail,
> posts on each end. Each side frame gets a CFC cover like QSHS.
>
> **Slat count** = floor((panel_width_mm + slat_gap_mm − 10) / (slat_size_mm
> + slat_gap_mm)). Note it's derived from **panel width**, not height —
> because slats are vertical.
>
> **Top/bottom rail cut length** = panel_width_mm − (width deduction).
>
> **Height-direction slat cut** = target_height_mm − 13 (rail insertion both
> top and bottom).
>
> **Pricing tiers**: tier2 = 85% of tier1; tier3 = 72% of tier1. Tier 1 prices
> are attached (omitted here for brevity).

## Decomposition checklist

From the brief, extract:

1. Product row → `products.json`
2. Rule set + version → `rule_sets.json` + `rule_versions.json`
3. Colour + slat size + gap options → `product_variables.json`
4. Bounds → `product_constraints.json`
5. Cross-variable checks → `product_validations.json`
6. Formulas → `product_rules.json`
7. SKUs by category → `product_component_selectors.json`
8. Auto-adds → `product_companion_rules.json`
9. Reviewer warnings → `product_warnings.json`
10. Catalog + pricing → `product_components.json` + `pricing_rules.json`

## The JSON fragments

### `products.json` (append)

```json
{ "parent_system_type": "QUICKSCREEN",
  "system_type": "VS",
  "name": "VS Vertical Slat Screen",
  "description": "Vertical slat orientation; slats insert into top/bottom rails.",
  "active": true, "sort_order": 2,
  "metadata": { "allowedAngles": [90, 135, 180],
                "options": {
                  "slatSize": ["65","90"], "slatGap": ["5","9","20"],
                  "colour": ["black-satin","monument-matt","woodland-grey-matt",
                             "surfmist-matt","pearl-white-gloss","basalt-satin",
                             "dune-satin","mill","primrose","paperbark",
                             "palladium-silver-pearl"] } } }
```

### `rule_sets.json` + `rule_versions.json` (append)

```json
// rule_sets.json
{ "product_system_type": "VS",
  "name": "VS Fence Rules",
  "description": "Data-driven VS vertical slat BOM rules v3", "active": true }

// rule_versions.json
{ "product_system_type": "VS",
  "rule_set_name": "VS Fence Rules", "version_label": "v1.0.0",
  "is_current": true, "effective_from": "2026-04-19",
  "notes": "Initial VS rules" }
```

### `product_constraints.json` (append)

```json
{ "product_system_type": "VS",
  "name": "min_height_mm", "constraint_type": "min", "value_text": "300",
  "unit": "mm", "severity": "error", "applies_when_json": {},
  "message": "Height must be at least 300mm", "active": true }

{ "product_system_type": "VS",
  "name": "max_height_mm", "constraint_type": "max", "value_text": "2400",
  "unit": "mm", "severity": "error", "applies_when_json": {},
  "message": "Height must be 2400mm or less", "active": true }

{ "product_system_type": "VS",
  "name": "max_panel_width_mm", "constraint_type": "max", "value_text": "2600",
  "unit": "mm", "severity": "warning", "applies_when_json": {},
  "message": "Panel above 2600mm not supported", "active": true }

{ "product_system_type": "VS",
  "name": "csr_threshold_width_mm", "constraint_type": "threshold",
  "value_text": "2000", "unit": "mm", "severity": "warning",
  "applies_when_json": {},
  "message": "Panels 2000mm and above require a centre support rail",
  "active": true }

{ "product_system_type": "VS",
  "name": "allowed_gap_mm", "constraint_type": "enum",
  "value_text": "[5,9,20]", "unit": "mm", "severity": "error",
  "applies_when_json": {}, "message": "Gap must be 5, 9, or 20",
  "active": true }

{ "product_system_type": "VS",
  "name": "allowed_slat_size_mm", "constraint_type": "enum",
  "value_text": "[65,90]", "unit": "mm", "severity": "error",
  "applies_when_json": {}, "message": "Slat size must be 65 or 90",
  "active": true }
```

### `product_variables.json` (append — job/run/segment scoped)

```json
{ "product_system_type": "VS",
  "name": "colour_code", "label": "Colour",
  "data_type": "enum", "unit": null, "required": true,
  "default_value_json": "B",
  "options_json": ["B","MN","G","SM","W","BS","D","M","P","PB","S"],
  "scope": "job", "sort_order": 10, "active": true }

{ "product_system_type": "VS",
  "name": "slat_size_mm", "label": "Slat Size",
  "data_type": "enum", "unit": "mm", "required": true,
  "default_value_json": 65, "options_json": [65, 90],
  "scope": "job", "sort_order": 20, "active": true }

{ "product_system_type": "VS",
  "name": "slat_gap_mm", "label": "Slat Gap",
  "data_type": "enum", "unit": "mm", "required": true,
  "default_value_json": 5, "options_json": [5, 9, 20],
  "scope": "job", "sort_order": 30, "active": true }

{ "product_system_type": "VS",
  "name": "panel_width_mm", "label": "Panel Width",
  "data_type": "number", "unit": "mm", "required": true,
  "default_value_json": 1000, "options_json": [],
  "scope": "segment", "sort_order": 60, "active": true }

{ "product_system_type": "VS",
  "name": "target_height_mm", "label": "Target Height",
  "data_type": "number", "unit": "mm", "required": true,
  "default_value_json": 1800, "options_json": [],
  "scope": "segment", "sort_order": 50, "active": true }

// … boundary/mounting/segment_kind variables, all exactly like QSHS
```

### `product_validations.json` (append)

```json
{ "product_system_type": "VS",
  "name": "height_in_range",
  "expression": "target_height_mm >= 300 && target_height_mm <= 2400",
  "severity": "error",
  "message": "Height is outside VS range (300–2400mm)", "active": true }

{ "product_system_type": "VS",
  "name": "gap_allowed",
  "expression": "[5,9,20].includes(slat_gap_mm)",
  "severity": "error", "message": "Gap must be 5, 9, or 20", "active": true }

{ "product_system_type": "VS",
  "name": "slat_size_allowed",
  "expression": "[65,90].includes(slat_size_mm)",
  "severity": "error", "message": "Slat size must be 65 or 90", "active": true }
```

### `product_rules.json` (append — follow derive → stock → accessory → component)

```json
// derive
{ "product_system_type": "VS",
  "rule_set_name": "VS Fence Rules", "version_label": "v1.0.0",
  "stage": "derive", "name": "num_slats",
  "expression": "floor((panel_width_mm + slat_gap_mm - 10) / (slat_size_mm + slat_gap_mm))",
  "output_key": "num_slats", "priority": 10, "active": true,
  "notes": "VS: slats sized from panel width, 10mm total rail insertion" }

{ "product_system_type": "VS",
  "rule_set_name": "VS Fence Rules", "version_label": "v1.0.0",
  "stage": "derive", "name": "slat_cut_length_mm",
  "expression": "target_height_mm - 13",
  "output_key": "slat_cut_length_mm", "priority": 20, "active": true,
  "notes": "Top + bottom rail insertion" }

{ "product_system_type": "VS",
  "rule_set_name": "VS Fence Rules", "version_label": "v1.0.0",
  "stage": "derive", "name": "rail_cut_length_mm",
  "expression": "panel_width_mm - width_deduction_mm",
  "output_key": "rail_cut_length_mm", "priority": 30, "active": true,
  "notes": "Width deduction comes from boundary context" }

{ "product_system_type": "VS",
  "rule_set_name": "VS Fence Rules", "version_label": "v1.0.0",
  "stage": "derive", "name": "requires_csr",
  "expression": "panel_width_mm >= 2000",
  "output_key": "requires_csr", "priority": 40, "active": true }

// component
{ "product_system_type": "VS",
  "rule_set_name": "VS Fence Rules", "version_label": "v1.0.0",
  "stage": "component", "name": "num_side_frames",
  "expression": "2", "output_key": "num_side_frames", "priority": 120,
  "active": true }

{ "product_system_type": "VS",
  "rule_set_name": "VS Fence Rules", "version_label": "v1.0.0",
  "stage": "component", "name": "num_rails",
  "expression": "2", "output_key": "num_rails", "priority": 130,
  "active": true, "notes": "Top + bottom rail per panel" }

{ "product_system_type": "VS",
  "rule_set_name": "VS Fence Rules", "version_label": "v1.0.0",
  "stage": "component", "name": "num_cfc_covers",
  "expression": "num_side_frames",
  "output_key": "num_cfc_covers", "priority": 140, "active": true }

{ "product_system_type": "VS",
  "rule_set_name": "VS Fence Rules", "version_label": "v1.0.0",
  "stage": "component", "name": "num_csr",
  "expression": "requires_csr ? 1 : 0",
  "output_key": "num_csr", "priority": 150, "active": true }

{ "product_system_type": "VS",
  "rule_set_name": "VS Fence Rules", "version_label": "v1.0.0",
  "stage": "component", "name": "num_posts_from_boundaries",
  "expression": "product_post_boundary_count + corner_post_count",
  "output_key": "num_posts_from_boundaries", "priority": 160, "active": true }
```

### `product_component_selectors.json` (append — one per category, using placeholders)

```json
{ "product_system_type": "VS",
  "selector_key": "vs_slat_65_std",
  "component_category": "slat", "selector_type": "exact",
  "match_json": { "slat_size_mm": 65 },
  "sku_pattern": "VS-6100-S65-{colour}", "priority": 100,
  "notes": "VS 65mm vertical slat", "active": true }

{ "product_system_type": "VS",
  "selector_key": "vs_slat_90_std",
  "component_category": "slat", "selector_type": "exact",
  "match_json": { "slat_size_mm": 90 },
  "sku_pattern": "VS-6100-S90-{colour}", "priority": 100,
  "notes": "VS 90mm vertical slat", "active": true }

{ "product_system_type": "VS",
  "selector_key": "vs_side_frame",
  "component_category": "side_frame", "selector_type": "exact",
  "match_json": {},
  "sku_pattern": "VS-5800-SF-{colour}", "priority": 90,
  "notes": "VS side frame by colour", "active": true }

{ "product_system_type": "VS",
  "selector_key": "vs_rail",
  "component_category": "rail", "selector_type": "exact",
  "match_json": {},
  "sku_pattern": "VS-5800-RAIL-{colour}", "priority": 90,
  "notes": "VS top/bottom rail", "active": true }

{ "product_system_type": "VS",
  "selector_key": "vs_cfc",
  "component_category": "cfc_cover", "selector_type": "exact",
  "match_json": {},
  "sku_pattern": "VS-5800-CFC-{colour}", "priority": 90,
  "notes": "VS CFC cover by colour", "active": true }

// … spacers and screws identical to QSHS (slat_gap_mm-matched)
```

### `product_companion_rules.json` (append)

```json
{ "product_system_type": "VS",
  "rule_key": "vs_sf_add_cfc",
  "trigger_category": "side_frame", "trigger_match_json": {},
  "add_category": "cfc_cover", "add_sku_pattern": "VS-5800-CFC-{colour}",
  "qty_formula": "same_as(side_frame_qty)", "is_pack": false,
  "priority": 10, "notes": "1 CFC per side frame", "active": true }

{ "product_system_type": "VS",
  "rule_key": "vs_slat_spacers_5",
  "trigger_category": "slat", "trigger_match_json": { "slat_gap_mm": 5 },
  "add_category": "spacer_pack", "add_sku_pattern": "QS-SPACER-05MM-50PK",
  "qty_formula": "ceil(slat_qty/50)", "is_pack": true,
  "priority": 50, "notes": "5mm spacers — 1 pack per 50 slats",
  "active": true }

// … analogous rows for 9mm and 20mm gap; screen screws; F-section
```

### `product_warnings.json` (append)

```json
{ "product_system_type": "VS",
  "warning_key": "vs_panel_width_warn", "severity": "warning",
  "condition_json": { "panel_width_mm": { "gt": 2600 } },
  "message": "Panel exceeds recommended max width; split into additional panels.",
  "active": true }

{ "product_system_type": "VS",
  "warning_key": "vs_csr_required", "severity": "warning",
  "condition_json": { "panel_width_mm": { "gte": 2000 }, "csr_qty": { "eq": 0 } },
  "message": "Panels 2000mm and over require a centre support rail.",
  "active": true }
```

### `product_components.json` (append — the new VS SKUs)

At minimum:

- `VS-6100-S65-{B,MN,G,…}` — VS 65mm vertical slat, one row per colour
- `VS-6100-S90-{B,MN,G,…}` — 90mm
- `VS-5800-SF-{B,MN,…}` — VS side frame
- `VS-5800-RAIL-{B,MN,…}` — top/bottom rail
- `VS-5800-CFC-{B,MN,…}` — CFC cover

Each with `category` matching the selector (`slat`, `side_frame`, `rail`,
`cfc_cover`), `unit: "length"`, `system_types: ["VS"]`, `active: true`.

### `pricing_rules.json` (append)

For each new SKU, three rows (one per tier) with `rule: null`, `priority: 0`:

```json
{ "sku": "VS-5800-RAIL-B",
  "tier_code": "tier1", "rule": null, "price": 26.00,
  "priority": 0, "valid_from": null, "valid_to": null,
  "notes": null, "active": true }

{ "sku": "VS-5800-RAIL-B",
  "tier_code": "tier2", "rule": null, "price": 22.10,
  "priority": 0, "valid_from": null, "valid_to": null,
  "notes": null, "active": true }

{ "sku": "VS-5800-RAIL-B",
  "tier_code": "tier3", "rule": null, "price": 18.72,
  "priority": 0, "valid_from": null, "valid_to": null,
  "notes": null, "active": true }
```

## Validate

```
npm run seed:build    # validates every JSON file against its schema + emits SQL
npm run db:reset      # applies migrations, regenerated SQL, and verifies row counts
```

If `v3-verify-seeds.sql` starts failing (its row-count floors may need raising
to account for the new VS rows), update the counts in
`supabase/seeds/glass-outlet/v3-verify-seeds.sql`.
