-- 008_restructure_schema.sql
--
-- Restructure products, product_components, and product_pricing tables.
--
-- Changes:
--   products:           add parent_id (variant support), sort_order
--   product_components: add description, unit, default_price, updated_at;
--                       drop colours (encoded in SKU), sizes (encoded in SKU)
--   product_pricing:    rename → pricing_rules; restructure to rule-based pricing
--                       (component_id FK, tier_code, math.js rule expression, price, priority)
--   pricing_rules_with_sku: new view for edge function sku-based lookups

BEGIN;

-- ─── 1. products — variant support ───────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN parent_id  UUID REFERENCES products(id) ON DELETE RESTRICT,
  ADD COLUMN sort_order INT  NOT NULL DEFAULT 0;

-- Drop old flat unique constraint (one system_type per org)
ALTER TABLE products DROP CONSTRAINT products_org_id_system_type_key;

-- Root products: one per (org, system_type) among root products (parent_id IS NULL).
-- NULL != NULL in Postgres indexes, so this partial index only applies to root rows.
CREATE UNIQUE INDEX uq_products_root
  ON products (org_id, system_type)
  WHERE parent_id IS NULL;

-- Variants: one per (parent, system_type) within each parent product.
-- Two different root products can each have a GATE variant — they don't conflict
-- because they have different parent_ids.
CREATE UNIQUE INDEX uq_products_variant
  ON products (parent_id, system_type)
  WHERE parent_id IS NOT NULL;

-- Trigger: parent must belong to the same org
CREATE OR REPLACE FUNCTION check_product_parent_org()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM products WHERE id = NEW.parent_id AND org_id = NEW.org_id
    ) THEN
      RAISE EXCEPTION 'Parent product must belong to the same organisation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_parent_org
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION check_product_parent_org();

-- ─── 2. product_components — single source of truth for SKU data ─────────────

ALTER TABLE product_components
  ADD COLUMN description   TEXT,
  ADD COLUMN unit          TEXT NOT NULL DEFAULT 'each',
  ADD COLUMN default_price NUMERIC(10,2),
  ADD COLUMN updated_at    TIMESTAMPTZ DEFAULT NOW();

-- Colour variants and sizes are encoded in the SKU itself (e.g. XP-6100-S65-B).
-- Each colour/size combination is its own distinct component with its own SKU.
ALTER TABLE product_components
  DROP COLUMN colours,
  DROP COLUMN sizes;

-- Auto-update trigger on product_components
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_components_updated_at
  BEFORE UPDATE ON product_components
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- GIN index for system_types[] array queries
CREATE INDEX idx_product_components_system_types
  ON product_components USING GIN (system_types);

-- Enforce valid system_type values in the array
ALTER TABLE product_components
  ADD CONSTRAINT chk_system_types_values
  CHECK (system_types <@ ARRAY['QSHS','VS','XPL','BAYG','GATE']::TEXT[]);

-- Backfill product_components from product_pricing (which currently has all SKU data).
-- product_components is empty; product_pricing is the authoritative source.
-- system_types is inferred from category/SKU prefix — refine via admin UI as needed.
INSERT INTO product_components (
  org_id, sku, name, description, category, unit, default_price, system_types, metadata, active
)
SELECT
  pp.org_id,
  pp.sku,
  pp.description,
  pp.description,
  pp.category,
  pp.unit,
  pp.tier1_price,
  CASE
    WHEN pp.category IN ('gate', 'hardware') THEN ARRAY['GATE']::TEXT[]
    WHEN pp.sku LIKE 'XPL-%'                THEN ARRAY['BAYG']::TEXT[]
    ELSE ARRAY['QSHS']::TEXT[]
  END,
  '{}'::JSONB,
  pp.active
FROM product_pricing pp
ON CONFLICT (org_id, sku) DO UPDATE
  SET description   = EXCLUDED.description,
      unit          = EXCLUDED.unit,
      default_price = EXCLUDED.default_price,
      updated_at    = NOW();

-- ─── 3. Rename product_pricing → pricing_rules and restructure ───────────────

ALTER TABLE product_pricing RENAME TO pricing_rules;

