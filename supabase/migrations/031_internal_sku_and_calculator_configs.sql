-- Migration 031: Internal SKU column + supplier calculator config table
--
-- 1. `internal_sku` on `product_components`:
--    Allows a supplier to override which canonical internal SKU a component
--    maps to. When resolveInternalSku() is called, DB rows with an `internal_sku`
--    value take precedence over DEFAULT_INTERNAL_SKU_MAP.
--
-- 2. `supplier_product_calculator_configs`:
--    Stores sparse JSON overrides that get deep-merged over the base
--    CalculatorConfig for a given product code. Allows per-org config
--    (stock lengths, geometry constants, pack sizes, SKU templates, extra rules)
--    without code changes.

-- ── 1. internal_sku on product_components ────────────────────────────────────

ALTER TABLE product_components
  ADD COLUMN IF NOT EXISTS internal_sku text;

COMMENT ON COLUMN product_components.internal_sku IS
  'Canonical internal SKU key (e.g. SLAT.STD.65.B). '
  'When set, the bom-calculator-static engine resolves this component''s '
  'supplier SKU by matching internal_sku in resolveInternalSku(). '
  'Takes precedence over DEFAULT_INTERNAL_SKU_MAP for this org.';

CREATE INDEX IF NOT EXISTS idx_product_components_internal_sku
  ON product_components (org_id, internal_sku)
  WHERE internal_sku IS NOT NULL;

-- ── 2. supplier_product_calculator_configs ────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_product_calculator_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organisations (id) ON DELETE CASCADE,
  product_code text NOT NULL,    -- e.g. "QSHS", "BAYG", "VS", "XPL"
  config      jsonb NOT NULL DEFAULT '{}',  -- sparse patch over base CalculatorConfig
  is_current  boolean NOT NULL DEFAULT true,
  active      boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE supplier_product_calculator_configs IS
  'Per-org calculator config overrides. Each row is a sparse JSON patch over '
  'the base CalculatorConfig for the given product_code. Only is_current=true '
  'and active=true rows are loaded at runtime.';

COMMENT ON COLUMN supplier_product_calculator_configs.config IS
  'Sparse partial<CalculatorConfig>. Deep-merged over the base config. '
  'Only the keys you want to override need to be present. '
  'Arrays replace (not append) the base array. '
  'Example: {"stockLengths": {"slat": {"standard": 4000}}} '
  'overrides just the standard slat stock length to 4000mm.';

-- One current config per org+product (unenforced — application logic handles it)
CREATE INDEX IF NOT EXISTS idx_calc_configs_org_product
  ON supplier_product_calculator_configs (org_id, product_code, is_current)
  WHERE is_current = true AND active = true;

-- RLS: org-scoped via user_org_id() (no cross-tenant leakage).
-- Read: authenticated users in the org can read their own config.
-- Write: service role only (admin UI will use service role key).
ALTER TABLE supplier_product_calculator_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'supplier_product_calculator_configs'
      AND policyname = 'org_members_select'
  ) THEN
    CREATE POLICY org_members_select ON supplier_product_calculator_configs
      FOR SELECT
      TO authenticated
      USING (org_id = public.user_org_id());
  END IF;
END
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_calculator_configs()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_configs_updated_at ON supplier_product_calculator_configs;
CREATE TRIGGER trg_calc_configs_updated_at
  BEFORE UPDATE ON supplier_product_calculator_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_calculator_configs();
