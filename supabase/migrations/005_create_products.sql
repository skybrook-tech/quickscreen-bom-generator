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

-- Seed the four fence systems and the gate product for the Glass Outlet org
INSERT INTO products (org_id, name, system_type, description)
SELECT
  o.id,
  vals.name,
  vals.system_type,
  vals.description
FROM organisations o
CROSS JOIN (VALUES
  ('QSHS Horizontal Slat Screen', 'QSHS', 'Standard horizontal slat system. Slats run horizontally, inserted into slotted posts.'),
  ('VS Vertical Slat Screen',     'VS',   'Vertical slat orientation. Slats insert into top and bottom rails.'),
  ('XPL XPress Plus Premium',     'XPL',  '65mm slats only (forced). Insert/clip system with different bracket requirements.'),
  ('BAYG Buy As You Go',          'BAYG', 'Spacers sold separately. Customer assembles themselves.'),
  ('Gate',                        'GATE', 'Swing and sliding gate products.')
) AS vals(name, system_type, description)
WHERE o.slug = 'glass-outlet';
