# Calculator B Audit — P1 Trust Killers (Fixes)

> Source: internal review of `/fence-calculator-v4`, 5 May 2026. Nine issues that won't crash anyone's day, but each chips away at the "real margin, real prices, real BOM" pitch.

**Suggested order:** Sprint 2 — quote object + margin moat + canvas. After this, the moat positioning ("see real margin before you send") is actually visible.

---

## B-07 · Pricing tier is locked at T1 — no toggle, no margin preview

**Tags:** Functionality

The BOM shows a "T1" badge but offers no way to switch tiers or see the customer's tier overlay. Memory says tiers are 1.0 / 0.86 / 0.74. The whole moat is "real margin before you send" — that requires *at minimum* a tier toggle and a labour cost field on the BOM.

**Fix**

Click the "T1" badge → opens a small popover with tier options + a "see margin" expander. Add a "Labour cost" field above totals. Compute and display margin% in the totals row.

---

## B-08 · $0.00 prices in the BOM look like bugs even when they're data gaps

**Tags:** Functionality, Trust

`QS-SFCAP-B-2PK` shows Unit $0.00 / Line $0.00 in every QSHS BOM. `PAINT-B` in Suggested Accessories shows $0.00. A tradie won't know if those items are actually free, or if pricing data is incomplete and they need to ring the supplier.

**Fix**

Replace `$0.00` with a "Price TBC" pill (amber). On hover/click, show "We don't have a confirmed price for this SKU yet — please confirm with The Glass Outlet." Suppress the line in the subtotal but keep it in the BOM.

---

## B-09 · Raw slugs leak into the visible UI

**Tags:** Usability, Looks

On the XPL form: `Mounting Type: in_ground`, `Post System: xpl`, `Post Mounting Method: in_ground`. These are database slugs, not labels.

**Fix**

Centralised label-mapping helper (`labelFor(field, value)`). Slug-to-label table per system in the schema seed JSON. `in_ground` → "In-ground (concreted)". `xpl` → "XPress Plus".

---

## B-10 · Canvas → form sync is silent and lossy

**Tags:** Functionality

Drew an L-shape on the canvas (3 points, finished with double-click), then clicked **Use This Layout →**. The Run 1 length stayed at 12.00 m (its previous typed value), corners stayed 0. The drawing didn't translate into the form. There was also no visible feedback that "Use This Layout" did anything.

Either (a) the canvas isn't actually capturing the points, or (b) it captures them but doesn't push to the form, or (c) it pushes but the pre-existing form values overrode silently. Any of those is a P1 — drawing is a hero feature.

**Fix**

1. Show a "Captured" toast with the metric: "Captured 17.4 m across 3 segments and 2 corners."
2. Resolve the "form has values, drawing has values" merge with a clear modal: *Replace form values with drawing? Yes / Merge / Cancel*.
3. Visualise points/lines as you click — currently the canvas feedback is hard to verify is actually rendering.

---

## B-11 · Empty state is "Pick a fence product to begin" — and that's the whole story

**Tags:** Usability, Looks

Four flat tiles labelled QSHS / VS / XPL / BAYG. No imagery showing what each system *looks like*. No 1-line description of what each is best for. A new tradie won't know the difference between QSHS and VS.

**Fix**

Each card: photo of the installed system, 1-line description ("Horizontal slats, side-frame fixed — most common"), price-from-per-metre, "Used in 47% of jobs" if you have the data. Make the empty state a confident catalogue, not a sparse menu.

---

## B-12 · "Job name" alone isn't a quote

**Tags:** Functionality

To send a quote you need: customer name, address (which the satellite layer already needs), email, ABN, valid-until, deposit terms, delivery instructions. None of those exist on B. The Quotient pattern is the right reference here.

**Fix**

Add a "Quote" tab beside the BOM panel. Fields: customer (with autocomplete from prior quotes), site address (auto-fills satellite layer), email, valid-until (default +14 days), terms. *Save Job* becomes *Save & Send Quote* with the Optional Items + Multiple Choice patterns from Quotient.

---

## B-13 · PDF button has no in-app preview

**Tags:** Usability

Clicking PDF in the BOM panel triggers a download. Tradies want to see the PDF before sending, not download-then-open every time.

**Fix**

PDF button → opens a side-drawer preview (using `@react-pdf/renderer`'s `PDFViewer`). Footer of the drawer: "Download · Email to customer · Copy link." This becomes the natural surface for the supplier-branding controls (B-30).

---

## B-14 · "Full run / Segments / Gates" tabs read like filters but feel like modes

**Tags:** Usability

In Run 1 there are three tabs: `Full run (1)`, `Segments (1)`, `Gates (0)`. Unclear if these are filters on the panel below, view modes, or something else. Their visual weight matches the system tabs above them, which adds confusion.

**Fix**

If they're filters, label them "View" and use a smaller pill style. If they're modes, label them "Mode". Add a one-line helper under the active tab: "Showing all 1 segment in Run 1."

---

## B-15 · No form-level undo

**Tags:** Functionality

Canvas has Undo. The form does not. A misclick on **Clear Job** or **Remove run** destroys 10 minutes of work with no path back.

**Fix**

Confirmation modal on destructive actions ("Clear Job will remove all runs and segments — undo within 10 seconds?"). Toast with "Undo" link after destructive operations. Stretch: app-wide ⌘Z that pops the last form mutation.
