> **Salvage paper trail.** Ported from fork brief 042 as part of SALVAGE-PLAN Phase C.
> Adapted for main: identity (suppliers + system_instances + the timber-paling archetype) is one squashed
> migration (039); AF/DF orgs live in organizations.sql; product/pricing data is JSON-authoritative
> (supabase/seeds/{amazing-fencing,discount-fencing}/), NOT the fork's SQL pricebooks (046/057, skipped).
> Discount Fencing is its own org (confirmed a separate business). Branding deferred to Phase E (embed).

# Brief 042 — Discount Fencing: Supplier + System Instances

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 033 merged (Glass Outlet + the 12 archetypes exist)
**Estimated PR size:** small (one data migration; no schema; no UI; no code)
**Primary reference:** `docs/system-authoring-process.md` Section 7 (admin runbook) + `https://www.dfsau.com.au/products` (source-of-truth product range)

---

## Goal

Add Discount Fencing as the **second supplier** on the platform. Create the supplier row + six `system_instances` matching their public product categories. No products / prices / rules in this brief — that's brief 043. This brief is the "we are now multi-supplier in fact, not just in theory" milestone.

**Updated 2026-05-28 after fresh site crawl:**
- `dfsau-aluminium-security` archetype changed from `mesh-fence` → `panel-fence` (structurally more accurate; mesh-fence is chainwire/weldmesh, this is panel-based vertical-bar aluminium)
- Added `dfsau-aluminium-slat-gate` instance for the $399 930×1800 aluminium slat gate promoted on the Colorbond page
- Confirmed `/hampton-pvc`, `/aluminium-custom`, `/rural-and-chainwire` pages are 404 on the live site — those product categories are no longer offered or have moved; removed from the README TODO list

