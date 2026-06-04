-- ============================================================================
-- 042_discount_fencing_supplier_and_instances.sql
-- ============================================================================

-- ─── Supplier row ───────────────────────────────────────────────────────────
INSERT INTO suppliers (slug, name, brand_colour, contact_email, trust_tier, status, metadata)
VALUES (
  'discount-fencing',
  'Discount Fencing Supplies',
  '#1f3b5c',
  NULL,
  'platform',
  'active',
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

-- ─── System instances ───────────────────────────────────────────────────────
WITH df AS (SELECT id FROM suppliers WHERE slug = 'discount-fencing')
INSERT INTO system_instances (
  supplier_id, archetype_id, slug, name, status, readiness_status,
  trust_tier, visibility, description, metadata
) VALUES
  -- Timber fence (CCA Pine palings)
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='timber-fence'),
    'dfsau-cca-pine-paling', 'Discount Fencing — CCA Pine Paling Fence',
    'active', 'imported', 'platform', 'public',
    'CCA Pine paling fence with 100x16 palings, 100x75 pine posts, 75x38 or 100x38 pine rails. Sourced from Discount Fencing Supplies (Burleigh Heads, QLD).',
    jsonb_build_object('source_page','https://www.dfsau.com.au/timber-fencing','pricing_basis','public_retail_2026_05')),

  -- Aluminium pool fence (flat top, spear top, loop top)
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='aluminium-pool-fence'),
    'dfsau-aluminium-pool', 'Discount Fencing — Aluminium Pool Fence',
    'active', 'imported', 'platform', 'public',
    'Aluminium pool fencing in flat-top, spear-top, and loop-top profiles. Compliant with Australian pool safety standards; Form 15 supplied. Black stock + powdercoat-to-order in any colour.',
    jsonb_build_object('source_page','https://www.dfsau.com.au/aluminium-pool-fencing','form_15_available',true,'profiles',jsonb_build_array('flat_top','spear_top','loop_top'))),

  -- Glass pool fence (12mm frameless)
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='glass-pool-fence'),
    'dfsau-frameless-glass-pool', 'Discount Fencing — Frameless Glass Pool Fence',
    'active', 'draft', 'platform', 'public',
    '12mm fully frameless tempered glass pool fence. Panels 100-2000mm wide × 1200mm high. Compliant with Australian pool safety standards.',
    jsonb_build_object('source_page','https://www.dfsau.com.au/glass-fencing','panel_thickness_mm',12,'panel_height_mm',1200,'pricing_pending','PDF download')),

  -- ColorBond panel fence (multi-brand: Bluescope, Metroll, Smartascreen, Neetascreen, Metzag, Trimclad)
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'dfsau-colorbond', 'Discount Fencing — ColorBond',
    'active', 'draft', 'platform', 'public',
    'ColorBond steel panel fencing. Brand options: Bluescope Lysaght (premium, 12 stocked colours), Metroll (9 stocked colours), Smartascreen, Neetascreen, Metzag, Trimclad. Brand selected as a variant on the calculator.',
    jsonb_build_object(
      'source_page','https://www.dfsau.com.au/colorbond',
      'brand_variants',jsonb_build_array('bluescope_lysaght','metroll','smartascreen','neetascreen','metzag','trimclad'),
      'pricing_pending','PDF download'
    )),

  -- Aluminium security fence (panel-fence archetype — panel-based vertical-bar
  -- system structurally similar to aluminium-pool-fence but for security at
  -- 1800/2100mm heights, no pool-compliance constraint)
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='panel-fence'),
    'dfsau-aluminium-security', 'Discount Fencing — Aluminium Security Fence',
    'active', 'draft', 'platform', 'public',
    'Aluminium security fencing — stock black panels at 1800/2100 high, plus custom-made swing and sliding security gates, raked / custom-height panels, powder coating to any colour.',
    jsonb_build_object(
      'source_page','https://www.dfsau.com.au/security-fencing',
      'stock_heights_mm',jsonb_build_array(1800,2100),
      'custom_capabilities',jsonb_build_array('raked','custom_height','swing_gate','sliding_gate','powdercoat_to_colour'),
      'pricing_pending','PDF download',
      'archetype_note','Tagged as panel-fence; consider promoting to dedicated tubular-fence archetype in a future architecture iteration (the structural pattern differs from ColorBond panel sheets — vertical bars between posts, like aluminium-pool-fence at non-pool heights).'
    )),

  -- Aluminium slat gates (companion product line for the ColorBond + Security
  -- instances). Sold as 930mm × 1800mm at $399 in 8 colours per current
  -- /colorbond page promo. Modelled as a swing-gate archetype instance so it
  -- can carry its own pricing + colour selection rules separately from the
  -- panel systems it complements.
  ((SELECT id FROM df), (SELECT id FROM system_archetypes WHERE slug='swing-gate'),
    'dfsau-aluminium-slat-gate', 'Discount Fencing — Aluminium Slat Gate',
    'active', 'imported', 'platform', 'public',
    '930mm × 1800mm aluminium slat swing gate, available in 8 colours at $399. Promoted as a companion gate on the ColorBond and Security fence pages.',
    jsonb_build_object(
      'source_page','https://www.dfsau.com.au/colorbond',
      'standard_size_mm',jsonb_build_object('width',930,'height',1800),
      'standard_price_aud',399,
      'colour_count',8,
      'pricing_basis','public_retail_2026_05'
    ))
ON CONFLICT (supplier_id, slug) DO NOTHING;

-- ─── Sanity log ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_supplier UUID; v_instance_count INT;
BEGIN
  SELECT id INTO v_supplier FROM suppliers WHERE slug = 'discount-fencing';
  IF v_supplier IS NULL THEN
    RAISE EXCEPTION 'Discount Fencing supplier row not inserted';
  END IF;
  SELECT COUNT(*) INTO v_instance_count FROM system_instances WHERE supplier_id = v_supplier;
  RAISE NOTICE 'Discount Fencing seeded: supplier %, % system_instances', v_supplier, v_instance_count;
END $$;