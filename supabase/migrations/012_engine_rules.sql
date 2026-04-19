-- 012_engine_rules.sql
--
-- v3 engine: product_rules, product_constraints, product_variables, product_validations.
-- product_rules:       stage-ordered math.js expressions evaluated by the engine pipeline.
-- product_constraints: min/max/threshold/enum bounds with conditional applies_when_json.
-- product_variables:   field definitions, defaults, options, scope (job/run/segment).
-- product_validations: blocking (severity=error) / non-blocking (severity=warning) checks.
--
-- RLS: product_variables has authenticated SELECT (client needs it to render forms).
--      All others are service role only.

-- ─── rule_stage enum ─────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rule_stage') THEN
    CREATE TYPE rule_stage AS ENUM ('derive', 'stock', 'accessory', 'component');
  END IF;
END $$;

-- ─── product_rules ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rule_set_id UUID NOT NULL REFERENCES rule_sets(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES rule_versions(id) ON DELETE CASCADE,
  stage rule_stage NOT NULL,
  name TEXT NOT NULL,
  expression TEXT NOT NULL,
  output_key TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_rules_execution
  ON product_rules (version_id, stage, priority) WHERE active;

CREATE TRIGGER trg_product_rules_updated_at
  BEFORE UPDATE ON product_rules
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── product_constraints ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  constraint_type TEXT NOT NULL,
  value_text TEXT NOT NULL,
  unit TEXT,
  severity TEXT NOT NULL,
  applies_when_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_constraints_product
  ON product_constraints (product_id) WHERE active;

CREATE TRIGGER trg_product_constraints_updated_at
  BEFORE UPDATE ON product_constraints
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── product_variables ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  data_type TEXT NOT NULL,
  unit TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  default_value_json JSONB,
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_variables_product
  ON product_variables (product_id, scope, sort_order) WHERE active;

CREATE TRIGGER trg_product_variables_updated_at
  BEFORE UPDATE ON product_variables
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- RLS: client reads product_variables to render schema-driven forms
ALTER TABLE product_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_product_variables"
  ON product_variables FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON product_variables TO authenticated;

-- ─── product_validations ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  expression TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_validations_product
  ON product_validations (product_id) WHERE active;

CREATE TRIGGER trg_product_validations_updated_at
  BEFORE UPDATE ON product_validations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
