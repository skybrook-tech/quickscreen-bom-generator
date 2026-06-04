-- ============================================================================
-- 033_backfill_glass_outlet_supplier_and_instances.sql
--
-- Populates the new identity tables (suppliers, system_archetypes, system_instances)
-- and backfills supplier_id + system_instance_id on existing v3 catalogue rows.
--
-- Idempotent: re-running is a no-op.
-- ============================================================================

-- ─── 1. Suppliers ───────────────────────────────────────────────────────────
INSERT INTO suppliers (slug, name, trust_tier, status, metadata)
VALUES (
  'glass-outlet',
  'Glass Outlet',
  'platform',
  'active',
  '{"description":"The Glass Outlet - aluminium slat fencing, gates, and ColorBond. The original supplier on the platform.","website":"https://glassoutlet.com.au"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. System archetypes (per docs/system-authoring-process.md Appendix A) ──
INSERT INTO system_archetypes (slug, name, family, geometry_module, rule_template_ids, description) VALUES
  ('slat-fence',           'Slat Fence',            'fence',       'fence_runs_v1',   ARRAY['slat_counting_v1','bay_post_v1','rail_cut_v1'],
    'Horizontal or vertical slat-based fence systems.'),
  ('panel-fence',          'Panel Fence',           'fence',       'fence_runs_v1',   ARRAY['panel_per_bay_v1','bay_post_v1'],
    'Steel / aluminium panel systems like ColorBond.'),
  ('mesh-fence',           'Mesh Fence',            'fence',       'fence_runs_v1',   ARRAY['panel_per_bay_v1','bay_post_v1'],
    'Chainwire / weldmesh fencing.'),
  ('timber-fence',         'Timber Fence',          'fence',       'fence_runs_v1',   ARRAY['paling_count_v1','rail_per_bay_v1','bay_post_v1'],
    'Timber paling and lap-and-cap fences.'),
  ('glass-pool-fence',     'Glass Pool Fence',      'pool-fence',  'panel_runs_v1',   ARRAY['glass_panel_v1','spigot_per_panel_v1'],
    'Frameless glass pool fencing with spigots / clamps.'),
  ('aluminium-pool-fence', 'Aluminium Pool Fence',  'pool-fence',  'panel_runs_v1',   ARRAY['panel_per_bay_v1','bay_post_v1'],
    'Aluminium pool fencing — Trojan / flat-top / spear-top style.'),
  ('balustrade',           'Balustrade',            'balustrade',  'balustrade_v1',   ARRAY['panel_per_bay_v1','handrail_v1'],
    'Balcony / staircase balustrade systems.'),
  ('swing-gate',           'Swing Gate',            'gate',        'gate_segment_v1', ARRAY['swing_gate_hardware_v1'],
    'Single / double swing gates.'),
  ('sliding-gate',         'Sliding Gate',          'gate',        'gate_segment_v1', ARRAY['sliding_track_v1','sliding_hardware_v1'],
    'Sliding gates including automated.'),
  ('equipment-enclosure',  'Equipment Enclosure',   'enclosure',   'enclosure_v1',    ARRAY['enclosure_wall_v1','enclosure_door_v1'],
    'CTS-style enclosed equipment housing.'),
  ('screen',               'Privacy Screen',        'screen',      'screen_panel_v1', ARRAY['panel_per_bay_v1'],
    'Privacy / decorative screens.'),
  ('shower',               'Shower Enclosure',      'shower',      'shower_v1',       ARRAY['glass_panel_v1','channel_cut_v1'],
    'Frameless / semi-frameless shower screens.')
ON CONFLICT (slug) DO NOTHING;

-- ─── 3. System instances for existing Glass Outlet seed files ────────────────
WITH go AS (SELECT id FROM suppliers WHERE slug = 'glass-outlet')
INSERT INTO system_instances (supplier_id, archetype_id, slug, name, status, readiness_status, trust_tier, visibility, description) VALUES
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'qshs', 'QuickScreen Horizontal Slat', 'active', 'approved', 'platform', 'public',
    'Glass Outlet flagship horizontal slat fence. 65mm and 90mm slat sizes; multiple gap presets; full colour range.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'vs', 'QuickScreen Vertical Slat', 'active', 'approved', 'platform', 'public',
    'Vertical orientation variant of QuickScreen slat fencing.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'xpl', 'XPress Plus', 'active', 'approved', 'platform', 'public',
    'Friction-fit post system. 1W/2W/90 post types; no side frames; restricted option set.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'bayg', 'Buy As You Go', 'active', 'approved', 'platform', 'public',
    'Per-panel retail model. 3000mm panels; explicit panel_quantity input. Alumawood finish via AW- prefix.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'go-colorbond', 'Glass Outlet ColorBond', 'active', 'calculator_ready', 'platform', 'public',
    'ColorBond steel panel fencing supplied by Glass Outlet. Workbook regression pending.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='swing-gate'),
    'qs-gate', 'QS Gate (swing + sliding variants)', 'active', 'calculator_ready', 'platform', 'public',
    'QuickScreen pedestrian gate. Swing variant is the historical default; sliding variant (QSG Sliding) was added in the 2026-05-27 Codex work and shares the same product row + rule set. Compatible with QSHS / VS / XPL / BAYG. Workbook regression pending against Order-Form+QSG+Sliding+Gates+V2-T1.xlsx.'),
  ((SELECT id FROM go), (SELECT id FROM system_archetypes WHERE slug='sliding-gate'),
    'xpsg-gate', 'XP Sliding Gate components', 'active', 'approved', 'platform', 'public',
    'XPSG sliding gate component catalogue consumed by QS Gate sliding rules.')
