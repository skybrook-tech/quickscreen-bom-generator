-- ============================================================================
-- 036_update_pricing_rules_view.sql  (salvage Phase A)
--
-- Recreates the pricing_rules_with_sku view to carry the multi-supplier columns.
--
-- This SQUASHES fork migrations 049 (added supplier_id + system_instance_id) and
-- 056 (added canonical_code) into a single deliberate migration that produces
-- the final view shape directly, rather than replaying the fork's two-step churn.
--
-- The view stays service-role-only (REVOKE from anon, authenticated) — it is read
-- by the bom-calculator / calculate-pricing edge functions via the service role
-- key. Adding supplier_id / system_instance_id / canonical_code here lets the
-- edge functions resolve prices per supplier and per canonical code without a
-- second round-trip.
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

-- Revoke all direct public access — service role only.
REVOKE ALL ON public.pricing_rules_with_sku FROM anon, authenticated;
