# Treated Pine Paling Fence — BOM Calculator Skill Spec

Complete specification for the treated-pine-paling-fence-calculator skill. First entry in the Fence Calculator Skill Library. Includes input schema, constants, formulas, BOM output format, validation rules, worked example, and supplier mapping interface.

## Overview

Calculates a canonical bill of materials for standard boundary paling fences in Australia. Supports treated pine and hardwood timber types with canonical product names that can be mapped to specific supplier SKUs via a separate supplier-mapper.

**Part of the Fence Calculator Skill Library** — each fence type (paling, colorbond, pool glass, picket, etc.) has its own calculator skill using canonical names.

**Skill name:** `treated-pine-paling-fence-calculator`
**Script:** `calculator.py` (Python 3, no dependencies)
**Credentials:** None required (pure calculation)

### Supported paling styles

| Style           | Palings/m | BOM lines | Notes                                                |
|-----------------|-----------|-----------|------------------------------------------------------|
| `butted`        | 10        | 6         | Standard single-layer butted boundary fence (default)|
| `lapped_capped` | 15        | 8         | Overlapping front+back layers with capping rail      |

## Input Schema

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `fence_length_m` | number | — | Required, > 0 |
| `fence_height_mm` | number | — | Standard: 1200, 1500, 1800, 2100, 2400 |
| `timber_type` | enum | `treated_pine` | `'treated_pine'` or `'hardwood'` |
| `post_spacing_mm` | number | 2400 | Max bay width, must not exceed 2400 |
| `rail_count` | number | auto | Override auto rail count |
| `paling_gap_mm` | number | 0 | 0 = butted (standard); ignored in `lapped_capped` style |
| `paling_style` | enum | `butted` | `'butted'` or `'lapped_capped'` |

### Auto Rail Count by Height

| Height (mm) | Rails |
|-------------|-------|
| 1200 | 2 |
| 1500 | 3 |
| 1800 | 3 |
| 2100 | 3 |
| 2400 | 4 |

## Constants

```
PALING_FACE_MM            = 100
PALING_THICKNESS_MM       = 16
POST_SIZE                 = 100x75    (upgrade option: 100x100)
RAIL_SIZE                 = 75x38     (upgrade option: 100x38)
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

# Wastage
WASTAGE_PALINGS           = 0.05
WASTAGE_NAILS             = 0.05
WASTAGE_RAILS             = 0.05      (declared, not currently applied)
WASTAGE_POSTS             = 0
WASTAGE_CONCRETE          = 0

# Paling density (per metre)
DEFAULT_PALINGS_PER_M     = 10        (butted)
LAPPED_PALINGS_PER_M      = 15        (lap & cap, front + back combined)

# Capping rail (lapped & capped only)
CAPPING_SIZE              = 75x50     (overhangs 75x38 rail; configurable)
CAPPING_STOCK_LENGTH_MM   = 4800
CAPPING_PIECES_PER_STOCK  = 2
```

## Derived Quantities (Formulas)

### Common (both styles)

```
length_mm            = fence_length_m × 1000
post_count           = ceil(length_mm / post_spacing_mm) + 1
bay_count            = post_count - 1
rail_pieces          = bay_count × rail_count
rail_stock_lengths   = ceil(rail_pieces / 2)              // 4800mm stock, 2 per length
concrete_bags        = ceil(post_count × 1.5)             // 1.5 × 20kg bags per post
batten_screws        = rail_pieces × 2                    // 1 each end of every rail piece
post_height_mm       = fence_height_mm + 600              // +600mm in-ground
```

### Butted style

```
paling_count         = ceil(length_mm / (100 + paling_gap_mm))
palings_with_wastage = ceil(paling_count × 1.05)          // +5%
nails_count          = paling_count × rail_count × 2      // 2 nails per paling per rail
nails_with_wastage   = ceil(nails_count × 1.05)
nails_rounded        = ceil(nails_with_wastage / 250) × 250   // round up to 250-pack
```

### Lapped & capped style

