-- Add calculator_theme to organisations so tenants can choose a UI theme.
-- Grant authenticated SELECT so ProfileContext can join and read it client-side.

ALTER TABLE organisations ADD COLUMN IF NOT EXISTS calculator_theme TEXT DEFAULT NULL;

GRANT SELECT ON organisations TO authenticated;
