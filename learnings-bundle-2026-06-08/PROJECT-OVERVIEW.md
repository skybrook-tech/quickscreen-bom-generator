# Anyfence — Project Overview

*The plain-English explanation of what we're building, why it matters, and where it's going. If you're a fresh agent or collaborator, **start here**, then dig into `skills/`, `memories/`, and `rubrics/`.*

**Last updated:** 2026-06-08 · **Owner:** Liam · **Domain:** anyfence.com.au
**Owner's fencing companies:** Byron & Beyond Fencing (Northern Rivers / Gold Coast) — *confirm: a transcription read this as "FireBeyondFencing"; treat as Byron & Beyond until corrected.*

---

## The one-liner

**Anyfence is a nationwide Australian app that lets anyone — a homeowner or a tradesperson — get an accurate fence price in minutes, from their phone or computer, instead of waiting weeks for quotes.** Fencing is the beachhead; other trades follow once the model is proven.

## What it does, for each side of the market

**Consumers** describe or draw their fence, get a real price in minutes, pick a vetted contractor, and book — no more chasing three quotes over several weeks.

**Contractors / tradespeople** price a job accurately down to *every nut, bolt and screw* using calculators wired to real, current supplier prices. They stop quoting blind and stop wasting days driving to every site to measure-and-guess — they can win the job first and only visit to verify when it's actually worth their time.

**Suppliers** have their current prices flow into the app automatically *from the systems they already run* — so they field far fewer price-check phone calls and sell more. They never have to maintain a separate Anyfence price list.

That's the whole point: **it helps everyone at once.** Consumers get speed and transparency, contractors get accuracy and less wasted travel, suppliers get easier selling and more orders.

---

## The two cornerstones

Everything else is built on these two things. If these work, the app works.

### Cornerstone 1 — The supplier ↔ contractor pricing link (the data layer)

This is the hard, valuable part, and the moat.

We connect to **wherever a supplier already keeps their prices** — their accounting / inventory system (Xero, Cin7, Unleashed, MYOB), or a spreadsheet, or the free Anyfence tool they quote and order through — and keep those prices **fresh automatically**. We then syndicate that data through the app with **separate retail prices (for consumers) and trade prices (gated to verified contractors)**.

Principles that are non-negotiable:
- **Never ask a supplier to update Anyfence separately.** Stale prices kill platforms like this — always pull from the source they already maintain.
- **The pricing data is the moat.** The calculators and the marketplace are *consumers* of this data layer, not the product itself.
- **The consumer site stays neutral** — it lists all suppliers and contractors and favours none. No paid default placement.
- **Monetisation:** a small percentage of supplier sales *and* contractor sales that flow through the platform (a dual-sided take-rate).

### Cornerstone 2 — Calculator builders that are easy to use and very accurate

A fence calculator has to output a complete bill of materials — every post, rail, paling, bracket, screw, bag of concrete and gate latch — using each supplier's own product codes. Nothing hand-waved.

Two agents own this:
- **Fence Forge** — owns the base calculators, the BOM math kernel, and the *canonical-name contract* (supplier-agnostic product names).
- **Build Forge** — the in-app wizard that lets a non-technical supplier or contractor build or customise their own calculator in roughly 20 minutes, with the AI doing the translation.

---

## How it reaches people — three distribution channels

1. **Free embed calculators** placed on trade websites — a lead-generation funnel into the marketplace.
2. **Trades SaaS / job management** — contractors upload price lists, customise calculators, and send branded quotes.
3. **Consumer marketplace** at anyfence.com.au — draw → quote → pick a contractor → book, in one flow.

---

## The rollout — and why speed matters

The app only delivers its value once a critical mass of **both suppliers and contractors** are on it. That's a network effect and a cold-start problem, so the plan is to go **deep before wide**:

