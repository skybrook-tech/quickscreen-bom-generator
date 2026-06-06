---
skill: anyfence-strategic-playbook
id: cmpnfyvjg00q306adbwia359t
description: Strategic playbook for Anyfence — the per-fence-type calculator network connecting Australian contractors with local material suppliers. Captures the three-channel distribution model, calculator engine capabilities, supplier-pilot prioritization rationale, competitive positioning vs QuoteMate, and Tier A decision-maker map.
whenToUse: 
tags: 
---

# Anyfence Strategic Playbook

The reference doc for what Anyfence is, why it exists, who it serves, and how to talk about it.

## The product in one paragraph

A network of per-fence-type calculators (one per category — Colorbond, aluminium slat, glass pool fencing, treated pine, etc.) that connects Australian fencing contractors with local material suppliers. A contractor enters job dimensions, height, style, and material. The system returns an accurate materials list and quote built around the participating supplier's own product codes. The contractor orders directly from that supplier; the calculator is the connective tissue between local trade demand and supplier inventory.

## Why this exists (the gap)

- Every other AU fence calculator is locked to a single supplier — contractors can't compare across suppliers without leaving the tool.
- Every contractor quoting tool requires manual material counting — slow, error-prone, doesn't return supplier-specific SKUs.
- Suppliers want contractor-driven order flow but balk at re-mapping their SKU system to fit a generic platform.

Anyfence closes all three gaps by preserving the supplier's product codes end-to-end while giving contractors fast, accurate take-offs.

## Three-channel distribution model

1. **Free generic calculators** — embed widgets on trade websites (the lead-gen funnel into the marketplace). These exist to drive organic and SEO traffic and to convert visitors into Anyfence consumer-side leads.
2. **Trades SaaS / Job Management** — contractors upload their own price lists, customize calculators per supplier, send branded quotes. This is the paid B2B SaaS surface.
3. **Consumer marketplace at anyfence.com.au** — homeowner draws their property, gets a quote, picks a local contractor, books — all in one flow. Two-sided marketplace with contractors paying for leads.

## Calculator engine capabilities (already built for aluminium slats)

- 4 fence systems: QSHS (Horizontal Slats), VS (Vertical Slats), XPL (Xpress Plus), BAYG (Build As You Go)
- Natural-language "describe-your-fence" parsing (regex v1 → LLM v2 progressive enhancement)
- Google Maps satellite underlay with fence/gate drawing tools
- Component-level BOM tied to real product SKUs
- Stock-length cut optimization
- Quantity-break pricing suggestions
- GST ex/inc totals, print, CSV export

Repository: `skybrook-tech/quickscreen-bom-generator`. The QSHS Fence BOM Calculator skill captures the canonical rules.

## Roadmap priority (validated against supplier-pool depth)

| Priority | Category | National suppliers | Status |
|----------|----------|---------------------|--------|
| 1 | Aluminium Slat/Louvre | 23 | Pilot live (QSHS) |
| 1 | Post & Rail | 23 | Build next |
| 1 | Colorbond/Steel Sheet | 22 | Build next |
| 2 | Pool Aluminium | 16 | Config ready (ProtectorAl) |
| 2 | Rural Post & Wire | 16 | Backlog |
| 2 | Aluminium Tubular | 15 | Backlog |
| 3 | Pool Glass | 14 | Config ready (ProtectorAl) |
| 3 | Treated Pine Paling | 13 | Calculator skill shipped |
| 3 | Chain Wire/Link | 11 | Backlog |
| 4 | Hardwood Paling | 9 | Variant of treated pine skill |
| 4 | PVC/Vinyl | 7 | Backlog |
| 4 | Brushwood/Bamboo | 4 | Niche but cheap to dominate |

Rationale: deepest supplier pools (Tier 1) give the best chance of multi-supplier coverage on the consumer marketplace. Brushwood is interesting precisely because only 4 competitors makes it easy to be the default category calculator.

## Competitive positioning

**Biggest threat: QuoteMate.** AI-driven quote generation from plain-English job descriptions, real-time AU supplier pricing. They DON'T have fence-specific calculation or supplier-specific SKU routing. These are Anyfence's defensible gaps. Speed to launch matters because QuoteMate could add these.

**Warm reception expected: Oxworks.** Already runs a Fencing Contractor Referral Program — philosophically aligned with calculator-network model. Approach with a partnership pitch, not a cold sales pitch.

**Other notable suppliers:**
- Bunnings Trade (Elissa Cunsolo) — would be a massive distribution win but slow to move
- Stratco (Kristopher Powell) — large, slow, but a logo win
- BlueScope/Lysaght (Robert Evans) — Colorbond manufacturer, parent brand
- Steeline (Kirsty Chivell) — strong rural distribution, easier to move than Stratco

## Headline pitch for suppliers

"Anyfence drives contractor-led order flow without re-mapping your SKU system. Your product codes stay yours, end-to-end. We do the calculator; you do the fulfillment."

Counter-objections to expect:
- **"We already have a calculator on our site."** Yours is locked to your range; ours competes across your category. Contractors need to compare — they will use a network tool whether you participate or not.
- **"Will this cannibalize our trade desk?"** No — the contractor still orders direct. We just generate the BOM. Your trade pricing relationship is untouched.
- **"What about exclusivity?"** Per-fence-type, per-region exclusivity is on the table for Tier A pilots. Trade-off: a small slice of the market in exchange for being the named default.

## What's been built so far (May 2026)

- 61 national supplier database with tier tags, emails, LinkedIn URLs
- Outreach pack: Tier A personal email, Tier B mail merge, day-7 follow-up, day-14 break-up, NDA, calculator wireframe, playbook
- bunnings-fence-scraper skill (Cloudflare-bypass via Exa, three-layer pipeline)
- fence_system_config.json for Colorbond, pool fence (ProtectorAl), treated pine paling
- treated-pine-paling-fence-calculator skill (butted + lapped-capped styles)
- QSHS Fence BOM Calculator skill (pilot reference)

## What's NOT built yet

- Consumer marketplace (anyfence.com.au homepage and contractor directory)
- The "describe your fence" natural-language parser on the consumer surface
- Trades SaaS upload-your-pricelist flow
- Per-state Fences Act notice template generator
- Calculator wireframes for Colorbond, post & rail, brushwood

## Style/tone for any Anyfence-facing content

- Calm institutional grotesk (Inter, Geist) — not marketing-magazine
- The data is the hero — sample BOMs and supplier code grids should be visible above the fold
- White or near-white canvas; one restrained accent (deep navy or muted terracotta — not Colorbond colour swatches as brand palette)
- No glowing particles, no AI-generated stock photos of fences. Real Bunnings/ProtectorAl product photography is more credible.
