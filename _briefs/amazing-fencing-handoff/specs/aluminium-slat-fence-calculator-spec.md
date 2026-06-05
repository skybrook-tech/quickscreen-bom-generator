# Aluminium Slat Fence — BOM Calculator Skill Spec

Draft specification for the aluminium-slat-fence-calculator skill. NEW archetype in the canonical-name-based Fence Calculator Skill Library, distinct from the legacy supplier-specific QSHS calculator. Horizontal slats between aluminium posts with parameterised slat size and gap. Includes input schema, constants, formulas, BOM output, validation rules, worked example, and supplier mapping interface.

## Overview

Calculates a canonical bill of materials for **horizontal-slat aluminium fences**. Slats span between vertical aluminium posts; slat-gap and slat-size are parameterised inputs.

**Status:** DRAFT. Pending Build Forge review of canonical names (item A4) and confirmation of whether this archetype absorbs Amazing's `Slat` + `Lifestyle slat` SKU sets (item B3).

**Skill name:** `aluminium-slat-fence-calculator`
**Script:** `calculator.py` (Python 3, no dependencies)
**Credentials:** None required (pure calculation)

### Relationship to the legacy QSHS calculator

The existing `QSHS Fence BOM Calculator (Glass Outlet)` skill belongs to the **legacy supplier-specific layer** — it emits Glass Outlet SKUs directly. This new skill operates at the **canonical layer** and is supplier-agnostic. Amazing's Slat and Lifestyle Slat SKUs map through this new calculator; the QSHS skill continues to serve the Glass Outlet integration directly.

When Build Forge confirms B3, the recommendation is: this archetype covers Amazing's slat range; the Quickscreen Gate System sits in a separate `aluminium-gate-calculator` archetype (TBD).

## Input Schema

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `fence_length_m` | number | — | Required, > 0 |
| `fence_height_mm` | number | — | Standard: 1200, 1500, 1800, 2100, 2400 |
| `slat_size_mm` | enum | 65 | 65 or 90 (face width) |
| `slat_gap_mm` | enum | 9 | 5, 9, or 20 (visual gap between slats) |
| `post_spacing_mm` | number | 2400 | Max bay width 2400 |
| `ground_clearance_mm` | number | 50 | Gap between ground and first (lowest) slat |
| `post_size_mm` | string | `65x65` | Standard 65×65 SHS aluminium |
| `colour` | string | `monument` | Monument, Black, Pearl White, Woodland Grey, etc. |
| `include_starter_rail` | boolean | false | Optional bottom rail for stability |

### Default product family

- **Slat profile:** rectangular box-section, 16mm thick face (typical for both 65mm and 90mm widths)
- **Post:** 65×65 SHS aluminium with channel-and-clip fixing on the inside face

## Constants

```
SLAT_THICKNESS_MM         = 16     (typical box-section depth)
POST_IN_GROUND_MM         = 600
POST_STOCK_LENGTHS_MM     = [1800, 2100, 2400, 2700, 3000, 3300]
SLAT_STOCK_LENGTHS_MM     = [2400, 2700, 3000, 3600, 4800, 6000]

SLAT_TUCK_OVERLAP_MM      = 50     (each end, tucked into post channel)

CONCRETE_BAGS_PER_POST    = 1.5
CONCRETE_BAG_SIZE_KG      = 20

SCREWS_PER_SLAT_PER_BAY   = 2      (1 each end into post channel)
SCREW_LEN_MM              = 25
SCREW_PACK_SIZE           = 100    (typical SS self-tapping pack)

# Wastage
WASTAGE_SLATS             = 0.05
WASTAGE_POSTS             = 0      (cut-to-length on site)
WASTAGE_SCREWS            = 0.10
WASTAGE_CONCRETE          = 0
```

## Derived Quantities (Formulas)

