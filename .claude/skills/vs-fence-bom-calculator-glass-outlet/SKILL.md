---
name: VS Fence BOM Calculator (Glass Outlet)
description: Self-contained BOM calculator spec for The Glass Outlet's VS (Vertical Slat) fence system: same extrusions as QSHS rotated 90 degrees, U-channel rails, panel-width-driven slat count, dedicated code path. Includes schema, attributes, BOM math, SKU patterns, worked example, and gotchas.
---

# VS — Vertical Slat Fence Calculator

A fully-specified, portable BOM calculator for the VS (Vertical Slat) fence system as sold by The Glass Outlet (Australia). Same extrusions as QSHS rotated 90° — slats stand vertical inside top/bottom U-channel rails.

This skill is self-contained: you do not need access to the SkyBrookAI repo to compute a BOM. All formulas, SKU patterns, and validation rules below have been extracted from `src/lib/localBomCalculator.ts` (`calculateVerticalSlatRun()`), `src/lib/productOptionRules.ts`, and `supabase/seeds/glass-outlet/products/vs.json`.

---

## 1. System identity

- **System code:** `VS`
- **Product name:** VS Vertical Slat Fence
- **Family:** slat-based, vertical orientation
- **Supplier:** The Glass Outlet (org slug `glass-outlet`)
- **Market:** Australia
- **What it physically is:** The same Quickscreen aluminium slats as QSHS — but stood vertically. Slats are held by horizontal top/bottom U-channel rails (`QS-5000-HORIZ`). An outer horizontal frame (`QS-5800-SF`) encloses the U-channel and a vertical F-section (`QS-5800-F`) trims each side of the panel as edge frames.
- **Allowed corner angles:** 90° only (no 135° angle adapter for vertical slat)
- **Sister systems:**
  - `QSHS` — same extrusions, slats horizontal
  - `BAYG` — same extrusions, individual spacers, horizontal
  - `XPL` — friction-fit posts, horizontal slat, different family

Key visual differences from QSHS:
- VS uses an additional component: `QS-5000-HORIZ` (5000mm U-channel rail, **VS-only**)
- VS uses a rail insert (`QS-5800-SF` repurposed inside the U-channel)
- The F-section is the **vertical** edge frame in VS, not a wall-termination piece

---

## 2. Geometry inputs (canonical payload shape)

```json
{
  "productCode": "VS",
  "schemaVersion": "v2",
  "variables": {
    "colour_code": "B",
    "post_colour_code": "B",
    "finish_family": "standard",
    "slat_size_mm": 65,
    "slat_gap_mm": 5,
    "slat_gap_mode": "spacer",
    "mounting_type": "in_ground",
    "post_size": 50,
    "max_panel_width_mm": 2600,
    "target_height_mm": 1800
  },
  "runs": [
    {
      "runId": "run-001",
      "productCode": "VS",
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

VS interprets `targetHeightMm` directly as the slat cut length — no height snapping. The number of vertical slats per panel is derived from panel width, not from height.

---

## 3. Product attribute layer

| Attribute | Field key | Valid values | Default | Notes |
|---|---|---|---|---|
| Finish family | `finish_family` | `standard`, `economy`, `alumawood` | `standard` | |
| Slat size | `slat_size_mm` | 65, 90 (65 only in economy) | 65 | |
| Slat gap mode | `slat_gap_mode` | `spacer`, `custom` | `spacer` | VS supports custom gap like QSHS |
| Slat gap | `slat_gap_mm` | 5, 9, 20 (spacer mode); any +ve int (custom) | 9 | Narrower options than QSHS |
| Colour | `colour_code` | Standard / economy / alumawood palettes | `B` | |
| Post colour | `post_colour_code` | Standard (+ alumawood) | `B` | |
| Post size | `post_size` | 50, 65 | 50 | |
| Post system | `post_system` | `standard_50`, `standard_65` | `standard_50` | |
| Mounting | `mounting_type` | `in_ground`, `base_plate`, `core_drill` | `in_ground` | |
| Max panel width | `max_panel_width_mm` | 100–2600 | 2600 | |
| Target height | `target_height_mm` | any positive mm (NOT a select) | 1800 | VS has no derived-heights table |

**Important VS quirk:** `heightEntriesForSystem("VS", ...)` returns `[]` — VS has **no derived height table**. The number of vertical slats is computed from panel width, not from height. The height field stays a free-form number input.

Colour codes — same universal palette as QSHS (see QSHS skill for the full table).

---

## 4. BOM rule pipeline

VS has its own code path: `calculateVerticalSlatRun()`. It does **not** share the QSHS/BAYG/XPL loop.

### 4.1 Derive — per segment

```
maxPanelWidth     = clamp(max_panel_width_mm, 100, 2600)
numPanels         = max(1, ceil(segmentWidthMm / maxPanelWidth))
panelWidthMm      = segmentWidthMm / numPanels
internalPanelPosts += max(0, numPanels - 1)

