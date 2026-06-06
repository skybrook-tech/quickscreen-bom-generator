# Amazing Fencing — pilot supplier context

Amazing Fencing is the **only** supplier in this handover. Every customer-facing surface should read as Amazing Fencing primary, Anyfence platform secondary.

## Business

- **Brand**: Amazing Fencing
- **Phone**: 1800 739 359
- **Install + supply business**: amazingfencing.com.au
- **Sister supply-only business**: fencing-supplies.com.au
- **Coverage**: Multi-state contractor + supplier hybrid (NSW, VIC, QLD, Gold Coast metros — Sydney / Melbourne / Brisbane / Gold Coast)
- **Years in business**: ~30
- **Depot for this pilot**: Currimundi (Sunshine Coast QLD)

## Modes offered for the pilot calculator

- **Supply only** — customer picks up materials from the depot (or has them delivered, separate brief)
- **Supply + install** — Amazing Fencing's own install crew does the job

Both modes available on Timber Paling at launch. Customer toggles between them on the entry-page price bubble.

## First fence type in the pilot

**Timber Paling** (CCA pine + hardwood option). See `reference/canonical-name-contract.md` for the canonical product names.

Variation options to expose in the calculator:
- **Style**: Butted | Lapped + capped
- **Height (mm)**: 1200 / 1500 / 1800 / 2100
- **Post material**: CCA Pine H4 (default) / Hardwood
- **Post size**: 100×75 (default) / 100×100
- **Post mounting**: In-ground (Rapid Set, default) / Core-drilled
- **Paling width (mm)**: 100 / 125 / 150 (default)
- **Paling length (mm)**: 1500 / 1650 / 1800 (default for 1800mm fence) — conditional on height
- **Rail size**: 75×38 × 4800mm (default) / 90×35 × 5400mm
- **Rails per panel**: 2 / 3 (default for ≥1500mm height)
- **Plinth**: Off (default) / 150×25 plinth board
- **Nail type**: Ring shank galvanised (default)
- **Capping rail** (Lapped + capped only): 75×50 × 4800mm

## Timber Paling pricing (Cin7 tier-2 trade, May 2026 snapshot)

From Amazing Fencing's Cin7 export. Source: `Pricelist/MassDownloadProducts_20260603_*.xlsx`. These prices should already be in the pricing_rules table via Atlas's migration `046_amazing_fencing_trade_price_book.sql`.

| Canonical name | Amazing SKU prefix | Price ex GST |
|----------------|-------------------|--------------|
| 100x75 Treated Pine Post H4 2400mm | `CCAH4PST-100-75-2400` | $39.00 |
| 100x100 Treated Pine Post H4 2400mm | `CCAH4PST-100-100-2400` | $52.00 |
| 75x38 Treated Pine Rail 4800mm | `RL-75-38-4800` | $22.00 |
| 75x50 Treated Pine Capping Rail 4800mm | `CAP-75-50-4800` | $36.00 |
| 150x16 Treated Pine Paling 1800mm | `PAL-150-1800` | $2.01 |
| 125x16 Treated Pine Paling 1800mm | `PAL-125-1800` | $1.68 |
| 100x16 Treated Pine Paling 1800mm | `PAL-100-1800` | $1.32 |
| 150x25 Treated Pine Plinth 2400mm | `PLN-150-25-2400` | $11.00 |
| 57mm Ring Shank Gal Nail (5kg box) | `NL-RS-57-GAL` | $47.00 |
| Rapid Set Concrete 20kg | `RPS-CON-20` | $10.50 |
| Gate kit · 900mm pedestrian | `GTKIT-900-TP` | $235.00 |
| Gate kit · 1500mm double | `GTKIT-1500-TP` | $415.00 |

## Brand colours

- **Primary accent (ember)**: `#DD6E1B` — used for CTAs, brand mark, active states
- **Hover state**: `#B85710`
- **Use sparingly**: ember is the "active" colour; default UI is white / off-white / navy

## Logo / brand mark

Currently a stub: "AF" mark in an ember-orange rounded square. If Amazing Fencing provides a real logo file, swap it in (likely SVG). Wireframes use the AF placeholder.

## Install crew assumptions

- 2-man crew
- Hourly rate: $95
- Standard 28-metre paling fence: ~32 hours over 2 days
- Removal of existing fence: optional, +$240 (includes tip fees)
- Site travel: charged per km from Currimundi depot (default $120 for 14km)

## Compliance defaults

- **H3 treatment** for above-ground timber (rails, palings)
- **H4 treatment** for in-ground posts
- **Bushfire (AS3959)**: no BAL-FZ block-quote rules apply for general timber paling — opt-in warning for BAL-FZ zones
- **Council height cap**: 1200mm front-boundary fences in most LGAs — over that triggers a "check with council" advisory in the price bubble

## What Amazing Fencing is NOT (yet)

- Glass pool fencing (later phase)
- Colorbond (later phase, separate brief)
- Aluminium slat (later phase, separate brief)
- Picket / hardwood / chain wire (later phase)
- A multi-contractor network — Amazing Fencing is the sole supplier in this pilot

## Reference

- Strategic playbook: `Project Overview Read Me files/anyfence.md` in the repo
- Engine: `anyfence-build-pack/skills/calculator-engine/treated-pine-paling-fence-calculator/calculator.py`
- Migrations: Atlas's `045_amazing_fencing_supplier_and_instances.sql`, `046_amazing_fencing_trade_price_book.sql`, `053_update_amazing_fencing_branding.sql`
