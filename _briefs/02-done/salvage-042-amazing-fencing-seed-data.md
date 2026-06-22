> **Salvage paper trail.** Ported from fork brief 046 as part of SALVAGE-PLAN Phase C.
> Adapted for main: identity (suppliers + system_instances + the timber-paling archetype) is one squashed
> migration (039); AF/DF orgs live in organizations.sql; product/pricing data is JSON-authoritative
> (supabase/seeds/{amazing-fencing,discount-fencing}/), NOT the fork's SQL pricebooks (046/057, skipped).
> Discount Fencing is its own org (confirmed a separate business). Branding deferred to Phase E (embed).

# Brief 046 — Amazing Fencing: Seed Data + Draft Price Book

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 045 merged + brief 034 merged (price_books table exists)
**Estimated PR size:** large (5 seed JSON files + 1 data migration for the draft price book)
**Primary reference:** `_briefs/assets/046-amazing-fencing-seeds/` (bundled with this brief) — the seed JSON files that drop into `supabase/seeds/amazing-fencing/products/`

---

## Goal

Seed the **six Amazing Fencing system_instances** (created in brief 045) with their full SKU catalogues. Liam supplied the Cin7 trade pricing export (`MassDownloadProducts_20260526_0305PM.xlsx`, 52 SKUs); this brief ships a **PUBLISHED tier2 (trade) price book** populated from `BuyPriceEx`, covering the timber-paling and retaining-wall instances. The remaining 4 instances (Colorbond, PermaSteel, slat screen, chainwire) still have pricing pending — their SKUs seed with `default_price: null` and stay at `readiness_status = 'imported'`.

This proves the architecture handles **a mixed-pricing supplier** — some instances fully priced from a Cin7 export, some pending separate PDFs from the same supplier.

**Updated 2026-05-28:** Pricing populated for timber + retaining-wall. New 6th instance (retaining wall) added.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **All `default_price` fields are `null`** in the seed components. Migration creates a DRAFT price book with zero items.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/seeds/amazing-fencing/products/colorbond.json` | NEW — products + components for ColorBond (no prices, pricing PDF still pending) |
| `supabase/seeds/amazing-fencing/products/permasteel.json` | NEW — products + components for PermaSteel modular bundles (no prices) |
| `supabase/seeds/amazing-fencing/products/timber-paling.json` | NEW — products + components for treated pine + hardwood paling, **with tier2 prices from Cin7** (40+ SKUs) |
| `supabase/seeds/amazing-fencing/products/timber-slat-screen.json` | NEW — products + components for timber slat screening (no prices) |
| `supabase/seeds/amazing-fencing/products/chainwire-security.json` | NEW — products + components for chainwire / security (no prices) |
| `supabase/seeds/amazing-fencing/products/retaining-wall.json` | NEW — pine + hardwood sleepers, **with tier2 prices from Cin7** (9 SKUs) |
| `supabase/migrations/046_amazing_fencing_trade_price_book.sql` | NEW — **PUBLISHED tier2 trade price book** with items for timber + retaining wall (BuyPriceEx from Cin7 export); pricing for other instances remains pending |
| `catalogues/amazing-fencing/source-skus-2026-05.md` | NEW — verbatim copy of the supply-side SKU lists (audit trail) |

## SKU catalogue source

Full SKU lists captured from `fencing-supplies.com.au` on 2026-05-28:

### Steel / ColorBond / PermaSteel

**Posts:**
- C Posts (PermaSteel): 2.1, 2.4, 2.7, 3.0m
- PERMA-STEEL C Posts × 0.95mm: 2.4, 2.7, 3.0m
- Coloured Posts: 50×50 in 2.4 and 3.0m; 65×65 in 2.4 and 3.0m
- P/Coated Galv Posts: 50×50 in 2.4/3.0/3.6m; 65×65 in 2.4/3.0/4.0m
- Steel Posts (generic): 50×50 in 2.4/3.0/3.6m; 65×65 in 2.4/3.0/3.6m

**Rails:**
- Rails: 2.35m, 3.10m
- PERMA-STEEL rail × 0.8mm: 2.35m, 3.10m

**Sheets:**
- Standard sheets: 1.5m, 1.8m, 2.1m, 2.4m heights
- PERMA-STEEL new-style sheets × 0.35mm: 1190mm, 1490mm, 1790mm, 2090mm, 2390mm (raked / standard)

**PermaSteel GP bundles:**
- 1.5m, 1.8m, 2.1m, 2.4m

**Gates (single):**
- Standard Single Gate GP Bundle: 0.9, 1.2, 1.5, 1.8, 2.1m
- PermaSteel Single Gate GP Bundle: 0.9, 1.5, 1.8, 2.1m
- Gate Styles: 1.2, 1.5, 1.8, 2.1m
- 50×50 P/Coated Gate Style: 1.5h, 1.8h, 2.1h

**Gates (double):**
- Standard Double Gate GP Bundle: 0.9, 1.2, 1.5, 1.8, 2.1m
- PermaSteel Double Gate GP Bundle: 1.2, 1.5, 1.8, 2.1m

**Gate hardware:**
- Butt Hinges, "D" Latch & Striker & Handle, Double set, Drop Bolt, Single set, Handle for D Latch 170mm, Anti-rattle sleeve

**Lattice:**
- Lattice Sheet 2.35m, 3.10m
- 300mm × 2.35m DIA PERMA-STEEL Lattice
- 300mm × 3.1m DIA PERMA-STEEL Lattice

**Screws:**
- Bugel (timber): 50mm, 75mm, 100mm
- Tek (metal): 20mm, 35mm, 45mm, 65mm, 75mm
- Coloured Screw SD 10-16 × 16mm Hex (each)

**Caps & accessories:**
- 100×100 Sqr Metal Cap
- 100×50 Black Plastic Cap (timber)
- Touch-up Paint

**Sleepers (steel range):**
- 150×50 in 2.4m, 3.0m
- 200×50 in 2.4m, 3.0m

### Timber

**Pickets:**
- 70×22 H3 T/P × 0.9, 1.2, 1.5, 1.8m

**Posts:**
- 90×90 H4 F7 × 1.8, 2.4, 3.0, 3.6m
- 125×50 H4 × 2.4, 3.0m

**Rails:**
- 70×35 H3 × 4.8m F7 (per each)

**Screening (per linear metre):**
- 70×22 H3 T/P DAR — per metre
- 90×22 H3 T/P DAR — per metre
- 90×19 H/W Merbau — per metre

**Pool-safe rail:**
- 75×50 H3 T/P Spliced "Pool Safe" Rail (per each)

**Lattice + lattice surround:**
- Lattice surround 70×35 H3 × 4.8m and 5.4m
- Lattice 300mm × 2.4m H3 DAR T/P (Dia and Sqr)
- Lattice 600mm × 2.4m H3 DAR T/P (Dia and Sqr)
- Lattice 600mm × 3.0m H3 DAR T/P (Dia and Sqr)

**Sleepers (timber):**
- 125×50 H4 T/P × 2.4, 3.0m
- 200×100 H4 T/P × 2.4, 3.0m

**Garden edge:**
- 100×25 H4 T/P × 4.8, 5.4m
- 150×25 H4 T/P × 4.8, 5.4m
- 200×25 H4 T/P × 4.8, 5.4m

**Hardware:**
- Dyna Bolts (galv) — 10mm × 50/60/77/97/125mm, 12mm range
- Champher and Routing (timber finishing accessory)

## Price book SQL (data migration form)

```sql
-- ============================================================================
-- 046_amazing_fencing_trade_price_book.sql
--
-- Published tier2 (trade) price book sourced from Amazing Fencing's
-- Cin7 mass-download export (BuyPriceEx column).
-- File: MassDownloadProducts_20260526_0305PM.xlsx (supplied by Liam, 2026-05-28).
-- Covers timber-paling + retaining-wall instances. Other instances'
-- pricing remains pending separate PDFs.
-- ============================================================================

