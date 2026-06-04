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