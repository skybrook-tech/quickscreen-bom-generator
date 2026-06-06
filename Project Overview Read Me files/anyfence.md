# Anyfence

Project document for Anyfence

## Goals

**What Anyfence is:** A network of per-fence-type calculators (one per category — Colorbond, aluminium slat, glass pool fencing, etc.) that connects Australian fencing contractors with local material suppliers.

**How it works:** A contractor enters job dimensions, height, style and material into the calculator. The system returns an accurate materials list and quote built around the participating supplier's own product codes. The contractor orders directly from that supplier; the calculator acts as the connective tissue between local trade demand and supplier inventory.

**Value to suppliers:** Contractor-driven order flow without re-mapping their SKU system. Their existing product codes are preserved end-to-end.

**Value to contractors:** Fast, accurate material take-offs and quotes from local suppliers who can fulfil.

**Status:** Database of 66 national material suppliers researched and catalogued across 12 fence categories. Outreach pack drafted. Calculator pilots prioritised: aluminium slat/louvre, post & rail, and Colorbond/steel sheet have the deepest supplier pools (22-23 national suppliers each) and are the strongest launch candidates.

## Strategic Playbook (2026-05-28)

_Distilled from Liam's full architectural download on 2026-05-28. Published as a shareable webpage; this section is the canonical text for cross-thread reference._

## The vision in one paragraph

Anyfence is a national fencing marketplace built on top of a multi-supplier calculator engine. A homeowner draws their fence on a map after dinner, sees prices from local contractors in real time using each contractor's real supplier pricing, reads reviews, books direct, uploads a walk-through video. The contractor accepts or asks for a quick site visit. Six weeks of friction collapses to one evening.

## Three doors, one platform

