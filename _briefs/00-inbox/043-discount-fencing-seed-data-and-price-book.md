# Brief 043 — Discount Fencing: Seed Data + Price Book v1 (timber + aluminium pool)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 042 merged + brief 034 merged (price_books table exists)
**Estimated PR size:** medium (two seed JSON files + a data migration for the price book + tests against the seed script)
**Primary reference:** `_briefs/assets/043-discount-fencing-seeds/` (bundled with this brief) — the seed JSON to drop into `supabase/seeds/discount-fencing/products/`

---

## Goal

Seed the **three Discount Fencing system_instances** that have public retail pricing on their website:

1. **`dfsau-cca-pine-paling`** — CCA Pine Paling Fence (timber-fence archetype)
2. **`dfsau-aluminium-pool`** — Aluminium Pool Fence (aluminium-pool-fence archetype)
3. **`dfsau-aluminium-slat-gate`** — $399 aluminium slat swing gate, 8 colours, 930×1800 (swing-gate archetype)

For each: 1 row in `products` + N rows in `product_components` (one per SKU) + 1 published `price_book` per supplier + `price_book_items` mirroring the public retail pricing as of 2026-05.

**Out of scope for this brief: variables, rules, selectors, validations.** Those are wired up via the admin Rule-Authoring UI (brief 037) after this seed lands. The system_instances move from `imported` to `calculator_ready` once that's done. (This separation matches the readiness lifecycle defined in `docs/system-authoring-process.md`.)

The other three Discount Fencing instances (glass-pool, colorbond, security) stay at `readiness_status = 'draft'` pending PDF pricing extraction. They get their own follow-up briefs once Liam supplies the pricing source.

## Verified preconditions (audited via GitHub API for this brief)

