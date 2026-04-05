-- 001_create_organisations.sql
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,               -- URL-friendly identifier e.g. 'glass-outlet'
  logo_url TEXT,
  branding JSONB DEFAULT '{}'::JSONB,      -- v2: colours, fonts, etc.
  settings JSONB DEFAULT '{}'::JSONB,      -- v2: feature flags, defaults
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS on organisations — it's read by the helper function below using SECURITY DEFINER.
-- Direct client access is gated through profiles.

