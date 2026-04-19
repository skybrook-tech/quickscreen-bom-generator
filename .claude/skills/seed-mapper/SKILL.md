---
name: seed-mapper
description: >-
  Map source material (CSVs, supplier PDFs, XLSX price sheets, natural-language briefs)
  into QuickScreen BOM engine seed rows. Use when adding a new fencing system (VS, XPL,
  BAYG, HSSG, patios-as-fence), extending an existing product's rules, or importing
  pricing/SKUs from a supplier document. Produces one JSON file per fencing variant
  under supabase/seeds/glass-outlet/products/ — validated and upserted via
  `npm run seed:products`.
  Trigger phrases: add new fencing system, add VS / XPL / BAYG / HSSG, map CSV to
  seeds, convert build pack to seed, supplier price sheet, new slat system,
  extract seed data, import supplier catalog, new gate product, seed new product.
---

# Seed Mapper

## When to use

Invoke this skill when a user wants to add or extend seed data for a fencing
system. Typical prompts:

- "Add VS as a new fencing system — here's the spec" (natural-language brief)
- "Map this build-pack CSV into our seeds" (structured CSV input)
- "Import this supplier price sheet" (PDF/XLSX pricing data)
- "Add a new gate product"
- "Update QSHS to support a new slat size"

## How to work

**The canonical reference is `docs/seed-data-mapping-spec.md`.** It's self-contained
and targeted at any LLM. Load it first — every question about schema shape, business
keys, math.js syntax, or source-to-schema mapping is answered there.

Extras specific to this repo (not in the portable spec):

### Repo paths

| Artefact | Path |
|---|---|
| Per-variant product files (the files you edit) | `supabase/seeds/glass-outlet/products/<variant>.json` |
| Wrapper JSON Schema (LLM output contract) | `supabase/seeds/schemas/product-file.schema.json` |
| Per-table item schemas (referenced by the wrapper) | `supabase/seeds/schemas/<table>.schema.json` |
| Node upserter (validates + upserts via supabase-js) | `supabase/seeds/tools/seed-products.js` |
| DB → JSON dumper (bootstrap / audit) | `supabase/seeds/tools/dump-to-json.js` |
| Engine that consumes the seeds at runtime | `supabase/functions/bom-calculator/index.ts` |
| Existing QSHS + QSHS_GATE worked example | `supabase/seeds/glass-outlet/products/qshs.json` — the largest live example, ground truth |

### Workflow inside this repo

1. **Understand the ask.** If it's a CSV, read a few rows to see the shape. If a
   brief, extract the checklist in §7.2 of the portable spec. If a PDF/XLSX, use
   the Read tool; pull out the SKU/price table first.
2. **Read the closest existing file** for the shape. New fence system → template is
   `products/qshs.json`. New gate product → template is `products/qs_gate.json`
   (note `product_type: "gate"` + `compatible_with_system_types: [...]`).
3. **Create (or edit) one file** under `supabase/seeds/glass-outlet/products/`:
   - New fence system → create `<system-code>.json` (lowercase, e.g. `vs.json`, `xpl.json`).
   - New gate → create its own `<gate-code>.json` with `product_type: "gate"` and
     a `compatible_with_system_types` array listing the fence system_types it pairs with.
   - Extending an existing product → edit its file in place.
4. **Validate + apply** with `npm run seed:products` — the upserter validates
   the file against `product-file.schema.json`, resolves business-key FKs, and
   upserts every section in dependency order. Schema errors print the exact
   JSON pointer + message. Duplicate SKUs across files are handled by the
   upserter (second encounter = UPDATE).
5. **Full reset** via `npm run db:reset`. Chain: `supabase db reset` (migrations +
   `slat-fencing.sql`) → `seed:products` (the JSON files) → `seed:auth` →
   `seed:glass-outlet`. Watch for `All floors met.` in the seed:products output.
6. **Show the diff** back to the user: `git diff supabase/seeds/glass-outlet/products/`.

### Tool usage reminders

- `Read` handles PDFs and images (use `pages` for large PDFs). XLSX needs to be
  converted — suggest the user save as CSV first, or use `ssconvert` / `xlsx2csv`
  via Bash if available.
- `Grep` to check for SKU collisions across existing files:
  `Grep "\"sku\":" supabase/seeds/glass-outlet/products/`
- `Grep` to check for rule patterns you can copy:
  `Grep "\"stage\":" supabase/seeds/glass-outlet/products/qshs.json`
- `Bash npm run seed:products` is the fastest feedback loop — validates + upserts
  without a full DB reset. Safe to run repeatedly.
- `Bash npm run db:reset` is the full round-trip (migrations from scratch + seeds
  + auth). Run before declaring the work done.

### Guardrails (conventions in this repo)

- **JSON files are the source of truth** for v3 engine data. No SQL is generated
  any more — the Node upserter writes Postgres directly via `supabase-js`.
- **Never hardcode UUIDs** in JSON. Always use the business-key convention
  (`org_slug` at file level, `product_system_type`, `rule_set_name`,
  `version_label`, `sku`). The upserter resolves them at apply time.
- **`org_slug` is a file-level field, not a per-row field.** Do not repeat it
  on individual rows — the wrapper schema will reject that.
- **Colour codes**: use the short code form everywhere in seeds (`"B"`, `"MN"`, …).
  Long names like `"black-satin"` are only for UI display and get normalised by
  the engine.
- **`active: true`** by default on every row. Only set `false` if you explicitly
  want a row disabled.
- **Gates live in their own file.** A gate product can pair with multiple fence
  systems via `compatible_with_system_types`, so it doesn't belong in any one fence
  file. `qs_gate.json` is the live example (compatible with QSHS, VS, XPL, BAYG).
- **When uncertain about a formula or convention** (stock lengths, default colours,
  tier margins): check the relevant section of the committed `qshs.json`, or
  ask the user. Don't invent numbers.
- **Seed data goes in `supabase/seeds/`, never in new migrations.** This is a
  repo-wide rule.

### Lazy-loaded references

Do NOT load all at once. Load on first use for that topic:

| File | When to load |
|---|---|
| `references/schema-catalogue.md` | First time authoring any row — "which table does X belong in?" |
| `references/expression-syntax.md` | First time writing a math.js `expression` or `qty_formula` — full cheat-sheet of variables available at each stage |
| `references/worked-examples/qshs-gate.md` | When adding a gate product — annotated walkthrough of the QSHS_GATE rows |
| `references/worked-examples/adding-vs.md` | When adding a new slat fencing system — full end-to-end example |

### After the work lands

Update `docs/tasks.md` under the "Seed-mapping / self-serve" section with a bullet
noting what was added. If new SKUs were introduced, make sure
`v3-verify-seeds.sql` row-count floors are still satisfied (the reset output will
tell you).
