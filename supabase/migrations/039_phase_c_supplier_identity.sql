-- ============================================================================
-- 039_phase_c_supplier_identity.sql  (salvage Phase C)
--
-- Identity rows for suppliers #2 and #3 — Amazing Fencing and Discount Fencing —
-- plus the one missing archetype they need (timber-paling). This is structural /
-- reference data and mirrors how migration 032 seeds the Glass Outlet supplier +
-- system_instances; the product/pricing DATA itself lives in JSON seeds
-- (supabase/seeds/amazing-fencing/, supabase/seeds/discount-fencing/) per AGENTS.md.
--
-- Squashed + cleaned from fork migrations 042 (DF), 045 (AF), 053 (AF brand
-- colour), 054 (hide three AF calculators), 060 (timber-paling archetype). The
-- fork's SQL pricebooks (046/057) and marketplace churn (048/050/051 rename) are
-- NOT ported — pricing is JSON-authoritative; AF/DF org rows live in
-- organizations.sql; AF theming lives on the org's branding JSONB (migration 027),
-- not a supplier column (main's suppliers table has no custom_branding_styles).
--
-- suppliers.org_id is intentionally left NULL here and linked to each supplier's
-- org at seed time by seed-products.js (same pattern as the Glass Outlet supplier).
-- ============================================================================

-- ─── Missing archetype: timber-paling (fork 060) ────────────────────────────
INSERT INTO system_archetypes (slug, name, family, geometry_module, rule_template_ids, description, status)
VALUES (
  'timber-paling', 'Timber Paling', 'fence', 'fence_runs_v1',
  ARRAY['paling_count_v1','rail_per_bay_v1','bay_post_v1'],
  'Treated pine and hardwood paling fencing systems.', 'active'
)
ON CONFLICT (slug) DO NOTHING;

-- ─── Supplier: Amazing Fencing (045 + brand colour from 053) ────────────────
INSERT INTO suppliers (slug, name, brand_colour, trust_tier, status, metadata)
VALUES (
  'amazing-fencing', 'Amazing Fencing', '#0d8ecf', 'platform', 'active',
  jsonb_build_object(
    'website', 'https://amazingfencing.com.au',
    'sister_site', 'https://www.fencing-supplies.com.au',
    'phone', '1800 739 359',
    'service_states', jsonb_build_array('NSW','VIC','QLD'),
    'service_metros', jsonb_build_array('Sydney','Melbourne','Brisbane','Gold Coast'),
    'business_model', 'Contractor + supplier hybrid (install business + sister supply business)',
    'capabilities', jsonb_build_array('install','supply','custom_fabrication','multi_state'),
    'brand_partners', jsonb_build_array('Gramline','Lysaght','Oxworks','ColorMAX','PermaSteel (proprietary)')
  )
)
ON CONFLICT (slug) DO NOTHING;

-- ─── Supplier: Discount Fencing Supplies (042) ──────────────────────────────
INSERT INTO suppliers (slug, name, brand_colour, trust_tier, status, metadata)
VALUES (
  'discount-fencing', 'Discount Fencing Supplies', '#1f3b5c', 'platform', 'active',
  jsonb_build_object(
    'website', 'https://www.dfsau.com.au',
    'address', '11 William Banks Drive, Burleigh Heads, QLD 4220',
    'region', 'Gold Coast QLD',
    'hours', 'Mon-Thu 7am-3pm, Fri 7am-2pm',
    'principal', 'Dave (30+ years fencing experience)',
    'capabilities', jsonb_build_array('custom_fabrication','in_house_powder_coating','pool_fence_compliance')
  )
)
ON CONFLICT (slug) DO NOTHING;

-- ─── Amazing Fencing system_instances (045; statuses per 054; ───────────────
--     amazing-timber-paling re-pointed to timber-paling per 060) ────────────
WITH af AS (SELECT id FROM suppliers WHERE slug = 'amazing-fencing')
INSERT INTO system_instances (
  supplier_id, archetype_id, slug, name, status, readiness_status, trust_tier, visibility, description, metadata
) VALUES
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'amazing-colorbond', 'Amazing Fencing — ColorBond Steel', 'active', 'imported', 'platform', 'public',
    'Standard ColorBond steel panel fencing sourced from multiple brand partners (Gramline, Lysaght, Oxworks, ColorMAX).',
    jsonb_build_object('source_page','https://amazingfencing.com.au/products/colorbond-fencing/')),
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'amazing-permasteel', 'Amazing Fencing — PermaSteel', 'hidden', 'imported', 'platform', 'public',
    'PermaSteel modular fencing — Amazing Fencing''s proprietary brand. Sold as GP bundles in 1.5/1.8/2.1/2.4m heights.',
    jsonb_build_object('source_page','https://amazingfencing.com.au/products/permasteel-fencing/','brand','PermaSteel (proprietary)')),
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='timber-paling'),
    'amazing-timber-paling', 'Amazing Fencing — Treated Pine Paling', 'active', 'imported', 'platform', 'public',
    'Treated pine paling fencing in Colonial / Lapped / Lapped-and-Capped / Paling styles. H3 above-ground and H4 in-ground per AS 1604.',
    jsonb_build_object('source_page','https://amazingfencing.com.au/products/timber-fencing/','compliance','AS 1604')),
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='slat-fence'),
    'amazing-timber-slat-screen', 'Amazing Fencing — Timber Slat Screen', 'hidden', 'imported', 'platform', 'public',
    'Modern timber slat screen fencing on galvanised steel posts. Slats in treated pine OR hardwood.',
    jsonb_build_object('source_page','https://amazingfencing.com.au/products/slat-screen-fence/')),
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='mesh-fence'),
    'amazing-chainwire-security', 'Amazing Fencing — Chain Wire & Security', 'hidden', 'imported', 'platform', 'public',
    'Chain wire fencing for residential and commercial. Raw galvanised + PVC-coated (green or black).',
    jsonb_build_object('source_page','https://amazingfencing.com.au/products/chainwire-security/')),
  ((SELECT id FROM af), (SELECT id FROM system_archetypes WHERE slug='timber-fence'),
    'amazing-retaining-wall', 'Amazing Fencing — Timber Retaining Wall', 'active', 'imported', 'platform', 'public',
    'Timber retaining walls using treated pine OR hardwood sleepers. Multi-state install (NSW, VIC, QLD).',
    jsonb_build_object('source_page','https://amazingfencing.com.au/products/retaining-walls/','use_case','retaining_wall'))
