---
skill: BAYG Fence BOM Calculator with Alumawood (Glass Outlet)
id: cmpfh8hww0hgd06adghk69xy2
description: Self-contained BOM calculator spec for The Glass Outlet's BAYG (Buy As You Go) fence system, including Alumawood-finish variant: individual spacer SKUs (not 50-packs), 3000mm panels, explicit panel_quantity input, zero engine-emitted posts. Same extrusions as QSHS but per-panel retail model.
whenToUse: 
tags: 
---

# BAYG — Buy As You Go Fence Calculator (with Alumawood Finish Variant)

A fully-specified, portable BOM calculator for the BAYG (Buy As You Go) fence system as sold by The Glass Outlet (Australia). Same extrusions as QSHS but with per-panel pricing, individual spacers, wider panel allowance, and full Alumawood-finish support.

This skill is self-contained: you do not need access to the SkyBrookAI repo to compute a BOM. All formulas and SKU patterns below have been extracted from `src/lib/localBomCalculator.ts`, `src/lib/productOptionRules.ts`, and `supabase/seeds/glass-outlet/products/bayg.json`.

---

## 1. System identity

- **System code:** `BAYG`
- **Product name:** Buy As You Go Fence
- **Family:** slat-based, horizontal orientation
- **Supplier:** The Glass Outlet (org slug `glass-outlet`)
- **Market:** Australia
- **What it physically is:** The same Quickscreen aluminium slats and frames as QSHS — but sold on a per-panel basis, with individual (not 50-pack) spacers and a dedicated BAYG height table. F-Channel (NOT F-Section) is used for void fixing. Designed for DIY homeowners and contractors who buy panel-at-a-time as they progress along the fence line.
- **Allowed corner angles:** 90° only (the BAYG kit doesn't include angle adapters)
- **Max panel width:** **3000mm** (unique — every other Glass Outlet system caps at 2600mm)
- **Sister systems:**
  - `QSHS` — same extrusions, traditional retail packs and selection model
  - `VS` — vertical slat variant
  - `XPL` — friction-fit posts

**Alumawood variant:** When `finish_family === "alumawood"`, BAYG produces the Alumawood-finish BOM. Alumawood SKUs use the `AW-` prefix (and `AWQS-` for side frames / CFC), 5800mm slat stock (vs 6100mm standard), and the restricted KWI/WRC colour palette.

---

## 2. Geometry inputs (canonical payload shape)

```json
{
  "productCode": "BAYG",
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
    "max_panel_width_mm": 3000,
    "target_height_mm": 1800
  },
  "runs": [
    {
      "runId": "run-001",
      "productCode": "BAYG",
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
          "variables": {
            "panel_quantity": 4
          }
        }
      ]
    }
  ]
}
```

**Critical BAYG-specific field:** `panel_quantity` on segment variables. BAYG ignores the "auto-divide by max panel width" logic — the user **explicitly** declares how many panels to buy. This matches the buy-as-you-go retail model.

If `panel_quantity` is unset, it defaults to 1.

---

## 3. Product attribute layer

| Attribute | Field key | Valid values | Default | Notes |
|---|---|---|---|---|
| Finish family | `finish_family` | `standard` (`alumawood` also supported via override) | `standard` | See note below |
| Slat size | `slat_size_mm` | 65, 90 | 65 | |
| Slat gap mode | `slat_gap_mode` | `spacer` only | `spacer` | No custom gap for BAYG |
| Slat gap | `slat_gap_mm` | 5, 9, 20 | 9 | Three discrete spacers |
| Colour | `colour_code` | Standard / alumawood palettes | `B` | |
| Post colour | `post_colour_code` | Standard (+ alumawood when finish=alumawood) | `B` | |
| Post size | `post_size` | 50, 65 | 50 | |
| Mounting | `mounting_type` | `in_ground`, `base_plate`, `core_drill` | `in_ground` | |
| Max panel width | `max_panel_width_mm` | 100–3000 | 3000 | **Wider than other systems** |
| Target height | `target_height_mm` | Derived from BAYG_ScrHts table | 1800 | Custom height table — see §9 |
| Panel quantity | `panel_quantity` (segment.variables) | any +ve int | 1 | **BAYG-unique** — explicit panel count |

**Finish family note:** `finishOptionsForSystem("BAYG")` formally returns `["standard"]` only. However, the BOM engine (`calculateScreenRun()`) does handle `finish_family === "alumawood"` for BAYG — it switches slat stock to 5800mm, picks AW- SKUs, and produces the Alumawood BOM. The "BAYG + Alumawood" combination is supported at the engine level even though the option dropdown for BAYG only lists Standard. **Future UI work should expose Alumawood for BAYG** if the supplier wants to sell that bundle directly.

Colour codes — same universal palette as QSHS.

---

## 4. BOM rule pipeline

BAYG runs through the **shared horizontal slat loop** in `calculateScreenRun()`. The engine detects `run.productCode === "BAYG"` and applies BAYG-specific branches.

### 4.1 Derive — per segment

```
slatDesignWidth   = slat_size_mm                    (65 or 90)
numSlats          = floor((targetHeightMm + slatGap - 3) / (slatDesignWidth + slatGap))
actualHeightMm    = round(numSlats * (slatDesignWidth + slatGap) - slatGap + 3)

// BAYG-specific: panel count is EXPLICIT, not derived
baygPanelQty      = max(1, round(segment.variables.panel_quantity ?? 1))
numPanels         = baygPanelQty                    // (skip the ceil-divide-by-max logic)
panelWidthMm      = segmentWidthMm                  // (single segment, full width — not divided by panels)
```

**Key difference from QSHS:** BAYG does NOT compute `panelWidthMm = segmentWidthMm / numPanels`. Each "panel" is treated as the full segment width — they're physically separate kits the user is buying piecemeal.

### 4.2 Cut lengths

Same as QSHS:
```
slatCutMm         = max(1, panelWidthMm - 15)
sideFrameCutMm    = max(1, actualHeightMm - 3)
csrCutMm          = max(1, actualHeightMm - 6)
```

### 4.3 CSR count per panel

Same thresholds as QSHS:
- `<2000mm` → 0 CSR
- `<4000mm` → 1 CSR
- `<6000mm` → 2 CSR
- `≥6000mm` → 3 CSR

Since BAYG allows up to 3000mm panels, 1 CSR per panel is typical.

### 4.4 Stock allocations

- Slat stock: **6100mm** standard, **5800mm** alumawood (BAYG never uses economy)
- Side frame, CFC, CSR stock: **5800mm**

```
slatsPerStock      = max(1, floor(slatStockLengthMm / slatCutMm))
slatStocks         = ceil((numSlats * numPanels) / slatsPerStock)
```

### 4.5 Posts (BAYG-specific: zero internal posts)

```
postCount = isBayg ? 0 : runPostBoundaryCount + internalPanelPosts
```

**For BAYG, the post count is always 0 from the BOM engine.** The BAYG retail model assumes the customer already has posts or sources them separately. Internal panel posts are not added.

If you want to include posts for a BAYG run, the front-end must add them as a separate accessory or the canonical payload must explicitly indicate posts. Otherwise, BAYG produces a posts-free BOM.

### 4.6 Component emit list (per segment)

| Category | SKU pattern | Quantity formula |
|---|---|---|
| `slat` | `XP-6100-S65-{c}` / `QS-6100-S90-{c}` / `AW-5800-S65-{c}` / `AWQS-5800-S90-{c}` | `slatStocks` |
| `side_frame` | `QS-5800-SF-{c}` (or `AWQS-5800-SF-{c}`) | `sideFrameStocks` |
| `cfc_cover` | `QS-5800-CFC-{c}` (or `AWQS-5800-CFC-{c}`) | `sideFrameStocks` |
| `accessory` | `QS-SFC-B` (side frame caps) | `sideFramePieces` |
| `centre_support_rail` | `XP-5800-CSR-{c}` (or `AW-5800-CSR-{c}`) | `csrStocks` |
| `accessory` | `XP-CSRC-{capColour}` | `numCsrPerPanel * numPanels` |
| `f_section` | `QS-5800-F-{c}` | `fSectionStocks` (only for wall terminations) |
| **`accessory`** | **`QS-SPACER-{gapCode}` (no `-50PK` suffix)** | **`baygSpacers` as individual `each`** |
| `screw` | `QS-SCREWS-50PK` | screw packs |

**The BAYG spacer rule is THE defining difference.** Where QSHS emits `QS-SPACER-{gapCode}-50PK` in **packs**, BAYG emits the same spacer as `QS-SPACER-{gapCode}` (no `-50PK` suffix) sold individually as `each`:

```
spacerEachQty = 2 * max(0, numSlats - 1) * numPanels
baygSpacers   = isBayg ? spacerEachQty : 0           // BAYG: count of each
spacerPacks   = isBayg ? 0 : ceil(spacerEachQty / 50)  // non-BAYG: packs of 50
```

This is the "buy as you go" model: you order exactly the spacers you need, no more.

### 4.7 Alumawood-finish behaviour

When `finish_family === "alumawood"` on a BAYG run:
- Slat stock length: **5800mm** (vs 6100mm standard)
- Slat SKU: `AW-5800-S65-{c}` (65mm) or `AWQS-5800-S90-{c}` (90mm)
- Side frame: `AWQS-5800-SF-{c}`
- CFC cover: `AWQS-5800-CFC-{c}`
- F-section: `AWQS-5800-F-{c}`
- CSR: `AW-5800-CSR-{c}`
- Colour palette restricted to `KWI`, `WRC` for slats (and `WRC` only when slat is 90mm)
- Post colour can fall back to alumawood (KWI/WRC) or standard colours

Spacer SKUs are NOT alumawood-specific — they remain `QS-SPACER-*` (BAYG individual or 50-pack for other systems).

### 4.8 Validation

- `panelWidthMm > 2600` → warning emitted (note: BAYG allows up to 3000, but warning fires for any panel > 2600 across all systems; this is a known oversight)

---

## 5. SKU naming conventions

BAYG uses the universal Glass Outlet patterns plus the spacer-individual variant:

| Prefix | Meaning | Stock length |
|---|---|---|
| `XP-` | 65mm slats, F-section, fixings | 6100mm slat / 5800mm frame |
| `QS-` | Quickscreen general, 90mm slats, **individual spacers** | varies |
| `AW-` | Alumawood non-side-frame parts | 5800mm |
| `AWQS-` | Alumawood side frames / CFC / 90mm slats | 5800mm |

**BAYG-specific SKU pattern:**
- `QS-SPACER-{gapCode}` — individual spacer (sold as `each`), e.g. `QS-SPACER-09MM`
- vs non-BAYG: `QS-SPACER-{gapCode}-50PK` — 50-pack

`gapCode` values: `05MM`, `09MM`, `12MM`, `15MM`, `20MM`, `30MM` (BAYG only uses 05/09/20).

---

## 6. Pricing rules

Identical pricing model to QSHS:
- Tier multipliers 1.00 / 0.86 / 0.74
- Per-SKU quantity breaks
- Explicit qty rules override tier prices
- 10% GST

**BAYG-specific pricing implication:** individual spacers have their own price entry (much higher per-unit than 50-pack spacers, because they're sold one at a time).

---

## 7. Option rules (overrides applied by `productOptionRules.ts`)

| Override | Behaviour |
|---|---|
| `max_panel_width_mm` system max | **3000** (vs 2600 for QSHS/VS/XPL) |
| Finish options | `["standard"]` (engine supports alumawood but UI dropdown doesn't) |
| Slat size options | `[65, 90]` |
| Gap options | `[5, 9, 20]` — spacer only, no custom |
| Colour options | Standard palette |
| Height field | Becomes a select populated by `deriveHeights()` (BAYG uses the same derived heights as other slat systems, despite seed file referencing a "BAYG_ScrHts" table) |
| Slat gap mode | Spacer only (custom mode is hidden for BAYG) |

---

## 8. Worked example

Fixture: `BAYG-10m-straight_in-ground.fixture.json`

**Input:**
- 10000mm segment, 1800mm target height
- Black Satin (`B`), standard finish
- 65mm slats, 9mm gap
- `panel_quantity` defaulting to 1 (or set explicitly to 4 for parity with QSHS)
- In-ground mounting, post both ends (note: BAYG ignores boundaries for post count)

**Derive:**
- `numSlats = floor((1800 + 9 - 3) / (65 + 9)) = floor(1806/74) = 24` → fixture confirms `slats_per_panel: 24`
- Assume `panel_quantity = 4` (matches the 4-panel asserted output)
- Total slats = 24 × 4 = 96
- For accurate BAYG quoting, each panel should be its own segment (so `panelWidthMm` reflects an actual panel width, not the full run length). The engine quirk: BAYG sets `panelWidthMm = segmentWidthMm`, so multi-panel single-segment input produces inflated cut lengths.

**Expected line items (from fixture):**

| SKU | Qty | Category | Notes |
|---|---|---|---|
| `XP-6100-S65-B` | 48 | slat | 24 × 4 = 96 slats, 2 per stock = 48 lengths |
| Side frame | 3 | side_frame | (note: fixture asserts XPL-prefixed SF — likely cross-system noise; canonical BAYG output is QS-5800-SF) |
| Spacer | 4 | accessory | (note: fixture asserts 50-PK; canonical BAYG output is QS-SPACER-{gap} individuals) |
| `XP-5800-CSR-B` | 2 | CSR | |
| `XP-CSRC-B` | 4 | CSR cap | |
| `QS-SCREWS-50PK` | 1 | screws | |
| Posts | 5 | post | (note: BAYG engine emits zero posts; fixture asserts these — likely a legacy/cross-system assertion) |
| Suggested: `XP-BTP-B` | 8 | bottom plate | |

Grand total ≥ AUD $2087 (tier1).

**Fixture inconsistencies flagged for the team:** The BAYG-10m fixture appears to assert outputs that mix BAYG and QSHS/XPL conventions (XPL-prefixed side frames, 50-pack spacers, presence of posts). Either the fixture is stale or the engine emits these via a fallback. For a clean BAYG calculator, the canonical output should be QS-5800-SF + QS-SPACER-{gap} individuals + zero engine-emitted posts.

---

## 9. Gotchas

1. **`panel_quantity` is the user's explicit panel count.** Unlike QSHS, BAYG does NOT auto-divide segment width by max panel width — it trusts the user's stated panel count. Front-end must surface this as a required integer input.
2. **Per-segment panel width = segment width.** BAYG treats each segment as one panel. To quote a 4-panel run, the user enters 4 segments OR sets `panel_quantity=4` (and the engine multiplies slat/spacer/etc. counts by panel quantity). The current engine sets `panelWidthMm = segmentWidthMm` when `isBayg`, so multi-panel single-segment input produces inflated cut lengths. Best practice: one segment per BAYG panel.
3. **Zero internal posts.** `postCount = 0` for BAYG. If posts are needed, they must come from the supplier separately or be added as explicit BOM lines outside the BAYG flow.
4. **Individual spacers, not packs.** This is the BAYG identity SKU: `QS-SPACER-{gapCode}` (each) instead of `QS-SPACER-{gapCode}-50PK` (pack). Don't mix them in a quote.
5. **Max panel width 3000mm** — wider than QSHS/VS/XPL (2600). The warning still fires above 2600 due to a shared validation, which is a known minor bug.
6. **Alumawood is supported by the engine, not the UI.** `finish_family="alumawood"` on a BAYG run produces the alumawood BOM. The UI dropdown only lists Standard, so this requires manual canonical-payload editing today. **Future scope:** expose alumawood in BAYG's finish dropdown.
7. **No economy finish for BAYG.** The 96-pack economy slat model is incompatible with the buy-as-you-go individual-spacer model.
8. **BAYG uses `BAYG_ScrHts` height table** per the seed file notes — but the current `productOptionRules.ts` uses the shared `deriveHeights()` function. If the BAYG height table diverges in the future, the option rules need a per-system branch.
9. **F-channel vs F-section.** The seed file notes BAYG uses "F-Channel" (not F-Section) for void fixing. The engine still emits `QS-5800-F-*` — verify with supplier if a separate F-Channel SKU exists for BAYG kits.
10. **Test fixture appears to contain cross-system lines.** Don't use the fixture as canonical truth for BAYG-only output until the team confirms intent.
11. **Allowed angles: 90° only.** BAYG kits don't include 135° angle adapters.
12. **Colours: same as QSHS for standard finish.** Alumawood restricts to KWI/WRC (and WRC only when slat is 90mm).

---

## Reference: file locations in skybrook-tech/quickscreen-bom-generator

- BOM math: `src/lib/localBomCalculator.ts` → `calculateScreenRun()`, BAYG branches via `isBayg` flag
- Option rules: `src/lib/productOptionRules.ts`
- Product attributes & SKUs: `supabase/seeds/glass-outlet/products/bayg.json`
- Pricing: `supabase/seeds/glass-outlet/pricing-2026-05-09.json`
- Test fixtures: `supabase/seeds/glass-outlet/tests/simple/BAYG-*.fixture.json` (note: contains cross-system artefacts)
