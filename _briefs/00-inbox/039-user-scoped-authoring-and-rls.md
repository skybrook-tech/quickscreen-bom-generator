# Brief 039 — User-Scoped Authoring + RLS

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 035 merged (admin CRUD UI shell exists)
**Estimated PR size:** medium (RLS adjustments, form surface mirrors admin, restricted defaults)
**Primary reference:** `docs/system-authoring-process.md` Section 4 (Trust & Moderation Tiers) + Section 7

---

## Goal

Open the authoring surface to logged-in non-admin users with appropriate guardrails:

- Users can create their own `suppliers` (auto-assigned `trust_tier = 'user'`)
- Users can create `system_instances` (auto-assigned `trust_tier = 'user'`, `visibility = 'private'`)
- Users can manage their own products + rules + price books on instances they author
- Users CANNOT promote trust_tier or visibility — those require admin action (until brief 040 ships the community path)
- Quotes built on a user-authored instance are tagged with the user's authored_by and pin the user's own price_book

The user gets a "My Calculators" surface to manage their stuff.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **RLS does the heavy lifting** — frontend reads/writes use the same Supabase client; RLS enforces who can see/write what.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/039_user_authoring_rls.sql` | UPDATE — tighten / loosen RLS policies introduced in 032 + 034 + 036 + 038 so non-admin users can author within scope |
| `src/pages/my/MyCalculatorsPage.tsx` | NEW — list of user-authored system_instances |
| `src/pages/my/MyCalculatorEditPage.tsx` | NEW — reuses `SystemInstanceForm` from admin with restricted fields |
| `src/components/auth/UserOrAdminGuard.tsx` | NEW — allows authenticated users (admin path stays separate) |
| Tests | RLS denial test cases: user A cannot edit user B's supplier; user A's `trust_tier = 'platform'` insert is denied |
| `docs/system-authoring-process.md` | UPDATE Section 7 with user-path runbook |

## RLS adjustments (vs brief 032 baseline)

Brief 032 already allows:
- Anyone authenticated to insert suppliers / system_instances
- Author or admin to update
- Visibility-aware read

Brief 039 tightens:
- INSERT WITH CHECK on `suppliers` adds: `trust_tier IN ('user') OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'` — non-admins forced to `user` tier
- INSERT WITH CHECK on `system_instances` adds the same trust_tier restriction PLUS `visibility = 'private' OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'` — non-admins forced to private
- UPDATE WITH CHECK on `suppliers` blocks non-admins from changing `trust_tier` — the simplest implementation is a trigger that resets `trust_tier` to the previous value if the actor isn't admin
- Mirror policies on `price_books`: non-admins can author/edit drafts; publishing requires admin OR (post-brief-040) verified-supplier role

```sql
-- 039_user_authoring_rls.sql (skeleton)
CREATE OR REPLACE FUNCTION public.enforce_supplier_tier_user_only()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trust_tier <> 'user' AND (SELECT role FROM profiles WHERE id = auth.uid()) <> 'admin' THEN
    NEW.trust_tier := COALESCE(OLD.trust_tier, 'user');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER supplier_tier_guard BEFORE INSERT OR UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_supplier_tier_user_only();

-- Analogous trigger on system_instances for trust_tier + visibility.
```

## My Calculators routes

- `/my/calculators` — user's system_instances
- `/my/calculators/new`
- `/my/calculators/:id/edit`
- `/my/calculators/:id/products` etc — mirrors admin surface but scoped

## PR description template

```markdown
## Brief 039 — User-Scoped Authoring + RLS

Opens the authoring surface to non-admin users with trust_tier + visibility guardrails. Non-admins cannot self-promote to platform/verified or publish publicly without admin approval (briefs 040-041 add that path).

### Routes added

- `/my/calculators` (and child routes)

### Schema added

- Migration 039: triggers on `suppliers` + `system_instances` enforcing user-tier defaults

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] User A's INSERT with `trust_tier = 'platform'` is silently coerced to `user`
- [ ] User A cannot read User B's private `system_instance`
- [ ] User A CAN read public `system_instance` from another supplier
- [ ] Admin can still set any trust_tier
- [ ] PR base branch is `main`
```

## Stop points

- If the existing org model implies team-shared authoring (per-org scope), the policies need org_id checks too. Surface and confirm with Liam: "private" = author-only or org-shared by default?

## After this PR merges

Brief 040 ships the **community publication path** — user can request promotion of their private instance to community-tier public, going through a moderation queue.