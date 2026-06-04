---
name: treated-pine-paling-fence-calculator
description: Calculates a bill of materials for standard boundary paling fences (treated pine or hardwood) using canonical product names. Supports butted (6-line BOM) and lapped & capped (8-line BOM with capping rail) styles. Pure calculation engine — no credentials required.
---

# Treated Pine Paling Fence — BOM Calculator

Pure calculation engine that produces a canonical bill of materials for a boundary paling fence. Supports treated pine and hardwood timber, and two construction styles:

- **`butted`** (default) — standard single-layer butted palings, 6-line BOM
- **`lapped_capped`** — overlapping front + back layers with capping rail, 8-line BOM

Outputs canonical product names (e.g. `100x75 Treated Pine Post`) intended to be passed to a separate supplier-mapper for SKU resolution and pricing.

First entry in the **Fence Calculator Skill Library** — one calculator per fence type (paling, colorbond, pool glass, picket, etc.), all sharing the canonical-name + supplier-mapper pattern.

- **Script**: `calculator.py` (Python 3, stdlib only — `json`, `math`, `sys`)
- **Credentials**: none
- **Side effects**: none (deterministic, offline)

## How to invoke

The script accepts a JSON object either as `argv[1]` or via stdin, and prints a JSON result to stdout.

```bash
# Butted (default style — omit paling_style or set "butted")
python3 calculator.py '{"fence_length_m": 30, "fence_height_mm": 1800, "timber_type": "treated_pine"}'

# Lapped & capped
python3 calculator.py '{"fence_length_m": 30, "fence_height_mm": 1800, "timber_type": "treated_pine", "paling_style": "lapped_capped"}'

# Stdin form
echo '{"fence_length_m": 30, "fence_height_mm": 1800, "paling_style": "lapped_capped"}' | python3 calculator.py
```

You can also `from calculator import calculate_bom` and call it directly:

```python
from calculator import calculate_bom
result = calculate_bom({"fence_length_m": 30, "fence_height_mm": 1800, "paling_style": "lapped_capped"})
```

## Input schema

| Field             | Type   | Default        | Notes                                                       |
|-------------------|--------|----------------|-------------------------------------------------------------|
| `fence_length_m`  | number | required       | Total run in metres, must be > 0                            |
| `fence_height_mm` | number | required       | Standard: 1200, 1500, 1800, 2100, 2400                      |
| `timber_type`     | enum   | `treated_pine` | `treated_pine` or `hardwood`                                |
| `post_spacing_mm` | number | `2400`         | Max bay width, must not exceed 2400                         |
| `rail_count`      | number | auto by height | Override auto rail count                                    |
| `paling_gap_mm`   | number | `0`            | Butted: 0 = butted, >0 = gapped. Ignored in lapped style.   |
| `paling_style`    | enum   | `butted`       | `butted` (6-line BOM) or `lapped_capped` (8-line BOM)       |

### Auto rail count by height

| Height (mm) | Rails |
|-------------|-------|
| 1200        | 2     |
| 1500        | 3     |
| 1800        | 3     |
| 2100        | 3     |
| 2400        | 4     |

Non-standard heights fall back to: <1500 → 2 rails, <2400 → 3 rails, ≥2400 → 4 rails (and a warning is emitted).

## Constants (from spec)

