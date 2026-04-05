-- 005_create_products.sql
-- Top-level product catalog: the fence systems and gate products that customers buy.
-- Each row represents a sellable system (QSHS, XPL, VS, BAYG) or gate type.
-- Individual hardware components that make up these products live in product_components.
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id),
  name TEXT NOT NULL,            -- e.g. 'QSHS Horizontal Slat Fence'
  system_type TEXT NOT NULL,     -- 'QSHS' | 'VS' | 'XPL' | 'BAYG' | 'GATE'
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::JSONB,
  UNIQUE (org_id, system_type)
);

-- NO RLS — only accessed by edge functions via service role key.
REVOKE ALL ON products FROM anon, authenticated;
