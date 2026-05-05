# Calculator B Audit — P0 Blockers (Issues)

> Source: internal review of `/fence-calculator-v4`, 5 May 2026. Six issues that, individually, would make a tradie put the tool down. Fix this week.

**Suggested order:** Sprint 1 — trust + persistence + mobile. After this sprint a tradie can't accidentally lose a quote, and the product looks finished.

---

## B-01 · Save Job is completely silent

**Tags:** Functionality, Usability

I clicked **Save Job** twice with a populated 12 m QSHS job and a job name. No toast, no banner, no row appearing in a sidebar, no badge change on the Save button itself. There is no Saved Jobs list anywhere on the page, so a tradie has no way of knowing if the click actually persisted.

**Repro**

```
1. /fence-calculator-v4 → log in
2. Type a Job name
3. Pick QSHS, leave segment defaults
4. Click "Generate BOM" → totals populate
5. Click "Save Job"
6. Observe: nothing changes anywhere on the page
```

**Fix**

Add an inline toast ("Saved · 2:14 pm") that appears next to the button and fades. Persist a "Saved Jobs" sidebar (collapsible, like Notion's left rail) that shows recent jobs with status, total, and last-edited timestamp.

Stretch: tie this to a real Quote object (see B-12) and make Save Job → Save & Quote.

---

## B-02 · Saved jobs are write-only — there's no way to load one back

**Tags:** Functionality

Even if Save Job is writing to Supabase, there is no UI to retrieve a saved job. Tradies measure on Tuesday, finalise on Wednesday, send on Thursday — they need to come back to a quote.

**Fix**

Ship a "My Jobs" view (separate route, or sidebar). Each row: status pill, customer, address, total, updated_at. Click → loads the geometry + product config + BOM into the calculator. Required before this can be the hero feature.

---

## B-03 · "LIVE" BOM is not actually live — and goes dangerously stale on system change

**Tags:** Functionality, Trust

The BOM panel header says `Bill of Materials · LIVE`. It is not. It only refreshes when you click **Generate BOM**. Worse: when the Product was switched from BAYG → QSHS, the BOM panel kept showing the BAYG SKUs (`XPL-SB-50PK-09MM`, `XPL-EP-B-2PK`, `XPL-6000-SF-B`) and the BAYG total ($3,093.22) — but the form was now QSHS. A tradie could screenshot this and quote it.

**Fix**

Two cheap wins, one harder one:

1. Drop the "LIVE" badge until it's actually reactive. Replace with a "Stale — regenerate" amber pill the moment the form differs from the last-generated BOM.
2. On Product change, automatically clear the BOM and grey out totals.
3. Stretch: actually compute live as a debounced background recalc — the moat positioning ("see margin before you send") needs this.

---

## B-04 · On mobile, you can't navigate between Calculator A and B at all

**Tags:** Usability, Mobile

Header nav uses `hidden sm:flex`. Below the 640 px breakpoint the entire *Fence Calculator A / Fence Calculator B* nav disappears and there is no hamburger replacement. The "SkybrookAI" eyebrow badge also disappears, so the brand collapses to "The Glass Outlet · QuickScreen BOM Generator" floating left.

**Fix**

Add a mobile menu (hamburger or bottom-tab bar) that surfaces: switch product, saved jobs, settings, sign out. Tradies measure on phones — mobile cannot be a second-class citizen for a tradie SaaS.

---

## B-05 · 404 page leaks the React Router dev placeholder

**Tags:** Looks, Trust

Navigating to `/calculator-v4` (a typo of `/fence-calculator-v4`) returns the default `react-router-dom` error boundary: *"Unexpected Application Error! 404 Not Found · 💿 Hey developer 👋 You can provide a way better UX than this when your app throws errors by providing your own ErrorBoundary or errorElement prop on your route."*

This is the kind of thing a supplier sees and quietly decides not to share with their customers.

**Fix**

Wire a global `errorElement` on the root route. Branded 404 with "Take me to the calculator" CTA. Same treatment for 500s. This is a 30-minute job that materially changes how the product feels.

---

## B-06 · Numeric inputs don't select-on-focus — typing appends

**Tags:** Usability

Default segment length is 3.00. Click the field, type "12" — you get "312" (then 12.00 m if you tab out, but only because of input parsing forgiveness). Typing "0" to test the empty edge case ends up as a 120 m segment because the "0" was appended to the existing "12". This is the single most-felt papercut in the form.

**Fix**

On focus, `e.target.select()`. On every numeric input. Trivial fix, biggest perceived improvement of any item on this list.
