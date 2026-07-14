-- 001_init.sql — consolidated schema (squash of former migrations 001–032, 2026-07-06)
--
-- Generated from `supabase db dump --local` at migration head 032, after
-- dropping the dead data-driven-engine tables (rule_sets, rule_versions,
-- product_rules, product_constraints, product_validations, product_variables,
-- product_component_selectors, product_companion_rules, product_warnings)
-- and colour_options. The retired engine's docs live in
-- docs/_deprecated/data-driven-approach/.
--
-- Live surface: organisations, profiles, quotes, products, product_components,
-- pricing_rules (+ pricing_rules_with_sku view), quote_runs, quote_run_segments,
-- supplier_product_calculator_configs; user_org_id() / handle_new_user() and
-- the on_auth_user_created trigger (appended manually below — pg_dump does not
-- emit triggers on auth.users).
--
-- Catalogue/pricing DATA is seeded separately: org rows via `npm run seed:orgs`
-- (per-org seeds/<slug>/org.json), catalogue via `npm run seed:products`
-- (supabase/seeds/<slug>/products/*.json).




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'staff',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_quote_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = 0 THEN
    SELECT COALESCE(MAX(quote_number), 0) + 1
    INTO NEW.quote_number
    FROM quotes
    WHERE org_id = NEW.org_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_quote_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_product_parent_org"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM products WHERE id = NEW.parent_id AND org_id = NEW.org_id
    ) THEN
      RAISE EXCEPTION 'Parent product must belong to the same organisation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_product_parent_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_calculator_configs"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_calculator_configs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."user_org_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."organisations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "branding" "jsonb" DEFAULT '{}'::"jsonb",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "calculator_theme" "text"
);


ALTER TABLE "public"."organisations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "component_id" "uuid" NOT NULL,
    "tier_code" "text" NOT NULL,
    "rule" "text",
    "price" numeric(10,2) NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "valid_from" "date",
    "valid_to" "date",
    "notes" "text",
    CONSTRAINT "pricing_rules_tier_code_check" CHECK (("tier_code" = ANY (ARRAY['tier1'::"text", 'tier2'::"text", 'tier3'::"text"])))
);


ALTER TABLE "public"."pricing_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sku" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "system_types" "text"[] DEFAULT ARRAY['QSHS'::"text"],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "active" boolean DEFAULT true,
    "description" "text",
    "unit" "text" DEFAULT 'each'::"text" NOT NULL,
    "default_price" numeric(10,2),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "internal_sku" "text",
    CONSTRAINT "chk_system_types_values" CHECK (("system_types" <@ ARRAY['QSHS'::"text", 'VS'::"text", 'XPL'::"text", 'BAYG'::"text", 'GATE'::"text", 'COLORBOND'::"text"]))
);


ALTER TABLE "public"."product_components" OWNER TO "postgres";


COMMENT ON COLUMN "public"."product_components"."internal_sku" IS 'Canonical internal SKU key (e.g. SLAT.STD.65.B). When set, the bom-calculator-static engine resolves this component''s supplier SKU by matching internal_sku in resolveInternalSku(). Takes precedence over DEFAULT_INTERNAL_SKU_MAP for this org.';



CREATE OR REPLACE VIEW "public"."pricing_rules_with_sku" AS
 SELECT "pr"."id",
    "pr"."org_id",
    "pr"."component_id",
    "pc"."sku",
    "pr"."tier_code",
    "pr"."rule",
    "pr"."price",
    "pr"."priority",
    "pr"."valid_from",
    "pr"."valid_to",
    "pr"."active",
    "pr"."updated_at"
   FROM ("public"."pricing_rules" "pr"
     JOIN "public"."product_components" "pc" ON (("pc"."id" = "pr"."component_id")));


ALTER VIEW "public"."pricing_rules_with_sku" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "system_type" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "parent_id" "uuid",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "image_url" "text",
    "product_type" "text" DEFAULT 'fence'::"text" NOT NULL,
    "compatible_with_system_types" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    CONSTRAINT "products_product_type_check" CHECK (("product_type" = ANY (ARRAY['fence'::"text", 'gate'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "full_name" "text",
    "company" "text",
    "phone" "text",
    "role" "text" DEFAULT 'member'::"text",
    "pricing_tier" "text" DEFAULT 'tier1'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    CONSTRAINT "profiles_pricing_tier_check" CHECK (("pricing_tier" = ANY (ARRAY['tier1'::"text", 'tier2'::"text", 'tier3'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_run_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "quote_run_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "segment_type" "text" NOT NULL,
    "segment_kind" "text",
    "length_mm" numeric,
    "panel_width_mm" numeric,
    "target_height_mm" numeric,
    "bay_count" integer,
    "turn_deg" numeric,
    "left_termination" "text",
    "right_termination" "text",
    "variables_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quote_run_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "description" "text",
    "variables_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quote_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_ref" "text",
    "fence_config" "jsonb" NOT NULL,
    "gates" "jsonb" DEFAULT '[]'::"jsonb",
    "bom" "jsonb" NOT NULL,
    "contact" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "quote_number" integer DEFAULT 0 NOT NULL,
    "property_anchor" "jsonb",
    CONSTRAINT "quotes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'accepted'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quotes"."property_anchor" IS 'Nullable property anchor for map-first calculator jobs: { lat, lng, address }.';



CREATE TABLE IF NOT EXISTS "public"."supplier_product_calculator_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "product_code" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_current" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."supplier_product_calculator_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."supplier_product_calculator_configs" IS 'Per-org calculator config overrides. Each row is a sparse JSON patch over the base CalculatorConfig for the given product_code. Only is_current=true and active=true rows are loaded at runtime.';



COMMENT ON COLUMN "public"."supplier_product_calculator_configs"."config" IS 'Sparse partial<CalculatorConfig>. Deep-merged over the base config. Only the keys you want to override need to be present. Arrays replace (not append) the base array. Example: {"stockLengths": {"slat": {"standard": 4000}}} overrides just the standard slat stock length to 4000mm.';



ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."product_components"
    ADD CONSTRAINT "product_components_org_id_sku_key" UNIQUE ("org_id", "sku");



ALTER TABLE ONLY "public"."product_components"
    ADD CONSTRAINT "product_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_rules"
    ADD CONSTRAINT "product_pricing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_run_segments"
    ADD CONSTRAINT "quote_run_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_runs"
    ADD CONSTRAINT "quote_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_product_calculator_configs"
    ADD CONSTRAINT "supplier_product_calculator_configs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_calc_configs_org_product" ON "public"."supplier_product_calculator_configs" USING "btree" ("org_id", "product_code", "is_current") WHERE (("is_current" = true) AND ("active" = true));



CREATE INDEX "idx_pricing_rules_lookup" ON "public"."pricing_rules" USING "btree" ("org_id", "component_id", "tier_code") WHERE ("active" = true);



CREATE INDEX "idx_product_components_internal_sku" ON "public"."product_components" USING "btree" ("org_id", "internal_sku") WHERE ("internal_sku" IS NOT NULL);



CREATE INDEX "idx_product_components_system_types" ON "public"."product_components" USING "gin" ("system_types");



CREATE INDEX "idx_quotes_created" ON "public"."quotes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_quotes_org" ON "public"."quotes" USING "btree" ("org_id");



CREATE INDEX "idx_quotes_user" ON "public"."quotes" USING "btree" ("user_id");



CREATE INDEX "quote_run_segments_run_order" ON "public"."quote_run_segments" USING "btree" ("quote_run_id", "sort_order");



CREATE INDEX "quote_runs_quote_order" ON "public"."quote_runs" USING "btree" ("quote_id", "sort_order");



CREATE UNIQUE INDEX "uq_pricing_rules_component_tier_priority" ON "public"."pricing_rules" USING "btree" ("component_id", "tier_code", "priority") WHERE ("active" = true);



CREATE UNIQUE INDEX "uq_products_system_type" ON "public"."products" USING "btree" ("org_id", "system_type");



CREATE OR REPLACE TRIGGER "set_quote_number" BEFORE INSERT ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."assign_quote_number"();



CREATE OR REPLACE TRIGGER "trg_calc_configs_updated_at" BEFORE UPDATE ON "public"."supplier_product_calculator_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_calculator_configs"();



CREATE OR REPLACE TRIGGER "trg_pricing_rules_updated_at" BEFORE UPDATE ON "public"."pricing_rules" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_product_components_updated_at" BEFORE UPDATE ON "public"."product_components" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_product_parent_org" BEFORE INSERT OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."check_product_parent_org"();



CREATE OR REPLACE TRIGGER "trg_quote_run_segments_updated_at" BEFORE UPDATE ON "public"."quote_run_segments" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_quote_runs_updated_at" BEFORE UPDATE ON "public"."quote_runs" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



ALTER TABLE ONLY "public"."pricing_rules"
    ADD CONSTRAINT "pricing_rules_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."product_components"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_components"
    ADD CONSTRAINT "product_components_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."pricing_rules"
    ADD CONSTRAINT "product_pricing_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."quote_run_segments"
    ADD CONSTRAINT "quote_run_segments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_run_segments"
    ADD CONSTRAINT "quote_run_segments_quote_run_id_fkey" FOREIGN KEY ("quote_run_id") REFERENCES "public"."quote_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_runs"
    ADD CONSTRAINT "quote_runs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_runs"
    ADD CONSTRAINT "quote_runs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quote_runs"
    ADD CONSTRAINT "quote_runs_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_product_calculator_configs"
    ADD CONSTRAINT "supplier_product_calculator_configs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE;



CREATE POLICY "Org admins can view org profiles" ON "public"."profiles" FOR SELECT USING (("org_id" = "public"."user_org_id"()));



CREATE POLICY "Users can delete own quotes" ON "public"."quotes" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own quotes" ON "public"."quotes" FOR INSERT WITH CHECK ((("org_id" = "public"."user_org_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own quotes" ON "public"."quotes" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view org quotes" ON "public"."quotes" FOR SELECT USING (("org_id" = "public"."user_org_id"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "admin_delete_pricing_rules" ON "public"."pricing_rules" FOR DELETE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_delete_product_components" ON "public"."product_components" FOR DELETE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_insert_pricing_rules" ON "public"."pricing_rules" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_insert_product_components" ON "public"."product_components" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_select_pricing_rules" ON "public"."pricing_rules" FOR SELECT TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_select_product_components" ON "public"."product_components" FOR SELECT TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_update_pricing_rules" ON "public"."pricing_rules" FOR UPDATE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_update_product_components" ON "public"."product_components" FOR UPDATE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "org_members_select" ON "public"."supplier_product_calculator_configs" FOR SELECT TO "authenticated" USING (("org_id" = "public"."user_org_id"()));



ALTER TABLE "public"."organisations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organisations_select_own" ON "public"."organisations" FOR SELECT TO "authenticated" USING (("id" = "public"."user_org_id"()));



ALTER TABLE "public"."pricing_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_select_own_org" ON "public"."products" FOR SELECT TO "authenticated" USING (("org_id" = "public"."user_org_id"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_run_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_product_calculator_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_delete_own_quote_run_segments" ON "public"."quote_run_segments" FOR DELETE TO "authenticated" USING (("org_id" = "public"."user_org_id"()));



CREATE POLICY "users_delete_own_quote_runs" ON "public"."quote_runs" FOR DELETE TO "authenticated" USING (("org_id" = "public"."user_org_id"()));



CREATE POLICY "users_insert_own_quote_run_segments" ON "public"."quote_run_segments" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = "public"."user_org_id"()));



CREATE POLICY "users_insert_own_quote_runs" ON "public"."quote_runs" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = "public"."user_org_id"()));



CREATE POLICY "users_update_own_quote_run_segments" ON "public"."quote_run_segments" FOR UPDATE TO "authenticated" USING (("org_id" = "public"."user_org_id"()));



CREATE POLICY "users_update_own_quote_runs" ON "public"."quote_runs" FOR UPDATE TO "authenticated" USING (("org_id" = "public"."user_org_id"()));



CREATE POLICY "users_view_org_quote_run_segments" ON "public"."quote_run_segments" FOR SELECT TO "authenticated" USING (("org_id" = "public"."user_org_id"()));



CREATE POLICY "users_view_org_quote_runs" ON "public"."quote_runs" FOR SELECT TO "authenticated" USING (("org_id" = "public"."user_org_id"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."assign_quote_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_quote_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_quote_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_product_parent_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_product_parent_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_product_parent_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_calculator_configs"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_calculator_configs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_calculator_configs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_org_id"() TO "service_role";


















GRANT ALL ON TABLE "public"."organisations" TO "anon";
GRANT ALL ON TABLE "public"."organisations" TO "authenticated";
GRANT ALL ON TABLE "public"."organisations" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_rules" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pricing_rules" TO "authenticated";



GRANT ALL ON TABLE "public"."product_components" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_components" TO "authenticated";



GRANT ALL ON TABLE "public"."pricing_rules_with_sku" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "service_role";
GRANT SELECT ON TABLE "public"."products" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quote_run_segments" TO "anon";
GRANT ALL ON TABLE "public"."quote_run_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_run_segments" TO "service_role";



GRANT ALL ON TABLE "public"."quote_runs" TO "anon";
GRANT ALL ON TABLE "public"."quote_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_runs" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_product_calculator_configs" TO "anon";
GRANT ALL ON TABLE "public"."supplier_product_calculator_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_product_calculator_configs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































-- ── auth.users signup trigger (not captured by pg_dump; from former 002) ────
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── ACL normalisation ────────────────────────────────────────────────────────
-- Supabase's ALTER DEFAULT PRIVILEGES grants ALL to anon/authenticated on every
-- table created above; pg_dump records the intended narrower ACLs as GRANTs but
-- emits no REVOKEs. These tables carry pricing IP and have NO RLS — table-level
-- grants are their only protection — so pin them back explicitly.
REVOKE ALL ON TABLE public.pricing_rules          FROM anon, authenticated;
REVOKE ALL ON TABLE public.product_components     FROM anon, authenticated;
REVOKE ALL ON TABLE public.pricing_rules_with_sku FROM anon, authenticated;
REVOKE ALL ON TABLE public.products               FROM anon, authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pricing_rules      TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.product_components TO authenticated;
GRANT SELECT                      ON TABLE public.products           TO authenticated;

RESET ALL;
