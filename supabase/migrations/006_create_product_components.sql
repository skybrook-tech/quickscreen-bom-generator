-- 006_create_product_components.sql
-- Component catalog: the individual hardware SKUs (slats, posts, rails, brackets,
-- screws, hinges, latches, etc.) that are assembled into a product.
-- SKUs in this table correspond directly to SKUs in product_pricing.
CREATE TABLE product_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,                           -- post, rail, slat, bracket, screw, gate, hardware, accessory
  system_types TEXT[] DEFAULT ARRAY['QSHS'],        -- which products this component belongs to
  colours TEXT[],                                   -- available colour variants (NULL = colour-agnostic)
  sizes JSONB,                                      -- size specs (varies by category)
  metadata JSONB DEFAULT '{}'::JSONB,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE (org_id, sku)
);

-- NO RLS — only accessed by edge functions via service role key.
REVOKE ALL ON product_components FROM anon, authenticated;