1. **Consumer-facing — anyfence.com.au.** Draw + quote + book. Lives at the domain Liam already owns. National coverage built supplier-by-supplier.
2. **Supplier-embedded calculator.** Drops onto the supplier's existing website as a widget. Customer enters dimensions → sees "supply + install" from contractors who already buy from that supplier → order flows through the supplier's SKUs. The supplier is the channel, not the bypass.
3. **Contractor app (SkyBrook).** Phone-first. Calculator + branded quote send. Optional job-management upsell (scheduling, invoicing, Xero sync, agentic workflows — the JMS that's mostly already built).

## The structural moat

Four data sources, one product: parametric calculator BOM × versioned supplier price book × quote object × accounting actuals. Nobody else in the AU tradie SaaS space connects all four. The unfair advantage is **real margin visible before the quote sends** — calculator BOM × supplier price = cost, contractor labour rate = revenue, gap = margin, live.

## Go-to-market — supplier-led, calculator-first

1. **Build** (now → month 3, in flight): multi-supplier calculator architecture. Brief queue 028 + 032-044. Discount Fencing proves the architecture.
2. **Seed** (months 3-6): pre-build calculators for 3-5 medium-sized suppliers BEFORE approaching them. Calculator demo builder skill is the production weapon.
3. **Carry** (months 6-12): supplier-referred contractors onboard at $29/mo or per-quote pricing. Job management is upsell.
4. **Open** (months 12-18): anyfence.com.au public launch. Consumer calculator + book-direct + walk-through video + accept/deny.
5. **Scale** (months 18-36): large manufacturers, custom integrations, agentic job management, expansion verticals.

## Market sizing (grounded research, 2026-05)

- AU residential fencing: ~$850M-$1.1B annually
- Contractor count: ~2,500 online-verifiable; ~5,600 by peak-body count
- Average job size: $3,390 standard install (ServiceSeeking 2024)
- Geographic concentration: NSW 24%, VIC 24%, QLD 17%, WA 11% (WA over-indexed = Colorbond)
- Fragmentation: 89.7% single-owner ops. The wedge.

## Competitive landscape

No platform combines embedded calculator + multi-supplier + consumer-facing UX at scale. Closest direct competitor: fencingquotesonline.com.au (single-channel lead-gen aggregator, 7yrs, 120+ contractors). hipages dominates lead-gen but has no calc/quote/actuals. ServiceM8/Tradify/AroFlo have job mgmt but no parametric calc.

## Risk register

- hipages owns SEO for fencing-cost queries — mitigated by supplier-led distribution
- BlueScope/Stratco direct retail strength — may resist marketplace; mitigated by positioning embed as their channel
- Low repeat purchase frequency (15-25 years) — CAC payback hard; subscription model not per-fence-fee
- Contractor SaaS WTP low — deliberately cheap entry
- Pool fencing compliance liability — needs T&Cs + verification layer

## Revenue streams

Contractor subscription ($29/mo+) → Supplier embed licence (~$1,200/yr) → JMS upsell ($79-149/mo) → Marketplace transaction fee (1-3%, phase 04+) → Custom integration work.

## The ask

1. Warm intros to 5 medium-sized fencing retailers ($5M-$30M revenue, regional, multi-state)
2. 3 pilot contractors for beta
3. $80-$120k AUD bridge capital for months 4-9 (embed widget + anyfence.com.au build)
4. Brand + copy partner for anyfence.com.au identity (Aussie infrastructure aesthetic)

## Published webpage

Shareable strategic playbook lives at the artefact published in this thread (artifact id `cmppj31sh06gj07adcqic186b`). Use that URL when sending to suppliers, prospective contractors, advisors, or potential capital.

## Critical Facts

**The Glass Outlet QuickScreen BOM Generator** is the pilot calculator and reference template for the Anyfence platform.

**Three-channel distribution model:**
1. **Free generic calculators** — embed widgets for trade websites (lead-gen funnel into marketplace)
2. **Trades SaaS / Job Management** — contractors upload price lists, customize calculators, send branded quotes
3. **Consumer marketplace at anyfence.com.au** — draw → quote → pick contractor → book in one flow

**Calculator engine capabilities (already built for aluminium slats):**
- 4 fence systems: QSHS (Horizontal Slats), VS (Vertical Slats), XPL (Xpress Plus), BAYG (Build As You Go)
- Natural-language describe-your-fence parsing
- Google Maps satellite underlay with fence/gate drawing tools
- Component-level BOM tied to real product SKUs
- Stock-length cut optimization
- Quantity-break pricing suggestions
- GST ex/inc totals, print, CSV export

**Roadmap targets:** treated pine, Colorbond, pool fencing (glass + aluminium), then full Bunnings range.

## Research & Findings

_Accumulated research and discoveries._

**Bunnings data ingestion (May 2026):**
- Direct HTTP scraping blocked by Cloudflare. Exa search infrastructure handles the JS challenge and returns clean structured text.
- Bunnings Item Numbers (I/N) are 6-8 digit codes, format-stable.
- Pricing for Colorbond components (May 2026): posts $15-$22.76, panels $135, rails $15-$16.08, infill sheets $25, post caps $2.65, ProtectorAl gate kits $116-$157.
- 10+ Colorbond colours observed: Monument, Woodland Grey, Domain, Wilderness, Ironstone, Basalt, Evening Haze, Pale Eucalypt, Night Sky, Riversand.
- Standard panel format: 1800mm H x 2360mm W, includes 3 infill sheets + 2 posts + 2 rails.
- Standard post lengths: 2400mm and 2700mm.

**Built `bunnings-fence-scraper` skill** — three-layer pipeline (ExaSearch discovery → Python parser → schema mapper) producing fence_system_config.json. Tested end-to-end on 20 Colorbond products generating valid config with components, colours, hex codes, qty breaks, and labour rule defaults.

**Skill now handles six fence-system families** — Colorbond, Pool (glass+aluminium), Treated Pine, Chain Wire, Picket, Hardwood — with 25 component categories. The next fence types to add (Slatted Aluminium, Tubular Steel, Concrete Sleeper retaining-style) should mostly fit the existing categories.

## Amazing Fencing — supplier intel + onboarding (2026-05-28)

**Profile:** Multi-state contractor + supplier hybrid. Operates across NSW, VIC, QLD, Gold Coast (Sydney/Melbourne/Brisbane/Gold Coast metros). ~30 years in business. Phone 1800 739 359.
- Install business: amazingfencing.com.au
- Supply business (sister site): fencing-supplies.com.au

**Product range (6 system_instances onboarded as `amazing-*`):**
1. **ColorBond Steel** (panel-fence) — multi-brand: Gramline, Lysaght, Oxworks, ColorMAX. Pricing pending separate PDF.
2. **PermaSteel** (panel-fence) — proprietary modular brand. GP bundles in 1.5/1.8/2.1/2.4m heights. Pricing pending.
3. **Treated Pine + Hardwood Paling** (timber-fence) — **PRICED tier2 from Cin7 export 2026-05-26.** 40+ SKUs: 100x16 palings, paddle pop palings, Colonial pickets (priced pending), CCA pine posts (100x75 + 100x100), H4 hardwood posts (100x75 + 100x100), pine + hardwood rails (75x38 + 100x38 + arrissed), coil nails (galv + hardened + stainless), batten screws (14g × 75/100/125mm), concrete (Rapid Set 30kg, Post Mix 30kg, GP Cement 20kg).
4. **Timber Slat Screen** (slat-fence) — galv steel posts + treated pine or Merbau hardwood. Pricing pending.
5. **Chain Wire & Security** (mesh-fence) — galvanised + PVC-coated. Skeletal seed; pricing pending.
6. **Retaining Walls** (timber-fence, use_case=retaining_wall) — **PARTIALLY PRICED tier2** for hardwood sleepers (200×50, 200×75 in 1800-3000mm lengths). Pine sleeper prices in the same Excel TBC against the actual ProductId rows.

**Trade price book:** Published tier2 price book in brief 046 sources directly from Liam's Cin7 mass-download export (`MassDownloadProducts_20260526_0305PM.xlsx`). Convention established: Cin7 BuyPriceEx = tier2 (trade). When retail pricing arrives separately, it goes in as tier1.

**Brief queue:** briefs 045 (supplier+6 instances) + 046 (seed data + PUBLISHED tier2 price book with ~40 priced items) in the rollout pack.

## Discount Fencing — updates from fresh site crawl (2026-05-28)

**Confirmed dead pages:** `/hampton-pvc`, `/aluminium-custom`, `/rural-and-chainwire` are all 404 on the live site. Removed from the onboarding TODO list.

**Added missing product:** $399 aluminium slat gate (930×1800, 8 colours) seeded as standalone `dfsau-aluminium-slat-gate` instance under `swing-gate` archetype with concrete pricing.

**Archetype correction:** `dfsau-aluminium-security` corrected from `mesh-fence` → `panel-fence`.

**Pending PDFs:** Colorbond trade pricing, Security trade pricing, Glass full SKU+pricing.

## Anyfence Supplier Pack Builder skill (2026-05-28)

Bundled in the rollout pack at `skills/anyfence-supplier-pack-builder/`. Documentation + Python validators that codify the supplier onboarding pattern proven on Discount Fencing and Amazing Fencing. Files: SKILL.md, validate_seed.py, render_briefs.py.

## Earlier accumulated research (pool fence, pine, chainwire, picket, hardwood)

**Pool fence catalogue (May 2026)** — ProtectorAl is the dominant Bunnings brand:
- Glass panels: 12mm Grade A toughened, 1200mm fixed height, widths 250mm–2000mm. Prices $56.70 (250mm) to $332.84 (2000mm).
- Aluminium panels: 2400mm standard width, 1200/1500/1800mm heights, $109–$391 by colour/style.
- Compliance: AS1926.1-2012.

**Treated pine paling catalogue (May 2026)**:
- Palings: 100/125/150mm widths × 1.5/1.65/1.8/2.1m lengths. $1.32–$3.14 per piece, $0.88–$1.50 per linear metre.
- Posts: 88/90/100/112/125mm square cross-section, 1.8m–6.0m lengths.
- Rails: 72x47mm or 90x45mm, typically 5.4m stock. $22 per length.
- Compliance: H3 above-ground / H4 in-ground.

**Chain wire / chainlink catalogue (May 2026)** — PEAK Chain Link Fencing dominates Bunnings:
- Mesh: PEAK 15m roll, 50×50mm aperture, 2.37mm wire, vinyl-coated. $92 (900mm) / $115 (1200mm).
- Hardware: top rail, tension band, rail end, post cap, fence ties, bracing wire.

**Picket fence catalogue (May 2026)**:
- Hardwood (SpecRite Merbau): 70×19mm × 0.9/1.2/1.5/1.8m, $5.20–$8.12 each.
- Cypress Pine (Mr Pickets): 66×19mm × 0.9/1.2/1.5/1.8m, $3.50–$5.50 each.
- PVC picket panels: Think Fencing Wren $189; RapidFence Hampton $249.

**Hardwood fence catalogue (May 2026)**:
- Merbau fence panels (SpecRite, pre-oiled, FSC-certified): $129–$229.
- Spotted Gum decking: $13.20/m (86×19mm).
- Hardwood posts: Spotted Gum GL18 laminated 90×90×2.7m $168, 115×115×2.4m $220.

## Decisions

_Important decisions made during this project._

## Drawing Tool Build — Two OSS Implementation Plans (May 2026)

**Plan A — Web-first via Capacitor + arcada-planner v2 (~12 weeks)**
Fork fedepaj/arcada-planner. Stack: React + TS + Vite + Konva + Three.js + Zustand + Capacitor + jsPDF + dxf-writer + SunCalc + Mapbox.
Phases: (1) Domain transform — Wall→FenceSegment, fence-type registry, plant catalog. (2) Landscape specifics — satellite background, auto-snap to boundaries, panel/post auto-calc, growth circles. (3) 3D toggle, solar shadows, PDF/DXF/PNG export. (4) Capacitor mobile wrap, touch palette, offline sync, store submission.

**Plan B — Native Flutter via flame + flutter_drawing_board (~14 weeks)**
Build from a clean foundation. Stack: Flutter 3.27 + Dart + flame + flutter_drawing_board + flame_forge2d + Riverpod + flutter_3d_controller + Drift + pdf package + Dart DXF writer.
Phases: (1) Flame world/camera/components, wall-graph data model in Dart, tool state machine. (2) Fence drawing with snap/angle locks, auto-posts, plant catalog, measurement, layers via flame_tiled. (3) 3D toggle, solar simulation, native PDF, DXF writer, Apple Pencil. (4) Offline-first Drift, sync, calculator integration, store launch.

**Recommendation:** Plan A for Anyfence. Drawing tool is the on-ramp to fence-type calculators — speed-to-market and a free web version win over native polish in v1. Graduate to Plan B for v2 if native mobile polish becomes the moat.

## Tasks

### Todo

_Add tasks here._

### In Progress

### Done

## Notes

_Miscellaneous notes and observations._

## Drawing Tool Repo Shortlist (May 2026)

For the Anyfence product's site-plan / fence drawing tool. Research goal was to find inspiration / reference code; no licensing commitment made yet.

**Tier 1 — Closest fit**
- fedepaj/arcada-planner (React + Konva, MIT) — 2D floor planner with wall nodes, furniture catalog, measurement, PDF. Closest reference to a fencing UX.
- maciej-webpassion/planorama (TS + Konva, MIT) — explicitly built for gardens/parking lots, background image + SVG items.
- theLodgeBots/open3dFloorplan (SvelteKit + Three.js, MIT) — 2D↔3D toggle, exports SVG/DXF/PDF/PNG, 140+ objects.

**Tier 2 — Mobile foundations**
- flame-engine/flame (Flutter, MIT, ~11k★) — world/camera/component model.
- Shopify/react-native-skia (RN, MIT, ~8.3k★) — production Skia renderer.
- fluttercandies/flutter_drawing_board (Flutter, MIT) — extensible CustomPaint board.

**Tier 3 — Architecture reference**
- aalavandhaann/blueprint-js (PixiJS+Three.js, MIT) — active ES6 fork of blueprint3d, wall-corner graph.
- excalidraw/excalidraw (MIT, 122k★) — cleanest shape-tool state machine source.
- tldraw/tldraw (47k★) — best canvas SDK BUT commercial license required for production.
- mrdoob/three.js (editor/, MIT) — canonical undo/redo Command pattern.

**Tier 4 — CAD-grade (reference only, GPL)**
- LibreCAD (GPLv2) and QCAD (GPLv3) — production snapping/constraints/DXF export.
- libdxfrw — usable separately for DXF output.

**Differentiator**
- pickles976/GardenPlanner — Three.js + SunCalc real solar-position shadow casting.

**Recommendation:** For fastest professional MVP go Capacitor + fork arcada-planner v2; for long-term native mobile go Flutter with flame + flutter_drawing_board.
