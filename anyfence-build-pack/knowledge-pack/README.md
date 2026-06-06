# Anyfence — Domain Knowledge Pack (for Antigravity)

This pack is the **canonical domain reference** for building the Anyfence platform: the website, the supplier + contractor backends, and the calculator builder. Load it into Antigravity's knowledge base so its agents work from the same source of truth instead of inventing fence logic, BOM math, SKU rules, or compliance behaviour.

> **Why this exists:** fencing has a lot of domain-specific arithmetic (overlap cuts, stock-length optimisation, per-metre vs per-piece pricing, quantity breaks) and hard legal constraints (AS1926.1 pool barriers, AS3959 bushfire). A general coding agent will produce plausible-looking but wrong logic for these. This pack pins down the parts that must be exact.

---

## How to use this with Antigravity

1. **Ingest the `knowledge-pack/` markdown** into Antigravity's knowledge base (one file per topic — they're written to be ingested individually).
2. **Point the engine work at `schema/fence_system_config.schema.json`** — this is the contract every fence config must validate against.
3. **Make the build pass `fixtures/`** — these are `input → expected BOM` golden tests generated from the reference calculator. Antigravity should write the engine until these pass, then keep them as regression tests.
4. **Treat `skills/` as reference implementations + methodology** — exported from the Anyfence knowledge base (calculator engines, data-ingestion pipelines, UI conventions, QA methodology).

---

## What's CANONICAL vs PROPOSED

Be honest about the status of each part so Antigravity knows what it may redesign vs what it must match:

| Area | Status | Meaning |
|------|--------|---------|
| `fence_system_config.json` schema | **CANONICAL** | The engine already consumes this shape. Match it. |
| Canonical product-name contract | **CANONICAL** | Version-locked. Renames are breaking changes. |
| BOM / cut math formulas | **CANONICAL** | Proven in the reference calculator. Fixtures enforce them. |
| AU compliance rules + enforcement levels | **CANONICAL** | Legal constraints. block_quote rules must hard-stop a quote. |
| Supplier + contractor backend data model | **PROPOSED** | A recommended relational model. Antigravity may adapt it — but preserve the supplier-SKU-passthrough and canonical-name-mapping principles. |
| Pricing snapshots (Bunnings, May 2026) | **REFERENCE DATA** | Realistic seed defaults, not live prices. Re-scrape before production. |

---

## Reading order

1. `00-platform-overview.md` — what Anyfence is, the three channels, the structural moat
2. `01-calculator-engine-architecture.md` — how the calculator builder + engine fit together
3. `02-fence-system-config-schema.md` — the config every fence system is described by
4. `03-bom-and-cut-math.md` — the arithmetic the engine performs
5. `04-canonical-product-names.md` — the supplier-agnostic naming contract
6. `05-au-compliance-rules.md` — the legal rule set + enforcement levels
7. `06-supplier-contractor-data-model.md` — proposed backend schema for suppliers, contractors, price books, quotes
8. `07-pricing-data-snapshots.md` — Australian RRP reference data for seeding

Supporting: `schema/` (JSON Schema), `fixtures/` (golden BOM tests), `skills/` (exported reference skills + INDEX.md).

---

## Australia-first defaults (apply everywhere)

- **Units:** metric (mm for components, m for runs).
- **Currency:** AUD. Always carry **GST ex/inc separately** (10% GST). Show both.
- **Standards:** AS1926.1-2012 (pool), AS3959-2018 (bushfire/BAL), AS/NZS 1604 (timber treatment H3/H4), AS2208 (Grade A toughened glass).
- **Suppliers in scope:** Bunnings, Stratco, BlueScope, Lysaght, ProtectorAl, SpecRite, Oxworks, Steeline, Waratah + 60+ catalogued nationals.
