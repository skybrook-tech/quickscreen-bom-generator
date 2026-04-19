# Phase V3-1 — Engine Migrations

> **Status:** Not started
> **Depends on:** Migrations 001–010 (already applied)
> **Unblocks:** V3-2 (seeds), V3-4 (edge function), V3-5 (UI)

## Goal

Create the Postgres tables that hold the **data-driven BOM engine**: rule containers, math.js expressions, constraints, SKU selectors, companion rules, warnings, schema-driven form definitions, layout capabilities, natural-language aliases, and persistent v3 quote runs.

No business logic is encoded here — these tables are containers. Rules and seed data land in Phase V3-2.

## Shape of every new table

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `org_id UUID NOT NULL REFERENCES organisations(id)` (except `input_aliases` — global)
- `active BOOLEAN NOT NULL DEFAULT true`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `BEFORE UPDATE` trigger calling `touch_updated_at()` (already defined in `supabase/migrations/008_restructure_schema.sql:71-81` — do NOT redeclare)
- JSONB columns where the build packs use nested structures (`metadata_json`, `match_json`, `options_json`, `visible_when_json`, `applies_when_json`, `condition_json`, `trigger_match_json`)

## Migrations

### `011_engine_core.sql` — rule containers

```sql
CREATE TABLE rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  rule_set_id UUID NOT NULL REFERENCES rule_sets(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  effective_from DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX rule_versions_one_current_per_set
  ON rule_versions (rule_set_id) WHERE is_current;

CREATE INDEX rule_sets_org_product ON rule_sets (org_id, product_id);
```

Both tables get a `touch_updated_at()` trigger.

### `012_engine_rules.sql` — rules, constraints, variables, validations

```sql
CREATE TYPE rule_stage AS ENUM ('derive', 'stock', 'accessory', 'component');

CREATE TABLE product_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rule_set_id UUID NOT NULL REFERENCES rule_sets(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES rule_versions(id) ON DELETE CASCADE,
  stage rule_stage NOT NULL,
  name TEXT NOT NULL,
  expression TEXT NOT NULL,
  output_key TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_rules_execution
  ON product_rules (version_id, stage, priority)
  WHERE active;

CREATE TABLE product_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  constraint_type TEXT NOT NULL, -- min | max | threshold | enum
  value_text TEXT NOT NULL,
  unit TEXT,
  severity TEXT NOT NULL, -- error | warning
  applies_when_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  data_type TEXT NOT NULL, -- enum | number | integer | boolean | text
  unit TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  default_value_json JSONB,
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope TEXT NOT NULL, -- job | run | segment
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  expression TEXT NOT NULL,
  severity TEXT NOT NULL, -- error | warning
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_constraints_product ON product_constraints (product_id) WHERE active;
CREATE INDEX product_variables_product ON product_variables (product_id, scope, sort_order) WHERE active;
CREATE INDEX product_validations_product ON product_validations (product_id) WHERE active;
```

All four tables get `touch_updated_at()` triggers.

### `013_engine_selectors.sql` — SKU selectors

Uses the **gates-pack column shape** (`sku_pattern` supports placeholders like `{colour}`).

```sql
CREATE TABLE product_component_selectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  selector_key TEXT NOT NULL,
  component_category TEXT NOT NULL,
  selector_type TEXT NOT NULL, -- exact | range | first_match
  match_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sku_pattern TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_component_selectors_lookup
  ON product_component_selectors (product_id, component_category, priority)
  WHERE active;
```

### `014_engine_companions.sql` — companion rules + warnings

```sql
CREATE TABLE product_companion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  trigger_category TEXT NOT NULL,
  trigger_match_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  add_category TEXT NOT NULL,
  add_sku_pattern TEXT NOT NULL,
  qty_formula TEXT NOT NULL,
  is_pack BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warning_key TEXT NOT NULL,
  severity TEXT NOT NULL, -- error | warning | info
  condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_companion_rules_trigger
  ON product_companion_rules (product_id, trigger_category, priority)
  WHERE active;
CREATE INDEX product_warnings_product
  ON product_warnings (product_id, severity)
  WHERE active;
```

### `015_engine_forms.sql` — schema-driven form

```sql
CREATE TABLE product_input_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  schema_key TEXT NOT NULL,
  version_label TEXT NOT NULL,
  layout_type TEXT NOT NULL, -- multi_run_fence | single_gate | ...
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_input_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  schema_id UUID NOT NULL REFERENCES product_input_schemas(id) ON DELETE CASCADE,
  group_key TEXT NOT NULL,
  label TEXT NOT NULL,
  parent_group_key TEXT,
  repeatable BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_input_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  schema_id UUID NOT NULL REFERENCES product_input_schemas(id) ON DELETE CASCADE,
  group_key TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  control_type TEXT NOT NULL, -- select | number | text | toggle | ...
  data_type TEXT NOT NULL,    -- enum | number | integer | boolean | text
  unit TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  default_value_json JSONB,
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  visible_when_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_input_groups_schema_order
  ON product_input_groups (schema_id, sort_order);
CREATE INDEX product_input_fields_schema_group
  ON product_input_fields (schema_id, group_key, sort_order);
```

