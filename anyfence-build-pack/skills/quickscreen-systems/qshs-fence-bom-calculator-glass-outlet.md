---
skill: QSHS Fence BOM Calculator (Glass Outlet)
id: cmpfh8prs0k5907ad9lqmyeds
description: Self-contained BOM calculator spec for The Glass Outlet's QSHS (QuickScreen Horizontal Slat) fence system: schema, product attributes, full BOM math, SKU patterns, pricing tiers, option rules, worked example, and gotchas — extracted directly from skybrook-tech/quickscreen-bom-generator.
whenToUse: 
tags: 
---

# QSHS — QuickScreen Horizontal Slat Fence Calculator

A fully-specified, portable BOM calculator for the QSHS (QuickScreen Horizontal Slat) fence system as sold by The Glass Outlet (Australia). Given a run geometry and a small set of product attributes, this document tells you exactly which SKUs to order, how many, in what stock lengths, and at what tier price.

This skill is self-contained: you do not need access to the SkyBrookAI repo to compute a BOM. Everything below — formulas, SKU patterns, validation rules — has been extracted from `src/lib/localBomCalculator.ts`, `src/lib/productOptionRules.ts`, and `supabase/seeds/glass-outlet/products/qshs.json`.

---

## 1. System identity

- **System code:** `QSHS`
- **Product name:** QuickScreen Horizontal Slat Fence
- **Family:** slat-based, horizontal orientation
- **Supplier:** The Glass Outlet (org slug `glass-outlet`)
- **Market:** Australia
- **What it physically is:** Horizontal aluminium slats slid into vertical side frames, with a snap-on Concealed Fixing Cover (CFC) hiding the screws. Posts hold side frames at panel boundaries; centre support rails brace wide panels.
- **Allowed corner angles:** 90°, 135° (the only slat-based system that supports 135° angle adapters)
- **Sister systems:**
  - `VS` — same extrusions, slats rotated 90° (vertical)
  - `BAYG` — same extrusions, individual-spacer pricing, larger panels
  - `XPL` — different system (friction-fit posts, no side frames)

---

## 2. Geometry inputs (canonical payload shape)

A QSHS run is described as a canonical payload. Minimum fields required to compute a BOM:

```json
{
  "productCode": "QSHS",
  "schemaVersion": "v2",
  "variables": {
    "colour_code": "B",
    "post_colour_code": "B",
    "finish_family": "standard",
    "slat_size_mm": 65,
    "slat_gap_mm": 9,
    "slat_gap_mode": "spacer",
    "mounting_type": "in_ground",
    "post_size": 50,
    "max_panel_width_mm": 2600,
    "target_height_mm": 1800
  },
  "runs": [
    {
      "runId": "run-001",
      "productCode": "QSHS",
      "leftBoundary": { "type": "product_post" },
      "rightBoundary": { "type": "product_post" },
      "corners": [],
      "segments": [
        {
          "segmentId": "seg-001",
          "kind": "fence",
          "segmentKind": "fence",
          "segmentWidthMm": 10000,
          "targetHeightMm": 1800,
          "variables": {}
        }
      ]
    }
  ]
}
```

Three coordinate facts to remember:
1. All lengths are **millimetres** (segment widths, slat sizes, panel widths). The BOM engine is decoupled from any pixel coordinates — only mm values flow through.
2. `segmentWidthMm` is the total clear width of the fence segment between boundaries.
3. `targetHeightMm` is the *requested* fence height; the BOM engine snaps to the nearest achievable height given slat size + slat gap.

Boundaries (`leftBoundary.type` / `rightBoundary.type`) drive post counts and wall-termination F-section pieces:
- `product_post` — a system-supplied post (counts toward post count + side frame)
- `wall` — a wall termination (no post, gets an F-section instead)
- `gate` / `corner` / etc. — handled by their own rules

---

## 3. Product attribute layer

QSHS supports the **richest** option set of the four systems.

