# Composite Retaining Wall (Post & Sleeper) — BOM Calculator Skill Spec

Draft specification for the composite-retaining-wall-calculator skill. NEW archetype in the Fence Calculator Skill Library — distinct from infill fence systems. Covers SuperPost and TUFFPOLY product lines. Includes input schema, constants, formulas, BOM output, validation rules, worked example, and supplier mapping interface.

## Overview

Calculates a canonical bill of materials for **composite (recycled-plastic / fibreglass-reinforced) post-and-sleeper retaining walls** in Australia. This is a **distinct archetype** from infill fence systems — the wall holds back earth using horizontal sleepers slotted between vertical posts.

**Status:** DRAFT. Pending Build Forge review of canonical names (item A3) and Amazing/Cin7 product range cross-check.

**Skill name:** `composite-retaining-wall-calculator`
**Script:** `calculator.py` (Python 3, no dependencies)
**Credentials:** None required (pure calculation)

### Supported product lines

| Line       | Components                                       | Notes                       |
|------------|--------------------------------------------------|-----------------------------|
| SuperPost  | C-Post, H-Post, Sleeper, Plinth, Cap, Bracket    | Slotted-post system          |
| TUFFPOLY   | C-Post, H-Post, Sleeper, Plinth, Cap, Bracket    | Slotted-post system          |

### Why a new archetype

Different geometry from infill fences: vertical loads (earth pressure) drive deeper footings and tighter post spacing; sleepers carry shear into post slots; plinth + cap are core, not optional aesthetic. BOM kernel must size posts and concrete based on **wall height**, not just fence height.

## Input Schema

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `wall_length_m` | number | — | Required, > 0 |
| `wall_height_mm` | number | — | Standard: 300, 600, 900, 1200, 1500, 1800 |
| `product_line` | enum | `superpost` | `superpost` or `tuffpoly` |
| `post_spacing_mm` | number | 2400 | Max bay width 2400; tighter for walls > 1000mm |
| `sleeper_height_mm` | number | 200 | Standard sleeper height; rare 150/250 variants |
| `colour` | string | `charcoal` | Per supplier colour catalogue |
| `include_plinth` | boolean | true | Ground-level plinth (recommended; spreads load) |
| `include_brackets` | boolean | true | End/corner brackets at terminations |
| `corner_count` | number | 0 | Number of right-angle corners (each gets an H-Post + extra bracket pair) |

### Default post split

- 2 H-Posts at wall ends (terminations)
- `corner_count` × H-Posts at corners
- Remaining posts are C-Posts (intermediates)

## Constants

```
SLEEPER_THICKNESS_MM      = 75    (typical both lines)
SLEEPER_LENGTH_MM         = 2400  (standard stock)
POST_THICKNESS_MM         = 100
POST_FACE_MM              = 75    (for C-Post; H-Post is 75x100 deeper)
POST_SLOT_DEPTH_MM        = 50    (sleeper sits 50mm into each post slot)
POST_IN_GROUND_RATIO      = 0.5   (50% of wall height in ground)
POST_IN_GROUND_MIN_MM     = 600
POST_STOCK_LENGTHS_MM     = [1500, 1800, 2100, 2400, 2700, 3000]

CONCRETE_BAGS_PER_POST    = 2     (retaining-grade — DOUBLE fence-grade)
CONCRETE_BAG_SIZE_KG      = 20

# Wastage
WASTAGE_SLEEPERS          = 0.05  (+5% then round up to whole sleepers)
WASTAGE_POSTS             = 0     (cut to length on site / ordered exact)
WASTAGE_CONCRETE          = 0
```

### Key difference vs fence-grade footings

Retaining walls receive lateral earth load; concrete spec is DOUBLE the fence-grade 1.5 bags/post. This is a structural assumption — engineering certification overrides for walls > 1000mm.

## Derived Quantities (Formulas)