```
paling_count            = ceil(fence_length_m × 15)       // 15/m total across both layers
palings_with_wastage    = ceil(paling_count × 1.05)
back_palings            = ceil(paling_count / 2)          // back gets the ceiling on odd totals
front_palings           = paling_count - back_palings

// Front layer (57mm × 2 per rail per paling)
nails_front_count       = front_palings × rail_count × 2
nails_front_with_wastage = ceil(nails_front_count × 1.05)
nails_front_rounded     = ceil(nails_front_with_wastage / 250) × 250

// Back layer (45mm × 1 per rail per paling)
nails_back_count        = back_palings × rail_count × 1
nails_back_with_wastage = ceil(nails_back_count × 1.05)
nails_back_rounded      = ceil(nails_back_with_wastage / 250) × 250

// Capping rail (1 piece per bay; 2 per 4800mm stock)
capping_pieces          = bay_count
capping_stock_lengths   = ceil(capping_pieces / 2)
```

## BOM Output

### Butted style — 6 lines

| # | Category   | Canonical Name                              | Qty Formula            | Unit   | Notes                          |
|---|------------|---------------------------------------------|------------------------|--------|--------------------------------|
| 1 | Posts      | `100x75 [Label] Post`                       | `post_count`           | ea     | `post_height_mm` total         |
| 2 | Rails      | `75x38 [Label] Rail 4800mm`                 | `rail_stock_lengths`   | length | 4800mm stock lengths           |
| 3 | Palings    | `100x16 Rough Sawn [Label] Paling`          | `palings_with_wastage` | ea     | +5% wastage                    |
| 4 | Concrete   | `Rapid Set Concrete 20kg`                   | `concrete_bags`        | bag    | 1.5 bags/post                  |
| 5 | Fasteners  | `57mm [Nail Type] Gal Nail`                 | `nails_rounded`        | ea     | Nearest 250-pack               |
| 6 | Fasteners  | `100mm Galvanised Batten Screw`             | `batten_screws`        | ea     | 2 per rail piece               |

### Lapped & capped style — 8 lines

| # | Category   | Canonical Name                              | Qty Formula              | Unit   | Notes                                |
|---|------------|---------------------------------------------|--------------------------|--------|--------------------------------------|
| 1 | Posts      | `100x75 [Label] Post`                       | `post_count`             | ea     | `post_height_mm` total               |
| 2 | Rails      | `75x38 [Label] Rail 4800mm`                 | `rail_stock_lengths`     | length | 4800mm stock lengths                 |
| 3 | Palings    | `100x16 Rough Sawn [Label] Paling`          | `palings_with_wastage`   | ea     | 15/m, ≈half back / half front        |
| 4 | Concrete   | `Rapid Set Concrete 20kg`                   | `concrete_bags`          | bag    | 1.5 bags/post                        |
| 5 | Fasteners  | `57mm [Nail Type] Gal Nail`                 | `nails_front_rounded`    | ea     | Front: 2/rail/paling, 250-pack       |
| 6 | Fasteners  | `45mm [Nail Type] Gal Nail`                 | `nails_back_rounded`     | ea     | Back: 1/rail/paling, 250-pack        |
| 7 | Fasteners  | `100mm Galvanised Batten Screw`             | `batten_screws`          | ea     | 2 per rail piece                     |
| 8 | Capping    | `75x50 [Label] Capping Rail 4800mm`         | `capping_stock_lengths`  | length | 1 per bay; 2 per 4800mm stock        |

**`[Label]`** = `Treated Pine` or `Hardwood` based on `timber_type`.
**`[Nail Type]`** = `Ring Shank` for treated_pine, `Smooth Shank` for hardwood (applies to both 57mm front and 45mm back).

## Validation Rules

- **Reject** if `fence_length_m <= 0` or missing
- **Reject** if `fence_height_mm` missing
- **Warn** (not reject) if `fence_height_mm` not in {1200, 1500, 1800, 2100, 2400} — auto rail count falls back
- **Reject** if `post_spacing_mm > 2400` or `<= 0`
- **Reject** if `timber_type` not in {treated_pine, hardwood}
- **Reject** if `paling_style` not in {`butted`, `lapped_capped`}
- **Reject** if `paling_gap_mm < 0`
- **Warn** if `paling_gap_mm > 0` AND `paling_style = lapped_capped` — gap is ignored in lapped mode (palings overlap)

