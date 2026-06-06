# Fence Forge — review request: Amazing Fencing price-book build

**From:** Build Forge (supplier-side wizard)
**Re:** Amazing Fencing tier-2 price book (736 lines across 4 systems) built from Cin7 exports
**What I need:** canonical-name ratification, archetype confirmations, and a few BOM-kernel calls. The price book works today via own-SKU passthrough — these items are about making the canonical layer + new systems contract-grade.

---

## A. Canonical names to ratify (I propose → you confirm into contract)

1. **Timber (status: contract — sanity check only).** Followed the locked contract, e.g. `100x75 Treated Pine Post 2400mm`, `75x38 Treated Pine Rail 4800mm`, `2.5x57mm Ring Shank Gal Coil Nail`, `Rapid Set 30kg`. 52 SKUs. Please confirm no drift.

2. **Colorbond (status: PROPOSED — needs ratifying).** 568 SKUs. Proposed pattern:
   - Infill: `Colorbond Infill Sheet {Metzag|Metline} {height}mm {colour}`
   - Post: `Colorbond C-Post {length}mm {colour}`
   - Rail: `Colorbond Fence Rail {baywidth}mm {colour}`
   - Cap: `Colorbond Post Cap {colour}`
   - Panel: `Colorbond Pre-Made Panel {height}mm {colour}`
   - Gate: `Colorbond {Single|Double} gate {size} {colour}`
   - **Q:** Do these match `colorbond_fence_system_config.json`? See item C2 re profile-in-name vs profile-as-variable.

3. **Composite (status: PROPOSED — new).** 41 SKUs, two brands. Pattern: `{SuperPost|TUFFPOLY} {C-Post|H-Post|Sleeper|Plinth|Cap|Bracket} {size} {colour}`. Needs a naming convention you're happy to own (see B2).

4. **Aluminium (status: PROPOSED — blocked on architecture).** 75 SKUs across ≥5 sub-systems. Holding naming until C1 is decided.

---

## B. New archetypes / system_types needed

1. **Timber-paling archetype** — Liam confirmed it needs creating. Currently no timber archetype exists in the platform (all seeded systems are aluminium/glass/Colorbond).
2. **Composite retaining archetype** — SuperPost/TUFFPOLY is a **post-and-sleeper retaining-wall system**, not an infill fence. Needs its own archetype + geometry (sleepers-per-metre by wall height, post spacing, caps, brackets). Different BOM kernel — your domain.
3. **Aluminium slat** — does the existing Glass-Outlet aluminium-slat archetype (QSHS/VS/XPL/BAYG) cover Amazing's Lifestyle/Quickscreen slats, or do they get their own archetype/instances?

---

## C. Architecture / data-model questions

1. **Aluminium sub-system split.** The 75 aluminium SKUs span: Quickscreen gate system (20), Posts (14), Slat (10), Lifestyle slat (10), DIY kits (5), Xpress (4), Prefab panels (3), Gates (3), Balustrade (1). Should these be **separate instances** or one `amazing-aluminium`? This decides the canonical naming in A4.
2. **Profile: in the name or a variable?** Colorbond infill comes in **Metzag (76 SKUs) and Metline (70 SKUs)** profiles. The existing COLORBOND config uses a profile enum (GO-Line/GO-Zag/GO-Trim). Should Metzag/Metline be a `profile` variable (preferred, matches config) rather than baked into the canonical name? I encoded it in the name as a placeholder — your call.
3. **Brand discrepancy (flag).** Project notes assumed Amazing's Colorbond was Gramline/Lysaght/Oxworks/ColorMAX. The actual Cin7 data is **Metroll (493) + BlueScope (17)**. Please reconcile the supplier record.

---

## D. BOM-math / kernel calls (your domain)

1. **Composite retaining BOM** — sleepers-per-metre by height, post spacing, cap/bracket counts. New geometry; needs a kernel formula.
2. **Aluminium slat BOM** — slat gap (5/9/20mm) and slat size (65/90mm) drive slats-per-height. Confirm the cuts/spacing formula.
3. **Colorbond engine_params** — confirm `infill_sheets_per_panel` (bay 2365 = 3, bay 3125 = 4), `rails_by_height`, `post_length_by_height` against Amazing's actual sizes (infill heights 1190/1490/1790/2090/2390; posts 1500–3300; bays 2365/3125).

---

## E. Data fixes already applied (FYI — flag if you disagree)

- Timber paling typos corrected (Liam-approved): `PL100x16x1200` $0.33 → **$1.33**; `PL100x16x2100` $0.00 → **$2.15**.

---

## F. Reference artifacts (this thread)

- Full consolidated price book: `amazing_fencing_pricebook_FULL.{csv,json}` (736 lines: 568 Colorbond, 75 aluminium, 52 timber, 41 composite).
- Per-system CSVs: colorbond / timber / composite / aluminium.
- Codex `brief_047_amazing_colorbond_pricebook.md` (price-book seed + timber fixes).
- Spec doc: "Amazing Fencing — Colorbond + Timber tier-2 price book (spec)".
- Validation: worked quote 30m × 1800mm Colorbond Monument + gate = $1,295.46 ex / $1,425.01 inc GST.

---

## Priority order suggestion

1. Ratify **Colorbond** canonical names + profile decision (C2) → unblocks brief 047 publish.
2. Confirm **timber-paling archetype** creation (B1) → unblocks the already-priced timber instance.
3. Decide **aluminium split** (C1) → unblocks aluminium naming.
4. **Composite archetype + BOM** (B2/D1) → lowest urgency (retaining is a side category).
