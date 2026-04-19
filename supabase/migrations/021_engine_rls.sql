-- 021_engine_rls.sql
--
-- Close the RLS gap across engine + catalog tables.
-- Writes are service-role-only throughout (the Node seed upserter and the
-- bom-calculator edge function both use the service role key, which
-- bypasses RLS). This migration governs only client reads.
--
-- Pattern:
--   Engine config tables (rule_sets, rule_versions, product_rules,
--   product_constraints, product_validations, product_companion_rules,
--   product_warnings): authenticated SELECT scoped by public.user_org_id()
--   — matching the existing policy style on product_variables and
--   product_component_selectors.
--
--   Catalog/pricing tables (product_components, pricing_rules): RLS enabled
--   with NO policies → deny-by-default. Service role bypasses. Stronger
--   guarantee than REVOKE (which a stray GRANT could undo).
--
--   organisations: users SELECT only their own org row.

-- ─── organisations ──────────────────────────────────────────────────────────

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY organisations_select_own ON organisations
  FOR SELECT TO authenticated
  USING (id = public.user_org_id());

GRANT SELECT ON organisations TO authenticated;

-- ─── engine config tables: authenticated SELECT, org-scoped ────────────────

ALTER TABLE rule_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY rule_sets_select_own_org ON rule_sets
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON rule_sets TO authenticated;


ALTER TABLE rule_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY rule_versions_select_own_org ON rule_versions
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON rule_versions TO authenticated;


ALTER TABLE product_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_rules_select_own_org ON product_rules
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON product_rules TO authenticated;


ALTER TABLE product_constraints ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_constraints_select_own_org ON product_constraints
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON product_constraints TO authenticated;


ALTER TABLE product_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_validations_select_own_org ON product_validations
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON product_validations TO authenticated;


ALTER TABLE product_companion_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_companion_rules_select_own_org ON product_companion_rules
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON product_companion_rules TO authenticated;


ALTER TABLE product_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_warnings_select_own_org ON product_warnings
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON product_warnings TO authenticated;

-- ─── catalog + pricing: RLS on, no policies → deny-by-default ──────────────
-- Service role (edge functions + seed upserter) bypasses RLS. Clients cannot
-- read pricing or SKU metadata. Stronger than the previous REVOKE-only model.

ALTER TABLE product_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules      ENABLE ROW LEVEL SECURITY;
