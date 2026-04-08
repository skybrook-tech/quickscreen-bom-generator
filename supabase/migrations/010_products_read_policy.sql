-- 010_products_read_policy.sql
--
-- Grants authenticated users read access to their org's products.
-- Products contain only names, descriptions, image_url, active status —
-- no pricing data — so it is safe to expose via RLS to the client.

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select_own_org ON products
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON products TO authenticated;
