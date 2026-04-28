# Catalogue Gap Analysis — Missing Product Components & Rules

> **Source catalogues:** `GO+Quickscreen+Slat+Screening+and+Gates+Catalogue+V1+Low+Res.pdf` (QS V1) and `GO+Cat+Xpress+Alumawood+V4_lowres.pdf` (Alumawood V4)
>
> **Scope:** What's in the catalogues but missing from seed files (`qshs.json`, `xpl.json`, `bayg.json`, `vs.json`, `qs_gate.json`, `other.json`). Pricing is excluded from this analysis — leave as `null` for all new rows.

---

## Summary

| Priority | Area | Count | Impact |
|---|---|---|---|
| P1 | QSHS — missing coloured SKUs & cross-system accessories | ~50 SKUs | Corner jobs, louvre jobs, wall mount |
| P1 | XPL — missing extrusions (U/F/Inserts) | ~90 SKUs | Xpress Plus Premium tier, wall-to-wall method |
| P1 | QS_GATE — missing gate extrusions (rails, cover, infill) | ~65 SKUs | Gate BOM is currently incomplete |
| P1 | BAYG — Island Grey colour variant + gate blades | ~15 SKUs | Island Grey jobs completely broken |
| P2 | Cross-system accessories (slat caps, end caps, fixing kits) | ~35 SKUs | Optional line items on quotes |
| P2 | QS_GATE — new QSG rail screws & joiner hardware | ~5 SKUs | Gate screws use wrong code |
| P3 | Sliding gate system (XPSG-*) — entire new product | ~20 SKUs | New product type entirely |
| P3 | Alumawall — entirely new product family | ~10 SKUs | New product type entirely |
| P4 | POSTA letterboxes, FILO automation, grouts, touch-up paint | ~40+ SKUs | Not BOM-relevant for fencing |

---

## P1 — Critical / Affects Standard BOM Calculations

### 1. QSHS: 135° corner adapter (`XP-6000-135`)

Catalogue: `XP-6000-135` — 6000mm Alloy 6060-T5, used to adapt corner posts for 135° installations. (The Alumawood version is `AW-5800-135` at 5800mm, already in `bayg.json`.)

**Missing from `qshs.json`:** all colour variants.

Colours from catalogue: B, MN, G, SM, W, BS, D, M, S (same palette as other QSHS extrusions; no P/PB for this product).

```
XP-6000-135-B, XP-6000-135-MN, XP-6000-135-G, XP-6000-135-SM,
XP-6000-135-W, XP-6000-135-BS, XP-6000-135-D, XP-6000-135-M, XP-6000-135-S
```

**Rules needed:** Currently no `product_rule` or `product_constraint` for corners beyond a simple `num_corners` derive. A corner requires 1× `XP-6000-135-{colour}` per corner. Consider adding a `component` rule like:
```
num_corners > 0 ? num_corners : 0
```
with selector matching on `match_json: { "segment_has_corner": true }` or driven from the `corners` variable already in context.

**Note:** `XP-6000-135-MN` is also the cross-ref SKU for the Alumawood Island Grey finish (Alumawood V4, p.111: `Order Code: AW-5800-135 / XP-6000-135-MN`).

---

### 2. QSHS: Side frame top caps (`QS-SFCAP-*-2PK`)

Catalogue: `QS-SFCAP-{colour}-2PK` — per-colour 2-packs. Currently the seed only has `QS-SFC-B` (single generic black cap). The catalogue shows 7 coloured variants:

```
QS-SFCAP-B-2PK, QS-SFCAP-MN-2PK, QS-SFCAP-G-2PK, QS-SFCAP-SM-2PK,
QS-SFCAP-W-2PK, QS-SFCAP-BS-2PK, QS-SFCAP-D-2PK
```
(No P/PB/S/M in catalogue for this product.)

**Decision needed:** Either replace `QS-SFC-B` with the proper per-colour packs, or add them as alternatives. The per-colour packs are what customers actually order. Recommend: add `QS-SFCAP-{colour}-2PK` as the canonical SKU and deprecate `QS-SFC-B` (or keep it as the Black entry matching `QS-SFCAP-B-2PK`).

**Rule impact:** Each standard end gets 1 pack = 2 caps (one per side frame). Already handled via the `num_sf_left + num_sf_right` → `qty_sfc` derive path; just need the selector to resolve to the correct per-colour SKU instead of always `QS-SFC-B`.

