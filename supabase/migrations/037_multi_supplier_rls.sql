-- ============================================================================
-- 037_multi_supplier_rls.sql  (salvage Phase A — the deliberate access model)
--
-- THE SHARP EDGE. Supplier (org) data isolation is business-ending if wrong.
-- This migration establishes ONE intended access model for the multi-supplier
-- catalogue + pricing surface, replacing the fork's churned RLS history.
--
-- The fork groped toward this across three migrations we deliberately did NOT
-- port as-is:
--   * 052_supplier_portal_pricing_rls.sql — org-scoped reads on
--     product_components / pricing_rules. GOOD IDEA, kept here.
--   * 060_fix_bom_pricing_rls_and_archetypes.sql — added an anon read policy on
--     system_archetypes. NOT ported: no anon access in this phase.
--   * 061_grant_anon_select.sql — blanket GRANT SELECT ON products,
--     product_components TO anon. NOT ported: this would expose one supplier's
--     catalogue/SKUs to the world. Anon access is designed properly in brief 032
--     (embed), scoped to embed_enabled orgs.
--
-- Intended model for this phase:
--   * anon            → reads NOTHING org-scoped. No grants to anon anywhere.
--   * authenticated   → reads ONLY their own org's catalogue, pricing, rules,
--                       and price books (org_id = public.user_org_id()).
--   * admin           → reads everything (platform operator).
--
-- The org-scoping anchor is the org_id column already present and populated on
-- products / product_components / pricing_rules / engine tables. Price books have
-- no org_id of their own; they scope through suppliers.org_id (set for the Glass
-- Outlet supplier in migration 032).
--
-- Engine config tables (rule_sets, rule_versions, product_rules,
-- product_constraints, product_validations, product_variables,
-- product_component_selectors, product_companion_rules, product_warnings) are
-- already authenticated-SELECT org-scoped from migration 021 — no change needed.
-- products is already org-scoped from migration 010. We add org-scoped SELECT to
-- product_components + pricing_rules (previously admin-only), and REPLACE the
-- fork's leaky published-price-book policies with org-scoped ones.
-- ============================================================================

-- ─── product_components: add org-scoped authenticated SELECT ────────────────
-- Was: admin-only SELECT (migration 025) on top of deny-by-default (021).
-- Now: org members may also read their own org's components (RLS combines with
-- OR, so admin SELECT from 025 still applies). GRANT SELECT already exists (025).

CREATE POLICY "components_select_own_org" ON product_components
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

-- ─── pricing_rules: add org-scoped authenticated SELECT ─────────────────────
-- Sacred table. Org members read ONLY their own org's pricing; never cross-org.

CREATE POLICY "pricing_rules_select_own_org" ON pricing_rules
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

-- ─── price_books: org-scoped read ──────────────────────────────────────────
-- 033 intentionally creates NO read policy for price_books (the fork's leaky
-- "published → world" policy was dropped at source), so the table is
-- deny-by-default for reads until this migration. The DROP below is defensive
-- only — a no-op on a clean chain, but it cleans up a DB previously migrated
-- from the fork where the leaky policy existed.

DROP POLICY IF EXISTS "price_books_read_published" ON price_books;

CREATE POLICY "price_books_read_own_org" ON price_books
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR authored_by = auth.uid()
    OR supplier_id IN (
      SELECT id FROM suppliers WHERE org_id = public.user_org_id()
    )
  );

-- ─── price_book_items: follow the org-scoped parent book ───────────────────
-- 033 creates no read policy here either (deny-by-default until now). The DROP
-- is defensive against a fork-migrated DB.
--
-- PERF (revisit in Phase B): this is a two-level correlated subquery
-- (price_book_items → price_books → suppliers). Fine at Phase A volumes (the
-- import pipeline doesn't populate these tables yet), but once Phase B starts
-- filling price_book_items at scale, consider a JOIN-based policy or a
-- denormalised org_id column on price_book_items to avoid the nested IN.

DROP POLICY IF EXISTS "price_book_items_read" ON price_book_items;

CREATE POLICY "price_book_items_read_own_org" ON price_book_items
  FOR SELECT TO authenticated
  USING (
    price_book_id IN (
      SELECT id FROM price_books
      WHERE (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        OR authored_by = auth.uid()
        OR supplier_id IN (
          SELECT id FROM suppliers WHERE org_id = public.user_org_id()
        )
    )
  );

-- ─── Belt-and-suspenders: ensure no anon grants leaked in ───────────────────
-- The fork's 061 granted anon SELECT on products + product_components. We never
-- ported it, but REVOKE defensively so a re-run from a fork-tainted DB is clean.
REVOKE ALL ON products            FROM anon;
REVOKE ALL ON product_components  FROM anon;
REVOKE ALL ON pricing_rules       FROM anon;
REVOKE ALL ON price_books         FROM anon;
REVOKE ALL ON price_book_items    FROM anon;
REVOKE ALL ON suppliers           FROM anon;
REVOKE ALL ON system_archetypes   FROM anon;
REVOKE ALL ON system_instances    FROM anon;