### `016_engine_layout.sql` — canvas capabilities

```sql
CREATE TABLE product_layout_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  schema_key TEXT NOT NULL,
  layout_model TEXT NOT NULL, -- multi_run_fence | single_gate | ...
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_layout_entity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  layout_schema_id UUID NOT NULL REFERENCES product_layout_schemas(id) ON DELETE CASCADE,
  entity_type_key TEXT NOT NULL,
  label TEXT NOT NULL,
  parent_entity_type_key TEXT,
  repeatable BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_layout_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  layout_schema_id UUID NOT NULL REFERENCES product_layout_schemas(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  label TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_layout_entity_types_lookup
  ON product_layout_entity_types (layout_schema_id, sort_order);
CREATE INDEX product_layout_actions_lookup
  ON product_layout_actions (layout_schema_id, sort_order);
```

### `017_engine_aliases.sql` — natural-language aliases

Global (no `org_id`) because aliases are shared across all orgs. Scope narrowing happens via `product_scope`.

```sql
CREATE TABLE input_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  product_scope TEXT NOT NULL DEFAULT 'ALL', -- ALL | QSHS | HSSG | GATES | ...
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX input_aliases_alias_scope
  ON input_aliases (alias, product_scope, canonical_key);
```

### `018_engine_quote_runs.sql` — persistent v3 quote structure

```sql
CREATE TABLE quote_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  variables_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- per-run overrides
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quote_run_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  quote_run_id UUID NOT NULL REFERENCES quote_runs(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  segment_type TEXT NOT NULL, -- panel | bay_group | gate_opening | corner
  segment_kind TEXT,
  length_mm NUMERIC,
  panel_width_mm NUMERIC,
  target_height_mm NUMERIC,
  bay_count INTEGER,
  turn_deg NUMERIC,
  left_termination TEXT,
  right_termination TEXT,
  variables_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- per-segment overrides
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quote_runs_quote_order ON quote_runs (quote_id, sort_order);
CREATE INDEX quote_run_segments_run_order ON quote_run_segments (quote_run_id, sort_order);
```

RLS follows the existing `quotes` pattern: users see all org rows, can only modify their own. See V3-4 for edge-function access via service role.

### `019_add_admin_role.sql` — admin role for trace gating

```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
```

This is idempotent — safe to re-run.

## RLS strategy

| Table | Policy |
|---|---|
| `rule_sets`, `rule_versions`, `product_rules`, `product_constraints`, `product_validations`, `product_companion_rules`, `product_warnings`, `input_aliases` | No RLS — service role only (edge functions via `SUPABASE_SERVICE_ROLE_KEY`) |
| `product_variables`, `product_component_selectors`, `product_input_schemas`, `product_input_groups`, `product_input_fields`, `product_layout_schemas`, `product_layout_entity_types`, `product_layout_actions` | `authenticated` SELECT WHERE `org_id = public.user_org_id()` — client needs these to render the schema-driven form |
| `quote_runs`, `quote_run_segments` | Match existing `quotes` RLS: SELECT all org rows, INSERT/UPDATE/DELETE own via `quotes.user_id = auth.uid()` |

## Verification

1. `supabase stop && supabase start && npm run db:reset` — applies all 9 new migrations without error
2. `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (...)` returns 15 (all new tables exist)
3. `\d+ product_rules` in psql — shows `touch_updated_at` trigger attached
4. `SELECT unnest(enum_range(NULL::user_role))` — includes `admin`
5. Authenticated select as `test@glass-outlet.com` — can SELECT from `product_input_schemas`, cannot SELECT from `product_rules`
6. All new migrations are idempotent (`IF NOT EXISTS` / `DO UPDATE`) — running `db:reset` twice does not error

## Critical files to reuse

- `supabase/migrations/008_restructure_schema.sql:71-81` — `touch_updated_at()` function declaration (referenced, not redeclared)
- `supabase/migrations/002_create_profiles.sql` — `public.user_org_id()` helper
- `supabase/migrations/010_products_read_policy.sql` — pattern for `authenticated` SELECT policy on product-family tables

## Out of scope

- Seeding any data — Phase V3-2
- RLS for cross-org sharing (not needed; each org sees only its own rules/products)
- `quote_versions` or rule-set A/B testing — deferred
