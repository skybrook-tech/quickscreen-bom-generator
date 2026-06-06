# Brief 045 — Amazing Fencing: Supplier + System Instances

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 033 merged (Glass Outlet + the 12 archetypes exist)
**Estimated PR size:** small (one data migration; no schema; no UI; no code)
**Primary reference:** `docs/system-authoring-process.md` Section 7 (admin runbook) + `https://amazingfencing.com.au` (install-side) + `https://www.fencing-supplies.com.au` (supply-side, sister site)

---

## Goal

Add **Amazing Fencing** as the **third supplier** on the platform (after Glass Outlet and Discount Fencing). Create the supplier row + **6 `system_instances`** matching their public product categories. No products / prices / rules in this brief — that's brief 046.

**Updated 2026-05-28:** Added `amazing-retaining-wall` instance after fresh website crawl confirmed retaining walls as a distinct Amazing Fencing product line operating in QLD / NSW / VIC. Liam supplied the Cin7 trade pricing export (`MassDownloadProducts_20260526_0305PM.xlsx`); brief 046 now ships a PUBLISHED tier2 price book with real items.

**Strategic note:** Amazing Fencing is unusual on the platform because they're a **contractor + supplier hybrid**. The install business (`amazingfencing.com.au`) operates across NSW, VIC, QLD, Gold Coast. The supply business (`fencing-supplies.com.au`) is the sister site that publishes the SKU catalogue (no prices publicly). Onboarded as `platform`-tier authored by SkyBrookAI; when they sign the verified-supplier agreement, demote to `verified` via admin UI (brief 035).

**Multi-state implication:** Amazing Fencing operates across 4 metro areas. The visibility layer (brief 044) becomes immediately relevant — NSW Amazing Fencing branch may have different inventory / lead times than QLD branch. For this brief, single-supplier-row with multi-state metadata is sufficient; per-region scoping can be added via brief 046+ or a future brief once Liam confirms operational model.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/045_amazing_fencing_supplier_and_instances.sql` | NEW — data migration |
| `catalogues/amazing-fencing/README.md` | NEW — pointer to source pages + brand partners + TODO list |

**Explicitly NOT touched:** no code, no UI, no seed JSON yet (brief 046).

## Source material

Public pages on `amazingfencing.com.au` and `fencing-supplies.com.au` as of 2026-05-28:

| Page | Product family | Notes |
|---|---|---|
| `amazingfencing.com.au/products/colorbond-fencing/` | ColorBond steel | Multi-brand: Gramline, Lysaght, Oxworks, ColorMAX, PermaSteel |
| `amazingfencing.com.au/products/permasteel-fencing/` | PermaSteel modular | Proprietary "PermaSteel" brand — their flagship modular system. Heights 1.5/1.8/2.1/2.4m as GP bundles. |
| `amazingfencing.com.au/products/timber-fencing/` | Treated pine paling | H3/H4 treated pine; Colonial / Lapped / Lapped&Capped / Paling styles. AS 1604 compliant. |
| `amazingfencing.com.au/products/slat-screen-fence/` | Timber slat screen | Galvanised steel posts + treated pine OR hardwood slats. |
| `amazingfencing.com.au/products/chainwire-security/` | Chain wire / security | Galvanised + PVC-coated options (green or black). |
| `amazingfencing.com.au/products/fence-gates/` | Fence gates | Sold as components within their fence families; not a separate instance. |
| `fencing-supplies.com.au/colorbond-steel-fencing-supplies/` | Full SKU list (steel) | Posts/rails/sheets/gates/hardware enumerated. **No public prices.** |
| `fencing-supplies.com.au/timber-fencing-supplies/` | Full SKU list (timber) | Pickets/posts/rails/lattice/screening enumerated. **No public prices.** |

**Pricing status:** Amazing Fencing does NOT publish wholesale or retail prices online. Pricing PDF must be obtained directly from them before brief 046 can promote any instance past `readiness_status = 'imported'`. The seed JSON in brief 046 includes SKUs with `default_price: null`.

Amazing Fencing operates across:
- **NSW** — Sydney metro
- **VIC** — Melbourne metro
- **QLD** — Brisbane metro
- **Gold Coast** — separate from Brisbane per their site

Founded ~30 years ago (~1995). Phone: 1800 739 359.

## Migration SQL

```sql
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
```

## Catalogue README

Create `catalogues/amazing-fencing/README.md`:

```markdown
# Amazing Fencing — source material

