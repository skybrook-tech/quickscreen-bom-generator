-- 004_create_pricing.sql
-- Pricing lives in DB so it can be updated without redeployment.
-- Edge functions read this table using the service role key.
-- SKUs correspond to SKUs in the product_components table.
-- Never exposed directly to the client.
CREATE TABLE product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id),
  sku TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'each',
  tier1_price NUMERIC(10,2) NOT NULL,
  tier2_price NUMERIC(10,2) NOT NULL,
  tier3_price NUMERIC(10,2) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, sku)                     -- SKUs unique per org, not globally
);

-- NO RLS — only accessed by edge functions via service role key.
REVOKE ALL ON product_pricing FROM anon, authenticated;
