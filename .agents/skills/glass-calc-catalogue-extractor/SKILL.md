---
name: glass-calc-catalogue-extractor
description: Extract Glass Outlet and supplier catalogue data into calculator-ready requirements. Use when Codex needs to read PDFs/catalogues page by page, identify product families, SKUs/order codes, dimensions, finishes, accessories, dependencies, formulas, compatibility rules, warnings, and open questions for seed data or BOM calculators.
---

# Glass Calculator Catalogue Extractor

Use this skill to turn catalogues into structured calculator requirements.

## Extraction Targets

For each relevant catalogue page, capture:
- Page number and catalogue name.
- Product family/system.
- SKU/order code pattern.
- Description and dimensions.
- Available colours/finishes.
- Required companion parts.
- Suggested accessories.
- Optional accessories.
- Incompatibilities/warnings.
- Quantity formulas or selection logic.
- Open questions where the catalogue is ambiguous.

## Output Matrix

Use columns:
`catalogue`, `page`, `family`, `sku`, `description`, `dimensions`, `finishes`, `rule_type`, `trigger`, `quantity_rule`, `price_source`, `seed_status`, `notes`.

Rule types:
- `auto_add`: required to produce a valid system BOM.
- `suggested`: pre-calculated or prompted, but user chooses whether to include.
- `optional`: searchable/addable item.
- `warning`: constraint or decision note, not a line item.

## Source Discipline

- Do not infer prices from catalogue text unless explicitly printed.
- Do not invent SKUs from similar families.
- If a code appears as a pattern, mark it as a pattern and list known examples.
- Cross-check extracted SKUs against CSV and seed JSON when possible.
- Record conflicts instead of silently choosing one source.
