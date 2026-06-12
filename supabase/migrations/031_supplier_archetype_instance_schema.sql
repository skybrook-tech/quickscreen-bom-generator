-- ============================================================================
-- 031_supplier_archetype_instance_schema.sql
-- (ported from fork migration 032, renumbered for main — salvage Phase A)
--
-- Adds the three-tier identity model (supplier / archetype / instance) for the
-- multi-supplier platform rollout. See docs/system-authoring-process.md for the
-- full design. Reuses existing patterns:
--   - admin check: (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
--   - org lookup:  public.user_org_id()  (from migration 002)
--   - updated_at trigger: public.set_updated_at()  (from migration 008)
--   - UUID generation: gen_random_uuid()  (pgcrypto already enabled)
-- ============================================================================

-- ─── Suppliers ──────────────────────────────────────────────────────────────
-- Lightweight, growable. Can be platform-owned, verified-supplier-owned, or
-- user-created. Carried on every catalogue entity.
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  logo_url      TEXT,
  brand_colour  TEXT,
  contact_email TEXT,
  trust_tier    TEXT NOT NULL DEFAULT 'user'
                CHECK (trust_tier IN ('platform','verified','community','user')),
  authored_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  org_id        UUID REFERENCES organisations(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','hidden','draft','discontinued')),
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_slug ON suppliers(slug);
CREATE INDEX idx_suppliers_trust_tier ON suppliers(trust_tier);
CREATE INDEX idx_suppliers_org ON suppliers(org_id) WHERE org_id IS NOT NULL;

-- ─── System archetypes ──────────────────────────────────────────────────────
-- Abstract patterns shared across suppliers (slat-fence, panel-fence, etc.).
-- Controlled vocabulary. Admin-managed.
CREATE TABLE system_archetypes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  family             TEXT NOT NULL
                     CHECK (family IN ('fence','gate','pool-fence','balustrade','screen','enclosure','shower','other')),
  geometry_module    TEXT NOT NULL,  -- name of the canvas geometry adapter, e.g. 'fence_runs_v1'
  variable_schema    JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule_template_ids  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  description        TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','hidden','draft')),
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_archetypes_family ON system_archetypes(family);
CREATE INDEX idx_archetypes_status ON system_archetypes(status);

-- ─── System instances ───────────────────────────────────────────────────────
-- supplier × archetype + supplier-specific config. What users actually pick
-- in the calculator picker.
CREATE TABLE system_instances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id      UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  archetype_id    UUID NOT NULL REFERENCES system_archetypes(id) ON DELETE RESTRICT,
  slug             TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','active','hidden','discontinued')),
  readiness_status TEXT NOT NULL DEFAULT 'draft'
                   CHECK (readiness_status IN ('draft','imported','calculator_ready','price_checked','spreadsheet_tested','approved')),
  trust_tier       TEXT NOT NULL DEFAULT 'user'
                   CHECK (trust_tier IN ('platform','verified','community','user')),
  visibility       TEXT NOT NULL DEFAULT 'private'
                   CHECK (visibility IN ('private','org_shared','public')),
  authored_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  org_id           UUID REFERENCES organisations(id) ON DELETE SET NULL,
  approved_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  readiness_notes  TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, slug)
);

CREATE INDEX idx_system_instances_supplier   ON system_instances(supplier_id);
CREATE INDEX idx_system_instances_archetype  ON system_instances(archetype_id);
CREATE INDEX idx_system_instances_status     ON system_instances(status);
CREATE INDEX idx_system_instances_visibility ON system_instances(visibility);
CREATE INDEX idx_system_instances_readiness  ON system_instances(readiness_status);
CREATE INDEX idx_system_instances_authored   ON system_instances(authored_by) WHERE authored_by IS NOT NULL;
CREATE INDEX idx_system_instances_org        ON system_instances(org_id) WHERE org_id IS NOT NULL;

-- ─── System instance grants (B2B sharing) ──────────────────────────────────
-- Lets an admin grant a specific system_instance to another org.
CREATE TABLE system_instance_grants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_instance_id UUID NOT NULL REFERENCES system_instances(id) ON DELETE CASCADE,
  org_id             UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  granted_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  granted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (system_instance_id, org_id)
);

CREATE INDEX idx_instance_grants_instance ON system_instance_grants(system_instance_id);
CREATE INDEX idx_instance_grants_org      ON system_instance_grants(org_id);