```
length_mm              = wall_length_m × 1000
post_count             = ceil(length_mm / post_spacing_mm) + 1
bay_count              = post_count - 1

sleepers_per_bay       = ceil(wall_height_mm / sleeper_height_mm)
total_sleepers         = bay_count × sleepers_per_bay
sleepers_with_wastage  = ceil(total_sleepers × 1.05)

post_in_ground_mm      = max(wall_height_mm × 0.5, 600)
post_total_length_mm   = wall_height_mm + post_in_ground_mm
post_stock_length_mm   = next_post_stock_length(post_total_length_mm)

h_post_count           = 2 + corner_count
c_post_count           = post_count - h_post_count

concrete_bags          = post_count × 2
post_caps              = post_count

if include_plinth:
    plinth_pieces      = bay_count

if include_brackets:
    bracket_pairs      = 2 + corner_count   (one pair per H-Post)
```

### `next_post_stock_length`

Returns the smallest stock length ≥ `post_total_length_mm` from `POST_STOCK_LENGTHS_MM`. If `post_total_length_mm` exceeds 3000mm, **reject** with engineering-required warning.

## BOM Output

### Standard BOM — 6 to 8 lines depending on toggles

| # | Category    | Canonical Name                                                  | Qty Formula              | Unit   | Notes                          |
|---|-------------|-----------------------------------------------------------------|--------------------------|--------|--------------------------------|
| 1 | Posts       | `75x100 [ProductLine] C-Post {post_stock_length}mm {colour}`    | `c_post_count`           | ea     | Intermediates                  |
| 2 | Posts       | `75x100 [ProductLine] H-Post {post_stock_length}mm {colour}`    | `h_post_count`           | ea     | Ends + corners                 |
| 3 | Sleepers    | `200x75 [ProductLine] Sleeper 2400mm {colour}`                  | `sleepers_with_wastage`  | ea     | +5% wastage, whole sleepers    |
| 4 | Caps        | `[ProductLine] Post Cap {colour}`                               | `post_caps`              | ea     | 1 per post                     |
| 5 | Concrete    | `Rapid Set Concrete 20kg`                                       | `concrete_bags`          | bag    | 2 bags/post (retaining grade)  |
| 6 | Plinth      | `200x75 [ProductLine] Plinth Board 2400mm {colour}`             | `plinth_pieces`          | ea     | Only if `include_plinth=true`   |
| 7 | Brackets    | `[ProductLine] End Bracket {colour}`                            | `bracket_pairs × 2`      | ea     | Only if `include_brackets=true` |

**`[ProductLine]`** = `SuperPost` or `TUFFPOLY` (case-sensitive in canonical name).

## Validation Rules

- **Reject** if `wall_length_m <= 0` or missing
- **Reject** if `wall_height_mm` missing or `<= 0`
- **Reject** if `wall_height_mm > 1800` — requires structural engineer sign-off; calculator does not size members above this height
- **Reject** if `post_spacing_mm > 2400` or `<= 0`
- **Reject** if `product_line` not in {`superpost`, `tuffpoly`}
- **Reject** if `sleeper_height_mm` not in {150, 200, 250}
- **Warn** if `wall_height_mm > 1000` AND `post_spacing_mm > 2100` — recommended max bay narrows above 1m
- **Warn** if `wall_height_mm` not a clean multiple of `sleeper_height_mm` — sleeper count rounds up (visible courses may exceed wall height slightly; trim or accept)
- **Warn** if `corner_count > 0` AND user has not added linear metres for each return — gentle reminder that corners are extra geometry

## Worked Example

**Input:** 20m wall, 600mm height, SuperPost, charcoal, 2400mm spacing, include plinth + brackets, 0 corners

