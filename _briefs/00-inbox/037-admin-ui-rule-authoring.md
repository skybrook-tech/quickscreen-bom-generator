# Brief 037 — Admin UI: Rule authoring (template binding + data-driven math)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 036 merged
**Estimated PR size:** medium (no new tables; new admin pages, rule template registry, form components)
**Primary reference:** `docs/system-authoring-process.md` Section 3 Step 4 + `docs/multi-supplier-platform-architecture.md` "Three-Tier Rule Storage"

---

## Goal

Build the rule-authoring surface so Liam (admin) can attach rules to a system_instance through a form: pick a rule template + fill parameters (Tier A), or enter math.js expressions directly (Tier B). Tier C (custom code modules) stays platform-team-only and is **not exposed** in this UI.

After this brief, Liam can complete the system-instance-build path entirely click-driven: pick supplier + archetype → enter products → attach rules → set readiness.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **No Tier C in UI.** Custom code modules require a PR.
- **Math.js string comparison gotcha:** the form helper should auto-rewrite `==` on strings to `equalText()` before saving. Documented in `discovery.md` after the QSG sliding gates work.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `src/lib/bom/templates/registry.ts` | NEW — TypeScript map of template_id → metadata (parameter schema, formula, output spec). Initial templates: `slat_counting_v1`, `bay_post_v1`, `rail_cut_v1`, `panel_per_bay_v1`, `paling_count_v1`, `glass_panel_v1`, `spigot_per_panel_v1`, `swing_gate_hardware_v1`, `sliding_track_v1`, `sliding_hardware_v1` (matches archetype seed in brief 033) |
| `src/lib/bom/templates/types.ts` | NEW |
| `src/pages/admin/RulesListPage.tsx` | NEW — filter by system_instance |
| `src/pages/admin/RuleEditPage.tsx` | NEW — Template / Data tabs |
| `src/components/admin/TemplateBindingForm.tsx` | NEW — Tier A |
| `src/components/admin/DataRuleForm.tsx` | NEW — Tier B (math.js expression editor) |
| `src/lib/bom/templates/__tests__/registry.test.ts` | NEW |
| `docs/app-overview.md` | UPDATE |

## Template registry (Tier A) shape

```typescript
// src/lib/bom/templates/types.ts
export interface RuleTemplate {
  id: string;
  describes: string;
  inputs: Record<string, RuleParamSpec>;
  formula: string;                // math.js expression
  output: { sku: string; taxonomy: 'auto_add'|'suggested'|'optional'|'warning' };
}

export interface RuleParamSpec {
  type: 'number' | 'string' | 'sku' | 'product_lookup';
  source: 'variable' | 'product' | 'literal';
  hint?: string;                   // free text help
  defaults?: Record<string, unknown>;
}
```

```typescript
// src/lib/bom/templates/registry.ts
export const RULE_TEMPLATES: Record<string, RuleTemplate> = {
  slat_counting_v1: {
    id: 'slat_counting_v1',
    describes: 'Slat count per segment for slat-based systems',
    inputs: {
      segment_width_mm:   { type: 'number', source: 'variable' },
      post_diameter_mm:   { type: 'product_lookup', source: 'product', hint: 'products[type=post].diameter' },
      slat_width_mm:      { type: 'product_lookup', source: 'product', hint: 'products[type=slat].width' },
      gap_mm:             { type: 'number', source: 'literal', defaults: { common: [9, 12, 20] } },
    },
    formula: 'ceil((segment_width_mm - 2 * post_diameter_mm) / (slat_width_mm + gap_mm))',
    output: { sku: 'products[type=slat].sku', taxonomy: 'auto_add' },
  },
  // ... etc for the other templates
};
```

## Tier B: Data rule form

A simple form with:
- Stage selector (derive / stock / accessory / component) — matches the `rule_stage` enum from migration 012
- Selector match JSON (read-only preview, follows the QSHS `match_json:{}` pattern from `product_component_selectors`)
- Math.js expression (textarea with syntax-highlight + linter that auto-rewrites string `==` to `equalText()`)
- Output key (text)
- Taxonomy (radio: auto_add / suggested / optional / warning) — stored alongside in `product_rules.notes` or a new column if the team decides
- Priority (number, default 0)
- Notes (textarea)

**Schema note (verified):** `product_rules` requires `org_id`, `product_id`, `rule_set_id`, `version_id`, `stage`, `name`, `expression`, `output_key`. The form must look up or create a `rule_set` + `rule_version` for the (org, product) pair if one doesn't exist (the engine reads the version with `is_current = true`). Convention: one rule_set per product named `<system_type>_default_rules`, one current version per rule_set.

Form persists via the existing `product_rules` table. Tag rows with the new `system_instance_id` (from the page context, set by brief 032).

## Tests

- Template registry: every template has well-formed inputs and formula
- Form: submits the correct payload to `product_rules`
- Math.js linter rewrites `name == "QSG"` to `equalText(name, "QSG")` on save

## PR description template

```markdown
## Brief 037 — Admin UI: Rule authoring

Adds the form-driven rule authoring surface (Template binding / Data rule tabs). Tier C (custom code modules) remains a PR-only path.

### Routes added

- `/admin/system-instances/:id/rules` (list, filter)
- `/admin/system-instances/:id/rules/new`
- `/admin/system-instances/:id/rules/:ruleId/edit`

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Template form: bind a template → save → row in `product_rules` with correct system_instance_id
- [ ] Data form: enter math.js expression → save → row in `product_rules`
- [ ] String-comparison auto-rewrite (`==` → `equalText()`) works
- [ ] PR base branch is `main`
```

## Stop points

- If the math.js editor library choice is contentious (currently default to CodeMirror 6 with a math.js mode), surface and confirm.

## After this PR merges

Brief 038 ships **workbook regression upload + diff** — the gate from `calculator_ready` to `spreadsheet_tested`. With 037 + 038 together, Liam can author and validate a new system without writing JSON or code.