# Worked Example: QS_GATE (the shipped one)

This walks through the **actual** QS_GATE rows already seeded in the repo,
so you can see how a gate product decomposes across tables. Use it as a
template when adding a new gate (sliding gate, heavy-duty gate, etc.).

**File layout**: all QS_GATE rows live in their OWN file — `supabase/seeds/glass-outlet/products/qs_gate.json`.
QS_GATE is a shared gate product that pairs with multiple fence systems via
`compatible_with_system_types`, so it is not bundled into any single fence file.
Sections below are labelled by table; in the actual file each is an array under the
top-level wrapper object keyed by table name. See `supabase/seeds/schemas/product-file.schema.json`
for the wrapper shape.

## 1. `products` section

A single top-level product row. `product_type: "gate"` identifies it; `compatible_with_system_types` lists which fence systems it pairs with (QSHS, VS, XPL, BAYG).

```json
{ "system_type": "QS_GATE",
  "product_type": "gate",
  "compatible_with_system_types": ["QSHS", "VS", "XPL", "BAYG"],
  "name": "QuickScreen Pedestrian Gate",
  "description": "Single-leaf swing gate compatible with any QuickScreen slat fence system (QSHS, VS, XPL, BAYG).",
  "active": true, "sort_order": 20,
  "metadata": { "mvp": true, "supports_runs": false, "product_family": "gate",
                "supports_segments": true, "default_layout_type": "single_gate",
                "supports_layout_canvas": true, "supports_generated_form": true } }
```

## 2. `product_components` section — gate-specific SKUs

Gate-specific SKUs were added in a single pass. Note:

- `category: "gate_side_frame"` for the gap-specific side frames.
- `category: "hardware"` for hinges and latches.
- `system_types: ["GATE"]` — gate SKUs are only valid in gate contexts.
- `default_price` is usually the tier1 price; pricing rows flesh out the full tier set.

Excerpt:
```json
{ "sku": "QSG-GATESF-05MM-B",
  "name": "QSHS Gate Side Frame 5mm Gap — Black Satin",
  "description": "Gate side frame for 5mm gap",
  "category": "gate_side_frame", "unit": "each", "default_price": 45.00,
  "system_types": ["GATE"], "metadata": {}, "active": true }
```

And hardware:
```json
{ "sku": "DD-KWIK-FIT-FIXED",
  "name": "D&D Kwik Fit Hinge — Fixed",
  "description": "Fixed-position gate hinge",
  "category": "hardware", "unit": "each", "default_price": 45.00,
  "system_types": ["GATE"], "metadata": {}, "active": true }
```

## 3. `rule_sets` + `rule_versions` sections

One of each:

```json
// rule_sets
{ "product_system_type": "QS_GATE",
  "name": "QS Gate Rules",
  "description": "Data-driven QS_GATE pedestrian gate BOM rules v3",
  "active": true }

// rule_versions
{ "product_system_type": "QS_GATE",
  "rule_set_name": "QS Gate Rules", "version_label": "v1.0.0",
  "is_current": true, "effective_from": "2026-04-19",
  "notes": "Initial QS_GATE pedestrian gate v3 rules" }
```

## 4. `product_constraints` section — gate dimensional bounds

Five constraints, scoped to `product_system_type: "QS_GATE"`:

- `min_gate_width_mm` / `max_gate_width_err` — 500mm to 1400mm (error)
- `max_gate_width_warn` — 1200mm (warning, not error)
- `min_gate_height_mm` / `max_gate_height_mm` — 600mm to 2400mm (error)

Warning vs error: gates between 1200mm and 1400mm wide are permitted but
flagged — the engine lets the BOM through, UI surfaces the warning.

## 5. `product_variables` section — gate-specific inputs

Eleven rows scoped to `product_system_type: "QS_GATE"`:

| name | scope | data_type | notes |
|---|---|---|---|
| colour_code | job | enum | shared with fence |
| slat_size_mm | job | enum | [65, 90] |
| slat_gap_mm | job | enum | [0,5,9,20] |
| hinge_type | run | enum | 3 options |
| latch_type | run | enum | 4 options |
| gate_width_mm | segment | number | required |
| gate_height_mm | segment | number | required |
| gate_qty | segment | integer | defaults to 1 |
| opening_direction | segment | enum | left/right |
| hinge_side | segment | enum | left/right |
| frame_cap_size | segment | enum | 50/65/75 |