numVerticalSlats  = max(1, floor((panelWidthMm - 8 + slatGap) / (slatGap + slatSize)))
```

Note the `-8` constant on panel width — accounts for inset of slats from the F-section edge frames.

### 4.2 Cut lengths

```
slatCutMm         = max(1, targetHeightMm)
railCutMm         = max(1, panelWidthMm)
fSectionCutMm     = max(1, targetHeightMm)
```

(Slats span the full height; rails span the panel width; F-sections span the full height as vertical edge frames.)

### 4.3 Stock allocations

Stock lengths used by VS:
- Slat stock: **6100mm** standard / **6500mm** economy / **5800mm** alumawood
- Top/bottom U-channel rail (`QS-5000-HORIZ`): **5000mm** stock
- Side frame (rail insert) `QS-5800-SF`: **5800mm**
- F-section vertical edge: **5800mm**

```
slatsPerStock        = max(1, floor(slatStockLengthMm / slatCutMm))
railsPerStock        = max(1, floor(5000 / railCutMm))
railInsertsPerStock  = max(1, floor(5800 / railCutMm))
fSectionsPerStock    = max(1, floor(5800 / fSectionCutMm))

slatStocks           = ceil((numVerticalSlats * numPanels) / slatsPerStock)
railStocks           = ceil((2 * numPanels) / railsPerStock)           // top + bottom per panel
railInsertStocks     = ceil((2 * numPanels) / railInsertsPerStock)     // SF acts as insert
fSectionStocks       = ceil((2 * numPanels) / fSectionsPerStock)       // 2 vertical edges per panel
```

### 4.4 Posts (run-level)

Same formula as QSHS:
```
postCount = (leftBoundary == product_post ? 1 : 0)
          + (rightBoundary == product_post ? 1 : 0)
          + corners.length
          + sum over segments of max(0, numPanels - 1)
