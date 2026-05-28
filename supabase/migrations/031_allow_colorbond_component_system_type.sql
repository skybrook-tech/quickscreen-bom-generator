ALTER TABLE product_components
  DROP CONSTRAINT IF EXISTS chk_system_types_values;

ALTER TABLE product_components
  ADD CONSTRAINT chk_system_types_values
  CHECK (system_types <@ ARRAY['QSHS','VS','XPL','BAYG','COLORBOND','GATE']::TEXT[]);
