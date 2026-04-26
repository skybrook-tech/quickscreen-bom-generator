# Expression Syntax — math.js cheat sheet

> **Maintainer note**: if you add a new universal variable to `bom-calculator/index.ts`'s
> `segCtx` construction, add it to the "Injected by the engine" section below.

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
finish              mounting_type
gate_width_mm       gate_height_mm     gate_qty             hinge_type
latch_type          opening_direction  hinge_side           frame_cap_size
```

Note: `kind`, `productCode`, `leftTermination`, and `rightTermination` are
**structural** properties on the segment (not variables) — they are never
listed in `product_variables`.

### Injected by the engine (always available)

These come from the canonical payload's runs/segments structure and are
computed once per segment before rules run. **Never write product_rules for
these — the engine owns them.**

```
num_panels                    panel_width_mm               num_posts
system_termination_count      non_system_termination_count non_system_wall_count
corner_count
left_is_system                right_is_system
left_is_wall                  right_is_wall
left_is_non_system            right_is_non_system
left_is_join                  right_is_join
left_is_corner                right_is_corner
left_angle_deg                right_angle_deg
slat_stock_length_mm          side_frame_stock_length_mm
segment_width_mm              target_height_mm
```

### Added by `derive` stage (available to stock / accessory / component)

Anything a `derive` rule writes via `output_key`. In QSHS, these include:

- `num_slats` (per panel)
- `actual_height_mm`
- `side_frame_cut_length_mm`
- `centre_support_cut_length_mm`
- `slat_cut_length_mm`
- `requires_csr` (boolean)
- `num_sf_pieces` — total side-frame pieces needed
- `num_sf_boundary` — side frames at system termination ends
- `num_fsec_total` — total f-sections for non-system (wall) ends

### Added by `stock` stage (available to accessory / component)

In QSHS, these are produced by `stocks()` calls:

- `slat_stocks` — stock lengths of slat material needed
- `sf_stocks` — stock lengths of side frame material needed
- `csr_stocks` — centre support rail stock lengths
- `fsec_stocks` — f-section stock lengths

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

## Math.js helpers

Beyond the built-in math.js functions (floor, ceil, round, abs, min, max),
one custom helper is registered:

### `stocks(cutsNeeded, stockLen, cutLen) → integer`

Returns the number of stock lengths needed to produce `cutsNeeded` cuts of
length `cutLen` from material that comes in `stockLen` lengths.

```
stocks(52, 6100, 2438)   → 26   (floor(6100/2438)=2 per stock, ceil(52/2)=26)
stocks(num_slats, 6100, slat_cut_length_mm)  → slat_stocks
stocks(0, 6100, 2500)    → 0    (zero cuts = zero stocks)
stocks(NaN, 6100, 2500)  → 0    (NaN-safe)
stocks(3, 1000, 2000)    → 3    (cut longer than stock = one stock per cut)
```

Use `stocks()` instead of manually writing `X_cuts_per_stock = floor(...)` +
`X_stocks = ceil(...)` — it eliminates two rules per material and handles all
edge cases.

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
- **Null safety.** If a variable might be undefined in some segment kinds,
  guard with a ternary: `segment_kind == 'bay_group' ? bay_count : 1`.
  Note: `kind` on the segment is structural (fence/gate), not a variable.
