-- 019_add_admin_role.sql
--
-- Adds 'admin' value to the user_role enum (creating the type if it does not exist),
-- then adds a role column to profiles.
--
-- The seeded admin@glass-outlet.com user must be promoted via:
--   UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@glass-outlet.com');
-- (handled in supabase/seeds/seed-auth.js)
--
-- Trace gating in bom-calculator reads profiles.role = 'admin' to decide whether
-- to include the full trace[] and computed{} in the response.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'staff', 'admin');
  ELSE
    -- Add admin if not already present (safe on repeated runs)
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
  END IF;
END $$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user';