-- ─── System instance reports (community moderation) ────────────────────────
-- Quality reports on community-tier content. Used by brief 041 for demotion.
CREATE TABLE system_instance_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_instance_id UUID NOT NULL REFERENCES system_instances(id) ON DELETE CASCADE,
  reported_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason             TEXT NOT NULL,
  details            TEXT,
  status             TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','reviewing','resolved','dismissed')),
  resolved_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at        TIMESTAMPTZ,
  resolution_note    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instance_reports_instance ON system_instance_reports(system_instance_id);
CREATE INDEX idx_instance_reports_status   ON system_instance_reports(status);

-- ─── Provenance columns on existing v3 catalogue tables ────────────────────
-- ALL new columns nullable initially. Brief 033 backfills them.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_id        UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS authored_by        UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_supplier
  ON products(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_system_instance
  ON products(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE product_components
  ADD COLUMN IF NOT EXISTS supplier_id        UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_components_supplier
  ON product_components(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_components_system_instance
  ON product_components(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE product_variables
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_variables_system_instance
  ON product_variables(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE product_rules
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_rules_system_instance
  ON product_rules(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE product_component_selectors
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_component_selectors_system_instance
  ON product_component_selectors(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE product_companion_rules
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_companion_rules_system_instance
  ON product_companion_rules(system_instance_id) WHERE system_instance_id IS NOT NULL;

ALTER TABLE pricing_rules
  ADD COLUMN IF NOT EXISTS supplier_id        UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS system_instance_id UUID REFERENCES system_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_rules_supplier
  ON pricing_rules(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_rules_system_instance
  ON pricing_rules(system_instance_id) WHERE system_instance_id IS NOT NULL;

-- ─── updated_at triggers ────────────────────────────────────────────────────
-- public.touch_updated_at() already exists from migration 008. Reuse exactly.
CREATE TRIGGER trigger_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trigger_system_archetypes_updated_at
  BEFORE UPDATE ON system_archetypes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trigger_system_instances_updated_at
  BEFORE UPDATE ON system_instances
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_archetypes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_instances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_instance_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_instance_reports ENABLE ROW LEVEL SECURITY;

-- Suppliers: platform + verified + community visible to everyone; user-tier
-- visible only to author or same org. Admin can do anything.
CREATE POLICY "suppliers_read" ON suppliers FOR SELECT TO authenticated
  USING (
    trust_tier IN ('platform','verified','community')
    OR authored_by = auth.uid()
    OR org_id = public.user_org_id()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (authored_by IS NULL OR authored_by = auth.uid())
  );

CREATE POLICY "suppliers_update_author" ON suppliers FOR UPDATE TO authenticated
  USING (authored_by = auth.uid())
  WITH CHECK (authored_by = auth.uid());

CREATE POLICY "suppliers_update_admin" ON suppliers FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "suppliers_delete_admin" ON suppliers FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON suppliers TO authenticated;

-- Archetypes: controlled vocab. Read open to all authenticated; write admin-only.
CREATE POLICY "archetypes_read" ON system_archetypes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "archetypes_insert_admin" ON system_archetypes FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "archetypes_update_admin" ON system_archetypes FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "archetypes_delete_admin" ON system_archetypes FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON system_archetypes TO authenticated;

-- System instances: visibility-aware read; author or admin write.
CREATE POLICY "system_instances_read" ON system_instances FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR (visibility = 'org_shared' AND id IN (
        SELECT system_instance_id FROM system_instance_grants WHERE org_id = public.user_org_id()
    ))
    OR org_id = public.user_org_id()
    OR authored_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "system_instances_insert" ON system_instances FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (authored_by IS NULL OR authored_by = auth.uid())
  );

CREATE POLICY "system_instances_update_author" ON system_instances FOR UPDATE TO authenticated
  USING (authored_by = auth.uid())
  WITH CHECK (authored_by = auth.uid());

CREATE POLICY "system_instances_update_admin" ON system_instances FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "system_instances_delete_admin" ON system_instances FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON system_instances TO authenticated;

-- Grants: read by org members or admin; write admin-only.
CREATE POLICY "instance_grants_read" ON system_instance_grants FOR SELECT TO authenticated
  USING (
    org_id = public.user_org_id()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "instance_grants_write_admin" ON system_instance_grants FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON system_instance_grants TO authenticated;

-- Reports: reporter sees own; admin sees all; any authenticated can file.
CREATE POLICY "instance_reports_read" ON system_instance_reports FOR SELECT TO authenticated
  USING (
    reported_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "instance_reports_insert" ON system_instance_reports FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (reported_by IS NULL OR reported_by = auth.uid())
  );

CREATE POLICY "instance_reports_update_admin" ON system_instance_reports FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE ON system_instance_reports TO authenticated;