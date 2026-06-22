> **Salvage paper trail.** Ported from fork brief 035 as part of SALVAGE-PLAN Phase B.
> Adaptations for main: reused main's existing AdminGuard/AdminLayout/ProfileContext; dropped the
> fork's supplier-portal supplier_staff self-scoping (kill-listed) so pages are admin-only; new
> product CRUD mounted at /admin/catalog to avoid colliding with the existing /admin/products;
> staging tables ported as migration 038_staging_tables.sql (fork 062 — ImportPage hard-depends).

# Brief 035 — Admin UI: Suppliers + System Instances CRUD

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 033 merged
**Estimated PR size:** medium (new admin pages, form components, no schema change)
**Primary reference:** `docs/system-authoring-process.md` Section 3 (Authoring Workflow) — Steps 1 + 2

---

## Goal

Build the first slice of the form-driven authoring surface: Liam can add new suppliers and system_instances through the admin UI without editing JSON or running raw SQL. This is the click-path that replaces "edit seed JSON, commit, push" for the supplier/instance level. Products + rules come in briefs 036 + 037.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Admin gating:** all new routes require `profiles.role = 'admin'` (matches existing migration 025 pattern).
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `src/pages/admin/SuppliersListPage.tsx` | NEW — table view + "New supplier" button |
| `src/pages/admin/SupplierEditPage.tsx` | NEW — create / edit one supplier |
| `src/pages/admin/SystemInstancesListPage.tsx` | NEW — filter by supplier, by archetype |
| `src/pages/admin/SystemInstanceEditPage.tsx` | NEW — create / edit one instance; readiness_status, trust_tier, visibility fields |
| `src/components/admin/SupplierForm.tsx` | NEW — controlled form, hooks into multiSupplier queries from brief 032 |
| `src/components/admin/SystemInstanceForm.tsx` | NEW — controlled form |
| `src/lib/multiSupplier/mutations.ts` | NEW — Supabase upsert/update/delete (admin-only via RLS) |
| `src/App.tsx` (or equivalent router config) | UPDATE — add admin routes under `/admin/...` with admin guard |
| `src/components/admin/AdminGuard.tsx` | NEW — reads profile.role, redirects non-admins |
| Tests | `src/components/admin/__tests__/SupplierForm.test.tsx`, ditto for SystemInstanceForm |
| `docs/app-overview.md` | UPDATE — list new admin routes |

## Routes

- `/admin/suppliers` — list, search, create
- `/admin/suppliers/:slug/edit` — edit one supplier
- `/admin/system-instances` — list, filter by supplier or archetype
- `/admin/system-instances/:id/edit` — edit one instance

## Form spec — Supplier

Fields (matches `suppliers` columns):
- Slug (text, lowercase-hyphenated, required, unique)
- Name (text, required)
- Logo URL (text, optional)
- Brand colour (text, hex format, optional)
- Contact email (text, optional, valid email)
- Trust tier (select: platform / verified / community / user) — **only admins can set platform/verified; non-admins forced to `user`**
- Status (select: active / hidden / draft / discontinued)
- Metadata (textarea, JSON) — collapsed by default

Validation via the Zod schema from brief 032 (`supplierSchema`).

## Form spec — System Instance

Fields:
- Supplier (select — populated from `listSuppliers()`)
- Archetype (select — populated from `listArchetypes()`, grouped by family)
- Slug (text, lowercase-hyphenated, required, unique within supplier)
- Name (text, required)
- Description (textarea)
- Status (select)
- Readiness status (select — informational only here; transitions handled in brief 037/038)
- Trust tier (select; admin-only for platform/verified)
- Visibility (select: private / org_shared / public)
- Readiness notes (textarea)

## Empty states + helpers

- "No suppliers yet" empty state on `/admin/suppliers` with a "Create your first supplier" button
- Slug auto-generation from Name on supplier create (slugify, lowercase)
- "Promote to verified" / "Demote to community" buttons on supplier edit (admin only, gated by trust_tier dropdown)

## Tests

- Form renders all fields
- Submit calls the right mutation with snake_cased payload
- Zod validation surfaces errors inline
- AdminGuard redirects non-admins to `/`

## PR description template

```markdown
## Brief 035 — Admin UI: Suppliers + System Instances CRUD

First slice of the form-driven authoring surface. Liam can now create / edit suppliers and system instances through the UI instead of seeded JSON.

### Routes added

- `/admin/suppliers` (list)
- `/admin/suppliers/:slug/edit`
- `/admin/system-instances` (list + filters)
- `/admin/system-instances/:id/edit`

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Non-admin redirected from /admin routes
- [ ] Supplier CRUD: create → edit → archive works end-to-end
- [ ] System instance CRUD: same
- [ ] Trust tier dropdown hides platform/verified for non-admin
- [ ] PR base branch is `main`
```

## Stop points

- If routing library differs from what this brief assumes (currently react-router-dom v6), align route definitions.
- If existing admin sections live somewhere other than `/admin/...`, surface and align naming.

## After this PR merges

Brief 036 (Products CRUD + bulk CSV import) builds on these admin pages, so the same shell/layout/AdminGuard components get reused.