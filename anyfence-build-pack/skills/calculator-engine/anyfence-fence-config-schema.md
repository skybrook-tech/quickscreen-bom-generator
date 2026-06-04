---
skill: anyfence-fence-config-schema
id: cmpnfypzt00ka07adl3bdtw9h
description: The canonical fence_system_config.json schema used by the Anyfence calculator engine. Covers component categories (panel, post, rail, post_cap vs capping, glass_panel, spigot, paling, plinth, pole, gate_kit), per-piece vs per-metre pricing, cuts_per_run formulas (including the 6mm paling overlap), colour palettes, quantity-break pricing tiers, and compliance JSON injection. Single source of truth across all fence types.
whenToUse: 
tags: 
---

# Anyfence fence_system_config.json Schema

The canonical configuration the Anyfence calculator engine consumes. One JSON file per fence system (e.g. `colorbond_steel_sheet.json`, `pool_fence_protectoral.json`, `treated_pine_paling.json`). Same schema across all types — different categories and rules.

## Top-level structure

```json
{
  "fence_system_id": "treated_pine_paling",
  "display_name": "Treated Pine Paling Fence",
  "category": "timber_paling",
  "default_height_mm": 1800,
  "supplier_id": "bunnings",
  "source_date": "2026-05-21",
  "currency": "AUD",
  "colour_palette": ["Natural", "Stained", "Painted"],
  "compliance_ref": "au-fence-compliance-rules.paling_fence",
  "components": [ /* see below */ ],
  "labour_defaults": { /* see below */ },
  "qty_break_tiers": [ /* see below */ ]
}
```

## Component object

```json
{
  "sku": "I/N 0140987",
  "product_name": "Treated Pine Paling 150x12mm 1.8m H3",
  "category": "paling",
  "unit": "each",
  "price_aud": 2.34,
  "price_per_metre_aud": 1.30,
  "stock_length_mm": 1800,
  "paling_width_mm": 150,
  "colour": null,
  "compliance_class": "H3_CCA",
  "cuts_per_run_fn": "paling_overlap_6mm",
  "qty_break_pricing": [
    {"min_qty": 100, "unit_price_aud": 2.18},
    {"min_qty": 500, "unit_price_aud": 2.05}
  ],
  "brand": "STS Timber Wholesale",
  "supplier_url": "https://www.bunnings.com.au/..."
}
```

## Component categories (full taxonomy)

| Category | Unit | Notes |
|----------|------|-------|
| `panel` | each | Pre-built fence panels (Colorbond, aluminium slat) |
| `glass_panel` | each | 12mm toughened pool-fence glass. Width-by-width pricing |
| `post` | each | Square or round posts |
| `pole` | each | Round pole alternative to square posts |
| `rail` | each / length | Horizontal rail between posts |
| `paling` | each | Vertical timber paling (with paling_width_mm field) |
| `plinth` | length | Bottom-rail board below palings |
| `infill_sheet` | each | Colorbond infill panel (3 per 2360mm panel) |
| `post_cap` | each | Per-post decorative cap |
| `capping` | length | Per-metre top-of-fence run capping rail |
| `spigot` | each | Glass-clamp spigot (pool fence) |
| `handrail` | length | Top handrail on pool/balustrade |
| `hinge` | each | Gate hinge (TruClose etc.) |
| `latch` | each | Gate latch (MagnaLatch etc.) |
| `gate_kit` | kit | Bundled hinge+latch combo (e.g. AS1926 pool gate kit) |
| `accessory` | each | Brackets, screws, concrete, sundry |

**Critical split:** `post_cap` (per-post, "each") vs `capping` (per-metre, "length"). Don't conflate — fence top-capping was being priced per-post in the original schema and would have wildly underquoted multi-post runs.

## Cuts-per-run formulas

```python
# Default — for most stock lengths
cuts_per_run = ceil(run_length_mm / stock_length_mm)

# Paling overlap (6mm convention)
cuts_per_run = ceil(run_length_mm / (paling_width_mm - 6))
# Example: 30m run, 150mm palings → ceil(30000 / 144) = 209 palings

# Panel-based (Colorbond 2360mm + 2 posts/panel)
panel_count = ceil(run_length_mm / 2360)
post_count = panel_count + 1
infill_sheets = panel_count * 3
rail_count = panel_count * 2

# Pool fence (1200mm fixed height, multiple widths)
# Algorithm: greedy bin-pack run_length_mm into available glass_panel widths
# Spigots: 2 per panel (or 3 for panels >1500mm)
```

## Labour defaults block

```json
{
  "labour_defaults": {
    "post_install_minutes": 25,
    "rail_install_minutes": 5,
    "paling_install_minutes": 1.2,
    "concrete_mix_minutes": 8,
    "gate_install_minutes": 45,
    "site_setup_minutes": 60,
    "hourly_rate_aud": 75
  }
}
```

The calculator multiplies these by component counts to estimate labour. Contractors override per their own rates.

## Quantity-break tiers (canonical)

```json
[
  {"min_qty": 1,   "discount_pct": 0},
  {"min_qty": 10,  "discount_pct": 3},
  {"min_qty": 50,  "discount_pct": 7},
  {"min_qty": 100, "discount_pct": 12},
  {"min_qty": 500, "discount_pct": 18}
]
```

Per-component qty_break_pricing overrides this default when the supplier publishes a different ladder.

## Compliance JSON injection

Compliance rules live in a separate JSON file referenced by `compliance_ref`. The engine merges them at quote time and applies enforcement levels (block_quote / warn / advisory). See the `au-fence-compliance-rules` skill for the canonical rule set.

## Validation rules at quote-start

1. Every component has a non-empty `sku`, `product_name`, `category`, `unit`, `price_aud`.
2. `unit` is one of `each` | `length` | `kit`.
3. `paling` components have a `paling_width_mm` field (numeric, in 90-150 range).
4. `glass_panel` components have a `stock_length_mm` representing the panel width.
5. If `qty_break_pricing` is present, it must be sorted ascending by `min_qty`.
6. `compliance_ref` resolves to a known rule set.

## Colour palette conventions

Pull from the supplier's published range, not generic colour names. Examples:
- Colorbond steel: Monument, Woodland Grey, Domain, Wilderness, Ironstone, Basalt, Evening Haze, Pale Eucalypt, Night Sky, Riversand
- ProtectorAl aluminium: Black, Pearl White, Monument, Pale Eucalypt, Deep Ocean, Primrose, Woodland Grey
- Treated pine: Natural, Stained, Painted (style, not literal colour)

Each entry should include the hex code if known (for swatches in the UI).

## Output of a config file

A validated `fence_system_config.json` is consumed by:
1. The Anyfence calculator engine (runs the BOM math)
2. A contractor's branded calculator (overrides prices/labour)
3. Reporting/analytics (pricing trend over time)

Keep configs versioned by `source_date` so historical quotes can be reproduced.

## What's NOT in the schema

- Geometry (run paths, gate positions) — that's the calculator's input layer, not the config
- User auth / contractor branding — that's the SaaS layer
- Compliance rule definitions — those live in a separate compliance file
