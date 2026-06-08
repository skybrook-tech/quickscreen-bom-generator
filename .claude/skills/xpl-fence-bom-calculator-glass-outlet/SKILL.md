---
name: XPL Fence BOM Calculator (Glass Outlet)
id: cmpfh8pfn0h1a07ad1d7wlnlq
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# XPL Fence BOM Calculator (Glass Outlet)

> Self-contained BOM calculator spec for The Glass Outlet's XPL (XPress Plus Premium) friction-fit post fence system: 1W/2W/90 post types, no side frames or CFC, restricted option set (no economy, no 90mm slat, no custom gap). Includes schema, BOM math, SKU patterns, worked example, and gotchas.

## When to use
(not specified)

## Documentation
# XPL — XPress Plus Premium Post Fence Calculator

A fully-specified, portable BOM calculator for the XPL (XPress Plus) fence system as sold by The Glass Outlet (Australia). XPL is the structural outlier in the Glass Outlet lineup: slats insert directly into patented friction-fit posts (no side frames, no concealed-fix cover).

This skill is self-contained: you do not need access to the SkyBrookAI repo to compute a BOM. All formulas and SKU patterns below have been extracted from `src/lib/localBomCalculator.ts`, `src/lib/productOptionRules.ts`, and `supabase/seeds/glass-outlet/products/xpl.json`.

---

## 1. System identity

- **System code:** `XPL`
- **Product name:** XPress Plus Premium Post Fence
- **Family:** slat-based, horizontal orientation, **friction-fit post system**
- **Supplier:** The Glass Outlet (org slug `glass-outlet`)
- **Market:** Australia
- **What it physically is:** Aluminium slats friction-fit directly into patented XPL posts. No side frames, no CFC cover. The post itself accepts the slat ends.
- **Allowed corner angles:** 90° only (the 90° XPL post handles corners natively)
- **Post types (XPL-specific):**
  - `1W` — one-way (end posts and wall terminations)
  - `2W` — two-way (inline / panel-join posts)
  - `90` — 90° corner posts
- **Slat insertion depth:** 24mm for 1W/2W posts, 15mm for 90° corner posts
- **Sister systems:**
  - `QSHS` — same horizontal slat orientation, but uses side frames + CFC instead of friction-fit posts
  - `BAYG` — same extrusions as QSHS, individual spacers
  - `VS` — vertical slat variant of QSHS

---

## 2. Geometry inputs (canonical payload shape)

