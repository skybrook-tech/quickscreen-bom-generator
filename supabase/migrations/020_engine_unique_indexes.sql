-- 020_engine_unique_indexes.sql
--
-- Adds unique indexes on engine tables so the Node-based seed upserter
-- (supabase/seeds/tools/seed-products.js) can pass explicit `onConflict`
-- targets to supabase-js `.upsert()`.
--
-- These indexes formalise the business keys that the previous seed file's
-- implicit `ON CONFLICT DO NOTHING` relied on. They're additive: no data
-- changes, no behaviour changes for existing code paths. The upserter uses
-- them as conflict targets.
--
-- Service-role-only; no RLS implications.

CREATE UNIQUE INDEX IF NOT EXISTS uq_rule_sets_org_product_name
  ON rule_sets (org_id, product_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rule_versions_set_label
  ON rule_versions (rule_set_id, version_label);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variables_product_name
  ON product_variables (org_id, product_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_constraints_product_name
  ON product_constraints (org_id, product_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_validations_product_name
  ON product_validations (org_id, product_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_rules_version_stage_name
  ON product_rules (version_id, stage, name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_component_selectors_product_key
  ON product_component_selectors (org_id, product_id, selector_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_companion_rules_product_key
  ON product_companion_rules (org_id, product_id, rule_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_warnings_product_key
  ON product_warnings (org_id, product_id, warning_key);
