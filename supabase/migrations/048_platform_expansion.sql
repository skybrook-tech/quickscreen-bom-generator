-- ============================================================================
-- 048_platform_expansion.sql
--
-- Extends the multi-supplier database schema to support custom branding,
-- contractor portals, user type scoping, cloned system tracking, and public/anon RLS.
-- ============================================================================

-- ─── 1. Organisations & Profiles Scoping ────────────────────────────────────

-- Add user_type column to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'contractor' 
  CHECK (user_type IN ('admin', 'supplier_staff', 'contractor', 'supplier_client'));

-- Add bunnings integration setting to organisations
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS bunnings_integration_enabled BOOLEAN DEFAULT FALSE;

-- Automatically set user_type = 'admin' for profile rows where role is 'admin'
UPDATE public.profiles 
SET user_type = 'admin' 
WHERE role = 'admin';

-- ─── 2. Suppliers Custom Branding ───────────────────────────────────────────

-- Add custom branding logo, banner, and style JSON overrides
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS custom_branding_logo TEXT,
  ADD COLUMN IF NOT EXISTS custom_branding_banner TEXT,
  ADD COLUMN IF NOT EXISTS custom_branding_styles JSONB DEFAULT '{}'::jsonb;

-- ─── 3. System Instances Cloned Tracking ────────────────────────────────────

-- Add self-referential foreign key for cloning tracking
ALTER TABLE public.system_instances
  ADD COLUMN IF NOT EXISTS calculator_cloned_from UUID REFERENCES public.system_instances(id) ON DELETE SET NULL;

-- ─── 4. Public RLS Policies (for anonymous supplier pages) ──────────────────

-- Suppress/drop existing restrict-to-authenticated policy if needed,
-- or add a public policy for suppliers select.
-- Let's check existing suppliers policies: they are restricted TO authenticated.
-- We want to allow public/anon SELECT for active platform/verified/community suppliers.
CREATE POLICY "suppliers_anon_read" ON public.suppliers FOR SELECT TO public
  USING (
    status = 'active'
    AND trust_tier IN ('platform', 'verified', 'community')
  );

-- System instances: allow public/anon SELECT for active public approved calculators.
CREATE POLICY "system_instances_anon_read" ON public.system_instances FOR SELECT TO public
  USING (
    status = 'active'
    AND visibility = 'public'
    AND readiness_status = 'approved'
  );

-- Allow public read of active products for public system instances
CREATE POLICY "products_anon_read" ON public.products FOR SELECT TO public
  USING (
    active = TRUE
    AND system_instance_id IN (
      SELECT id FROM public.system_instances WHERE status = 'active' AND visibility = 'public'
    )
  );

-- Allow public read of components and pricing for public system instances
CREATE POLICY "product_components_anon_read" ON public.product_components FOR SELECT TO public
  USING (
    active = TRUE
    AND system_instance_id IN (
      SELECT id FROM public.system_instances WHERE status = 'active' AND visibility = 'public'
    )
  );

CREATE POLICY "pricing_rules_anon_read" ON public.pricing_rules FOR SELECT TO public
  USING (
    system_instance_id IN (
      SELECT id FROM public.system_instances WHERE status = 'active' AND visibility = 'public'
    )
  );

CREATE POLICY "product_variables_anon_read" ON public.product_variables FOR SELECT TO public
  USING (
    system_instance_id IN (
      SELECT id FROM public.system_instances WHERE status = 'active' AND visibility = 'public'
    )
  );
