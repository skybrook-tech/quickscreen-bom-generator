# 01 — Calculator Engine & Builder Architecture

## The core idea: config-driven calculators

Every fence calculator on the platform is the **same engine** reading a different **`fence_system_config.json`**. You do NOT write a new calculator per fence type — you write one engine and one config per fence system. This is what lets the "calculator builder" exist: building a calculator = producing a valid config + (optionally) a thin per-system code path for unusual math.

```
                 ┌─────────────────────────┐
 supplier/       │  CALCULATOR BUILDER       │  ← ingests price lists, catalogues,
 contractor ────▶│  (config authoring)       │     PDFs, Bunnings data → emits config
 inputs          └────────────┬──────────────┘
                              │  fence_system_config.json  (validated against schema)
                              ▼
 job dims ──────▶┌─────────────────────────┐
 height/style    │   CALCULATOR ENGINE       │──▶ BOM (canonical product names + qty + $)
 colour/gates    │  (one engine, all types)  │──▶ GST ex/inc totals
                 └────────────┬──────────────┘──▶ compliance verdicts (block/warn/advisory)
                              │ canonical product names
                              ▼
                 ┌─────────────────────────┐
                 │   SUPPLIER MAPPER         │──▶ supplier SKU + price + pack size + stock
                 │ canonical_name → supplier │     (per supplier price book)
                 └─────────────────────────┘
```

## Two-layer naming = the key architectural decision

1. **The calculator engine emits supplier-AGNOSTIC canonical product names** (see `04-canonical-product-names.md`). e.g. `100x75 Treated Pine Post`.
2. **A separate supplier-mapper resolves canonical names → that supplier's SKU, price, pack size, availability.**

Why this matters: a supplier keeps their own product codes end-to-end (the value prop), AND the calculator math stays supplier-independent. One BOM can be priced against many suppliers' price books. **Never bake a supplier's SKU into the calculation logic.**

## Engine responsibilities (what the engine does)

- **Run-length take-off** — convert drawn/entered runs into component quantities using each component's `cuts_per_run_fn` (see `03-bom-and-cut-math.md`).
- **Stock-length cut optimisation** — for length-sold items (rails, capping, top rail), minimise waste across stock lengths.
- **Quantity-break pricing** — apply `qty_break_pricing` tiers when total quantity crosses a threshold.
- **Gates** — gates are their own line items (gate_kit bundles hardware); a gate interrupts a fence section (see UI conventions skill).
- **GST** — carry ex-GST and inc-GST (10%) separately on every line and total.
- **Compliance gate** — evaluate the config's `compliance[]` rules against the job; `block_quote` rules must hard-stop, `warn`/`advisory` surface messages.
- **Canonical BOM output** — every line is a canonical product name + quantity + unit + ex/inc price. CSV + print friendly.

## Builder responsibilities (what the calculator builder does)

- Ingest a supplier/contractor source: Bunnings catalogue (`skills/data-ingestion/bunnings-fence-scraper`), or any supplier PDF/brochure/portal (`skills/data-ingestion/supplier-catalogue-extractor`).
- Map source products → schema `components[]`, capturing per-piece AND per-metre pricing where both exist, stock lengths, quantity breaks, dimensions that drive cut math (paling/picket/board widths).
- Attach the right `compliance[]` rules for the fence type (pool → AS1926.1, timber → H3/H4 + BAL, etc.).
- Emit a config that **validates against `schema/fence_system_config.schema.json`** and produces correct output against the golden `fixtures/`.

## Already-built engine capabilities (reference: QuickScreen)

The reference engine (built for aluminium slats, The Glass Outlet) already supports: 4 fence systems via dedicated code paths + shared extrusion math, natural-language describe-your-fence parsing (regex v1 → LLM v2), Google Maps satellite underlay with fence/gate drawing tools, component-level BOM tied to real SKUs, stock-length cut optimisation, quantity-break pricing suggestions, GST ex/inc totals, print, CSV export. Seed-data conventions for that engine are in `skills/calculator-engine/quickscreen-seed-data-conventions.md` and the per-system BOM math in `skills/quickscreen-systems/`.

## `cuts_per_run_fn` safety note

`cuts_per_run_fn` values in a config are **documented string expressions the engine interprets safely** — they are NOT live Python/JS `eval`. Implement a small, sandboxed expression evaluator (whitelisted variables + `ceil`/`floor`/`round` + arithmetic). The QuickScreen engine uses a `math.js`-style `stocks()` helper for stock-length math; mirror that approach.

## Roadmap (fence types, in priority order)

Treated pine (built) → Colorbond → pool (glass + aluminium) → aluminium slat/louvre → picket → hardwood → chain wire → tubular → full Bunnings range. Each new type is primarily a new config + seed data, occasionally a new `cuts_per_run_fn` or a thin code path for unusual geometry.
