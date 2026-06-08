---
name: supplier-catalogue-extractor
id: cmppk01c106nf07adcm2fitze
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# supplier-catalogue-extractor

> Methodology for extracting Australian fencing supplier catalogues (PDFs, brochures, build-packs) into calculator-ready structured data — products, SKUs, dimensions, finishes, accessories, dependencies, formulas, compatibility rules, and open questions. Complements bunnings-fence-scraper by handling any non-Bunnings supplier source.

## When to use
(not specified)

## Documentation
# Supplier Catalogue Extractor

A repeatable methodology for turning any Australian fencing supplier's catalogue / PDF / brochure into structured, calculator-ready requirements.

## When to use

Onboarding a new supplier (Stratco, ProtectorAl, Oxworks, BlueScope, Lysaght, Steeline, Waratah, etc.) for which Bunnings-flavoured Exa scraping isn't enough — typically because:

- The supplier publishes pricing only in PDF brochures, build-packs, or XLSX sheets
- SKU patterns are unique to that supplier (no Bunnings I/N mapping)
- Quantity / companion rules are buried in tables, footnotes, or formula sheets
- You need to translate the catalogue into an Anyfence `fence_system_config.json` or a QuickScreen-style seed JSON

For Bunnings specifically, run `bunnings-fence-scraper` first — it already handles the Cloudflare challenge.

## Extraction targets (per catalogue page)

Capture for each product family / SKU encountered:

- Page number and catalogue name (for evidence trail)
- Product family / system identifier
- SKU or order-code pattern (mark explicitly when shown as a pattern like `XP-####-S65-{col}`)
- Description and dimensions (mm, stock length, profile)
- Available colours / finishes with the supplier's short codes
- Required companion parts (must-have for the system to function)
- Suggested accessories (typically wanted but not strictly required)
- Optional accessories (catalogue-listed, caller-driven)
- Incompatibilities and warnings (height caps, mixing constraints, install-method limits)
- Quantity formulas or selection logic (any math the catalogue prescribes)
- Open questions where the catalogue is ambiguous

## Output matrix

Produce a flat table with these 13 columns:

`catalogue | page | family | sku | description | dimensions | finishes | rule_type | trigger | quantity_rule | price_source | seed_status | notes`

### Rule type taxonomy

- `auto_add` — required to produce a valid system BOM. Never optional.
- `suggested` — pre-calculated or prompted; user chooses whether to include.
- `optional` — searchable / addable item; not auto-presented.
- `warning` — constraint or decision note; produces no line item.

This matches the Anyfence engine's enforcement levels and the 4-state taxonomy in `multi-option-suggestion-philosophy-v2`.

### Seed-status taxonomy

When tracking rows through the pipeline:

- `not started`
- `extracted` (in the matrix)
- `mapped` (translated to schema)
- `in seed` (committed to seed JSON)
- `verified` (worked example confirms BOM output)

## Source discipline (non-negotiable)

1. **Do not infer prices** from catalogue text unless the price is explicitly printed on that page.
2. **Do not invent SKUs** from similar families. If only a pattern is shown, mark it as a pattern with known examples — don't guess full SKUs.
3. **Cross-check extracted SKUs** against any CSV pricelist, seed JSON, or supplier order portal before committing.
4. **Record conflicts** — never silently choose one source. If the brochure says one stock length and the CSV says another, log both in `notes` with the conflict flagged.
5. **Patterns are first-class.** A catalogue showing `XP-6100-S65-{col}` with example codes only for Black, Monument, and Surfmist gets recorded as a pattern + verified examples — don't claim it ships in 11 colours unless the catalogue confirms.
6. **Page numbers stay in the row.** Every claim is auditable back to a specific catalogue page.

## Workflow

1. **Inventory the source.** Catalogue file name, total pages, sections (fence systems, gates, accessories, hardware, install guides).
2. **Read page by page.** Use the Read tool with the `pages` param for large PDFs. Don't rely on a summary — walk every row for table-heavy layouts.
3. **Capture into the matrix** in the column order above. One row per SKU. Pattern entries are allowed.
4. **Mark `rule_type`** per row using the taxonomy.
5. **Capture formulas verbatim** in `quantity_rule`. Do not paraphrase. "1 cap per 2 panels" stays as `1 per 2 panels`.
6. **Flag open questions** at the bottom — anything ambiguous, missing, or contradictory.
7. **Cross-check against any CSV / XLSX** the supplier provides. Record mismatches as conflicts.
8. **Hand off to seed mapping.** Pair with `quickscreen-seed-data-conventions` (for The Glass Outlet) or `anyfence-fence-config-schema` (for the Anyfence engine).

## Common Australian supplier patterns

- **Stratco** — SKU prefix often by system (`COL-` Colorbond, `GLB-` Good Neighbour). Pricing is dealer-tiered; flag `price_source` as `RRP` vs `trade` explicitly.
- **ProtectorAl** — Branded under Bunnings. Use `bunnings-fence-scraper` first; supplement with ProtectorAl install guide PDFs for compatibility rules.
- **BlueScope / Lysaght** — Colorbond is the canonical brand; both publish dimensioned catalogues. Watch sheet-vs-panel naming (Colorbond NEETASCREEN vs Smartascreen).
- **Oxworks** — Hardware-heavy. SKU patterns include MagnaLatch series and other gate-kit codes. Tag AS1926 compliance class explicitly.
- **Steeline / Waratah** — Rural / wire fencing. Stock-length units are typically rolls, not lengths.

## Worked-example trigger

When the user provides a supplier brochure file or URL with onboarding intent, start by listing detected product families and asking which to prioritise — don't try to extract 200 SKUs in one pass. Narrow slice → verify against a worked example → expand.

## Handoffs

- Anyfence engine seed JSON → pair with `anyfence-fence-config-schema`.
- QuickScreen-specific seed conventions → pair with `quickscreen-seed-data-conventions`.
- Supplier prioritisation → pair with `au-fencing-supplier-tier-tagger`.
- Compliance overlay → pair with `au-fence-compliance-rules`.
- QA after seeding → pair with `fence-calculator-qa-tester`.

## Scripts
None
