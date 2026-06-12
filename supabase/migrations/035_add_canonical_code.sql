-- ============================================================================
-- 035_add_canonical_code.sql  (salvage Phase A)
--
-- Adds the canonical_code column to product_components and pricing_rules.
--
-- Provenance: in the fork, these two columns were introduced by migration
-- 055_generic_calculators_and_vetting.sql. That migration is on the salvage
-- KILL LIST (community publication / vetting is Phase 3 scope and is NOT being
-- ported). The ONLY piece of 055 that the Phase A take-list depends on is the
-- canonical_code column — it is referenced by the pricing_rules_with_sku view
-- (036) and written by the seed upserter. We extract just those two column-adds
-- here and leave the vetting tables behind.
--
-- canonical_code is a cross-supplier normalised SKU/identifier used so the same
-- physical component across different suppliers can be matched in the Phase 2
-- pricing database. Nullable; populated from seed JSON where present.
-- ============================================================================

ALTER TABLE product_components ADD COLUMN IF NOT EXISTS canonical_code TEXT;
ALTER TABLE pricing_rules      ADD COLUMN IF NOT EXISTS canonical_code TEXT;
