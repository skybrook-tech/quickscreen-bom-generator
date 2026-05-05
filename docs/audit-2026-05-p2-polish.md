# Calculator B Audit — P2 Polish & UI Improvements

> Source: internal review of `/fence-calculator-v4`, 5 May 2026. Seventeen items that separate "useful tool a supplier built" from "premium product a supplier brags about."

**Suggested order:** Sprint 3 — pick one of Linear / Stripe / Vercel and commit. Add the colour swatches, the slat diagrams, the system-card photography, the avatar menu, ⌘K, sample job. After this you have a product to ship to a second supplier.

---

## What B already gets right (keep these)

- Live BOM panel with grand total persistently visible — anchors the user mentally to the number that matters.
- System-aware form (QSHS, VS, XPL, BAYG render different attribute sets) — the 3-layer schema is genuinely paying off.
- Discrete VS/BAYG height picker (370 mm, 444, 518…) prevents tradies entering invalid heights.
- Suggested Accessories section (Rapid-set concrete, Touch-up paint) — rule-taxonomy moat showing up in the UI.
- Per-segment override pattern ("Job settings override (this segment)") — clean separation of defaults vs. exceptions.
- Job name field at the top — small but signals "this is a job, not a query."
- Layout map opens as a side drawer (not a modal) — keeps the form context visible.
- Satellite underlay with address geocoding — feature most competitors don't have.
- BOM groups items by category (POSTS, SLATS, CFC COVER, etc.) — feels like a real BOM.
- "T1" tier badge — at least surfaces that tiers exist.

---

## B-16 · Typography is generic Tailwind sans

**Tags:** Looks

Body and headings are the same family at slightly different weights. No editorial voice, no display contrast.

**Fix**

Pair an editorial display face (Fraunces, Tiempos, GT Sectra) for headings/totals with a precise sans (Inter, Söhne, GT America) for body. Big number type for the BOM grand total — that number is the whole product's punchline.

---

## B-17 · The beige/cream palette reads "handcrafted lifestyle" not "professional tradie SaaS"

**Tags:** Looks

Background is `brand-paper`. It's competent and warm but it sits closer to Kinfolk than to Linear/Vercel/Stripe. The accent orange is fine — keep it, sharpen its use.

**Fix**

A/B two palettes:

- (a) clean off-white + ink-black + ember-orange accent
- (b) refined deep-graphite dark mode + warm-cream highlights

Either signals "premium". The current cream signals "cosy."

---

## B-18 · Brand mark is a text badge in a pill

**Tags:** Looks

"SkybrookAI" rendered in uppercase tracked text inside an outlined pill. There's no actual logo, no consistent identity device, no co-brand block ("SkybrookAI · for The Glass Outlet").

**Fix**