WITH af AS (SELECT id FROM suppliers WHERE slug='amazing-fencing'),
     pb AS (
       INSERT INTO price_books (supplier_id, name, source_file, status, effective_from, metadata)
       VALUES (
         (SELECT id FROM af),
         'Amazing Fencing 2026-05 Trade Pricing (Cin7 timber + retaining)',
         'MassDownloadProducts_20260526_0305PM.xlsx (Cin7 mass-download export)',
         'published',
         '2026-05-01'::timestamptz,
         jsonb_build_object(
           'basis','trade',
           'currency','AUD',
           'tax_inclusive',false,
           'pricing_source','Cin7 mass-download',
           'tier_code','tier2',
           'covers',jsonb_build_array('amazing-timber-paling','amazing-retaining-wall'),
           'pending',jsonb_build_array('amazing-colorbond','amazing-permasteel','amazing-timber-slat-screen','amazing-chainwire-security')
         )
       )
       ON CONFLICT DO NOTHING
       RETURNING id
     )
INSERT INTO price_book_items (price_book_id, sku, tier_code, min_quantity, price_cents, currency)
SELECT (SELECT id FROM pb), v.sku, 'tier2', 1, v.price_cents, 'AUD'
FROM (VALUES
  -- Palings (CCA Pine 100×16)
  ('AF-PAL-100x16-1200',  33),
  ('AF-PAL-100x16-1500', 154),
  ('AF-PAL-100x16-1800', 178),
  -- AF-PAL-100x16-2100 — out of stock; no item
  ('AF-PAL-100x16-2400', 250),

  -- Paddle Pop Palings
  ('AF-PAL-PP-100x16-1200', 130),
  ('AF-PAL-PP-100x16-1500', 170),

  -- Pine Posts (CCA H4)
  ('AF-POST-PINE-100x75-1800', 1071),
  ('AF-POST-PINE-100x75-2400', 1428),
  ('AF-POST-PINE-100x75-3000', 1785),
  ('AF-POST-PINE-100x100-2400', 2568),
  ('AF-POST-PINE-100x100-3000', 3210),

  -- Hardwood Posts (H4)
  ('AF-POST-HWD-100x75-1800', 1681),
  ('AF-POST-HWD-100x75-2100', 2079),
  ('AF-POST-HWD-100x75-2400', 2243),
  ('AF-POST-HWD-100x75-2700', 2543),
  ('AF-POST-HWD-100x75-3000', 2841),
  ('AF-POST-HWD-100x100-1800', 2241),
  ('AF-POST-HWD-100x100-2400', 2988),
  ('AF-POST-HWD-100x100-2700', 3362),

  -- Pine Rails
  ('AF-RAIL-PINE-75x38-4800', 864),
  ('AF-RAIL-PINE-100x38-4800', 1152),
  ('AF-RAIL-PINE-ARR-100x38-4800', 1296),

  -- Hardwood Rails
  ('AF-RAIL-HWD-75x38-4800', 1784),
  ('AF-RAIL-HWD-100x38-4800', 2676),

  -- Nails
  ('AF-NAIL-COIL-45-9000', 5800),
  ('AF-NAIL-COIL-57-9000', 8900),
  ('AF-NAIL-COIL-45-250', 247),
  ('AF-NAIL-COIL-57-250', 380),
  ('AF-NAIL-HD-32-6000', 5000),
  ('AF-NAIL-HD-32-200', 166),
  ('AF-NAIL-SS-45-1800', 14800),

  -- Screws
  ('AF-SCR-BB-14g-75-500', 3637),
  ('AF-SCR-BB-14g-100-500', 1213),
  ('AF-SCR-BB-14g-125-500', 994),

  -- Concrete
  ('AF-CON-RAPID-30', 1104),
  ('AF-CON-POSTMIX-30', 980),
  ('AF-CON-GP-20', 668),

  -- Retaining wall sleepers (hardwood)
  ('AF-RW-SLEEPER-HWD-200x50-2400', 2498),
  ('AF-RW-SLEEPER-HWD-200x50-3000', 3140),
  ('AF-RW-SLEEPER-HWD-200x75-1800', 3000),
  ('AF-RW-SLEEPER-HWD-200x75-2400', 3749),
  ('AF-RW-SLEEPER-HWD-200x75-3000', 4861)
  -- Pine sleepers in retaining-wall.json have null price; not seeded here.
  -- Colonial Pickets also null; defer until Cin7 column lookup confirmed.
) v(sku, price_cents)
ON CONFLICT (price_book_id, sku, tier_code, min_quantity) DO NOTHING;