**Strategic note:** Discount Fencing is being added as a `platform`-tier supplier authored by SkyBrookAI (Liam), because Liam holds the source material and is responsible for the data quality. When Discount Fencing later signs the verified-supplier agreement (per brief 040's verification process), the trust_tier can be demoted to `verified` via the admin UI (brief 035) — that's a clean one-row update, no migration needed.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **No fork.** This is a deliberate architectural choice — the multi-supplier platform is precisely the path that avoids forking per supplier. Adding Discount Fencing here demonstrates the value of the architecture.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/042_discount_fencing_supplier_and_instances.sql` | NEW — data migration |
| `catalogues/discount-fencing/README.md` | NEW — pointer to dfsau.com.au product pages + downloadable PDFs |
| `docs/system-authoring-process.md` | UPDATE — Decision log row: "Discount Fencing onboarded as platform-tier 2026-06-XX" |

**Explicitly NOT touched:** no code, no UI, no seed JSON yet (brief 043).

## Source material

Public product pages on `dfsau.com.au` as of 2026-05-28:

| Page | Product family | Notes |
|---|---|---|
| `/timber-fencing` | CCA Pine palings, posts, rails, sleepers | Concrete prices listed on page |
| `/aluminium-pool-fencing` | Flat-top, spear-top, loop-top panels | Concrete prices listed on page |
| `/glass-fencing` | 12mm frameless glass panels 100-2000mm × 1200H | "Fully Frameless Glass From $129/LM"; full SKU detail in downloadable price PDF |
| `/colorbond` | Bluescope Lysaght (12 colours), Metroll (9 colours), Smartascreen, Neetascreen, Metzag, Trimclad | "Click here to download our pricing" — needs PDF |
| `/colorbond` (promo product) | 930×1800 Aluminium Slat Gate at $399 in 8 colours | Companion gate; modelled as standalone `swing-gate` instance `dfsau-aluminium-slat-gate` |
| `/security-fencing` | Black aluminium panels (1800/2100H), swing/sliding security gates | "Click here to download our pricing" — needs PDF |
| `/insulated-patios` | Delta Panel patio systems | Not a fence — separate archetype (`enclosure` family) — out of scope for this brief |
| `/concrete-sleepers`, `/letterboxes`, `/gate-motors` | Accessories | Not separate calculator instances; will be modelled as auxiliary products under the fence instances they accompany |
| ~~`/hampton-pvc`~~ | ~~Hampton PVC fencing~~ | **404 on live site (verified 2026-05-28)** — page no longer exists |
| ~~`/aluminium-custom`~~ | ~~Custom aluminium~~ | **404** — folded into `/aluminium-pool-fencing` and `/security-fencing` |
| ~~`/rural-and-chainwire`~~ | ~~Rural / chainwire~~ | **404** — not currently offered |

Discount Fencing is located at **11 William Banks Drive, Burleigh Heads, Gold Coast QLD 4220**. Mon-Thu 7am-3pm, Fri 7am-2pm. Family-owned; Dave has 30+ years fencing experience and an in-house powder coating facility.

## Migration SQL

```sql
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
```

## Catalogue README

Create `catalogues/discount-fencing/README.md`:

```markdown
# Discount Fencing — source material

Supplier: Discount Fencing Supplies, 11 William Banks Drive, Burleigh Heads, QLD 4220.
Website: https://www.dfsau.com.au

## Product pages

| Family | Page | Pricing |
|---|---|---|
| CCA Pine Paling | https://www.dfsau.com.au/timber-fencing | Public retail prices on page (2026-05) |
| Aluminium Pool Fence | https://www.dfsau.com.au/aluminium-pool-fencing | Public retail prices on page (2026-05) |
| Frameless Glass Pool | https://www.dfsau.com.au/glass-fencing | "From $129/LM"; full SKU detail in PDF (TODO: download) |
| ColorBond | https://www.dfsau.com.au/colorbond | "Click here to download our pricing" (TODO: download) |
| Aluminium Security | https://www.dfsau.com.au/security-fencing | "Click here to download our pricing" (TODO: download) |
| Hampton PVC | https://www.dfsau.com.au/hampton-pvc | Page failed to crawl 2026-05-28; needs manual fetch |
| Insulated Patios (Delta) | https://www.dfsau.com.au/insulated-patios | Out of scope — separate `enclosure` archetype |

## Brand partners (under ColorBond)

- **Bluescope Lysaght** — premium brand, 12 stocked colours
- **Metroll** — 9 stocked colours
- **Smartascreen**, **Neetascreen**, **Metzag**, **Trimclad**

## TODOs

- [ ] Download the public pricing PDFs from /colorbond, /security-fencing, /glass-fencing
- [ ] Fetch /hampton-pvc product detail via Browser tool
- [ ] Walk Discount Fencing through the supplier verification process; on completion, demote trust_tier from `platform` to `verified` via admin UI
```

## PR description template

```markdown
## Brief 042 — Discount Fencing: Supplier + System Instances

Adds the second supplier on the platform: Discount Fencing Supplies (Gold Coast). Creates 5 system_instances spanning their public product range. No products / prices / rules in this brief — see brief 043.

### Why no fork

The multi-supplier architecture (briefs 028-041) is specifically the path that avoids per-supplier forks. Adding Discount Fencing here proves the architecture scales: zero TypeScript changes, zero new tables, one data migration.

### What's added

- `suppliers` row: `discount-fencing` (trust_tier `platform`, can be demoted to `verified` after verification)
- 5 `system_instances`: cca-pine-paling, aluminium-pool, frameless-glass-pool, colorbond, aluminium-security
- `catalogues/discount-fencing/README.md` with source pointers

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Migration applies cleanly
- [ ] `NOTICE` message logs the supplier UUID + 5 instances
- [ ] Querying `system_instances` filtered to supplier=discount-fencing returns the 5 rows
- [ ] Calculator picker (when re-opened post-brief-035) lists Discount Fencing as a choice
- [ ] PR base branch is `main`
```

## Stop points

- If brief 033 didn't seed all 12 archetypes (incomplete migration), some of the INSERTs here will fail. Surface and fix 033 first.
- Discount Fencing's actual brand colour from their site logo — current value `#1f3b5c` is an inferred estimate. Replace with the real one if Liam has it.

## After this PR merges

Brief 043 ships the seed data (products + price book v1 + rules wiring) for the two instances where retail pricing is public (timber + aluminium pool). The other three instances (glass, colorbond, security) wait for the pricing PDFs to be downloaded and parsed — those land in follow-up briefs.