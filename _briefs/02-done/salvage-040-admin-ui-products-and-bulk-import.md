> **Salvage paper trail.** Ported from fork brief 036 as part of SALVAGE-PLAN Phase B.
> Adaptations for main: reused main's existing AdminGuard/AdminLayout/ProfileContext; dropped the
> fork's supplier-portal supplier_staff self-scoping (kill-listed) so pages are admin-only; new
> product CRUD mounted at /admin/catalog to avoid colliding with the existing /admin/products;
> staging tables ported as migration 038_staging_tables.sql (fork 062 — ImportPage hard-depends).

# Brief 036 — Admin UI: Products CRUD + Bulk CSV / Cin7 Mass-Download Import (staging + diff)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 035 merged
**Estimated PR size:** large (one schema migration for staging tables + parser + diff UI + Products CRUD)
**Primary reference:** `docs/multi-supplier-platform-architecture.md` "Import & Review Pipeline"

---

## Goal

Build the product authoring surface, including the **staging + diff** import pipeline that takes a supplier's mass-download (CSV or Cin7-style XLSX) and turns it into approved catalogue rows + price book items.

Today: Liam edits seed JSON files by hand. After this brief: Liam uploads a Cin7 mass-download or a CSV, sees a diff against the current catalogue, approves item-by-item, and publishes. The system writes to `products`, `pricing_rules` (legacy fallback), and (via brief 034) `price_books` + `price_book_items`.

**Reference format:** Cin7 Inventory mass-download (XLSX) with the columns we've observed in Liam's wholesale timber supplier export:
- `ProductId`, `ManufacturerSKU`, `SupplierSKU`, `ShortDescription`, `Size`, `Colour`
- `Custom1`, `Custom2`, `Custom3` (free-text taxonomy slots — used by some suppliers as category / sub-category)
- `SupplierBuy`, `BuyPriceEx`, `DirectCosts`, `RRP`, `POSPriceMarkupTarget`
- (51 columns total; only ~15 are typically used)

The parser is **format-pluggable** — Cin7 mass-download is the first parser; generic CSV is the second; further per-supplier parsers are additive.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Imports write to staging tables only.** Live catalogue / pricing tables are touched only on approval.
- **Approval is item-by-item** — never bulk-approve without explicit click.
- **Admin only:** the import UI requires `profiles.role = 'admin'`.
- **PR base branch is `main`.**
- **Draft PR only.**
- **Skip Deno integration job.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/036_staging_tables.sql` | NEW — `staging_products`, `staging_price_book_items`, `import_runs` tables |
| `src/lib/imports/parsers/cin7-mass-download.ts` | NEW — XLSX → staging rows |
| `src/lib/imports/parsers/generic-csv.ts` | NEW — CSV → staging rows |
| `src/lib/imports/parsers/index.ts` | NEW — registry of parsers by format |
| `src/lib/imports/diff.ts` | NEW — diff staging vs current catalogue (new / changed / unmapped / removed) |
| `src/lib/imports/__tests__/cin7-parser.test.ts` | NEW — sample input → expected staging rows |
| `src/lib/imports/__tests__/diff.test.ts` | NEW |
| `src/pages/admin/ProductsListPage.tsx` | NEW — filter by supplier/instance |
| `src/pages/admin/ProductEditPage.tsx` | NEW — create/edit one product |
| `src/pages/admin/ImportPage.tsx` | NEW — upload, parse, diff, approve flow |
| `src/components/admin/ProductForm.tsx` | NEW |
| `src/components/admin/DiffTable.tsx` | NEW — three-column diff view |
| `docs/seed-data-mapping-spec.md` | UPDATE — add Cin7 mass-download mapping table |
| `docs/app-overview.md` | UPDATE — list new admin routes |

## Staging tables

```sql
-- 036_staging_tables.sql
CREATE TABLE import_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  source_format   TEXT NOT NULL,            -- 'cin7_mass_download', 'generic_csv', etc.
  source_filename TEXT,
  status          TEXT NOT NULL DEFAULT 'parsing'
                  CHECK (status IN ('parsing','ready_for_review','approved','rejected','imported')),
  row_count       INTEGER,
  authored_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staging_products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id  UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  supplier_id    UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  sku            TEXT,
  name           TEXT,
  raw_payload    JSONB NOT NULL,            -- the original row, verbatim
  mapped_payload JSONB,                     -- normalised against canonical product schema
  decision       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (decision IN ('pending','approve','reject','needs_review')),
  decision_note  TEXT,
  decided_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at     TIMESTAMPTZ
);