Supplier: Amazing Fencing (install + supply hybrid). Multi-state operations.
- Install business: https://amazingfencing.com.au
- Supply business: https://www.fencing-supplies.com.au
- Phone: 1800 739 359
- Service area: NSW, VIC, QLD (Sydney, Melbourne, Brisbane, Gold Coast)

## Product pages

| Family | Page | SKU detail | Pricing |
|---|---|---|---|
| ColorBond Steel | https://amazingfencing.com.au/products/colorbond-fencing/ + https://www.fencing-supplies.com.au/colorbond-steel-fencing-supplies/ | Full SKU list captured | TODO: obtain trade pricing PDF |
| PermaSteel (proprietary) | https://amazingfencing.com.au/products/permasteel-fencing/ | GP bundles enumerated | TODO: obtain trade pricing PDF |
| Treated Pine Paling | https://amazingfencing.com.au/products/timber-fencing/ + https://www.fencing-supplies.com.au/timber-fencing-supplies/ | Full SKU list captured | TODO: obtain trade pricing PDF |
| Slat / Screen | https://amazingfencing.com.au/products/slat-screen-fence/ | Material spec captured | TODO: obtain trade pricing PDF |
| Chain Wire / Security | https://amazingfencing.com.au/products/chainwire-security/ | Material spec captured | TODO: obtain trade pricing PDF |
| Retaining Walls | (referenced on main products page) | Out of scope — not a fence calculator | n/a |
| Fence Gates | https://amazingfencing.com.au/products/fence-gates/ | Folded into each fence family's SKU list | n/a as separate instance |

## Brand partners (under ColorBond)

- **Gramline** — common steel fence brand
- **Lysaght (BlueScope)** — premium Colorbond brand
- **Oxworks** — Colorbond manufacturer
- **ColorMAX** — Colorbond alternative
- **PermaSteel** — Amazing Fencing's proprietary modular brand

## SKU catalogue captured (no prices)

Brief 046 includes seed JSON for all five instances with the full SKU lists from
fencing-supplies.com.au. Prices are null pending trade pricing PDF.

## TODOs (block readiness promotion beyond 'imported')

- [ ] Obtain trade pricing PDF from Amazing Fencing direct (call 1800 739 359 or email)
- [ ] Confirm whether NSW / VIC / QLD inventories carry different stock — if so, may need per-region price book variants (see brief 046's multi-region note)
- [ ] Confirm relationship between install business and supply business — does the install side mark up the supply pricing?
- [ ] Walk Amazing Fencing through the verified-supplier process; on completion, demote trust_tier from `platform` to `verified` via admin UI
- [ ] Workbook regression for at least 3 configs per instance once pricing arrives
```

## PR description template

```markdown
## Brief 045 — Amazing Fencing: Supplier + System Instances

Adds Amazing Fencing as the third supplier on the platform after Glass Outlet and Discount Fencing. Multi-state install + supply hybrid operating across NSW / VIC / QLD / Gold Coast.

### What's added

- `suppliers` row: `amazing-fencing` (trust_tier `platform`, can be demoted to `verified` after verification)
- 5 `system_instances`: amazing-colorbond, amazing-permasteel, amazing-timber-paling, amazing-timber-slat-screen, amazing-chainwire-security
- `catalogues/amazing-fencing/README.md`

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Migration applies cleanly
- [ ] `NOTICE` logs the supplier UUID + 5 instances
- [ ] PR base branch is `main`
```

## Stop points

- If the brief 033 archetype seed didn't run, INSERTs here will fail on the `system_archetypes WHERE slug='...'` subqueries. Surface and fix 033 first.
- The PermaSteel proprietary brand could justify its own archetype (`tubular-fence` or `modular-steel-fence`) in a future architectural iteration. For now, `panel-fence` archetype with metadata covers it.

## After this PR merges

Brief 046 ships the SKU catalogue seed JSON for all 5 instances + a draft price book (status='draft', no items yet) ready for the trade pricing PDF to populate.