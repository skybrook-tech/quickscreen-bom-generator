# Production Cutover Runbook (paused — execute when ready)

**Status:** PAUSED — Liam decides when to execute
**Goal:** point the production Netlify site `tiny-kangaroo-8f7016` at the new repo `quickscreen-colorbond-generator` instead of the original `quickscreen-bom-generator`

---

## When to execute this

Recommended trigger: **after brief 038 merges** (workbook regression infrastructure exists, you trust the platform) AND **before brief 043 merges** (Discount Fencing goes live for your customers).

Earlier than 038 = risk shipping unverified BOMs to real customers. Later than 043 = Discount Fencing seeded but Glass Outlet's customers are still hitting the old repo and won't see DF.

Reasonable cutover candidates:
- After brief 038 — earliest safe cutover
- After brief 041 — full multi-supplier authoring + community path is in
- After brief 044 — visibility layer in place (cleanest end state)

If your existing Glass Outlet customers are running quotes that need pricing accuracy guaranteed during the cutover window, do the cutover during a low-traffic window (typically Saturday morning in Australia).

---

## Pre-cutover checklist

- [ ] All briefs through your chosen cutover point are merged on `main`
- [ ] Migrations have been applied to the production Supabase project
- [ ] `npm run seed:products` has been run against the production Supabase project
- [ ] Smoke test on the new repo's Netlify deploy preview: load 3 Glass Outlet quote types, generate a BOM, confirm pricing matches the current production
- [ ] Customer mode toggle still works
- [ ] PWA install + offline mode still work on iPhone Safari deploy preview
- [ ] The original repo's last commit hash is recorded as a rollback target

## Cutover procedure

### Option A — Re-point existing Netlify project (recommended)

1. In the Netlify UI (`tiny-kangaroo-8f7016`), go to Site settings → Build & deploy → Repository
2. Change the linked repository from `skybrook-tech/quickscreen-bom-generator` to `skybrookai-atlas/quickscreen-colorbond-generator`
3. Set production branch to `main` (not `master`)
4. Trigger a manual deploy
5. Verify the production URL (your tradies' bookmark) now serves the new repo
6. Verify all environment variables (Supabase URL, Google Maps key, etc.) are present

### Option B — New Netlify project + DNS swap

If you'd rather build confidence on a parallel deployment first:

1. Create a new Netlify project pointing at `skybrookai-atlas/quickscreen-colorbond-generator` (default branch `main`)
2. Configure all env vars matching the existing project
3. Wait until ready
4. Update DNS to point the production URL at the new Netlify project
5. Decommission `tiny-kangaroo-8f7016` after a 1-2 week confidence window

Option B is safer (instant DNS rollback). Option A is simpler.

## Post-cutover verification

- [ ] Production URL serves the new repo (confirm via inspect → service worker → cache name reflects new repo)
- [ ] An existing customer's saved quote loads and re-prices to the same total as before cutover
- [ ] A new quote creates correctly and saves to the production Supabase project
- [ ] PDF generation works on iPhone Safari
- [ ] Customer mode still hides cost columns
- [ ] No 4xx/5xx errors in Netlify function logs for ~24 hours post-cutover

## Rollback procedure (if needed)

### From Option A

1. In Netlify UI, change repository back to `skybrook-tech/quickscreen-bom-generator`, branch `master`
2. Trigger manual deploy
3. Verify production URL is serving the old repo again

Rollback window: data divergence depends on what changed between old and new Supabase. If both repos hit the same Supabase project, data is the same; if migrations are not backward-compatible (e.g. brief 032's new tables), the old repo just doesn't see them — non-breaking. **Brief 032's schema is additive (nullable columns + new tables); old repo continues to work against it.**

### From Option B

1. Update DNS back to the old Netlify project
2. Done

---

## Things this runbook does NOT cover

- Domain/SSL changes (assumed: production URL stays the same; only the underlying Netlify project changes)
- Supabase project changes (assumed: same project)
- Customer communication (probably no email needed — cutover is invisible to customers if done right)
- Analytics / observability (separate setup; whatever you have on the current project carries over via Option A, or needs to be re-wired in Option B)

---

## Why this isn't a Codex brief

Codex can't sign in to Netlify or change DNS. This is a Liam-only action. The runbook documents the steps so you don't have to think about them when the time comes.

---

## When you execute this, also...

- Update `_briefs/INVENTORY.md` to record the cutover date
- Update `docs/system-authoring-process.md` Decision log
- Archive the original repo `skybrook-tech/quickscreen-bom-generator` (mark as read-only on GitHub) once the new repo is stable for 2+ weeks
- Notify any Codex agents on the old repo that PRs from there are no longer the production path