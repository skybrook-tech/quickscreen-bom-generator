# Canonical product name contract

The Anyfence calculator engine emits **supplier-agnostic canonical product names**. A separate supplier-mapper resolves each canonical name to a specific supplier's SKU, price, pack size, and availability. This two-layer split is core architecture — **never bake a supplier SKU into the engine output**.

## The naming pattern

```
[sizing]  [descriptive type]  [material label]  [stock length if length-sold]
```

1. **Sizing first** — e.g. `100x75`, `57mm`, `75x50`
2. **Descriptive type next** — e.g. `Ring Shank`, `Smooth Shank`, `Rough Sawn`
3. **Material label always present** — e.g. `Treated Pine`, `Hardwood`
4. **Stock length appended for length-sold items** — e.g. `4800mm`

## Canonical examples (exact strings, treat as a contract)

| Canonical name | Notes |
|----------------|-------|
| `100x75 Treated Pine Post H4 2400mm` | Sold each. H4 in-ground rating. Length included in name. |
| `100x100 Treated Pine Post H4 2400mm` | Sold each. Heavier post option. |
| `75x38 Treated Pine Rail 4800mm` | Length-sold → stock length in the name |
| `75x50 Treated Pine Capping Rail 4800mm` | Lapped + capped style top rail |
| `150x16 Treated Pine Paling 1800mm` | Each. Width × thickness × length. |
| `125x16 Treated Pine Paling 1800mm` | Narrower paling option |
| `100x16 Treated Pine Paling 1800mm` | Narrowest standard paling |
| `150x25 Treated Pine Plinth 2400mm` | Optional plinth board below palings |
| `57mm Ring Shank Gal Nail` | Fastener. Type before material. Sold by box (5kg). |
| `Rapid Set Concrete 20kg` | Bag. |
| `Gate kit · 900mm pedestrian` | Bundled kit (frame + hinges + latch) — single line item |
| `Gate kit · 1500mm double` | Double gate with drop bolt |

## Stability rules (this is a CONTRACT)

- **Names are STABLE.** No renames without an explicit version bump of the contract.
- **Adding new canonical names is fine** (non-breaking) — but propose them via Fence Forge for review before they go into the registered set.
- **Renaming an existing canonical name is a BREAKING CHANGE** for every downstream supplier-mapper — it silently breaks SKU resolution. Treat renames like a database migration.
- The mapper keys on the canonical string. Whitespace, casing, and order matter — keep them exact.

## Why this is non-negotiable

The whole platform's promise — "a supplier keeps their own product codes, and one BOM prices against any supplier" — depends on a stable canonical vocabulary in the middle. If the engine's output names drift, every supplier price book mapping breaks at once. Anti-Gravity must treat the canonical name list as an append-only, versioned interface.

## Implementation guidance

- Keep a single **canonical-names registry** (a typed enum / table) that both the engine (producer) and the supplier-mapper (consumer) import. One source, two sides.
- Add a CI check: if a canonical name string changes, fail the build unless the contract version is bumped and a migration note is added.
- The supplier-mapper table is roughly:
  ```
  canonical_name → { supplier_id, supplier_sku, price_aud, pack_size, stock_status }
  ```
  (Many suppliers per canonical name.)

## In the wireframes

- Both Supply-only and Supply+install BOM lines render canonical name as the primary text + supplier SKU underneath (e.g. `amf · CCAH4PST-100-75-2400`)
- The Build Forge calculator-builder wizard uses canonical names as the contract layer when mapping a supplier's catalogue
- Atlas's migration `056_update_pricing_rules_with_sku_canonical.sql` should already wire up the canonical-name column on the `pricing_rules` view

## Reference

- Source-of-truth: `anyfence-build-pack/knowledge-pack/04-canonical-product-names.md` in the repo
- Schema: `anyfence-build-pack/schema/fence_system_config.schema.json`
- Engine: `anyfence-build-pack/skills/calculator-engine/treated-pine-paling-fence-calculator/calculator.py`