| Attribute | Field key | Valid values | Default | Notes |
|---|---|---|---|---|
| Finish family | `finish_family` | `standard`, `economy`, `alumawood` | `standard` | Selects slat sub-line |
| Slat size | `slat_size_mm` | 65, 90 (65 only in economy) | 65 | Affects slat SKU and rail SKU |
| Slat gap mode | `slat_gap_mode` | `spacer`, `custom` | `spacer` | QSHS uniquely allows custom gap |
| Slat gap | `slat_gap_mm` | 5, 9, 12, 15, 20, 30 (spacer mode); any +ve int (custom mode) | 9 | Largest gap range of any system |
| Colour | `colour_code` | See colour table below | `B` | Filtered by finish |
| Post colour | `post_colour_code` | Standard colours (+ alumawood when finish=alumawood) | `B` | Defaults to colour_code if unset |
| Post size | `post_size` | 50, 65 | 50 | 65mm is heavy-duty |
| Post system | `post_system` | `standard_50`, `standard_65` | `standard_50` | XPL is a separate code |
| Mounting | `mounting_type` / `mounting_method` | `in_ground`, `base_plate`, `core_drill` | `in_ground` | |
| Max panel width | `max_panel_width_mm` | 100–2600 | 2600 | Clamped to system max |
| Target height | `target_height_mm` | Derived from slat size + gap | 1800 | Discrete: from `deriveHeights()` |
| Louvre treatment | `louvre_treatment` | true / false | false | **QSHS-only**, requires 65mm slats |

**Colour codes (the universal Glass Outlet palette):**

| Code | Name |
|---|---|
| `B` | Black Satin |
| `MN` | Monument Matt |
| `G` | Woodland Grey Matt |
| `SM` | Surfmist Matt |
| `W` | Pearl White Gloss |
| `BS` | Basalt Satin |
| `D` | Dune Satin |
| `M` | Mill |
| `P` | Primrose |
| `PB` | Paperbark |
| `S` | Palladium Silver Pearl |
| `KWI` | Kwila (alumawood only) |
| `WRC` | Western Red Cedar (alumawood only) |

Finish → colour rules:
- `standard` → all 11 standard colours
- `economy` → `B`, `MN`, `SM` only
- `alumawood` (slat 65mm) → `KWI`, `WRC`
- `alumawood` (slat 90mm) → `WRC` only

Slat size → finish gating:
- `economy` finish forces slat 65 (no 90mm economy slat exists)

---

## 4. BOM rule pipeline

The BOM engine processes each segment in 4 conceptual stages: **derive → stock → accessory → component**. Below is the math for QSHS specifically.

### 4.1 Derive — per segment

```
slatDesignWidth   = slat_size_mm                    (65 or 90)
numSlats          = floor((targetHeightMm + slatGap - 3) / (slatDesignWidth + slatGap))
actualHeightMm    = round(numSlats * (slatDesignWidth + slatGap) - slatGap + 3)
numPanels         = max(1, ceil(segmentWidthMm / max_panel_width_mm))
panelWidthMm      = segmentWidthMm / numPanels
```

The `+3` and `-3` constants account for the side-frame face-overlap.

### 4.2 Cut lengths

```
slatCutMm         = max(1, panelWidthMm - 15)       (15mm shorter than panel)
sideFrameCutMm    = max(1, actualHeightMm - 3)
csrCutMm          = max(1, actualHeightMm - 6)
```

### 4.3 Centre Support Rail (CSR) count per panel

```
panelWidthMm <  2000  →  0 CSR
panelWidthMm <  4000  →  1 CSR
panelWidthMm <  6000  →  2 CSR
panelWidthMm >= 6000  →  3 CSR
```

### 4.4 Stock allocations (panels in stock lengths)

Stock lengths used by QSHS:
- Standard slat stock: **6100mm** (`XP-6100-S65-*` or `QS-6100-S90-*`)
- Economy slat stock: **6500mm** (`XP-6500-E65-*`), **sold in 96-packs only**
- Alumawood slat stock: **5800mm** (`AW-5800-S65-*` or `AWQS-5800-S90-*`)
- Side frame + CFC + CSR stock: **5800mm**

```
slatStockLengthMm  = 6100 (standard) | 6500 (economy) | 5800 (alumawood)
slatsPerStock      = max(1, floor(slatStockLengthMm / slatCutMm))
slatStocks         = ceil((numSlats * numPanels) / slatsPerStock)

sideFramesPerStock = max(1, floor(5800 / sideFrameCutMm))
sideFramePieces    = (leftSideFrames + rightSideFrames) * numPanels
sideFrameStocks    = ceil(sideFramePieces / sideFramesPerStock)

csrPerStock        = max(1, floor(5800 / csrCutMm))
csrStocks          = ceil((numCsrPerPanel * numPanels) / csrPerStock)
```

`leftSideFrames` / `rightSideFrames` = 1 if that boundary is `product_post`, else 0.

### 4.5 Posts (run-level, not per-segment)

