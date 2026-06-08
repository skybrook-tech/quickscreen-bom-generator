---
name: codex-pr-brief-template
id: cmp97rqob03hq07adjg32my7g
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# codex-pr-brief-template

> Structured template for writing PR briefs that AI coding agents (Codex, Claude Code, Cursor) can execute autonomously. Battle-tested across 30+ briefs shipping real production code.

## When to use
(not specified)

## Documentation
# Codex PR Brief Template

## What this is

A battle-tested template for writing PR briefs that AI coding agents can execute autonomously. Developed across 30+ briefs (A through BM) shipping real production code on a React + Vite + TypeScript + Tailwind + Supabase + Netlify stack. Works with OpenAI Codex, Claude Code, Cursor background agents, or any AI that reads a spec and writes code.

## Why it works

AI coding agents fail in predictable ways:
1. They skip ambiguous requirements (and ship broken code silently)
2. They claim things are fixed without verifying on the actual running app
3. They don't know when to stop and ask
4. They merge broken builds

This template addresses all four failure modes with structural guardrails.

## The Template

```markdown
# Brief [LETTER] — [Title: verb-noun summary]

**Single PR brief.** Paste this entire file into a fresh Codex thread.

> 📦 **[N] sub-sections.** [Split guidance if large: "Codex MAY split into two PRs..."]

> 🔗 **[Dependency/reversal notes if any]**

---

## Project context

- **Stack:** [e.g. React 19 + Vite + TypeScript + Tailwind + Supabase + Netlify]
- **Repo:** [GitHub URL]
- **Working branch:** `codex/[brief-letter]-[slug]` off `[base-branch]`. Draft PR opens against `[base-branch]`.
- **Form state:** [key state management approach]
- **Skills to load:** [repo-specific skill paths if applicable]
- **Recent shipping context:** [what just merged, relevant commits]

## Permissions

- You MAY add npm dependencies if needed
- You MAY create new files
- You MAY edit [specific scope]
- You MAY [any special permissions needed]

## Definition of done

A brief is NOT shipped until every Acceptance criteria checkbox passes. Treat the checkboxes as a test plan. In the PR body, copy each checkbox with 1-2 sentences below describing the implementation.

## Stop and ask, don't skip

If anything is missing or ambiguous, STOP and report. Don't silently invent [domain-specific things to not invent].

## When you finish

After all sub-sections are implemented and verified locally (`npm run build` passes, smoke check returns 200 on `[app-url]`):

1. **Open the PR** against `[base-branch]`. Title matches the brief. Description copies the Acceptance criteria as a ticked checklist with implementation notes per box. Include before/after screenshots for visual items.
2. **Verify CI passes** — wait for [CI system] build + any CI checks. If anything fails, STOP and report.
3. **Mark PR ready and squash-merge** — `gh pr ready <PR>` then `gh pr merge <PR> --squash --delete-branch`.
4. **Pull the branch locally** — `git checkout [base-branch] && git pull origin [base-branch] && git status` — confirm working tree clean.
5. **Update [tracking file]** — append a Brief [LETTER] entry.
6. **Report back** — final message includes: squash commit SHA, branch HEAD SHA, build/smoke verification, deferred items.

Pause and report instead of merging if any CI check fails, any acceptance criterion can't be satisfied, or branch protection blocks the merge.

---

# The brief

**Status:** New · **Effort:** [XS/S/M/L/XL] · **Area:** [UX/Logic/Data/etc.] · **Depends on:** [prior brief]

## Why

[2-4 sentences: what was observed, why it needs to change]

---

## Scope

### [LETTER].1 — [Sub-section title]

[Description of what to change and why]

#### What to do / Implementation

[Specific implementation guidance — not pseudo-code, but enough detail that the agent knows WHERE to look and WHAT to change]

#### Acceptance behaviour

- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]

### [LETTER].2 — [Next sub-section]
[...]

---

## Acceptance criteria summary

[One-line per sub-section + cross-cutting checks]

### Cross-cutting

- [ ] No regressions on [prior brief] behaviour
- [ ] PR description copies every checkbox with implementation notes
- [ ] PR description includes before/after screenshots for visual items
- [ ] Follow-ups section in PR body lists any deferred work
- [ ] [Tracking file] updated

### Auto-merge step (When you finish)

- [ ] Draft PR opened against `[base-branch]` with full description + screenshots
- [ ] All CI checks passed green
- [ ] PR marked ready and squash-merged
- [ ] Working branch deleted after merge
- [ ] Local `[base-branch]` pulled and working tree confirmed clean
- [ ] [Tracking file] entry appended
- [ ] Final report includes: squash commit SHA, branch HEAD SHA, build/smoke verification, deferred items

---

## Out of scope

[Explicit list of what NOT to touch — prevents scope creep]

---

## Notes / risks

[Implementation risks, architecture concerns, "STOP and ask if..." warnings]

---

*Brief [LETTER] · [slug] · v1 · [date]*
```

