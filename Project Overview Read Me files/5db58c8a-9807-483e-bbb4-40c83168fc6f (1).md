# Anyfence Supplier Onboarding Pack Builder

**Skill type:** Documentation + Python validators
**When to use:** Whenever producing the brief queue + seed JSON for a new fencing supplier on the Anyfence platform.
**Status:** Bundled as a standalone resource. Once skill-creation tooling is available, install via the Learning page.

---

## What this skill produces

Given a fencing supplier's name + website + (optionally) their pricing source material, this skill is the template/recipe + validators for producing a two-brief supplier-onboarding pack that adds them as a new supplier on the multi-supplier calculator platform:

1. **Brief NXX — `{supplier-slug}` Supplier + System Instances** (matches brief 042 / 045 in the canonical pack)
   - Creates the supplier row in `suppliers`
   - Creates N rows in `system_instances` mapping the supplier's product families to canonical archetypes
   - Writes a `catalogues/{supplier-slug}/README.md` with source pointers + TODOs

2. **Brief NXX+1 — `{supplier-slug}` Seed Data + Price Book** (matches brief 043 / 046)
   - N seed JSON files (one per system_instance) in `supabase/seeds/{supplier-slug}/products/`
   - A `price_books` row + `price_book_items` rows mirroring known pricing (or a draft price book with zero items if pricing pending)

Together these two briefs onboard a supplier without any TypeScript changes. Codex executes both autonomously per the MASTER-BRIEF orchestration loop.

## Canonical seed JSON shape

```json
{
  "org_slug": "glass-outlet",                         // The existing platform org (catalogue lives here pre-brief-044)
  "supplier_slug": "discount-fencing",                // New supplier
  "system_instance_slug": "dfsau-cca-pine-paling",    // Specific instance within the supplier
  "_format_note": "...",                              // Optional audit
  "_source": "URL where pricing came from",           // Optional citation
  "products": [
    {
      "system_type": "DF_CCA_PAL",                    // XX_CATEGORY pattern, UNIQUE per (org_id, system_type) — migration 022
      "product_type": "fence" | "gate" | "other",
      "name": "Discount Fencing — CCA Pine Paling Fence",
      "description": "...",
      "active": true,
      "sort_order": 100,
      "metadata": {
        "_provenance": {"supplier_slug": "...", "system_instance_slug": "..."},
        // ... archetype-specific keys (options, allowedAngles, compliance, etc.)
      }
    }
  ],
  "product_components": [
    {
      "sku": "DF-PAL-100x16-1200",
      "name": "CCA Pine Paling 100×16×1200mm",
      "description": "...",
      "category": "paling",                          // See "Canonical component categories" below
      "unit": "each",                                 // See "Canonical units" below
      "default_price": 1.74,                          // NUMERIC dollars (NOT cents) — matches existing pricing_rules schema
      "system_types": ["DF_CCA_PAL"],                 // Array; one component MAY appear in multiple system_types
      "metadata": {
        "height_mm": 1200, "width_mm": 100, "thickness_mm": 16, "material": "CCA Pine",
        "price_source": "URL", "price_verified_date": "2026-05-28"
      },
      "active": true,
      "subCategory": "palings",
      "sortPriority": 10
    }
  ]
}
```

## The 12 canonical archetypes

Use these slugs in `system_instances.archetype_id` lookups. Seeded by brief 033.