```
length_mm              = fence_length_m × 1000
post_count             = ceil(length_mm / post_spacing_mm) + 1
bay_count              = post_count - 1

post_total_length_mm   = fence_height_mm + 600
post_stock_length_mm   = next_post_stock_length(post_total_length_mm)

slat_pitch             = slat_size_mm + slat_gap_mm           // mm per slat row
usable_height_mm       = fence_height_mm - ground_clearance_mm
slats_per_height       = floor(usable_height_mm / slat_pitch)
total_slats            = bay_count × slats_per_height
slats_with_wastage     = ceil(total_slats × 1.05)

slat_run_length_mm     = post_spacing_mm + (2 × SLAT_TUCK_OVERLAP_MM)
slat_stock_length_mm   = next_slat_stock_length(slat_run_length_mm)

concrete_bags          = ceil(post_count × 1.5)
post_caps              = post_count
screws_count           = total_slats × 2
screws_with_wastage    = ceil(screws_count × 1.10)
screws_packs           = ceil(screws_with_wastage / 100)
screws_rounded         = screws_packs × 100

if include_starter_rail:
    starter_rail_pieces = bay_count
    starter_rail_stock  = next_slat_stock_length(slat_run_length_mm)
```

### `next_post_stock_length` / `next_slat_stock_length`

Return the smallest stock length ≥ requested mm from their respective `_STOCK_LENGTHS_MM` arrays. Reject if no stock length is large enough.

## BOM Output

### Standard BOM — 5 to 6 lines

| # | Category   | Canonical Name                                                       | Qty Formula             | Unit   | Notes                                  |
|---|------------|----------------------------------------------------------------------|-------------------------|--------|----------------------------------------|
| 1 | Posts      | `65x65 Aluminium Post {post_stock_length}mm {colour}`                | `post_count`            | ea     | Channelled inside face                  |
| 2 | Slats      | `{slat_size}x16 Aluminium Slat {slat_stock_length}mm {colour}`       | `slats_with_wastage`    | ea     | +5% wastage                             |
| 3 | Caps       | `65x65 Aluminium Post Cap {colour}`                                  | `post_caps`             | ea     | 1 per post                              |
| 4 | Concrete   | `Rapid Set Concrete 20kg`                                            | `concrete_bags`         | bag    | 1.5 bags/post                           |
| 5 | Fasteners  | `25mm Stainless Steel Self-Tapping Screw`                            | `screws_rounded`        | ea     | Rounded to 100-pack                      |
| 6 | Starter rail (opt) | `65x32 Aluminium Starter Rail {slat_stock_length}mm {colour}` | `starter_rail_pieces`   | length | Only if `include_starter_rail=true`     |

**`{slat_size}`** = `65` or `90` based on `slat_size_mm` input.
**`{colour}`** = canonical colour name (Monument, Black, Pearl White, etc.).

## Validation Rules

- **Reject** if `fence_length_m <= 0` or missing
- **Reject** if `fence_height_mm` missing or `<= 0`
- **Reject** if `post_spacing_mm > 2400` or `<= 0`
- **Reject** if `slat_size_mm` not in {65, 90}
- **Reject** if `slat_gap_mm` not in {5, 9, 20}
- **Reject** if `post_total_length_mm` exceeds maximum post stock length (3300mm)
- **Warn** if `slat_gap_mm = 5` AND `slat_size_mm = 90` — heavy slat with tight gap is heavy and flexes; recommend 65 slat for tight-gap looks
- **Warn** if `fence_height_mm > 2100` — slat fences > 2.1m typically need engineering certification
- **Pool barrier rejection (separate concern):** if used as a pool barrier, `slat_gap_mm > 9` violates AS1926.1-2012 (100mm gap max with non-climbable considerations). This calculator does NOT enforce pool compliance — passes through to a dedicated `pool-barrier-validator` skill.

## Worked Example

**Input:** 30m, 1800mm, 65mm slat, 9mm gap, 2400mm post spacing, 50mm ground clearance, Monument

