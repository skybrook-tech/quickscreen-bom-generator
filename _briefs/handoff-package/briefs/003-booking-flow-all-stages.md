# Handoff 003 — Booking flow · 5 steps + Supply-only diff

**Depends on:** 002 merged
**Implements:** All 5 steps + Supply-only diff in `wireframes/03-booking-flow-v1.html`
**New route:** `/book/:quoteId`
**New file paths:** `src/pages/BookingFlowPage.tsx` + supporting components

## Goal

When a customer taps "Book this job" or "Book materials pickup" on the entry-page price bubble (Brief 002), they're taken to `/book/:quoteId`. This brief is the entire booking flow from there to confirmation:

- Step 1 — Your details (name, email, phone, autofilled site address)
- Step 2 — Walkthrough video (Supply + install only)
- Step 3 — Pick install date (Amazing Fencing's calendar)
- Step 4 — Review + 10% deposit (Stripe-style payment form)
- Step 5 — Booked confirmation

Plus a **Supply-only diff** path that skips Step 2 and reshapes Step 3 to pickup-date logic.

## What to build

### Page shell (shared across all 5 stages)

Layout: Stripe-Checkout-style two-column

- **Top**: Amazing Fencing brand + "BOOKING" context tag + "Powered by Anyfence" platform strip + help phone number
- **Progress bar** spanning full width: 5 steps with completion state (done ✓ / active / upcoming). One step may show as `--skipped` (dashed + struck-through label) for the Supply-only path.
- **Left column** (~320px, sticky): quote summary card
  - Mini map thumbnail (rendered from the saved canonical payload, ~200×150, scaled-down version of the entry-page canvas)
  - Fence type + dimensions + spec grid
  - Line breakdown (Supply / Install / Extras / Total / 10% deposit / Balance)
  - Amazing Fencing supplier card at the bottom
- **Right column** (active step content): big heading, lede, form fields, primary CTA
- **Bottom strip**: "Booking secured by Anyfence" tag line

### Step 1 — Your details

Form fields:
- Site address (autofilled, read-only with "Change" link back to calculator)
- Full name (required)
- Phone with AU flag prefix (required)
- Email (required) — quote PDF + confirmation arrive here
- Best time to call (optional dropdown)

CTA: "Continue to walkthrough video →"

### Step 2 — Walkthrough video (Supply + install only)

Big ember-orange drop-zone in the centre:
- "🎥 Drop a video, or record one now"
- Two buttons: "Record now" (in-browser camera) + "Choose a file"
- Accept: MP4 or MOV up to 250 MB

Below the drop-zone, a `video-tips` card with 5 bullet points (walk the line, show neighbouring fences, point at trees / slope / access, show drop-off spot, show fence to remove).

Skip-with-caveat link at the bottom: "I'll send the video later" + amber warning "Installer won't confirm the install date until they've seen the video."

CTA remains disabled (semi-transparent) until a file is uploaded. Once uploaded, replace the drop-zone with a video file preview card (thumbnail + filename + duration + ✓).

### Step 3 — Pick install date

Calendar component (Amazing Fencing's actual availability):

- Month grid (7 weekday columns × ~5 rows)
- Each day shows: day number + tag ("2-day" for available 2-day slots, "Day 2" for the second day of a 2-day install, blank for booked/closed)
- Day states (CSS classes):
  - `--available` (green-tinted background, `--success-soft`)
  - `--selected` (ember background, `--ember`)
  - `--booked` (hatched grey-striped)
  - `--closed` (red-tinted, for weekends/public holidays without install crews)
  - `--out` (greyed, this-month outside)
- Legend below the grid
- Navigation arrows for month switching

Below the calendar, a **booking-time-card** (ember-soft background) showing the live readout:
- `📅 Tentative — Tue 16 June, finishing Thu 18 June`
- `Locks for 24h. Installer confirms after watching your video — they'll usually accept within 4 working hours.`

CTA: "Continue to review + deposit →"

### Step 4 — Review + 10% deposit

Top: navy "deposit banner" — `🔒 10% deposit today · $461.00 · of $4,608 total · refundable until 48h before install · balance on completion`

Below it, four `review-card`s in a 2-column grid:
- **YOUR JOB**: Type · Height · Length · Posts × Gates
- **YOUR CONTACT**: Name · Email · Phone · Site address
- **YOUR INSTALL DATE**: Start · Finish · Crew · Status (Tentative · awaits video review)
- **YOUR WALKTHROUGH**: 60×38 video thumbnail · filename · duration · ✓ uploaded

Each card has an "Edit" link that routes back to the relevant step.

Below the review cards, a Stripe-style **payment form**:
- Card brand row (Visa / MC / AMEX badges right-aligned)
- Card number, Expiry (MM/YY), CVC, Name on card

CTA: "🔒 Pay $461 deposit · Book Tue 16 Jun"

Trust strip below: "Secure payment via Stripe" · "Refundable until 48h before install" · "H4 timber · council-compliant"

### Step 5 — Booked

Centered hero:
- Big green ✓ icon (72px, success colour)
- "Booked!"
- Sub-text: "Your timber paling fence is locked in for Tue 16 June 2026. Reference: Q-4F9A2C."

Below: `next-steps` block with 4 numbered cards:
1. **Now** — confirmation email + receipt sent
2. **Within 4 working hours** — Amazing Fencing reviews the video
3. **Two days before** — installer calls to confirm access + drop-off
4. **Day of install** — 7am text with team's ETA

Three CTAs in a row: "View your booking" · "📅 Add to calendar" · "📧 Email a copy"

Footer note: "Need to change something? Call Amazing Fencing on 1800 739 359 or reply to your confirmation email. Refunds available up to 48h before install."

### Supply-only diff (when entry mode = Supply only)

Same 5-step shell, with these changes:

- Step 2 (Walkthrough video) is **skipped** — progress dot shows dashed with struck-through label, bar to the right is dashed
- Step 3 becomes "Pick pickup date":
  - Calendar shows depot pickup slots (not 2-day install windows)
  - Each day's tag shows "3 slots" / "5 slots" instead of "2-day"
  - Sundays closed (depot only — no postcode-zone filtering)
  - booking-time-card reads "🛻 Mon 8 June · 9:00am pickup · 10-minute window. Bring a ute or trailer..."
- Step 4 deposit banner reads "refundable until 24h before pickup" (not 48h before install)
- Step 4 review cards: "Your pickup date" replaces "Your install date"; no "Your walkthrough" card
- Step 5 next-steps cards reduce from 4 to 2 (pickup-day text, no installer call)

## Engine binding

- Quote ID (`q_4f9a2c`) comes from the URL param
- Load the quote payload from Postgres (already saved during entry-page calculator flow)
- Persist booking state to `bookings` table (new) — needs a migration in a separate brief
- Payment processed via Stripe (existing platform integration — confirm with Liam if connected for Amazing Fencing)
- Calendar availability pulled from `supplier_availability_windows` table (new — confirm if exists or needs scaffolding)

If `bookings` or `supplier_availability_windows` don't exist yet, **stop and surface to Liam** rather than scaffolding them. The schema for these is a separate brief.

## Files to modify / create

- New page: `src/pages/BookingFlowPage.tsx`
- New components: `src/components/booking/QuoteSummary.tsx`, `ProgressSteps.tsx`, `Calendar.tsx`, `VideoUploader.tsx`, `ReviewCard.tsx`, `DepositBanner.tsx`, `PaymentForm.tsx`, `ConfirmationHero.tsx`
- `src/App.tsx` — add `/book/:quoteId` route
- New hook: `src/hooks/useQuoteForBooking.ts` (loads quote payload by ID)
- New hook: `src/hooks/useStripePayment.ts` (Stripe Elements wrapper for the deposit step)
- New hook: `src/hooks/useSupplierAvailability.ts` (calendar data)

## Files NOT to modify

See `reference/protected-paths.md`. Same list.

## Acceptance criteria

1. Click "Book this job" on the entry-page price bubble → land on `/book/:quoteId` Step 1
2. Quote summary on the left mirrors what was on the entry page (same total, same dimensions, same fence type)
3. Step 1 form validates required fields, persists to draft state on blur
4. Step 2 video upload works end-to-end (test with a 30-second test MP4)
5. Step 3 calendar shows real availability data (or mocked data — but the component reads from `useSupplierAvailability`)
6. Step 4 review cards show data captured in prior steps; Edit links route correctly
7. Step 4 Stripe form processes a test payment (use Stripe test keys)
8. Step 5 confirmation page shows after successful payment with the correct reference number
9. Supply-only flow at `/book/:quoteId?mode=supply-only` skips Step 2 with the dashed-skipped progress visual
10. Cypress e2e test passes for both paths

## What's deliberately out of scope

- The post-booking customer page (`/booking/Q-…/status`) — separate brief
- The supplier-side install-team review queue — separate brief
- Email templates / SMS templates — separate brief
- Mobile layout (separate brief)
- Schema migrations for `bookings` + `supplier_availability_windows` if they don't exist — separate brief (stop and surface to Liam)

## Reference

- Wireframe: `wireframes/03-booking-flow-v1.html` — all 5 steps + Supply-only diff
- Amazing Fencing context: `reference/amazing-fencing-context.md`
- Protected paths: `reference/protected-paths.md`
