# 00 — Anyfence Platform Overview

## What Anyfence is

Anyfence (anyfence.com.au) is a **national Australian fencing marketplace built on top of a multi-supplier calculator engine**. A homeowner draws their fence on a map, sees prices from local contractors in real time using each contractor's real supplier pricing, picks a contractor, and books — collapsing weeks of quote friction into one evening.

Underneath the marketplace is the thing that makes it defensible: **a network of per-fence-type calculators** (one per category — Colorbond, aluminium slat, glass pool fencing, treated pine paling, chain mesh, picket, hardwood, tubular). A contractor enters dimensions, height, style and material; the system returns an accurate bill of materials and quote built around the participating supplier's **own product codes** (no SKU re-mapping forced on the supplier).

## The three doors (distribution channels)

1. **Consumer marketplace — anyfence.com.au.** Draw + quote + book + upload a walk-through video. Contractor accepts or requests a site visit. National coverage built supplier-by-supplier.
2. **Supplier-embedded calculator.** A widget that drops onto a supplier's existing website. Customer enters dimensions → sees "supply + install" from contractors who already buy from that supplier → the order flows through the supplier's SKUs. **The supplier is the channel, not the bypass.**
3. **Contractor app (SkyBrook).** Phone-first. Calculator + branded quote send. Optional job-management upsell (scheduling, invoicing, Xero sync).

## What we are building right now

- The **anyfence.com.au website** with a **supplier backend** and a **contractor backend**.
- The **calculator builder** — the tool that turns a supplier/contractor's product list + rules into a working per-fence-type calculator (config-driven; see `01` and `02`).

## The structural moat

Four data sources, one product:

```
parametric calculator BOM  ×  versioned supplier price book  ×  quote object  ×  accounting actuals
```

Nobody else in the AU tradie-SaaS space connects all four. The unfair advantage is **real margin visible before the quote sends**:

```
calculator BOM × supplier price = COST
contractor labour rate          = REVENUE
REVENUE − COST                  = MARGIN  (live, before send)
```

## Reference pilot

**The Glass Outlet — QuickScreen BOM Generator** is the pilot calculator and the reference template for the whole platform. It already ships: 4 fence systems (QSHS Horizontal Slat, VS Vertical Slat, XPL Xpress Plus, BAYG Build-As-You-Go), natural-language "describe your fence" parsing, Google Maps satellite underlay with fence/gate drawing tools, component-level BOM tied to real SKUs, stock-length cut optimisation, quantity-break pricing, GST ex/inc totals, print, and CSV export. The QuickScreen system specs are in `skills/quickscreen-systems/`.

## Market context (grounded research, 2026-05)

- AU residential fencing market: ~$850M–$1.1B annually.
- ~2,500 online-verifiable contractors (~5,600 by peak-body count); **89.7% single-owner ops** — the fragmentation is the wedge.
- Average job: ~$3,390 standard install.
- Geographic concentration: NSW 24%, VIC 24%, QLD 17%, WA 11% (WA over-indexes on Colorbond).
- Supplier database: **61 national suppliers** catalogued across 12 fence categories. Deepest pools: Aluminium Slat/Louvre (23), Post & Rail (23), Colorbond/Steel Sheet (22) — the strongest calculator-pilot categories.

## Closest competitor / threat

- **QuoteMate** — AI quote generation from plain-English job descriptions with real-time AU supplier pricing. They do **not** yet have fence-specific calculation or supplier-specific SKU routing — those are Anyfence's defensible gaps. Speed to launch matters.
- No platform combines embedded calculator + multi-supplier + consumer-facing UX. hipages dominates lead-gen but has no calc/quote/actuals. ServiceM8/Tradify/AroFlo have job management but no parametric calc.
