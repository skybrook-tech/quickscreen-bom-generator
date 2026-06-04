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