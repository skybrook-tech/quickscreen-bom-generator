-- ============================================================================
-- 045_amazing_fencing_supplier_and_instances.sql
-- ============================================================================

-- ─── Supplier row ───────────────────────────────────────────────────────────
INSERT INTO suppliers (slug, name, brand_colour, contact_email, trust_tier, status, metadata)
VALUES (
  'amazing-fencing',
  'Amazing Fencing',
  '#0d3b66',
  NULL,
  'platform',
  'active',
  jsonb_build_object(
    'website', 'https://amazingfencing.com.au',
    'sister_site', 'https://www.fencing-supplies.com.au',
    'phone', '1800 739 359',
    'service_states', jsonb_build_array('NSW','VIC','QLD'),
    'service_metros', jsonb_build_array('Sydney','Melbourne','Brisbane','Gold Coast'),
    'business_model', 'Contractor + supplier hybrid (install business + sister supply business)',
    'founded_approx', '1995',
    'capabilities', jsonb_build_array('install','supply','custom_fabrication','multi_state'),
    'brand_partners', jsonb_build_array(
      'Gramline',
      'Lysaght',
      'Oxworks',
      'ColorMAX',
      'PermaSteel (proprietary)'
    )
  )
)
ON CONFLICT (slug) DO NOTHING;

-- ─── System instances ───────────────────────────────────────────────────────
WITH af AS (SELECT id FROM suppliers WHERE slug = 'amazing-fencing')
INSERT INTO system_instances (
  supplier_id, archetype_id, slug, name, status, readiness_status,
  trust_tier, visibility, description, metadata
) VALUES
  -- ColorBond steel (generic, multi-brand)
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'amazing-colorbond', 'Amazing Fencing — ColorBond Steel',
    'active', 'imported', 'platform', 'public',
    'Standard ColorBond steel panel fencing sourced from multiple brand partners (Gramline, Lysaght, Oxworks, ColorMAX). Available with C posts in 2.1/2.4/2.7/3.0m and sheets in 1.5/1.8/2.1/2.4m heights.',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/colorbond-fencing/',
      'brand_partners',jsonb_build_array('Gramline','Lysaght','Oxworks','ColorMAX'),
      'standard_heights_m',jsonb_build_array(1.5,1.8,2.1,2.4),
      'pricing_pending','Trade pricing PDF needed from Amazing Fencing direct'
    )),

  -- PermaSteel (their proprietary brand)
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'amazing-permasteel', 'Amazing Fencing — PermaSteel',
    'active', 'imported', 'platform', 'public',
    'PermaSteel modular fencing — Amazing Fencing''s proprietary brand. Sold as GP bundles in 1.5/1.8/2.1/2.4m heights. Distinct C-post profiles and sheet thicknesses (0.95mm posts, 0.8mm rails, 0.35mm sheets).',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/permasteel-fencing/',
      'brand','PermaSteel (proprietary)',
      'standard_heights_m',jsonb_build_array(1.5,1.8,2.1,2.4),
      'post_bm_thickness_mm',0.95,
      'rail_bm_thickness_mm',0.8,
      'sheet_bm_thickness_mm',0.35,
      'sold_as','GP bundles',
      'pricing_pending','Trade pricing PDF needed'
    )),

  -- Timber paling (treated pine, multiple styles)
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='timber-fence'),
    'amazing-timber-paling', 'Amazing Fencing — Treated Pine Paling',
    'active', 'imported', 'platform', 'public',
    'Treated pine paling fencing in Colonial / Lapped / Lapped-and-Capped / Paling styles. H3 above-ground and H4 in-ground treatment per AS 1604. Posts in 90x90 F7 (1.8-3.6m) and 125x50 (2.4-3.0m). Pickets 70x22 in 0.9-1.8m.',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/timber-fencing/',
      'styles',jsonb_build_array('colonial','lapped','lapped_and_capped','paling'),
      'compliance','AS 1604',
      'treatment_levels',jsonb_build_array('H3 above-ground','H4 in-ground'),
      'pricing_pending','Trade pricing PDF needed'
    )),

  -- Timber slat screen
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'amazing-timber-slat-screen', 'Amazing Fencing — Timber Slat Screen',
    'active', 'imported', 'platform', 'public',
    'Modern timber slat screen fencing on galvanised steel posts. Slats in treated pine OR hardwood. Boundary fencing, area screening, aesthetic screening, garden privacy screen variants. Matching steel gate frames.',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/slat-screen-fence/',
      'post_material','galvanised steel',
      'slat_options',jsonb_build_array('treated_pine','hardwood'),
      'use_cases',jsonb_build_array('boundary_fencing','area_screening','aesthetic_screening','garden_privacy_screen'),
      'pricing_pending','Trade pricing PDF needed'
    )),

  -- Chain wire / security
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='mesh-fence'),
    'amazing-chainwire-security', 'Amazing Fencing — Chain Wire & Security',
    'active', 'imported', 'platform', 'public',
    'Chain wire fencing for residential and commercial. Raw galvanised + PVC-coated options (green or black). Customisable for unusual terrain or layouts. Optional aluminium garden-fence variant.',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/chainwire-security/',
      'finishes',jsonb_build_array('galvanised','pvc_coated_green','pvc_coated_black'),
      'use_cases',jsonb_build_array('residential','commercial','security'),
      'customisable',true,
      'pricing_pending','Trade pricing PDF needed (chainwire not in the 2026-05-26 Cin7 timber export)'
    )),

  -- Retaining walls (timber sleepers — pine + hardwood)
  -- Tagged as timber-fence archetype with metadata flag; future architectural
  -- iteration could introduce a dedicated 'retaining-wall' archetype.
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='timber-fence'),
    'amazing-retaining-wall', 'Amazing Fencing — Timber Retaining Wall',
    'active', 'imported', 'platform', 'public',
    'Timber retaining walls using treated pine OR hardwood sleepers. Plantation-grown CCA pine + H4 hardwood. Multi-state install (NSW, VIC, QLD, Gold Coast). State-specific zoning compliance (QLD zoning regulations explicitly noted).',
    jsonb_build_object(
      'source_page','https://amazingfencing.com.au/products/retaining-walls/',
      'archetype_note','Tagged as timber-fence archetype with use_case=retaining_wall; consider promoting to dedicated retaining-wall archetype in a future architectural iteration.',
      'use_cases',jsonb_build_array('correct_uneven_terrain','garden_protection','walkway_protection','reclaim_sloped_land'),
      'materials',jsonb_build_array('treated_pine_H4','treated_hardwood_H4'),
      'compliance_notes',jsonb_build_array('QLD zoning regulations vary by state','AS 1604 treated timber')
    ))
ON CONFLICT (supplier_id, slug) DO NOTHING;

-- ─── Sanity log ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_supplier UUID; v_instance_count INT;
BEGIN
  SELECT id INTO v_supplier FROM suppliers WHERE slug = 'amazing-fencing';
  IF v_supplier IS NULL THEN
    RAISE EXCEPTION 'Amazing Fencing supplier row not inserted';
  END IF;
  SELECT COUNT(*) INTO v_instance_count FROM system_instances WHERE supplier_id = v_supplier;
  RAISE NOTICE 'Amazing Fencing seeded: supplier %, % system_instances', v_supplier, v_instance_count;
END $$;