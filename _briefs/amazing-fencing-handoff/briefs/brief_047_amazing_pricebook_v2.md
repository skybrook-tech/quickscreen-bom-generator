# Brief 047 — Amazing Fencing: Colorbond tier-2 price book + timber paling fixes (v2, Fence-Forge-ratified)

**Type:** seed data + price book (SQL)
**Depends on:** 032, 033, 034, 045, 046
**Ship via:** Codex brief queue (paying-customer pricing → PR + Netlify preview + iPhone review gate)
**Protected files:** do NOT touch `localBomCalculator.ts`
**Status:** CLEARED TO PUBLISH by Fence Forge 2026-06-05 (rounds 1–3). All canonical names ratified.

---

## Objective

1. **Add the Colorbond tier-2 price book** (568 SKUs) to the `amazing-colorbond` instance (was "pricing pending"). Source: Cin7 exports 2026-06-03.
2. **Correct two timber paling prices** in brief 046 (from the 2026-05-26 export):
   - `PL100x16x1200`: $0.33 → **$1.33** (typo)
   - `PL100x16x2100`: $0.00 → **$2.15** (missing; interpolated, Liam-approved)
3. **Add two new concrete canonical names** (additive, Fence-Forge-confirmed): `Rapid Set Concrete 30kg`, `Post Mix Concrete 30kg`.
4. **Set `concrete_bag_size_kg: 30`** on Amazing's instance config (they don't stock 20kg).

Convention: Cin7 `BuyPriceEx` = tier-2, ex-GST. GST inc = ex × 1.10. Supplier's own SKUs (own-SKU passthrough); `canonical_name` join additive.

Seed: `brief_047_seed_timber_colorbond.csv` (620 lines: 52 timber + 568 Colorbond).

---

## Canonical naming (Fence Forge ratified — apply exactly)

```
Colorbond infill:  {height}mm {Metzag|Metline} Colorbond Infill Sheet {colour}
Colorbond post:    Colorbond C-Post {length}mm {colour}
Colorbond rail:    Colorbond Fence Rail {bay_width}mm {colour}
Colorbond cap:     Colorbond Post Cap {colour}
Colorbond panel:   {height}mm Colorbond Pre-Made Panel {bay_width}mm {colour}
Colorbond gate:    {width}x{height}mm Colorbond {Single|Double} Gate {colour}

Timber:            per locked contract (e.g. 100x75 Treated Pine Post 2400mm,
                   75x38 Treated Pine Rail 4800mm, 2.5x57mm Ring Shank Gal Coil Nail)
Concrete (NEW):    Rapid Set Concrete 30kg, Post Mix Concrete 30kg, General Purpose Cement 20kg
```

Profile (Metzag/Metline) is IN the name, not a variable (Fence Forge C2). 568 Colorbond SKUs across 18–20 colours; rail bays 2365/3125; infill heights 1190/1490/1790/2090/2390.

---

## Implementation

1. New **append-only** `supplier_price_book` version for Amazing Fencing — do NOT mutate the 046 version (existing quotes stay pinned).
2. Upsert `supplier_products` (620 SKUs: timber + Colorbond) with `canonical_name` joins per the ratified patterns.
3. Insert `supplier_prices` (tier-2 ex-GST) for all 620 lines.
4. Apply the two timber price fixes in this new version.
5. Set `system_instances.config.concrete_bag_size_kg = 30` for every Amazing instance with concrete in the BOM (timber-paling, and any future Colorbond-with-concrete).
6. Pin the new version active for `amazing-colorbond` + `amazing-timber`.

### Concrete kernel dependency (round 3)

Fence Forge parameterised the treated-pine concrete math (`concrete_helpers.py`: 1.0 bag/post for 30kg vs 1.5 for 20kg). **The registered skill is still on the old version pending Liam's SKILLCONFIG save.**
- Until Liam saves: keep a `concrete_bag_size_scaling_pending` annotation on Amazing's concrete pricing rules (skill still emits 20kg / 1.5-per-post).
- Once Liam saves: drop the annotation; `concrete_bag_size_kg: 30` drives correct names + counts automatically.

---

## Acceptance criteria

- [ ] New append-only price-book version; 046 version untouched.
- [ ] 620 `supplier_prices` rows (52 timber + 568 Colorbond), zero null prices.
- [ ] `PL100x16x1200` = $1.33; `PL100x16x2100` = $2.15.
- [ ] `Rapid Set Concrete 30kg` + `Post Mix Concrete 30kg` present as canonical names.
- [ ] `amazing-*` instances with concrete carry `config.concrete_bag_size_kg = 30`.
- [ ] Colorbond canonical names match the ratified patterns above (profile-in-name).
- [ ] Worked quote regression passes (below).
- [ ] No changes to `localBomCalculator.ts`.

## Worked quote (regression target) — post-30kg-kernel

**30m × 1800mm Colorbond Monument + 1 single gate, tier-2:**

| Line | SKU | Qty | Unit ex | Line ex |
|---|---|---|---|---|
| 1790mm Metzag Colorbond Infill Sheet Monument | FZSMO17 | 39 | $16.30 | $635.70 |
| Colorbond C-Post 2400mm Monument | FNPMO24 | 14 | $8.56 | $119.84 |
| Colorbond Fence Rail 2365mm Monument | FRMMO23 | 26 | $8.45 | $219.70 |
| Colorbond Post Cap Monument | CCAPMO | 14 | $2.25 | $31.50 |
| Colorbond Single Gate Monument | — | 1 | $82.92 | $82.92 |
| Post Mix Concrete 30kg | DMPM3056LD | 14 | $9.80 | $137.20 |
| **Materials ex GST** | | | | **$1,226.86** |
| **GST** | | | | **$122.69** |
| **Total inc GST** | | | | **$1,349.55** |

(Concrete = 14 bags @ 1.0/post for 30kg. Pre-kernel stub was 21 bags @ 1.5/post for 20kg → $205.80. BOM quantities from the Colorbond calculator's documented 30m×1800mm+gate example; engine math owned by Fence Forge.)

---

## Changelog (for audit trail)

- Timber paling typos corrected (Liam-approved): 1200mm $0.33→$1.33; 2100mm $0.00→$2.15.
- Colorbond canonical ordering aligned to contract (size-first; profile-in-name).
- New concrete canonicals: Rapid Set Concrete 30kg, Post Mix Concrete 30kg.
- Amazing instance config: concrete_bag_size_kg = 30.
- Brand record corrected: Amazing Colorbond = Metroll (+ small BlueScope tail), not Gramline/Lysaght/ColorMAX.

## Follow-on briefs (NOT in 047)

- **048** — Composite retaining price book (41 SuperPost/TUFFPOLY SKUs) — pending `composite-retaining-wall-calculator` archetype.
- **049** — Aluminium slat price book (34 ratified slat SKUs) — pending `aluminium-slat-fence-calculator` archetype.
- **050** — Aluminium gate + remaining subsystems (41 pending-archetype SKUs) — pending `aluminium-gate-calculator` spec.
