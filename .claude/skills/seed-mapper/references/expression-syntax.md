# Expression Syntax — math.js cheat sheet

String expressions appear in three places:

- `product_rules.expression` — evaluated in stage order (derive → stock → accessory → component)
- `product_validations.expression` — returns truthy = valid
- `product_companion_rules.qty_formula` — returns a quantity (integer)

All three are parsed by the **math.js** library in the `bom-calculator` edge
function. No other expression language is supported.

## Available syntax

| Feature | Example |
|---|---|
| Arithmetic | `a + b`, `a - b`, `a * b`, `a / b`, `a ^ b`, parens |
| Comparison | `==`, `!=`, `<`, `>`, `<=`, `>=` |
| Boolean ops | `&&`, `||`, `!` |
| Ternary | `cond ? a : b` |
| Floor/ceil/round/abs | `floor(x)`, `ceil(x)`, `round(x)`, `abs(x)` |
| Min/max | `max(a, b)`, `min(a, b)` |
| Array includes | `[65, 90].includes(slat_size_mm)` |

## Variables available, by stage

The engine builds a **context object** and passes it into each expression.
Earlier stages contribute variables to later stages.

### In the payload (always available)

Everything declared in `product_variables` that has a value set in the
canonical payload's `variables` (at `job`, `run`, or `segment` scope).
Typical names:

```
colour_code         slat_size_mm       slat_gap_mm          finish_family
finish              mounting_type      left_boundary_type   right_boundary_type
panel_width_mm      target_height_mm   segment_kind         bay_count
gate_width_mm       gate_height_mm     gate_qty             hinge_type
latch_type          opening_direction  hinge_side           frame_cap_size
```

### Injected by the engine (always available)

These come from the canonical payload's runs/segments structure:

- `product_post_boundary_count` — count of run boundaries of type `product_post`
- `corner_post_count` — count of corners
- `runs` — array reference for `validations` that need to check runs.length
- `slat_stock_length_mm` — default 5800
- `side_frame_stock_length_mm` — default 5800
- `width_deduction_mm` — computed from the boundary termination context

### Added by `derive` stage (available to stock / accessory / component)

Anything a `derive` rule writes via `output_key`. In QSHS, these include:

- `num_slats` (per panel)
- `actual_height_mm`
- `side_frame_cut_length_mm`
- `centre_support_cut_length_mm`
- `slat_cut_length_mm`
- `requires_csr` (boolean)

### Added by `stock` stage (available to accessory / component)

In QSHS:

- `slats_per_stock`
- `side_frames_per_stock`

### Added by `accessory` stage (available to component)

In QSHS:

- `spacers_per_panel`
- `screen_screws_per_panel`
- `f_section_screws_per_panel`

### Added by `component` stage

In QSHS:

- `num_side_frames`
- `num_cfc_covers`
- `num_csr`
- `num_posts_from_boundaries`

**Gate-specific variables** (from QSHS_GATE rules):

- `gate_slat_count`
- `gate_slat_cut_length_mm`
- `gate_hd_rail_cut_length_mm`
- `gate_side_frame_cut_length_mm`
- `num_gate_hinges`, `num_gate_latches`, `num_gate_frame_caps`

### In `qty_formula` (companion rules only)

Trigger-line quantity is available as `trigger_qty` (sometimes called
`slat_qty`, `side_frame_qty`, `gate_qty`, etc. depending on trigger_category).
Helpers:

- `same_as(x)` — copy the trigger line's quantity exactly
- `ceil(trigger_qty / N)` — pack-count style rounding

Examples from the current seed:

```
same_as(side_frame_qty)
ceil(side_frame_qty / 2)
csr_qty * 2
ceil(slat_qty / 50)
gate_qty * 2
```

## SKU pattern placeholders

In `sku_pattern` (selectors) and `add_sku_pattern` (companions):

| Placeholder | Resolves to |
|---|---|
| `{colour}` | short colour code (e.g. `B`) from `colour_code` |
| `{finish}` | `finish` variable |
| `{frame_cap_size}` | `frame_cap_size` variable |
| `{selected_hinge_sku}` | looked up by `hinge_type` → SKU via a small built-in hinge map |
| `{selected_latch_sku}` | same pattern for `latch_type` |

Don't invent new placeholders — they need engine support.

## Common gotchas

- **Off-by-one in slat counts.** The QSHS formula is
  `floor((target_height_mm + slat_gap_mm - 3) / (slat_size_mm + slat_gap_mm))`
  — the `-3` is a clearance offset. Check existing rules before writing a new
  formula; different systems have different offsets (gates use `-133` and `-3`).
- **`includes` instead of `in`.** `[65,90].includes(x)` not `x in [65,90]`.
- **Boolean enum check** — `[0,5,9,20].includes(slat_gap_mm)` is the idiomatic
  way to express "must be one of these". Don't use chained `||`.
- **Null safety.** If a variable might be undefined in some segment kinds
  (e.g. `bay_count` is only set for `bay_group` segments), guard with a
  ternary: `segment_kind == 'bay_group' ? bay_count : 1`.