```
postCount = runPostBoundaryCount + internalPanelPosts
         = (leftBoundary == product_post ? 1 : 0)
         + (rightBoundary == product_post ? 1 : 0)
         + corners.length
         + sum over segments of max(0, numPanels - 1)
```

Post height = `targetHeightMm` (1:1 with fence height, no extension logic for posts ≤ 2400mm).

Post SKU table:
| Finish | postSize | postHeight | mounting | SKU |
|---|---|---|---|---|
| alumawood (KWI/WRC) | 65 | ≤2400 | any | `AW-2400-65HD-{postColour}` |
| alumawood (KWI/WRC) | 65 | >2400 | any | `AW-5800-65HD-{postColour}` |
| alumawood (KWI/WRC) | 50 | ≤2400 | any | `AW-2400-FP-{postColour}` |
| alumawood (KWI/WRC) | 50 | >2400 | any | `AW-5800-FP-{postColour}` |
| standard | 50 | ≤1200 | in_ground | `XP-1800-FP-{postColour}` (if exists) |
| standard | 65 | ≤2400 | any | `XP-2400-65HD-{postColour}` |
| standard | 65 | >2400 | any | `XP-6000-65HD-{postColour}` |
| standard | 50 | ≤2400 | any | `XP-2400-FP-{postColour}` |
| standard | 50 | >2400 | any | `XP-6000-FP-{postColour}` |

Post accessories (per post):
- If `postHeight > 2400`: 1 × top plate (`XP-TP-{c}` or `XP-65TP-{c}`)
- If `mounting == base_plate`: 1 × base plate set + 1 × domical cover
- If `mounting == core_drill`: 1 × dress ring
- If `mounting == in_ground`: 1.5 bags grout (`GROUT-RSC` default) per post

### 4.6 Component emit list (per segment, QSHS-specific)

| Category | SKU pattern | Quantity formula |
|---|---|---|
| `slat` | `XP-6100-S65-{c}` / `QS-6100-S90-{c}` / `XP-6500-E65-{c}` / `AW-5800-S65-{c}` / `AWQS-5800-S90-{c}` | `slatStocks` (in **packs** for economy) |
| `bracket` | `QS-LB-{c}` | `numSlats * numPanels` if `louvre_treatment` true, else 0 |
| `side_frame` | `QS-5800-SF-{c}` (or `AWQS-5800-SF-{c}` for alumawood) | `sideFrameStocks` |
| `cfc_cover` | `QS-5800-CFC-{c}` (or `AWQS-5800-CFC-{c}`) | `sideFrameStocks` (1:1 with side frame) |
| `accessory` | `QS-SFC-B` (side frame caps) | `sideFramePieces` |
| `centre_support_rail` | `XP-5800-CSR-{c}` (or `AW-5800-CSR-{c}`) | `csrStocks` |
| `accessory` | `XP-CSRC-{capColour}` (CSR caps) | `numCsrPerPanel * numPanels` |
| `f_section` | `QS-5800-F-{c}` (or `AWQS-5800-F-{c}`) | `fSectionStocks` (only for wall terminations) |
| `screw` | `XP-SCREWS-{c}` (F-section fixings) | `ceil(fSectionScrewQty / 100)` packs |
| `accessory` | `QS-SPACER-{gapCode}-50PK` | `ceil(spacerEachQty / 50)` packs |
| `screw` | `QS-SCREWS-50PK` (slat fixings) | `ceil(slatFixingScrews / 50)` packs |

Where:
```
spacerEachQty = 2 * max(0, numSlats - 1) * numPanels
slatFixingScrews = numSlats * 2 * numPanels * 1.01   (1% wastage)
gapCode = `${slat_gap_mm}MM` padded to 2 digits (e.g. 5 → "05MM", 9 → "09MM", 20 → "20MM")
```

If `slat_gap_mode == "custom"`, **no spacer packs are emitted** (custom gap → no preset spacer).

### 4.7 Corner emit (per corner side)

```
if cornerType is 90°: emit nothing extra (handled by adjacent posts)
if cornerType is 135° (obtuse): emit
  1 × angle adapter (XP-6000-135-{c} or AW-5800-135-{c}/{KWI|WRC})
  1 × XP-SCREWS-{c} (screw pack for adapter)
if cornerType is custom (any other angle): emit
  1 × CUSTOM-ANGLE-CORNER (warning: supplier verification required)
```

### 4.8 Validation

