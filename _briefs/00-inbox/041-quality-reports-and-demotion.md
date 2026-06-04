# Brief 041 — Quality Reports + Demotion Automation

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 040 merged
**Estimated PR size:** small-medium (one trigger + admin queue UI + report button on public instances)
**Primary reference:** `docs/system-authoring-process.md` Section 4 (Trust tier demotion)

---

## Goal

Every public community-tier instance has a "Report a problem" button. Three open quality reports against the same instance automatically demote it from `community` back to `user` (private). Admin can manually adjust at any time.

This is the safety valve that keeps the community tier from filling with junk.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **`system_instance_reports` table already exists** from brief 032.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/041_demotion_trigger.sql` | NEW — trigger on `system_instance_reports` that auto-demotes at threshold |
| `src/components/calculator/ReportInstanceButton.tsx` | NEW — visible on community-tier public instances |
| `src/pages/admin/ReportsQueuePage.tsx` | NEW — admin reviews open reports |
| `src/lib/moderation/reports.ts` | NEW — file / resolve / dismiss helpers |
| Tests | Three reports → instance demoted automatically; admin can resolve a report |
| `docs/system-authoring-process.md` | UPDATE — demotion runbook |

## Trigger

```sql
CREATE OR REPLACE FUNCTION public.demote_instance_on_threshold()
RETURNS TRIGGER AS $$
DECLARE
  v_open_count INTEGER;
  v_threshold  INTEGER := 3;
BEGIN
  SELECT COUNT(*) INTO v_open_count
    FROM system_instance_reports
   WHERE system_instance_id = NEW.system_instance_id
     AND status = 'open';
  IF v_open_count >= v_threshold THEN
    UPDATE system_instances
       SET trust_tier = 'user',
           visibility = 'private',
           readiness_notes = COALESCE(readiness_notes, '') ||
             E'\n[auto-demoted ' || now()::text || ' after ' || v_open_count || ' open reports]'
     WHERE id = NEW.system_instance_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER instance_reports_demote AFTER INSERT ON system_instance_reports
  FOR EACH ROW EXECUTE FUNCTION public.demote_instance_on_threshold();
```

## Admin queue

`/admin/reports` shows open reports grouped by `system_instance_id`. Each report can be:
- **Resolved** — sets `status = 'resolved'`; the instance count goes down (no automatic re-promotion, admin must manually restore community status)
- **Dismissed** — sets `status = 'dismissed'`; doesn't affect demotion count
- **Reviewing** — intermediate state

## PR description template

```markdown
## Brief 041 — Quality Reports + Demotion Automation

Adds the "Report a problem" surface on public community-tier instances. Three open reports auto-demote the instance.

### Routes added

- `/admin/reports`
- Report button inline on community-tier calculator pages

### Schema

- Migration 041: trigger on `system_instance_reports` for auto-demotion

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Filing 3 reports demotes the instance to user / private
- [ ] Admin can resolve / dismiss reports
- [ ] PR base branch is `main`
```

## Stop points

- Demotion threshold: 3 may need tuning. Mark it `v_threshold INTEGER := 3;` and surface a TODO comment in the migration so it's findable.

## After this PR merges

The multi-supplier foundation is complete. The remaining briefs (042 + 043) add Discount Fencing as the second supplier on the platform, demonstrating end-to-end that the architecture scales without code changes.