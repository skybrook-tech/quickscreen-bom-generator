-- 002_timber_paling_system_type.sql
--
-- Allow TIMBER_PALING in product_components.system_types (new fence family,
-- first supplied by the Amazing Fencing org). Constraint swap only — no new
-- tables, so the ALTER DEFAULT PRIVILEGES ACL footgun (see the ACL block at
-- the end of 001_init.sql) does not apply here.

ALTER TABLE "public"."product_components" DROP CONSTRAINT "chk_system_types_values";
ALTER TABLE "public"."product_components" ADD CONSTRAINT "chk_system_types_values"
  CHECK (("system_types" <@ ARRAY['QSHS'::"text", 'VS'::"text", 'XPL'::"text", 'BAYG'::"text", 'GATE'::"text", 'COLORBOND'::"text", 'TIMBER_PALING'::"text"]));
