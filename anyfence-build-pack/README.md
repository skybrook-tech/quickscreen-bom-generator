# Anyfence Build Pack

A self-contained reference bundle for building the **Anyfence** platform (anyfence.com.au) — the consumer website, the supplier + contractor backends, and the calculator builder. Designed to be handed to **Google Antigravity** (or any coding agent) so it builds from canonical domain truth instead of inventing fence logic, BOM math, SKU rules, or compliance behaviour.

> Authored by the Anyfence domain assistant (Opus). Antigravity (Gemini) implements; this pack is the contract + reference. Cross-model by design — one model writes the spec and reviews, the other builds.

## What's inside

```
README.md                      ← you are here
knowledge-pack/                ← INGEST THESE into Antigravity's knowledge base
  README.md                      how to use the pack + CANONICAL vs PROPOSED status table
  00-platform-overview.md        what Anyfence is, 3 channels, the moat
  01-calculator-engine-architecture.md
  02-fence-system-config-schema.md
  03-bom-and-cut-math.md         the arithmetic (6mm overlap, stock optimisation, GST)
  04-canonical-product-names.md  the supplier-agnostic naming contract (version-locked)
  05-au-compliance-rules.md      AS1926.1 / AS3959 / H3-H4 + enforcement levels
  06-supplier-contractor-data-model.md   PROPOSED relational backend schema
  07-pricing-data-snapshots.md   AU RRP reference data for seeding
schema/
  fence_system_config.schema.json   JSON Schema (draft 2020-12) — validate every config
fixtures/                      ← golden input→expected BOM tests; make the build pass these
  *.input.json / *.expected.json + manifest.json + README.md
  _generate_fixtures.py          regenerates fixtures from the reference engine
skills/                        ← 19 exported Anyfence skills (reference implementations + methodology)
  INDEX.md                       table of all skills
  calculator-engine/             schema, treated-pine calculator.py, compliance rules, seed conventions
  quickscreen-systems/           QSHS / VS / XPL / BAYG BOM specs (the pilot)
  data-ingestion/                Bunnings scraper (4 scripts) + supplier catalogue extractors
  ui-qa/                         calculator UI conventions + QA methodology
  methodology/                   calculator project coordination playbook
  gtm-ops/                       strategy, supplier tiering, outreach (context, not build-critical)
```

## Suggested first moves for Antigravity

1. **Ingest `knowledge-pack/`** into the knowledge base. Read in numbered order.
2. **Wire `schema/fence_system_config.schema.json`** as the validation contract for all fence configs.
3. **Port the treated-pine engine** (`skills/calculator-engine/treated-pine-paling-fence-calculator/calculator.py`) to the target stack and **make `fixtures/` pass**. Then keep them as regression tests.
4. **Build the supplier/contractor backends** per `knowledge-pack/06`, preserving the 4 invariants (supplier-SKU passthrough, canonical-name join, versioned price books, live margin).
5. **Use the data-ingestion skills** to seed real supplier catalogues.

## Non-negotiables (read these first)

- **Canonical product names are a versioned contract** — renames are breaking changes (`04`).
- **`block_quote` compliance rules must hard-stop a quote** — pool-barrier law is a liability vector (`05`).
- **Two-layer naming:** engine emits canonical names; a separate supplier-mapper resolves them to supplier SKUs/prices. Never bake a supplier SKU into engine logic (`01`, `04`).
- **One known engine bug to fix on reimplementation:** validate inputs before extracting required fields (see `fixtures/README.md` → hardening note).

_Pricing data is a May 2026 snapshot — re-scrape before production._