```
PALING_FACE_MM            = 100
PALING_THICKNESS_MM       = 16
POST_SIZE                 = 100x75   (upgrade option: 100x100, not yet wired)
RAIL_SIZE                 = 75x38    (upgrade option: 100x38, not yet wired)
RAIL_STOCK_LENGTH_MM      = 4800
RAIL_PIECES_PER_STOCK     = 2
POST_IN_GROUND_MM         = 600
CONCRETE_BAGS_PER_POST    = 1.5
CONCRETE_BAG_SIZE_KG      = 20

# Front-layer nails (butted: only layer / lapped: outer)
NAILS_PER_PALING_PER_RAIL = 2
NAIL_SIZE_MM              = 57

# Back-layer nails (lapped & capped only)
BACK_NAIL_SIZE_MM             = 45
NAILS_PER_BACK_PALING_PER_RAIL = 1

NAIL_PACK_SIZE            = 250
BATTEN_SCREW_LEN_MM       = 100
WASTAGE_PALINGS           = 0.05
WASTAGE_NAILS             = 0.05
WASTAGE_RAILS             = 0.05     (declared, not currently applied)
WASTAGE_POSTS             = 0
WASTAGE_CONCRETE          = 0
DEFAULT_PALINGS_PER_M     = 10       (butted)
LAPPED_PALINGS_PER_M      = 15       (lap & cap, front + back combined)

# Capping rail (lapped & capped only)
CAPPING_SIZE              = 75x50    (overhangs 75x38 rail; configurable via constant)
CAPPING_STOCK_LENGTH_MM   = 4800
CAPPING_PIECES_PER_STOCK  = 2
```

## Derived quantities

### Common (both styles)

```
length_mm            = fence_length_m × 1000
post_count           = ceil(length_mm / post_spacing_mm) + 1
bay_count            = post_count - 1
rail_pieces          = bay_count × rail_count
rail_stock_lengths   = ceil(rail_pieces / 2)              # 4800mm stock, 2 pieces per length
concrete_bags        = ceil(post_count × 1.5)             # 1.5 × 20kg bags per post
batten_screws        = rail_pieces × 2                    # 1 each end of every rail piece
post_height_mm       = fence_height_mm + 600              # +600mm in-ground
```

### Butted style

```
paling_count         = ceil(length_mm / (100 + paling_gap_mm))
palings_with_wastage = ceil(paling_count × 1.05)          # +5%
nails_count          = paling_count × rail_count × 2      # 2 nails per paling per rail
nails_with_wastage   = ceil(nails_count × 1.05)
nails_rounded        = ceil(nails_with_wastage / 250) × 250   # nearest 250-pack
```

### Lapped & capped style

```
paling_count             = ceil(fence_length_m × 15)      # 15/m total across both layers
palings_with_wastage     = ceil(paling_count × 1.05)
back_palings             = ceil(paling_count / 2)         # back gets the ceiling on odd totals
front_palings            = paling_count - back_palings

# Front layer (57mm × 2 per rail per paling)
nails_front_count        = front_palings × rail_count × 2
nails_front_with_wastage = ceil(nails_front_count × 1.05)
nails_front_rounded      = ceil(nails_front_with_wastage / 250) × 250

# Back layer (45mm × 1 per rail per paling)
nails_back_count         = back_palings × rail_count × 1
nails_back_with_wastage  = ceil(nails_back_count × 1.05)
nails_back_rounded       = ceil(nails_back_with_wastage / 250) × 250

# Capping rail (1 piece per bay; 2 per 4800mm stock)
capping_pieces           = bay_count
capping_stock_lengths    = ceil(capping_pieces / 2)
```

## BOM output

### Butted style — 6 lines

| # | Category   | Canonical name                              | Qty formula            | Unit   | Notes                          |
|---|------------|---------------------------------------------|------------------------|--------|--------------------------------|
| 1 | Posts      | `100x75 [Label] Post`                       | `post_count`           | ea     | `post_height_mm` total         |
| 2 | Rails      | `75x38 [Label] Rail 4800mm`                 | `rail_stock_lengths`   | length | 4800mm stock lengths           |
| 3 | Palings    | `100x16 Rough Sawn [Label] Paling`          | `palings_with_wastage` | ea     | +5% wastage                    |
| 4 | Concrete   | `Rapid Set Concrete 20kg`                   | `concrete_bags`        | bag    | 1.5 bags/post                  |
| 5 | Fasteners  | `57mm [Nail Type] Gal Nail`                 | `nails_rounded`        | ea     | Nearest 250-pack               |
| 6 | Fasteners  | `100mm Galvanised Batten Screw`             | `batten_screws`        | ea     | 2 per rail piece               |

### Lapped & capped style — 8 lines

