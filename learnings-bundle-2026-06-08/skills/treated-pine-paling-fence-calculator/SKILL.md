---
name: treated-pine-paling-fence-calculator
id: cmpfg5qc00j3k07ada43xqfnv
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# treated-pine-paling-fence-calculator

> Calculates a bill of materials for standard boundary paling fences (treated pine or hardwood) using canonical product names. Supports butted (6-line BOM) and lapped & capped (8-line BOM with capping rail) styles. Pure calculation engine — no credentials required.

## When to use
(not specified)

## Documentation
# Treated Pine Paling Fence — BOM Calculator

Calculates a canonical bill of materials for standard boundary paling fences (treated pine or hardwood) in Australia. Outputs supplier-agnostic canonical product names — supplier SKUs and prices are resolved by a separate supplier-mapper.

**Part of the Anyfence Fence Calculator Skill Library.**

## Scripts

- `calculator.py` — main BOM engine
- `concrete_helpers.py` — shared concrete-bag math (parameterised by bag size — see below)

Run: `python3 calculator.py < inputs.json` or `python3 calculator.py "$(cat inputs.json)"`.

## Supported styles

| Style           | Palings/m | BOM lines | Notes                                                |
|-----------------|-----------|-----------|------------------------------------------------------|
| `butted`        | 10        | 6         | Standard single-layer butted boundary fence (default)|
| `lapped_capped` | 15        | 8         | Overlapping front+back layers with capping rail      |

## Input schema

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `fence_length_m` | number | — | Required, > 0 |
| `fence_height_mm` | number | — | Standard: 1200/1500/1800/2100/2400; non-standard heights warn |
| `timber_type` | enum | `treated_pine` | `treated_pine` or `hardwood` |
| `post_spacing_mm` | number | 2400 | Max bay width, must not exceed 2400 |
| `rail_count` | number | auto | Override auto rail count |
| `paling_gap_mm` | number | 0 | 0 = butted (standard); ignored in `lapped_capped` style |
| `paling_style` | enum | `butted` | `butted` or `lapped_capped` |
| **`concrete_bag_size_kg`** | enum | 20 | **`20` or `30`. Scales `concrete_bags` to keep ~30kg target per post.** |
| **`concrete_product_type`** | enum | `Rapid Set` | **`Rapid Set` or `Post Mix`. Drives canonical name only — math is identical.** |

### Auto rail count by height

| Height (mm) | Rails |
|---|---|
| 1200 | 2 |
| 1500 | 3 |
| 1800 | 3 |
| 2100 | 3 |
| 2400 | 4 |

## Concrete bag-size parameter (2026-06-05)

The amount of concrete needed per fence post is a function of post-hole volume (~30kg of concrete per post for a typical 300mm × 600mm hole), NOT the bag size the supplier happens to stock. The calculator now scales `concrete_bags` by the bag size so the math is correct regardless of which size the supplier offers.

| `concrete_bag_size_kg` | `bags_per_post` | Worked example: 14-post fence | Canonical name emitted |
|---|---|---|---|
| 20 (default — Bunnings retail) | 1.5 | `ceil(14 × 1.5) = 21 bags` | `Rapid Set Concrete 20kg` |
| 30 (Amazing Fencing trade) | 1.0 | `ceil(14 × 1.0) = 14 bags` | `Rapid Set Concrete 30kg` |

**Backward compatibility:** callers that don't pass `concrete_bag_size_kg` get the default 20kg behaviour — byte-identical to pre-2026-06-05 output. No regression.

## Outputs

```json
{
  "ok": true,
  "inputs": { ... echoed ... },
  "derived": {
    "post_count": 14,
    "concrete_bags": 21,
    "concrete_bags_per_post": 1.5,
    ...
  },
  "bom": [
    {"line": 1, "category": "Posts", "canonical_name": "100x75 Treated Pine Post", "qty": 14, ...},
    {"line": 4, "category": "Concrete", "canonical_name": "Rapid Set Concrete 20kg", "qty": 21, ...},
    ...
  ],
  "warnings": [],
  "constants": { ... }
}
```

On invalid input: `{"ok": false, "errors": [...], "warnings": [...]}`.

## Worked examples

### Default 20kg path (Bunnings retail)

**Input:** `{"fence_length_m": 30, "fence_height_mm": 1800, "timber_type": "treated_pine", "post_spacing_mm": 2400, "paling_style": "butted"}`

