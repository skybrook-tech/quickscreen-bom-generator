# 04 — Canonical Product Name Contract

The calculator engine emits **supplier-agnostic canonical product names**. A separate supplier-mapper resolves each canonical name to a specific supplier's SKU, price, pack size, and availability. This two-layer split (see `01`) is core architecture — **never bake a supplier SKU into the engine output.**

## The naming pattern

```
[sizing]  [descriptive type]  [material label]  [stock length if length-sold]
```

1. **Sizing first** — e.g. `100x75`, `57mm`, `75x50`.
2. **Descriptive type next** — e.g. `Ring Shank`, `Smooth Shank`, `Rough Sawn`.
3. **Material label always present** — e.g. `Treated Pine`, `Hardwood`.
4. **Stock length appended for length-sold items** — e.g. `4800mm`.

## Canonical examples (exact strings)

| Canonical name | Notes |
|---|---|
| `100x75 Treated Pine Post` | sold each |
| `75x38 Treated Pine Rail 4800mm` | length-sold → stock length in the name |
| `57mm Ring Shank Gal Nail` | fastener, type before material |
| `75x50 Treated Pine Capping Rail 4800mm` | the lapped-and-capped top rail |

## Stability rules (this is a CONTRACT)

- **Names are STABLE.** No renames without an explicit **version bump** of the contract.
- **Adding new canonical names is fine** (non-breaking).
- **Renaming an existing canonical name is a BREAKING CHANGE** for every downstream supplier-mapper — it silently breaks SKU resolution. Treat renames like a database migration.
- The mapper keys on the canonical string. Whitespace, casing, and order matter — keep them exact.

## Why this is non-negotiable

The whole platform's promise — "a supplier keeps their own product codes, and one BOM prices against any supplier" — depends on a stable canonical vocabulary in the middle. If the engine's output names drift, every supplier price book mapping breaks at once. Antigravity must treat the canonical name list as an append-only, versioned interface.

## Implementation guidance for the build

- Keep a single **canonical-names registry** (a typed enum/table) that both the engine (producer) and the supplier-mapper (consumer) import. One source, two sides.
- Add a CI check: if a canonical name string changes, fail the build unless the contract version is bumped and a migration note is added.
- The supplier-mapper table is roughly: `canonical_name → { supplier_id, supplier_sku, price_aud, pack_size, stock_status }` (many suppliers per canonical name).