Reminder: the form is hand-coded and shared across fence + gate products; these
rows tell the **engine** what variables to expect, not the UI.

## 6. `product_validations` section

Two entries for QS_GATE — `gate_width_in_range` and `gate_height_in_range`,
both `severity: "error"`. These are redundant with the min/max constraints but
using both catches different execution paths.

## 7. `product_rules` section — seven rules

Four `derive` rules and three `component` rules:

```
(derive)    gate_slat_count              floor((gate_height_mm - 133 + slat_gap_mm - 3) / (slat_size_mm + slat_gap_mm))
(derive)    gate_slat_cut_length_mm      gate_width_mm - 86
(derive)    gate_hd_rail_cut_length_mm   gate_width_mm - 80
(derive)    gate_side_frame_cut_length_mm gate_height_mm - 3
(component) num_gate_hinges              gate_qty * 2
(component) num_gate_latches             gate_qty
(component) num_gate_frame_caps          gate_qty * 4
```

The `-133` in the slat-count formula accounts for frame top + bottom + clearances.
The `-86` in the slat cut length accounts for side-frame insertion. These numbers
are gate-construction-specific — get them from the supplier's manual when adding a
new gate product.

## 8. `product_component_selectors` section

Five selectors for QS_GATE:

- `qshs_gate_frame_5_gap` / `_9_gap` / `_20_gap` — side frames by gap
  - pattern: `QSG-GATESF-05MM-{colour}` etc.
  - match: `{ "gate_family": "QS_GATE", "slat_gap_mm": 5 }` (etc.)
- `qshs_gate_joiner_65` / `qshs_gate_joiner_90` — joiner blocks by slat size

The gate doesn't use the fence-side `slat` selector; gate slats are handled by
the gate-frame companion structure instead.

## 9. `product_companion_rules` section

Five companion rules for QS_GATE:

- `ped_gate_hinges` — fires on category `gate`, adds the user-selected hinge SKU × `gate_qty`
- `ped_gate_latch` — fires on category `gate`, adds the user-selected latch SKU × `gate_qty`
- `qshs_gate_sc` — fires on `gate_side_frame`, adds 1 pack of 10 screw covers per 10 gates
- `qshs_gate_rs` — fires on `rail`, adds 1 pack of 10 rail screws per 10 gates
- `qshs_gate_caps` — fires on `gate_side_frame`, adds `gate_qty * 4` frame caps

The placeholders `{selected_hinge_sku}` and `{selected_latch_sku}` resolve via
the built-in hinge/latch map in the engine (see
`supabase/functions/bom-calculator/index.ts`).

## 10. `product_warnings` section

Two gate warnings:

- `ped_gate_width_warn` — fires if `gate_width_mm > 1200` (warning)
- `ped_gate_height_warn` — fires if `gate_height_mm > 2100` (warning)

## 11. `pricing_rules` section

Three rows per SKU for every gate-specific SKU (16 SKUs × 3 tiers = 48 pricing rows
for the QS_GATE file).

---

## Key takeaways for adding a new gate

1. Gate-specific variables go at `scope: "segment"` (the gate is a single
   segment in a dedicated run — not a per-run concept).
2. Gate formulas need clearance offsets (`-3`, `-133`, `-86`, `-80`) derived
   from the supplier's construction manual. Don't guess.
3. Hinges and latches are user-selected via `hinge_type` / `latch_type`
   variables, then the companion rules resolve the actual SKU via the
   `{selected_hinge_sku}` / `{selected_latch_sku}` placeholders — so the
   companion rule knows how many to add but the concrete SKU is resolved at
   runtime from the user's choice.
4. Pack accessories (`QSG-SC-10PK`, `QSG-RS-10PK`) use `is_pack: true` and
   `ceil(gate_qty / 10)` — one pack covers ten gates.
5. Frame caps are 4 per gate (2 side frames × 2 top/bottom).
