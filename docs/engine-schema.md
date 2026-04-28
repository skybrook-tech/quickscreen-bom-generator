# V3 Engine — Database Schema

All v3 engine tables live in `supabase/migrations/011–014`, `018–025`. Every table has `id UUID PK`, `org_id UUID NOT NULL REFERENCES organisations(id)`, `active BOOLEAN NOT NULL DEFAULT true`, `created_at`/`updated_at` timestamps, and a `touch_updated_at()` BEFORE UPDATE trigger (defined once in `008_restructure_schema.sql`).

---

## Rule containers (`011_engine_core.sql`)

```sql
-- rule_sets: one per product (e.g. "QSHS fence rule set")
rule_sets (
  id, org_id,
  product_id UUID REFERENCES products(id),
  name TEXT NOT NULL,
  description TEXT
)

-- rule_versions: one active version per set at a time
rule_versions (
  id, org_id,
  rule_set_id UUID REFERENCES rule_sets(id),
  version_label TEXT NOT NULL,           -- e.g. "v1.0.0"
  is_current BOOLEAN NOT NULL DEFAULT false,
  effective_from DATE,
  notes TEXT
)
-- UNIQUE INDEX: only one is_current=true per rule_set_id
```

---

## Rules, constraints, variables, validations (`012_engine_rules.sql`)

```sql
CREATE TYPE rule_stage AS ENUM ('derive', 'stock', 'accessory', 'component');

-- product_rules: math.js expressions evaluated in stage+priority order
product_rules (
  id, org_id, product_id,
  rule_set_id UUID REFERENCES rule_sets(id),
  version_id  UUID REFERENCES rule_versions(id),
  stage       rule_stage NOT NULL,
  name        TEXT NOT NULL,
  expression  TEXT NOT NULL,   -- math.js e.g. "floor((targetHeightMm - 133 + slatGapMm - 3) / (slatSizeMm + slatGapMm))"
  output_key  TEXT NOT NULL,   -- variable name written into ctx
  priority    INTEGER NOT NULL DEFAULT 0,
  notes       TEXT
)
-- INDEX: (version_id, stage, priority) WHERE active

-- product_constraints: min/max/threshold/enum bounds
product_constraints (
  id, org_id, product_id,
  name             TEXT NOT NULL,
  constraint_type  TEXT NOT NULL,   -- min | max | threshold | enum
  value_text       TEXT NOT NULL,
  unit             TEXT,
  severity         TEXT NOT NULL,   -- error | warning
  applies_when_json JSONB DEFAULT '{}',  -- conditional application
  message          TEXT NOT NULL
)

-- product_variables: field definitions for the schema-driven form
product_variables (
  id, org_id, product_id,
  name               TEXT NOT NULL,
  label              TEXT NOT NULL,
  data_type          TEXT NOT NULL,  -- enum | number | integer | boolean | text
  unit               TEXT,
  required           BOOLEAN NOT NULL DEFAULT false,
  default_value_json JSONB,
  options_json       JSONB DEFAULT '[]',
  scope              TEXT NOT NULL,  -- job | run | segment
  sort_order         INTEGER NOT NULL DEFAULT 0
)

-- product_validations: blocking/non-blocking expression checks
product_validations (
  id, org_id, product_id,
  name        TEXT NOT NULL,
  expression  TEXT NOT NULL,   -- truthy = valid; falsy = violation
  severity    TEXT NOT NULL,   -- error (blocks BOM) | warning
  message     TEXT NOT NULL
)
```

---

## SKU selectors (`013_engine_selectors.sql`)

```sql
-- product_component_selectors: match_json → sku_pattern
product_component_selectors (
  id, org_id, product_id,
  selector_key        TEXT NOT NULL,
  component_category  TEXT NOT NULL,
  selector_type       TEXT NOT NULL,  -- exact | range | first_match
  match_json          JSONB DEFAULT '{}',   -- conditions on ctx variables
  sku_pattern         TEXT NOT NULL,        -- e.g. "QS-6100-S65-{colour}"
  priority            INTEGER NOT NULL DEFAULT 100,
  notes               TEXT
)
-- INDEX: (product_id, component_category, priority) WHERE active
-- Placeholder {colour}, {finish}, {frame_cap_size} resolved from ctx at runtime
```

