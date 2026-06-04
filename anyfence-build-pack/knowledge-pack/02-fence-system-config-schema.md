# 02 — `fence_system_config.json` Schema

This is the **single source of truth** the calculator engine consumes — one config per fence system, across all fence types. The machine-validatable version is `schema/fence_system_config.schema.json`; this file explains it.

## Top-level shape

```jsonc
{
  "system_id": "treated-pine-paling",          // stable kebab-case id
  "display_name": "Treated Pine Paling Fence",
  "manufacturer": "Generic / supplier name",
  "fence_type": "timber-paling",               // archetype family
  "heights_mm": [1500, 1650, 1800, 2100],
  "colours": [
    { "code": "MON", "name": "Monument", "hex": "#3B3C36", "swatch_url": "...", "surcharge_pct": 0 }
  ],
  "post_spacing_mm": 2400,
  "post_mounting_options": ["in-ground", "bolt-down", "core-drill"],
  "components": [ /* see below */ ],
  "gate_options": [ /* gate_kit bundles */ ],
  "compliance": [ /* see 05-au-compliance-rules.md */ ],
  "labour_rules": { /* optional, contractor-specific */ },
  "visual_assets": { /* swatches, render hints */ },
  "metadata": { "source": "bunnings", "captured_at": "2026-05", "currency": "AUD", "gst_pct": 10 }
}
```

## `components[]` — the heart of the config

Each component:

```jsonc
{
  "sku": "TP-POST-100x75-2400",          // canonical/internal sku
  "external_sku": "0123456",             // supplier code (e.g. Bunnings I/N) — passthrough, never re-mapped
  "canonical_name": "100x75 Treated Pine Post",   // see 04 — supplier-agnostic, version-locked
  "category": "post",                    // one of the 25+ categories below
  "unit": "each",                        // "each" | "length"
  "stock_length_mm": 2400,               // for length-sold items / cut optimisation
  "base_price_aud": 22.00,               // per piece
  "price_per_metre_aud": null,           // populate when supplier publishes BOTH (run-length math)
  "qty_break_pricing": [                 // optional tiered pricing
    { "min_qty": 1,  "unit_price": 22.00 },
    { "min_qty": 50, "unit_price": 19.80 }
  ],
  "cuts_per_run_fn": "ceil(run_length_mm / stock_length_mm)",  // safe string expression, NOT eval
  "paling_width_mm": null,               // drives 6mm-overlap cuts for palings
  "picket_width_mm": null,
  "board_width_mm": null,
  "colour": "Monument",                  // string from the colour palette
  "compliance_class": "H4"               // e.g. H3 / H4 / AS1926 / BAL-29
}
```

### Pricing fields — capture BOTH when published
- `base_price_aud` — **per piece** (drives the line-item BOM).
- `price_per_metre_aud` — populate **when the supplier publishes both** a piece price and a $/m (drives run-length math). Bunnings publishes both for timber — capture both.
- `unit` — `"each"` vs `"length"`. Determines whether stock-length cut optimisation applies.
- `qty_break_pricing` — array of `{ min_qty, unit_price }` tiers, ascending.

## The 25+ component categories

```
panel, glass_panel, post, rail, post_cap, capping, paling, picket, picket_panel,
screen_board, infill_sheet, mesh_roll, mesh_panel, tension_band, spigot, gate_kit,
hinge, latch, plinth, pole, handrail, fence_tie, accessory  (+ extensible)
```

### Category split-outs that MUST stay separate (common bugs live here)

| Keep separate | Why |
|---|---|
| **`post_cap`** (per-post, `unit:"each"`) vs **`capping`** (per-metre, `unit:"length"`) | So fence top-capping isn't billed per post. Different unit, different math. |
| **`glass_panel`** vs **`panel`** | Glass has a fixed 1200mm height and **width-by-width pricing** (a price per panel width), not a generic panel rate. |
| **`gate_kit`** vs **`hinge`/`latch`** | `gate_kit` bundles MagnaLatch + TruClose into one AS1926-compliant line item; hinge/latch exist separately for non-gate or custom builds. |

## `colours[]`
`{ code, name, hex, swatch_url, surcharge_pct }`. A colour may carry a `surcharge_pct` (premium finishes). Colorbond examples: Monument, Woodland Grey, Domain, Wilderness, Ironstone, Basalt, Evening Haze, Pale Eucalypt, Night Sky, Riversand.

## `compliance[]`
Array of `{ rule_id, standard, value, enforcement, user_message }`. `enforcement` ∈ `block_quote | warn | advisory`. See `05-au-compliance-rules.md` for the full rule set. The engine evaluates these before a quote is allowed to finalise.

## `gate_options[]`
Gate bundles (e.g. a pool gate = panel + self-closing hinges + latch as a `gate_kit`). A gate is a flat segment that interrupts a fence section (`parent_section_id` in the mapper UI — see `skills/ui-qa/fence-calculator-ui-conventions.md`).

## `metadata`
At minimum: `currency: "AUD"`, `gst_pct: 10`, source provenance (`source`, `captured_at`), and a `schema_version`. Prices are reference snapshots unless sourced from a live supplier price book.