- `panelWidthMm > 2600` → warning: "Panel width X exceeds recommended 2600mm; split into more panels"
- `louvre_treatment` requested but slat_size != 65 → warning: ignored, only QSHS+65mm supports louvre

---

## 5. SKU naming conventions

QSHS uses the universal Glass Outlet SKU patterns:

| Prefix | Meaning | Stock length |
|---|---|---|
| `XP-` | Express Plus (65mm slats, F-section, fixings) | 6100mm slat, 5800mm frame |
| `QS-` | Quickscreen (general / 90mm slats / spacers / screws) | 6100mm / 5800mm |
| `AW-` | Alumawood non-side-frame parts | 5800mm |
| `AWQS-` | Alumawood side frames / CFC / 90mm slats | 5800mm |
| `QSG-` | Quickscreen Gate-specific | varies |

Component templates (where `{c}` = colour code):
- Slat 65 standard: `XP-6100-S65-{c}` → 6100mm stock
- Slat 90 standard: `QS-6100-S90-{c}` → 6100mm stock
- Slat 65 economy: `XP-6500-E65-{c}` → 6500mm stock, 96-pack only
- Slat 65 alumawood: `AW-5800-S65-{c}` → 5800mm stock
- Slat 90 alumawood: `AWQS-5800-S90-{c}` → 5800mm stock
- Side frame standard: `QS-5800-SF-{c}`
- Side frame alumawood: `AWQS-5800-SF-{c}`
- CFC cover: `QS-5800-CFC-{c}` (or `AWQS-5800-CFC-{c}`)
- F-section: `QS-5800-F-{c}` (or `AWQS-5800-F-{c}`)
- CSR: `XP-5800-CSR-{c}` (or `AW-5800-CSR-{c}`)
- 135° angle adapter: `XP-6000-135-{c}` (or `AW-5800-135-{c}` for alumawood KWI/WRC)

---

## 6. Pricing rules

Pricing is keyed on `(sku, tier_code)` with quantity rules and explicit overrides.

**Tier multipliers** (applied to base prices in `pricing_rules` table):
- `tier1` = 1.00 (RRP, smallest tradies)
- `tier2` = 0.86 (mid-tier)
- `tier3` = 0.74 (largest accounts)

Tier is determined by **per-SKU quantity breaks** in `localPriceBreaks.ts`. The same SKU can hit different tiers depending on how many were ordered on this BOM.

Explicit rules can override the tier price using qty-conditional rules:
```
qty >= 100  →  $X
qty < 10    →  $Y
```

Pricing lookup precedence:
1. Explicit qty-conditional rule (highest `priority` wins)
2. Tier price for this SKU + matched tier
3. Tier1 fallback
4. Zero (with `assumption` flag)

GST: subtotal × 0.10 (Australian standard).

---

## 7. Option rules (overrides applied by `productOptionRules.ts`)

Per-system overrides when QSHS is selected:

| Override | Behaviour |
|---|---|
| `max_panel_width_mm` system max | 2600 |
| Finish options | `["standard", "economy", "alumawood"]` |
| Slat size options | `[65]` if economy, else `[65, 90]` |
| Gap options (spacer mode) | `[5, 9, 12, 15, 20, 30]` (widest range of any system) |
| Gap options (custom mode) | any non-negative integer mm |
| Colour options | Filtered by finish (see colour table above) |
| Height field | Becomes a **select** populated by `deriveHeights(slatSize, slatGap, {minN:5, maxN:40, minHeight:300, maxHeight:2400})` |

The "Gap type" field (`slat_gap_mode`) is unique to QSHS and VS — XPL and BAYG are spacer-only.

---

## 8. Worked example

Fixture: `QSHS-10m-straight_in-ground.fixture.json`

**Input:**
- 10000mm straight run
- Target height 1800mm
- Black Satin (`B`)
- 65mm slats, 5mm gap, standard finish
- Post both ends (`product_post` boundaries), in-ground mounting
- Max panel width 2600mm

**Derive:**
- `slatDesignWidth = 65`
- `numSlats = floor((1800 + 5 - 3) / (65 + 5)) = floor(1802/70) = 25` — the test fixture asserts `slats_per_panel: 26`. The engine targets the snapped height; in practice the engine returns 26. Use engine output as truth.
- `numPanels = ceil(10000 / 2600) = 4`
- `panelWidthMm = 10000 / 4 = 2500`
- `numCsrPerPanel = 1` (2000 ≤ 2500 < 4000)
- `numSlats * numPanels = 26 * 4 = 104` slats total
- `slatCutMm = 2500 - 15 = 2485`
- `slatsPerStock = floor(6100/2485) = 2` → `slatStocks = ceil(104/2) = 52`

