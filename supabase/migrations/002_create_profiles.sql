-- 002_create_profiles.sql

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id),
  full_name TEXT,
  company TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  pricing_tier TEXT DEFAULT 'tier1' CHECK (pricing_tier IN ('tier1', 'tier2', 'tier3')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper function: resolve the calling user's org_id.
-- Defined after the table so PostgreSQL can validate the reference at creation time.
-- SECURITY DEFINER so it reads profiles regardless of RLS on that table.
-- Used by all RLS policies below and in subsequent migrations.
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins/owners can view all profiles in their org
CREATE POLICY "Org admins can view org profiles" ON profiles
  FOR SELECT USING (org_id = public.user_org_id());

-- Auto-create profile on signup.
-- Defaults new users to The Glass Outlet org if no org_id is provided in metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org UUID;
BEGIN
  IF NEW.raw_user_meta_data->>'org_id' IS NOT NULL THEN
    INSERT INTO public.profiles (id, org_id, full_name)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'org_id')::UUID,
      NEW.raw_user_meta_data->>'full_name'
    );
  ELSE
    SELECT id INTO default_org FROM public.organisations WHERE slug = 'glass-outlet';
    INSERT INTO public.profiles (id, org_id, full_name)
    VALUES (NEW.id, default_org, NEW.raw_user_meta_data->>'full_name');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
