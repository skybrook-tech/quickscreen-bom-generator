-- slat-fencing.sql
--
-- Seeds product catalog for The Glass Outlet org.
-- Inserts into the post-migration schema:
--   products           — fence systems and gate products
--   product_components — individual SKUs (single source of truth)
--   pricing_rules      — per-tier pricing (and optionally quantity-break rules)
--
-- IMPORTANT: prices are stored server-side only. The client never reads these
-- tables (REVOKE ALL is set). All pricing flows through Supabase Edge Functions.

DO $$
DECLARE
  _org UUID;
  _slug TEXT := 'glass-outlet';
BEGIN
  SELECT id INTO _org FROM organisations WHERE slug = _slug;

  -- ── Products ─────────────────────────────────────────────────────────────────
  -- Root products (parent_id = NULL). Each represents a fence system or gate family.

  INSERT INTO products (org_id, name, system_type, description, sort_order)
  SELECT
    o.id,
    vals.name,
    vals.system_type,
    vals.description,
    vals.sort_order
  FROM organisations o
  CROSS JOIN (VALUES
    ('QSHS Horizontal Slat Screen', 'QSHS', 'Standard horizontal slat system. Slats run horizontally, inserted into slotted posts.',    1),
    ('VS Vertical Slat Screen',     'VS',   'Vertical slat orientation. Slats insert into top and bottom rails.',                       2),
    ('XPL XPress Plus Premium',     'XPL',  '65mm slats only (forced). Insert/clip system with different bracket requirements.',         3),
    ('BAYG Buy As You Go',          'BAYG', 'Spacers sold separately. Customer assembles themselves.',                                   4),
    ('Gate',                        'GATE', 'Swing and sliding gate products.',                                                          5)
  ) AS vals(name, system_type, description, sort_order)
  WHERE o.slug = _slug
  ON CONFLICT (org_id, system_type) WHERE parent_id IS NULL DO NOTHING;


  -- ── product_components ───────────────────────────────────────────────────────
  -- One row per unique SKU. Description, category, unit, and default (tier1) price live here.
  -- system_types[] tags which fence system family uses this component.

  INSERT INTO product_components (org_id, sku, name, description, category, unit, default_price, system_types, metadata, active)
  SELECT _org, v.sku, v.description, v.description, v.category, v.unit, v.t1, v.system_types, '{}'::JSONB, true
  FROM (VALUES
    -- 65mm Slats (6100mm stock) — used in QSHS and XPL
    ('XP-6100-S65-B',  '65mm Slat 6100mm — Black Satin',            'slat', 'length', 37.29, ARRAY['QSHS','XPL']),
    ('XP-6100-S65-MN', '65mm Slat 6100mm — Monument Matt',           'slat', 'length', 37.29, ARRAY['QSHS','XPL']),
    ('XP-6100-S65-G',  '65mm Slat 6100mm — Woodland Grey Matt',      'slat', 'length', 37.29, ARRAY['QSHS','XPL']),
    ('XP-6100-S65-SM', '65mm Slat 6100mm — Surfmist Matt',           'slat', 'length', 37.29, ARRAY['QSHS','XPL']),
    ('XP-6100-S65-W',  '65mm Slat 6100mm — Pearl White Gloss',       'slat', 'length', 37.29, ARRAY['QSHS','XPL']),
    ('XP-6100-S65-BS', '65mm Slat 6100mm — Basalt Satin',            'slat', 'length', 37.29, ARRAY['QSHS','XPL']),
    ('XP-6100-S65-D',  '65mm Slat 6100mm — Dune Satin',              'slat', 'length', 37.29, ARRAY['QSHS','XPL']),
    ('XP-6100-S65-M',  '65mm Slat 6100mm — Mill',                    'slat', 'length', 37.29, ARRAY['QSHS','XPL']),
    ('XP-6100-S65-P',  '65mm Slat 6100mm — Primrose',                'slat', 'length', 37.29, ARRAY['QSHS','XPL']),
    ('XP-6100-S65-PB', '65mm Slat 6100mm — Paperbark',               'slat', 'length', 37.29, ARRAY['QSHS','XPL']),
    ('XP-6100-S65-S',  '65mm Slat 6100mm — Palladium Silver Pearl',  'slat', 'length', 37.29, ARRAY['QSHS','XPL']),

    -- 90mm Slats (6100mm stock) — QSHS only
    ('QS-6100-S90-B',  '90mm Slat 6100mm — Black Satin',            'slat', 'length', 50.49, ARRAY['QSHS']),
    ('QS-6100-S90-MN', '90mm Slat 6100mm — Monument Matt',           'slat', 'length', 50.49, ARRAY['QSHS']),
    ('QS-6100-S90-G',  '90mm Slat 6100mm — Woodland Grey Matt',      'slat', 'length', 50.49, ARRAY['QSHS']),
    ('QS-6100-S90-SM', '90mm Slat 6100mm — Surfmist Matt',           'slat', 'length', 50.49, ARRAY['QSHS']),
    ('QS-6100-S90-W',  '90mm Slat 6100mm — Pearl White Gloss',       'slat', 'length', 50.49, ARRAY['QSHS']),
    ('QS-6100-S90-BS', '90mm Slat 6100mm — Basalt Satin',            'slat', 'length', 50.49, ARRAY['QSHS']),
    ('QS-6100-S90-D',  '90mm Slat 6100mm — Dune Satin',              'slat', 'length', 50.49, ARRAY['QSHS']),
    ('QS-6100-S90-M',  '90mm Slat 6100mm — Mill',                    'slat', 'length', 50.49, ARRAY['QSHS']),
    ('QS-6100-S90-P',  '90mm Slat 6100mm — Primrose',                'slat', 'length', 50.49, ARRAY['QSHS']),
    ('QS-6100-S90-PB', '90mm Slat 6100mm — Paperbark',               'slat', 'length', 50.49, ARRAY['QSHS']),
    ('QS-6100-S90-S',  '90mm Slat 6100mm — Palladium Silver Pearl',  'slat', 'length', 50.49, ARRAY['QSHS']),

    -- Side Frame (5800mm stock) — QSHS
    ('QS-5800-SF-B',  'Side Frame 5800mm — Black Satin',            'rail', 'length', 24.35, ARRAY['QSHS']),
    ('QS-5800-SF-MN', 'Side Frame 5800mm — Monument Matt',           'rail', 'length', 24.35, ARRAY['QSHS']),
    ('QS-5800-SF-G',  'Side Frame 5800mm — Woodland Grey Matt',      'rail', 'length', 24.35, ARRAY['QSHS']),
    ('QS-5800-SF-SM', 'Side Frame 5800mm — Surfmist Matt',           'rail', 'length', 24.35, ARRAY['QSHS']),
    ('QS-5800-SF-W',  'Side Frame 5800mm — Pearl White Gloss',       'rail', 'length', 24.35, ARRAY['QSHS']),
    ('QS-5800-SF-BS', 'Side Frame 5800mm — Basalt Satin',            'rail', 'length', 24.35, ARRAY['QSHS']),
    ('QS-5800-SF-D',  'Side Frame 5800mm — Dune Satin',              'rail', 'length', 24.35, ARRAY['QSHS']),
    ('QS-5800-SF-M',  'Side Frame 5800mm — Mill',                    'rail', 'length', 24.35, ARRAY['QSHS']),
    ('QS-5800-SF-P',  'Side Frame 5800mm — Primrose',                'rail', 'length', 24.35, ARRAY['QSHS']),
    ('QS-5800-SF-PB', 'Side Frame 5800mm — Paperbark',               'rail', 'length', 24.35, ARRAY['QSHS']),
    ('QS-5800-SF-S',  'Side Frame 5800mm — Palladium Silver Pearl',  'rail', 'length', 24.35, ARRAY['QSHS']),

    -- Channel Frame Connector (5800mm stock) — QSHS
    ('QS-5800-CFC-B',  'CFC 5800mm — Black Satin',            'rail', 'length', 16.92, ARRAY['QSHS']),
    ('QS-5800-CFC-MN', 'CFC 5800mm — Monument Matt',           'rail', 'length', 16.92, ARRAY['QSHS']),
    ('QS-5800-CFC-G',  'CFC 5800mm — Woodland Grey Matt',      'rail', 'length', 16.92, ARRAY['QSHS']),
    ('QS-5800-CFC-SM', 'CFC 5800mm — Surfmist Matt',           'rail', 'length', 16.92, ARRAY['QSHS']),
    ('QS-5800-CFC-W',  'CFC 5800mm — Pearl White Gloss',       'rail', 'length', 16.92, ARRAY['QSHS']),
    ('QS-5800-CFC-BS', 'CFC 5800mm — Basalt Satin',            'rail', 'length', 16.92, ARRAY['QSHS']),
    ('QS-5800-CFC-D',  'CFC 5800mm — Dune Satin',              'rail', 'length', 16.92, ARRAY['QSHS']),
    ('QS-5800-CFC-M',  'CFC 5800mm — Mill',                    'rail', 'length', 16.92, ARRAY['QSHS']),
    ('QS-5800-CFC-P',  'CFC 5800mm — Primrose',                'rail', 'length', 16.92, ARRAY['QSHS']),
    ('QS-5800-CFC-PB', 'CFC 5800mm — Paperbark',               'rail', 'length', 16.92, ARRAY['QSHS']),
    ('QS-5800-CFC-S',  'CFC 5800mm — Palladium Silver Pearl',  'rail', 'length', 16.92, ARRAY['QSHS']),

    -- CSR / Corner Slat Rail (5800mm stock) — QSHS
    ('XP-5800-CSR-B',  'CSR 5800mm — Black Satin',            'bracket', 'length', 43.48, ARRAY['QSHS']),
    ('XP-5800-CSR-MN', 'CSR 5800mm — Monument Matt',           'bracket', 'length', 43.48, ARRAY['QSHS']),
    ('XP-5800-CSR-G',  'CSR 5800mm — Woodland Grey Matt',      'bracket', 'length', 43.48, ARRAY['QSHS']),
    ('XP-5800-CSR-SM', 'CSR 5800mm — Surfmist Matt',           'bracket', 'length', 43.48, ARRAY['QSHS']),
    ('XP-5800-CSR-W',  'CSR 5800mm — Pearl White Gloss',       'bracket', 'length', 43.48, ARRAY['QSHS']),
    ('XP-5800-CSR-BS', 'CSR 5800mm — Basalt Satin',            'bracket', 'length', 43.48, ARRAY['QSHS']),
    ('XP-5800-CSR-D',  'CSR 5800mm — Dune Satin',              'bracket', 'length', 43.48, ARRAY['QSHS']),
    ('XP-5800-CSR-M',  'CSR 5800mm — Mill',                    'bracket', 'length', 43.48, ARRAY['QSHS']),
    ('XP-5800-CSR-P',  'CSR 5800mm — Primrose',                'bracket', 'length', 43.48, ARRAY['QSHS']),
    ('XP-5800-CSR-PB', 'CSR 5800mm — Paperbark',               'bracket', 'length', 43.48, ARRAY['QSHS']),
    ('XP-5800-CSR-S',  'CSR 5800mm — Palladium Silver Pearl',  'bracket', 'length', 43.48, ARRAY['QSHS']),

    -- Full Post (2400mm) — QSHS and XPL
    ('XP-2400-FP-B',  'Full Post 2400mm — Black Satin',            'post', 'each', 38.55, ARRAY['QSHS','XPL']),
    ('XP-2400-FP-MN', 'Full Post 2400mm — Monument Matt',           'post', 'each', 38.55, ARRAY['QSHS','XPL']),
    ('XP-2400-FP-G',  'Full Post 2400mm — Woodland Grey Matt',      'post', 'each', 38.55, ARRAY['QSHS','XPL']),
    ('XP-2400-FP-SM', 'Full Post 2400mm — Surfmist Matt',           'post', 'each', 38.55, ARRAY['QSHS','XPL']),
    ('XP-2400-FP-W',  'Full Post 2400mm — Pearl White Gloss',       'post', 'each', 38.55, ARRAY['QSHS','XPL']),
    ('XP-2400-FP-BS', 'Full Post 2400mm — Basalt Satin',            'post', 'each', 38.55, ARRAY['QSHS','XPL']),
    ('XP-2400-FP-D',  'Full Post 2400mm — Dune Satin',              'post', 'each', 38.55, ARRAY['QSHS','XPL']),
    ('XP-2400-FP-M',  'Full Post 2400mm — Mill',                    'post', 'each', 38.55, ARRAY['QSHS','XPL']),
    ('XP-2400-FP-P',  'Full Post 2400mm — Primrose',                'post', 'each', 38.55, ARRAY['QSHS','XPL']),
    ('XP-2400-FP-PB', 'Full Post 2400mm — Paperbark',               'post', 'each', 38.55, ARRAY['QSHS','XPL']),
    ('XP-2400-FP-S',  'Full Post 2400mm — Palladium Silver Pearl',  'post', 'each', 38.55, ARRAY['QSHS','XPL']),

    -- CSR End Cap — QSHS and XPL
    ('XP-CSRC-B',  'CSR End Cap — Black Satin',            'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),
    ('XP-CSRC-MN', 'CSR End Cap — Monument Matt',           'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),
    ('XP-CSRC-G',  'CSR End Cap — Woodland Grey Matt',      'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),
    ('XP-CSRC-SM', 'CSR End Cap — Surfmist Matt',           'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),
    ('XP-CSRC-W',  'CSR End Cap — Pearl White Gloss',       'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),
    ('XP-CSRC-BS', 'CSR End Cap — Basalt Satin',            'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),
    ('XP-CSRC-D',  'CSR End Cap — Dune Satin',              'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),
    ('XP-CSRC-M',  'CSR End Cap — Mill',                    'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),
    ('XP-CSRC-P',  'CSR End Cap — Primrose',                'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),
    ('XP-CSRC-PB', 'CSR End Cap — Paperbark',               'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),
    ('XP-CSRC-S',  'CSR End Cap — Palladium Silver Pearl',  'accessory', 'each', 1.03, ARRAY['QSHS','XPL']),

    -- Base/Top Plate — QSHS and XPL
    ('XP-BTP-B',  'Base/Top Plate — Black Satin',            'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),
    ('XP-BTP-MN', 'Base/Top Plate — Monument Matt',           'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),
    ('XP-BTP-G',  'Base/Top Plate — Woodland Grey Matt',      'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),
    ('XP-BTP-SM', 'Base/Top Plate — Surfmist Matt',           'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),
    ('XP-BTP-W',  'Base/Top Plate — Pearl White Gloss',       'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),
    ('XP-BTP-BS', 'Base/Top Plate — Basalt Satin',            'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),
    ('XP-BTP-D',  'Base/Top Plate — Dune Satin',              'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),
    ('XP-BTP-M',  'Base/Top Plate — Mill',                    'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),
    ('XP-BTP-P',  'Base/Top Plate — Primrose',                'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),
    ('XP-BTP-PB', 'Base/Top Plate — Paperbark',               'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),
    ('XP-BTP-S',  'Base/Top Plate — Palladium Silver Pearl',  'accessory', 'each', 4.64, ARRAY['QSHS','XPL']),

    -- Screw Pack 100 — QSHS and XPL
    ('XP-SCREWS-B',  'Screw Pack 100 — Black Satin',            'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),
    ('XP-SCREWS-MN', 'Screw Pack 100 — Monument Matt',           'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),
    ('XP-SCREWS-G',  'Screw Pack 100 — Woodland Grey Matt',      'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),
    ('XP-SCREWS-SM', 'Screw Pack 100 — Surfmist Matt',           'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),
    ('XP-SCREWS-W',  'Screw Pack 100 — Pearl White Gloss',       'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),
    ('XP-SCREWS-BS', 'Screw Pack 100 — Basalt Satin',            'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),
    ('XP-SCREWS-D',  'Screw Pack 100 — Dune Satin',              'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),
    ('XP-SCREWS-M',  'Screw Pack 100 — Mill',                    'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),
    ('XP-SCREWS-P',  'Screw Pack 100 — Primrose',                'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),
    ('XP-SCREWS-PB', 'Screw Pack 100 — Paperbark',               'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),
    ('XP-SCREWS-S',  'Screw Pack 100 — Palladium Silver Pearl',  'screw', 'pack', 6.06, ARRAY['QSHS','XPL']),

    -- Colour-agnostic accessories
    ('QS-SFC-B',         'Side Frame Cap (Black)',      'accessory', 'each', 0.86, ARRAY['QSHS']),
    ('XPL-SB-50PK-09MM', 'Spacer Block 9mm (50-pack)', 'accessory', 'pack', 3.01, ARRAY['BAYG']),
    ('XPL-SB-50PK-20MM', 'Spacer Block 20mm (50-pack)','accessory', 'pack', 3.56, ARRAY['BAYG']),

    -- Gate Frame Kits 9mm
    ('XP-GKIT-LSET09-B',  'Gate Frame Kit 9mm — Black Satin',            'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET09-MN', 'Gate Frame Kit 9mm — Monument Matt',           'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET09-G',  'Gate Frame Kit 9mm — Woodland Grey Matt',      'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET09-SM', 'Gate Frame Kit 9mm — Surfmist Matt',           'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET09-W',  'Gate Frame Kit 9mm — Pearl White Gloss',       'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET09-BS', 'Gate Frame Kit 9mm — Basalt Satin',            'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET09-D',  'Gate Frame Kit 9mm — Dune Satin',              'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET09-M',  'Gate Frame Kit 9mm — Mill',                    'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET09-P',  'Gate Frame Kit 9mm — Primrose',                'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET09-PB', 'Gate Frame Kit 9mm — Paperbark',               'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET09-S',  'Gate Frame Kit 9mm — Palladium Silver Pearl',  'gate', 'each', 85.00, ARRAY['GATE']),

    -- Gate Frame Kits 20mm
    ('XP-GKIT-LSET20-B',  'Gate Frame Kit 20mm — Black Satin',            'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET20-MN', 'Gate Frame Kit 20mm — Monument Matt',           'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET20-G',  'Gate Frame Kit 20mm — Woodland Grey Matt',      'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET20-SM', 'Gate Frame Kit 20mm — Surfmist Matt',           'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET20-W',  'Gate Frame Kit 20mm — Pearl White Gloss',       'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET20-BS', 'Gate Frame Kit 20mm — Basalt Satin',            'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET20-D',  'Gate Frame Kit 20mm — Dune Satin',              'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET20-M',  'Gate Frame Kit 20mm — Mill',                    'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET20-P',  'Gate Frame Kit 20mm — Primrose',                'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET20-PB', 'Gate Frame Kit 20mm — Paperbark',               'gate', 'each', 85.00, ARRAY['GATE']),
    ('XP-GKIT-LSET20-S',  'Gate Frame Kit 20mm — Palladium Silver Pearl',  'gate', 'each', 85.00, ARRAY['GATE']),

    -- Gate Blades 65mm
    ('XP-6100-GB65-B',  'Gate Blade 65mm 6100mm — Black Satin',            'gate', 'length', 38.50, ARRAY['GATE']),
    ('XP-6100-GB65-MN', 'Gate Blade 65mm 6100mm — Monument Matt',           'gate', 'length', 38.50, ARRAY['GATE']),
    ('XP-6100-GB65-G',  'Gate Blade 65mm 6100mm — Woodland Grey Matt',      'gate', 'length', 38.50, ARRAY['GATE']),
    ('XP-6100-GB65-SM', 'Gate Blade 65mm 6100mm — Surfmist Matt',           'gate', 'length', 38.50, ARRAY['GATE']),
    ('XP-6100-GB65-W',  'Gate Blade 65mm 6100mm — Pearl White Gloss',       'gate', 'length', 38.50, ARRAY['GATE']),
    ('XP-6100-GB65-BS', 'Gate Blade 65mm 6100mm — Basalt Satin',            'gate', 'length', 38.50, ARRAY['GATE']),
    ('XP-6100-GB65-D',  'Gate Blade 65mm 6100mm — Dune Satin',              'gate', 'length', 38.50, ARRAY['GATE']),
    ('XP-6100-GB65-M',  'Gate Blade 65mm 6100mm — Mill',                    'gate', 'length', 38.50, ARRAY['GATE']),
    ('XP-6100-GB65-P',  'Gate Blade 65mm 6100mm — Primrose',                'gate', 'length', 38.50, ARRAY['GATE']),
    ('XP-6100-GB65-PB', 'Gate Blade 65mm 6100mm — Paperbark',               'gate', 'length', 38.50, ARRAY['GATE']),
    ('XP-6100-GB65-S',  'Gate Blade 65mm 6100mm — Palladium Silver Pearl',  'gate', 'length', 38.50, ARRAY['GATE']),

    -- Gate Blades 90mm
    ('XP-6100-GB90-B',  'Gate Blade 90mm 6100mm — Black Satin',            'gate', 'length', 52.00, ARRAY['GATE']),
    ('XP-6100-GB90-MN', 'Gate Blade 90mm 6100mm — Monument Matt',           'gate', 'length', 52.00, ARRAY['GATE']),
    ('XP-6100-GB90-G',  'Gate Blade 90mm 6100mm — Woodland Grey Matt',      'gate', 'length', 52.00, ARRAY['GATE']),
    ('XP-6100-GB90-SM', 'Gate Blade 90mm 6100mm — Surfmist Matt',           'gate', 'length', 52.00, ARRAY['GATE']),
    ('XP-6100-GB90-W',  'Gate Blade 90mm 6100mm — Pearl White Gloss',       'gate', 'length', 52.00, ARRAY['GATE']),
    ('XP-6100-GB90-BS', 'Gate Blade 90mm 6100mm — Basalt Satin',            'gate', 'length', 52.00, ARRAY['GATE']),
    ('XP-6100-GB90-D',  'Gate Blade 90mm 6100mm — Dune Satin',              'gate', 'length', 52.00, ARRAY['GATE']),
    ('XP-6100-GB90-M',  'Gate Blade 90mm 6100mm — Mill',                    'gate', 'length', 52.00, ARRAY['GATE']),
    ('XP-6100-GB90-P',  'Gate Blade 90mm 6100mm — Primrose',                'gate', 'length', 52.00, ARRAY['GATE']),
    ('XP-6100-GB90-PB', 'Gate Blade 90mm 6100mm — Paperbark',               'gate', 'length', 52.00, ARRAY['GATE']),
    ('XP-6100-GB90-S',  'Gate Blade 90mm 6100mm — Palladium Silver Pearl',  'gate', 'length', 52.00, ARRAY['GATE']),

    -- Gate Posts 65x65
    ('XP-GP-6565-B',  'Gate Post 65x65 — Black Satin',            'post', 'each', 65.00, ARRAY['GATE']),
    ('XP-GP-6565-MN', 'Gate Post 65x65 — Monument Matt',           'post', 'each', 65.00, ARRAY['GATE']),
    ('XP-GP-6565-G',  'Gate Post 65x65 — Woodland Grey Matt',      'post', 'each', 65.00, ARRAY['GATE']),
    ('XP-GP-6565-SM', 'Gate Post 65x65 — Surfmist Matt',           'post', 'each', 65.00, ARRAY['GATE']),
    ('XP-GP-6565-W',  'Gate Post 65x65 — Pearl White Gloss',       'post', 'each', 65.00, ARRAY['GATE']),
    ('XP-GP-6565-BS', 'Gate Post 65x65 — Basalt Satin',            'post', 'each', 65.00, ARRAY['GATE']),
    ('XP-GP-6565-D',  'Gate Post 65x65 — Dune Satin',              'post', 'each', 65.00, ARRAY['GATE']),
    ('XP-GP-6565-M',  'Gate Post 65x65 — Mill',                    'post', 'each', 65.00, ARRAY['GATE']),
    ('XP-GP-6565-P',  'Gate Post 65x65 — Primrose',                'post', 'each', 65.00, ARRAY['GATE']),
    ('XP-GP-6565-PB', 'Gate Post 65x65 — Paperbark',               'post', 'each', 65.00, ARRAY['GATE']),
    ('XP-GP-6565-S',  'Gate Post 65x65 — Palladium Silver Pearl',  'post', 'each', 65.00, ARRAY['GATE']),

    -- Gate hardware (colour-agnostic)
    ('DD-KWIKFIT-ADJ', 'D&D Kwik Fit Hinge — Adjustable', 'hardware', 'each',   28.50, ARRAY['GATE']),
    ('DD-KWIKFIT-FXD', 'D&D Kwik Fit Hinge — Fixed',      'hardware', 'each',   24.50, ARRAY['GATE']),
    ('DD-HINGE-HD',    'Heavy Duty Hinge (weld-on)',        'hardware', 'each',   35.00, ARRAY['GATE']),
    ('DD-ML-TP',       'D&D Magna Latch — Top Pull',       'hardware', 'each',   65.00, ARRAY['GATE']),
    ('DD-ML-LB',       'D&D Magna Latch + Lock Box',       'hardware', 'each',   95.00, ARRAY['GATE']),
    ('DD-DROP-BOLT',   'Drop Bolt',                         'hardware', 'each',   18.00, ARRAY['GATE']),
    ('XP-SLIDE-TRACK', 'Sliding Gate Track',                'hardware', 'length', 95.00, ARRAY['GATE']),
    ('XP-GUIDE-ROLLER','Guide Roller',                      'hardware', 'each',   22.00, ARRAY['GATE'])
  ) AS v(sku, description, category, unit, t1, system_types)
  ON CONFLICT (org_id, sku) DO NOTHING;


  -- ── pricing_rules ─────────────────────────────────────────────────────────────
  -- One row per (component, tier). rule = NULL means "always applies" (flat rate).
  -- Higher-priority rows with a rule expression will override these base rates.
  -- Example of a quantity-break rule to add later:
  --   INSERT INTO pricing_rules (org_id, component_id, tier_code, rule, price, priority)
  --   SELECT _org, pc.id, 'tier2', 'qty >= 100', 34.00, 10
  --   FROM product_components pc WHERE pc.org_id = _org AND pc.sku = 'XP-6100-S65-B';

  INSERT INTO pricing_rules (org_id, component_id, tier_code, price, priority, active)
  SELECT pc.org_id, pc.id, v.tier_code, v.price, 0, true
  FROM product_components pc
  JOIN (VALUES
    -- 65mm Slat 6100mm
    ('XP-6100-S65-B',  'tier1', 37.29), ('XP-6100-S65-B',  'tier2', 34.65), ('XP-6100-S65-B',  'tier3', 32.95),
    ('XP-6100-S65-MN', 'tier1', 37.29), ('XP-6100-S65-MN', 'tier2', 34.65), ('XP-6100-S65-MN', 'tier3', 32.95),
    ('XP-6100-S65-G',  'tier1', 37.29), ('XP-6100-S65-G',  'tier2', 34.65), ('XP-6100-S65-G',  'tier3', 32.95),
    ('XP-6100-S65-SM', 'tier1', 37.29), ('XP-6100-S65-SM', 'tier2', 34.65), ('XP-6100-S65-SM', 'tier3', 32.95),
    ('XP-6100-S65-W',  'tier1', 37.29), ('XP-6100-S65-W',  'tier2', 34.65), ('XP-6100-S65-W',  'tier3', 32.95),
    ('XP-6100-S65-BS', 'tier1', 37.29), ('XP-6100-S65-BS', 'tier2', 34.65), ('XP-6100-S65-BS', 'tier3', 32.95),
    ('XP-6100-S65-D',  'tier1', 37.29), ('XP-6100-S65-D',  'tier2', 34.65), ('XP-6100-S65-D',  'tier3', 32.95),
    ('XP-6100-S65-M',  'tier1', 37.29), ('XP-6100-S65-M',  'tier2', 34.65), ('XP-6100-S65-M',  'tier3', 32.95),
    ('XP-6100-S65-P',  'tier1', 37.29), ('XP-6100-S65-P',  'tier2', 34.65), ('XP-6100-S65-P',  'tier3', 32.95),
    ('XP-6100-S65-PB', 'tier1', 37.29), ('XP-6100-S65-PB', 'tier2', 34.65), ('XP-6100-S65-PB', 'tier3', 32.95),
    ('XP-6100-S65-S',  'tier1', 37.29), ('XP-6100-S65-S',  'tier2', 34.65), ('XP-6100-S65-S',  'tier3', 32.95),
    -- 90mm Slat 6100mm
    ('QS-6100-S90-B',  'tier1', 50.49), ('QS-6100-S90-B',  'tier2', 46.96), ('QS-6100-S90-B',  'tier3', 44.65),
    ('QS-6100-S90-MN', 'tier1', 50.49), ('QS-6100-S90-MN', 'tier2', 46.96), ('QS-6100-S90-MN', 'tier3', 44.65),
    ('QS-6100-S90-G',  'tier1', 50.49), ('QS-6100-S90-G',  'tier2', 46.96), ('QS-6100-S90-G',  'tier3', 44.65),
    ('QS-6100-S90-SM', 'tier1', 50.49), ('QS-6100-S90-SM', 'tier2', 46.96), ('QS-6100-S90-SM', 'tier3', 44.65),
    ('QS-6100-S90-W',  'tier1', 50.49), ('QS-6100-S90-W',  'tier2', 46.96), ('QS-6100-S90-W',  'tier3', 44.65),
    ('QS-6100-S90-BS', 'tier1', 50.49), ('QS-6100-S90-BS', 'tier2', 46.96), ('QS-6100-S90-BS', 'tier3', 44.65),
    ('QS-6100-S90-D',  'tier1', 50.49), ('QS-6100-S90-D',  'tier2', 46.96), ('QS-6100-S90-D',  'tier3', 44.65),
    ('QS-6100-S90-M',  'tier1', 50.49), ('QS-6100-S90-M',  'tier2', 46.96), ('QS-6100-S90-M',  'tier3', 44.65),
    ('QS-6100-S90-P',  'tier1', 50.49), ('QS-6100-S90-P',  'tier2', 46.96), ('QS-6100-S90-P',  'tier3', 44.65),
    ('QS-6100-S90-PB', 'tier1', 50.49), ('QS-6100-S90-PB', 'tier2', 46.96), ('QS-6100-S90-PB', 'tier3', 44.65),
    ('QS-6100-S90-S',  'tier1', 50.49), ('QS-6100-S90-S',  'tier2', 46.96), ('QS-6100-S90-S',  'tier3', 44.65),
    -- Side Frame 5800mm
    ('QS-5800-SF-B',  'tier1', 24.35), ('QS-5800-SF-B',  'tier2', 23.16), ('QS-5800-SF-B',  'tier3', 21.80),
    ('QS-5800-SF-MN', 'tier1', 24.35), ('QS-5800-SF-MN', 'tier2', 23.16), ('QS-5800-SF-MN', 'tier3', 21.80),
    ('QS-5800-SF-G',  'tier1', 24.35), ('QS-5800-SF-G',  'tier2', 23.16), ('QS-5800-SF-G',  'tier3', 21.80),
    ('QS-5800-SF-SM', 'tier1', 24.35), ('QS-5800-SF-SM', 'tier2', 23.16), ('QS-5800-SF-SM', 'tier3', 21.80),
    ('QS-5800-SF-W',  'tier1', 24.35), ('QS-5800-SF-W',  'tier2', 23.16), ('QS-5800-SF-W',  'tier3', 21.80),
    ('QS-5800-SF-BS', 'tier1', 24.35), ('QS-5800-SF-BS', 'tier2', 23.16), ('QS-5800-SF-BS', 'tier3', 21.80),
    ('QS-5800-SF-D',  'tier1', 24.35), ('QS-5800-SF-D',  'tier2', 23.16), ('QS-5800-SF-D',  'tier3', 21.80),
    ('QS-5800-SF-M',  'tier1', 24.35), ('QS-5800-SF-M',  'tier2', 23.16), ('QS-5800-SF-M',  'tier3', 21.80),
    ('QS-5800-SF-P',  'tier1', 24.35), ('QS-5800-SF-P',  'tier2', 23.16), ('QS-5800-SF-P',  'tier3', 21.80),
    ('QS-5800-SF-PB', 'tier1', 24.35), ('QS-5800-SF-PB', 'tier2', 23.16), ('QS-5800-SF-PB', 'tier3', 21.80),
    ('QS-5800-SF-S',  'tier1', 24.35), ('QS-5800-SF-S',  'tier2', 23.16), ('QS-5800-SF-S',  'tier3', 21.80),
    -- Channel Frame Connector 5800mm
    ('QS-5800-CFC-B',  'tier1', 16.92), ('QS-5800-CFC-B',  'tier2', 15.94), ('QS-5800-CFC-B',  'tier3', 14.92),
    ('QS-5800-CFC-MN', 'tier1', 16.92), ('QS-5800-CFC-MN', 'tier2', 15.94), ('QS-5800-CFC-MN', 'tier3', 14.92),
    ('QS-5800-CFC-G',  'tier1', 16.92), ('QS-5800-CFC-G',  'tier2', 15.94), ('QS-5800-CFC-G',  'tier3', 14.92),
    ('QS-5800-CFC-SM', 'tier1', 16.92), ('QS-5800-CFC-SM', 'tier2', 15.94), ('QS-5800-CFC-SM', 'tier3', 14.92),
    ('QS-5800-CFC-W',  'tier1', 16.92), ('QS-5800-CFC-W',  'tier2', 15.94), ('QS-5800-CFC-W',  'tier3', 14.92),
    ('QS-5800-CFC-BS', 'tier1', 16.92), ('QS-5800-CFC-BS', 'tier2', 15.94), ('QS-5800-CFC-BS', 'tier3', 14.92),
    ('QS-5800-CFC-D',  'tier1', 16.92), ('QS-5800-CFC-D',  'tier2', 15.94), ('QS-5800-CFC-D',  'tier3', 14.92),
    ('QS-5800-CFC-M',  'tier1', 16.92), ('QS-5800-CFC-M',  'tier2', 15.94), ('QS-5800-CFC-M',  'tier3', 14.92),
    ('QS-5800-CFC-P',  'tier1', 16.92), ('QS-5800-CFC-P',  'tier2', 15.94), ('QS-5800-CFC-P',  'tier3', 14.92),
    ('QS-5800-CFC-PB', 'tier1', 16.92), ('QS-5800-CFC-PB', 'tier2', 15.94), ('QS-5800-CFC-PB', 'tier3', 14.92),
    ('QS-5800-CFC-S',  'tier1', 16.92), ('QS-5800-CFC-S',  'tier2', 15.94), ('QS-5800-CFC-S',  'tier3', 14.92),
    -- CSR 5800mm
    ('XP-5800-CSR-B',  'tier1', 43.48), ('XP-5800-CSR-B',  'tier2', 39.56), ('XP-5800-CSR-B',  'tier3', 34.79),
    ('XP-5800-CSR-MN', 'tier1', 43.48), ('XP-5800-CSR-MN', 'tier2', 39.56), ('XP-5800-CSR-MN', 'tier3', 34.79),
    ('XP-5800-CSR-G',  'tier1', 43.48), ('XP-5800-CSR-G',  'tier2', 39.56), ('XP-5800-CSR-G',  'tier3', 34.79),
    ('XP-5800-CSR-SM', 'tier1', 43.48), ('XP-5800-CSR-SM', 'tier2', 39.56), ('XP-5800-CSR-SM', 'tier3', 34.79),
    ('XP-5800-CSR-W',  'tier1', 43.48), ('XP-5800-CSR-W',  'tier2', 39.56), ('XP-5800-CSR-W',  'tier3', 34.79),
    ('XP-5800-CSR-BS', 'tier1', 43.48), ('XP-5800-CSR-BS', 'tier2', 39.56), ('XP-5800-CSR-BS', 'tier3', 34.79),
    ('XP-5800-CSR-D',  'tier1', 43.48), ('XP-5800-CSR-D',  'tier2', 39.56), ('XP-5800-CSR-D',  'tier3', 34.79),
    ('XP-5800-CSR-M',  'tier1', 43.48), ('XP-5800-CSR-M',  'tier2', 39.56), ('XP-5800-CSR-M',  'tier3', 34.79),
    ('XP-5800-CSR-P',  'tier1', 43.48), ('XP-5800-CSR-P',  'tier2', 39.56), ('XP-5800-CSR-P',  'tier3', 34.79),
    ('XP-5800-CSR-PB', 'tier1', 43.48), ('XP-5800-CSR-PB', 'tier2', 39.56), ('XP-5800-CSR-PB', 'tier3', 34.79),
    ('XP-5800-CSR-S',  'tier1', 43.48), ('XP-5800-CSR-S',  'tier2', 39.56), ('XP-5800-CSR-S',  'tier3', 34.79),
    -- Full Post 2400mm
    ('XP-2400-FP-B',  'tier1', 38.55), ('XP-2400-FP-B',  'tier2', 36.25), ('XP-2400-FP-B',  'tier3', 34.32),
    ('XP-2400-FP-MN', 'tier1', 38.55), ('XP-2400-FP-MN', 'tier2', 36.25), ('XP-2400-FP-MN', 'tier3', 34.32),
    ('XP-2400-FP-G',  'tier1', 38.55), ('XP-2400-FP-G',  'tier2', 36.25), ('XP-2400-FP-G',  'tier3', 34.32),
    ('XP-2400-FP-SM', 'tier1', 38.55), ('XP-2400-FP-SM', 'tier2', 36.25), ('XP-2400-FP-SM', 'tier3', 34.32),
    ('XP-2400-FP-W',  'tier1', 38.55), ('XP-2400-FP-W',  'tier2', 36.25), ('XP-2400-FP-W',  'tier3', 34.32),
    ('XP-2400-FP-BS', 'tier1', 38.55), ('XP-2400-FP-BS', 'tier2', 36.25), ('XP-2400-FP-BS', 'tier3', 34.32),
    ('XP-2400-FP-D',  'tier1', 38.55), ('XP-2400-FP-D',  'tier2', 36.25), ('XP-2400-FP-D',  'tier3', 34.32),
    ('XP-2400-FP-M',  'tier1', 38.55), ('XP-2400-FP-M',  'tier2', 36.25), ('XP-2400-FP-M',  'tier3', 34.32),
    ('XP-2400-FP-P',  'tier1', 38.55), ('XP-2400-FP-P',  'tier2', 36.25), ('XP-2400-FP-P',  'tier3', 34.32),
    ('XP-2400-FP-PB', 'tier1', 38.55), ('XP-2400-FP-PB', 'tier2', 36.25), ('XP-2400-FP-PB', 'tier3', 34.32),
    ('XP-2400-FP-S',  'tier1', 38.55), ('XP-2400-FP-S',  'tier2', 36.25), ('XP-2400-FP-S',  'tier3', 34.32),
    -- CSR End Cap
    ('XP-CSRC-B',  'tier1', 1.03), ('XP-CSRC-B',  'tier2', 0.92), ('XP-CSRC-B',  'tier3', 0.82),
    ('XP-CSRC-MN', 'tier1', 1.03), ('XP-CSRC-MN', 'tier2', 0.92), ('XP-CSRC-MN', 'tier3', 0.82),
    ('XP-CSRC-G',  'tier1', 1.03), ('XP-CSRC-G',  'tier2', 0.92), ('XP-CSRC-G',  'tier3', 0.82),
    ('XP-CSRC-SM', 'tier1', 1.03), ('XP-CSRC-SM', 'tier2', 0.92), ('XP-CSRC-SM', 'tier3', 0.82),
    ('XP-CSRC-W',  'tier1', 1.03), ('XP-CSRC-W',  'tier2', 0.92), ('XP-CSRC-W',  'tier3', 0.82),
    ('XP-CSRC-BS', 'tier1', 1.03), ('XP-CSRC-BS', 'tier2', 0.92), ('XP-CSRC-BS', 'tier3', 0.82),
    ('XP-CSRC-D',  'tier1', 1.03), ('XP-CSRC-D',  'tier2', 0.92), ('XP-CSRC-D',  'tier3', 0.82),
    ('XP-CSRC-M',  'tier1', 1.03), ('XP-CSRC-M',  'tier2', 0.92), ('XP-CSRC-M',  'tier3', 0.82),
    ('XP-CSRC-P',  'tier1', 1.03), ('XP-CSRC-P',  'tier2', 0.92), ('XP-CSRC-P',  'tier3', 0.82),
    ('XP-CSRC-PB', 'tier1', 1.03), ('XP-CSRC-PB', 'tier2', 0.92), ('XP-CSRC-PB', 'tier3', 0.82),
    ('XP-CSRC-S',  'tier1', 1.03), ('XP-CSRC-S',  'tier2', 0.92), ('XP-CSRC-S',  'tier3', 0.82),
    -- Base/Top Plate
    ('XP-BTP-B',  'tier1', 4.64), ('XP-BTP-B',  'tier2', 4.13), ('XP-BTP-B',  'tier3', 3.71),
    ('XP-BTP-MN', 'tier1', 4.64), ('XP-BTP-MN', 'tier2', 4.13), ('XP-BTP-MN', 'tier3', 3.71),
    ('XP-BTP-G',  'tier1', 4.64), ('XP-BTP-G',  'tier2', 4.13), ('XP-BTP-G',  'tier3', 3.71),
    ('XP-BTP-SM', 'tier1', 4.64), ('XP-BTP-SM', 'tier2', 4.13), ('XP-BTP-SM', 'tier3', 3.71),
    ('XP-BTP-W',  'tier1', 4.64), ('XP-BTP-W',  'tier2', 4.13), ('XP-BTP-W',  'tier3', 3.71),
    ('XP-BTP-BS', 'tier1', 4.64), ('XP-BTP-BS', 'tier2', 4.13), ('XP-BTP-BS', 'tier3', 3.71),
    ('XP-BTP-D',  'tier1', 4.64), ('XP-BTP-D',  'tier2', 4.13), ('XP-BTP-D',  'tier3', 3.71),
    ('XP-BTP-M',  'tier1', 4.64), ('XP-BTP-M',  'tier2', 4.13), ('XP-BTP-M',  'tier3', 3.71),
    ('XP-BTP-P',  'tier1', 4.64), ('XP-BTP-P',  'tier2', 4.13), ('XP-BTP-P',  'tier3', 3.71),
    ('XP-BTP-PB', 'tier1', 4.64), ('XP-BTP-PB', 'tier2', 4.13), ('XP-BTP-PB', 'tier3', 3.71),
    ('XP-BTP-S',  'tier1', 4.64), ('XP-BTP-S',  'tier2', 4.13), ('XP-BTP-S',  'tier3', 3.71),
    -- Screw Pack 100
    ('XP-SCREWS-B',  'tier1', 6.06), ('XP-SCREWS-B',  'tier2', 5.70), ('XP-SCREWS-B',  'tier3', 4.91),
    ('XP-SCREWS-MN', 'tier1', 6.06), ('XP-SCREWS-MN', 'tier2', 5.70), ('XP-SCREWS-MN', 'tier3', 4.91),
    ('XP-SCREWS-G',  'tier1', 6.06), ('XP-SCREWS-G',  'tier2', 5.70), ('XP-SCREWS-G',  'tier3', 4.91),
    ('XP-SCREWS-SM', 'tier1', 6.06), ('XP-SCREWS-SM', 'tier2', 5.70), ('XP-SCREWS-SM', 'tier3', 4.91),
    ('XP-SCREWS-W',  'tier1', 6.06), ('XP-SCREWS-W',  'tier2', 5.70), ('XP-SCREWS-W',  'tier3', 4.91),
    ('XP-SCREWS-BS', 'tier1', 6.06), ('XP-SCREWS-BS', 'tier2', 5.70), ('XP-SCREWS-BS', 'tier3', 4.91),
    ('XP-SCREWS-D',  'tier1', 6.06), ('XP-SCREWS-D',  'tier2', 5.70), ('XP-SCREWS-D',  'tier3', 4.91),
    ('XP-SCREWS-M',  'tier1', 6.06), ('XP-SCREWS-M',  'tier2', 5.70), ('XP-SCREWS-M',  'tier3', 4.91),
    ('XP-SCREWS-P',  'tier1', 6.06), ('XP-SCREWS-P',  'tier2', 5.70), ('XP-SCREWS-P',  'tier3', 4.91),
    ('XP-SCREWS-PB', 'tier1', 6.06), ('XP-SCREWS-PB', 'tier2', 5.70), ('XP-SCREWS-PB', 'tier3', 4.91),
    ('XP-SCREWS-S',  'tier1', 6.06), ('XP-SCREWS-S',  'tier2', 5.70), ('XP-SCREWS-S',  'tier3', 4.91),
    -- Colour-agnostic accessories
    ('QS-SFC-B',         'tier1', 0.86), ('QS-SFC-B',         'tier2', 0.81), ('QS-SFC-B',         'tier3', 0.74),
    ('XPL-SB-50PK-09MM', 'tier1', 3.01), ('XPL-SB-50PK-09MM', 'tier2', 2.90), ('XPL-SB-50PK-09MM', 'tier3', 2.41),
    ('XPL-SB-50PK-20MM', 'tier1', 3.56), ('XPL-SB-50PK-20MM', 'tier2', 3.30), ('XPL-SB-50PK-20MM', 'tier3', 2.90),
    -- Gate Frame Kits 9mm
    ('XP-GKIT-LSET09-B',  'tier1', 85.00), ('XP-GKIT-LSET09-B',  'tier2', 79.00), ('XP-GKIT-LSET09-B',  'tier3', 73.00),
    ('XP-GKIT-LSET09-MN', 'tier1', 85.00), ('XP-GKIT-LSET09-MN', 'tier2', 79.00), ('XP-GKIT-LSET09-MN', 'tier3', 73.00),
    ('XP-GKIT-LSET09-G',  'tier1', 85.00), ('XP-GKIT-LSET09-G',  'tier2', 79.00), ('XP-GKIT-LSET09-G',  'tier3', 73.00),
    ('XP-GKIT-LSET09-SM', 'tier1', 85.00), ('XP-GKIT-LSET09-SM', 'tier2', 79.00), ('XP-GKIT-LSET09-SM', 'tier3', 73.00),
    ('XP-GKIT-LSET09-W',  'tier1', 85.00), ('XP-GKIT-LSET09-W',  'tier2', 79.00), ('XP-GKIT-LSET09-W',  'tier3', 73.00),
    ('XP-GKIT-LSET09-BS', 'tier1', 85.00), ('XP-GKIT-LSET09-BS', 'tier2', 79.00), ('XP-GKIT-LSET09-BS', 'tier3', 73.00),
    ('XP-GKIT-LSET09-D',  'tier1', 85.00), ('XP-GKIT-LSET09-D',  'tier2', 79.00), ('XP-GKIT-LSET09-D',  'tier3', 73.00),
    ('XP-GKIT-LSET09-M',  'tier1', 85.00), ('XP-GKIT-LSET09-M',  'tier2', 79.00), ('XP-GKIT-LSET09-M',  'tier3', 73.00),
    ('XP-GKIT-LSET09-P',  'tier1', 85.00), ('XP-GKIT-LSET09-P',  'tier2', 79.00), ('XP-GKIT-LSET09-P',  'tier3', 73.00),
    ('XP-GKIT-LSET09-PB', 'tier1', 85.00), ('XP-GKIT-LSET09-PB', 'tier2', 79.00), ('XP-GKIT-LSET09-PB', 'tier3', 73.00),
    ('XP-GKIT-LSET09-S',  'tier1', 85.00), ('XP-GKIT-LSET09-S',  'tier2', 79.00), ('XP-GKIT-LSET09-S',  'tier3', 73.00),
    -- Gate Frame Kits 20mm
    ('XP-GKIT-LSET20-B',  'tier1', 85.00), ('XP-GKIT-LSET20-B',  'tier2', 79.00), ('XP-GKIT-LSET20-B',  'tier3', 73.00),
    ('XP-GKIT-LSET20-MN', 'tier1', 85.00), ('XP-GKIT-LSET20-MN', 'tier2', 79.00), ('XP-GKIT-LSET20-MN', 'tier3', 73.00),
    ('XP-GKIT-LSET20-G',  'tier1', 85.00), ('XP-GKIT-LSET20-G',  'tier2', 79.00), ('XP-GKIT-LSET20-G',  'tier3', 73.00),
    ('XP-GKIT-LSET20-SM', 'tier1', 85.00), ('XP-GKIT-LSET20-SM', 'tier2', 79.00), ('XP-GKIT-LSET20-SM', 'tier3', 73.00),
    ('XP-GKIT-LSET20-W',  'tier1', 85.00), ('XP-GKIT-LSET20-W',  'tier2', 79.00), ('XP-GKIT-LSET20-W',  'tier3', 73.00),
    ('XP-GKIT-LSET20-BS', 'tier1', 85.00), ('XP-GKIT-LSET20-BS', 'tier2', 79.00), ('XP-GKIT-LSET20-BS', 'tier3', 73.00),
    ('XP-GKIT-LSET20-D',  'tier1', 85.00), ('XP-GKIT-LSET20-D',  'tier2', 79.00), ('XP-GKIT-LSET20-D',  'tier3', 73.00),
    ('XP-GKIT-LSET20-M',  'tier1', 85.00), ('XP-GKIT-LSET20-M',  'tier2', 79.00), ('XP-GKIT-LSET20-M',  'tier3', 73.00),
    ('XP-GKIT-LSET20-P',  'tier1', 85.00), ('XP-GKIT-LSET20-P',  'tier2', 79.00), ('XP-GKIT-LSET20-P',  'tier3', 73.00),
    ('XP-GKIT-LSET20-PB', 'tier1', 85.00), ('XP-GKIT-LSET20-PB', 'tier2', 79.00), ('XP-GKIT-LSET20-PB', 'tier3', 73.00),
    ('XP-GKIT-LSET20-S',  'tier1', 85.00), ('XP-GKIT-LSET20-S',  'tier2', 79.00), ('XP-GKIT-LSET20-S',  'tier3', 73.00),
    -- Gate Blades 65mm
    ('XP-6100-GB65-B',  'tier1', 38.50), ('XP-6100-GB65-B',  'tier2', 35.50), ('XP-6100-GB65-B',  'tier3', 33.00),
    ('XP-6100-GB65-MN', 'tier1', 38.50), ('XP-6100-GB65-MN', 'tier2', 35.50), ('XP-6100-GB65-MN', 'tier3', 33.00),
    ('XP-6100-GB65-G',  'tier1', 38.50), ('XP-6100-GB65-G',  'tier2', 35.50), ('XP-6100-GB65-G',  'tier3', 33.00),
    ('XP-6100-GB65-SM', 'tier1', 38.50), ('XP-6100-GB65-SM', 'tier2', 35.50), ('XP-6100-GB65-SM', 'tier3', 33.00),
    ('XP-6100-GB65-W',  'tier1', 38.50), ('XP-6100-GB65-W',  'tier2', 35.50), ('XP-6100-GB65-W',  'tier3', 33.00),
    ('XP-6100-GB65-BS', 'tier1', 38.50), ('XP-6100-GB65-BS', 'tier2', 35.50), ('XP-6100-GB65-BS', 'tier3', 33.00),
    ('XP-6100-GB65-D',  'tier1', 38.50), ('XP-6100-GB65-D',  'tier2', 35.50), ('XP-6100-GB65-D',  'tier3', 33.00),
    ('XP-6100-GB65-M',  'tier1', 38.50), ('XP-6100-GB65-M',  'tier2', 35.50), ('XP-6100-GB65-M',  'tier3', 33.00),
    ('XP-6100-GB65-P',  'tier1', 38.50), ('XP-6100-GB65-P',  'tier2', 35.50), ('XP-6100-GB65-P',  'tier3', 33.00),
    ('XP-6100-GB65-PB', 'tier1', 38.50), ('XP-6100-GB65-PB', 'tier2', 35.50), ('XP-6100-GB65-PB', 'tier3', 33.00),
    ('XP-6100-GB65-S',  'tier1', 38.50), ('XP-6100-GB65-S',  'tier2', 35.50), ('XP-6100-GB65-S',  'tier3', 33.00),
    -- Gate Blades 90mm
    ('XP-6100-GB90-B',  'tier1', 52.00), ('XP-6100-GB90-B',  'tier2', 48.00), ('XP-6100-GB90-B',  'tier3', 45.00),
    ('XP-6100-GB90-MN', 'tier1', 52.00), ('XP-6100-GB90-MN', 'tier2', 48.00), ('XP-6100-GB90-MN', 'tier3', 45.00),
    ('XP-6100-GB90-G',  'tier1', 52.00), ('XP-6100-GB90-G',  'tier2', 48.00), ('XP-6100-GB90-G',  'tier3', 45.00),
    ('XP-6100-GB90-SM', 'tier1', 52.00), ('XP-6100-GB90-SM', 'tier2', 48.00), ('XP-6100-GB90-SM', 'tier3', 45.00),
    ('XP-6100-GB90-W',  'tier1', 52.00), ('XP-6100-GB90-W',  'tier2', 48.00), ('XP-6100-GB90-W',  'tier3', 45.00),
    ('XP-6100-GB90-BS', 'tier1', 52.00), ('XP-6100-GB90-BS', 'tier2', 48.00), ('XP-6100-GB90-BS', 'tier3', 45.00),
    ('XP-6100-GB90-D',  'tier1', 52.00), ('XP-6100-GB90-D',  'tier2', 48.00), ('XP-6100-GB90-D',  'tier3', 45.00),
    ('XP-6100-GB90-M',  'tier1', 52.00), ('XP-6100-GB90-M',  'tier2', 48.00), ('XP-6100-GB90-M',  'tier3', 45.00),
    ('XP-6100-GB90-P',  'tier1', 52.00), ('XP-6100-GB90-P',  'tier2', 48.00), ('XP-6100-GB90-P',  'tier3', 45.00),
    ('XP-6100-GB90-PB', 'tier1', 52.00), ('XP-6100-GB90-PB', 'tier2', 48.00), ('XP-6100-GB90-PB', 'tier3', 45.00),
    ('XP-6100-GB90-S',  'tier1', 52.00), ('XP-6100-GB90-S',  'tier2', 48.00), ('XP-6100-GB90-S',  'tier3', 45.00),
    -- Gate Posts 65x65
    ('XP-GP-6565-B',  'tier1', 65.00), ('XP-GP-6565-B',  'tier2', 60.00), ('XP-GP-6565-B',  'tier3', 55.00),
    ('XP-GP-6565-MN', 'tier1', 65.00), ('XP-GP-6565-MN', 'tier2', 60.00), ('XP-GP-6565-MN', 'tier3', 55.00),
    ('XP-GP-6565-G',  'tier1', 65.00), ('XP-GP-6565-G',  'tier2', 60.00), ('XP-GP-6565-G',  'tier3', 55.00),
    ('XP-GP-6565-SM', 'tier1', 65.00), ('XP-GP-6565-SM', 'tier2', 60.00), ('XP-GP-6565-SM', 'tier3', 55.00),
    ('XP-GP-6565-W',  'tier1', 65.00), ('XP-GP-6565-W',  'tier2', 60.00), ('XP-GP-6565-W',  'tier3', 55.00),
    ('XP-GP-6565-BS', 'tier1', 65.00), ('XP-GP-6565-BS', 'tier2', 60.00), ('XP-GP-6565-BS', 'tier3', 55.00),
    ('XP-GP-6565-D',  'tier1', 65.00), ('XP-GP-6565-D',  'tier2', 60.00), ('XP-GP-6565-D',  'tier3', 55.00),
    ('XP-GP-6565-M',  'tier1', 65.00), ('XP-GP-6565-M',  'tier2', 60.00), ('XP-GP-6565-M',  'tier3', 55.00),
    ('XP-GP-6565-P',  'tier1', 65.00), ('XP-GP-6565-P',  'tier2', 60.00), ('XP-GP-6565-P',  'tier3', 55.00),
    ('XP-GP-6565-PB', 'tier1', 65.00), ('XP-GP-6565-PB', 'tier2', 60.00), ('XP-GP-6565-PB', 'tier3', 55.00),
    ('XP-GP-6565-S',  'tier1', 65.00), ('XP-GP-6565-S',  'tier2', 60.00), ('XP-GP-6565-S',  'tier3', 55.00),
    -- Gate hardware
    ('DD-KWIKFIT-ADJ', 'tier1', 28.50), ('DD-KWIKFIT-ADJ', 'tier2', 26.50), ('DD-KWIKFIT-ADJ', 'tier3', 24.50),
    ('DD-KWIKFIT-FXD', 'tier1', 24.50), ('DD-KWIKFIT-FXD', 'tier2', 22.50), ('DD-KWIKFIT-FXD', 'tier3', 20.50),
    ('DD-HINGE-HD',    'tier1', 35.00), ('DD-HINGE-HD',    'tier2', 32.00), ('DD-HINGE-HD',    'tier3', 29.00),
    ('DD-ML-TP',       'tier1', 65.00), ('DD-ML-TP',       'tier2', 60.00), ('DD-ML-TP',       'tier3', 55.00),
    ('DD-ML-LB',       'tier1', 95.00), ('DD-ML-LB',       'tier2', 88.00), ('DD-ML-LB',       'tier3', 81.00),
    ('DD-DROP-BOLT',   'tier1', 18.00), ('DD-DROP-BOLT',   'tier2', 16.50), ('DD-DROP-BOLT',   'tier3', 15.00),
    ('XP-SLIDE-TRACK', 'tier1', 95.00), ('XP-SLIDE-TRACK', 'tier2', 88.00), ('XP-SLIDE-TRACK', 'tier3', 81.00),
    ('XP-GUIDE-ROLLER','tier1', 22.00), ('XP-GUIDE-ROLLER','tier2', 20.00), ('XP-GUIDE-ROLLER','tier3', 18.00)
  ) AS v(sku, tier_code, price) ON pc.org_id = _org AND pc.sku = v.sku
  ON CONFLICT (component_id, tier_code, priority) WHERE active DO NOTHING;

END $$;
