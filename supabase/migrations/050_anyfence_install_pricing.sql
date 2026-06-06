-- ============================================================================
-- 050_anyfence_install_pricing.sql
--
-- Install and pricing modifications for AnyFence platform:
-- 1. Add installs_enabled and postcodes_serviced to suppliers.
-- 2. Add postcodes_serviced to profiles.
-- 3. Create pricing_tiers table.
-- 4. Create contractor_install_rates table.
-- 5. Add installation_cost and video_attachment_url to quotes.
-- ============================================================================

-- 1. Add installs_enabled and postcodes_serviced to suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS installs_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS postcodes_serviced TEXT[];

-- 2. Add postcodes_serviced to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS postcodes_serviced TEXT[];

-- 3. Create pricing_tiers table
CREATE TABLE pricing_tiers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id                 UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  tier_name                   VARCHAR(255) NOT NULL,
  default_discount_percentage NUMERIC NOT NULL DEFAULT 0,
  product_category_discounts  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create contractor_install_rates table
CREATE TABLE contractor_install_rates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calculator_id            UUID NOT NULL REFERENCES system_instances(id) ON DELETE CASCADE,
  rate_per_meter           NUMERIC NOT NULL DEFAULT 0,
  rate_per_item            JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_markup_percentage NUMERIC NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Add installation_cost and video_attachment_url to quotes
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS installation_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS video_attachment_url TEXT;

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_install_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_tiers
CREATE POLICY "pricing_tiers_read" ON pricing_tiers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "pricing_tiers_write_admin" ON pricing_tiers
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies for contractor_install_rates
CREATE POLICY "contractor_install_rates_read" ON contractor_install_rates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "contractor_install_rates_write_own_or_admin" ON contractor_install_rates
  FOR ALL TO authenticated
  USING (contractor_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK (contractor_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Grants on new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contractor_install_rates TO authenticated;

-- Triggers for updated_at
CREATE TRIGGER trigger_pricing_tiers_updated_at
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trigger_contractor_install_rates_updated_at
  BEFORE UPDATE ON contractor_install_rates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
