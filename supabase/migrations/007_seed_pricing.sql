-- 007_seed_pricing.sql
--
-- Seeds product_pricing for The Glass Outlet org.
-- Tier 1/2/3 prices sourced from the master price file.
-- Colour-variant SKUs are seeded for all 11 colours.
-- Non-colour items (spacer blocks, black caps) have one entry each.
--
-- IMPORTANT: prices are stored server-side only. The client never reads this
-- table (REVOKE ALL is set on product_pricing). All pricing flows through
-- Supabase Edge Functions (service role key only).

DO $$
DECLARE
  _org UUID;
BEGIN
  SELECT id INTO _org FROM organisations WHERE slug = 'glass-outlet';

  -- ── Helper: insert a colour-variant SKU for all 11 colours ─────────────────
  -- Pattern: base_sku + '-' + colour_code
  -- e.g. base='XP-6100-S65', cat='slat', unit='length', t1=37.29, t2=34.65, t3=32.95

  -- 65mm Slat (6100mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-6100-S65-BS', '65mm Slat 6100mm — Black Satin',            'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-MM', '65mm Slat 6100mm — Monument Matt',          'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-WG', '65mm Slat 6100mm — Woodland Grey Matt',     'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-SM', '65mm Slat 6100mm — Surfmist Matt',          'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-PW', '65mm Slat 6100mm — Pearl White Gloss',      'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-BA', '65mm Slat 6100mm — Basalt Satin',           'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-DU', '65mm Slat 6100mm — Dune Satin',             'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-ML', '65mm Slat 6100mm — Mill',                   'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-PR', '65mm Slat 6100mm — Primrose',               'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-PB', '65mm Slat 6100mm — Paperbark',              'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-PA', '65mm Slat 6100mm — Palladium Silver Pearl', 'slat', 'length', 37.29, 34.65, 32.95)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- 90mm Slat (6100mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'QS-6100-S90-BS', '90mm Slat 6100mm — Black Satin',            'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-MM', '90mm Slat 6100mm — Monument Matt',          'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-WG', '90mm Slat 6100mm — Woodland Grey Matt',     'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-SM', '90mm Slat 6100mm — Surfmist Matt',          'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-PW', '90mm Slat 6100mm — Pearl White Gloss',      'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-BA', '90mm Slat 6100mm — Basalt Satin',           'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-DU', '90mm Slat 6100mm — Dune Satin',             'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-ML', '90mm Slat 6100mm — Mill',                   'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-PR', '90mm Slat 6100mm — Primrose',               'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-PB', '90mm Slat 6100mm — Paperbark',              'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-PA', '90mm Slat 6100mm — Palladium Silver Pearl', 'slat', 'length', 50.49, 46.96, 44.65)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Side Frame (5800mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'QS-5800-SF-BS', 'Side Frame 5800mm — Black Satin',            'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-MM', 'Side Frame 5800mm — Monument Matt',          'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-WG', 'Side Frame 5800mm — Woodland Grey Matt',     'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-SM', 'Side Frame 5800mm — Surfmist Matt',          'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-PW', 'Side Frame 5800mm — Pearl White Gloss',      'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-BA', 'Side Frame 5800mm — Basalt Satin',           'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-DU', 'Side Frame 5800mm — Dune Satin',             'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-ML', 'Side Frame 5800mm — Mill',                   'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-PR', 'Side Frame 5800mm — Primrose',               'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-PB', 'Side Frame 5800mm — Paperbark',              'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-PA', 'Side Frame 5800mm — Palladium Silver Pearl', 'rail', 'length', 24.35, 23.16, 21.80)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Channel Frame Connector (5800mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'QS-5800-CFC-BS', 'CFC 5800mm — Black Satin',            'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-MM', 'CFC 5800mm — Monument Matt',          'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-WG', 'CFC 5800mm — Woodland Grey Matt',     'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-SM', 'CFC 5800mm — Surfmist Matt',          'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-PW', 'CFC 5800mm — Pearl White Gloss',      'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-BA', 'CFC 5800mm — Basalt Satin',           'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-DU', 'CFC 5800mm — Dune Satin',             'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-ML', 'CFC 5800mm — Mill',                   'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-PR', 'CFC 5800mm — Primrose',               'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-PB', 'CFC 5800mm — Paperbark',              'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-PA', 'CFC 5800mm — Palladium Silver Pearl', 'rail', 'length', 16.92, 15.94, 14.92)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- CSR / Corner Slat Rail (5800mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-5800-CSR-BS', 'CSR 5800mm — Black Satin',            'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-MM', 'CSR 5800mm — Monument Matt',          'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-WG', 'CSR 5800mm — Woodland Grey Matt',     'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-SM', 'CSR 5800mm — Surfmist Matt',          'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-PW', 'CSR 5800mm — Pearl White Gloss',      'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-BA', 'CSR 5800mm — Basalt Satin',           'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-DU', 'CSR 5800mm — Dune Satin',             'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-ML', 'CSR 5800mm — Mill',                   'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-PR', 'CSR 5800mm — Primrose',               'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-PB', 'CSR 5800mm — Paperbark',              'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-PA', 'CSR 5800mm — Palladium Silver Pearl', 'bracket', 'length', 43.48, 39.56, 34.79)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Full Post (2400mm — individual item, not cut from stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-2400-FP-BS', 'Full Post 2400mm — Black Satin',            'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-MM', 'Full Post 2400mm — Monument Matt',          'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-WG', 'Full Post 2400mm — Woodland Grey Matt',     'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-SM', 'Full Post 2400mm — Surfmist Matt',          'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-PW', 'Full Post 2400mm — Pearl White Gloss',      'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-BA', 'Full Post 2400mm — Basalt Satin',           'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-DU', 'Full Post 2400mm — Dune Satin',             'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-ML', 'Full Post 2400mm — Mill',                   'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-PR', 'Full Post 2400mm — Primrose',               'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-PB', 'Full Post 2400mm — Paperbark',              'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-PA', 'Full Post 2400mm — Palladium Silver Pearl', 'post', 'each', 38.55, 36.25, 34.32)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- CSR End Cap (colour-matched)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-CSRC-BS', 'CSR End Cap — Black Satin',            'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-MM', 'CSR End Cap — Monument Matt',          'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-WG', 'CSR End Cap — Woodland Grey Matt',     'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-SM', 'CSR End Cap — Surfmist Matt',          'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-PW', 'CSR End Cap — Pearl White Gloss',      'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-BA', 'CSR End Cap — Basalt Satin',           'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-DU', 'CSR End Cap — Dune Satin',             'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-ML', 'CSR End Cap — Mill',                   'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-PR', 'CSR End Cap — Primrose',               'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-PB', 'CSR End Cap — Paperbark',              'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-PA', 'CSR End Cap — Palladium Silver Pearl', 'accessory', 'each', 1.03, 0.92, 0.82)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Base/Top Plate (colour-matched)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-BTP-BS', 'Base/Top Plate — Black Satin',            'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-MM', 'Base/Top Plate — Monument Matt',          'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-WG', 'Base/Top Plate — Woodland Grey Matt',     'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-SM', 'Base/Top Plate — Surfmist Matt',          'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-PW', 'Base/Top Plate — Pearl White Gloss',      'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-BA', 'Base/Top Plate — Basalt Satin',           'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-DU', 'Base/Top Plate — Dune Satin',             'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-ML', 'Base/Top Plate — Mill',                   'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-PR', 'Base/Top Plate — Primrose',               'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-PB', 'Base/Top Plate — Paperbark',              'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-PA', 'Base/Top Plate — Palladium Silver Pearl', 'accessory', 'each', 4.64, 4.13, 3.71)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Screw Pack 100 (colour-matched anodised)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-SCREWS-BS', 'Screw Pack 100 — Black Satin',            'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-MM', 'Screw Pack 100 — Monument Matt',          'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-WG', 'Screw Pack 100 — Woodland Grey Matt',     'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-SM', 'Screw Pack 100 — Surfmist Matt',          'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-PW', 'Screw Pack 100 — Pearl White Gloss',      'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-BA', 'Screw Pack 100 — Basalt Satin',           'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-DU', 'Screw Pack 100 — Dune Satin',             'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-ML', 'Screw Pack 100 — Mill',                   'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-PR', 'Screw Pack 100 — Primrose',               'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-PB', 'Screw Pack 100 — Paperbark',              'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-PA', 'Screw Pack 100 — Palladium Silver Pearl', 'screw', 'pack', 6.06, 5.70, 4.91)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- ── Colour-agnostic items ─────────────────────────────────────────────────

  -- Side Frame Cap (always black nylon)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price)
  VALUES (_org, 'QS-SFC-B', 'Side Frame Cap (Black)', 'accessory', 'each', 0.86, 0.81, 0.74)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Spacer Blocks 9mm 50-pack
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price)
  VALUES (_org, 'XPL-SB-50PK-09MM', 'Spacer Block 9mm (50-pack)', 'accessory', 'pack', 3.01, 2.90, 2.41)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Spacer Blocks 20mm 50-pack
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price)
  VALUES (_org, 'XPL-SB-50PK-20MM', 'Spacer Block 20mm (50-pack)', 'accessory', 'pack', 3.56, 3.30, 2.90)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- ── Gate-specific items ───────────────────────────────────────────────────

  -- Gate Side Frame Kit 9mm gap (colour-matched)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-GKIT-LSET09-BS', 'Gate Frame Kit 9mm — Black Satin',            'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-MM', 'Gate Frame Kit 9mm — Monument Matt',          'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-WG', 'Gate Frame Kit 9mm — Woodland Grey Matt',     'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-SM', 'Gate Frame Kit 9mm — Surfmist Matt',          'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-PW', 'Gate Frame Kit 9mm — Pearl White Gloss',      'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-BA', 'Gate Frame Kit 9mm — Basalt Satin',           'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-DU', 'Gate Frame Kit 9mm — Dune Satin',             'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-ML', 'Gate Frame Kit 9mm — Mill',                   'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-PR', 'Gate Frame Kit 9mm — Primrose',               'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-PB', 'Gate Frame Kit 9mm — Paperbark',              'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-PA', 'Gate Frame Kit 9mm — Palladium Silver Pearl', 'gate', 'each', 85.00, 79.00, 73.00)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Gate Side Frame Kit 20mm gap
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-GKIT-LSET20-BS', 'Gate Frame Kit 20mm — Black Satin',            'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-MM', 'Gate Frame Kit 20mm — Monument Matt',          'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-WG', 'Gate Frame Kit 20mm — Woodland Grey Matt',     'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-SM', 'Gate Frame Kit 20mm — Surfmist Matt',          'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-PW', 'Gate Frame Kit 20mm — Pearl White Gloss',      'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-BA', 'Gate Frame Kit 20mm — Basalt Satin',           'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-DU', 'Gate Frame Kit 20mm — Dune Satin',             'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-ML', 'Gate Frame Kit 20mm — Mill',                   'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-PR', 'Gate Frame Kit 20mm — Primrose',               'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-PB', 'Gate Frame Kit 20mm — Paperbark',              'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-PA', 'Gate Frame Kit 20mm — Palladium Silver Pearl', 'gate', 'each', 85.00, 79.00, 73.00)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Gate Blade 65mm (6100mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-6100-GB65-BS', 'Gate Blade 65mm 6100mm — Black Satin',            'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-MM', 'Gate Blade 65mm 6100mm — Monument Matt',          'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-WG', 'Gate Blade 65mm 6100mm — Woodland Grey Matt',     'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-SM', 'Gate Blade 65mm 6100mm — Surfmist Matt',          'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-PW', 'Gate Blade 65mm 6100mm — Pearl White Gloss',      'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-BA', 'Gate Blade 65mm 6100mm — Basalt Satin',           'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-DU', 'Gate Blade 65mm 6100mm — Dune Satin',             'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-ML', 'Gate Blade 65mm 6100mm — Mill',                   'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-PR', 'Gate Blade 65mm 6100mm — Primrose',               'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-PB', 'Gate Blade 65mm 6100mm — Paperbark',              'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-PA', 'Gate Blade 65mm 6100mm — Palladium Silver Pearl', 'gate', 'length', 38.50, 35.50, 33.00)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Gate Blade 90mm
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-6100-GB90-BS', 'Gate Blade 90mm 6100mm — Black Satin',            'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-SM', 'Gate Blade 90mm 6100mm — Surfmist Matt',          'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-MM', 'Gate Blade 90mm 6100mm — Monument Matt',          'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-WG', 'Gate Blade 90mm 6100mm — Woodland Grey Matt',     'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-PW', 'Gate Blade 90mm 6100mm — Pearl White Gloss',      'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-BA', 'Gate Blade 90mm 6100mm — Basalt Satin',           'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-DU', 'Gate Blade 90mm 6100mm — Dune Satin',             'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-ML', 'Gate Blade 90mm 6100mm — Mill',                   'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-PR', 'Gate Blade 90mm 6100mm — Primrose',               'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-PB', 'Gate Blade 90mm 6100mm — Paperbark',              'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-PA', 'Gate Blade 90mm 6100mm — Palladium Silver Pearl', 'gate', 'length', 52.00, 48.00, 45.00)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Gate Posts (colour-matched, 4 sizes)
  -- 65x65 HD
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-GP-6565-BS', 'Gate Post 65x65 — Black Satin',            'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-MM', 'Gate Post 65x65 — Monument Matt',          'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-WG', 'Gate Post 65x65 — Woodland Grey Matt',     'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-SM', 'Gate Post 65x65 — Surfmist Matt',          'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-PW', 'Gate Post 65x65 — Pearl White Gloss',      'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-BA', 'Gate Post 65x65 — Basalt Satin',           'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-DU', 'Gate Post 65x65 — Dune Satin',             'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-ML', 'Gate Post 65x65 — Mill',                   'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-PR', 'Gate Post 65x65 — Primrose',               'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-PB', 'Gate Post 65x65 — Paperbark',              'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-PA', 'Gate Post 65x65 — Palladium Silver Pearl', 'post', 'each', 65.00, 60.00, 55.00)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Gate hardware (colour-agnostic)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'DD-KWIKFIT-ADJ', 'D&D Kwik Fit Hinge — Adjustable',   'hardware', 'each', 28.50, 26.50, 24.50),
    (_org, 'DD-KWIKFIT-FXD', 'D&D Kwik Fit Hinge — Fixed',        'hardware', 'each', 24.50, 22.50, 20.50),
    (_org, 'DD-HINGE-HD',    'Heavy Duty Hinge (weld-on)',         'hardware', 'each', 35.00, 32.00, 29.00),
    (_org, 'DD-ML-TP',       'D&D Magna Latch — Top Pull',        'hardware', 'each', 65.00, 60.00, 55.00),
    (_org, 'DD-ML-LB',       'D&D Magna Latch + Lock Box',        'hardware', 'each', 95.00, 88.00, 81.00),
    (_org, 'DD-DROP-BOLT',   'Drop Bolt',                          'hardware', 'each', 18.00, 16.50, 15.00),
    (_org, 'XP-SLIDE-TRACK', 'Sliding Gate Track',                'hardware', 'length', 95.00, 88.00, 81.00),
    (_org, 'XP-GUIDE-ROLLER','Guide Roller',                       'hardware', 'each', 22.00, 20.00, 18.00)
  ON CONFLICT (org_id, sku) DO NOTHING;

END $$;