```

Post SKUs follow the same table as QSHS (see QSHS skill section 4.5).

### 4.5 Component emit list (per segment)

| Category | SKU pattern | Quantity formula |
|---|---|---|
| `slat` | `XP-6100-S65-{c}` / `QS-6100-S90-{c}` / `XP-6500-E65-{c}` / `AW-5800-S65-{c}` / `AWQS-5800-S90-{c}` | `slatStocks` |
| `rail` | `QS-5000-HORIZ-{c}` (**VS-unique**) | `railStocks` |
| `rail_insert` | `QS-5800-SF-{c}` (or `AWQS-5800-SF-{c}`) | `railInsertStocks` |
| `f_section` | `QS-5800-F-{c}` (or `AWQS-5800-F-{c}`) | `fSectionStocks` |
| `screw` | `QS-SCREWS-50PK` | `ceil((numSlats * numPanels * 2 * 1.01) / 50)` packs |

**No CSR for VS.** No louvre treatment for VS. No spacer SKU is emitted in the current VS BOM logic — vertical slats are typically secured with screws through the U-channel.

### 4.6 Corner emit

Same 135° handling as QSHS (via `emitCornerLines`). But VS only formally supports 90° (`allowedAngles: [90]` in the seed file), so 135° corners on VS will emit the angle adapter SKU but should be flagged.

### 4.7 Validation

- `panelWidthMm > 2600` → warning: "VS panel width X exceeds recommended 2600mm; split into more panels"

---

## 5. SKU naming conventions

Same prefixes as QSHS (XP-, QS-, AW-, AWQS-, QSG-) — VS shares most extrusions with QSHS.

**VS-unique SKU:**
- `QS-5000-HORIZ-{c}` — 32×32mm horizontal U-channel rail, 5000mm stock, only used by VS. AUD $40.87 (tier1, Black Satin).

---

## 6. Pricing rules

Identical pricing model to QSHS:
- Tiers tier1/tier2/tier3 = 1.00 / 0.86 / 0.74
- Per-SKU quantity breaks in `localPriceBreaks.ts`
- Explicit qty rules override tier prices
- 10% GST

---

## 7. Option rules (overrides applied by `productOptionRules.ts`)

| Override | Behaviour |
|---|---|
| `max_panel_width_mm` system max | 2600 |
| Finish options | `["standard", "economy", "alumawood"]` |
| Slat size options | `[65]` if economy, else `[65, 90]` |
| Gap options (spacer mode) | `[5, 9, 20]` |
| Gap options (custom mode) | any non-negative integer mm |
| Colour options | Filtered by finish |
| Height field | Free-form number input (no select); `heightEntriesForSystem("VS", ...)` returns `[]` |

---

## 8. Worked example

Fixture: `VS-10m-straight_in-ground.fixture.json`

**Input:**
- 10000mm straight run
- 1800mm target height
- Black Satin (`B`), standard finish
- 65mm slats, 5mm gap
- Post both ends, in-ground

**Derive:**
- `numPanels = ceil(10000 / 2600) = 4`
- `panelWidthMm = 10000 / 4 = 2500`
- `numVerticalSlats = floor((2500 - 8 + 5) / (5 + 65)) = floor(2497/70) = 35` → fixture asserts `slats_per_panel: 36` (off by 1, fixture truth wins; engine may use slightly different rounding)
- Total slats = 36 × 4 = 144
- `slatCutMm = 1800`
- `slatsPerStock = floor(6100/1800) = 3` → `slatStocks = ceil(144/3) = 48`
- `railCutMm = 2500`, `railsPerStock = floor(5000/2500) = 2`, `railStocks = ceil(8/2) = 4`

**Posts:**
- 5 posts (2 boundary + 3 internal), `XP-2400-FP-B`

**Expected line items (from fixture):**

| SKU | Qty | Category |
|---|---|---|
| `XP-6100-S65-B` | 48 | slat |
| `QS-5000-HORIZ-B` | 4 | rail (VS-unique U-channel) |
| `QS-5800-SF-B` | 3 | rail insert |
| `QS-5800-F-B` | 3 | F-section vertical edge |
| `QS-SCREWS-50PK` | 4 | screws |
| `QS-SFCAP-B-2PK` | 4 | accessory caps |
| `XP-2400-FP-B` | 5 | post |
| `XP-TP-B` | 4 | top plate |
| Suggested: `XP-BTP-B` | 8 | |

Grand total ≥ AUD $2087 (tier1).

---

## 9. Gotchas

1. **VS has its own code path.** Do not assume the QSHS BOM math applies — `calculateScreenRun()` calls `calculateVerticalSlatRun()` early when `run.productCode === "VS"`.
2. **No derived heights table.** `heightEntriesForSystem("VS", vars)` returns `[]`. The height field should be a free-form number input. Slat count is panel-width-driven, not height-driven.
3. **U-channel `QS-5000-HORIZ` is the VS-unique SKU.** This is the only component that exists in `vs.json` rather than being inherited from `qshs.json`. All other VS extrusions are seeded under qshs.json with `system_types` including "VS".
4. **VS uses 5000mm rail stock**, not 6100mm or 5800mm. This is a deliberate manufacturing trade-off — the U-channel is shorter and easier to handle.
5. **F-section orientation flipped.** In QSHS, F-section is a wall-termination piece. In VS, F-section becomes the vertical edge frame on **every** panel (2 per panel). The same SKU, totally different use.
6. **Side frame `QS-5800-SF` becomes a rail insert.** In QSHS the SF is the outer post-side frame. In VS it goes *inside* the U-channel as a structural insert. Don't conflate the two roles when reading the BOM.
7. **VS does not auto-emit spacer SKUs.** Vertical slat gap is held by the U-channel groove, not by interstitial spacers.
8. **No CSR emit in VS code path** — the VS code path skips centre support rails entirely. If a saved quote shows CSR lines under VS, it was likely produced by an earlier engine or a mixed-system run.
9. **No louvre treatment for VS.** Louvre is QSHS-only (and only with 65mm slats).
10. **VS only supports 90° corners.** `allowedAngles: [90]` in the seed. If a 135° corner is present on a VS run, expect a warning.
11. **VS shares the post SKU table with QSHS.** Same post selection logic (size, height, mounting, alumawood) applies.

---

## Reference: file locations in skybrook-tech/quickscreen-bom-generator

- BOM math: `src/lib/localBomCalculator.ts` → `calculateVerticalSlatRun()`
- Option rules: `src/lib/productOptionRules.ts`
- Product attributes & SKUs: `supabase/seeds/glass-outlet/products/vs.json` (VS-unique only) + `supabase/seeds/glass-outlet/products/qshs.json` (shared components with `system_types: [VS]`)
- Pricing: `supabase/seeds/glass-outlet/pricing-2026-05-09.json`
- Test fixtures: `supabase/seeds/glass-outlet/tests/simple/VS-*.fixture.json`
