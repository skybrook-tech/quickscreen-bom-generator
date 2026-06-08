---
name: deploy-preview-qa-verification
id: cmp97rr6f03hr07adjmial73c
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# deploy-preview-qa-verification

> Systematic methodology for verifying AI-generated code on deploy previews. Catches "claimed-fixed but actually broken" bugs that source-code-only review misses.

## When to use
(not specified)

## Documentation
# Deploy Preview QA Verification

## The Problem

AI coding agents claim fixes are shipped when they're not. Across 30+ briefs, multiple items were marked "fixed" in discovery logs and PR descriptions but were **still broken on the live deploy preview**. Examples:
- Duplicate height dropdown: claimed fixed in BE and BI, still rendering twice on deploy preview
- BOM abbreviation parens "(B)": claimed fixed in BE.B.8, still showing on deploy preview
- Default gap size: code looked correct in source, but the wrong default was being applied at runtime

**Root cause:** AI agents verify by reading source code, not by running the app. Source-level correctness doesn't guarantee runtime correctness (render bugs, state initialization order, cached values, multiple code paths).

## The Verification Protocol

### Step 1: Open the deploy preview (not localhost)
- Get the deploy preview URL from the PR's CI checks (Netlify, Vercel, etc.)
- Pattern: `deploy-preview-{PR#}--{site-name}.netlify.app`
- Wait for the build to complete — don't check a stale preview
- If no deploy preview exists, the PR should NOT be merged until one is verified

### Step 2: Walk every acceptance criterion on the live app
For each checkbox in the brief's acceptance criteria:
1. Perform the exact user action described
2. Observe the actual result on screen
3. Compare against the expected result in the criterion
4. Screenshot any failures

### Step 3: Check for regressions
Walk the "cross-cutting" checklist:
- Test all buttons/controls in the affected area
- Check adjacent features that weren't supposed to change
- Verify state persistence (refresh the page, check if settings survive)

### Step 4: Document findings with evidence
For each item:
- **PASS**: brief note of what was verified
- **FAIL**: screenshot + description of actual vs expected
- **PARTIAL**: what works, what doesn't, specific failure condition

## The "Claimed-Fixed" Detection Pattern

When reviewing a PR that references carry-over fixes from prior briefs:

1. **Don't trust the PR description.** "Fixed in this PR" may mean "I edited the source file" not "I verified on the running app"
2. **Check the deploy preview for each carry-over item specifically.** These are the most likely to be broken because the agent may have only partially fixed them
3. **Look for the exact symptom described in the original bug report.** Don't just check that the code looks right — reproduce the original bug on the preview
4. **If a carry-over fix has been claimed-fixed twice and is still broken**, flag it with explicit verification language: "Verified on deploy preview, not just in source. The fix MUST be confirmed on the live preview before marking complete."

## Audit Checklist Template

```markdown
## Deploy Preview Audit — Brief [X]

**Preview URL:** [url]
**Build status:** [green/pending/failed]
**Audited by:** [name/agent]
**Date:** [date]

### [X].1 — [Item name]
- Action taken: [what I clicked/typed]
- Expected: [per acceptance criterion]
- Actual: [what happened]
- Status: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
- Screenshot: [if failure]

### [X].2 — [Item name]
[...]

### Regression check
- [ ] All buttons respond to clicks
- [ ] All dropdowns open/close correctly
- [ ] All inputs commit values on Tab/Enter/blur
- [ ] State persists across page refresh
- [ ] No console errors
- [ ] No visual layout breaks
```

## When to Use This vs Source-Only Review

| Situation | Source review sufficient? | Deploy preview needed? |
|-----------|-------------------------|----------------------|
| Logic-only change (algorithm, data transform) | ✅ Usually | Nice to have |
| Visual/UI change (styling, layout, text) | ❌ No | ✅ Required |
| State management change (defaults, init, reset) | ❌ No | ✅ Required |
| Carry-over fix (previously claimed-fixed) | ❌ No | ✅ Required |
| New component/feature | ❌ No | ✅ Required |
| Rename/remove dead code | ✅ Usually | Nice to have |

## Integration with Brief Workflow

Add to every brief's acceptance criteria for visual/UI items:
```markdown
- [ ] Verified on deploy preview after CI build (visual confirmation, not just source code claim)
```

Add to carry-over fixes:
```markdown
- [ ] Fix verified on deploy preview — this item was claimed-fixed in [prior brief] but was still broken
```

## Scripts
None
