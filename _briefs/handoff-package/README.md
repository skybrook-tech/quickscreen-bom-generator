# Anyfence handoff package — README

Five briefs + three wireframes + five reference docs. Designed to be handed to **Anti-Gravity (Gemini)** or any other coding agent for execution.

## How to use this package

### If you're Liam

1. Drop this folder into the repo at `_briefs/00-inbox/` (or wherever you want it). The briefs follow the existing `codex/brief-NNN-...` convention.
2. Open `HANDOFF-PROMPT.md` and paste the whole thing into a fresh Anti-Gravity session as the master prompt.
3. Anti-Gravity will read the briefs in order and open one draft PR per brief.
4. You review each PR on iPhone via the Netlify preview, merge, and re-paste `HANDOFF-PROMPT.md` to unblock the next one.

### If you're the agent reading this

Start with `HANDOFF-PROMPT.md`. It tells you everything: scope, hard rules, stop points, PR style.

## What's in this package

- **`HANDOFF-PROMPT.md`** — the master prompt to paste into Anti-Gravity. Read it first.
- **`briefs/`** — five numbered briefs, executed in order. One brief = one draft PR.
- **`wireframes/`** — three HTML files showing the desktop design of every screen. Open in a browser.
- **`reference/`** — supporting docs (canonical-name contract, protected paths, Amazing Fencing context, drawing toolbar inventory, Build Forge agent spec).

## What's NOT in this package

- **Mobile-first wireframes** — desktop only for this handover. Mobile is a separate brief.
- **Build Forge agent config** — the agent already exists in Liam's Hyperagent library; Brief 004 builds the React PAGE that embeds it.
- **BOM math engine** — already exists at `anyfence-build-pack/skills/calculator-engine/treated-pine-paling-fence-calculator/calculator.py`. Briefs wire it up; they don't extend it.
- **Post-booking customer page** (`/booking/Q-…/status`) — separate brief.
- **Supplier-side review queue** (`/admin/bookings/queue`) — separate brief.
- **Repo cleanup** (`Pricelist/`, `scratch/`, dedupe `.agents/` vs `.claude/`) — separate brief.

## Conventions

| Item | Convention |
|------|-----------|
| Branch name | `codex/handoff-NNN-<short-slug>` |
| PR title | `Handoff NNN — <title>` |
| PR base | `feature/anyfence-platform-expansion` (NOT main/master) |
| PR status | Draft only |
| Pilot supplier | Amazing Fencing |
| Primary brand on customer surfaces | Amazing Fencing |
| Secondary brand (platform) | Anyfence ("Powered by Anyfence") |
| First fence type to build | Timber Paling (CCA pine + hardwood) |
| Canonical names | See `reference/canonical-name-contract.md` — STABLE, never rename |

## Brief queue

| # | File | Title | Depends on |
|---|------|-------|-----------|
| 001 | `briefs/001-entry-page-stages-1-3.md` | Entry page · landing + live map + capture + drawing toolbar | — |
| 002 | `briefs/002-entry-page-stages-4-6.md` | Entry page · fence picker + variation form + price bubble | 001 |
| 003 | `briefs/003-booking-flow-all-stages.md` | Booking flow · 5 steps + Supply-only diff | 002 |
| 004 | `briefs/004-calculator-builder-page.md` | Calculator Builder page (embeds Build Forge agent) | — (parallel to 001-003) |
| 005 | `briefs/005-anyfence-canvas-branding.md` | Anyfence watermark + corner pill (polish) | 001 |

## Wireframe artifacts (also live on the web)

- Entry page v3: open `wireframes/01-entry-page-v3.html`
- Calculator Builder v1: open `wireframes/02-calculator-builder-v1.html`
- Booking flow v1: open `wireframes/03-booking-flow-v1.html`

## Questions / blockers

If a brief is unclear or conflicts with the wireframe, the wireframe wins. If both are unclear, stop and surface to Liam — don't guess.