**BOM:**
```
14   × 100x75 Treated Pine Post (2400mm)
20   × 75x38 Treated Pine Rail 4800mm
315  × 100x16 Rough Sawn Treated Pine Paling (1800mm)
21   × Rapid Set Concrete 20kg                   ← default
2000 × 57mm Ring Shank Gal Nail
78   × 100mm Galvanised Batten Screw
```

### Amazing Fencing 30kg path

Same input PLUS `"concrete_bag_size_kg": 30`. Only the concrete line changes:

```
21 × Rapid Set Concrete 20kg   →   14 × Rapid Set Concrete 30kg
```

All other BOM lines are byte-identical.

### Post Mix variant

`"concrete_bag_size_kg": 30, "concrete_product_type": "Post Mix"` → `14 × Post Mix Concrete 30kg`.

## Validation rules

- **Reject** if `fence_length_m <= 0` or missing
- **Reject** if `fence_height_mm` missing
- **Warn** if `fence_height_mm` not in {1200, 1500, 1800, 2100, 2400} — auto rail count falls back
- **Reject** if `post_spacing_mm > 2400` or `<= 0`
- **Reject** if `timber_type` not in {`treated_pine`, `hardwood`}
- **Reject** if `paling_style` not in {`butted`, `lapped_capped`}
- **Reject** if `paling_gap_mm < 0`
- **Reject** if `concrete_bag_size_kg` not in `(20, 30)` — adding a new size requires a canonical-name contract version bump
- **Reject** if `concrete_product_type` not in `('Rapid Set', 'Post Mix')`
- **Warn** if `paling_gap_mm > 0` AND `paling_style = lapped_capped` — gap is ignored in lapped mode

## Canonical product names emitted

**Posts, rails, palings, fasteners** (any style):
```
100x75 Treated Pine Post                       100x75 Hardwood Post
75x38 Treated Pine Rail 4800mm                 75x38 Hardwood Rail 4800mm
100x16 Rough Sawn Treated Pine Paling          100x16 Rough Sawn Hardwood Paling
57mm Ring Shank Gal Nail                       57mm Smooth Shank Gal Nail
100mm Galvanised Batten Screw
```

**Lapped + capped style adds:**
```
45mm Ring Shank Gal Nail                       45mm Smooth Shank Gal Nail
75x50 Treated Pine Capping Rail 4800mm         75x50 Hardwood Capping Rail 4800mm
```

**Concrete (any style, picked by inputs):**
```
Rapid Set Concrete 20kg     ← default (Bunnings retail)
Rapid Set Concrete 30kg     ← Amazing Fencing trade · added 2026-06-05
Post Mix Concrete 20kg
Post Mix Concrete 30kg      ← added 2026-06-05
```

## Canonical-name contract

These names are stable identifiers for the supplier-mapper. **They will not change without a version bump.** Sizing components (e.g. `100x75`, `75x50`, `57mm`) come first; descriptive type (`Ring Shank`, `Rough Sawn`) follows; material label (`Treated Pine` / `Hardwood`) is always present; stock length (`4800mm`) appears for length-sold items.

**Concrete naming pattern:** `[Product Type] Concrete [bag_size]kg` — product type (Rapid Set / Post Mix) first, then literal `Concrete`, then bag size.

## Golden fixtures

Located in `fixtures/` next to the calculator. Run any of:

```bash
python3 calculator.py < fixtures/butted-30m-1800mm-treatedpine-20kg.input.json
python3 calculator.py < fixtures/butted-30m-1800mm-treatedpine-30kg.input.json
python3 calculator.py < fixtures/butted-30m-1800mm-treatedpine-30kg-postmix.input.json
python3 calculator.py < fixtures/lappedcapped-30m-1800mm-treatedpine-30kg.input.json
```

Each input has a matching `.expected.json` — output must match byte-identical (regression guard).

## Supplier mapping

Calculator outputs canonical names → supplier-mapper resolves each to `{supplier_sku, supplier_name, unit_price, pack_size, available}`. Canonical names are stable; mapper key on the exact string.

## Spec doc

Source of truth: `Treated Pine Paling Fence — BOM Calculator Skill Spec` (id `cmpfevj5a0i7k07adamdq570v`, project-scoped). Update spec first, then this skill, then the script — lockstep.

## Scripts
calculator.py
concrete_helpers.py