## Load-Bearing Elements (do NOT remove these)

### 1. "Definition of done" = acceptance criteria as test plan
The agent treats checkboxes as pass/fail tests. Without this, agents ship partial implementations and call them done.

### 2. "Stop and ask, don't skip"
Without this explicit instruction, agents silently invent solutions for ambiguous specs. This one line prevents more bugs than any other.

### 3. The 6-step auto-merge sequence
Steps 1-6 in "When you finish" form a complete CI-verified merge workflow. The agent opens a PR, waits for CI, merges, pulls, updates tracking, and reports. Removing any step breaks the chain.

### 4. "Pause and report instead of merging if..."
The safety valve. Without this, agents merge failing builds.

## Advanced Patterns

### Verify-First (Part A + Part B)
When some items are confirmed broken and others might already be fixed:

```markdown
> 📋 **Two priority tiers:**
> - **Part A (P0/P1)** — confirmed broken from live testing. Implement definitely.
> - **Part B (verify-and-ship-if-missing)** — check deploy preview first, ship only if missing.
```

Use when: shipping a consolidation/hotfix brief after an audit, where some items may have been fixed by prior ad-hoc commits.

### Reversal Flagging
When the current brief intentionally reverses a decision from a prior brief:

```markdown
> ⚠️ **This reverses [PRIOR].N.** [Old behaviour] → [new behaviour]. Intentional design iteration.
```

Use when: the product owner changed their mind (happens frequently in iterative development). Without the flag, the agent may think the reversal is a mistake and try to preserve the old behaviour.

### Split Guidance
For large briefs (8+ sub-sections):

```markdown
> 📦 **N sub-sections.** Codex MAY split into two PRs: [LETTER].1–.5 as PR-1 and [LETTER].6–.N as PR-2. Don't split any individual sub-section.
```

### Cross-Reference Notes
When a brief depends on or modifies patterns from prior briefs:

```markdown
## Cross-references for skills
After this PR ships, update the portable skills:
- **`skill-name`** — [what to update and why]
```

## Brief Naming Convention

Use spreadsheet-column style: A–Z, then AA–AZ, BA–BZ, etc. Each brief gets a unique letter. Sub-sections use dot notation: BE.A.1, BJ.5, BM.13.

## Common Mistakes to Avoid

1. **Don't write pseudo-code in the brief.** Write WHERE to look and WHAT to change, not HOW to code it. The agent is a better coder than brief-writer.
2. **Don't skip the "Out of scope" section.** Agents love to scope-creep. Explicit boundaries prevent this.
3. **Don't combine unrelated changes.** Each sub-section should be a coherent unit. If you can't describe why two changes belong together, they don't.
4. **Don't forget screenshots in acceptance criteria.** For visual changes, "include before/after screenshots" in the PR description is essential for review.
5. **Don't trust "claimed-fixed" without deploy preview verification.** Multiple times across 30+ briefs, agents claimed items were fixed but they weren't. Always require "verified on deploy preview, not just in source."

Branch-name and base-branch must be verified per-repo. As of 2026-05-26 there are TWO SkyBrookAI repos with DIFFERENT default branches: skybrook-tech/quickscreen-bom-generator uses `master`; skybrookai-atlas/quickscreen-colorbond-generator (the new multi-supplier work) uses `main`. Every brief MUST state the target repo + base branch explicitly in its header. Also: when starting a new fork/repo, the brief queue needs MASTER-BRIEF.md added explicitly, stale leftover briefs cleaned from _briefs/00-inbox/, and the dependency rule may need to reset (e.g., 'Depends on architecture doc landing' instead of 'Depends on brief NNN merged').

## Scripts
None
