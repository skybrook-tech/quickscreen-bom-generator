# Schema Catalogue — quick lookup

Full column definitions live in `supabase/seeds/schemas/*.schema.json`. The
wrapper `product-file.schema.json` is the LLM output contract; it references
every per-table schema below. The portable spec at
`docs/seed-data-mapping-spec.md` §6 has a per-table walkthrough. This file is a
**"concept → section"** cheat sheet for the common case of "I have information
about X — where does it go in the per-variant product file?"

## Concept → table mapping

| Concept in the source material | Goes in |
|---|---|
| "A new fencing system" (name, code) | `products` with `product_type: "fence"` |
| "A new gate product" (name, code, compatible fences) | `products` with `product_type: "gate"` + `compatible_with_system_types: [...]` in its own file |
| "This system's available colours / slat sizes / gaps / mounting types" | `products.metadata.options` (for UI) + `product_variables.options_json` (for engine) |
| "A SKU exists" (with name, category, unit, price) | `product_components` + three rows in `pricing_rules` |
| "A pricing tier for an existing SKU" | `pricing_rules` (one row per tier, keyed by sku) |
| "Quantity break pricing" ("50+ @ $X") | Additional `pricing_rules` row with higher priority and a `rule` expression |
| "Minimum / maximum something" (height, width) | `product_constraints` (`constraint_type: min`/`max`) |
| "Allowed values for a field" ([65, 90]) | `product_constraints` (`constraint_type: enum`) **and** `product_variables.options_json` |
| "Threshold that triggers behaviour" (e.g. "panels ≥ 2000mm need a CSR") | `product_constraints` (`constraint_type: threshold`) |
| "Combinations that are invalid" (swing gate > 1200mm) | `product_validations` |
| "Formula for slat count / cut length / post count" | `product_rules` (pick stage per §5.3) |
| "Rule about stock-length efficiency" (slats per 5800mm) | `product_rules` stage `stock` |
| "Screw/spacer count per slat/panel" | `product_rules` stage `accessory` |
| "Final emitted component quantities" (num_side_frames, num_posts) | `product_rules` stage `component` |
| "Which SKU to use for category X with attributes Y" | `product_component_selectors` |
| "When we add X, also add Y" | `product_companion_rules` |
| "Warn the user about situation Z" | `product_warnings` (`severity: warning`) |
| "Block generation if condition W" | `product_warnings` (`severity: error`) — or `product_validations` if the check is formula-based |
| "Version history / rule-set changes over time" | New `rule_versions` row with incremented `version_label`; flip old `is_current` to false |

## Variable scope cheat sheet

| Typical variables → | `scope` |
|---|---|
| colour_code, slat_size_mm, slat_gap_mm, finish_family | `job` |
| mounting_type, left_boundary_type, right_boundary_type, hinge_type, latch_type | `run` |
| panel_width_mm, target_height_mm, segment_kind, bay_count, gate_width_mm, gate_height_mm | `segment` |

## Component category values currently in use

`slat`, `side_frame`, `cfc_cover`, `centre_support_rail`, `rail`, `post`,
`bracket`, `fixing`, `f_section`, `accessory`, `mounting`, `gate`,
`gate_side_frame`, `joiner_block`, `hardware`.

Stick to these where possible — companion rules and selectors filter by
category, so consistent naming avoids breakage. If you need a new category,
use a name that matches the visual/functional concept (not the vendor name).
