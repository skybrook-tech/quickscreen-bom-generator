# Seeds — multi-tenant layout, onboarding & data ownership

Seed data is organised **per tenant org**, one directory per org slug:

```
supabase/seeds/
  organizations.sql            # org rows (name, slug, branding) — idempotent upserts
  seed-auth.js                 # test/admin users per org (ORGS array)
  schemas/                     # JSON Schemas the product seeder validates against
  tools/seed-products.js       # the product/catalogue seeder (see "Commands")
  glass-outlet/
    products/*.json            # per-product seed files (org_slug: "glass-outlet")
    seed-images.js             # GO product images (org-specific, see warning inside)
    assets/
  amazing-fencing/
    products/*.json            # per-product seed files (org_slug: "amazing-fencing")
```

Each `products/*.json` file carries `org_slug` plus up to four sections, applied
in dependency order: `products` → `product_components` → `pricing_rules` →
`calculator_configs` (per-org sparse `CalculatorConfig` overlay patches for
`supplier_product_calculator_configs`; arrays REPLACE the base, objects merge).
The seeder cross-checks `org_slug` against the directory name and fails loudly
on a mismatch, so a copy-pasted file can't seed one org's SKUs into another.

## Commands

| Command | What it does |
|---|---|
| `npm run seed:products` | Seed **all** orgs' product files (upsert; respects the ownership guard below) |
| `npm run seed:products -- --org <slug>` | Seed **one** org only — the onboarding default; never touches other orgs' rows |
| `npm run seed:products -- --org <slug> --force` | Also overwrite rows edited in the app (`managed_by=ui`) and reclaim them for the seed |
| `npm run seed:auth` | Create/verify test users for every org in the `ORGS` array (idempotent) |
| `npm run db:reset` | Full reset: migrations + `organizations.sql` + all seeds — **only needed for schema changes**, never for onboarding |

Remote variants (`seed:products:remote`, `seed:auth:remote`) read `.env.production`.

## Onboarding a new customer (no db reset)

Everything is incremental and idempotent; a reset is only required for new
migrations. For a new org `acme-fencing`:

1. **Org row**: add an `INSERT ... ON CONFLICT (slug) DO UPDATE` block to
   `organizations.sql` (keeps reset parity), then apply it to the live DB:
   ```bash
   psql "$DATABASE_URL" -f supabase/seeds/organizations.sql
   ```
   ⚠️ This re-applies **branding** for existing orgs too (`DO UPDATE SET
   branding`) — if an org's branding was changed live, update the SQL first.
2. **Catalogue**: create `supabase/seeds/acme-fencing/products/*.json`
   (`org_slug: "acme-fencing"`; copy an existing org's file as a template).
   If they reuse an existing product code (e.g. `COLORBOND`) with different
   rules, add a `calculator_configs` overlay in the same file. If they need a
   genuinely **new fence family**, that's engine work first — follow
   AGENTS.md § 11a (includes the `chk_system_types_values` migration).
3. **Seed just that org**:
   ```bash
   npm run seed:products -- --org acme-fencing
   ```
4. **Users**: add the org + users to the `ORGS` array in `seed-auth.js`, then
   `npm run seed:auth`. (The signup trigger reads `user_metadata.org_id`;
   the script verifies every profile landed in the intended org.)
5. Log in as the new org's user — the product picker shows only their
   `products` rows (RLS-scoped).

Images are currently Glass-Outlet-only (`glass-outlet/seed-images.js`); see the
warning in that file before adapting it (flat storage keys collide across orgs).

## Data ownership: `managed_by` (seed vs app edits)

Two writers exist for catalogue/pricing data: the seed JSON in git, and —
eventually — in-app editing (price uploads, admin edits). To stop a seed run
from silently rolling back a customer's live price changes:

- Every component row the seeder writes is stamped
  `metadata.managed_by: "seed"`.
- Any surface that lets a user edit a component/price **must set
  `metadata.managed_by: "ui"`** on the rows it changes. That flips ownership.
- The seeder **refuses** to update a `managed_by=ui` component (or its
  `pricing_rules` — ownership is per-SKU and covers both, since
  `pricing_rules` has no metadata column). It fails loudly listing the
  conflicting SKUs.
- To deliberately overwrite, either copy the live values back into the seed
  JSON first (git stays the audit trail) or run with `--force`, which
  overwrites and re-stamps the rows as seed-managed.

Notes:
- Sections are applied per file without a wrapping transaction, so a refused
  run may already have applied earlier sections (`products`) — harmless, as
  every section is an idempotent upsert.
- `verifyRowCounts` floors are global sanity checks across all orgs, not
  per-org counts.
- Long-term direction (docs/vendor-model-plan.md § 7 item 4): once supplier
  self-service price editing ships, add a per-org `seed:dump` export so the
  sync direction can be reversed deliberately (DB → seed JSON snapshot)
  instead of fighting over rows.
