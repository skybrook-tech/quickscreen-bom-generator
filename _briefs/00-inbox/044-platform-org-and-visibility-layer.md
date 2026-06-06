# Brief 044 — Platform Org + Visibility Layer (Layer 5)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 043 merged
**Estimated PR size:** large (schema migration + data migration + RLS rework + admin UI surface for visibility)
**Primary reference:** `docs/multi-supplier-platform-architecture.md` Layer 5 ("Visibility & Access") + the deferred architectural decision noted in briefs 042 and 043

---

## Goal

Resolve the deferred multi-org architectural question by introducing **first-class visibility tables** (Layer 5 of the architecture) and a **`skybrook-platform` org** that owns the shared multi-supplier catalogue. Tradies' own orgs read from the platform catalogue via visibility rules, not via `org_id = mine` RLS.

**Before this brief:** all products live under the `glass-outlet` org (with Discount Fencing namespaced via `DF_*` system_type prefixes). Tradies who aren't in the Glass Outlet org can't see anything via the existing `products.org_id = public.user_org_id()` policy.

**After this brief:**
- A new `skybrook-platform` organisation row owns the canonical catalogue.
- All `products` / `product_components` rows migrate to the platform org.
- `supplier_visibility` / `system_visibility` / `product_visibility` tables exist (per architecture doc).
- RLS on `products` updates to: "row is visible if user's org has a visibility grant for the row's supplier × system_instance, OR the row is `visibility = 'public'` AND `trust_tier IN ('platform', 'verified')`, OR user is admin."
- The Glass Outlet org keeps existing — but its meaning shifts from "the catalogue owner" to "Liam's Glass Outlet tradie tenant" (which it's always actually been).

## Why this is brief 044 (and why deferred from 042-043)

The current pack (briefs 028-043) ships under Option A (DF products under glass-outlet org, namespaced by `DF_*`). That works **but** is conceptually muddy:

- "Discount Fencing products live in The Glass Outlet's organisation row" is wrong as a long-term identity statement.
- The moment a third supplier signs on, the cracks widen.
- B2B scoping ("Customer X sees ColorBond only, not Stratco") is impossible without a real visibility layer.

Brief 044 is the architectural fix. It's deferred to 044 (not bolted into 042-043) because:
1. It's a sizeable schema + RLS rework.
2. It requires the multi-supplier identity (032-033) and pricing (034) to be in place first.
3. The current arrangement is reversible — moving products from one `org_id` to another is one UPDATE statement.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Data migration is idempotent.** Re-running is a no-op.
- **Existing customer access continues** — Liam's Byron and Beyond Fencing org continues to see Glass Outlet (and now Discount Fencing) products without any frontend change. The RLS rewrite preserves this.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/044_platform_org_and_visibility.sql` | NEW — schema + data migration |
| `src/lib/visibility/queries.ts` | NEW — visibility resolution helpers |
| `src/lib/visibility/schemas.ts` | NEW — Zod types |
| `src/pages/admin/VisibilityPage.tsx` | NEW — admin UI for grant management |
| `docs/multi-supplier-platform-architecture.md` | UPDATE — Decision log row |
| `docs/system-authoring-process.md` | UPDATE — Section 4 (the role of `skybrook-platform` org) |

## Schema additions

```sql
-- Visibility tables (per architecture doc Layer 5)
CREATE TABLE supplier_visibility (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  scope_type  TEXT NOT NULL CHECK (scope_type IN ('global','org','user','customer_group','region')),
  scope_id    TEXT,
  visible     BOOLEAN NOT NULL DEFAULT true,
  granted_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE system_visibility (
  -- analogous shape, references system_instances(id)
);

CREATE TABLE product_visibility (
  -- analogous shape, references products(id) — finest-grained
);
```

## Data migration

```sql
-- 1. Create skybrook-platform org
INSERT INTO organisations (slug, name, ...) VALUES ('skybrook-platform', 'SkyBrookAI Platform', ...);

-- 2. Migrate all catalogue rows (products / product_components / product_rules /
--    product_variables / etc) to the platform org
UPDATE products            SET org_id = (SELECT id FROM organisations WHERE slug='skybrook-platform');
UPDATE product_components  SET org_id = (SELECT id FROM organisations WHERE slug='skybrook-platform');
UPDATE pricing_rules       SET org_id = (SELECT id FROM organisations WHERE slug='skybrook-platform');
-- (and the engine v3 tables: product_rules, product_variables, product_component_selectors, product_companion_rules, rule_sets, rule_versions)

-- 3. Seed default visibility: every existing tradie org sees the platform's catalogue
INSERT INTO supplier_visibility (supplier_id, scope_type, scope_id, visible)
SELECT id, 'global', NULL, true FROM suppliers WHERE trust_tier IN ('platform','verified');
```

## RLS rewrite

```sql
-- products: replace the strict org_id check with visibility-aware logic
DROP POLICY IF EXISTS products_select_own_org ON products;

CREATE POLICY products_select_visible ON products FOR SELECT TO authenticated
USING (
  -- Admin sees all
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  -- User's own org's products (private tenant data)
  OR org_id = public.user_org_id()
  -- Platform/verified supplier products via visibility resolution
  OR EXISTS (
    SELECT 1 FROM supplier_visibility sv
    WHERE sv.supplier_id = products.supplier_id
      AND sv.visible = true
      AND (
        sv.scope_type = 'global'
        OR (sv.scope_type = 'org' AND sv.scope_id = public.user_org_id()::TEXT)
        OR (sv.scope_type = 'user' AND sv.scope_id = auth.uid()::TEXT)
      )
  )
);
```

(Analogous changes to `product_components`, `pricing_rules` visibility post-migration.)

## Open decisions

These need Liam's input during brief execution, not before staging:

1. **What happens to the `glass-outlet` org row?** Stays as Liam's tenant org (with its existing customer data — quotes, profiles); OR retired in favour of a new `byron-and-beyond-fencing` org for Liam's actual business; OR demoted. The pack assumes "stays as-is" but flag for explicit decision when brief lands.

2. **B2B grant policy.** When Discount Fencing's `trust_tier` is `platform` (per brief 042), the `supplier_visibility` row seeded above defaults to `global` (everyone sees it). When DF moves to `verified`, that may want to flip to `org-by-org grant` per supplier-customer agreements. Default for now: global visibility for `platform`/`verified` suppliers.

## Stop points

- If the `glass-outlet` org's existing quote rows reference products via FK that would break after the `org_id` migration, **STOP** and surface. Quotes should be invariant to where products live in the org tree — but verify.
- If existing edge function code depends on `products.org_id` for any logic beyond RLS, surface and refactor.

## After this PR merges

- The multi-supplier architecture is fully ship-shape: identity (032) + provenance (033) + pricing (034) + admin authoring (035-038) + community (039-041) + Discount Fencing (042-043) + visibility (044) all integrated.
- Adding the 5th supplier becomes ~50 lines of data migration (per brief 042's pattern), with no RLS changes needed.
- Tradies' orgs become first-class tenants reading from a shared catalogue. The B2B story is unlocked.
- A natural follow-on is to convert the Glass Outlet "platform" tier supplier to "verified" once Glass Outlet signs a supplier agreement — one-row admin UI update.