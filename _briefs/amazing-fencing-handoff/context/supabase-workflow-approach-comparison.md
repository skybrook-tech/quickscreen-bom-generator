# Supabase Workflow — Approach Comparison

Side-by-side comparison of four approaches to ship Supabase changes for the SkyBrookAI / QuickScreen platform (Codex brief queue, Supabase MCP, Liam-direct CLI, custom agent), with a scoring matrix, use-case mapping, brief-by-brief recommendation for the current 14-brief queue, and a hybrid-pattern recommendation for the next six months.

## TL;DR — what to use, when

## Primary recommendation (next 6 months)

**Don't switch.** Stay with the Codex brief queue for the foundation work (the 14 briefs 028, 032-044 we've already drafted). The brief queue is the only approach that gives you all of: atomic code+schema PRs, Netlify deploy preview review on iPhone, Git-history audit trail, and a hard human review gate before anything touches paying-customer data. Switching mid-flight has a real cost (re-wiring tools, re-training muscle memory, losing the queue's strict-sequencing safety) and a small upside (single-digit hours saved per brief).

**In parallel, set up two ops tools** so you're not locked in to one workflow:

1. **Supabase CLI on your PC** — for emergency hotfixes and read-only inspection. 5-minute install (`scoop install supabase` or download the .exe from supabase.com). Run `supabase link --project-ref <your-project-ref>` once and you're ready.
2. **Supabase MCP in your IDE** — for debugging during PR review (eg. when you're reviewing a brief PR and want to ask 'what does the table look like right now?'). Available in Cursor and Claude Desktop. NOT in Codex desktop. NOT in this Hyperagent thread (Composio integrations disabled here).

**Don't build a custom agent yet.** That's the most expensive option and the other three approaches cover ~95% of what the platform needs through brief 044.

## Quick decision table

| Situation | Use |
|---|---|
| Anything in the current brief queue (028-044) | **Codex brief queue** |
| Pure data fix in prod (eg. wrong price on one SKU) | **CLI** (write a quick migration) or **MCP** (one-off SQL) |
| Customer asks 'why is my BOM showing X' — read-only debug | **MCP** in Cursor / Claude Desktop |
| Apply existing migrations to a fresh dev Supabase project | **CLI** (`supabase db push`) |
| New supplier wants to self-onboard their catalogue | **Codex** (extend brief 035-036 admin UI), not custom agent |
| Hotfix Edge function bug at 9pm on Sunday | **CLI** (`supabase functions deploy`) |
| Trying out 'what if the table looked like Y' before committing | **MCP** in IDE — fast iteration |
| Anything that touches `localBomCalculator.ts` | Trick question — that file is protected. Use the brief queue and respect the rule. |

## The four approaches

## A. Codex brief queue (current pattern)

What it is: Hyperagent drafts a brief markdown file → Liam stages it in the repo → pastes MASTER-BRIEF to a fresh Codex desktop session → Codex picks the lowest-numbered brief, executes it verbatim, opens a draft PR, moves the brief to `02-done/`, stops → Liam reviews on iPhone via Netlify deploy preview → merges → re-paste MASTER-BRIEF to advance.

Strengths:
- Atomic code + schema in one PR
- Every change reviewed on a real device before prod
- Git history is the audit trail
- Reversible via revert PR
- The strict-sequencing `Depends on:` rule prevents bad-merge regressions (already saved you twice in the original repo)
- Liam stays in the iPhone-review workflow he likes

Weaknesses:
- Slow: 3-7 days per brief depending on review pace
- Codex token cost adds up (you're paying for the agent to do the actual implementation)
- Requires the brief to be well-written upfront — sloppy briefs produce sloppy PRs

Best for: every brief in the current queue 028-044. Also: future supplier rollouts, RLS changes, anything touching protected files, anything where reviewability matters more than speed.

---

## B. Supabase MCP server

What it is: An MCP (Model Context Protocol) server published by Supabase that lets any MCP-aware agent execute management actions against your Supabase project — list tables, run SQL queries, apply migrations, manage extensions, inspect logs, etc. The agent connects with a service-role key.

Available in: Cursor, Claude Desktop, Cline, Continue, Roo Code, and most modern AI IDEs. NOT in Codex desktop (Codex's CLI doesn't speak MCP as of mid-2026). NOT in this Hyperagent thread (the runtime has Composio integrations disabled).

Strengths:
- Immediate (no PR friction)
- Excellent for exploration ("show me the schema", "what's in `pricing_rules` for SKU X")
- Zero context-switching (you stay in your IDE / chat)
- No additional infrastructure — just a connection string

Weaknesses:
- Changes apply NOW, no review gate
- Data drifts from repo (your `supabase/migrations/` folder doesn't automatically update when MCP runs DDL)
- No Netlify deploy preview
- No iPhone review surface
- Reversibility is whatever you can do manually after the fact (point-in-time recovery, hand-written down migration, etc.)
- Service-role key handling — agent has full admin access, so any prompt injection is a real risk

Best for: read-only inspection during debugging, one-off data fixes you're confident about, exploratory schema design BEFORE you write the migration file. NOT good for foundation work.

---

## C. Liam runs Supabase CLI directly

What it is: `supabase link → supabase db push` for migrations (reads from your repo's `supabase/migrations/` folder), `supabase functions deploy <name>` for Edge functions, `supabase db dump` for backups, etc. You read the SQL, push it yourself.

Available: anywhere you've installed the CLI. Two-minute install on Windows via `scoop install supabase` or downloading `supabase_windows_amd64.exe` from the GitHub releases page.

Strengths:
- Fast: minutes from "I want this" to "it's live"
- You're in the loop (you read the SQL before running `db push`)
- Changes flow through `supabase/migrations/` — Git stays the source of truth
- Cheap: no agent tokens, no MCP server, no GitHub PR
- Reversible: write a down migration, push it

Weaknesses:
- Manual: easy to make mistakes when tired or rushed
- Doesn't scale to delegating work (only Liam can do it)
- No automated test gate (CI doesn't run before push unless you wire it yourself)
- No Netlify deploy preview before push
- Skips the brief queue's review pattern — you'd be operating outside the pattern Codex assumes

Best for: emergency hotfixes, applying existing migrations to a fresh dev environment, ad-hoc data corrections you can verify yourself, one-shot Edge function deploys when the brief queue would be overkill.

---

## D. Custom agent via Supabase Management API

What it is: Build (or commission) a long-running agent that holds a service-role key and exposes a custom interface — supplier-facing CSV upload, B2B admin console, scheduled imports, etc. Calls Supabase's REST / PostgREST / Management API directly.

Strengths:
- Most flexible — can do anything Supabase exposes
- Can wire into a custom UI (eg. a 'supplier self-service portal' that's not just a Codex chat)
- Stays running indefinitely (cron-style work, eg. nightly price book imports)

Weaknesses:
- Most work to build — weeks of dev time minimum
- Custom maintenance burden forever (you own the bug reports, you own the security)
- Security risk if not designed carefully (service-role key exposure, prompt injection, etc.)
- For most use cases through brief 044, the other three approaches already cover it

Best for: future state, post-044 — eg. brief 035's admin UI eventually becomes a self-service supplier portal that needs a long-running ingestion agent. Not a near-term play.

## Scoring matrix

Scored 1-5 where 5 is best for this project's specific context (Australian fencing tradies, iPhone PR review, two paying-customer orgs, single-developer maintenance).

| Dimension | A: Codex queue | B: Supabase MCP | C: CLI direct | D: Custom agent |
|---|---|---|---|---|
| **Speed** (time to live) | 2 (days) | 5 (seconds) | 4 (minutes) | 1 (build first) |
| **Reviewability** (can Liam see what's changing before it changes) | 5 (Git diff + Netlify) | 1 (agent narration only) | 3 (Liam reads SQL) | 2 (custom) |
| **Safety** (probability of breaking prod) | 5 (PR gate) | 2 (live execution) | 3 (Liam in loop) | 3 (depends on build) |
| **Reversibility** | 5 (revert PR) | 2 (manual rollback) | 4 (revert + push) | 3 (custom) |
| **Repo sync** (Git stays source of truth) | 5 | 1 (data drift) | 4 (migrations in repo) | 3 (custom) |
| **iPhone review surface** | 5 (Netlify preview) | 1 (none) | 1 (none) | 2 (if you build it) |
| **Maintenance burden** | 4 (already set up) | 5 (managed) | 5 (just CLI) | 1 (you own it) |
| **Cost** | 3 ($$ Codex tokens) | 4 (free) | 5 (free) | 1 ($$$ build cost) |
| **Delegate-ability** (can someone else run it) | 5 (Codex does the work) | 3 (any MCP-aware agent) | 1 (Liam only) | 5 (designed to delegate) |
| **TOTAL** | **39 / 45** | **24 / 45** | **30 / 45** | **21 / 45** |

Winner overall: **A (Codex queue)** by a clear margin for the workflow this project needs right now. C (CLI) is the strong second — keep it in your back pocket for hotfixes.

## Brief-by-brief mapping for the current queue

How the 14 briefs in `_briefs/00-inbox/` map to the four approaches:

| # | Brief | Type | Recommended | Why |
|---|---|---|---|---|
| 028 | Multi-supplier foundation housekeeping | docs + briefs | **A (Codex)** | Already designed for this; lands MASTER-BRIEF and architecture docs |
| 032 | Supplier + archetype + instance schema | pure SQL | **A (Codex)** | RLS-sensitive; needs PR review for the policy clauses |
| 033 | Data backfill — Glass Outlet + archetypes + instances | pure SQL | **A (Codex)** | `UPDATE products SET supplier_id = ...` against paying-customer data — needs the PR gate |
| 034 | Versioned price books + quote pinning | SQL + edge function | **A (Codex)** | Atomic code + schema; edge function changes need the deploy preview |
| 035 | Admin UI — suppliers + instances CRUD | TS / React | **A (Codex)** | UI-heavy; needs Netlify preview on iPhone |
| 036 | Admin UI — products + bulk CSV import | TS / React + SQL | **A (Codex)** | Same pattern as 035; the Cin7 parser is a non-trivial chunk of code |
| 037 | Admin UI — rule authoring | TS / React + JSON | **A (Codex)** | Form code + math.js editor; needs UX review |
| 038 | Workbook regression upload + diff | TS / React + SQL | **A (Codex)** | The trust anchor; absolutely needs careful review |
| 039 | User-scoped authoring + RLS | SQL + RLS | **A (Codex)** | RLS triggers are easy to get wrong — PR gate is essential |
| 040 | Community publication path | SQL + TS | **A (Codex)** | Workflow logic + RLS; review-critical |
| 041 | Quality reports + demotion automation | SQL trigger + UI | **A (Codex)** | Auto-demote trigger is destructive if buggy — PR gate is essential |
| 042 | Discount Fencing — supplier + instances | pure SQL | **A (Codex)** with optional MCP/CLI fallback | Could safely run via MCP/CLI since it's additive INSERTs only; but for consistency with the queue, ship via Codex |
| 043 | Discount Fencing — seed data + price book v1 | JSON + SQL | **A (Codex)** | Seed loader changes need code review |
| 044 | Platform org + visibility layer | SQL + RLS rework | **A (Codex)** | The biggest RLS change in the queue — needs the strictest review |

**Verdict: 14 of 14 briefs stay on Codex.** The alternatives shine AFTER the foundation is live.

## Hybrid pattern (what to actually do)

The real-world recommendation isn't "pick one approach." It's "build a hybrid stack where each tool covers what it's best at."

## Layer 1 — Codex brief queue (the spine)

Keep doing what we're doing. Every architectural change, every feature, every schema migration that ships to paying customers — through the brief queue.

## Layer 2 — Supabase CLI (the ops tool)

Install the CLI on your PC. Don't use it for anything in the brief queue. Use it for:
- Applying existing migrations to a fresh dev/staging Supabase project
- Emergency Edge function redeploys when a brief PR would take too long
- Quick data inspections (`supabase db remote query` or via `psql` connection string)
- Manual data corrections (write a one-off migration, push, commit the migration file to the repo as audit trail)

One-time setup, then it sits there until you need it.

## Layer 3 — Supabase MCP in Cursor (the debug surface)

When you're reviewing a brief PR on your phone and want to ask "what does `products` look like right now in prod?", that's a perfect MCP use case. Spin up Cursor on your laptop, point it at the Supabase MCP, ask the question, get the answer in seconds.

Do NOT use MCP to APPLY changes that should go through the brief queue. Reading is great. Writing is risky. The MCP gives you both; discipline yourself to only use reads.

## Layer 4 — Custom agent (the future state)

Don't build this yet. Re-evaluate after brief 044 lands. At that point, the natural next thing is a supplier-self-service portal that ingests CSV uploads from verified suppliers. THAT'S the use case for a long-running custom agent. Until then, every supplier onboarding goes through the admin UI from brief 035.

## Why this layered approach beats picking just one

- Each tool has a job that matches its strengths
- Liam doesn't have to context-switch: brief queue for planned work, CLI for emergencies, MCP for debugging
- Future ops scale: when the platform has 10+ suppliers, you'll need both the queue (for new features) AND the debug surface (for support questions). Building the muscle memory now is cheap.
- Reversible: every approach can be swapped out independently. If MCP loses its appeal in a year, swap it for whatever's new in IDEs; the brief queue is unaffected.

## Setup actions

Concrete steps to set up the layered stack. None of these are blocking — Codex brief queue can ship 028-044 without any of them.

## Layer 2 — Install Supabase CLI on your PC (5 minutes)

PowerShell:

```powershell
# Option A: via scoop (recommended if you have scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Option B: direct download (works without scoop)
# Go to https://github.com/supabase/cli/releases/latest
# Download supabase_windows_amd64.exe
# Move it somewhere on your PATH like C:\Tools\supabase.exe
# Or just run it from Downloads with full path

# Verify
supabase --version
```

Then link the CLI to your Supabase project:

```powershell
cd "C:\Git Repos\BOM Calculator Repositories\quickscreen-colorbond-generator"
supabase login   # opens browser; sign in to Supabase
supabase link --project-ref <your-project-ref>
```

Get your project ref from the Supabase dashboard URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`.

After linking, useful commands:
- `supabase db push` — apply local migrations to remote (use carefully, this is destructive)
- `supabase db remote query "SELECT * FROM suppliers LIMIT 5"` — read query, safe
- `supabase functions deploy bom-calculator` — push the Edge function from your repo
- `supabase migration list` — see what migrations are applied locally vs remote

## Layer 3 — Supabase MCP in Cursor (15 minutes)

If you don't already have Cursor: download from cursor.com (free tier is fine for this).

In Cursor:
1. `Cmd/Ctrl + Shift + P` → search "MCP"
2. "Edit MCP Configuration" → opens `~/.cursor/mcp.json`
3. Add the Supabase MCP server:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "<your_supabase_personal_access_token>"
      ]
    }
  }
}
```

Get your personal access token from: https://supabase.com/dashboard/account/tokens

4. Restart Cursor
5. New chat → ask "what tables exist in my Supabase project?" — should work

**Safety note:** the access token gives Cursor's agent full management API access to your Supabase. Don't share `mcp.json` and don't paste the token anywhere public. For extra safety, you can create a separate Supabase project for dev work and give the MCP read-only credentials to your prod project (Supabase supports custom roles).

## Layer 4 — Not yet

Re-evaluate after brief 044 lands. Open a Hyperagent thread with "Should we build a supplier self-service portal?" once Discount Fencing is live and you've spent a few weeks operating on the multi-supplier foundation. The answer might still be "not yet" — the admin UI from brief 035 may cover supplier onboarding indefinitely.

## What NOT to set up

- Custom CI/CD that auto-applies migrations on merge — adds risk for marginal speed gain. Stick with `supabase db push` after merging.
- A second Codex instance running in parallel — bad-merge regressions guaranteed. The strict-sequencing rule exists for a reason.
- An auto-rebase bot for the brief queue — interferes with the human review gate.

## When to revisit this

This doc is a snapshot. Re-read and update when any of the following happens:

## Definitely revisit

- **A new MCP standard emerges** that Codex desktop adopts — that changes the entire "in what tool can I run MCP" picture
- **Supabase ships a 'review before apply' feature** for the MCP — that closes the biggest gap (B currently loses on reviewability)
- **You hire a second developer** — delegation patterns become important; B and D become more attractive
- **A brief takes you more than 2 weeks to ship** — the brief queue is slowing you down; consider whether some briefs could be CLI-driven instead
- **You start seeing supplier churn complaints about onboarding speed** — that's the trigger to build the Layer 4 custom agent (a supplier portal)

## Don't bother revisiting just because

- A new IDE comes out (Cursor, Windsurf, Zed, etc.) — they all speak MCP the same way; Layer 3 stays the same
- Codex releases a new CLI version — the brief queue is loosely coupled; updates are usually drop-in
- Someone tells you "you should be using <new approach X>" — re-read this doc first; if X doesn't fit any of the four buckets here, it probably doesn't apply to this project

## Trigger for re-scoring

At the start of every new supplier onboarding (Discount Fencing, then whoever's next), spend 10 minutes asking: "would CLI or MCP have shipped this faster?" If yes more than 3 times in a row, the answer is yes — start using them. The brief queue is the safe default, not the only allowed approach.

---

*Last updated: 2026-06-01. Next review: when brief 044 lands or when any of the 'definitely revisit' triggers fires.*
