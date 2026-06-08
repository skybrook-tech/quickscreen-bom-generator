---
name: Xero Supplier Price Connector
id: cmq4urggw0rgw06adr7tytuv5
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: [XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_SCOPES, XERO_TENANT_ID]
---

# Xero Supplier Price Connector

> Connect to a supplier's Xero organisation via Custom Connections (machine-to-machine OAuth2 client_credentials) and pull products + prices from the Accounting API Items endpoint, normalised into Anyfence data-layer rows (own-SKU passthrough, sell + cost price, tax types, qty on hand) ready for the Supplier-Mapper. Stdlib-only Python, no dependencies.

## When to use
(not specified)

## Documentation
# Xero Supplier Price Connector

Pulls a supplier's **products + prices** from their Xero organisation (Accounting API `Items`) and normalises them into **Anyfence data-layer rows** (own-SKU passthrough, sell + cost price, tax types, qty on hand) — ready for the Supplier-Mapper. This is the Phase-1, widest-reach supplier connector (Xero is the dominant AU accounting platform).

The script `xero_connector.py` is **stdlib-only** (uses `urllib`, no `requests`/pip) so it runs anywhere, including Google Antigravity. It honours `HTTPS_PROXY`/`HTTP_PROXY` from the environment automatically.

## Auth model — Xero Custom Connections (client_credentials)

- One Custom Connection = **one Xero organisation** (so **no `xero-tenant-id` header** is needed).
- Token endpoint: `https://identity.xero.com/connect/token`, `grant_type=client_credentials`, HTTP **Basic** auth (`client_id:client_secret`).
- Access tokens expire after **30 minutes**; **no refresh tokens** — just request a new one.
- Reading `Items` requires scope **`accounting.settings.read`**.
- Custom Connections are a **paid Xero add-on (~$10/mo AUD per org)**, available for **AU/NZ/UK/US** orgs only; **free against the Xero demo company** for development.

### Setup (one-time, per supplier)
1. The supplier (or you, on their behalf) purchases Custom Connections for their Xero org.
2. Create a Custom Connection app at developer.xero.com → select scopes (include `accounting.settings.read`) → the authorising user grants access.
3. Copy the **Client ID** and **Client Secret** into this skill's credentials.

## Credentials (env vars)

| Var | Required | Notes |
|---|---|---|
| `XERO_CLIENT_ID` | yes | Custom Connection client ID (app Configuration page) |
| `XERO_CLIENT_SECRET` | yes | Custom Connection client secret (shown once; regenerate if lost) |
| `XERO_SCOPES` | no | space-separated; defaults to `accounting.settings.read`; must match the scopes selected on the connection |
| `XERO_TENANT_ID` | no | not needed for Custom Connections; only for a future multi-org OAuth path |

## CLI

```bash
python xero_connector.py token                  # smoke-test auth (prints a token preview)
python xero_connector.py org                     # organisation name/details (labels the supplier)
python xero_connector.py connections             # tenant connections for this app
python xero_connector.py items [--modified-since 2026-06-01T00:00:00Z] [--where "IsSold==true"] [--order "Code ASC"] [--unitdp 4]
python xero_connector.py item <ItemID-or-Code>
python xero_connector.py normalise [--supplier-id amazing-fencing] [--sold-only] [--modified-since ISO] [--out rows.json]
```

- `--modified-since` → sent as the `If-Modified-Since` header for **incremental sync** (only changed items).
- `--unitdp 4` → 4-decimal price precision (default; Xero rounds to 2 otherwise).
- `--out FILE` → write JSON to a file instead of stdout.

Run with credentials via the skill runtime (e.g. `RunWithCredentials`), which injects the env vars above.

## Importable functions

```python
from xero_connector import (get_access_token, list_items, get_item,
    get_organisation, get_connections, normalise_items)
```

## Accounting API `Items` — fields used

Each item exposes: `Code` (SKU, ≤30 chars, required), `Name` (≤50), `Description` / `PurchaseDescription`, `IsSold`, `IsPurchased`, `IsTrackedAsInventory`, `QuantityOnHand`, `UpdatedDateUTC`, `ItemID` (uuid), and two price blocks — `SalesDetails` and `PurchaseDetails`, each with `UnitPrice`, `AccountCode`, `TaxType` (`PurchaseDetails` also has `COGSAccountCode`).

## Normalised output row (→ Anyfence `supplier_products` / `supplier_prices`)

```json
{
  "source": "xero", "supplier_id": "amazing-fencing",
  "supplier_sku": "100x75-TP-POST", "name": "100x75 Treated Pine Post",
  "description": "H4 in-ground post",
  "sell_price_aud": 28.5, "cost_price_aud": 18.9,
  "sell_tax_type": "OUTPUT", "purchase_tax_type": "INPUT",
  "sell_account_code": "200", "is_sold": true, "is_purchased": true,
  "tracked_inventory": false, "qty_on_hand": 0.0,
  "xero_item_id": "c8c-1", "canonical_name": null,
  "updated_at": "2019-11-14T18:10:38.314000+00:00"
}
```

## Important caveats

- **Retail vs trade:** Xero Items exposes ONE sell price (`SalesDetails` → treated as retail) plus a cost price (`PurchaseDetails`). True contractor **trade-tier** pricing usually lives in Cin7/Unleashed, not core Xero — treat `cost_price_aud` as supplier **cost**, not the trade price.
- **`canonical_name` is intentionally null** — resolving canonical names is the Supplier-Mapper's job, not this connector's. This connector preserves the supplier's own SKUs.
- **Rate limits:** 60 calls/min, 5000/day per org, 5 concurrent.

## Testing status

Verified: clean import (stdlib-only, no deps); missing-creds returns a clean error envelope (exit 1); dummy creds produce a real `HTTP 400 invalid_client` from `identity.xero.com` (proves the request structure + network path); normaliser and `/Date(...)/`→ISO and ISO→HTTP-date conversions are correct.

## Where it fits

Phase 1 of the Anyfence build: feeds the versioned `supplier_price_books` table in the data layer. Companion connectors (not in this skill): Cin7 Core (generalise the Amazing Fencing import), Unleashed, Frameworks, and an own-tool uploader for the un-digitised long tail.

## Scripts
xero_connector.py