-- Sanity log
DO $$ DECLARE v_book UUID; v_items INT;
BEGIN
  SELECT pb.id INTO v_book FROM price_books pb
    JOIN suppliers s ON s.id = pb.supplier_id
   WHERE s.slug = 'amazing-fencing' AND pb.status = 'published' LIMIT 1;
  IF v_book IS NULL THEN
    RAISE EXCEPTION 'Amazing Fencing trade price book not created';
  END IF;
  SELECT COUNT(*) INTO v_items FROM price_book_items WHERE price_book_id = v_book;
  RAISE NOTICE 'Amazing Fencing trade price book: % items at tier2', v_items;
END $$;
```

## Tests / verification

- `npm run seed:products` succeeds for the new `supabase/seeds/amazing-fencing/products/*.json` folder
- All 5 instances have product + product_component rows after seeding
- All product_components have `default_price = NULL`
- The draft price book has zero `price_book_items` (intentional — populated later)
- `localBomCalculator.test.ts` UNCHANGED

## PR description template

```markdown
## Brief 046 — Amazing Fencing: Seed Data + Draft Price Book

Seeds the 5 Amazing Fencing instances with full SKU catalogues. Prices are null pending trade pricing PDF; draft price book created with zero items, ready to populate.

### What's added

- 5 seed JSON files: colorbond.json, permasteel.json, timber-paling.json, timber-slat-screen.json, chainwire-security.json
- Migration 046: draft `price_books` row + 0 `price_book_items` (intentional)
- Seed loader extended to handle `supabase/seeds/amazing-fencing/` folder

### What's NOT added (pending)

- Pricing — needs Amazing Fencing's trade pricing PDF
- Workbook regression — needs pricing first

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run seed:products` ingests `amazing-fencing/` folder cleanly
- [ ] 5 instances have products + components after seed
- [ ] All `default_price` are NULL on amazing-fencing components
- [ ] Draft price book exists with 0 items
- [ ] PR base branch is `main`
```

## Stop points

- If the seed loader doesn't enumerate supplier folders (currently hardcoded to `glass-outlet/`), surface and adjust to walk `supabase/seeds/*/products/*.json`. Same stop-point already identified in brief 043.
- If `pricing_rules.supplier_id` (added in brief 032) hasn't been backfilled by brief 033 by the time 046 runs, surface — the fallback path in `resolve_price_cents` may not scope by supplier correctly.

## After this PR merges

- Amazing Fencing's 5 instances appear in the calculator picker (per brief 035's admin UI / brief 044's visibility rules)
- All instances at `readiness_status = 'imported'`
- A draft price book exists; populating it is the next manual step once Liam obtains the trade pricing PDF
- Workbook regression (brief 038) can run once 3-5 representative job configs from Amazing Fencing's order workflow are available