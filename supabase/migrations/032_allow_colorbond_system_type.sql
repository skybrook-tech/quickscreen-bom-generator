-- Allow COLORBOND in product_components.system_types.
-- The original constraint (migration 008) predates the Colorbond steel-fencing
-- product; its components are now consolidated in
-- supabase/seeds/glass-outlet/products/colorbond.json tagged system_types
-- = ['COLORBOND']. Extend the allowed set to match.

ALTER TABLE product_components
  DROP CONSTRAINT IF EXISTS chk_system_types_values;

ALTER TABLE product_components
  ADD CONSTRAINT chk_system_types_values
  CHECK (system_types <@ ARRAY['QSHS','VS','XPL','BAYG','GATE','COLORBOND']::TEXT[]);