---

### 3. QSHS: Louvre brackets (`QS-LB`)

Catalogue (p.12): `QS-LB` — 1× left + 1× right die-cast aluminium bracket per pack. Used to create a fixed louvre finish at 40° on 65mm slats. Available in all colours.

```
QS-LB-B, QS-LB-MN, QS-LB-G, QS-LB-SM, QS-LB-W,
QS-LB-BS, QS-LB-D, QS-LB-M, QS-LB-S
```

Also in Alumawood: `AW-LB-TR` (Terrain, already in `bayg.json`) and `QS-LB-MN` (for Island Grey).

**This is an optional accessory** — not auto-emitted in BOM. Add as a `product_component` but no corresponding rule needed. Can be added as a manual extra-item via the UI.

---

### 4. QSHS: Side frame mounting arm (`XP-ARMSF`)

Catalogue: `XP-ARMSF` (200mm wide) — welded fixing plates for mounting side frames off a substrate. Available in B, MN, G, SM, M (per QS catalogue) plus Silver (S) in Alumawood V4.

```
XP-ARMSF-B, XP-ARMSF-MN, XP-ARMSF-G, XP-ARMSF-SM, XP-ARMSF-M, XP-ARMSF-S
```

**Optional accessory** — not auto-emitted. Add as `product_component` in `qshs.json`. Also relevant to `xpl.json`.

---

### 5. QSHS: 65mm slat 6500mm extended pack lot (`XP-6500-E65`)

Catalogue: `XP-6500-E65` — 65mm slat 6500mm long, sold in pack lots of 96. Alloy 6063-T6.

All colours (same palette as `XP-6100-S65`):
```
XP-6500-E65-B, XP-6500-E65-MN, XP-6500-E65-G, XP-6500-E65-SM, XP-6500-E65-W,
XP-6500-E65-BS, XP-6500-E65-D, XP-6500-E65-M, XP-6500-E65-P, XP-6500-E65-PB, XP-6500-E65-S
```

**Rule note:** Currently the engine uses `XP-6100-S65` (6100mm) as the slat stock. For runs requiring 6500mm stock lengths, a separate rule path would be needed. For now, add as a `product_component` without auto-selection — this is a stock option rather than a default.

---

### 6. XPL: Missing extrusions — U-channel, F-section, Premium inserts

#### 6a. XPL U-channel (`XPL-6000-U`) — "Method 2" wall-to-wall install

Catalogue: `XPL-6000-U` — 6000mm, Alloy 6063-T5, 33mm wide × 30mm deep. Used as track for XPL side frames when installing between posts/pillars without visible fixings (Method 2).

All 9 colours (B, MN, G, SM, W, BS, D, M, S):
```
XPL-6000-U-B, XPL-6000-U-MN, XPL-6000-U-G, XPL-6000-U-SM, XPL-6000-U-W,
XPL-6000-U-BS, XPL-6000-U-D, XPL-6000-U-M, XPL-6000-U-S
```

#### 6b. XPL F-section (`XPL-6000-F`) — Method 2 alternative

Catalogue: `XPL-6000-F` — 6000mm, Alloy 6060-T5, 48mm × 32mm. Useful for void/cavity installations.

Same 9 colours:
```
XPL-6000-F-B, XPL-6000-F-MN, XPL-6000-F-G, XPL-6000-F-SM, XPL-6000-F-W,
XPL-6000-F-BS, XPL-6000-F-D, XPL-6000-F-M, XPL-6000-F-S
```

#### 6c. XPL Premium aluminium inserts (`XPL-2100-INS09`, `XPL-2100-INS20`)

Catalogue: 2100mm long aluminium inserts that slide into the XPL side frame to create a precise 9mm or 20mm spacing (the "Xpress Plus Premium" variant). Available in B, MN, G, SM, W, BS, D, M, S.

```
XPL-2100-INS09-B, XPL-2100-INS09-MN, XPL-2100-INS09-G, XPL-2100-INS09-SM, XPL-2100-INS09-W,
XPL-2100-INS09-BS, XPL-2100-INS09-D, XPL-2100-INS09-M, XPL-2100-INS09-S

XPL-2100-INS20-B, XPL-2100-INS20-MN, XPL-2100-INS20-G, XPL-2100-INS20-SM, XPL-2100-INS20-W,
XPL-2100-INS20-BS, XPL-2100-INS20-D, XPL-2100-INS20-M, XPL-2100-INS20-S
```