| # | Category   | Canonical name                              | Qty formula              | Unit   | Notes                                |
|---|------------|---------------------------------------------|--------------------------|--------|--------------------------------------|
| 1 | Posts      | `100x75 [Label] Post`                       | `post_count`             | ea     | `post_height_mm` total               |
| 2 | Rails      | `75x38 [Label] Rail 4800mm`                 | `rail_stock_lengths`     | length | 4800mm stock lengths                 |
| 3 | Palings    | `100x16 Rough Sawn [Label] Paling`          | `palings_with_wastage`   | ea     | 15/m, ≈half back / half front        |
| 4 | Concrete   | `Rapid Set Concrete 20kg`                   | `concrete_bags`          | bag    | 1.5 bags/post                        |
| 5 | Fasteners  | `57mm [Nail Type] Gal Nail`                 | `nails_front_rounded`    | ea     | Front: 2/rail/paling, 250-pack       |
| 6 | Fasteners  | `45mm [Nail Type] Gal Nail`                 | `nails_back_rounded`     | ea     | Back: 1/rail/paling, 250-pack        |
| 7 | Fasteners  | `100mm Galvanised Batten Screw`             | `batten_screws`          | ea     | 2 per rail piece                     |
| 8 | Capping    | `75x50 [Label] Capping Rail 4800mm`         | `capping_stock_lengths`  | length | 1 per bay; 2 per 4800mm stock        |

- **`[Label]`** = `Treated Pine` or `Hardwood` based on `timber_type`
- **`[Nail Type]`** = `Ring Shank` for treated_pine, `Smooth Shank` for hardwood (applies to both 57mm front nails and 45mm back nails)

## Validation rules

- **Reject** if `fence_length_m <= 0` or missing
- **Reject** if `fence_height_mm` missing
- **Warn** (not reject) if `fence_height_mm` not in {1200, 1500, 1800, 2100, 2400} — auto rail count falls back
- **Reject** if `post_spacing_mm > 2400` or `<= 0`
- **Reject** if `timber_type` not in {`treated_pine`, `hardwood`}
- **Reject** if `paling_style` not in {`butted`, `lapped_capped`}
- **Reject** if `paling_gap_mm < 0`
- **Warn** if `paling_gap_mm > 0` AND `paling_style = lapped_capped` — gap is ignored in lapped mode (palings overlap)

If validation fails the script returns `{"ok": false, "errors": [...], "warnings": [...]}` without computing BOM.

## Worked examples

### Butted

**Input:** 30m run, 1800mm high, treated pine, 2400mm spacing, 0mm gap, butted

```bash
python3 calculator.py '{"fence_length_m": 30, "fence_height_mm": 1800, "timber_type": "treated_pine"}'
```

**BOM:**

```
14   × 100x75 Treated Pine Post (2400mm)
20   × 75x38 Treated Pine Rail 4800mm
315  × 100x16 Rough Sawn Treated Pine Paling (1800mm)
21   × Rapid Set Concrete 20kg
2000 × 57mm Ring Shank Gal Nail
78   × 100mm Galvanised Batten Screw
```

### Lapped & capped

**Input:** 30m run, 1800mm high, treated pine, 2400mm spacing, lapped & capped

```bash
python3 calculator.py '{"fence_length_m": 30, "fence_height_mm": 1800, "timber_type": "treated_pine", "paling_style": "lapped_capped"}'
```

**Expected derived:**

```
paling_count           = ceil(30 × 15)  = 450
palings_with_wastage   = ceil(450×1.05) = 473
back_palings           = 225
front_palings          = 225
nails_front_count      = 225 × 3 × 2    = 1350 → 1500 (after wastage + 250-pack)
nails_back_count       = 225 × 3 × 1    = 675  → 750
capping_pieces         = 13 bays        → 7 stock lengths
```

**BOM:**

```
14   × 100x75 Treated Pine Post (2400mm)
20   × 75x38 Treated Pine Rail 4800mm
473  × 100x16 Rough Sawn Treated Pine Paling (1800mm)   [225 back + 225 front]
21   × Rapid Set Concrete 20kg
1500 × 57mm Ring Shank Gal Nail                          [front layer]
750  × 45mm Ring Shank Gal Nail                          [back layer]
78   × 100mm Galvanised Batten Screw
7    × 75x50 Treated Pine Capping Rail 4800mm
```

