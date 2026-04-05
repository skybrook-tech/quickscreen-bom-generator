-- 007_seed_pricing.sql
--
-- Seeds product_pricing for The Glass Outlet org.
-- Tier 1/2/3 prices sourced from the master price file.
-- Colour-variant SKUs are seeded for all 11 colours.
-- Non-colour items (spacer blocks, black caps) have one entry each.
--
-- IMPORTANT: prices are stored server-side only. The client never reads this
-- table (REVOKE ALL is set on product_pricing). All pricing flows through
-- Supabase Edge Functions (service role key only).

DO $$
DECLARE
  _org UUID;
BEGIN
    SELECT id INTO _org FROM organisations WHERE slug = 'glass-outlet';

    INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
    ) VALUES (
        gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 
        'authenticated', 'authenticated', 'test@glass-outlet.com', 
        crypt('123456', gen_salt('bf')), -- Hashed password
        now(), '{"provider":"email","providers":["email"]}', 
        jsonb_build_object('org_id', _org), now(), now()
    );
END $$;