**Rule note:** Premium inserts are sold per 2100mm length and sized for the fence height. Required quantity = `ceil(target_height_mm / 2100)` per panel side frame. Add as an `accessory`-stage rule gated on `is_premium_insert` variable (new boolean `product_variable`).

**Constraint:** Premium inserts are only for 65mm slats, 9mm or 20mm gap. Add `product_validation` if `xpl_insert_type != null and slat_size_mm != 65 → error`.

---

### 7. XPL: 1000mm spacer block (`XPL-1000-BLOCK`)

Catalogue: `XPL-1000-BLOCK` — 1000mm long ABS snap-in block (single colour, black), used to set first-slat starting height in XPL posts, can be cut to any size. Pairs with `XPL-BLOCK-5PK` (100mm, already in seeds).

**No colour suffix** — single item.

Add as `product_component` in `xpl.json`. No auto-rule needed — this is specified per job based on the desired first-slat starting height. Can be manual extra-item.

---

### 8. XPL: Hinge panel brace screws (`XPL-SCHEX-12PK`)

Catalogue: `XPL-SCHEX-12PK` — 12Gx40mm self-drilling hex screws, 12 per pack. Used to brace the fence panel adjacent to a gate hinge post. Required when using the XPL post system next to a gate.

Available in B, MN, G, SM, W, BS, D, M, S.
```
XPL-SCHEX-12PK-B, XPL-SCHEX-12PK-MN, ... (all 9 colours)
```

**Rule note:** Emit 1× pack when `has_gate == true`. Add as companion rule on `qs_gate.json` (companion firing on any `XPL` fence type adjacent to a gate). For now, add as `product_component` in `xpl.json`; companion rule can be added in a later pass.

---

### 9. QS_GATE: Missing gate extrusions (rails, cover, infill, joiner hardware)

This is the most significant gap. The current `qs_gate.json` has the NEW `QSG-GATESF-65-*` side frame generation but is missing the matching horizontal rail extrusions and covers that form the gate frame.

#### 9a. Horizontal gate rails

`QSG-4800-RAIL65` — 4800mm top/bottom rail for 65mm horizontal slat gates.
`QSG-4800-RAIL90` — 4800mm top/bottom rail for 90mm horizontal slat gates.

Both in colours: B, MN, G, SM, W, BS, D, M, P, PB, S.

```
QSG-4800-RAIL65-B, QSG-4800-RAIL65-MN, QSG-4800-RAIL65-G, QSG-4800-RAIL65-SM,
QSG-4800-RAIL65-W, QSG-4800-RAIL65-BS, QSG-4800-RAIL65-D, QSG-4800-RAIL65-M,
QSG-4800-RAIL65-P, QSG-4800-RAIL65-PB, QSG-4800-RAIL65-S  (× 2 for RAIL90)
```

**Rule:** Each horizontal slat gate requires 2× rails (top + bottom), cut to gate width from the 4800mm stock. Rule: `qty = 2 * ceil(gate_opening_width_mm / 4800)` but practically always 2 for widths ≤ 2100mm.

#### 9b. Snap-on screw cover (`QSG-4200-COVER`)

Mates with gate side frame and rails to conceal slat fixing screws. 4200mm long.

Colours: B, MN, G, SM, W, BS, D, M, S.
```
QSG-4200-COVER-B, QSG-4200-COVER-MN, ... (all 9 colours)
```

**Rule:** 4× covers per single-swing gate (2 sides × top+bottom + 2 side frames). The actual cutting is from the 4200mm extrusion. Add as `component` rule: `qty = 4`.

#### 9c. Snap-in infill (`QSG-4800-INF`)

Fills unused channels in the gate side frame or rails. 4800mm long.

Colours: B, MN, G, SM, W, BS, D, M, S.

