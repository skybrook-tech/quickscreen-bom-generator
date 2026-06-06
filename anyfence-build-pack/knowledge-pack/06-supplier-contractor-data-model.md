# 06 — Supplier & Contractor Backend Data Model (PROPOSED)

> **Status: PROPOSED.** This is a recommended relational model for the supplier + contractor backends. Antigravity may adapt names/normalisation — but **preserve these invariants:** (1) suppliers keep their own SKUs end-to-end, (2) everything joins through the **canonical product name** registry, (3) supplier price books are **versioned** (never overwrite a price — append a new version), (4) a quote carries **cost, revenue, and margin** so margin is visible before send.

## The four data sources (the moat)

```
calculator BOM  ×  versioned supplier price book  ×  quote object  ×  accounting actuals
```
The schema below makes all four joinable. That join is the defensible product.

## Core tables

### Canonical registry (the hub everything joins through)
```
canonical_products
  canonical_name      PK   -- e.g. "100x75 Treated Pine Post"  (see 04 — versioned, stable)
  category                 -- post | rail | paling | gate_kit | ...
  unit                     -- each | length
  contract_version
```

### Suppliers
```
suppliers
  id PK, name, abn, hq_state, business_type   -- manufacturer | distributor | retailer | combination
  website, tier                                -- A | B | C (outreach priority)

supplier_price_books
  id PK, supplier_id FK, version, effective_from, source, currency='AUD'
  -- VERSIONED. A new price list = a new row, never an update.

supplier_products
  id PK, supplier_id FK
  supplier_sku             -- the supplier's OWN code (external_sku / Bunnings I/N). Passthrough.
  canonical_name FK        -- maps to the canonical registry (THE join)
  category, unit, stock_length_mm, pack_size, colour, compliance_class
  dimensions_json          -- paling_width_mm, picket_width_mm, board_width_mm, etc.

supplier_prices
  id PK, price_book_id FK, supplier_product_id FK
  base_price_aud           -- per piece
  price_per_metre_aud      -- when published alongside (timber)
  qty_break_pricing_json   -- [{min_qty, unit_price}]
  stock_status
```

### Contractors
```
contractors
  id PK, business_name, abn, service_regions_json
  subscription_tier        -- e.g. $29/mo entry; JMS upsell tier
  branding_json            -- logo, colours for branded quotes
  labour_rates_json        -- per-metre / per-gate / day-rate

contractor_supplier_links
  contractor_id FK, supplier_id FK, account_ref, default_price_book_id
  -- which supplier(s) a contractor buys from; drives which prices their calculator uses

contractor_price_overrides         -- when a contractor uploads their OWN price list
  contractor_id FK, canonical_name FK, base_price_aud, price_per_metre_aud, qty_break_pricing_json
```

### Fence systems (the calculator configs)
```
fence_systems
  system_id PK, display_name, manufacturer, fence_type
  config_json              -- the validated fence_system_config (see 02), or normalised into components
  schema_version
```

### Quotes (where the four sources meet)
```
quotes
  id PK, contractor_id FK, fence_system_id FK
  supplier_price_book_id FK         -- which price snapshot was used (reproducibility)
  customer_json, job_geometry_json  -- drawn runs, gates, heights
  cost_total_ex, cost_total_inc     -- Σ supplier price × qty
  revenue_total_ex, revenue_total_inc   -- labour + margin
  margin_aud, margin_pct            -- revenue − cost, LIVE before send
  gst_total, status                 -- draft | sent | accepted | booked | won | lost
  created_at

quote_lines
  id PK, quote_id FK
  canonical_name FK, supplier_sku   -- both layers preserved
  qty, unit, ex_price, inc_price, line_cost_ex, line_cost_inc
```

### Marketplace + actuals
```
bookings                            -- consumer marketplace: customer → contractor
  id PK, quote_id FK, customer_id, walkthrough_video_url, status   -- requested | accepted | site_visit | booked

accounting_actuals                  -- the 4th data source (Xero sync)
  id PK, job_id/quote_id FK, actual_cost_aud, actual_revenue_aud, source='xero', synced_at
```

## Margin computation (the headline feature)
```
line_cost   = supplier price (resolved via canonical_name → supplier_products → supplier_prices)
quote line  = line_cost  + contractor labour/markup
cost_total  = Σ line_cost
revenue     = Σ quote line
margin      = revenue − cost_total          -- shown live, before the quote sends
```

## Multi-tenancy & access
- Two tenant types: **suppliers** and **contractors** (plus platform admin). Row-level scoping by `supplier_id` / `contractor_id`.
- **Embed widget** channel: a supplier-scoped, read-mostly calculator that resolves prices against that supplier's current price book and routes leads to contractors linked to that supplier.
- Price-book **versioning is mandatory**: a quote references the exact `supplier_price_book_id` used, so historical quotes remain reproducible when prices change.

## Don't-break principles for Antigravity
1. Never store a supplier price by overwriting — append a price-book version.
2. Never join supplier products to the engine by supplier SKU — always through `canonical_name`.
3. Always persist both `cost` and `revenue` on a quote so margin is queryable.
4. Carry GST ex/inc on every monetary column or compute consistently at one layer.