- **Beachhead:** densify one region first (the owner's turf — Northern Rivers / Gold Coast) instead of spreading thin across the country.
- **Wedge:** lead with a **free supplier-enablement tool** (digitise pricing + online ordering, pay only when a sale goes through) — the OpenTable / Square / Toast / Shopify playbook. This solves cold-start and the supplier incentive at the same time; the network and data fall out as a by-product.
- **Then, in sequence:** integration lanes (Xero / Cin7 / MYOB connectors + a spreadsheet importer) → syndication (retail + trade API keys) → the big national chains last.
- **We need a large network, a huge ecosystem — and we need to build it quickly.**

### Pilots (live now / next)
- **Amazing Fencing** — supply **and** install. Priority: get them live first, with the calculator + pricing embedded on their website. This is the first real-world proof.
- **Byron & Beyond Fencing** — the owner's own company. Pricing isn't uploaded yet; this is pilot #2, straight after Amazing Fencing.

---

## How we build it

- **The owner is the orchestrator / director of AI coding agents** — he sets strategy and reviews output; he does not hand-code.
- **Antigravity 2.0 + Jules** run the build fleet (data layer, calculator engine, supplier-mapper, embed widget, tradie app, marketplace) — lots of agents working in the background.
- **The chief-of-staff layer** (this knowledge base) owns strategy, specs, golden fixtures, the canonical-name contract, supplier data, and reviews agent output before merge.
- **Google AI Ultra** is the chosen toolkit. The owner has the top Ultra plan and wants to push the new Google AI products — and AI video (Veo / Flow) — to their full potential while building the rest of the app.
- **Agents stay coordinated by fixed contracts** — the data-layer API shape, the canonical-name contract, the `fence_system_config` schema, and golden fixtures — not by negotiating with each other.

---

## What already exists

- **QuickScreen** (The Glass Outlet) — the pilot / reference calculator: four aluminium-slat systems (QSHS, VS, XPL, BAYG), natural-language "describe your fence," a Google Maps satellite drawing canvas, component-level BOM tied to real SKUs, stock-length cut optimisation, GST handling, print + CSV export.
- **A calculator skill library** — the treated-pine paling calculator is live (v3, with parameterised concrete math); specs are drafted for Colorbond, aluminium slat, composite retaining, pool-barrier validation, and gates.
- **A national supplier database** — 61 Australian fencing suppliers, tier-tagged across 12 fence categories.
- **A job-management system** the owner has already built (calendar scheduling + finances) — to be linked into the app at a later stage.
- **This bundle** — 48 skills, 46 memories, and 16 rubrics that encode the domain knowledge, calculator logic, Australian compliance rules, and operating playbooks. (See `skills-inventory.md` and `memories/memories.md`.)

---

## Where we are (June 2026) and what to do next

The pieces exist in parts. The job now is to **bring it all together and send it home.** Suggested focus areas for Antigravity to validate, sequence, and then work through with the owner:

1. **Get Amazing Fencing live** on their website (calculator + pricing) — the first real-world proof point.
2. **Stand up the pricing link** for the first handful of suppliers — the Xero connector is the gold-standard path.
3. **Upload Byron & Beyond pricing** and go live as pilot #2.
4. **Harden Build Forge** so a non-technical supplier can self-onboard a calculator accurately.
5. **Plan the regional density push** and the free enablement wedge to grow the network fast.
6. **Decide when and how to link the job-management system** (scheduling + finances) into the app.

> **Antigravity:** read this bundle's skills and memories, confirm this picture is current, then propose the best next steps and walk through them with the owner.

---

## Glossary

- **Anyfence** — the platform / app (anyfence.com.au).
- **BOM** — bill of materials; the complete parts list a calculator produces.
- **Canonical name** — a supplier-agnostic product name the calculators emit (e.g. `100x75 Treated Pine Post`); the supplier-mapper later links it to a specific supplier's SKU + price.
- **Fence Forge / Build Forge** — the two calculator-building agents: base engine + contract vs. the self-serve supplier wizard.
- **QuickScreen** — the pilot calculator, built for The Glass Outlet.
- **Supplier-mapper** — converts canonical names → a specific supplier's SKU, price, pack size, and availability.
- **`fence_system_config.json`** — the universal configuration file the calculator engine consumes.
- **Pricing data layer** — the cross-vendor, real-time price/stock layer that connects suppliers and contractors; the moat.
- **Pilot** — Amazing Fencing (supply + install) first, then Byron & Beyond Fencing.
