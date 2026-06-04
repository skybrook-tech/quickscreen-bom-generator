-- ============================================================================
-- 056_update_pricing_rules_with_sku_canonical.sql
--
-- Recreates the pricing_rules_with_sku view to include the canonical_code column
-- (resolving from pricing_rules or falling back to product_components).
-- ============================================================================

DROP VIEW IF EXISTS public.pricing_rules_with_sku;

CREATE VIEW public.pricing_rules_with_sku AS
SELECT
  pr.id,
  pr.org_id,
  pr.supplier_id,
  pr.system_instance_id,
  pr.component_id,
  pc.sku,
  pr.tier_code,
  pr.rule,
  pr.price,
  pr.priority,
  pr.valid_from,
  pr.valid_to,
  pr.active,
  pr.updated_at,
  COALESCE(pr.canonical_code, pc.canonical_code) AS canonical_code
FROM public.pricing_rules pr
JOIN public.product_components pc ON pc.id = pr.component_id;

-- Revoke all direct public access
REVOKE ALL ON public.pricing_rules_with_sku FROM anon, authenticated;
