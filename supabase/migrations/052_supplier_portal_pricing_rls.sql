-- ============================================================================
-- 052_supplier_portal_pricing_rls.sql
-- ============================================================================

DROP POLICY IF EXISTS "supplier_select_product_components" ON product_components;
DROP POLICY IF EXISTS "supplier_select_pricing_rules" ON pricing_rules;

-- 1. Create policy for product_components to allow users in the same organisation to read components
CREATE POLICY "supplier_select_product_components"
  ON product_components FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

-- 2. Create policy for pricing_rules to allow users in the same organisation to read pricing rules
CREATE POLICY "supplier_select_pricing_rules"
  ON pricing_rules FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());