---

## Companion rules + warnings (`014_engine_companions.sql`)

```sql
-- product_companion_rules: "when we add X, also add Y"
product_companion_rules (
  id, org_id, product_id,
  rule_key             TEXT NOT NULL,
  trigger_category     TEXT NOT NULL,       -- category that triggers this companion
  trigger_match_json   JSONB DEFAULT '{}',  -- additional conditions
  add_category         TEXT NOT NULL,
  add_sku_pattern      TEXT NOT NULL,
  qty_formula          TEXT NOT NULL,       -- math.js, can reference {trigger_qty}
  is_pack              BOOLEAN NOT NULL DEFAULT false,
  priority             INTEGER NOT NULL DEFAULT 100,
  notes                TEXT
)
-- INDEX: (product_id, trigger_category, priority) WHERE active

-- product_warnings: non-blocking reviewer messages
product_warnings (
  id, org_id, product_id,
  warning_key    TEXT NOT NULL,
  severity       TEXT NOT NULL,          -- error | warning | info (assumption)
  condition_json JSONB DEFAULT '{}',     -- truthy condition triggers the message
  message        TEXT NOT NULL
)
```

---

## Persistent v3 quote storage (`018_engine_quote_runs.sql`)

```sql
-- quote_runs: one row per fence/gate run in a saved quote
quote_runs (
  id, org_id,
  quote_id    UUID REFERENCES quotes(id),
  product_id  UUID REFERENCES products(id),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  variables_json JSONB DEFAULT '{}'   -- per-run variable overrides
)
-- INDEX: (quote_id, sort_order)

-- quote_run_segments: one row per segment (panel/gate/corner) within a run
quote_run_segments (
  id, org_id,
  quote_run_id      UUID REFERENCES quote_runs(id),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  segment_type      TEXT NOT NULL,   -- panel | bay_group | gate_opening | corner
  segment_kind      TEXT,
  length_mm         NUMERIC,
  panel_width_mm    NUMERIC,
  target_height_mm  NUMERIC,
  bay_count         INTEGER,
  turn_deg          NUMERIC,
  left_termination  TEXT,
  right_termination TEXT,
  variables_json    JSONB DEFAULT '{}'  -- per-segment overrides
)
-- INDEX: (quote_run_id, sort_order)
```

`quote_runs` / `quote_run_segments` store the canonical payload (see `docs/canonical-payload.md`). Saving a v3 quote = upserting these rows. Loading = reading them back into a `CanonicalPayload`.

---

## Admin role (`019_add_admin_role.sql`)

```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
```

`profiles.role = 'admin'` gates trace output in `bom-calculator`. Seeded user: `admin@glass-outlet.com / 123456`.

---

## RLS strategy

| Tables | Policy |
|---|---|
| `rule_sets`, `rule_versions`, `product_rules`, `product_constraints`, `product_validations`, `product_companion_rules`, `product_warnings` | No RLS — service role only (edge functions via `SUPABASE_SERVICE_ROLE_KEY`) |
| `product_variables`, `product_component_selectors` | `authenticated` SELECT WHERE `org_id = public.user_org_id()` — client reads these to drive the form |
| `quote_runs`, `quote_run_segments` | Same pattern as `quotes`: SELECT all org rows; INSERT/UPDATE/DELETE own rows only |

---

## Colour options table (`024_colour_options.sql`)

```sql
-- colour_options: drives the colour picker in the form
colour_options (
  id, org_id,
  colour_code   TEXT NOT NULL,  -- short code e.g. "B"
  colour_name   TEXT NOT NULL,  -- display name e.g. "Black Satin"
  hex_value     TEXT,
  is_limited    BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0
)
```

---

## Migrations scoped out

Migrations 015 (`product_input_schemas`/`_groups`/`_fields`), 016 (`product_layout_schemas`/`_entity_types`/`_actions`), and 017 (`input_aliases`) were designed but not applied. The v3 form is hand-coded (`SchemaDrivenForm` + `FALLBACK_FIELDS`) and the canvas toolbar is shared across all products — no per-product schema-driven form or layout tables are needed.
