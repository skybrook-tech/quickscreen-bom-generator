-- ============================================================================
-- 055_generic_calculators_and_vetting.sql
--
-- Enables generic calculators by making system_instances.supplier_id nullable.
-- Adds canonical_code mappings to components and pricing rules.
-- Adds AI vetting columns, public library flag, and new products indicator.
-- ============================================================================

-- 1. Enable Generic Calculators
ALTER TABLE system_instances ALTER COLUMN supplier_id DROP NOT NULL;

-- 2. Enforce Canonical Names for Dynamic Supplier Mapping
ALTER TABLE product_components ADD COLUMN IF NOT EXISTS canonical_code TEXT;
ALTER TABLE pricing_rules      ADD COLUMN IF NOT EXISTS canonical_code TEXT;

CREATE INDEX IF NOT EXISTS idx_product_components_canonical 
  ON product_components(canonical_code) 
  WHERE canonical_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_rules_canonical 
  ON pricing_rules(canonical_code) 
  WHERE canonical_code IS NOT NULL;

-- 3. AnyFence AI-Assisted Vetting & Approval Columns
ALTER TABLE system_instances 
  ADD COLUMN IF NOT EXISTS ai_vetting_status TEXT CHECK (ai_vetting_status IN ('pending', 'passed', 'failed', 'skipped')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ai_vetting_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_public_library BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_system_instances_vetting 
  ON system_instances(ai_vetting_status);

CREATE INDEX IF NOT EXISTS idx_system_instances_public_lib 
  ON system_instances(is_public_library) 
  WHERE is_public_library = TRUE;

-- 4. New Products Calculator Section
ALTER TABLE system_instances 
  ADD COLUMN IF NOT EXISTS is_new_product BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_system_instances_new_prod 
  ON system_instances(is_new_product) 
  WHERE is_new_product = TRUE;

-- 5. Backfill Pre-existing System Instances
-- Set existing platform / verified Glass Outlet instances to passed and public library.
UPDATE system_instances 
SET is_public_library = TRUE, 
    ai_vetting_status = 'passed', 
    ai_vetting_notes = 'Pre-existing platform system instance.'
WHERE supplier_id = (SELECT id FROM suppliers WHERE slug = 'glass-outlet');
