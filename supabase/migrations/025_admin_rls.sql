-- 025_admin_rls.sql
--
-- Adds admin read/write RLS policies for the product management admin UI.
--
-- product_components + pricing_rules: currently RLS-on, no policies (deny all).
--   → Add SELECT + CRUD for admin role.
--
-- colour_options: SELECT already open to authenticated (migration 024).
--   → Add CRUD for admin role.
--
-- Engine tables (rule_sets, rule_versions, product_rules, product_constraints,
-- product_validations, product_component_selectors, product_companion_rules,
-- product_warnings, product_variables): SELECT already open to authenticated.
--   → Add INSERT + UPDATE + DELETE for admin role.
--
-- Admin check expression: (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'

-- ─── product_components ─────────────────────────────────────────────────────

CREATE POLICY "admin_select_product_components"
  ON product_components FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_insert_product_components"
  ON product_components FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_product_components"
  ON product_components FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_product_components"
  ON product_components FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON product_components TO authenticated;

-- ─── pricing_rules ───────────────────────────────────────────────────────────

CREATE POLICY "admin_select_pricing_rules"
  ON pricing_rules FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_insert_pricing_rules"
  ON pricing_rules FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_pricing_rules"
  ON pricing_rules FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_pricing_rules"
  ON pricing_rules FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_rules TO authenticated;

-- ─── colour_options (SELECT already granted in 024) ─────────────────────────

CREATE POLICY "admin_insert_colour_options"
  ON colour_options FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_colour_options"
  ON colour_options FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_colour_options"
  ON colour_options FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT INSERT, UPDATE, DELETE ON colour_options TO authenticated;

-- ─── Engine tables: write policies for admin ─────────────────────────────────
-- SELECT already granted to authenticated in migrations 021 + 012 + 013.

-- rule_sets
CREATE POLICY "admin_insert_rule_sets"
  ON rule_sets FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_rule_sets"
  ON rule_sets FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_rule_sets"
  ON rule_sets FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT INSERT, UPDATE, DELETE ON rule_sets TO authenticated;

-- rule_versions
CREATE POLICY "admin_insert_rule_versions"
  ON rule_versions FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_rule_versions"
  ON rule_versions FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_rule_versions"
  ON rule_versions FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT INSERT, UPDATE, DELETE ON rule_versions TO authenticated;

-- product_rules
CREATE POLICY "admin_insert_product_rules"
  ON product_rules FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_product_rules"
  ON product_rules FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_product_rules"
  ON product_rules FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT INSERT, UPDATE, DELETE ON product_rules TO authenticated;

-- product_constraints
CREATE POLICY "admin_insert_product_constraints"
  ON product_constraints FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_product_constraints"
  ON product_constraints FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_product_constraints"
  ON product_constraints FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT INSERT, UPDATE, DELETE ON product_constraints TO authenticated;

-- product_variables (GRANT SELECT already in 012)
CREATE POLICY "admin_insert_product_variables"
  ON product_variables FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_product_variables"
  ON product_variables FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_product_variables"
  ON product_variables FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT INSERT, UPDATE, DELETE ON product_variables TO authenticated;

-- product_validations
CREATE POLICY "admin_insert_product_validations"
  ON product_validations FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_product_validations"
  ON product_validations FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_product_validations"
  ON product_validations FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT INSERT, UPDATE, DELETE ON product_validations TO authenticated;

-- product_component_selectors (GRANT SELECT already in 013)
CREATE POLICY "admin_insert_product_component_selectors"
  ON product_component_selectors FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_product_component_selectors"
  ON product_component_selectors FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_product_component_selectors"
  ON product_component_selectors FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT INSERT, UPDATE, DELETE ON product_component_selectors TO authenticated;

-- product_companion_rules
CREATE POLICY "admin_insert_product_companion_rules"
  ON product_companion_rules FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_product_companion_rules"
  ON product_companion_rules FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_product_companion_rules"
  ON product_companion_rules FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT INSERT, UPDATE, DELETE ON product_companion_rules TO authenticated;

-- product_warnings
CREATE POLICY "admin_insert_product_warnings"
  ON product_warnings FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_product_warnings"
  ON product_warnings FOR UPDATE TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_product_warnings"
  ON product_warnings FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT INSERT, UPDATE, DELETE ON product_warnings TO authenticated;
