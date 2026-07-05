# Parked: the fully data-driven engine (NOT the live path)

These documents describe a **DB-driven** BOM engine — the `bom-calculator` edge
function reading calculation rules from seeded Postgres tables
(`product_rules`, `product_variables`, `product_component_selectors`,
`product_companion_rules`, `product_warnings`, `product_validations`,
`rule_sets`/`rule_versions`), authored via per-product JSON files under
`supabase/seeds/glass-outlet/products/*.json` and `npm run seed:products`.

**This is not what runs.** The live calculator uses the **static engine**:

- **BOM:** the client calls `bom-calculator-static` (`src/hooks/useBomCalculator.ts`).
- **Field config:** the client calls `get-calculator-config`, which reads
  hardcoded `BASE_CONFIGS` in
  `supabase/functions/bom-calculator-static/config/base.ts` plus per-product
  `supabase/functions/bom-calculator-static/config/products/*/fields.json`.

The `bom-calculator` and `calculate-pricing` edge functions and the
migrations-011–014/018 engine tables have **no client references**.

The data-driven approach was parked (not deleted) because it may be revived
later. Until then, treat everything in this folder as historical/aspirational.

**For the live architecture and how to add a fence family, see:**
- [`AGENTS.md`](../../../AGENTS.md) (§ "Add a fence family")
- [`docs/configurable-static-calculator-plan.md`](../../configurable-static-calculator-plan.md)

## Files parked here

| File | What it describes (dead path) |
|---|---|
| `data-driven-calculator-architecture.md` | The "BOM logic is DATA not CODE" bet |
| `bom-calculator-pipeline.md` | The `bom-calculator` edge-function pipeline spec |
| `phase-v3-4-bom-calculator.md` | Phase spec for the `bom-calculator` function |
| `engine-schema.md` | The engine DB schema (migrations 011–014, 018) |
| `phase-v3-1-engine-migrations.md` | Engine migrations phase |
| `phase-v3-2-seeds.md` | DB seed phase |
| `seed-data-mapping-spec.md` | Authoring contract for `seeds/.../products/*.json` |
| `calculator-architecture-tradeoffs.md` | Decision record: data-driven vs static |
| `technical-handoff-calculator-approaches.md` | Handoff treating data-driven as current |
| `how_it_works.md` | Tour claiming fence differences live in seed data |
