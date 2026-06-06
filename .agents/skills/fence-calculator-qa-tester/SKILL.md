---
name: fence-calculator-qa-tester
description: Quality-assurance methodology for any fence BOM calculator — audits calculation accuracy against source-of-truth spreadsheets, CSV pricelists, seed JSON, catalogues, and app output. Includes a 7-step testing workflow, report-shape template, source-priority resolution order, and a canonical high-risk-check list for slats, frames, posts, gates, and quantity-break pricing.
---

# Fence Calculator QA Tester

A reusable QA methodology for any Anyfence calculator (treated pine, Colorbond, glass pool, aluminium slat, picket, tubular, etc.) and for The Glass Outlet's QuickScreen app.

## Mission

- Compare calculator BOM output against source-of-truth spreadsheets, catalogue formulas, seed JSON, and CSV pricelists.
- Report what works, what is wrong, what is unverified, and what calculators still need to be created.
- Prioritise quantity defects over visual polish — wrong material counts cost real money.
- Preserve evidence: workbook name, sheet name, cell / formula / table reference, catalogue page, CSV row, seed file path, app scenario.

## Source-priority resolution order

When sources disagree, use this order to decide which is canonical:

1. **Worked example from the calculator's spec doc** — what the calculator was built to produce.
2. **Source-of-truth Excel / XLSM** — formulated spreadsheet from the supplier or domain expert.
3. **Supplier catalogue / brochure** — the canonical printed reference.
4. **Seed JSON** — what the engine actually reads at runtime.
5. **CSV pricelist** — pricing only; never quantity rules.
6. **App BOM output** — the thing under test; never the source of truth.

Mismatches between (1) and (6) are **bugs**. Mismatches between (2) and (4) are **seed-data drift**. Both get flagged separately.

## 7-step testing workflow

1. **Inventory available evidence.** Workbooks, catalogues, CSVs, seed files, app scenarios — list what exists and which product / system each covers.
2. **Extract relevant formulas and tables** for the current product slice from the source spreadsheets.
3. **Build small hand-checkable scenarios first** before large matrix tests. A 30m straight run with one gate beats a 7-section L-shape with mixed systems for first-pass debugging.
4. **Compare formulas against engine code and generated BOM lines** line by line. Match SKU, quantity, unit price, line total.
5. **Check stock optimisation.** BOM quantity must usually be purchasable stock lengths or packs, not finished cut pieces. Slats are 6100mm stock; side frames are 5800mm; QSG rails are 4800mm.
6. **Check pricing.** Unit price source, quantity-break tier logic, GST handling, grand total.
7. **Record missing calculators and data gaps separately from bugs.** Coverage gaps are roadmap items; bugs are regressions.

## Report shape

Use these sections, in this order:

1. **Executive summary** — pass / fail, key metric (e.g. "12 of 14 scenarios match within $1; 2 quantity defects").
2. **Working calculations** — what was verified and how.
3. **Confirmed defects** — quantity / price differences with source citation and reproduction steps.
4. **Suspected defects** — need source confirmation to call them bugs.
5. **Missing calculators / product families** — coverage gaps (not bugs).
6. **Recommended next tests** — prioritised by risk and revenue impact.
7. **Evidence references** — file paths, sheet names, cell refs, catalogue pages, seed JSON paths.

## High-risk checks — slat / screen systems (QSHS, VS, XPL, BAYG)

- **Slats** — stock lengths required vs finished slat pieces. BOM must order purchasable 6100mm stock, not cut pieces.
- **Side frames / CFC / F-sections** — stock-optimised from 5800mm cut lengths.
- **Centre Support Rail (CSR)** — threshold is by panel width, not run width. A 6m run as 3×2m panels does NOT trigger CSR; a 6m run as 1×6m panel does.
- **Spacers / screws** — pack rounding. Spacers ship in 50-packs; screening screws in 100-packs (not 50). Gate-frame screws are a separate SKU (10-pack).
- **Posts** — count by boundaries / corners / gates / walls AND mounting type. Post-to-post terminations use side frames; post-to-wall uses F-section. Each gate breaks the run.
- **Mount accessories** — auto-add (base plates + domical covers + dress rings) must match the mounting method exactly. Forget the cover and the install fails.
- **Colours** — slat colour vs post colour override. Alternate post colour cascades from run-level to section-level with override semantics.
- **Quantity-break pricing** — which tier triggers and whether the applicable break maps to the customer's qty correctly. Tier 2 ≈ Tier 1 × 0.85; Tier 3 ≈ Tier 1 × 0.80 (varies by product).
- **SF caps** — sold individually as `QS-SFC-B` (black only), 2 per side frame. Not packs.
- **2400mm posts include cap, 6000mm/5800mm posts do NOT** — order caps separately for long posts.
- **Sliding-gate rails vs pedestrian-gate rails** are different SKUs (`XPSG-6100-TR/BR` vs `XP-6100-HD6545`). Do not mix.
- **No 90mm gate blade exists** — all gates use `XP-6100-GB65` regardless of fence slat size.

## High-risk checks — paling, Colorbond, picket, other AU fence types

- **Paling overlap** — 6mm convention. `cuts_per_run = ceil(run_length_mm / (paling_width_mm - 6))`. A 30m run with 150mm palings = ⌈30000/144⌉ = 209 palings.
- **Treatment class** — H4 in-ground, H3 above-ground for treated pine. BAL-FZ prohibits combustible fencing within 6m of the home.
- **Post-hole depth** — minimum 600mm (more in expansive clay or windy zones).
- **Pool-gate hardware** — MagnaLatch + TruClose is the AS1926-compliant default for every pool gate. Without it, the quote is non-compliant. SKU `TC-CAPS3` is optional and must NOT auto-add.
- **Colorbond panel format** — 1800mm H × 2360mm W standard. Each panel = 3 infill sheets + 2 posts + 2 rails. Check the BOM enforces this ratio.
- **Pool fence height / latch height** — AS1926 minimum height 1200mm, minimum latch height 1500mm, gates swing outward away from pool. Calculator should `block_quote` (not `warn`) on violations.

## Backward-compatibility check

When a calculator is extended (e.g. `paling_style` added butted + lapped_capped to `treated-pine-paling-fence-calculator`):

- Run the prior default input through the new version.
- A byte-identical BOM output for the default-path call confirms no regression.
- Diff the output. Any change is a regression unless intentional.

## What NOT to QA here

- Visual polish (chevron alignment, hover states) — that's UI QA, covered by `fence-calculator-ui-conventions`.
- Map / canvas rendering accuracy — same skill.
- Wording of friendly help text shown to end users.
- Whether the supplier's catalogue itself is correct — that's a supplier issue, not a calculator bug.

## Handoffs

- After QA flags missing SKUs / data → pair with `supplier-catalogue-extractor` to fill the gaps.
- After QA flags seed-data drift → pair with `quickscreen-seed-data-conventions` (Glass Outlet) or `anyfence-fence-config-schema` (Anyfence).
- After QA flags compliance violations → pair with `au-fence-compliance-rules`.
