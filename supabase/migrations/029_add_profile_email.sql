-- 029_add_profile_email.sql
-- Store auth email on profiles for org directory / quotes index creator display.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing users from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id
  AND (p.email IS NULL OR p.email = '');

-- Drop RPC if this migration replaces an earlier 029 attempt
DROP FUNCTION IF EXISTS public.get_org_member_display_names(uuid[]);

-- Keep email in sync for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org UUID;
BEGIN
  IF NEW.raw_user_meta_data->>'org_id' IS NOT NULL THEN
    INSERT INTO public.profiles (id, org_id, full_name, email)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'org_id')::UUID,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email
    );
  ELSE
    SELECT id INTO default_org FROM public.organisations WHERE slug = 'glass-outlet';
    INSERT INTO public.profiles (id, org_id, full_name, email)
    VALUES (
      NEW.id,
      default_org,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