- **Canonical seed shape** matches `supabase/seeds/glass-outlet/products/vs.json` (verified) — top-level `org_slug`, `products[]` with `system_type`/`product_type`/`name`/`description`/`active`/`sort_order`/`metadata`, `product_components[]` with `sku`/`name`/`description`/`category`/`unit`/`default_price` (NUMERIC dollars)/`system_types` (TEXT[])/`metadata`/`active`/`subCategory`/`sortPriority`.
- **`products.system_type` UNIQUE per `(org_id, system_type)`** (migration 022). Discount Fencing products use the prefix `DF_*` (e.g. `DF_CCA_PAL`, `DF_AL_POOL`) to namespace away from the Glass Outlet system_types under the same org.
- **`product_components.default_price`** is NUMERIC(10,2) dollars (migration 008). New `price_book_items.price_cents` is INTEGER cents.
- **Provenance:** seed loader must resolve `supplier_id` from `supplier_slug` and `system_instance_id` from `(supplier_slug, system_instance_slug)` at upsert time and stamp the resulting rows. If the seed loader doesn't yet support this (it currently only handles `org_id`), this brief extends it.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Use the rule template registry from brief 037** wherever possible — `paling_count_v1`, `bay_post_v1`, `rail_per_bay_v1`, `panel_per_bay_v1`.
- **All seed rows carry `supplier_id = discount-fencing`** and the appropriate `system_instance_id`.
- **Price book is `published`** so quotes can immediately pin against it.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/seeds/discount-fencing/products/cca-pine-paling.json` | NEW — products + components for the timber fence |
| `supabase/seeds/discount-fencing/products/aluminium-pool.json` | NEW — products + components for aluminium pool fence |
| `supabase/seeds/discount-fencing/products/aluminium-slat-gate.json` | NEW — products + components for the $399 slat gate companion product |
| `supabase/seeds/discount-fencing/price-books/2026-05-public.json` | NEW — published price book with all SKUs from both instances |
| `supabase/migrations/043_discount_fencing_seed_priceboook.sql` | NEW — `INSERT INTO price_books` + `INSERT INTO price_book_items` from the JSON above (data migration form, idempotent) |
| `supabase/seeds/run-seeds.ts` (or wherever the seed loader lives) | UPDATE — extend the loader to read from `supabase/seeds/<supplier>/products/*.json` for any supplier, not just glass-outlet |
| `catalogues/discount-fencing/source-prices-2026-05.md` | NEW — verbatim copy of the public price text from `/timber-fencing` and `/aluminium-pool-fencing` (audit trail) |

## Source pricing (verbatim, 2026-05-28, from dfsau.com.au)

**CCA Pine Palings** (`/timber-fencing`):
```
100 x 16 CCA PINE PALINGS
1200 - $1.74
1800 - $2.15
2100 - $2.90
2400 - $3.40

75 x 38 x 4800 CCA PINE RAIL - $12.10
100 x 38 x 4800 CCA PINE RAIL ARRISSED - $17.00

100 x 75 CCA PINE POST
1800 - $14.70
2400 - $19.60
3000 - $24.50

200 x 50 CCA PINE ARRISSED SLEEPER
2400 - $24.80
3000 - $30.00

200 x 75 CCA PINE ARRISSED SLEEPER
2400 - $33.00
3000 - $40.00
```

**Aluminium Pool Fencing** (`/aluminium-pool-fencing`):
```
Flat Top Pool Panels — BLACK
2450 $94.00
3000 $129.00
975 GATES $69.00
ADJUSTABLE 1515 WIDE GATES $113.00
SHROUDS $3.00 EACH
1800 POSTS $26.00
2100 POSTS $28.00
1300 FLANGED POST $29.00
1600 FLANGED POST $31.00

Flat Top Pool Panels — OTHER COLOURS
2475 $115
3000 $150
975 GATE $115
SHROUDS $3.00
1800 POST $32
2100 POST $35
1300 FLANGED POST $42
1500 FLANGED POST $44

Aluminium Spear Top Pool Panels — 2400 wide × 1200 high — $155 per panel (Black stock)
Aluminium Loop Top Pool Panels — 2400 wide × 1200 high — (Black stock; mill finish available for powder coat)
```

> **Currency note:** all prices are AUD inc-GST per source (Discount Fencing displays retail). Brief 043 stores them as `price_cents` (AUD) on the `price_book_items` rows.
>
> **Tier convention** (per brief 034 decision):
> - `tier1` = list / public retail / RRP — what's seeded here
> - `tier2` = trade — pending Discount Fencing trade pricing PDF
> - `tier3` = volume / bulk — pending; reserve for big-volume contract pricing

## Seed JSON shape

Matches the canonical Glass Outlet seed shape (see `supabase/seeds/glass-outlet/products/vs.json` for reference). Top-level:

```json
{
  "org_slug": "glass-outlet",
  "supplier_slug": "discount-fencing",
  "system_instance_slug": "dfsau-cca-pine-paling",
  "products": [
    {
      "system_type": "DF_CCA_PAL",
      "product_type": "fence",
      "name": "Discount Fencing — CCA Pine Paling Fence",
      "description": "...",
      "active": true,
      "sort_order": 100,
      "metadata": { "options": {...}, "_provenance": {...} }
    }
  ],
  "product_components": [
    {
      "sku": "DF-PAL-100x16-1200",
      "name": "CCA Pine Paling 100×16×1200mm",
      "description": "...",
      "category": "paling",
      "unit": "each",
      "default_price": 1.74,
      "system_types": ["DF_CCA_PAL"],
      "metadata": { "height_mm": 1200, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine" },
      "active": true,
      "subCategory": "palings",
      "sortPriority": 10
    }
    // ... etc
  ]
}
```

Key differences from a from-scratch design:
- Two-level: **`products`** is the system-level (one row per Discount Fencing fence type); **`product_components`** is SKU-level (one row per actual stock-keeping unit).
- **`system_types`** on each component is an array — the same component CAN serve multiple system_types (compare to Glass Outlet's shared slat SKUs across QSHS / VS / XPL). For Discount Fencing we use single-element arrays for now.
- **`default_price`** is NUMERIC dollars (matches existing `pricing_rules.price` shape).
- **`system_type` namespace:** uses `DF_*` prefix to stay unique under the Glass Outlet org (UNIQUE constraint per migration 022). When the multi-org redesign lands, these can be re-namespaced.

Full JSON files are in `_briefs/assets/043-discount-fencing-seeds/cca-pine-paling.json` and `_briefs/assets/043-discount-fencing-seeds/aluminium-pool.json` (bundled with the brief tarball).

## Price book SQL (data migration form)

```sql
-- ============================================================================
-- 043_discount_fencing_seed_priceboook.sql
-- ============================================================================

WITH df AS (SELECT id FROM suppliers WHERE slug='discount-fencing'),
     pb AS (
       INSERT INTO price_books (supplier_id, name, source_file, status, effective_from, metadata)
       VALUES (
         (SELECT id FROM df),
         'Discount Fencing 2026-05 Public Retail',
         'https://www.dfsau.com.au (timber-fencing + aluminium-pool-fencing pages)',
         'published',
         '2026-05-01'::timestamptz,
         jsonb_build_object('basis','public_retail','currency','AUD','tax_inclusive',true)
       )
       ON CONFLICT DO NOTHING
       RETURNING id
     )
INSERT INTO price_book_items (price_book_id, sku, tier_code, min_quantity, price_cents, currency)
SELECT (SELECT id FROM pb), v.sku, 'tier1', 1, v.price_cents, 'AUD'
FROM (VALUES
  -- Timber palings
  ('DF-PAL-100x16-1200',     174),
  ('DF-PAL-100x16-1800',     215),
  ('DF-PAL-100x16-2100',     290),
  ('DF-PAL-100x16-2400',     340),
  ('DF-RAIL-75x38',         1210),
  ('DF-RAIL-100x38-ARRISSED', 1700),
  ('DF-POST-100x75-1800',   1470),
  ('DF-POST-100x75-2400',   1960),
  ('DF-POST-100x75-3000',   2450),
  ('DF-SLEEPER-200x50-2400', 2480),
  ('DF-SLEEPER-200x50-3000', 3000),
  ('DF-SLEEPER-200x75-2400', 3300),
  ('DF-SLEEPER-200x75-3000', 4000),

  -- Aluminium pool — Black (flat top)
  ('DF-AP-FT-BLK-2450',      9400),
  ('DF-AP-FT-BLK-3000',     12900),
  ('DF-AP-GATE-975-BLK',     6900),
  ('DF-AP-GATE-1515-ADJ-BLK', 11300),
  ('DF-AP-SHROUD-BLK',        300),
  ('DF-AP-POST-1800-BLK',    2600),
  ('DF-AP-POST-2100-BLK',    2800),
  ('DF-AP-FLPOST-1300-BLK',  2900),
  ('DF-AP-FLPOST-1600-BLK',  3100),

  -- Aluminium pool — Other colours (flat top)
  ('DF-AP-FT-COL-2475',     11500),
  ('DF-AP-FT-COL-3000',     15000),
  ('DF-AP-GATE-975-COL',    11500),
  ('DF-AP-SHROUD-COL',        300),
  ('DF-AP-POST-1800-COL',    3200),
  ('DF-AP-POST-2100-COL',    3500),
  ('DF-AP-FLPOST-1300-COL',  4200),
  ('DF-AP-FLPOST-1500-COL',  4400),

  -- Aluminium pool — Spear top (Black stock)
  ('DF-AP-SPEAR-2400x1200-BLK', 15500),
  -- Loop-top pricing not on public page — left out; covered by 'POA' marker in seed JSON.

  -- Aluminium slat gate companion product (8 colours, single size, single price)
  ('DF-ALG-930x1800-BLK', 39900),
  ('DF-ALG-930x1800-COL', 39900)
) v(sku, price_cents)
ON CONFLICT (price_book_id, sku, tier_code, min_quantity) DO NOTHING;

-- Sanity log
DO $$ DECLARE v_items INT;
BEGIN
  SELECT COUNT(*) INTO v_items FROM price_book_items pbi
    JOIN price_books pb ON pb.id = pbi.price_book_id
   WHERE pb.supplier_id = (SELECT id FROM suppliers WHERE slug='discount-fencing');
  RAISE NOTICE 'Discount Fencing price book seeded: % items', v_items;
END $$;
```

## Tests / verification

- `npm run seed:products` succeeds for the new supplier folder (no errors loading `supabase/seeds/discount-fencing/products/*.json`)
- Querying `/api/.../bom-calculator` for a Discount Fencing CCA Pine Paling 1800mm-high segment returns the right SKUs at the right quantities (one workbook regression config minimum)
- `resolve_price_cents(<dfsau supplier_id>, 'DF-PAL-100x16-1800', 'tier1', 1, now())` returns `215` (cents)
- `localBomCalculator.test.ts` UNCHANGED

## PR description template

```markdown
## Brief 043 — Discount Fencing: Seed Data + Price Book v1

Seeds the two Discount Fencing instances with public-pricing data: CCA Pine Paling fence + Aluminium Pool fence. Adds a published price book (`Discount Fencing 2026-05 Public Retail`).

### What's added

- `supabase/seeds/discount-fencing/products/cca-pine-paling.json` (13 products, ~3 template-bound rules)
- `supabase/seeds/discount-fencing/products/aluminium-pool.json` (16 products, ~4 template-bound rules)
- Migration 043: published `price_books` row + ~30 `price_book_items` mirroring public retail prices
- Seed loader extended to handle multiple supplier folders

### What's NOT added

- Glass pool / ColorBond / Security instances (pending PDF pricing — follow-up briefs)
- Trade pricing tiers (tier2/tier3 — pending Discount Fencing trade price PDF)

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run seed:products` ingests both supplier folders cleanly
- [ ] BOM run on a sample DF CCA Pine Paling config returns expected SKUs
- [ ] `resolve_price_cents` returns the expected cents for a known SKU
- [ ] PR base branch is `main`
```

## Stop points

- If the seed loader's resolution of `supplier_slug` and `system_instance_slug` isn't trivial to extend (e.g. the loader is heavily coupled to `org_slug`), surface and consider a smaller change: seed loader looks up supplier + system_instance by slug at upsert time and stamps the resulting `products.{supplier_id, system_instance_id}` + `product_components.{supplier_id, system_instance_id}` columns from brief 032.
- If `pricing_rules.supplier_id` (added in brief 032, backfilled in brief 033) hasn't actually been backfilled by the time 043 runs, the price book inserts work fine but the legacy fallback path in `resolve_price_cents` may return Glass Outlet prices for Discount Fencing SKUs. The `resolve_price_cents` price-book path takes precedence so this is mostly a non-issue, but flag if observed.
- The loop-top aluminium pool panel doesn't have a public price (POA in the seed JSON). Surface to Liam if a pricing PDF is available.

## After this PR merges

- **Run** `npm run seed:products` against the target Supabase project.
- **Run** a workbook regression for each instance (brief 038) once Liam supplies the Excel order forms.
- **Follow-up briefs** for glass-pool, colorbond, and security will land once Liam downloads the public pricing PDFs from dfsau.com.au.
- Discount Fencing's `dfsau-cca-pine-paling` and `dfsau-aluminium-pool` instances move from `readiness_status = 'imported'` to `'calculator_ready'` automatically once rules wire up.