## Worked Example

### Butted style

**Input:** 30m, 1800mm, treated pine, 2400mm spacing, 0mm gap, style=butted

```
length_mm            = 30000
post_count           = ceil(30000/2400) + 1 = 14
bay_count            = 13
rail_count           = 3 (auto from 1800mm)
rail_pieces          = 39
rail_stock_lengths   = ceil(39/2) = 20
paling_count         = ceil(30000/100) = 300
palings_with_wastage = ceil(315) = 315
concrete_bags        = ceil(21) = 21
nails_count          = 1800
nails_rounded        = 2000
batten_screws        = 78
post_height_mm       = 2400
```

**BOM:**

```
14  × 100x75 Treated Pine Post (2400mm)
20  × 75x38 Treated Pine Rail 4800mm
315 × 100x16 Rough Sawn Treated Pine Paling (1800mm)
21  × Rapid Set Concrete 20kg
2000 × 57mm Ring Shank Gal Nail
78  × 100mm Galvanised Batten Screw
```

### Lapped & capped style

**Input:** 30m, 1800mm, treated pine, 2400mm spacing, style=lapped_capped

```
length_mm                = 30000
post_count               = 14
bay_count                = 13
rail_count               = 3
rail_pieces              = 39
rail_stock_lengths       = 20
paling_count             = ceil(30 × 15) = 450
palings_with_wastage     = ceil(450 × 1.05) = 473
back_palings             = ceil(450/2) = 225
front_palings            = 450 - 225    = 225
nails_front_count        = 225 × 3 × 2  = 1350
nails_front_rounded      = 1500
nails_back_count         = 225 × 3 × 1  = 675
nails_back_rounded       = 750
concrete_bags            = 21
batten_screws            = 78
capping_pieces           = 13
capping_stock_lengths    = ceil(13/2)   = 7
post_height_mm           = 2400
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

## Style Variants

### Butted (default — implemented)

- `paling_gap_mm = 0`, palings/m = 10
- Single-layer construction
- 6-line BOM

### Lapped & capped (implemented)

- 15 palings/m total, split 50/50 across two layers (back gets the ceiling on odd totals)
- **Back layer:** 45mm nails (Ring Shank for treated pine / Smooth Shank for hardwood), 1 per rail per paling
- **Front layer:** 57mm nails (same shank rule), 2 per rail per paling
- **Capping rail** along top: 75x50 stock, 1 piece per bay, 2 pieces per 4800mm length
- `paling_gap_mm` is ignored in this style (palings overlap by design); a warning is emitted if set
- 8-line BOM

### Future variants (not implemented)

- **100x100 post upgrade**: constant declared, not selectable via inputs
- **100x38 rail upgrade**: constant declared, not selectable via inputs
- **Custom capping size**: currently hard-coded to 75x50 via `CAPPING_SIZE`; could expose as input

## Canonical Product Names

### Active (emitted in BOM)

**Butted style:**
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

### Reserved (upgrade options, not yet selectable)

```
100x100 Treated Pine Post
100x38 Treated Pine Rail 4800mm
```

### Canonical-name contract

These names are stable identifiers for the supplier-mapper. They will not change without a version bump. Sizing components (e.g. `100x75`, `75x50`, `57mm`) come first; descriptive type (`Ring Shank`, `Rough Sawn`) follows; timber label (`Treated Pine` / `Hardwood`) is always present; stock length (`4800mm`) appears for rail-like items sold by length.

## Supplier Mapping Interface

This calculator outputs **canonical product names**. To generate a supplier-specific BOM:

1. Run this calculator to get the canonical BOM
2. Apply a supplier-mapper that maps each `canonical_name` to:
   - Supplier product name
   - Supplier item code / SKU
   - Unit price
   - Pack size (if different from unit)
   - Availability flag

The canonical names are stable and will not change without a version bump.

### Mapping example
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