ON CONFLICT (supplier_id, slug) DO NOTHING;

-- ─── Discount Fencing system_instances (042; ───────────────────────────────
--     dfsau-cca-pine-paling re-pointed to timber-paling per 060) ───────────
WITH df AS (SELECT id FROM suppliers WHERE slug = 'discount-fencing')
INSERT INTO system_instances (
  supplier_id, archetype_id, slug, name, status, readiness_status, trust_tier, visibility, description, metadata
) VALUES
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='timber-paling'),
    'dfsau-cca-pine-paling', 'Discount Fencing — CCA Pine Paling Fence', 'active', 'imported', 'platform', 'public',
    'CCA Pine paling fence with 100x16 palings, 100x75 pine posts, 75x38 or 100x38 pine rails.',
    jsonb_build_object('source_page','https://www.dfsau.com.au/timber-fencing','pricing_basis','public_retail_2026_05')),
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='aluminium-pool-fence'),
    'dfsau-aluminium-pool', 'Discount Fencing — Aluminium Pool Fence', 'active', 'imported', 'platform', 'public',
    'Aluminium pool fencing in flat-top, spear-top, and loop-top profiles. Form 15 supplied; powdercoat-to-order.',
    jsonb_build_object('source_page','https://www.dfsau.com.au/aluminium-pool-fencing','form_15_available',true)),
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='glass-pool-fence'),
    'dfsau-frameless-glass-pool', 'Discount Fencing — Frameless Glass Pool Fence', 'active', 'draft', 'platform', 'public',
    '12mm fully frameless tempered glass pool fence. Panels 100-2000mm wide × 1200mm high.',
    jsonb_build_object('source_page','https://www.dfsau.com.au/glass-fencing','panel_thickness_mm',12)),
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'dfsau-colorbond', 'Discount Fencing — ColorBond', 'active', 'draft', 'platform', 'public',
    'ColorBond steel panel fencing. Brand options: Bluescope Lysaght, Metroll, Smartascreen, Neetascreen, Metzag, Trimclad.',
    jsonb_build_object('source_page','https://www.dfsau.com.au/colorbond')),
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'dfsau-aluminium-security', 'Discount Fencing — Aluminium Security Fence', 'active', 'draft', 'platform', 'public',
    'Aluminium security fencing — stock black panels at 1800/2100 high, plus custom swing/sliding gates.',
    jsonb_build_object('source_page','https://www.dfsau.com.au/security-fencing','stock_heights_mm',jsonb_build_array(1800,2100))),
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='swing-gate'),
    'dfsau-aluminium-slat-gate', 'Discount Fencing — Aluminium Slat Gate', 'active', 'imported', 'platform', 'public',
    '930mm × 1800mm aluminium slat swing gate, available in 8 colours.',
    jsonb_build_object('source_page','https://www.dfsau.com.au/colorbond','standard_size_mm',jsonb_build_object('width',930,'height',1800)))
ON CONFLICT (supplier_id, slug) DO NOTHING;