Commission a wordmark + symbol now (the tool will be on suppliers' websites). Add a clean co-brand block in the header: *SkybrookAI* · *The Glass Outlet QuickScreen*.

---

## B-19 · System cards are flat tiles

**Tags:** Looks, Usability

QSHS / VS / XPL / BAYG render as identical-sized rectangles with text-only content. No imagery of the installed system, no hover preview, no animation, no "most popular" hint.

**Fix**

Each card: 16:9 install photo, system name in display type, 1-line description, price-from-per-metre. On hover: subtle lift + a "View specs" reveal showing slat sizes / max heights / typical use cases. This is a "trust" surface — invest in it.

---

## B-20 · BOM panel could be a sticky drawer with always-visible total

**Tags:** Usability

Currently the BOM lives in a right column that scrolls with the page. On a 1440 viewport it's fine, on smaller it disappears. The grand total — the whole point — needs to follow you down the page.

**Fix**

Sticky header on the BOM column with a single big number ($3,333.54) and a chevron to expand. Even better: a persistent "BOM" tab on the right edge of every viewport that pulls out the full panel.

---

## B-21 · No keyboard shortcuts

**Tags:** Usability

Pro tools (Linear, Figma, Notion) all have `⌘K` command palette + global shortcuts. None here.

**Fix**

- Phase 1: `G` = Generate BOM, `S` = Save Job, `L` = open Layout map, `?` = shortcuts overlay.
- Phase 2: `⌘K` palette to jump to any saved job, switch product, add segment.

---

## B-22 · No "BOM is stale" indicator when the form changes

**Tags:** Usability

Changed segment length from 3 to 12, the BOM panel still showed totals from the old generation until Generate was clicked again. There's no visible cue that "this BOM no longer reflects the form."

**Fix**

Hash the form state. If hash != last-generated-hash, show an amber "Stale — regenerate" banner on the BOM panel and grey out totals. Pairs with B-03.

---

## B-23 · Colour options are text buttons, not actual swatches

**Tags:** Looks, Usability

Selecting a colour means reading "Black Satin · Monument Matt · Woodland Grey Matt…" as text. Tradies and customers expect to *see* the colour.

**Fix**

Render each option as a 32×32 swatch with the colour name underneath. On hover: full Colorbond product chip with finish (matt/satin/gloss) and "limited stock" warning when applicable. Carry these swatches into the PDF preview.

---

## B-24 · Slat-size 65 / 90 toggle could be visual

**Tags:** Looks

Same bones as the colour swatches issue. Numbers as buttons feels Excel.

**Fix**

Tiny SVG diagram of each slat profile next to the size number. Same treatment for slat gap.

---

## B-25 · No unit suffix inside numeric inputs

**Tags:** Usability

"Slat gap (mm): 9" — the "mm" is a label below, not a suffix in the field. On focus you see just "9". Stripe-style suffix-in-field reads more confidently.

**Fix**

Render units as a right-aligned suffix inside the input (greyed). Strip on parse.

---

## B-26 · Job name has no auto-save affordance

**Tags:** Usability

Type a name, walk away — no indicator that anything was saved or staged.

**Fix**

On blur: small "Saved · 2s ago" greyed text to the right of the input. Pairs with B-01's overall save discipline.

---

## B-27 · Canvas in dark mode stays light

**Tags:** Looks

Toggling dark mode flips the chrome but the canvas is still a white grid. Jarring at night.

**Fix**

Dark canvas variant: deep graphite grid, warm-amber stroke for runs, cooler-blue for boundary. Match the design system's dark tokens.

---

## B-28 · "T" avatar in the header is non-interactive

**Tags:** Usability

The T avatar (initials) in the header has no menu. Sign out is a separate icon button. This is the natural place for: profile, billing, settings, sign out.

**Fix**

Avatar → dropdown with: profile, switch supplier (when multi-supplier ships), billing, settings, sign out. Frees the header bar.

---

## B-29 · The "real margin before you send" moat is invisible

**Tags:** Functionality, Strategy

The product currently shows materials cost. The whole pitch is: *"Stop bleeding margin on bad quotes. See your real margin before you send."* Right now there's no labour cost, no margin slider, no comparison-to-target margin. The differentiator isn't visible in the calculator at all.

**Fix**

Add a "Job costing" mini-panel above the BOM totals: Labour ($/hr × hours), Travel, Equipment, Other. Auto-compute Margin% and show it as a big number with a colour pulse vs. target margin. This is the single thing that justifies the whole platform.

---

## B-30 · Supplier (The Glass Outlet) co-brand is too thin for the white-label pitch

**Tags:** Looks, Strategy

The supplier appears once, as small text in the header. Suppliers paying for white-label want their identity present — header, BOM panel, PDF, footer.

**Fix**

Build a "supplier theme" config: logo, accent colour, contact strip on PDF, optional supplier-specific empty-state imagery. Give The Glass Outlet a proper brand block in the header. Pitch to other suppliers becomes "your brand, our engine."

---

## B-31 · Form layout reads "spreadsheet" — needs whitespace and hierarchy

**Tags:** Looks

The "Default Settings" panel and the per-segment panels render every field at the same visual weight, with tight padding. It's information-dense in a busy way, not a confident way. McKinsey/FT-density beats Excel-density.

**Fix**

Group fields by intent: *Identity* (job name, customer), *Specification* (system, defaults), *Geometry* (runs/segments). Use restrained dividers. Bigger section headings in the display face. Roughly 1.4× more vertical rhythm. Aim for "feature-rich but breathable" — Linear is the reference.

---

## B-32 · No first-time onboarding or sample job

**Tags:** Usability

A new tradie's first login lands on the empty state with 4 unfamiliar acronyms. No tooltip, no tour, no sample job to look at.

**Fix**

Pre-load each account with one sample job ("Smith residence — 14 m QSHS Black Satin") that the user can clone. Optional: a 30-second walkthrough overlay on first login. Notion's onboarding is the reference here.

---

## Aesthetic direction — pick one and commit

The current cream/handcrafted palette sits closer to a craft brand than a tradie SaaS. For the moat to read, the visual language needs to signal "professional tool" the way Stripe signals "payments infrastructure."

| Reference | Why | Best fit |
| --- | --- | --- |
| **Linear** | Refined dark UI · monospace numerics · soft-glow accents · keyboard-first | If you commit to dark mode as the hero. Implies ⌘K, motion, pro feel. |
| **Stripe** | Clean off-white · sharp display headlines · dense forms with breathing room · accent colour used sparingly · big number type | The supplier white-label pitch — supplier brands sit on top cleanly. |
| **Vercel** | Pure black + pure white · razor-sharp geometric type · big number callouts · technical confidence | If you want to project "premium engineering." |
| **Figma (canvas)** | Hover affordances, snap visualisation, dimension labels on every drawn segment, multi-select with marquee | Reference for the Layout drawing tool. The canvas is half the product — it should feel like Figma, not MS Paint. |
| **Notion** | Sample job, friendly first-run, optional tour. Approachable expertise | Reference for empty states and onboarding (B-32). |
| **Quotient** | Optional + Multiple Choice items, Webhooks API, Accept-to-invoice | Reference for the quote object you don't have yet (B-12). |