ON CONFLICT (supplier_id, slug) DO NOTHING;

-- ─── 4. Backfill provenance on existing rows ────────────────────────────────
-- supplier_id = glass-outlet on every Glass-Outlet-era row.

UPDATE products            SET supplier_id = (SELECT id FROM suppliers WHERE slug='glass-outlet') WHERE supplier_id IS NULL;
UPDATE product_components  SET supplier_id = (SELECT id FROM suppliers WHERE slug='glass-outlet') WHERE supplier_id IS NULL;
UPDATE pricing_rules       SET supplier_id = (SELECT id FROM suppliers WHERE slug='glass-outlet') WHERE supplier_id IS NULL;

-- system_instance_id on products by system_type. UNIQUE(org_id, system_type) per
-- migration 022 means at most one row per (org, system_type) — straightforward 1:1 map.

UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='qshs')         WHERE system_instance_id IS NULL AND system_type = 'QSHS';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='vs')           WHERE system_instance_id IS NULL AND system_type = 'VS';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='xpl')          WHERE system_instance_id IS NULL AND system_type = 'XPL';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='bayg')         WHERE system_instance_id IS NULL AND system_type = 'BAYG';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='go-colorbond') WHERE system_instance_id IS NULL AND system_type = 'ColorBond';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='qs-gate')      WHERE system_instance_id IS NULL AND system_type = 'QS_GATE';
UPDATE products SET system_instance_id = (SELECT id FROM system_instances WHERE slug='xpsg-gate')    WHERE system_instance_id IS NULL AND system_type = 'XPSG_GATE';

-- Backfill the related v3-engine tables by joining through to their parent product.

UPDATE product_components pc
   SET system_instance_id = p.system_instance_id
  FROM products p
 WHERE (
         p.system_type = ANY(pc.system_types)
         OR (p.system_type = 'QS_GATE' AND 'GATE' = ANY(pc.system_types))
       )
   AND pc.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

UPDATE product_variables pv
   SET system_instance_id = p.system_instance_id
  FROM products p
 WHERE pv.product_id = p.id
   AND pv.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

UPDATE product_rules pr
   SET system_instance_id = p.system_instance_id
  FROM products p
 WHERE pr.product_id = p.id
   AND pr.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

UPDATE product_component_selectors pcs
   SET system_instance_id = p.system_instance_id
  FROM products p
 WHERE pcs.product_id = p.id
   AND pcs.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

UPDATE product_companion_rules pcr
   SET system_instance_id = p.system_instance_id
  FROM products p
 WHERE pcr.product_id = p.id
   AND pcr.system_instance_id IS NULL
   AND p.system_instance_id IS NOT NULL;

-- pricing_rules joins via pricing_rules.component_id → product_components.id → product_components.system_instance_id.
-- (After migration 008, pricing_rules has NO sku column; component_id is the canonical FK.)
UPDATE pricing_rules pr
   SET system_instance_id = pc.system_instance_id
  FROM product_components pc
 WHERE pr.component_id = pc.id
   AND pr.system_instance_id IS NULL
   AND pc.system_instance_id IS NOT NULL;

-- ─── 5. Sanity check: log any rows that didn't get tagged ───────────────────
-- These should be 0. If non-zero, surface to Liam — there's an unmapped system_type
-- or a join column shape that differs from what this brief assumes.

DO $$
DECLARE
  v_unmapped_products INT;
  v_unmapped_components INT;
  v_unmapped_pricing INT;
BEGIN
  SELECT COUNT(*) INTO v_unmapped_products
    FROM products WHERE supplier_id IS NULL OR system_instance_id IS NULL;
  SELECT COUNT(*) INTO v_unmapped_components
    FROM product_components WHERE supplier_id IS NULL OR system_instance_id IS NULL;
  SELECT COUNT(*) INTO v_unmapped_pricing
    FROM pricing_rules WHERE supplier_id IS NULL OR system_instance_id IS NULL;
  RAISE NOTICE 'backfill complete. unmapped: products=%, components=%, pricing_rules=%',
    v_unmapped_products, v_unmapped_components, v_unmapped_pricing;
END $$;