```
length_mm             = 20000
post_count            = ceil(20000/2400) + 1 = 10
bay_count             = 9
sleepers_per_bay      = ceil(600/200) = 3
total_sleepers        = 27
sleepers_with_wastage = ceil(27 × 1.05) = 29
post_in_ground_mm     = max(300, 600) = 600
post_total_length_mm  = 1200
post_stock_length_mm  = 1500  (next stock ≥ 1200)
h_post_count          = 2
c_post_count          = 8
concrete_bags         = 20
post_caps             = 10
plinth_pieces         = 9
bracket_pairs         = 2
```

**BOM:**

```
 8  × 75x100 SuperPost C-Post 1500mm Charcoal
 2  × 75x100 SuperPost H-Post 1500mm Charcoal
29  × 200x75 SuperPost Sleeper 2400mm Charcoal
10  × SuperPost Post Cap Charcoal
20  × Rapid Set Concrete 20kg
 9  × 200x75 SuperPost Plinth Board 2400mm Charcoal
 4  × SuperPost End Bracket Charcoal
```

*(Replace SuperPost with TUFFPOLY for the TUFFPOLY product line — identical math.)*

## Style Variants

### Single straight wall (default — covered above)
- One product line, uniform height, optional plinth + brackets

### With corners (covered via `corner_count` input)
- Each corner = one H-Post + one bracket pair
- Calculator does NOT validate corner geometry — user must enter total linear metres including each return

### Future variants (not in v1)

- **Stepped walls** — wall height changes along run (would need an array input)
- **Curved walls** — segments at angles; chord length approximation
- **Double-skin** — sleepers on both sides for screening walls (not retaining)
- **Bench / seat top** — extended cap as seating; structural override

## Canonical Product Names

### Active (emitted in BOM)

```
75x100 SuperPost C-Post {length}mm {colour}
75x100 SuperPost H-Post {length}mm {colour}
200x75 SuperPost Sleeper 2400mm {colour}
200x75 SuperPost Plinth Board 2400mm {colour}
SuperPost Post Cap {colour}
SuperPost End Bracket {colour}

75x100 TUFFPOLY C-Post {length}mm {colour}
75x100 TUFFPOLY H-Post {length}mm {colour}
200x75 TUFFPOLY Sleeper 2400mm {colour}
200x75 TUFFPOLY Plinth Board 2400mm {colour}
TUFFPOLY Post Cap {colour}
TUFFPOLY End Bracket {colour}

Rapid Set Concrete 20kg
```

### Naming convention

```
{SIZE} {PRODUCT_LINE} {COMPONENT} {LENGTH if length-sold} {COLOUR}
```

- **Composite material is implicit** in the product-line designation — SuperPost and TUFFPOLY are composite-only brands; adding the word "Composite" would be redundant.
- **Colour is part of the canonical name** (not a variant attribute) — keeps supplier-mapper lookup single-field, matching the Colorbond and aluminium conventions.
- **`{length}mm` only appears for length-sold items** (posts, sleepers, plinth boards). Caps and brackets are sold per piece.

### Canonical-name contract

These names are stable identifiers for the supplier-mapper. **No renames without a version bump.** Adding new product-line entries (e.g. a third composite brand) is allowed; renaming SuperPost or TUFFPOLY components would be a breaking change.

## Supplier Mapping Interface

Standard pattern: calculator outputs canonical names, supplier-mapper resolves them to:

```json
{
  "canonical_name": "75x100 SuperPost C-Post 1500mm Charcoal",
  "supplier_name": "SuperPost C-Channel Composite Post 75x100 1.5m Charcoal",
  "supplier_sku": "SP-CP-75100-1500-CHA",
  "unit_price": 89.50,
  "pack_size": 1,
  "available": true
}
```

### Supplier coverage notes

- Amazing Fencing (Cin7 export, May 2026) stocks both SuperPost and TUFFPOLY lines — 41 SKUs split across the two product lines.
- The Composite Retaining archetype is a NEW addition to the Anyfence platform; supplier coverage outside Amazing is unmapped at draft time.
- Engineering certification for walls > 1000mm is the supplier or installer's responsibility — calculator only sizes BOM, not structural adequacy.
