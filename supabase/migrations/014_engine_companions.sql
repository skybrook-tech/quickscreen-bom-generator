-- 014_engine_companions.sql
--
-- v3 engine: product_companion_rules and product_warnings.
-- product_companion_rules: auto-add rules — "X triggers Y" (e.g. CFC per side frame,
--                          spacers by gap, hinges per gate).
-- product_warnings:        non-blocking reviewer warnings and blocking engine errors.
--
-- No RLS — service role only.

-- ─── product_companion_rules ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_companion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  trigger_category TEXT NOT NULL,
  trigger_match_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  add_category TEXT NOT NULL,
  add_sku_pattern TEXT NOT NULL,
  qty_formula TEXT NOT NULL,
  is_pack BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_companion_rules_trigger
  ON product_companion_rules (product_id, trigger_category, priority) WHERE active;

CREATE TRIGGER trg_product_companion_rules_updated_at
  BEFORE UPDATE ON product_companion_rules
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── product_warnings ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warning_key TEXT NOT NULL,
  severity TEXT NOT NULL,
  condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_warnings_product
  ON product_warnings (product_id, severity) WHERE active;

CREATE TRIGGER trg_product_warnings_updated_at
  BEFORE UPDATE ON product_warnings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
