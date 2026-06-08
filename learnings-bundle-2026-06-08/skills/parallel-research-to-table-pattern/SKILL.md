---
name: parallel-research-to-table-pattern
id: cmpnfynhc00ix07adv7ydeog2
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# parallel-research-to-table-pattern

> Pattern for large-scope structured research: dispatch N parallel sub-agents (one per market segment / region / category), each returning structured JSON, then deduplicate and merge into a single sortable table. Battle-tested on the Anyfence 66→61 supplier database build — 6 parallel streams across fencing segments, table built in foreground while agents worked.

## When to use
(not specified)

## Documentation
# Parallel Research → Single Table Pattern

For research tasks where the scope splits cleanly into independent segments (industries, regions, product categories, competitor sets), dispatching parallel sub-agents and merging their structured output is dramatically faster than serial research — AND keeps the orchestrator's context clean (each sub-agent's transcript stays in its own context).

## When to use

- The scope splits into 4-10 independent segments (more than 10 = diminishing returns from coordination overhead)
- Each segment returns the same data shape (compatible for a single table)
- The user wants a comprehensive output, not "the top 3"
- Total research effort is >30 minutes if done serially

## When NOT to use

- Single-domain deep research (one rabbit hole, not parallel breadth)
- Iterative research where each step's output informs the next
- Anything where the segments would significantly overlap (you'd get the same entities back from multiple agents, wasting effort)

## The 5-step pattern

### 1. Split the scope into clean segments

For the Anyfence supplier database the 6 segments were:
- Steel/Colorbond suppliers
- Aluminium slat / louvre / tubular suppliers
- Pool fencing (glass + aluminium) suppliers
- Timber paling (treated pine + hardwood) suppliers
- Rural / wire / chain fencing suppliers
- Niche / specialty (brushwood, PVC, post & rail) suppliers

Cleanliness check: would the agents return mostly different entities? If 80%+ overlap is expected, consolidate the segments.

### 2. Spec the output schema BEFORE dispatching

Every sub-agent returns the same JSON shape. Lock this on the orchestrator side first. Example:

```json
{
  "suppliers": [
    {
      "name": "Stratco",
      "domain": "stratco.com.au",
      "logo_url": "https://icons.duckduckgo.com/ip3/stratco.com.au.ico",
      "hq_state": "SA",
      "business_type": "manufacturer",
      "categories": ["colorbond_steel_sheet", "post_and_rail"],
      "primary_contact": {"name": "Kristopher Powell", "role": "CMO", "linkedin": "..."},
      "email": "kristopher.powell@stratco.com",
      "email_source": "linkedin_verified",
      "notes": "National network of 70+ stores; large but slow to move."
    }
  ]
}
```

### 3. Dispatch N agents in parallel in a single tool-call batch

Critical: send ALL agent calls in a single message with multiple tool blocks so they actually run in parallel. Splitting across messages serializes them.

```
Agent(description: "Crispin | Steel Scout | Steel/Colorbond suppliers")
Agent(description: "Glint | Alloy Hunter | Aluminium slat/tubular suppliers")
Agent(description: "Splash | Pool Scout | Pool fencing suppliers")
Agent(description: "Knotty | Timber Forager | Timber paling suppliers")
Agent(description: "Wirewalker | Rural Lead | Rural/wire suppliers")
Agent(description: "Ziggy | Niche Spotter | Brushwood/PVC/post-rail")
```

Each agent gets:
- A clear segment definition with examples of in-scope/out-of-scope
- The EXACT JSON schema to return
- A target count (e.g. "10-20 suppliers per segment")
- Instructions to flag low-confidence rows

### 4. Build the destination table while agents work

The agents run for 60-180 seconds typically. Use that time to:
- Create the table with the agreed column structure
- Build any auxiliary assets (mail-merge CSV, wireframe, outreach templates)
- Pre-write the analysis prose for the final response

Don't sit waiting — orchestrator parallelism extends past the agent dispatches.

### 5. Merge with dedup logic

Common merge issues to handle:
- **Same entity, different segments:** Stratco appears in both "Colorbond" and "Post & Rail". Merge by domain, union the `categories` array.
- **Subsidiary vs parent:** BlueScope (parent) and Lysaght (subsidiary) — keep both rows if they have separate trade desks; merge if they share contacts.
- **Variant names:** "Oxworks", "Oxworks Pty Ltd", "Oxworks (Alcentre Group)" — normalise on the canonical short name; keep the legal name as a `legal_name` field.
- **Geographic threshold:** for "national" lists, drop any entity that doesn't trade in 3+ states. The Anyfence build dropped 5 sub-nationals this way (66 → 61).

Dedup is best done with a script after extracting structured JSON from all agent results, not by hand.

## Failure modes and fixes

| Failure | Why it happens | Fix |
|---------|----------------|-----|
| Agents return inconsistent JSON shapes | Schema spec was loose | Tighten the schema with example rows; reject and re-run any agent whose output doesn't validate |
| Lots of overlap between segments | Segments weren't clean | Re-split with clearer boundaries — categories that produce overlap should be merged into one segment |
| Some agents fail or stall | Sub-agent hit a network/tool issue | Re-run just that segment with the same prompt; don't restart everything |
| Final table has missing columns | Agents didn't all find the same data | Add a "best-effort" tier: where data wasn't found, fill with `pattern` or `unknown`, flag in source column |

## Auxiliary tools to build alongside

Whenever you ship a research table, also ship:
- Mail-merge CSV (one row per entity, columns named for tokens)
- Logo column (use DuckDuckGo favicon pattern — see `duckduckgo-favicon-fallback` memory)
- Sortable filters by the most important column (category, tier, geography)
- A short "Headline takeaways" prose block — 3-5 bullets the user can reference in pitches

## Worked example: Anyfence supplier database

- 6 parallel agents dispatched
- 5/6 returned within 3 minutes; 1 needed a retry
- Raw merged total: 95 entities
- After dedup: 66 unique
- After sub-national drop: 61
- Tier assignment (15 A / 31 B / 15 C) done in a separate post-processing pass with the user's input on Tier A criteria
- Total time start-to-deliverable: ~20 minutes of orchestrator work, mostly parallel

## Scripts
None
