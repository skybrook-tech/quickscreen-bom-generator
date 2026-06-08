# Bunnings Fence Scraper — Data Pipeline

Ingests Bunnings fencing catalogue data and outputs `fence_system_config.json`
files matching the Anyfence calculator engine schema.

## Architecture

The pipeline is split into three layers so that the brittle "web scraping"
concern is isolated from the stable "schema mapping" concern:

```
┌─────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│   Discover & Fetch  │ →  │   Parse & Normalise  │ →  │    Map to Schema     │
│  (ExaSearch + Exa-  │    │  (bunnings_parser)   │    │ (fence_config_mapper)│
│   Contents, browser)│    │                      │    │                      │
│  agent-driven       │    │  pure Python, deter- │    │  pure Python, deter- │
│  step               │    │  ministic, testable  │    │  ministic, testable  │
└─────────────────────┘    └──────────────────────┘    └──────────────────────┘
        raw page text             BunningsProduct[]         fence_system_config.json
```

**Why split it this way:** Bunnings sits behind Cloudflare, so direct HTTP
requests get challenged. Exa's crawler handles the JS challenge and returns
clean text. The parsing and mapping are then pure Python — fast to test,
easy to maintain, and source-agnostic (a future BlueScope or Stratco adapter
plugs in at the parse layer with the same downstream schema).

## When to use this skill

- You need a `fence_system_config.json` for the Anyfence calculator engine
  for a fence type sold on Bunnings (Colorbond, Treated Pine, Aluminium Slat,
  Pool Glass, etc.).
- You want to refresh prices on an existing config — re-run the pipeline.
- You want to seed a new contractor's price list (SaaS tier) with realistic
  RRP defaults.

## When NOT to use it

- For final production pricing — Bunnings RRP is the retail benchmark.
  Trade pricing is 20-40% lower and varies per contractor. This pipeline
  generates a **defaults** layer; tenant overrides come later.
- For SKUs not in Bunnings' catalogue. Use a manufacturer-direct adapter
  (BlueScope, Stratco, ITI) for those.

## Usage

### Step 1 — Discover URLs via ExaSearch (agent-driven)

The agent driving this skill calls `ExaSearch` with `includeDomains:
["bunnings.com.au"]` and a query targeting the fence type. Example queries:

```
"Bunnings Colorbond fence panel price"
"Bunnings Colorbond steel fence post"
"Bunnings Colorbond fence gate kit hardware"
"Bunnings treated pine paling fence"
"Bunnings glass pool fence panel"
```

Save each `ExaSearch` response to a JSON file in the workspace.

### Step 2 — Run the pipeline

```bash
python3 pipeline.py \
    --search-json /agent/workspace/colorbond_search.json \
    --system-id colorbond_classic \
    --display-name "Colorbond Classic Fence" \
    --manufacturer "BlueScope" \
    --post-spacing-mm 2400 \
    --output /agent/workspace/colorbond_classic.json
```

### Step 3 — Inspect & enrich

The pipeline produces a base config with components, colours, prices, and
quantity breaks. Compliance rules, gate options, and labour rules need
human judgement — they live in separate JSON files passed via flags:

```bash
python3 pipeline.py \
    --search-json colorbond_search.json \
    --system-id colorbond_classic \
    --display-name "Colorbond Classic Fence" \
    --compliance-json compliance/colorbond.json \
    --gate-options-json gates/colorbond.json \
    --output colorbond_classic.json
```

## File layout

| File | Purpose |
|------|---------|
| `bunnings_parser.py` | Parses raw Bunnings page text → `BunningsProduct` dicts |
| `fence_config_mapper.py` | Maps `BunningsProduct[]` → `fence_system_config.json` |
| `pipeline.py` | Orchestrator that chains parser + mapper |
| `README.md` | This document |

## What gets extracted per product

- **I/N number** — Bunnings Item Number (e.g. `0735315`)
- **Name** — full product title
- **Price (AUD)** — first clean `$N.NN` near "Add to Cart" or "How to purchase"
- **Colour** — matched against the Colorbond palette (longest-match wins)
- **Brand** — Colorbond, Lysaght, ProtectorAl, etc.
- **Dimensions** — height/width/length from product name in mm
- **Category** — panel / post / rail / infill / cap / extension / gate / hinge / latch / screw / lattice / concrete / other
- **Availability** — `in_stock` / `special_order` / `unknown`
- **Rating + review count** — when present
- **Image URL** — Bunnings media CDN URL
- **Raw features** — bullet list from the "Features" section

## What gets generated in the final config

- **Industry-standard colour codes** (Monument → MN, Woodland Grey → WG, etc.)
- **Hex codes** for swatch rendering
- **Component records** with `cuts_per_run_fn` expressions the engine
  can evaluate per-run
- **Default qty-break schedule** (5/10/15% at 20/50/100 units)
- **Default Australian labour rules** (overridable by tenant in SaaS)
- **Metadata** with scrape timestamp, source URL, schema version

## Refresh cadence

- **Prices**: monthly. Bunnings RRP doesn't drift fast but does shift seasonally.
- **New colours / SKUs**: quarterly, when BlueScope releases a colour update.
- **Schema version bumps**: only when the Anyfence calculator engine adds
  new required fields.

## Known limitations & TODOs

1. **Stock-length parsing** for posts is heuristic — assumes the largest 3-5
   digit number in the name is the length. Works 95% of the time; fails for
   products with multiple dimensions in the name.

2. **Gate hardware lists** aren't yet auto-assembled. The pipeline produces a
   `gate` category record per gate kit but doesn't decompose it into hinges +
   latch. That's a manual enrichment step.

3. **Treated pine** has different schema needs — palings sold per length
   rather than per panel. The parser handles it; the mapper needs a paling-
   specific `cuts_per_run_fn`. TODO: extend `_unit_for_category` and
   `cuts_per_run_fn` logic.

4. **Anti-bot resilience** — currently relies on Exa's crawler. If Exa is
   rate-limited or unavailable, fall back to browser automation
   (Stagehand) which is slower but bypasses Cloudflare.

5. **Legal / ToS** — Bunnings ToS prohibits automated scraping for
   commercial purposes. This pipeline is fit for **internal product seeding**
   only. Long-term, pursue a Bunnings Trade data partnership.

## Testing

Run the pipeline against the bundled sample JSON to verify your environment:

```bash
python3 pipeline.py \
    --search-json /agent/workspace/colorbond_search_sample.json \
    --system-id colorbond_test \
    --display-name "Test Run" \
    --output -
```

Expected: 4 products, 4 components, 3 colours, exit code 0.
