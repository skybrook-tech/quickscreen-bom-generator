# Anyfence — Anti-Gravity handover prompt

**Paste this into a fresh Anti-Gravity desktop session. Treat it as the master brief; the rest of this package is the supporting material.**

You are the resident Anti-Gravity agent on `github.com/skybrookai-atlas/quickscreen-colorbond-bom-generator`, working on the **`feature/anyfence-platform-expansion`** branch. Your job is to take the five wireframes and brief files in this package and turn them into shippable React code, one small draft PR at a time.

## What's in this package

```
handoff-package/
├── HANDOFF-PROMPT.md                ← this file
├── README.md                        ← short user guide
├── briefs/                          ← execute these in numerical order
│   ├── 001-entry-page-stages-1-3.md   Landing + live Google Maps + capture + drawing toolbar
│   ├── 002-entry-page-stages-4-6.md   Fence picker + variation form + price bubble (collapsed + expanded)
│   ├── 003-booking-flow-all-stages.md All 5 booking steps + Supply-only diff
│   ├── 004-calculator-builder-page.md The React surface that embeds the Build Forge agent
│   └── 005-anyfence-canvas-branding.md Watermark + corner pill (polish, last)
├── wireframes/                      ← the HTML mockups; open in a browser
│   ├── 01-entry-page-v3.html
│   ├── 02-calculator-builder-v1.html
│   └── 03-booking-flow-v1.html
└── reference/
    ├── canonical-name-contract.md    The naming convention (DO NOT rename canonical names)
    ├── amazing-fencing-context.md    Pilot supplier details
    ├── build-forge-agent-spec.md     What the wizard agent does (you don't build the agent, just the host page)
    ├── drawing-toolbar-inventory.md  All 13 canvas tools + 3 approved new ones
    └── protected-paths.md            Files you must NOT modify
```

## Project context (the one-paragraph version)

**Anyfence** is a multi-supplier fence calculator + booking platform. The pilot supplier is **Amazing Fencing** (Sunshine Coast + Northern Rivers, AU). The current customer-facing page is `AnyfenceCalculatorPage.tsx`, which today is a 111KB rename of `CalculatorV3Page.tsx` (the old QuickScreen god-page). Your job is to replace it with the wireframed design and add the booking flow + Calculator Builder page. The supplier-side canonical-name engine lives in `anyfence-build-pack/skills/calculator-engine/treated-pine-paling-fence-calculator/calculator.py` — don't change it; just wire it up.

## How to execute

1. **Read the wireframes first.** Open all three HTML files in a browser. They're the design contract. If a brief says "see Stage 3 of the entry-page wireframe", scroll to Stage 3 of `01-entry-page-v3.html` and match what's there.

2. **Read the briefs in order.** Briefs are numbered (001 → 005) by dependency. Don't start 002 until 001's PR is open. Don't start 003 until 002's PR is open. Etc.

3. **One brief = one draft PR.** Branch name: `codex/handoff-NNN-<short-slug>`. PR title: `Handoff NNN — <title>`. Base branch: `feature/anyfence-platform-expansion`.

4. **Use the existing `_briefs/` convention if you want.** Move the brief file from `_briefs/00-inbox/` (you'll add it there from this package) to `_briefs/01-in-progress/` as your first commit, then to `_briefs/02-done/` when the PR opens.

5. **Show your work in the PR description.** Include: which wireframe stages the PR implements, which files were modified, what's deliberately punted to a later brief, screenshots / Netlify preview link.

## Hard rules

| Rule | Why |
|------|-----|
| **Base branch is `feature/anyfence-platform-expansion`**, NOT `main` or `master` | Liam is working on this branch; merge to main later. Verify in GitHub UI before opening the PR. |
| **Draft PR only.** Never set ready-for-review. Never auto-merge. | Liam reviews on iPhone via Netlify preview. |
| **DO NOT modify protected paths** (see `reference/protected-paths.md`) | These are the BOM regression guards. |
| **DO NOT rename canonical product names** | See `reference/canonical-name-contract.md`. New names: fine. Renames: a breaking change. |
| **Use npm 10.x** when touching `package-lock.json` | Repo's `engines` says Node 20 / npm 10. |
| **Skip the Deno integration job** | Known red on XP-BTP-B fixture; pre-existing, out of scope. |
| **Pilot supplier is Amazing Fencing.** No QuickScreen / QSHS / VS / XPL / BAYG content in any new component | Glass Outlet's structure was kept; their products are out. |
| **All copy must read as Amazing Fencing primary, Anyfence platform secondary** | Amazing Fencing's brand is the customer's brand. Anyfence is the platform underneath. |
| **Run `npm run build` locally before opening draft PR** | Executes `tsc -p tsconfig.app.json && vite build` to catch TS compile errors immediately and save round trips. |

## Stop points (mandatory pauses)

Stop and exit — do not proceed to the next brief — when:

- A brief depends on something not yet merged.
- A test suite fails after a reasonable fix attempt.
- A migration would touch existing live data.
- You would need to modify a file in `reference/protected-paths.md`.
- The wireframe shows a behaviour you can't achieve without changing `localBomCalculator.ts` or `canonicalAdapter.ts` public signatures.
- You can't determine the correct base branch.

## After each brief merges

- If the brief touches seed JSON, run `npm run seed:products`.
- Update `_briefs/INVENTORY.md` with the new status (cosmetic, but Liam reads it).
- The next brief is now unblocked — re-paste this prompt.

## PR style

- One brief per PR. No stacked branches with multiple logical changes.
- Branch name: `codex/handoff-NNN-<short-slug>` (matches existing convention).
- PR title: `Handoff NNN — <title>`.
- PR description: link to the wireframe stage(s), list modified files, list deliberately-deferred items, attach a Netlify preview link once the build completes.
- **Mark the PR as draft.** Liam reviews on iPhone and merges in the GitHub web UI.

## When the queue is empty

Print:
```
All 5 briefs shipped — entry page, booking flow, Calculator Builder page, canvas branding.
Next: mobile-first pass (Liam will brief separately), post-booking customer page (separate brief),
supplier-side install-team review queue (separate brief).
```

## Reference: what's NOT in scope here

Anti-Gravity is building the React UI per the wireframes. Out of scope for this handover:

- The **Build Forge agent** itself — that's a Hyperagent agent saved in Liam's library. You build the page that embeds it (Brief 004), but the agent's system prompt and tool config are already set.
- The **BOM math engine** — that's the canonical-name calculator in `anyfence-build-pack/`. You wire the React UI to call it; you don't extend the math.
- **Canonical product names** — the contract is in `reference/canonical-name-contract.md`. Use only the names already defined; if a new one is needed, surface to Fence Forge for review.
- **Mobile-first pass** — desktop-first wireframes only in this handover. Mobile is a separate brief that Liam will commission.
- **Post-booking customer surface** (`/booking/Q-…`) — separate brief.
- **Supplier-side admin** — separate brief.
- **Repo cleanup** — separate brief (Pricelist/ xlsx files, scratch/, Project Overview Read Me triplicate).

That's it. Read the wireframes, work brief by brief, draft PRs only. Let's build.
