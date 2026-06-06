---
name: ai-agent-iterative-development-workflow
description: Meta-workflow for managing iterative development with AI coding agents. Covers the audit → brief → ship → verify → iterate cycle, handling spec reversals, dealing with "claimed-fixed" bugs, and maintaining a discovery log.
---

# AI Agent Iterative Development Workflow

## Overview

A meta-workflow for shipping production code through AI coding agents (Codex, Claude Code, Cursor) over many iterations. Developed across 30+ briefs (letters A through BM) on a single production app, with frequent spec changes, carry-over bugs, and design reversals.

## The Cycle

```
Audit → Identify → Brief → Ship → Verify → Iterate
  ↑                                            │
  └────────────────────────────────────────────┘
```

### 1. Audit
Open the deploy preview. Walk every interactive element. Compare against the spec. Record what's broken, what's missing, what's ugly.

### 2. Identify
Group findings into coherent units of work. Each group becomes a brief sub-section. Related changes go in the same brief. Unrelated changes go in separate briefs.

### 3. Brief
Write a structured brief using the codex-pr-brief-template skill. Include acceptance criteria as checkboxes.

### 4. Ship
Paste the brief into a fresh Codex thread. Wait for the PR + CI. Review the diff.

### 5. Verify
Check the deploy preview against every acceptance criterion. Don't trust source-only claims.

### 6. Iterate
Carry-over anything that wasn't fixed. Flag reversals from design changes. Write the next brief.

## Handling Spec Reversals

Design decisions change. In 30+ briefs, the following were reversed:

| Decision | Original | Reversed to | Brief |
|----------|----------|-------------|-------|
| Default tab | BOM | Map (BG.1) | BOM (BL.1) |
| Entry method | 3 cards (AY) | Drop cards (BC.1) | 4 buttons (BI.1) |
| Preview step | Keep preview | Skip preview (BF) | — |
| Height attribute | Run-level | Section-only (BJ.8) | — |
| Map expand | Except sidebar | Including sidebar (BC) | — |

### How to handle reversals in briefs

1. **Flag the reversal explicitly** at the top of the brief:
   ```
   > ⚠️ **This reverses BG.1.** Map was default → BOM is now default.
   ```
2. **Explain why** (even briefly): "After testing, Liam found BOM-first is better because..."
3. **Don't apologize or justify** — reversals are a normal part of iterative design
4. **Make sure the agent implements the NEW spec**, not the old one. Without the flag, agents may see conflicting specs in the codebase and try to preserve both.

## The "Claimed-Fixed" Problem

AI agents claim items are fixed when they're not. This happened multiple times:
- Duplicate height dropdown: claimed fixed in briefs BE and BI, still broken on deploy
- BOM abbreviation parens: claimed fixed in BE.B.8, still showing on deploy
- Default values: code looked right but runtime behaviour was wrong

### Prevention strategies

1. **Require deploy-preview verification** for every visual/state change
2. **Carry forward unfixed items** with explicit language: "This was claimed-fixed in [X] but is still broken on the deploy preview. Fix for real this time."
3. **Add "verified on deploy preview" to acceptance criteria** for carry-over fixes
4. **Don't trust discovery.md entries** that claim an item shipped — verify independently

## Discovery Log Discipline

Maintain a `discovery.md` file in the repo that tracks:
- Which briefs have shipped (with merge timestamp and commit SHA)
- Which items were deferred
- Which items were claimed-fixed but need re-verification
- Design decisions that were made (and later reversed)

Format:
```markdown
## Brief BE — Sandbox consolidation
- **Merged:** 2026-05-13 · SHA: abc1234
- **Shipped:** BE.A.1 (double-gate validator), BE.A.3 (duplicate dropdown — CLAIMED, verify)
- **Deferred:** None
- **Judgement calls:** Used 5° angle snap instead of free-form for polyline drawing
```

## Sizing and Splitting

### Brief sizing guide
| Size | Sub-sections | Typical scope |
|------|-------------|---------------|
| XS | 1-2 | Rename, text change, simple fix |
| S | 3-4 | Small polish items |
| M | 5-7 | Feature additions + cleanup |
| L | 8-10 | Major feature or overhaul |
| XL | 11+ | Architecture change — consider splitting |

### When to split
- If the diff will exceed ~1000 lines, split
- If sub-sections have no dependencies on each other, they can be separate briefs
- If Part A is urgent and Part B is nice-to-have, split into two briefs with different priorities

### Split guidance in the brief
```
> 📦 **12 sub-sections.** Codex MAY split into two PRs:
> BJ.1–BJ.7 as PR-1 (settings parity) and BJ.8–BJ.12 as PR-2 (carry-over fixes).
> Don't split any individual sub-section.
```

## The Design-Agent / Execution-Agent Split

This workflow works best with two agents:

1. **Design agent** (e.g. Calculator Atelier): understands the product, writes briefs, reviews PRs, audits deploy previews. Maintains the design system and architecture decisions.

2. **Execution agent** (e.g. Codex): receives briefs, writes code, opens PRs, runs CI. Doesn't make design decisions — follows the brief.

The design agent never writes code. The execution agent never invents UX. This separation prevents the most common failure mode: an agent that ships code that technically works but doesn't match the product vision.

## Alphabet Naming Convention

Use spreadsheet-column style for brief letters:
- A through Z (26 briefs)
- AA through AZ (26 more)
- BA through BZ (26 more)
- etc.

Sub-sections use dot notation: BE.A.1, BJ.5, BM.13.

This gives infinite namespace, sorts naturally, and is instantly recognizable in commit messages, PR titles, and conversation references.