-- Add new columns (NULLable first so we can backfill before adding NOT NULL)
ALTER TABLE pricing_rules
  ADD COLUMN component_id UUID REFERENCES product_components(id) ON DELETE CASCADE,
  ADD COLUMN tier_code    TEXT CHECK (tier_code IN ('tier1','tier2','tier3')),
  ADD COLUMN rule         TEXT,          -- math.js expression; NULL = always applies
  ADD COLUMN price        NUMERIC(10,2),
  ADD COLUMN priority     INT NOT NULL DEFAULT 0,
  ADD COLUMN valid_from   DATE,
  ADD COLUMN valid_to     DATE,
  ADD COLUMN notes        TEXT;

-- Backfill component_id from the sku match
UPDATE pricing_rules pr
SET component_id = pc.id
FROM product_components pc
WHERE pc.org_id = pr.org_id
  AND pc.sku    = pr.sku;

-- Expand each existing row (covering all 3 tiers) into 3 per-tier rows.
-- Step A: insert tier2 copies of every current (unconverted) row
INSERT INTO pricing_rules (
  org_id, sku, description, category, unit, active, updated_at,
  component_id, tier_code, price, priority
)
SELECT
  org_id, sku, description, category, unit, active, NOW(),
  component_id, 'tier2', tier2_price, 0
FROM pricing_rules
WHERE tier_code IS NULL;

-- Step B: insert tier3 copies
INSERT INTO pricing_rules (
  org_id, sku, description, category, unit, active, updated_at,
  component_id, tier_code, price, priority
)
SELECT
  org_id, sku, description, category, unit, active, NOW(),
  component_id, 'tier3', tier3_price, 0
FROM pricing_rules
WHERE tier_code IS NULL;

-- Step C: convert the original rows to tier1
UPDATE pricing_rules
SET tier_code = 'tier1',
    price     = tier1_price
WHERE tier_code IS NULL;

-- Drop old tier columns and columns now consolidated into product_components
ALTER TABLE pricing_rules
  DROP COLUMN tier1_price,
  DROP COLUMN tier2_price,
  DROP COLUMN tier3_price,
  DROP COLUMN description,
  DROP COLUMN category,
  DROP COLUMN unit;

-- Drop the old unique constraint before dropping sku
ALTER TABLE pricing_rules DROP CONSTRAINT product_pricing_org_id_sku_key;

-- Drop sku — component_id FK is the canonical reference; sku is derived via view
ALTER TABLE pricing_rules DROP COLUMN sku;

-- Add NOT NULL constraints now that all rows are backfilled
ALTER TABLE pricing_rules
  ALTER COLUMN component_id SET NOT NULL,
  ALTER COLUMN tier_code     SET NOT NULL,
  ALTER COLUMN price         SET NOT NULL;

-- Unique: one active rule per (component, tier, priority level)
CREATE UNIQUE INDEX uq_pricing_rules_component_tier_priority
  ON pricing_rules (component_id, tier_code, priority)
  WHERE active = TRUE;

-- Hot-path lookup index: find rules by (org, component, tier)
CREATE INDEX idx_pricing_rules_lookup
  ON pricing_rules (org_id, component_id, tier_code)
  WHERE active = TRUE;

-- Auto-update trigger for pricing_rules
CREATE TRIGGER trg_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Keep service-role-only access
REVOKE ALL ON pricing_rules FROM anon, authenticated;

-- ─── 4. View for sku-based lookups (used by edge functions) ──────────────────
-- Edge functions still look up pricing by SKU. The view provides this join
-- transparently, allowing edge function queries to remain sku-centric.

CREATE OR REPLACE VIEW pricing_rules_with_sku AS
SELECT
  pr.id,
  pr.org_id,
  pr.component_id,
  pc.sku,
  pr.tier_code,
  pr.rule,
  pr.price,
  pr.priority,
  pr.valid_from,
  pr.valid_to,
  pr.active,
  pr.updated_at
FROM pricing_rules pr
JOIN product_components pc ON pc.id = pr.component_id;

-- Keep service-role-only access on the view too
REVOKE ALL ON pricing_rules_with_sku FROM anon, authenticated;

COMMIT;
