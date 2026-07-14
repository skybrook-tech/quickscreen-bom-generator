# Seeds — multi-tenant layout, onboarding & data ownership

Seed data is organised **per tenant org**, one directory per org slug:

```
supabase/seeds/
  seed-auth.js                 # test/admin login fixtures per org (USERS_BY_SLUG)
  schemas/                     # JSON Schemas the product seeder validates against
  tools/orgs.js                # shared org.json loader (single source of org identity)
  tools/seed-orgs.js           # upserts organisations rows from org.json
  tools/seed-products.js       # the product/catalogue seeder (see "Commands")
  tools/seed-org-logos.js      # uploads each org's logo, sets organisations.logo_url
  glass-outlet/
    org.json                   # org row: name, slug, branding (incl. cssVars)
    products/*.json            # per-product seed files (org_slug: "glass-outlet")
    seed-images.js             # GO product images (org-specific, see warning inside)
    assets/logo.png            # org logo (optional; falls back to an initials badge)
  amazing-fencing/
    org.json                   # org row: name, slug, branding
    products/*.json            # per-product seed files (org_slug: "amazing-fencing")
```

Each org's identity + branding lives in **`<slug>/org.json`** (`name`, `slug`,
`branding`), upserted by `npm run seed:orgs` — a service-role upsert that works
the same locally and on remote (no `psql`), and **never overwrites live branding
without `--force`**. It replaces the old `organizations.sql`.

Each `products/*.json` file carries `org_slug` plus up to four sections, applied
in dependency order: `products` → `product_components` → `pricing_rules` →
`calculator_configs` (per-org sparse `CalculatorConfig` overlay patches for
`supplier_product_calculator_configs`; arrays REPLACE the base, objects merge).
The seeder cross-checks `org_slug` against the directory name and fails loudly
on a mismatch, so a copy-pasted file can't seed one org's SKUs into another.

## Commands

| Command | What it does |
|---|---|
| `npm run seed:orgs` | Upsert the `organisations` rows from every `<slug>/org.json` (insert-if-missing; preserves live branding) |
| `npm run seed:orgs -- --org <slug>` | Upsert **one** org only — the onboarding default |
| `npm run seed:orgs -- --force` | Also overwrite name + branding of existing orgs from `org.json` |
| `npm run seed:products` | Seed **all** orgs' product files (upsert; respects the ownership guard below) |
| `npm run seed:products -- --org <slug>` | Seed **one** org only — the onboarding default; never touches other orgs' rows |
| `npm run seed:products -- --org <slug> --force` | Also overwrite rows edited in the app (`managed_by=ui`) and reclaim them for the seed |
| `npm run seed:org-logos` | Upload each org's `assets/logo.*` to storage and set `organisations.logo_url` (all orgs) |
| `npm run seed:org-logos -- --org <slug>` | Seed **one** org's logo only — the onboarding default |
| `npm run seed:auth` | Create/verify test users for every org (from `org.json` + `USERS_BY_SLUG`; idempotent) |
| `npm run db:reset` | Full reset: migrations + `seed:orgs` + `seed:products` + `seed:org-logos` + `seed:auth` — **only needed for schema changes**, never for onboarding |

Remote variants (`seed:orgs:remote`, `seed:products:remote`, `seed:org-logos:remote`,
`seed:auth:remote`) read `.env.production`; `npm run db:seed-remote` chains push +
all four in order. Because org rows are now a service-role upsert, **remote seeding
no longer needs a manual `psql`.**

## Onboarding a new customer (no db reset)

Everything is incremental and idempotent; a reset is only required for new
migrations. For a new org `acme-fencing`:

1. **Org row**: create `supabase/seeds/acme-fencing/org.json`
   (`name`, `slug: "acme-fencing"`, `branding`; copy an existing org's file as a
   template), then upsert it:
   ```bash
   npm run seed:orgs -- --org acme-fencing
   ```
   Works against local or remote (reads `.env.local` / `.env.production`), no
   `psql`. It **won't overwrite** an existing org's live branding — pass `--force`
   to push `org.json` branding deliberately.
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
4. **Logo** (optional): drop the org's logo at
   `supabase/seeds/acme-fencing/assets/logo.png` (or `.jpg`/`.webp`/`.svg`) and
   run `npm run seed:org-logos -- --org acme-fencing`. **Omit this** to have the
   app render a generic initials badge (e.g. "AF") instead — nothing else is
   required. For the PDF export logo, prefer PNG/JPG (react-pdf can't render SVG).
5. **Users**: add the org's login fixtures to `USERS_BY_SLUG` in `seed-auth.js`
   (the org itself is already known from its `org.json`), then `npm run seed:auth`.
   (The signup trigger reads `user_metadata.org_id`; the script verifies every
   profile landed in the intended org.)
6. Log in as the new org's user — the product picker shows only their
   `products` rows (RLS-scoped), and the header/catalogue/PDF show their logo (or
   initials badge).

**Logos** are org-driven via `organisations.logo_url`, owned by the org-agnostic
`tools/seed-org-logos.js` (org-prefixed storage keys `logos/<slug>.<ext>` — no
cross-org collision). **Product images** remain Glass-Outlet-only
(`glass-outlet/seed-images.js`); see the warning in that file before adapting it
(flat storage keys collide across orgs).

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