| Archetype | Family | Use for |
|---|---|---|
| `slat-fence` | fence | Horizontal/vertical aluminium or timber slat fencing |
| `panel-fence` | fence | ColorBond steel + vertical-bar aluminium security panels |
| `mesh-fence` | fence | Chainwire / weldmesh (NOT aluminium tubular — that's panel-fence) |
| `timber-fence` | fence | Treated pine paling, lap-and-cap, picket |
| `glass-pool-fence` | pool-fence | Frameless glass with spigots/clamps |
| `aluminium-pool-fence` | pool-fence | Flat-top, spear-top, loop-top aluminium pool fencing (AS1926.1) |
| `balustrade` | balustrade | Balcony / staircase balustrade |
| `swing-gate` | gate | Single/double swing gates (residential standard) |
| `sliding-gate` | gate | Sliding gates incl. automated |
| `equipment-enclosure` | enclosure | CTS-style equipment housing (not residential fencing) |
| `screen` | screen | Privacy / decorative screens |
| `shower` | shower | Frameless/semi-frameless shower screens |

**Common archetype-mapping mistakes:**
- "Aluminium security fence" is `panel-fence`, NOT `mesh-fence` (it's panel-based vertical bars, not chainwire)
- "Slat fence" with timber slats on steel posts is `slat-fence`, NOT `timber-fence` (the slat-counting math is the differentiator)
- "Chainwire" is `mesh-fence`. ANYTHING with rigid panel structure (sheet, tubular, slat) is NOT mesh.

If a supplier offers something that genuinely doesn't fit any of the 12 (e.g. "tubular pool-style fence at non-pool heights"), tag it with the closest existing archetype + metadata flagging the archetype-mismatch, then propose a new archetype brief later. **Don't invent new archetype slugs in seed JSON** — they must exist in `system_archetypes` first (via brief 033 or a follow-on).

## system_type namespacing rules

`products.system_type` is `UNIQUE (org_id, system_type)` per migration 022. Until brief 044's multi-org migration lands, ALL suppliers live under `org_slug='glass-outlet'`, so system_types must be globally unique within that org.

**Convention:** `{XX}_{CATEGORY}` where XX is a 2-3 letter supplier short code:

| Supplier | Prefix | Examples |
|---|---|---|
| Glass Outlet (legacy) | (none) | `QSHS`, `VS`, `XPL`, `BAYG`, `ColorBond`, `QS_GATE`, `XPSG_GATE` |
| Discount Fencing | `DF_` | `DF_CCA_PAL`, `DF_AL_POOL`, `DF_AL_SLAT_GATE`, `DF_GLASS`, `DF_COLORBOND` |
| Amazing Fencing | `AF_` | `AF_COLORBOND`, `AF_PERMASTEEL`, `AF_TIMBER_PALING`, `AF_TIMBER_SLAT`, `AF_CHAINWIRE` |

For the third+ suppliers, pick a 2-3 letter prefix that's mnemonic + unique. Avoid single-letter prefixes (collide too easily).

## Canonical component categories

`product_components.category` should be one of:

`paling, post, rail, panel, gate, sleeper, accessory, screw, fixing, bracket, hardware, cap, shroud, lattice, pickets, screening, sheet, rail-cap, infill, consumable, concrete, membrane`

If a supplier sells something outside this list (e.g. "letterbox", "gate motor"), add a metadata-only entry and flag it for a future canonical-categories update. Don't silently extend the set.

## Canonical units

`product_components.unit` should be one of:

`each, length, metre, linear-metre, bag, kg, pack, roll`

## Workflow — onboarding a new supplier from scratch

1. **Research** — visit the supplier's website. Capture:
   - Public product categories (the columns/menu items)
   - SKU detail (from any catalogue page or supply-side sister site)
   - Public pricing (often on a "click to download our pricing" PDF — get the PDF)
   - Brand partners (which manufacturers they resell)
   - Service region (state, metros)
2. **Archetype mapping** — for each product category, identify the canonical archetype (see table above).
3. **Choose `XX_` prefix** for system_type namespacing.
4. **Write brief NXX (supplier + instances)** — copy brief 042 or 045 as the template; adjust supplier metadata, instance list, archetype references.
5. **Write seed JSON files** — one per system_instance. Use the canonical shape above. Validate with `validate_seed.py`.
6. **Write brief NXX+1 (seed data + price book)** — copy brief 043 or 046 as the template; adjust SKU lists in the SQL price book migration.
7. **Update INVENTORY** in brief 028 with the two new briefs.
8. **Rebuild the bundle** — regenerate `SKYBROOK-NATIONAL-ROLLOUT-PACK.md` with the new files.

## Common pitfalls (from earlier supplier onboarding)

- **Used `set_updated_at` instead of `touch_updated_at`** — the canonical updated_at trigger function is `touch_updated_at()` (migration 008). Always verify against the actual repo.
- **Assumed `pricing_rules.sku` exists** — it doesn't. SKU joins via `pricing_rules.component_id → product_components.id → product_components.sku`. Use the `pricing_rules_with_sku` VIEW for legacy lookups.
- **Stored prices as cents in seed JSON** — DON'T. The canonical schema has `default_price NUMERIC(10,2)` (dollars). Cents are reserved for the new `price_book_items.price_cents` (brief 034+).
- **Tagged a security-aluminium instance as `mesh-fence`** — wrong. Aluminium security panels are `panel-fence` (structural pattern: vertical bars between posts).
- **Used `variable_key`/`variable_value` on `product_variables`** — wrong. Actual column shape (migration 012) is `name`, `default_value_json`, `options_json`.
- **Forgot the system_type UNIQUE constraint** — `(org_id, system_type)` is unique. Two suppliers can't both have `system_type='COLORBOND'` under the same org. Use the `XX_` prefix.

## Scripts in this skill

- `validate_seed.py` — Validates one or more seed JSON files against the canonical shape. Use BEFORE committing seed JSON to the repo.
  - Usage: `python3 validate_seed.py path/to/seed1.json path/to/seed2.json ...`
  - Output: errors (block) + warnings (informational, e.g. cross-instance system_types)
- `render_briefs.py` — Renders boilerplate supplier brief markdown from a YAML spec. Skeleton/scaffold to reduce copy-paste between suppliers; the seed JSON files are typically hand-authored since SKU detail varies per supplier.
  - Usage: `python3 render_briefs.py spec.yaml --output-dir _briefs/00-inbox/`

## Validators

`validate_seed.py` checks:
- Top-level required fields (`org_slug`, `supplier_slug`, `system_instance_slug`, `products`, `product_components`)
- Product required fields (`system_type`, `product_type`, `name`)
- `product_type` is in canonical set
- `system_type` follows `XX_CATEGORY` pattern
- Component required fields (`sku`, `name`, `category`, `unit`, `system_types`)
- Component `category` and `unit` are in canonical sets (warns if not)
- `default_price` is numeric dollars (warns if >10000 — might be cents)
- `system_types` is an array
- Each component's `system_types` reference a system_type declared in the file (warns if cross-instance)
- No duplicate SKUs within a file

## Reference examples in this pack

- `_briefs/00-inbox/042-discount-fencing-supplier-and-instances.md` — canonical supplier+instances brief
- `_briefs/00-inbox/043-discount-fencing-seed-data-and-price-book.md` — canonical seed+price brief (with public pricing populated)
- `_briefs/00-inbox/045-amazing-fencing-supplier-and-instances.md` — canonical multi-state contractor+supplier hybrid supplier brief
- `_briefs/00-inbox/046-amazing-fencing-seed-data-and-price-book.md` — canonical seed brief with DRAFT price book (pricing pending)
- `_briefs/assets/043-discount-fencing-seeds/*.json` — seeds with prices populated
- `_briefs/assets/046-amazing-fencing-seeds/*.json` — seeds with prices null

## Future scope

Things this skill doesn't yet handle (room for expansion):
- Per-region price books (e.g. Amazing Fencing NSW vs QLD inventory)
- Tier 2 (trade) / Tier 3 (volume) price book layering
- Workbook regression input generation (brief 038's input fixtures)
- Custom archetype proposal (new archetype slug + geometry adapter + rule templates)
- PDF parsing — currently relies on Liam supplying pricing PDFs manually
