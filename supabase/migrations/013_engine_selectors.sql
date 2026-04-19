-- 013_engine_selectors.sql
--
-- v3 engine: product_component_selectors.
-- Maps match_json conditions → sku_pattern for component resolution.
-- Supports {colour}/{finish}/{frame_cap_size} placeholders in sku_pattern.
-- First match by priority wins.
--
-- RLS: authenticated SELECT (client may need selectors for UI hints).

CREATE TABLE IF NOT EXISTS product_component_selectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  selector_key TEXT NOT NULL,
  component_category TEXT NOT NULL,
  selector_type TEXT NOT NULL,
  match_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sku_pattern TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_component_selectors_lookup
  ON product_component_selectors (product_id, component_category, priority) WHERE active;

CREATE TRIGGER trg_product_component_selectors_updated_at
  BEFORE UPDATE ON product_component_selectors
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- RLS: authenticated SELECT
ALTER TABLE product_component_selectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_product_component_selectors"
  ON product_component_selectors FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON product_component_selectors TO authenticated;
