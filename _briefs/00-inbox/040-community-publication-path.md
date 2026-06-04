# Brief 040 — Community Publication Path (moderation queue + verified auto-approve)

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 038 merged + brief 039 merged
**Estimated PR size:** medium (schema migration + workflow logic + admin moderation surface + user request flow)
**Primary reference:** `docs/system-authoring-process.md` Section 4

---

## Goal

Users can request promotion of a private user-tier `system_instance` to a community-tier public one. Verified-supplier-authored instances bypass the queue (auto-approve). Pricing stays per-user even when the structure is shared.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **Public publication requires `readiness_status = 'spreadsheet_tested'` minimum** (from brief 038). Lower readiness = "not ready to publish".
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/040_publication_requests.sql` | NEW — `publication_requests` table |
| `src/pages/my/MyCalculatorEditPage.tsx` | UPDATE — add "Request public publication" button |
| `src/pages/admin/ModerationQueuePage.tsx` | NEW — admin reviews requests |
| `src/lib/publication/requests.ts` | NEW — create / approve / reject helpers |
| `src/pages/CalculatorPickerPage.tsx` (or wherever public picker lives) | UPDATE — surface community-tier instances behind a feature flag |
| Tests | Workflow: user requests → admin approves → instance flips to `community` + `public` |
| `docs/system-authoring-process.md` | UPDATE — moderation flow runbook |

## Schema

```sql
CREATE TABLE publication_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_instance_id  UUID NOT NULL REFERENCES system_instances(id) ON DELETE CASCADE,
  requested_by        UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','withdrawn')),
  message             TEXT,
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,
  decision_note       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publication_requests_status ON publication_requests(status);
CREATE INDEX idx_publication_requests_instance ON publication_requests(system_instance_id);
```

## Workflow

1. User on `/my/calculators/:id/edit` clicks "Request public publication" (visible only when `readiness_status >= spreadsheet_tested`)
2. Request row inserted with `status = 'pending'`
3. Admin sees the request in `/admin/moderation`
4. Approve: `system_instances.visibility = 'public'`, `trust_tier = 'community'`, request `status = 'approved'`
5. Reject: instance unchanged, request `status = 'rejected'` with decision_note (surfaces to user as "needs work")
6. Verified-supplier authorship (the user's `suppliers.trust_tier = 'verified'`) auto-approves on request

## PR description template

```markdown
## Brief 040 — Community Publication Path

Adds the request-and-approve workflow for promoting private user-authored system_instances to community-tier public. Verified-supplier authorship auto-approves.

### Routes added

- `/admin/moderation` (admin queue)
- "Request public publication" button on `/my/calculators/:id/edit`

### Schema

- Migration 040: `publication_requests` table

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] User can request from a `spreadsheet_tested` instance
- [ ] User CANNOT request from a `calculator_ready` or lower instance
- [ ] Admin approve flips visibility + trust_tier
- [ ] Verified-supplier request auto-approves
- [ ] PR base branch is `main`
```

## Stop points

- If "verified supplier" verification flow doesn't exist yet (it's a future brief), the auto-approve check just looks at `suppliers.trust_tier = 'verified'` and trusts an admin must have set that. Acceptable; surface to Liam.

## After this PR merges

Brief 041 adds **quality reports + demotion automation** — the safety valve for community content.