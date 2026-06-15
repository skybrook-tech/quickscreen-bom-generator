-- ============================================================================
-- 041_embed_rls.sql  (brief 032 — embeddable configurator, THE SHARP EDGE)
--
-- Anonymous read access for the customer embed, scoped to embed_enabled orgs ONLY.
--
-- What the v4 calculator reads client-side (verified by tracing its hooks —
-- useProducts / useProductVariables / useColourOptions + ProductSelectV4):
--   products (id,name,system_type,description,image_url,active,sort_order,metadata
--             — NO pricing columns), product_variables (form field defs),
--   colour_options (colour list), and the org's branding (theme).
-- That is ALL. Everything sensitive — BOM math, pricing, components, engine rules,
-- selectors, quote creation, item search — runs SERVER-SIDE through service-role
-- edge functions (bom-calculator-static / search-products / embed quote creation),
-- so it is NEVER exposed to the anon role.
--
-- This migration therefore grants anon SELECT on EXACTLY four tables, each gated
-- to embed_enabled orgs, and on organisations it further restricts to four
-- non-sensitive columns. It adds NO anon access to product_components,
-- pricing_rules, product_rules/constraints/validations/selectors/companions/
-- warnings, rule_sets, rule_versions, price_books, price_book_items, suppliers,
-- system_instances, staging_* or quote_runs — those remain anon-denied.
--
-- Verified by supabase/tests/rls_matrix_test.ts (extended with embed cases):
-- anon reads ONLY embed-enabled orgs' metadata and NOTHING from embed-disabled
-- orgs, and no pricing/SKUs for anyone.
-- ============================================================================

-- ─── Helper: is this org opted into embedding? (bypasses RLS, like user_org_id) ─
CREATE OR REPLACE FUNCTION public.is_embed_enabled_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisations o
    WHERE o.id = p_org_id AND o.embed_enabled = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_embed_enabled_org(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_embed_enabled_org(uuid) TO anon, authenticated;

-- ─── organisations: anon reads branding for embed-enabled orgs only ─────────
-- Column-restricted: anon may read only id/slug/name/branding/embed_domains
-- (never settings or other columns). Branding is public-facing for an org that
-- has opted into embed; embed_domains drives the loader's advisory referrer
-- check (it is an allowlist of the supplier's own public domains — not secret).
CREATE POLICY "organisations_anon_embed_read" ON organisations
  FOR SELECT TO anon
  USING (embed_enabled = true);

GRANT SELECT (id, slug, name, branding, embed_domains) ON organisations TO anon;

-- ─── products: anon reads metadata for embed-enabled orgs only ──────────────
-- products has no pricing columns; the picker + form need name/system_type/etc.
CREATE POLICY "products_anon_embed_read" ON products
  FOR SELECT TO anon
  USING (public.is_embed_enabled_org(org_id));

GRANT SELECT ON products TO anon;

-- ─── product_variables: anon reads form-field definitions for embed orgs ────
CREATE POLICY "product_variables_anon_embed_read" ON product_variables
  FOR SELECT TO anon
  USING (public.is_embed_enabled_org(org_id));

GRANT SELECT ON product_variables TO anon;

-- ─── colour_options: anon reads colour list for embed orgs ──────────────────
CREATE POLICY "colour_options_anon_embed_read" ON colour_options
  FOR SELECT TO anon
  USING (public.is_embed_enabled_org(org_id));

GRANT SELECT ON colour_options TO anon;

-- ─── Belt-and-suspenders: the sensitive tables stay anon-denied ─────────────
-- These have no anon grant, but REVOKE defensively so a stray grant can't open
-- them. (Quote creation for the embed goes through a service-role edge function,
-- not anon INSERT, so anon gets no access to quotes at all.)
REVOKE ALL ON product_components            FROM anon;
REVOKE ALL ON pricing_rules                 FROM anon;
REVOKE ALL ON product_rules                 FROM anon;
REVOKE ALL ON product_constraints           FROM anon;
REVOKE ALL ON product_validations           FROM anon;
REVOKE ALL ON product_component_selectors   FROM anon;
REVOKE ALL ON product_companion_rules       FROM anon;
REVOKE ALL ON product_warnings              FROM anon;
REVOKE ALL ON rule_sets                     FROM anon;
REVOKE ALL ON rule_versions                 FROM anon;
REVOKE ALL ON price_books                   FROM anon;
REVOKE ALL ON price_book_items              FROM anon;
REVOKE ALL ON suppliers                     FROM anon;
REVOKE ALL ON system_instances              FROM anon;
REVOKE ALL ON quotes                        FROM anon;
REVOKE ALL ON quote_runs                    FROM anon;