**Rule:** typically 2× per gate (one for each side frame's unused channel, or rails). Depends on configuration; add as optional manual item initially.

#### 9d. Curved infill for vertical slat gates (`QSG-4200-CINF`)

Used in vertical slat fabrication only. 4200mm, with extended channel for slat edge coverage. Not used in standard horizontal slat gates.

Add as `product_component`. Auto-select only when `slat_orientation == 'vertical'` (if this variable exists).

#### 9e. Gate frame cap (`QSG-GFC-50X50`)

CNC-machined flat cap for the 50×50mm gate side frame top. This may correspond to the existing `QSG-FTC-50` in seeds — **verify if these are the same product**. If different, add `QSG-GFC-50X50` and check whether `QSG-FTC-50` should be retired.

#### 9f. Rail screws (`AR-SCR-BR-50PK`)

Catalogue: `AR-SCR-BR-50PK` — SS304HC 12Gx25mm square-drive panhead screws, 50 per pack. Used to secure joiner blocks (`QSG-JOINER65-4PK`) to gate side frames.

**Not in seeds.** Seeds have `QSG-SC-10PK` and `QSG-RS-10PK` — one of these may be this product but the SKU doesn't match. If `QSG-RS-10PK` = rail screws, this is a naming discrepancy to resolve; if it's a 10-pack vs 50-pack, they're different quantities.

**Add `AR-SCR-BR-50PK` as product_component** in `qs_gate.json`.

#### 9g. Joiner blocks — naming discrepancy

Catalogue: `QSG-JOINER65-4PK`, `QSG-JOINER90-4PK` (4× joiner blocks per pack, includes 8× screws).
Seeds: `QSG-JBLOCK-65-4PK`, `QSG-JBLOCK-90-4PK`.

These appear to be the same product with different naming. **No new SKU needed** — seeds use `QSG-JBLOCK-*` which is the correct internal naming. Verify with Glass Outlet that `QSG-JBLOCK-65-4PK` = `QSG-JOINER65-4PK`.

Also add driver bits as product components (optional, non-BOM):
- `DB-PH3` — Phillips #3 driver bit (suits QSG-JOINER screws)
- `DB-SQ3.4` — Square 3.4mm driver bit (suits AR-SCR-BR screws)

---

### 10. BAYG: Island Grey colour variant

The Alumawood V4 catalogue introduces "Island Grey" (IG) as a new finish. Most BAYG extrusions use Monument (`MN`) powder coat for Island Grey jobs, but two slat SKUs have a dedicated IG finish:

**Missing from `bayg.json`:**
```
AW-5800-S65-IG   — 65mm slat, Island Grey, 5800mm
AW-5800-GB65-IG  — 65mm gate blade slat, Island Grey, 5800mm
```

**Also missing gate blades in KWI/WRC:** The seed has `AW-5800-S65-KWI` and `AW-5800-S65-WRC` (fence slats) but no gate blade variants for timber finishes:
```
AW-5800-GB65-KWI
AW-5800-GB65-WRC
```

**Rules for gate blades:** Gate blade slots (`AW-5800-GB65-*`) are strategically placed in the gate frame and screwed through their screw flutes. Used alongside regular slats for gate assembly. Add as `product_component` in `bayg.json`; the gate assembly rules in the Alumawood gate section would need their own gate product file (`bayg_gate.json`) eventually.

**For Island Grey (IG) finish:** Most Island Grey posts and accessories reuse the `MN` (Monument) coded SKUs from the QSHS/XP range. The product notes in `bayg.json` should document that Island Grey uses `XP-2400/6000-FP-MN`, `XP-TP-MN`, `XP-BP-SET-MN`, etc. rather than the Terrain (`TR`) variants.

Also missing a full Island Grey product variable option (`IG`) in `bayg.json`'s `colour` variable.

---

## P2 — Commonly Ordered Accessories (Add as Components, No Auto-Rules)

### 11. Cross-system: 65mm flat slat end caps (`XP-EC65-4PK`)

Catalogue: `XP-EC65-4PK` — ADC12 aluminium flat end cap, suits 65×16.5mm slats. Sold as 4-pack. Available in all colours + P/PB from select depots.

In Alumawood catalogue: `AW-EC65-TR-4PK` (Terrain), `AW-EC65-MN-4PK` (Monument for Island Grey). **The AW versions are already in `bayg.json`.**

Missing from `qshs.json` and `xpl.json`:
```
XP-EC65-4PK-B, XP-EC65-4PK-MN, XP-EC65-4PK-G, XP-EC65-4PK-SM, XP-EC65-4PK-W,
XP-EC65-4PK-BS, XP-EC65-4PK-D, XP-EC65-4PK-M, XP-EC65-4PK-P, XP-EC65-4PK-PB, XP-EC65-4PK-S
```

**Category:** `accessory`. No auto-rule — manual add via extra-items panel.

---

### 12. Cross-system: 90mm flat slat end caps (`XP-EC90-4PK`)

Same as above but for 90×16.5mm slats. Missing from `qshs.json`.

```
XP-EC90-4PK-B, XP-EC90-4PK-MN, XP-EC90-4PK-G, XP-EC90-4PK-SM, XP-EC90-4PK-W,
XP-EC90-4PK-BS, XP-EC90-4PK-D, XP-EC90-4PK-M, XP-EC90-4PK-S
```
(Alumawood: `AW-EC90-TR-4PK` — already in `bayg.json`.)

---

### 13. Cross-system: Federation topper (`XP-FEDTOP-4PK`)

Catalogue: `XP-FEDTOP-4PK` — ADC12 aluminium federation-style topper for 65mm slats. Creates a vertical picket-fence look. Available in W (Pearl White) and M (Mill) only.

```
XP-FEDTOP-4PK-W
XP-FEDTOP-4PK-M
```

Add to `qshs.json`. Optional accessory, no auto-rule.

---

### 14. Cross-system: Adjustable post foot (`XP-FOOT-ADJ`)

Catalogue: `XP-FOOT-ADJ` — appears in both QS and Alumawood catalogues near VS/QSHS section. Used for surface-mount post adjustment. Colours: limited (from context appears to be MN/B range). Exact colour variants unclear from catalogue extract.

Add as single-colour or investigate at ordering stage. Category: `accessory`.

---

### 15. XPL: CSR mounting arm (`XP-ARMCSR`)

Alumawood V4 (p.33): `XP-ARMCSR` — shorter arm variant designed specifically for centre support rail mounting alongside XPL side frames with 200mm side frame support arms. Available in B, MN, G, SM, W, M.

```
XP-ARMCSR-B, XP-ARMCSR-MN, XP-ARMCSR-G, XP-ARMCSR-SM, XP-ARMCSR-W, XP-ARMCSR-M
```

Add to `xpl.json`. Optional accessory.

---

### 16. QS_GATE: Gate stop rubber (`XP-GATESTOP-RUB`)

Catalogue: `XP-GATESTOP-RUB` — rubber extrusion 4300mm long, feeds into cavity in `XP-4200-GSTOP`. Used as bumper. Not colour-specific.

**Missing from `qs_gate.json`.** Add as single `product_component`.

---

### 17. QS_GATE: Gate frame rivet (`XP-GATESTOP-RIV-10PK`)

Catalogue: `XP-GATESTOP-RIV-10PK` — 4.0×8.4 countersunk aluminium rivets, 10 per pack. Required when using Lockwood 001 deadlatch with lockbox (due to 3mm gap requirement where screw heads would interfere).

**Missing from `qs_gate.json`.** Add as single `product_component`. Optional conditional.

---

### 18. QS_GATE: Gate lock hardware

The following gate lock hardware is **missing from `qs_gate.json`**:

| SKU | Name | Notes |
|-----|------|-------|
| `XP-DL001` | Lockwood 001 deadlatch | Inwards-swing only; suits metal frames |
| `XP-HDL-LW534` | Lockwood round knob set | Satin Chrome, keyed both sides |
| `XP-HDL-KNOB` | Stanley round knob set | SS304, keyed both sides |
| `XP-HDL-LEVER` | Stanley lever set | SS304, keyed both sides |
| `XP-HDL-ES` | Electric striker kit | 12V DC, left or right handing |
| `XP-PACKER` | Nylon packer | For D&D Lokk Latch Deluxe only |
| `XP-GFC-B`, `XP-GFC-MN` | Gate frame cap (nylon) | May be same as `QSG-FTC-50` — verify |
| `XP-GKIT-LSET09` | 9mm gate lockbox kit (lever/knob) | Contains 2× GSF, 2× inserts, stops, rubber, caps, screws |
| `XP-GKIT-LSET20` | 20mm gate lockbox kit (lever/knob) | Same but 20mm spacing |
| `AW-LBOX-DL-TR` | AW deadlatch lockbox (Terrain) | For Alumawood gates; pairs with `AW-4200-GSF*` |
| `XP-SCREWS-B`, `XP-SCREWS-MN` | 10Gx16mm wafer screws, 100-pack | Colour-coded variant of `XP-SCREWS` |
| `XP-SCREWSGF-10PK` | 12Gx65mm hex flange gate screws | For securing gate slats to side frames |

Note: `ML-TL`, `ML-TL-KF-H-FT`, `ML-TL-TC-H-AT`, `ML-TL-W` (D&D Magna Latch variants) are already in `qs_gate.json` — these are fine.

---

### 19. Timber/concrete fixing hardware (cross-system)

Alumawood V4 (p.116): Two base fixing kits relevant to all systems:

| SKU | Name | Description |
|-----|------|-------------|
| `S-110LAG-4PK` | Timber lag kit 4-pack SS316 | M10×110mm lag screws, nuts, washers |
| `S-120ROD-4PK` | Concrete threaded rod kit 4-pack SS316 | M10×120mm rods, nuts, washers |

Both suit the fixing holes in Alumawood base plates (`AW-BP-SET-TR`, `AW-65BP-SET-TR`). Add to `bayg.json` (and cross-ref in `qshs.json` notes). Category: `hardware`.

---

### 20. Post plugs (`SS-POSTPLUG-4PK`)

Catalogue: `SS-POSTPLUG-4PK` (Black) and `SS-POSTPLUG-4PK-W` (White) — Ø32mm outer cap, suits posts when fixing posts to structures via holes. Minor accessory.

Add to `qshs.json` and `xpl.json`. Category: `accessory`.

---

### 21. Self-drilling tek screws (`SS-TS-100`)

Catalogue: `SS-TS-100` — 12Gx20mm hex head tek screws, bags of 100. Colours: B, G, MN, P, PB, S, SM, W. Used for XPL side frame fixing to U/F channel.

Add to `xpl.json`. Category: `hardware`.

---

## P3 — Whole New Product Families

### 22. QS Sliding Gate System (`XPSG-*`)

This is an **entirely new product family** absent from all seed files. The QS catalogue (pp.56-68) and Alumawood V4 (pp.150-155) document the full sliding gate system.

#### Sliding gate extrusions

| SKU | Name | Notes |
|-----|------|-------|
| `QSG-S-6100-TR65` | Sliding gate top rail 65mm, 6100mm | Colour-coded |
| `QSG-S-6100-TR90` | Sliding gate top rail 90mm, 6100mm | Colour-coded |
| `QSG-S-6100-BR` | Sliding gate bottom rail, 6100mm | Colour-coded |
| `XPSG-2700-ST65-B` | 65×65mm galvanised steel post, 2700mm | Black only; includes press-in cap; welded base plate |
| `AWSG-MXTN-KIT` / `XPSG-MXTN-KIT-MN` | 400mm bottom rail extension kit | Optional; for motor rack space |

#### Sliding gate track & rollers

| SKU | Name | Notes |
|-----|------|-------|
| `XPSG-3000-TRACK-ST` | Steel track 3000mm | Galvanised, 3mm, pre-drilled |
| `XPSG-6000-TRACK-ST` | Steel track 6000mm | Galvanised, 3mm |
| `XPSG-6000-TRACK-AL` | Aluminium track 6000mm | Mill finish, 6063-T5 |
| `XPSG-ANCHOR` | Track anchor pins | Mushroom-head galvanised, 6.5×38mm |
| `XPSG-WHEEL` | Sliding gate wheel | 80mm Ø, 20mm groove, 180kg rating |
| `XPSG-WHEEL-CS` / `QSG-S-WHEEL-CS-2PK` | Wheel clamping set | 2-pack; clamps wheel to bottom rail |
| `XPSG-GUIDE` | Self-adjusting slide guide | Attaches to top rail, 280mm vertical adjustment |
| `XPSG-TOPROLL-2PK` | Top guide rollers | 2-pack, alternative to SlideGuide |

#### Sliding gate catches & stops

| SKU | Name |
|-----|------|
| `XPSG-CATCH-U` | U-catch (steel zinc plated) |
| `XPSG-CATCH-F` | F-catch (steel zinc plated; F-section attaches to wall/post) |
| `XPSG-STOP` | Gate stop (forged steel, bolts to concrete) |

#### FILO gate automation (optional extras)

| SKU | Name |
|-----|------|
| `XPSG-FILO-400` | NiceHome Filo 400 Pro kit (motor + 2× remotes + photocells) |
| `XPSG-FILO-400PRO-SP` | Filo 400 Pro with split pack (external transformer) |
| `XPSG-FILO-REMOTE` | Additional remote control |
| `XPSG-FILO-WKP` | Wireless keypad |
| `XPSG-FILO-SOLAR` | Solar power kit |
| `XPSG-FILO-BATTERY` | Backup battery |
| `XPSG-FILO-RACK` | Nylon rack (1m sections, steel core) |

**Implementation:** Create a new `supabase/seeds/glass-outlet/products/xpsg_gate.json` with `product_type: "gate"` and `compatible_with_system_types: ["QSHS", "XPL", "VS", "BAYG"]`. Add `product_components` for all above SKUs. Rules for sliding gate BOM (track length from opening width, rail stock counts, etc.) to be spec'd separately. For now, add components only; rules are a follow-up.

---

### 23. Alumawall (`AWALL-*`)

Extruded aluminium stackable sleepers designed for use under steel panel fences or as retaining wall sleepers. A standalone product, not integrated with slat systems.

| SKU | Colour | Name |
|-----|--------|------|
| `AWALL-2385-P` | Primrose | Stackable sleeper 2385mm |
| `AWALL-2385-PB` | Paperbark | Stackable sleeper 2385mm |
| `AWALL-2385-G` | Woodland Grey | Stackable sleeper 2385mm |
| `AWALL-2385-MN` | Monument | Stackable sleeper 2385mm |
| `AWALL-1700-1W-P` | Primrose | Retaining wall post 1700mm |
| `AWALL-1700-1W-PB` | Paperbark | Retaining wall post 1700mm |
| `AWALL-1700-1W-G` | Woodland Grey | Retaining wall post 1700mm |
| `AWALL-1700-1W-MN` | Monument | Retaining wall post 1700mm |
| `AWALL-TP-G` | Woodland Grey | Top plate for post |
| `AWALL-TP-MN` | Monument | Top plate for post |
| `AWALL-TP-P` | Primrose | Top plate for post |
| `AWALL-TP-PB` | Paperbark | Top plate for post |

**Implementation:** Add to `other.json` as inactive placeholder SKUs (`active: false`), or create `awall.json` if a full product system is desired. No BOM rules needed for now — this is a separate selling family.

---

## P4 — Nice-to-Have (Catalogued but Low BOM Priority)

### 24. Touch-up paint (`PAINT-*`)

Catalogue: `PAINT-B/G/MN/S/SM/W/BS/D` — 150g spray cans. Not typically included in automated BOM. Add as `product_component` in `other.json` or the relevant fence JSON as inactive line items.

---

### 25. Concrete products (grouts)

Catalogue: `GROUT-RSC`, `GROUT-CONCRETE`, `GROUT-SIKA`, `GROUT-BOS` — 20kg bags of various concrete/grout products. Add to `other.json`. Not auto-included in BOM.

---

### 26. POSTA letterboxes

Catalogue has an extensive range of POSTA-branded letterboxes (FML, BLK, SS316, STUD variants) plus address numbers (`POSTA-BLK-H050-0` through letter `C`, etc.). These are covered by `other.json` as inactive items currently. A full POSTA expansion would be a separate project.

---

## Rules & Constraints to Reconcile

### A. XPL slat cut deduction (important accuracy fix)

The Alumawood V4 catalogue specifies slat cut deductions:
- Into a **1-way post**: −10mm  
- Into a **90° post (one side)**: −15mm  
- Into a **90°–90° post (both sides)**: −20mm

Current `xpl.json` rules reference "24mm insertion depth" and "−15mm fence panel slat cut deduction" — which corresponds only to the 90° case. **The 1-way post (−10mm) and two-90°-post (−20mm) cases are not explicitly handled.** This affects cut lengths and therefore stock material counts.

**Fix needed:** Add context variables `left_insert_depth_mm` and `right_insert_depth_mm` (10mm for 1-way, 15mm for 90° corner, 20mm for 90°–90°). Sum them to get total slat deduction per panel. Update `slat_cut_mm` derive rule in `xpl.json`.

### B. QSHS height formula verification

The catalogue (p.10) provides an explicit height table for 65mm slats at 5mm/9mm/20mm spacing. For example:
- 5 slats at 5mm gap → 348mm; 5 slats at 9mm gap → 364mm; 5 slats at 20mm gap → 408mm

Using the catalogue formula: `height = n × slat_size + (n−1) × gap + top_gap`

The current engine uses `ceil((target_height_mm - slat_gap_mm) / (slat_size_mm + slat_gap_mm))`. Verify against the table that the formula is producing consistent results — particularly at boundary values.

### C. BAYG Island Grey constraints

`BAYG` currently has `colour` options `["KWI", "WRC"]`. Island Grey (`IG`) needs to be added as a valid colour option. However:
- IG slats are `AW-5800-S65-IG` but all posts/accessories are the `MN` (Monument) QSHS/XP variants, not AW-branded  
- 90mm slats are **WRC-only** — no 90mm IG slat exists in catalogue  
- Add validation: `colour == 'IG' and slat_size_mm == 90 → error`

### D. QSG gate — horizontal vs vertical slat validation

The QSG system supports both horizontal and vertical slat orientations:
- Option 1: Horizontal (up to 2100mm wide)
- Option 2: Vertical with curved infill `QSG-4200-CINF` (up to 1200mm wide)  

These width constraints are already implied in the existing product variables but the `QSG-4200-CINF` component should be gated on vertical slat orientation.

---

## Implementation Order

1. **QSHS additions** (add to `qshs.json`):
   - `XP-6000-135-{colour}` × 9
   - `QS-SFCAP-{colour}-2PK` × 7 (and decide on `QS-SFC-B` renaming)
   - `QS-LB-{colour}` × 9
   - `XP-ARMSF-{colour}` × 6
   - `XP-6500-E65-{colour}` × 11
   - `XP-EC65-4PK-{colour}` × 11 (shared with XPL, can also add to XPL)
   - `XP-EC90-4PK-{colour}` × 9
   - `XP-FEDTOP-4PK-W`, `XP-FEDTOP-4PK-M`

2. **XPL additions** (add to `xpl.json`):
   - `XPL-6000-U-{colour}` × 9
   - `XPL-6000-F-{colour}` × 9
   - `XPL-2100-INS09-{colour}` × 9 + new product_variable `xpl_insert_type`
   - `XPL-2100-INS20-{colour}` × 9
   - `XPL-1000-BLOCK` × 1
   - `XPL-SCHEX-12PK-{colour}` × 9
   - `XP-ARMCSR-{colour}` × 6
   - Fix slat cut deduction for 1W vs 90° vs 90°–90° posts

3. **BAYG additions** (add to `bayg.json`):
   - Add `IG` to colour variable + note on using MN-coded posts/accessories
   - `AW-5800-S65-IG`, `AW-5800-GB65-IG`
   - `AW-5800-GB65-KWI`, `AW-5800-GB65-WRC`
   - `S-110LAG-4PK`, `S-120ROD-4PK`
   - Add `colour == 'IG' and slat_size_mm == 90 → error` validation

4. **QS_GATE additions** (add to `qs_gate.json`):
   - `QSG-4800-RAIL65-{colour}` × 11, `QSG-4800-RAIL90-{colour}` × 11
   - `QSG-4200-COVER-{colour}` × 9
   - `QSG-4800-INF-{colour}` × 9
   - `QSG-4200-CINF-{colour}` × 9
   - `AR-SCR-BR-50PK`
   - `XP-GATESTOP-RUB`, `XP-GATESTOP-RIV-10PK`
   - `XP-DL001`, `XP-HDL-LW534`, `XP-HDL-KNOB`, `XP-HDL-LEVER`, `XP-HDL-ES`
   - `XP-PACKER`, `XP-GFC-B`, `XP-GFC-MN` (verify vs `QSG-FTC-*`)
   - `XP-GKIT-LSET09`, `XP-GKIT-LSET20`, `AW-LBOX-DL-TR`
   - `XP-SCREWS-B`, `XP-SCREWS-MN`, `XP-SCREWSGF-10PK`
   - Add gate rail quantity rules

5. **New file: `xpsg_gate.json`** — sliding gate system:
   - All `XPSG-*` + `QSG-S-*` SKUs from Section 22
   - No calculation rules yet — components only pass

6. **`other.json` / `awall.json`** — Alumawall, touch-up paint, grouts (low priority)

---

## SKU Count Summary

| Product | New SKUs to Add |
|---------|----------------|
| QSHS | ~70 |
| XPL | ~75 |
| BAYG | ~10 |
| QS_GATE | ~85 |
| XPSG_GATE (new file) | ~25 |
| Other/Alumawall | ~20 |
| **Total** | **~285 new SKUs** |