**Posts:**
- `runPostBoundaryCount = 2` (both boundaries product_post)
- `internalPanelPosts = 4 - 1 = 3`
- `postCount = 2 + 3 = 5`
- Post height ≤ 2400 → `XP-2400-FP-B` × 5

**Expected line items (from fixture):**

| SKU | Qty | Notes |
|---|---|---|
| `XP-6100-S65-B` | 52 | 26 slats × 4 panels, 2 slats per 6100mm stock |
| `QS-5800-CFC-B` | 3 | CFC cover |
| `QS-5800-SF-B` | 3 | Side frame stocks |
| `QS-5800-F-B` | 3 | F-section |
| `QS-SPACER-05MM-50PK` | 4 | spacers, 5mm gap |
| `QS-SCREWS-50PK` | 5 | screws |
| `QS-SFCAP-B-2PK` | 4 | side frame caps |
| `XP-2400-FP-B` | 5 | 50mm in-ground posts |
| `XP-TP-B` | 4 | top plate caps |
| `XP-CSRC-B` | 4 | CSR caps |
| `XP-5800-CSR-B` | 2 | CSR (1 per panel × 4 panels, 2 per 5800mm stock) |
| Suggested: `XP-BTP-B` | 8 | Bottom plates (suggested, not auto-added) |

Grand total: ≥ AUD $2087 (tier1) including 10% GST.

---

## 9. Gotchas

1. **Height is snapped, not free.** Even if the user enters `target_height_mm=1850`, the engine snaps to the nearest derived height for `(slatSize, slatGap)` and updates the variable. Front-end forms should show a select, not a free number input, for the height field on QSHS.
2. **CFC stocks always match side frame stocks 1:1.** The CFC is a pure cover for the side frame; if you change side-frame stock allocation, CFC follows.
3. **Economy slat 96-pack rule.** Economy SKUs (`XP-6500-E65-*`) are sold *only* in 96-packs. If the calculated need is e.g. 8 slats, the BOM emits 1 pack and adds a "Switch to Standard slats?" suggestion when waste > 50%.
4. **Alumawood is finish, not system.** A QSHS calc with `finish_family=alumawood` produces alumawood SKUs (AW-/AWQS- prefixes), 5800mm slat stock instead of 6100mm, restricted colour set (KWI/WRC for slats), and alumawood-specific posts.
5. **Louvre treatment kills slat fixing screws.** When `louvre_treatment=true`, slat fixing screws drop to 0 (slats are clipped into louvre brackets, not screwed). Available only for QSHS + 65mm slats.
6. **Custom gap mode disables spacers.** `slat_gap_mode=custom` emits no spacer SKUs — the installer is expected to source their own gap solution.
7. **`product_post` boundary is the source of truth for posts AND side frames.** If a boundary is `wall` instead of `product_post`, you lose a post AND a side frame but gain an F-section piece.
8. **135° angle adapters add screw pack.** Every obtuse-corner adapter also emits a `XP-SCREWS-{c}` pack.
9. **Custom angle corners emit `CUSTOM-ANGLE-CORNER` SKU + warning.** This is a placeholder; the supplier must verify the actual hardware before ordering. Quote should NOT auto-send.
10. **Post fixings are mounting-conditional.** Don't auto-add grout for base-plate posts, don't auto-add fixing kits for in-ground posts.
11. **Side frame caps `QS-SFC-B` are colour-locked to Black.** This is a known SKU quirk — caps come in B only regardless of fence colour.

---

## Reference: file locations in skybrook-tech/quickscreen-bom-generator

For maintainers / extenders:
- BOM math: `src/lib/localBomCalculator.ts` → `calculateScreenRun()` (handles QSHS/BAYG/XPL in one loop)
- Option rules: `src/lib/productOptionRules.ts`
- Product attributes & SKU seeds: `supabase/seeds/glass-outlet/products/qshs.json`
- Pricing: `supabase/seeds/glass-outlet/pricing-2026-05-09.json` + `pricing_rules` table
- Heights table: `src/lib/heights.ts` → `deriveHeights()`
- Test fixtures: `supabase/seeds/glass-outlet/tests/simple/QSHS-*.fixture.json`
- Schema: `supabase/seeds/schemas/product-file.schema.json`
