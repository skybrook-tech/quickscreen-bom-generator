---
skill: bunnings-fence-scraper
id: cmpfc4tbc0cy806adjfk2di3z
description: Ingests Bunnings fencing catalogue data via Exa search and outputs fence_system_config.json files matching the Anyfence calculator engine schema. Supports six fence-system families: Colorbond, Pool (glass + aluminium), Treated Pine paling, Chain Wire / Chainlink, Picket (timber + PVC + steel), Hardwood (Merbau / Spotted Gum). 25+ component categories including mesh_roll, tension_band, fence_tie, picket, screen_board, plus per-linear-metre pricing extraction and brand-aware dimension disambiguation.
whenToUse: 
tags: 
---

# Bunnings Fence Scraper Skill

## Purpose

Ingest Bunnings fencing catalogue data and produce `fence_system_config.json`
files for the Anyfence calculator engine. This is the data pipeline that
makes adding a new fence type (Colorbond, treated pine, pool glass, etc.)
a config-only operation instead of a code change.

## Architecture (3 layers)

1. **Discover & Fetch** — Agent calls `ExaSearch({ includeDomains: ["bunnings.com.au"], query: "..."  })` and saves the JSON. Exa handles Cloudflare and JS rendering.
2. **Parse & Normalise** — `bunnings_parser.py` turns raw page text into typed `BunningsProduct` dicts (I/N, price, colour, dimensions, category).
3. **Map to Schema** — `fence_config_mapper.py` produces a `fence_system_config.json` with components, qty breaks, labour rules, colours, hex codes.

## Workflow

### Step 1 — Search for products via ExaSearch

Run 2-4 targeted searches per fence type:

```
ExaSearch({ query: "Bunnings Colorbond steel fence post", includeDomains: ["bunnings.com.au"], numResults: 8 })
ExaSearch({ query: "Bunnings Colorbond fence panel price", includeDomains: ["bunnings.com.au"], numResults: 8 })
ExaSearch({ query: "Bunnings Colorbond fence rail", includeDomains: ["bunnings.com.au"], numResults: 6 })
ExaSearch({ query: "Bunnings Colorbond fence gate kit", includeDomains: ["bunnings.com.au"], numResults: 6 })
```

Save each response as JSON via `Write` to `/agent/workspace/<fence_type>_search_<N>.json`.

### Step 2 — Merge search results into a single file

```python
import json
all_results = []
for f in ["colorbond_search_1.json", "colorbond_search_2.json", ...]:
    with open(f) as fp:
        all_results.extend(json.load(fp)["results"])
with open("colorbond_merged.json", "w") as fp:
    json.dump({"results": all_results}, fp)
```

### Step 3 — Run the pipeline

```bash
cd /agent/workspace/skills/bunnings-fence-scraper
python3 pipeline.py \
    --search-json /agent/workspace/colorbond_merged.json \
    --system-id colorbond_classic \
    --display-name "Colorbond Classic Fence" \
    --manufacturer "BlueScope" \
    --post-spacing-mm 2400 \
    --output /agent/workspace/colorbond_classic.json
```

Output: a complete `fence_system_config.json` with components, colours, hex codes,
qty breaks, labour rules, and metadata.

### Step 4 — Inspect & enrich

The pipeline produces a base config. Compliance rules, gate hardware decomposition,
and labour overrides are human-curated and pass via flags:

```bash
python3 pipeline.py \
    --search-json ... \
    --compliance-json compliance/colorbond.json \
    --gate-options-json gates/colorbond.json \
    --output ...
```

## What gets extracted per Bunnings product

| Field | Source | Example |
|-------|--------|---------|
| I/N number | "I/N: NNNNNNN" pattern | `0735315` |
| Name | Page H1 or title | "Lysaght 1800 x 2360mm Complete Fence Panel..." |
| Price AUD | First clean $ near "Add to Cart" | `135.00` |
| Colour | Longest-match from Colorbond palette | `Monument` |
| Brand | First brand-name match in name/text | `Colorbond` |
| Dimensions | Regex from product name | `1800x2360mm` → height/width |
| Category | Keyword classifier (specific-first ordering) | `panel`, `post`, `rail`, `infill`, `cap`, `gate` |
| Availability | "Add to Cart" → in_stock, else special_order | `special_order` |
| Image URL | `media.bunnings.com.au/...` | (CDN URL) |

## Output schema (fence_system_config.json)

```json
{
  "system_id": "colorbond_classic",
  "display_name": "Colorbond Classic Fence",
  "manufacturer": "BlueScope",
  "heights_mm": [1800],
  "colours": [{"code": "MN", "name": "Monument", "hex": "#373a36", ...}],
  "post_spacing_mm": 2400,
  "post_mounting_options": ["in_ground"],
  "components": [{"sku": "BUN-0735315", "category": "panel", "base_price_aud": 135.0, ...}],
  "gate_options": [],
  "compliance": [],
  "labour_rules": {...},
  "visual_assets": {},
  "metadata": {...}
}
```

## Refresh cadence

- Prices: monthly
- New colours / SKUs: quarterly
- Schema version: when engine adds fields

## Known limitations

1. Bunnings has anti-bot protection — relies on Exa's crawler infrastructure.
2. Gate kits aren't auto-decomposed into hinges + latch — manual enrichment.
3. Treated pine palings need paling-specific `cuts_per_run_fn` (TODO).
4. Bunnings ToS prohibits commercial scraping — pipeline is for internal product
   seeding only. Pursue Bunnings Trade data partnership for production use.

## Files

- `pipeline.py` — orchestrator (CLI + library API)
- `bunnings_parser.py` — text → BunningsProduct
- `fence_config_mapper.py` — BunningsProduct[] → fence_system_config.json
- `README.md` — full documentation

## Extended fence-system coverage (May 2026)

Schema now handles six fence types via the same pipeline. New categories: mesh_roll, mesh_panel, top_rail_chainlink, tension_band, rail_end, wire_strainer, fence_stretcher, fence_tie, tie_wire, mesh_clip (chain wire); picket, picket_panel (pickets); screen_board (hardwood). Dimension parser uses STANDARD_FENCE_HEIGHTS_MM={900,1100,1200,1500,1700,1800,2100} to disambiguate brand-specific dimension order conventions.