```
length_mm              = 30000
post_count             = ceil(30000/2400) + 1 = 14
bay_count              = 13
post_total_length_mm   = 2400
post_stock_length_mm   = 2400
slat_pitch             = 74
usable_height_mm       = 1750
slats_per_height       = floor(1750/74) = 23
total_slats            = 13 × 23 = 299
slats_with_wastage     = ceil(299 × 1.05) = 314
slat_run_length_mm     = 2400 + 100 = 2500
slat_stock_length_mm   = 2700  (next stock ≥ 2500)
concrete_bags          = ceil(21) = 21
post_caps              = 14
screws_count           = 299 × 2 = 598
screws_with_wastage    = ceil(657.8) = 658
screws_packs           = ceil(658/100) = 7
screws_rounded         = 700
```

**BOM:**

```
14  × 65x65 Aluminium Post 2400mm Monument
314 × 65x16 Aluminium Slat 2700mm Monument
14  × 65x65 Aluminium Post Cap Monument
21  × Rapid Set Concrete 20kg
700 × 25mm Stainless Steel Self-Tapping Screw
```

## Style Variants

### Horizontal slat (default — this spec)

- Slats span between vertical posts
- Slat pitch = slat size + gap (vertical metric)
- `slats_per_height` is the row count

### Future variants (not in v1)

- **Vertical slat** — slats span from top rail to bottom rail; post spacing becomes rail length; `slats_per_bay = floor(post_spacing / slat_pitch)`
- **Variable-gap (privacy gradient)** — graduated gaps top-to-bottom; requires array input for per-row gap
- **Mixed-size slats** — alternating 65 and 90; aesthetic variant
- **Gate variant** — would split into a separate `aluminium-gate-calculator` archetype (different BOM with gate frame + hinges + latch)

Quickscreen Gate System (20 SKUs in Amazing's price book) belongs in the gate archetype, NOT this slat archetype.

## Canonical Product Names

### Active (emitted in BOM)

```
65x65 Aluminium Post {length}mm {colour}
65x16 Aluminium Slat {length}mm {colour}
90x16 Aluminium Slat {length}mm {colour}
65x65 Aluminium Post Cap {colour}
65x32 Aluminium Starter Rail {length}mm {colour}
Rapid Set Concrete 20kg
25mm Stainless Steel Self-Tapping Screw
```

### Naming convention

```
{SIZE} Aluminium {COMPONENT} {LENGTH if length-sold} {COLOUR}
```

- **`Aluminium` is the material label** — always present, mirroring `Treated Pine` / `Hardwood` / `Colorbond` in other archetypes.
- **Colour is part of the canonical name**, not a variant attribute — single-field supplier-mapper lookup, consistent with Colorbond and Composite archetypes.
- **Length appears only for length-sold items** (posts, slats, starter rail). Caps and fasteners are per-piece.

### Canonical-name contract

These names are stable identifiers for the supplier-mapper. **No renames without a version bump.** Adding new sizes (e.g. a future 50mm slat) or new colours is non-breaking. Adding a new material variant (e.g. `Aluminium Composite Slat`) would be a new canonical entry, not a rename.

## Supplier Mapping Interface

Standard pattern: calculator outputs canonical names, supplier-mapper resolves to supplier-specific records.

```json
{
  "canonical_name": "65x16 Aluminium Slat 2700mm Monument",
  "supplier_name": "Amazing Slat 65×16 2.7m Monument",
  "supplier_sku": "AMZ-SL-6516-2700-MON",
  "unit_price": 18.20,
  "pack_size": 1,
  "available": true
}
```

### Supplier coverage notes

- Amazing Fencing (Cin7 export, May 2026) — `Slat` (10 SKUs) and `Lifestyle slat` (10 SKUs) sub-systems map through this archetype, **conditional on Build Forge confirming B3**.
- Glass Outlet (legacy) — QSHS / VS / XPL / BAYG continue via the legacy supplier-specific calculator; canonical migration is a separate workstream.
- Stratco, Oxworks, Bunnings (ProtectorAl) — known stockists of horizontal-slat aluminium ranges; mapping work pending.
