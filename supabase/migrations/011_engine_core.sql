-- 011_engine_core.sql
--
-- v3 engine: rule_sets and rule_versions tables.
-- These are the versioned rule containers per product.
-- The engine reads the rule_version with is_current = true for each rule_set.
-- No RLS — accessed via service role only.

CREATE TABLE IF NOT EXISTS rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  rule_set_id UUID NOT NULL REFERENCES rule_sets(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  effective_from DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce exactly one current version per rule_set
CREATE UNIQUE INDEX IF NOT EXISTS rule_versions_one_current_per_set
  ON rule_versions (rule_set_id) WHERE is_current;

CREATE INDEX IF NOT EXISTS rule_sets_org_product
  ON rule_sets (org_id, product_id);

-- Auto-update triggers
CREATE TRIGGER trg_rule_sets_updated_at
  BEFORE UPDATE ON rule_sets
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_rule_versions_updated_at
  BEFORE UPDATE ON rule_versions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