```json
{
  "productCode": "XPL",
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
    "post_system": "xpl",
    "max_panel_width_mm": 2600,
    "target_height_mm": 1800
  },
  "runs": [
    {
      "runId": "run-001",
      "productCode": "XPL",
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

XPL uses `post_system: "xpl"` to select the friction-fit post variant. The XPL post family has its own SKU set.

---

## 3. Product attribute layer

XPL has the **most restrictive** option set of the four systems.

| Attribute | Field key | Valid values | Default | Notes |
|---|---|---|---|---|
| Finish family | `finish_family` | `standard`, `alumawood` | `standard` | **No economy for XPL** |
| Slat size | `slat_size_mm` | 65 only | 65 | **No 90mm slat for XPL** |
| Slat gap mode | `slat_gap_mode` | `spacer` only | `spacer` | **No custom gap** |
| Slat gap | `slat_gap_mm` | 5, 9, 20 | 9 | Three discrete spacers |
| Colour | `colour_code` | Standard / alumawood palettes | `B` | |
| Post colour | `post_colour_code` | Standard (+ alumawood) | `B` | |
| Post system | `post_system` | `xpl` (default) or `standard_50` | `xpl` | Switching to standard_50 falls back to QSHS-style posts |
| Mounting | `mounting_type` | `in_ground`, `base_plate`, `core_drill` | `in_ground` | |
| Max panel width | `max_panel_width_mm` | 100–2600 | 2600 | |
| Target height | `target_height_mm` | Derived (slat-count snapped) | 1800 | |

Finish → colour rules:
- `standard` → all 11 standard colours
- `alumawood` (slat 65mm) → `KWI`, `WRC` (slat 90mm is not available for XPL anyway)

---

## 4. BOM rule pipeline

XPL is processed through the **shared horizontal slat loop** in `calculateScreenRun()` — the same code path as QSHS and BAYG — when `productCode === "XPL"`.

### 4.1 Derive — per segment

```
slatDesignWidth   = slat_size_mm                    (always 65 for XPL)
numSlats          = floor((targetHeightMm + slatGap - 3) / (slatDesignWidth + slatGap))
actualHeightMm    = round(numSlats * (slatDesignWidth + slatGap) - slatGap + 3)
numPanels         = max(1, ceil(segmentWidthMm / max_panel_width_mm))
panelWidthMm      = segmentWidthMm / numPanels
```

### 4.2 Cut lengths

```
slatCutMm         = max(1, panelWidthMm - 15)
sideFrameCutMm    = max(1, actualHeightMm - 3)
csrCutMm          = max(1, actualHeightMm - 6)
```

### 4.3 Centre Support Rail (CSR) count per panel

Same thresholds as QSHS:
- `<2000mm panel` → 0 CSR
- `<4000mm` → 1 CSR
- `<6000mm` → 2 CSR
- `≥6000mm` → 3 CSR

### 4.4 Stock allocations

- Slat stock: **6100mm** standard, **5800mm** alumawood
- Side frame, CFC, CSR stock: **5800mm**

(Same as QSHS, just no economy SKU for XPL.)

### 4.5 XPL post selection (the only big structural divergence)

When `post_system === "xpl"`, the post SKUs should differ. **However**, in the current implementation of `postSkuFor()` in `localBomCalculator.ts`, the post selection logic does **not** branch on XPL specifically — it falls through to the standard QSHS post table. Test fixtures confirm: the XPL 10m fixture emits `XP-2400-FP-B` (a QSHS post SKU), not an `XPL-...` post.

**Practical implication:** the BOM engine currently treats XPL the same as QSHS for posts, but the `xpl.json` seed defines the XPL post family separately:

| XPL post SKU | Description |
|---|---|
| `XPL-6000-1W-{c}` | One-way (end) post, 6000mm stock |
| `XPL-6000-2W-{c}` | Two-way (inline) post, 6000mm stock |
| `XPL-6000-90-{c}` | 90° corner post, 6000mm stock |

A future BOM rule (currently NOT IMPLEMENTED in `calculateScreenRun()`) would map:
- `leftBoundary == product_post && segments == 1` → 1W
- internal panel posts → 2W
- corner posts → 90°

For now, treat XPL post emit as identical to QSHS until the XPL post branch is wired up. Flag this in any new supplier integration.

### 4.6 Component emit list (per segment)

| Category | SKU pattern | Quantity formula |
|---|---|---|
| `slat` | `XP-6100-S65-{c}` (or `AW-5800-S65-{c}` for alumawood) | `slatStocks` |
| `side_frame` | `XPL-6000-SF-{c}` (XPL-specific) | `sideFrameStocks` |
| `accessory` | `XPL-EP-{c}-2PK` (XPL end plates, 2-pack) | typically `sideFramePieces` |
| `accessory` | `XPL-2100-INS{gap}-{c}` (premium insert) | varies by gap |
| `centre_support_rail` | `XP-5800-CSR-{c}` | `csrStocks` |
| `accessory` | `XP-CSRC-{capColour}` | `numCsrPerPanel * numPanels` |
| `f_section` | `XPL-6000-F-{c}` | `fSectionStocks` (only for wall terminations) |
| `screw` | `QS-SCREWS-50PK` | screw packs |
| Posts | `XP-2400-FP-B` (current behaviour — see §4.5) | `postCount` |

**Notable XPL-only SKU prefixes:**
- `XPL-6000-SF-{c}` — XPL premium side frame
- `XPL-6000-F-{c}` — XPL F-section (wall termination)
- `XPL-6000-1W-{c}` / `XPL-6000-2W-{c}` / `XPL-6000-90-{c}` — XPL posts (1-way, 2-way, 90°)
- `XPL-EP-{c}-2PK` — end plate pack
- `XPL-2100-INS{gap}-{c}` — premium insert (e.g. `XPL-2100-INS09-B` for 9mm gap)

### 4.7 Validation

- `panelWidthMm > 2600` → warning, split into more panels
- Custom angle corner → `CUSTOM-ANGLE-CORNER` SKU + warning (XPL doesn't natively support custom angles — 90° posts only)
- `slat_size_mm != 65` → engine forces 65 (XPL has no 90mm slat)

---

## 5. SKU naming conventions

XPL adds the `XPL-` prefix on top of the universal Glass Outlet patterns:

| Prefix | Meaning |
|---|---|
| `XP-` | Shared with QSHS (slats, screws, CSR, posts) |
| `QS-` | Shared (general) |
| `AW-` | Alumawood (used when finish=alumawood) |
| `XPL-` | **XPL-only** components (posts, SF, F, end plates, inserts) |

---

## 6. Pricing rules

Identical pricing model to QSHS:
- Tier multipliers 1.00 / 0.86 / 0.74
- Per-SKU quantity breaks
- 10% GST

XPL premium components (the `XPL-*` SKUs) tend to be priced higher than the equivalent QSHS extrusions — pricing is the visible cost of the friction-fit convenience.

---

## 7. Option rules (overrides applied by `productOptionRules.ts`)

| Override | Behaviour |
|---|---|
| `max_panel_width_mm` system max | 2600 |
| Finish options | `["standard", "alumawood"]` — **no economy** |
| Slat size options | `[65]` only — **no 90mm** |
| Gap options | `[5, 9, 20]` — spacer mode only, **no custom gap** |
| Colour options | Filtered by finish |
| Height field | Becomes a select populated by `deriveHeights()` (same logic as QSHS) |
| `post_system` default | `"xpl"` (uniquely XPL) |

---

## 8. Worked example

Fixture: `XPL-10m-straight_in-ground.fixture.json`

**Input:**
- 10000mm straight run, 1800mm target, black satin
- 65mm slats, 9mm gap
- Post both ends, in-ground

**Derive:**
- `numSlats = floor((1800 + 9 - 3) / (65 + 9)) = floor(1806/74) = 24` → fixture confirms `slats_per_panel: 24`
- `numPanels = 4`, `panelWidthMm = 2500`
- Total slats = 24 × 4 = 96
- `slatCutMm = 2485`, `slatsPerStock = floor(6100/2485) = 2`, `slatStocks = ceil(96/2) = 48`

**Expected line items (from fixture):**

| SKU | Qty | Notes |
|---|---|---|
| `XP-6100-S65-B` | 48 | slat |
| `XPL-6000-SF-B` | 3 | XPL side frame |
| `XPL-6000-F-B` | 3 | XPL F-section |
| `XPL-EP-B-2PK` | 8 | XPL end plate 2-pack |
| `XPL-2100-INS09-B` | 8 | premium insert (9mm gap) |
| `XP-5800-CSR-B` | 2 | shared CSR |
| `XP-CSRC-B` | 4 | shared CSR cap |
| `QS-SCREWS-50PK` | 1 | screws |
| `XP-2400-FP-B` | 5 | post (currently QSHS post, not XPL post — see §4.5) |
| `XP-TP-B` | 4 | top plate |
| Suggested: `XP-BTP-B` | 8 | bottom plate (suggested) |

Grand total ≥ AUD $2087 (tier1).

---

## 9. Gotchas

1. **XPL post family is seeded but not yet wired into the BOM engine.** Posts emitted for XPL currently fall through to the QSHS standard post table (`XP-2400-FP-*`). If you port this BOM logic elsewhere, decide whether to fix this or replicate the current behaviour.
2. **No economy finish.** `finishOptionsForSystem("XPL")` returns only `["standard", "alumawood"]`.
3. **No 90mm slat.** Slat size is locked to 65. Front-end forms should disable the 90mm option for XPL.
4. **No custom gap.** Spacer-only — `[5, 9, 20]`. The "Gap type" field is hidden for XPL.
5. **Friction-fit means slat insertion depth matters.** The slat is held by 24mm of post overlap on each end (1W/2W) or 15mm for the 90° corner post. Cut length math doesn't currently account for this — it uses `panelWidthMm - 15` like QSHS. For a true XPL calculator, slat cut should be `panelWidthMm - 2 × insertion_depth + tolerance`. **Open question** for the engineering team.
6. **No 135° angle adapter for XPL.** XPL only ships a 90° corner post. If a 135° corner is present on an XPL run, the engine emits `CUSTOM-ANGLE-CORNER` and warns the supplier to verify.
7. **`XPL-2100-INS{gap}-{c}` premium inserts replace conventional spacers** in some XPL configurations. The gap code in the SKU matches the slat_gap_mm value padded to 2 digits.
8. **XPL post system can be swapped to `standard_50`.** If a user sets `post_system="standard_50"` on an XPL run, they get QSHS-style posts. Rare but supported.
9. **CSR logic is identical to QSHS.** XPL uses the same `XP-5800-CSR` CSR rail and same panel-width thresholds.
10. **Alumawood support exists but is restricted.** Only 65mm slats are available, and `alumawood + slat 90` is impossible for XPL.

---

## Reference: file locations in skybrook-tech/quickscreen-bom-generator

- BOM math: `src/lib/localBomCalculator.ts` → shared `calculateScreenRun()` path (QSHS/BAYG/XPL)
- Option rules: `src/lib/productOptionRules.ts`
- Product attributes & SKUs: `supabase/seeds/glass-outlet/products/xpl.json`
- Pricing: `supabase/seeds/glass-outlet/pricing-2026-05-09.json`
- Test fixtures: `supabase/seeds/glass-outlet/tests/simple/XPL-*.fixture.json`

## Scripts
None
