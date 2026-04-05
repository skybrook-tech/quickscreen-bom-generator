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
  _slug TEXT := 'glass-outlet';
BEGIN
  SELECT id INTO _org FROM organisations WHERE slug = _slug;

  -- ── Helper: insert a colour-variant SKU for all 11 colours ─────────────────
  -- Pattern: base_sku + '-' + colour_code
  -- e.g. base='XP-6100-S65', cat='slat', unit='length', t1=37.29, t2=34.65, t3=32.95


  -- Seed the four fence systems and the gate product for the Glass Outlet org
  INSERT INTO products (org_id, name, system_type, description)
  SELECT
    o.id,
    vals.name,
    vals.system_type,
    vals.description
  FROM organisations o
  CROSS JOIN (VALUES
    ('QSHS Horizontal Slat Screen', 'QSHS', 'Standard horizontal slat system. Slats run horizontally, inserted into slotted posts.'),
    ('VS Vertical Slat Screen',     'VS',   'Vertical slat orientation. Slats insert into top and bottom rails.'),
    ('XPL XPress Plus Premium',     'XPL',  '65mm slats only (forced). Insert/clip system with different bracket requirements.'),
    ('BAYG Buy As You Go',          'BAYG', 'Spacers sold separately. Customer assembles themselves.'),
    ('Gate',                        'GATE', 'Swing and sliding gate products.')
  ) AS vals(name, system_type, description)
  WHERE o.slug = _slug;


  -- 65mm Slat (6100mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-6100-S65-B', '65mm Slat 6100mm — Black Satin',            'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-MN', '65mm Slat 6100mm — Monument Matt',          'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-G', '65mm Slat 6100mm — Woodland Grey Matt',     'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-SM', '65mm Slat 6100mm — Surfmist Matt',          'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-W', '65mm Slat 6100mm — Pearl White Gloss',      'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-BS', '65mm Slat 6100mm — Basalt Satin',           'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-D', '65mm Slat 6100mm — Dune Satin',             'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-M', '65mm Slat 6100mm — Mill',                   'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-P', '65mm Slat 6100mm — Primrose',               'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-PB', '65mm Slat 6100mm — Paperbark',              'slat', 'length', 37.29, 34.65, 32.95),
    (_org, 'XP-6100-S65-S', '65mm Slat 6100mm — Palladium Silver Pearl', 'slat', 'length', 37.29, 34.65, 32.95)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- 90mm Slat (6100mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'QS-6100-S90-B', '90mm Slat 6100mm — Black Satin',            'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-MN', '90mm Slat 6100mm — Monument Matt',          'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-G', '90mm Slat 6100mm — Woodland Grey Matt',     'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-SM', '90mm Slat 6100mm — Surfmist Matt',          'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-W', '90mm Slat 6100mm — Pearl White Gloss',      'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-BS', '90mm Slat 6100mm — Basalt Satin',           'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-D', '90mm Slat 6100mm — Dune Satin',             'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-M', '90mm Slat 6100mm — Mill',                   'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-P', '90mm Slat 6100mm — Primrose',               'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-PB', '90mm Slat 6100mm — Paperbark',              'slat', 'length', 50.49, 46.96, 44.65),
    (_org, 'QS-6100-S90-S', '90mm Slat 6100mm — Palladium Silver Pearl', 'slat', 'length', 50.49, 46.96, 44.65)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Side Frame (5800mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'QS-5800-SF-B', 'Side Frame 5800mm — Black Satin',            'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-MN', 'Side Frame 5800mm — Monument Matt',          'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-G', 'Side Frame 5800mm — Woodland Grey Matt',     'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-SM', 'Side Frame 5800mm — Surfmist Matt',          'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-W', 'Side Frame 5800mm — Pearl White Gloss',      'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-BS', 'Side Frame 5800mm — Basalt Satin',           'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-D', 'Side Frame 5800mm — Dune Satin',             'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-M', 'Side Frame 5800mm — Mill',                   'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-P', 'Side Frame 5800mm — Primrose',               'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-PB', 'Side Frame 5800mm — Paperbark',              'rail', 'length', 24.35, 23.16, 21.80),
    (_org, 'QS-5800-SF-S', 'Side Frame 5800mm — Palladium Silver Pearl', 'rail', 'length', 24.35, 23.16, 21.80)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Channel Frame Connector (5800mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'QS-5800-CFC-B', 'CFC 5800mm — Black Satin',            'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-MN', 'CFC 5800mm — Monument Matt',          'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-G', 'CFC 5800mm — Woodland Grey Matt',     'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-SM', 'CFC 5800mm — Surfmist Matt',          'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-W', 'CFC 5800mm — Pearl White Gloss',      'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-BS', 'CFC 5800mm — Basalt Satin',           'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-D', 'CFC 5800mm — Dune Satin',             'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-M', 'CFC 5800mm — Mill',                   'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-P', 'CFC 5800mm — Primrose',               'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-PB', 'CFC 5800mm — Paperbark',              'rail', 'length', 16.92, 15.94, 14.92),
    (_org, 'QS-5800-CFC-S', 'CFC 5800mm — Palladium Silver Pearl', 'rail', 'length', 16.92, 15.94, 14.92)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- CSR / Corner Slat Rail (5800mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-5800-CSR-B', 'CSR 5800mm — Black Satin',            'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-MN', 'CSR 5800mm — Monument Matt',          'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-G', 'CSR 5800mm — Woodland Grey Matt',     'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-SM', 'CSR 5800mm — Surfmist Matt',          'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-W', 'CSR 5800mm — Pearl White Gloss',      'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-BS', 'CSR 5800mm — Basalt Satin',           'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-D', 'CSR 5800mm — Dune Satin',             'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-M', 'CSR 5800mm — Mill',                   'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-P', 'CSR 5800mm — Primrose',               'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-PB', 'CSR 5800mm — Paperbark',              'bracket', 'length', 43.48, 39.56, 34.79),
    (_org, 'XP-5800-CSR-S', 'CSR 5800mm — Palladium Silver Pearl', 'bracket', 'length', 43.48, 39.56, 34.79)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Full Post (2400mm — individual item, not cut from stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-2400-FP-B', 'Full Post 2400mm — Black Satin',            'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-MN', 'Full Post 2400mm — Monument Matt',          'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-G', 'Full Post 2400mm — Woodland Grey Matt',     'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-SM', 'Full Post 2400mm — Surfmist Matt',          'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-W', 'Full Post 2400mm — Pearl White Gloss',      'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-BS', 'Full Post 2400mm — Basalt Satin',           'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-D', 'Full Post 2400mm — Dune Satin',             'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-M', 'Full Post 2400mm — Mill',                   'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-P', 'Full Post 2400mm — Primrose',               'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-PB', 'Full Post 2400mm — Paperbark',              'post', 'each', 38.55, 36.25, 34.32),
    (_org, 'XP-2400-FP-S', 'Full Post 2400mm — Palladium Silver Pearl', 'post', 'each', 38.55, 36.25, 34.32)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- CSR End Cap (colour-matched)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-CSRC-B', 'CSR End Cap — Black Satin',            'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-MN', 'CSR End Cap — Monument Matt',          'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-G', 'CSR End Cap — Woodland Grey Matt',     'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-SM', 'CSR End Cap — Surfmist Matt',          'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-W', 'CSR End Cap — Pearl White Gloss',      'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-BS', 'CSR End Cap — Basalt Satin',           'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-D', 'CSR End Cap — Dune Satin',             'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-M', 'CSR End Cap — Mill',                   'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-P', 'CSR End Cap — Primrose',               'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-PB', 'CSR End Cap — Paperbark',              'accessory', 'each', 1.03, 0.92, 0.82),
    (_org, 'XP-CSRC-S', 'CSR End Cap — Palladium Silver Pearl', 'accessory', 'each', 1.03, 0.92, 0.82)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Base/Top Plate (colour-matched)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-BTP-B', 'Base/Top Plate — Black Satin',            'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-MN', 'Base/Top Plate — Monument Matt',          'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-G', 'Base/Top Plate — Woodland Grey Matt',     'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-SM', 'Base/Top Plate — Surfmist Matt',          'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-W', 'Base/Top Plate — Pearl White Gloss',      'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-BS', 'Base/Top Plate — Basalt Satin',           'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-D', 'Base/Top Plate — Dune Satin',             'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-M', 'Base/Top Plate — Mill',                   'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-P', 'Base/Top Plate — Primrose',               'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-PB', 'Base/Top Plate — Paperbark',              'accessory', 'each', 4.64, 4.13, 3.71),
    (_org, 'XP-BTP-S', 'Base/Top Plate — Palladium Silver Pearl', 'accessory', 'each', 4.64, 4.13, 3.71)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Screw Pack 100 (colour-matched anodised)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-SCREWS-B', 'Screw Pack 100 — Black Satin',            'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-MN', 'Screw Pack 100 — Monument Matt',          'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-G', 'Screw Pack 100 — Woodland Grey Matt',     'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-SM', 'Screw Pack 100 — Surfmist Matt',          'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-W', 'Screw Pack 100 — Pearl White Gloss',      'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-BS', 'Screw Pack 100 — Basalt Satin',           'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-D', 'Screw Pack 100 — Dune Satin',             'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-M', 'Screw Pack 100 — Mill',                   'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-P', 'Screw Pack 100 — Primrose',               'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-PB', 'Screw Pack 100 — Paperbark',              'screw', 'pack', 6.06, 5.70, 4.91),
    (_org, 'XP-SCREWS-S', 'Screw Pack 100 — Palladium Silver Pearl', 'screw', 'pack', 6.06, 5.70, 4.91)
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
    (_org, 'XP-GKIT-LSET09-B', 'Gate Frame Kit 9mm — Black Satin',            'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-MN', 'Gate Frame Kit 9mm — Monument Matt',          'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-G', 'Gate Frame Kit 9mm — Woodland Grey Matt',     'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-SM', 'Gate Frame Kit 9mm — Surfmist Matt',          'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-W', 'Gate Frame Kit 9mm — Pearl White Gloss',      'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-BS', 'Gate Frame Kit 9mm — Basalt Satin',           'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-D', 'Gate Frame Kit 9mm — Dune Satin',             'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-M', 'Gate Frame Kit 9mm — Mill',                   'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-P', 'Gate Frame Kit 9mm — Primrose',               'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-PB', 'Gate Frame Kit 9mm — Paperbark',              'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET09-S', 'Gate Frame Kit 9mm — Palladium Silver Pearl', 'gate', 'each', 85.00, 79.00, 73.00)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Gate Side Frame Kit 20mm gap
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-GKIT-LSET20-B', 'Gate Frame Kit 20mm — Black Satin',            'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-MN', 'Gate Frame Kit 20mm — Monument Matt',          'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-G', 'Gate Frame Kit 20mm — Woodland Grey Matt',     'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-SM', 'Gate Frame Kit 20mm — Surfmist Matt',          'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-W', 'Gate Frame Kit 20mm — Pearl White Gloss',      'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-BS', 'Gate Frame Kit 20mm — Basalt Satin',           'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-D', 'Gate Frame Kit 20mm — Dune Satin',             'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-M', 'Gate Frame Kit 20mm — Mill',                   'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-P', 'Gate Frame Kit 20mm — Primrose',               'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-PB', 'Gate Frame Kit 20mm — Paperbark',              'gate', 'each', 85.00, 79.00, 73.00),
    (_org, 'XP-GKIT-LSET20-S', 'Gate Frame Kit 20mm — Palladium Silver Pearl', 'gate', 'each', 85.00, 79.00, 73.00)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Gate Blade 65mm (6100mm stock)
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-6100-GB65-B', 'Gate Blade 65mm 6100mm — Black Satin',            'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-MN', 'Gate Blade 65mm 6100mm — Monument Matt',          'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-G', 'Gate Blade 65mm 6100mm — Woodland Grey Matt',     'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-SM', 'Gate Blade 65mm 6100mm — Surfmist Matt',          'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-W', 'Gate Blade 65mm 6100mm — Pearl White Gloss',      'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-BS', 'Gate Blade 65mm 6100mm — Basalt Satin',           'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-D', 'Gate Blade 65mm 6100mm — Dune Satin',             'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-M', 'Gate Blade 65mm 6100mm — Mill',                   'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-P', 'Gate Blade 65mm 6100mm — Primrose',               'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-PB', 'Gate Blade 65mm 6100mm — Paperbark',              'gate', 'length', 38.50, 35.50, 33.00),
    (_org, 'XP-6100-GB65-S', 'Gate Blade 65mm 6100mm — Palladium Silver Pearl', 'gate', 'length', 38.50, 35.50, 33.00)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Gate Blade 90mm
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-6100-GB90-B', 'Gate Blade 90mm 6100mm — Black Satin',            'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-SM', 'Gate Blade 90mm 6100mm — Surfmist Matt',          'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-MN', 'Gate Blade 90mm 6100mm — Monument Matt',          'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-G', 'Gate Blade 90mm 6100mm — Woodland Grey Matt',     'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-W', 'Gate Blade 90mm 6100mm — Pearl White Gloss',      'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-BS', 'Gate Blade 90mm 6100mm — Basalt Satin',           'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-D', 'Gate Blade 90mm 6100mm — Dune Satin',             'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-M', 'Gate Blade 90mm 6100mm — Mill',                   'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-P', 'Gate Blade 90mm 6100mm — Primrose',               'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-PB', 'Gate Blade 90mm 6100mm — Paperbark',              'gate', 'length', 52.00, 48.00, 45.00),
    (_org, 'XP-6100-GB90-S', 'Gate Blade 90mm 6100mm — Palladium Silver Pearl', 'gate', 'length', 52.00, 48.00, 45.00)
  ON CONFLICT (org_id, sku) DO NOTHING;

  -- Gate Posts (colour-matched, 4 sizes)
  -- 65x65 HD
  INSERT INTO product_pricing (org_id, sku, description, category, unit, tier1_price, tier2_price, tier3_price) VALUES
    (_org, 'XP-GP-6565-B', 'Gate Post 65x65 — Black Satin',            'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-MN', 'Gate Post 65x65 — Monument Matt',          'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-G', 'Gate Post 65x65 — Woodland Grey Matt',     'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-SM', 'Gate Post 65x65 — Surfmist Matt',          'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-W', 'Gate Post 65x65 — Pearl White Gloss',      'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-BS', 'Gate Post 65x65 — Basalt Satin',           'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-D', 'Gate Post 65x65 — Dune Satin',             'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-M', 'Gate Post 65x65 — Mill',                   'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-P', 'Gate Post 65x65 — Primrose',               'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-PB', 'Gate Post 65x65 — Paperbark',              'post', 'each', 65.00, 60.00, 55.00),
    (_org, 'XP-GP-6565-S', 'Gate Post 65x65 — Palladium Silver Pearl', 'post', 'each', 65.00, 60.00, 55.00)
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