CREATE TABLE staging_price_book_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id  UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  sku            TEXT NOT NULL,
  tier_code      TEXT NOT NULL DEFAULT 'tier1',
  min_quantity   INTEGER NOT NULL DEFAULT 1,
  price_cents    INTEGER,
  raw_payload    JSONB
);

-- Standard indexes + admin-only RLS (matches brief 032 pattern).
```

## Cin7 parser sketch

```typescript
// src/lib/imports/parsers/cin7-mass-download.ts
import { read, utils } from 'xlsx';
import { z } from 'zod';

const Cin7Row = z.object({
  ProductId: z.number().or(z.string()),
  ManufacturerSKU: z.string().nullable().optional(),
  SupplierSKU: z.string().nullable().optional(),
  ShortDescription: z.string(),
  Size: z.string().nullable().optional(),
  Colour: z.string().nullable().optional(),
  Custom1: z.string().nullable().optional(),
  Custom2: z.string().nullable().optional(),
  Custom3: z.string().nullable().optional(),
  BuyPriceEx: z.number().nullable().optional(),
  RRP: z.number().nullable().optional(),
});

export async function parseCin7MassDownload(
  fileBuffer: ArrayBuffer,
): Promise<ParsedRow[]> {
  const wb = read(fileBuffer);
  const ws = wb.Sheets['Product Master'];
  // Header row is the row whose A column = 'ProductId' (typically row 10).
  const headerRow = findHeaderRow(ws, 'ProductId');
  const rows = utils.sheet_to_json(ws, { range: headerRow, defval: null });
  return rows
    .map((r) => Cin7Row.safeParse(r))
    .filter((r) => r.success)
    .map((r) => normaliseCin7Row(r.data));
}

function normaliseCin7Row(row): ParsedRow {
  // sku = ManufacturerSKU || SupplierSKU || `cin7-${ProductId}`
  // name = ShortDescription
  // type inferred from ShortDescription tokens or from Custom1/2/3
  // dimensions parsed from Size string ("100 x 75", "1800") with regex
  // price_cents = Math.round(BuyPriceEx * 100)
  // ...
}
```

## Diff UI

A three-column view per row:

| Column | Content |
|---|---|
| Current catalogue | The existing product row (if any) matching by SKU |
| Staged | The parsed row from the upload |
| Decision | Buttons: Approve · Reject · Needs review · (auto-mapped if identical) |

Bulk actions (top of table): "Approve all new", "Approve all unchanged" (no-op confirmation), "Reject all unmapped".

## PR description template

```markdown
## Brief 036 — Admin UI: Products CRUD + Bulk CSV / Cin7 Import

Adds the product authoring surface and a staging-and-diff bulk-import pipeline. Cin7 mass-download is the first parser; generic CSV is the second.

### Routes added

- `/admin/products` (list, filter by supplier/instance)
- `/admin/products/:id/edit`
- `/admin/imports/new` (upload + parse)
- `/admin/imports/:runId/review` (diff + approve)

### Staging tables added (migration 036)

- `import_runs`
- `staging_products`
- `staging_price_book_items`

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Cin7 sample fixture parses correctly (52 rows → 52 staged products)
- [ ] Diff view correctly classifies new / changed / unchanged / unmapped
- [ ] Approving a row creates a `products` row tagged with the right supplier + instance
- [ ] Approving rows with prices creates `price_book_items` rows
- [ ] PR base branch is `main`
```

## Stop points

- Cin7 column variation: if a supplier's mass-download is missing the `Custom1/2/3` slots or uses different price column names (`SaleUnitPrice`, `DefaultPriceTier1`), the parser must surface unmapped fields rather than silently dropping them.
- Existing image upload pipeline: if Supabase storage isn't wired up, product image upload is a stop-point — surface and skip image fields in this brief.

## After this PR merges

Brief 037 builds the **rule authoring** form (template binding + data-driven math) on top of these admin pages. Brief 038 builds the workbook regression upload + diff view, which is the bridge from `imported` → `calculator_ready` → `approved` for new system instances.