Use these exact cases as sanity checks whenever the script is modified.

## Output shape

```json
{
  "ok": true,
  "inputs": { "fence_length_m": ..., "fence_height_mm": ..., "timber_type": ..., "post_spacing_mm": ..., "rail_count": ..., "paling_gap_mm": ..., "paling_style": ... },
  "derived": { ... },
  "bom": [ { "line": 1, "category": "Posts", "canonical_name": "...", "description": "...", "qty": N, "unit": "ea", "notes": "..." }, ... ],
  "warnings": [],
  "constants": { ... }
}
```

The `derived` object's keys differ by `paling_style`:

- **Butted**: `paling_count`, `palings_with_wastage`, `nails_count`, `nails_with_wastage`, `nails_rounded`
- **Lapped & capped**: `paling_count`, `back_palings`, `front_palings`, `palings_with_wastage`, `nails_front_count`, `nails_front_with_wastage`, `nails_front_rounded`, `nails_back_count`, `nails_back_with_wastage`, `nails_back_rounded`, `capping_pieces`, `capping_stock_lengths`

Common keys in both: `length_mm`, `post_count`, `bay_count`, `rail_count`, `rail_pieces`, `rail_stock_lengths`, `concrete_bags`, `batten_screws`, `post_height_mm`.

On validation failure:

```json
{ "ok": false, "errors": ["..."], "warnings": ["..."] }
```

## Canonical product names

These are the stable identifiers the supplier-mapper will key on. They will not change without a version bump.

**Butted style (emitted in BOM):**
```
100x75 Treated Pine Post
100x75 Hardwood Post
75x38 Treated Pine Rail 4800mm
75x38 Hardwood Rail 4800mm
100x16 Rough Sawn Treated Pine Paling
100x16 Rough Sawn Hardwood Paling
Rapid Set Concrete 20kg
57mm Ring Shank Gal Nail
57mm Smooth Shank Gal Nail
100mm Galvanised Batten Screw
```

**Lapped & capped style adds:**
```
45mm Ring Shank Gal Nail
45mm Smooth Shank Gal Nail
75x50 Treated Pine Capping Rail 4800mm
75x50 Hardwood Capping Rail 4800mm
```

**Reserved (upgrade options, not yet selectable):**
```
100x100 Treated Pine Post
100x38 Treated Pine Rail 4800mm
```

## Supplier-mapping interface

This calculator outputs **canonical names only**. To produce a supplier-specific quote:

1. Run this calculator → canonical BOM
2. Pass each `canonical_name` to a supplier-mapper that returns: supplier product name, supplier SKU, unit price, pack size, availability flag

Example mapping:

```json
{
  "canonical_name": "100x75 Treated Pine Post",
  "supplier_name": "Treated Pine H4 Post 100x75x2400",
  "supplier_sku": "TP-POST-100x75-2400",
  "unit_price": 18.50,
  "pack_size": 1,
  "available": true
}
```

## Variants and boundaries

**v2 implements:**
- **Butted** (default): 10 palings/m, single layer, 6-line BOM
- **Lapped & capped**: 15 palings/m split 50/50 across front/back layers, 45mm back-layer nails (1/rail/paling), 57mm front-layer nails (2/rail/paling), 75x50 capping rail (1 piece per bay, 2 per 4800mm stock), 8-line BOM

**Documented but not implemented:**
- **100x100 post upgrade**: constant declared, not selectable via inputs
- **100x38 rail upgrade**: constant declared, not selectable via inputs
- **Custom capping size**: currently hard-coded to 75x50 via `CAPPING_SIZE`; could be exposed as input if a future supplier mandates a different size

When the user asks for any of those, this skill is the wrong tool — note the limitation and either extend the script or pick a sibling skill.

## Source of truth

The project-scoped doc **"Treated Pine Paling Fence — BOM Calculator Skill Spec"** is the canonical spec. Any change to formulas, constants, canonical names, or BOM line ordering should be made there first and then mirrored into `calculator.py` and this documentation.
