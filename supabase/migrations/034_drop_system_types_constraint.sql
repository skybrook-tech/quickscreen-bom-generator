-- 034_drop_system_types_constraint.sql
-- (ported from fork migration 047, renumbered for main — salvage Phase A)
--
-- Drop the obsolete chk_system_types_values check constraint on product_components
-- to allow onboarding of multi-supplier systems (e.g. AF_CHAINWIRE, DF_CCA_PAL, etc.)
-- with their respective custom system types.

ALTER TABLE product_components
  DROP CONSTRAINT IF EXISTS chk_system_types_values;
