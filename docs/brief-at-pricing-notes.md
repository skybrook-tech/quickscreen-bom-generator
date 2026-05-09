# Brief AT Pricing Notes

Source: `glassoutletonline.com.au` supplier portal, captured 2026-05-09.

## Seeded Pricing Scope

- Staged supplier pricing lives in `supabase/seeds/glass-outlet/pricing-2026-05-09.json`.
- The staging file is regenerated from the companion catalogue markdown with `npm run prices:brief-at`.
- Migration `024_seed_supplier_prices_2026_05_09.sql` applies the staged SKUs idempotently to `product_components` and `pricing_rules`.
- The local fallback catalogue seed is also refreshed so the sandbox can price these SKUs before Supabase is connected.

The companion file produced 187 SKU rows after expanding POSTA characters. One cross-listed duplicate was de-duplicated, and five anomaly SKUs were excluded from the dated staging seed pending supplier confirmation, leaving 181 staged SKUs.

## Supplier Review Required

These prices were intentionally left out of the 2026-05-09 staging seed:

- `TC-H-AT-B` and `TC-H-AT-2L-B`: same captured price despite different leg configuration.
- `ENDURO-SSC-60` and `ENDURO-SSRES`: 60ml and 500ml stainless coating captured at the same price.
- `MR-FLGG-S`: satin captured cheaper than polish, reversing the usual finish relationship.

## Brief AO Correction

Latch finish pricing should treat WHITE as parity with BLACK. Polish and satin are the discounted finish tier. Do not apply a broad white discount to latch pricing.

## Brief AK Correction

Diamond Revolution kit totals must be computed from the current SKU prices at runtime. Do not hardcode the kit bundle total; the current suggested-accessory text sums the `REV-*` kit SKUs dynamically.

## Brief AN Bulk-Buy Map

`src/lib/bulkBuyVariants.ts` contains the verified regular-to-BB pairs captured for the BOM bulk-buy hint. The following BB SKUs remain unmapped until the supplier confirms their regular peer:

- `BB-MR-FLGGSS-P`
- `BB-MR-FLGGSS-S`
- `BB-SS-GS`
