# Discovery Log — Glass Outlet BOM Engine
### How we built a game-changing quoting app from scratch using AI

> **Purpose**: Capture decisions, dead ends, what worked, and why — so future sessions and future apps are faster. This is both a project log and a reusable meta-playbook.

---

## The Goal

Build a data-driven BOM (Bill of Materials) quoting configurator for Glass Outlet — a fencing product supplier — that:
- Takes fence run parameters (length, height, colour, slat size, gap, mount type)
- Calculates every component needed with exact quantities and cut lengths
- Outputs a professional quote with SKUs, pricing, and PDF export
- Is maintainable by non-developers via seed data files (not hardcoded logic)

---

## Phase 1 — Knowledge Extraction

### What we started with
- Supplier PDFs (catalogues, spec sheets)
- A product price list CSV (993 lines)
- A rough idea of how the products work

### What we learned
**Don't start with code. Start with rules.**

The first and most important step was extracting the calculation rules from the supplier PDFs into a structured markdown file (`calculation_rules.md`). This became the single source of truth for every formula in the app.

Key insight: **The formulas are not obvious from the product names alone.** You have to read the catalogue carefully. E.g.:
- QSHS slat count is `floor((target_height - gap + 3) / (slat + gap))` — the +3 is a physical lip, not documented anywhere obvious
- QSHS slat optimisation does NOT add a cut allowance (2mm kerf); VS/XPL/BAYG DO
- CSR thresholds are based on panel *width*, not height
- Spacer packs = `ceil((2 × (num_slats + 1)) / 50)` — 2 spacers per slat gap, top and bottom, 50-pack

**Dead end**: Trying to rely on memory for formulas between sessions. Solution: always re-read `calculation_rules.md` before any BOM calculation — never trust recalled values.

### The `calculation_rules.md` structure that worked
```
§1 QSHS
§2 VS (Vertical Slat)
§3 XPL (Xpress Plus)
§4 BAYG (Buy As You Go)
§8/§13 Gates
§30 Master product code list
```

Each section covers: height formula, slat count, cut lengths, stock optimisation, accessories, CSR rules, post rules.

---

## Phase 2 — Seed Data Architecture

### The key architectural decision
Instead of hardcoding BOM logic in the app, we encode it as **seed data** — JSON files that the app reads at runtime. This means:
- Business rules can be updated without code changes
- New fence systems can be added by writing a new JSON file
- The same engine can power multiple product types

### Seed file structure (the schema that worked)
Each system (QSHS, VS, XPL, BAYG, QS_GATE) gets its own JSON file with these top-level keys:

| Key | Purpose |
|-----|---------|
| `products` | System metadata, compatible colours, slat sizes |
| `product_components` | Every SKU with price, category, metadata (colour code, slat size) |
| `rule_sets` | Named rule set for this system |
| `product_variables` | User-configurable inputs (colour, slat size, gap, mount type, height, etc.) |
| `product_rules` | Derived calculations in execution order (derive → stock → accessory → component stages) |
| `product_component_selectors` | Maps categories to SKU patterns (e.g. `QS-SPACER-{gap_code}-50PK`) |
| `product_companion_rules` | Auto-adds accessories when a component is selected (e.g. CFC added whenever SF is added) |
| `product_constraints` | Validation rules (min/max panel width, allowed enum values) |
| `product_warnings` | Non-blocking warnings (e.g. HD posts unavailable in Primrose) |
| `pricing_rules` | Per-SKU prices for tier1/tier2/tier3 |

### Rule stages (execution order matters)
```
1. derive   — compute intermediate values (num_slats, actual_height, cut lengths)
2. stock    — compute stock lengths needed from cut lengths
3. accessory — compute pack quantities (spacers, screws)
4. component — emit final component quantities
```

### SKU pattern resolution
SKU patterns use `{colour}`, `{gap_code}`, `{slat_size}` placeholders resolved at runtime:
- `colour` → colour_code field from selected colour (B, MN, G, SM, W, BS, D, M, S, P, PB, KWI, WRC, IG, TR)
- `gap_code` → mapped from gap_mm: `5→05MM, 9→09MM, 12→12MM, 15→15MM, 20→20MM, 30→30MM`

### What went wrong early
- **Wrong cut allowance**: Initially used 1 cut per stock length for QSHS slats. Correct: QSHS uses NO kerf allowance (floor division only); VS/XPL/BAYG use 2mm kerf per cut.
- **Hardcoded gap options**: Initially assumed fixed gaps. Corrected: QSHS/VS/BAYG accept 5/9/12/15/20/30mm; XPL only 9mm (Gs=8) or 20mm (Gs=20).
- **XP items in QSHS file**: Cross-contamination of SKUs between systems. Fixed by strict `system_types` filtering per component.

---

## Phase 3 — Mockup (Proof of Concept)

### Why a mockup first
Before touching the real app, we built a standalone HTML/JS mockup to:
- Validate all BOM formulas with real inputs
- Prove the UX flow (panel spacing → height selection → gate configurator)
- Generate test BOMs for checking

### Key UI decisions that worked
1. **Panel spacing widget first** — show calculated post spacings as soon as run length is entered, let user scroll up/down to choose more/fewer panels. Default = first spacing under 2600mm.
2. **Target Height stepper** — not a free text field. User picks from valid heights (multiples of slat+gap formula), shown as actual mm values. Updates BOM in real time.
3. **Live BOM panel (right column)** — don't wait for a "Generate" button. Show every selected product updating in real time as the user makes choices. Sections: Slats / Structure / Posts / Accessories.
4. **Gate as an add-on** — gates are NOT a fence system type. They're an optional addition to any fence run. Selecting "Add Gate" opens a separate gate configurator with its own data-driven options.
5. **Colour filtering** — only show colours valid for the selected system + slat size combination (e.g. Kwilla/WRC only for Alumawood BAYG; Primrose/Paperbark warn about HD post restriction).

### What the existing app (tiny-kangaroo) was missing (as of April 2026)
| Gap | Severity | Seed data ready? |
|-----|----------|-----------------|
| Spacer products not in BOM | High | ✅ Yes — `qshs_spacer_by_gap` selector + `spacer_packs` rule |
| CSR not auto-added | High | ✅ Yes — `num_csr` rule + companion rules |
| Mount type not a UI selector | High | ✅ Yes — `mounting_type` variable with 3 options |
| Post cut length not shown | Medium | ❌ Missing — needs `post_cut_mm` derive rule added to seeds |
| Gate configurator is placeholder | High | ✅ Yes — `qs_gate.json` fully complete |
| Colour not filtered per system | Medium | ✅ Yes — `colour_options` in product metadata |
| No live BOM panel | Medium | In mockup — needs porting |
| Length displayed as raw float | Low | App bug |

---

## Phase 4 — Transfer to Real App

### The right transfer order (proven approach)
1. **Spacers first** — simplest gap, proves the seed→BOM pipeline works end to end
2. **CSR** — same pattern, slightly more complex (companion rules for cap + plate)
3. **Mount type selector** — surfaces existing variable as UI, wires companion rules
4. **Gate configurator** — largest single feature, fully self-contained in `qs_gate.json`
5. **Colour filtering** — read `colour_options` from product metadata, filter dropdown
6. **Post cut length** — add `post_cut_mm` derive rule to seeds, surface in BOM output

### April 26, 2026 - First local QSHS calculator slice

Scope was deliberately narrowed to a functional local QuickScreen/QSHS calculator before expanding into the aerial mapping workflow, VS/XPL, BAYG, or gates.

What changed in the cloned app repo (`quickscreen-bom-generator`):
- Added a seed-backed local data layer in `src/lib/localSeedData.ts`.
- Added a local QSHS BOM calculator in `src/lib/localBomCalculator.ts`.
- Changed `src/lib/supabase.ts` so missing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` no longer crashes the app. Instead, the app detects local mode with `isSupabaseConfigured`.
- Updated product, variable, product-search, and BOM hooks to use Supabase when configured, or bundled seed JSON when not configured.
- Narrowed the local product selector to QSHS only for this first completion target.
- Added a pricing-tier selector to the v3 calculator so generated BOMs can use tier1/tier2/tier3 pricing.
- Expanded BOM category typing/display order so QuickScreen-specific categories such as side frame, CFC cover, centre support rail, F-section, and post accessories display cleanly.

How the seed-backed fallback works:
1. The app imports bundled seed JSON files from `supabase/seeds/glass-outlet/products/*.json` as raw text.
2. `localSeedData.ts` parses those files and exposes:
   - `localFenceProducts` for the calculator product dropdown.
   - `getLocalVariables(systemType, scope)` for schema-driven form fields.
   - `searchLocalProducts(query)` for SKU/name/description lookup in extra items.
   - component and pricing lookup helpers.
3. `useProducts`, `useProductVariables`, `useProductSearch`, and `useBomCalculator` check `isSupabaseConfigured`.
   - If Supabase env vars exist, the original Supabase path is used.
   - If they are missing, the bundled local seed path is used.
4. `calculateLocalBom()` currently supports QSHS as the first reliable test path. It calculates:
   - slat count and actual achieved height.
   - panel count and panel width from max panel width.
   - stock lengths for slats, side frames, CFC, CSR, and F-section.
   - spacer packs, screw packs, side-frame caps, CSR caps/plates.
   - posts and mounting accessories for in-ground, base-plate, and core-drill modes.
   - line pricing, subtotal, GST, and grand total.

Important boundary for this slice:
- The aerial mapper code was preserved but not expanded.
- Gates are still carried in the existing payload shape, but QS_GATE BOM generation was intentionally left for a later slice.
- VS/XPL/BAYG remain in the seed files, but the local first-pass UI only exposes QSHS so testers do not hit unfinished engines.

Verification:
- Ran `npm ci` in the cloned app repo only.
- Ran `npm run build` successfully.
- Started Vite locally at `http://127.0.0.1:5173/`.
- Confirmed `http://127.0.0.1:5173/calculator` returns HTTP 200.

### Working with Claude Code
Best pattern: **Computer as domain expert, Claude Code as implementer**
- Computer holds all seed data knowledge, formulas, SKU patterns, edge cases
- Claude Code writes/edits files fast with direct repo access
- When Claude Code needs a formula or SKU: ask Computer, paste the answer back
- Don't let Claude Code guess business logic — it will hallucinate values

### What to give Claude Code to avoid hallucination
Always provide:
1. The exact field names from the seed JSON (e.g. `product_component_selectors[].sku_pattern`)
2. The exact expression from `product_rules[].expression`
3. The gap_code mapping table
4. Which systems use kerf and which don't

---

## Architecture Decisions

### Pricing Layer (decided April 22, 2026)
Prices change frequently (suppliers increase prices, customers have individual tier pricing). The pricing layer must be:
- **Completely decoupled from product components and rules** — a separate `pricing_rules` table keyed by `(sku, tier_code)`
- **Easily bulk-updated** without touching calculation logic
- **Tier-aware** — at minimum tier1 (retail/standard) and tier2 (trade discount ~14% off). Tier3 multiplier TBC.
- **Source of truth**: always pull from the live ordering platform (glassoutletonline.com.au) for current prices
- Future: admin UI to update prices directly in the app without touching JSON files

Tier multipliers (confirmed April 2026):
- tier1: 1.0 (base)
- tier2: 0.86 (14% discount)
- tier3: 0.74 (assumed — needs confirmation from Glass Outlet)

### BAYG / Alumawood Architecture (decided April 22, 2026)
BAYG (Buy As You Go) is NOT a separate product system — it is a purchasing/component-sourcing mode.
- The Alumawood (timber-look) products use `AW-` prefix SKUs instead of `XP-`/`QS-`
- The calculation rules are identical to QSHS (same formulas, same height tables)
- The difference is only in which SKUs are resolved at the component selector stage
- **Implementation**: QSHS system gets a `finish` variable: `standard` (XP-/QS- SKUs) vs `alumawood` (AW- SKUs)
- Alumawood colours: KWI (Kwilla), WRC (Western Red Cedar), IG (Island Grey), TR (Terrain)
- Alumawood is 65mm slat only (no 90mm)
- Island Grey post accessories use MN (Monument) colour code

### Product Lifecycle (decided April 22, 2026)
Products are added and discontinued regularly. The system must support:
- `active: true/false` flag on every component and pricing rule
- Discontinued products set `active: false` — never deleted, preserves historical quote integrity
- New products: add to `product_components` + `pricing_rules` only — no code changes needed
- Price updates: update `pricing_rules` only — no component or rule changes needed

---

## Meta-Playbook — How to Build an App Like This

### Step 1: Extract rules before writing code
- Read every supplier document
- Write `calculation_rules.md` — one section per product system
- Test formulas manually with known examples before encoding them

### Step 2: Design the seed schema first
- Decide on table names and field names before writing any seed data
- The schema IS the contract between the data layer and the app
- Use stages (derive → stock → accessory → component) to enforce evaluation order

### Step 3: Write seed files per system
- Start with one system (simplest one)
- Validate BOM output with a Python script before moving to the next
- Keep seed files in version control — they ARE the business logic

### Step 4: Build a throwaway mockup
- Pure HTML/JS, no framework — fast to iterate
- Validate every formula and UX flow
- Generate test BOMs and check them manually
- Don't deploy this as the real app — it's a proof of concept

### Step 5: Transfer to real app in small, testable increments
- One feature at a time
- Always test BOM output after each change
- Use the seed files as the source of truth — not the mockup code

### Step 6: Discovery log
- Update this file after every significant decision or discovery
- Record what went wrong and why, not just what worked
- This file makes the next project 10x faster

---

## Key Numbers & Constants (Glass Outlet specific)

| Constant | Value |
|----------|-------|
| Slat stock length | 6100mm |
| Side frame stock length | 5800mm |
| Alumawood stock length | 5800mm |
| QSHS kerf allowance | 0mm (no kerf) |
| VS / XPL / BAYG kerf | 2mm per cut |
| Max panel width (QSHS) | 3000mm (warn at 2600mm) |
| CSR threshold | 0 if <2000mm, 1 if 2000–3999mm, 2 if 4000–5999mm, 3 if ≥6000mm |
| Spacer pack size | 50 per pack |
| Screw pack size | 50 per pack |
| T2 pricing discount | T1 × 0.86 (14% off) |
| In-ground post cut | height + 600mm |
| Base plate post cut | height + 50mm |
| Core drill post cut | height + 200mm |

## Colour Code Map

| Code | Name |
|------|------|
| B | Black Satin |
| MN | Monument Matt |
| G | Woodland Grey Matt |
| SM | Surfmist Matt |
| W | Pearl White Gloss |
| BS | Basalt Satin |
| D | Dune Satin |
| M | Mill (raw aluminium) |
| S | Palladium Silver Pearl |
| P | Primrose ⚠ No 65mm HD posts |
| PB | Paperbark ⚠ No 65mm HD posts |
| KWI | Kwilla (Alumawood BAYG only) |
| WRC | Western Red Cedar (Alumawood BAYG only) |
| IG | Island Grey (Alumawood BAYG only) — post accessories use MN |
| TR | Terrain (Alumawood BAYG only) |

## Gap Code Map (for SKU resolution)

| Gap mm | gap_code | Spacer SKU |
|--------|----------|-----------|
| 5 | 05MM | QS-SPACER-05MM-50PK |
| 9 | 09MM | QS-SPACER-09MM-50PK |
| 12 | 12MM | QS-SPACER-12MM-50PK |
| 15 | 15MM | QS-SPACER-15MM-50PK |
| 20 | 20MM | QS-SPACER-20MM-50PK |
| 30 | 30MM | QS-SPACER-30MM-50PK |

---

## Session Log

### Sessions 1–5 (pre-April 2026)
- Created `bom-seed-json` skill
- Wrote all 5 seed files (qshs, vs, xpl, bayg, qs_gate)
- Built initial BOM mockup with gate configurator, panel spacing widget, height stepper

### Session 6 (April 20, 2026)
- Read all remaining sections of calculation_rules.md (§3.5 XPL through §30)
- UI tidy: "Target Height" label, removed CSR warning callout, removed 6 derived chips, added live BOM panel
- Wrote bom_calc.py → 15 BOM scenarios across all systems
- Generated glass-outlet-bom-report.pdf
- Deployed updated mockup

### Session 7 (April 21, 2026)
- Compared mockup to tiny-kangaroo live app
- Identified 8 gaps (spacers, CSR, mount type, post cut, gate configurator, colour filtering, live BOM, float display bug)
- Confirmed all gaps except post_cut_mm are already covered by seed data
- Identified transfer order: spacers → CSR → mount type → gate → colour filter → post cut

### Session 8 (April 22, 2026)
- Decided on working model: Computer as domain expert + Claude Code as implementer
- Created this discovery file
- Clarified full product vision (see below)
- Received 19 Glass Outlet catalogues — full product taxonomy in progress
- Next: product breakdown → map one new system → begin transfer with Claude Code

---

## Full Product Vision (confirmed April 22, 2026)

### App Structure
```
Quote
 └── Section (one fence system type per section)
      ├── Run A: length, height, colour, mount, post type
      ├── Run B: length, height (corner from A)
      └── Gate (optional add-on to any run)
```
- Each Section generates its own BOM
- Sections can be duplicated and switched to a different system type — measurements carry over, only system-specific choices (colour availability etc.) need re-selecting
- This allows instant cost comparison: same layout, QSHS vs XPL vs BAYG

### Drawing Tool Decision
- Building a freehand aerial drawing tool from scratch is too complex for now
- **Decision: start with a run builder** — user adds runs one by one with length + orientation, app draws a live preview
- This covers ~80% of real jobs (rectangular layouts)
- Freehand drawing tool can be added later once core BOM engine is proven
- Potential future integration: Excalidraw (embeddable, open source) or Konva.js (custom canvas)

### Rollout Plan
1. **Phase 1**: Internal staff use — proves the engine, catches edge cases
2. **Phase 2**: Trade portal on Glass Outlet website — thousands of trade professionals

### Product Roadmap
1. Glass Outlet aluminium slat fencing (QSHS, VS, XPL, BAYG) ← in progress
2. Glass Outlet pool fencing
3. Glass Outlet balustrade systems (aluminium + glass)
4. Colorbond fencing
5. Other Glass Outlet products (breezewire, hamptons, shutters, etc.)
6. Other supplier products

### April 26, 2026 - Sandbox UI product expansion

Added Vertical Slat (VS) and XPress Plus (XPL) to the local sandbox product selector so the UI can be tested beyond QSHS. This is UI exposure only for this pass: the local fallback BOM engine remains validated for QSHS first, and VS/XPL calculation parity should be implemented and tested in a later engine slice before relying on priced BOM output for those systems.

### April 26, 2026 - Seed-driven option UI pass

Updated the sandbox calculator UI so selectable job/run options come from the selected system seed data instead of hardcoded global lists.

Changes:
- Colour, slat size, and slat gap controls now render from each system's `product_variables.options_json`.
- Friendly labels are applied to seed codes, e.g. `B` becomes `Black Satin (B)`, `MN` becomes `Monument Matt (MN)`, and gap values display as near-privacy/standard/open where applicable.
- QSHS-only technical stock-length defaults are hidden from the main UI because they are engine constants, not user selections.
- Each run now has a `Run settings` block driven by run-scoped seed variables, exposing items like mounting type, post size, and XPL post system settings for the selected system.
- Product selector remains local-seed backed and currently exposes QSHS, VS, and XPL for sandbox UI testing.

Boundary:
- This was a UI correctness pass. QSHS remains the trusted local BOM engine path; VS/XPL are exposed so their UI and allowed options can be tested before their calculation logic is certified.

### April 26, 2026 - Mockup layout port into local app

Used the provided `bom-mockup.html` as the visual/source reference for the next calculator UI pass and brought the local React calculator closer to that sandbox layout.

Changes:
- Reworked the calculator page into a two-column quoting workspace: a left configuration rail and a right preview/BOM rail.
- Kept the system selector, seed-backed options, run cards, pricing controls, and Generate BOM flow in the left rail so the app can be tested in one focused screen.
- Added right-side panels for panel preview, layout/map placeholder, and Bill of Materials output while preserving the existing mapper code behind the layout accordion.
- Kept QSHS as the trusted priced local BOM path. VS and XPL remain selectable for UI validation, but their engine logic still needs a dedicated calculation pass before priced output should be relied on.
- Verified the app builds with `npm run build`, confirming the seed fallback and mockup-style UI compile together.

Next useful slice:
- Port the remaining mockup interactions that materially affect the BOM: height stepper, panel spacing widget, add-ons, and gate configuration.
- Then certify VS/XPL calculator logic against the seed files and known scenarios.

### April 26, 2026 - Fence mapper foundation pass

Reviewed the existing mapper code and confirmed the app already has a strong base for the professional drawing workflow:
- Draw fence runs as polylines.
- Add gate markers onto fence segments.
- Drag gates along a segment and edit existing gate markers.
- Draw non-product boundary/context lines.
- Load a Google Static Maps satellite/roadmap/terrain/hybrid underlay via `VITE_GOOGLE_MAPS_KEY`.
- Calibrate scale and preview calculated post positions.
- Convert the drawn layout into the canonical calculator payload.

Research note:
- Google Maps JavaScript Drawing Library is deprecated, so the preferred architecture is not to rely on Google for the drawing layer. The better path is the one already started here: Google Maps/static imagery as the underlay, with our own canvas drawing engine for fence, gate, post, and BOM-specific rules.

Changes made:
- Opened the layout mapper by default in the calculator so it becomes part of the normal test workflow.
- Changed typed segment-length edits in the canvas so they resize the drawn segment geometry, not just the stored length number.
- When a segment length changes, downstream connected points move with the edited endpoint so the run shape stays connected.
- Preserved existing gate markers when segment geometry is rebuilt after edits.
- Updated form-to-canvas syncing so typed segment-length changes in the run list reload the canvas geometry while normal option changes still preserve the drawing.
- Adjusted canonical layout reconstruction so saved geometry keeps the drawn direction/angles but honours the typed segment lengths.

Mapper design direction:
- Treat the drawing as the source for geometry: runs, segments, gates, and boundaries.
- Treat the side/run inspector as the source for exact dimensions and segment-specific construction details.
- Gates should be anchored to a segment by position and opening width, then translated into `gate_opening` segments for BOM generation.
- Segment terminations should stay explicit: system post, wall/existing fence/non-system post, gate edge, or corner post. These are what the BOM engine needs to decide posts, frames, and accessories.
- Keep Google Maps as an underlay only, because the calculator needs BOM-specific drawing behaviour that generic map drawing tools do not provide.

Next useful slice:
- Add a dedicated mapper inspector panel for the selected segment/gate so length, opening width, post size, mount type, and termination can be edited without hunting through the run list.
- Make gate placement smarter by showing the before-gate and after-gate measurements live while dragging.
- Add explicit wall/existing fence/corner/gate visual markers at segment ends and feed those into the segment termination variables automatically.

### April 26, 2026 - Mapper usability correction pass

Adjusted the sandbox fence mapper toward the professional drawing-app behaviour needed for quoting:
- Draw mode now snaps new fence segment bearings to the nearest 5 degrees when snapping is enabled, so the user can draw at any practical angle instead of being limited to coarse catalogue metadata angles.
- Shift still locks a continuation straight from the previous segment.
- The active drawing endpoint is now highlighted with a larger labelled marker so the last dropped point is easier to find before finishing the run.
- Length labels can be clicked directly from draw/move flow to edit segment length.
- Typed length edits keep connected geometry together by moving the edited endpoint and downstream points, preserving the run connection.
- The `Use This Layout` button now dispatches the canvas layout into the calculator's canonical payload, not only the older fence-config context, so run lengths/corners populate the calculator run cards more reliably.
- Canvas-to-calculator conversion now reuses stable run IDs during layout sync, avoiding unnecessary remounts and helping typed edits update the existing run instead of creating unrelated run state.
- Finishing a run is now more forgiving: clicking/double-clicking inside the highlighted last-point marker finishes the active run without needing to hit the exact pixel.
- Double-clicking a measurement label opens length editing. The old scale-calibration behaviour is moved behind Alt+double-click so a normal measurement edit cannot accidentally rescale/move the drawing.
- The canvas stats overlay now includes per-segment post spacing details, and each segment row exposes an editable `Post spacing`/max panel width field so spacing can be changed without digging into the advanced details panel.

Process note:
- The mapper should continue to use the canvas geometry as the source of truth for layout, while the canonical calculator payload remains the source of truth for BOM generation.

### April 26, 2026 - Product option rule layer

Reviewed the Perplexity `bom-mockup.html`, the bundled seed files, and the local CSV price lists for the first practical UI correction pass. The key lesson is that the seed files are useful, but they are not yet a complete source of truth for allowed option combinations. The calculator now has a small product option rule layer that sits over the bundled seed fallback and keeps the UI choices valid for the selected system.

Rules added to the local sandbox:
- QSHS exposes 65mm and 90mm slats, with fixed gap choices of 5, 9, 12, 15, 20, and 30mm.
- XPress Plus exposes 65mm slats only, with fixed gap choices of 9mm and 20mm.
- Vertical Slat uses a typed/free slat gap instead of the QSHS/XPL fixed gap chips.
- Standard slats use the standard powdercoat colour list.
- Alumawood timber-look slats use KWI, WRC, IG, and TR for 65mm, but 90mm is restricted to WRC.
- Economy slats are exposed as a separate slat range for QSHS/VS and force the slat size to 65mm.

Pricing bridge:
- Added local fallback component prices for the three currently exposed economy slat colours: `XP-6500-E65-B`, `XP-6500-E65-MN`, and `XP-6500-E65-SM`.
- These prices came from the Glass Outlet aluminium slats CSV: B and MN at 32.85, SM at 31.05.
- Verified a generated QSHS economy BOM uses the priced `XP-6500-E65-B` slat line instead of falling back to a zero-price unknown SKU.
- Fixed the calculator page total rounding so the headline total and detailed subtotal/GST/grand total all display the same cents.

Open catalogue confirmation:
- The CSV files contain more economy SKUs than the current UI exposes: B, BS, D, G, M, MN, P, SM, and W.
- The user requirement says economy slats only come in three colours, so the sandbox currently restricts economy to B, MN, and SM until the QuickScreen catalogue rule is confirmed.

Process note for the next calculator:
- Treat seed JSON as the starting data layer.
- Compare seed options against the mockup and catalogue before exposing fields in the UI.
- Add a rule layer for dependent options such as system type -> slat size -> finish range -> colour -> gap mode.
- Document every assumption where CSV, catalogue, and user requirement do not agree.

### April 26, 2026 - Catalogue completion workflow and agent roles

The next stage is catalogue completeness: every calculator should be built from a repeatable catalogue-to-seed-to-engine workflow, not from one-off UI guesses.

Working agents created for this pass:
- Catalogue Extractor: reads the supplier catalogue page by page and produces a structured option/accessory matrix with product families, variants, finishes, dependencies, and open questions.
- Data Auditor: compares catalogue items against CSV price lists, seed JSON, product search, and BOM engine logic to identify what is already priced, what is present but not seeded, and what is missing.

Reusable agent roles for future calculators:
- Catalogue Extractor: converts catalogue pages into structured requirements. Output should include page reference, product family, SKU/order code, finishes, dimensions, required companion parts, optional accessories, and quoting rules.
- Price/Seed Auditor: maps each catalogue item to CSV rows and seed JSON. Output should flag exact SKU match, price tiers, missing descriptions, duplicate/conflicting rows, and candidate seed updates.
- Calculator Rule Designer: turns catalogue requirements into deterministic rules: auto-add, suggest, optional add-on, incompatible option, quantity formula, and warning.
- UI/UX Builder: exposes those rules in the calculator without overwhelming the user. It owns option grouping, suggested accessory panels, search/add flow, and clear labels.
- BOM Engine Implementer: implements and tests quantity formulas, GST totals, rounding, and generated Bill of Materials lines.
- QA Scenario Tester: creates catalogue-backed test scenarios and verifies BOM output against hand calculations.
- Discovery Scribe: records assumptions, conflicts, test cases, and why each rule was implemented so the next catalogue is faster.

Suggested rule categories:
- `auto_add`: required for a valid system and should appear on the BOM automatically.
- `suggested`: commonly needed based on configuration, pre-calculated where possible, but not automatically added to the BOM until selected.
- `optional`: available to purchase/search/add, but not suggested unless the user selects that system/detail.
- `warning`: not a BOM item; explains a catalogue constraint or missing information.

Confirmed user requirements to map from the QuickScreen/XPress Plus/Alumawood V4 catalogue:
- In-ground posts: suggest 1.5 bags rapid set per concreted post, pre-calculated but not automatically added.
- Core-drilled posts: suggest grout options and ring covers sized to the post.
- Base-plate posts: suggest base plates, screws to attach base plates to posts, mounting screw options, and base plate cover rings.
- Confirm whether posts include caps; suggest caps where they are not included.
- All catalogue accessories should be searchable/available as optional order items, even when not suggested.
- 135 degree angle adaptor should be automatically added where a corner is closer to 135 degrees than 90 or 180 degrees.
- Suggest colour-matched touch-up paint; if post and fence colours differ, suggest both colours.
- Allow post colour override separate from fence colour.
- Include louvre brackets, matching side frames, side frame mounting arms, centre support rails, centre support rail top/bottom plates, and related accessories.
- Add future calculators for radiator/blade fencing, paling fencing, federation/picket variants, screen topper/slat extensions, and Alumawall stackable sleepers.

Extraction note:
- The V4 catalogue was readable locally with `pdfjs-dist`; first verified pages: 1-6, 38-44. The PDF reports 172 pages.
- Page 40 contains radiator/blade fencing with visible order codes including `XP-6100-S65`, `QS-6100-S90`, `XBAT-6100-045X045`, `XP-4000-COVER`, `XBAT-BH20`, `XP-SCREWSGF-10PK`, `XP-EC65-4PK`, `XP-EC90-4PK`, `XP-FEDTOP-4PK`, and `XP-SCREWS`.
- Page 43 contains Alumawall sleeper and retaining post items including `AWALL-2385-*`, `AWALL-1700-1W-*`, and `AWALL-TP-*`.

### April 26, 2026 - Suggested accessories first slice

Added the first catalogue-accessory workflow without changing the core BOM contract.

Structure decision:
- Keep required materials in the BOM engine.
- Put recommended but optional add-ons in a separate `suggestedAccessories` rule layer.
- A suggestion is not included in totals until the user clicks Add, at which point it flows through the existing Extra Items panel and recalculates subtotal, GST, and grand total.

What changed:
- Added `src/lib/suggestedAccessories.ts` to calculate suggested accessories from the canonical payload and generated BOM lines.
- Added `src/components/calculator-v3/SuggestedAccessoriesPanel.tsx` under the generated BOM.
- Added synthetic local seed entries for `PAINT-B` and `PAINT-MN` so touch-up paint can be searched, suggested, priced, and added locally.
- Added a `post_colour_code` option so post colour can differ from fence/slat colour.
- Updated the local QSHS fallback BOM engine so posts, top plates, base plates, domical covers, and dress rings use `post_colour_code` while slats, frames, and panels keep using the fence colour.

Current suggestion rules:
- In-ground posts suggest rapid set concrete at `ceil(post_count * 1.5)` bags. This is intentionally unpriced until the exact stocked concrete SKU is confirmed.
- Core-drilled posts suggest grout as an unpriced selectable item and suggest dress rings only if the required ring is not already in the generated BOM.
- Base-plate posts suggest base plate fixings/anchors as an unpriced selectable item and avoid duplicating base plate sets or domical covers already auto-added by the BOM engine.
- Touch-up paint is suggested for the fence colour and, if different, the post colour. Seeded paint prices currently exist for Black Satin and Monument Matt only.

Catalogue gap recorded:
- QSHS metadata allows 135 degree corners, but the current seed JSON and CSV search did not expose a definite 135 degree adaptor SKU. Do not invent a priced auto-add line. Next catalogue pass should identify the exact order code, colours, price, and whether the adaptor is required automatically when a mapped corner is closer to 135 degrees than 90 or 180 degrees.

Verification:
- `npm run build` passed.
- Browser smoke test generated a QSHS BOM, displayed suggested accessories, showed rapid-set quantity from the post count, and successfully added `PAINT-B` into Extra Items so it contributed to the quote total.

### April 26, 2026 - Global calculator agent skills

Created global Codex skills in `C:\Users\bbfen\.codex\skills` so future sessions can reuse the same specialist workflows:
- `glass-calc-project-manager`: coordinates catalogue-to-seed-to-engine-to-UI-to-QA scope, sequencing, open questions, and discovery updates.
- `glass-calc-ui-designer`: owns trade-friendly calculator UI, option flows, suggested accessories, quote review, and mapper usability.
- `glass-calc-qa-tester`: audits BOM calculations against formulated workbooks, CSV prices, seed JSON, catalogue rules, and app output.
- `glass-calc-catalogue-extractor`: extracts supplier catalogue pages into structured SKU, option, accessory, formula, and rule matrices.

All four skills validated with `quick_validate.py`.

### April 27, 2026 - Run-level UI and editable BOM pass

Moved the calculator closer to the quoting workflow the user described:
- System type and product options now live inside each run card instead of as job-wide controls.
- Run 1 starts editable; later runs default to Run 1's product/settings and can be changed with `Edit run`.
- Each run can have its own system, slat range, colour, slat size, gap, fixing/post settings, and max panel width.
- Post colour defaults to the fence colour; post colour selection is hidden behind an edit control.
- Segment rows retain remove buttons and editable post spacing.

Quote/BOM actions added:
- `Clear Quote` resets the whole calculator state.
- `Clear BOM` clears the generated BOM without removing the quote layout.
- `Save Quote` saves locally in local-seed mode, and in Supabase mode inserts into `quotes` plus v3 `quote_runs` and `quote_run_segments`.
- `Export CSV` downloads the current edited BOM lines and totals.
- Generated BOM rows now support quantity editing and line removal, with subtotal/GST/grand total recalculated from the edited rows.

Description improvement:
- Local BOM descriptions now append colour names when the SKU has a known colour suffix, e.g. `- Black Satin`.

Verification:
- `npm run build` passed.
- Browser smoke test confirmed run-level controls, post colour default, Clear/Save/Export buttons, editable BOM quantities, remove buttons, and colour descriptions render in the calculator.

### April 27, 2026 - Layout collapse and timber-look pricing fix

Workflow/UI changes:
- The `Layout` mapper accordion now defaults closed so the calculator starts focused on run setup and BOM review.
- `Generate BOM` was moved into the Bill of Materials action row beside `Clear BOM`, keeping generate/clear/save/export in one place.

Timber-look pricing issue:
- Cause: the UI allowed `Alumawood timber-look`, but the local fallback engine still emitted standard `XP-*` and `QS-*` slat/frame SKUs. Timber-look prices in the bundled CSVs use `AW-*` and `AWQS-*` SKUs, so those BOM lines had no matching local price.
- Fix: `src/lib/localBomCalculator.ts` now emits Alumawood-specific SKUs for 65mm slats, 90mm slats, QuickScreen side frames, CFC covers, F-sections, centre support rails, and Alumawood posts.
- Local fallback data in `src/lib/localSeedData.ts` now includes the verified Alumawood core components and tier prices for Kwila and Western Red Cedar from the bundled CSVs.
- `src/lib/productOptionRules.ts` now limits core Alumawood colour choices to the finishes currently priced for the local QSHS engine: `KWI` and `WRC`. Terrain and Island Grey appeared only in accessory rows during this pass, so they are not exposed as core fence colours yet.
- Post colour options now include Alumawood finishes when the run is timber-look, while still allowing standard post colours when the user edits post colour.

Other missing-price audit:
- Online Glass Outlet pricing login confirmed:
  - `QS-SPACER-05MM-50PK`: $1.42 ex GST.
  - `QS-SPACER-09MM-50PK`: $2.63 ex GST.
  - `QS-SPACER-12MM-50PK`: $3.47 ex GST.
  - `QS-SPACER-15MM-50PK`: $4.10 ex GST.
  - `QS-SPACER-20MM-50PK`: $5.20 ex GST.
  - `QS-SPACER-30MM-50PK`: $7.30 ex GST.
  - `QS-SCREWS-50PK`: $1.42 ex GST.
  - `XP-SCREWS-B/MN/G/W` online results showed $6.36, 20+: $5.99, 40+: $5.16 ex GST; the CSV shows the same pricing pattern for the other seeded screw colours.
- Added local fallback entries for QuickScreen spacer packs, QuickScreen 50-pack screws, and XPRESS 100-pack screw colours.
- Replaced the internal placeholder `XP-SCREWS-Singles-Acc` output with real `XP-SCREWS-{colour}` 100-pack BOM lines for F-section fixing screws.
- CSR cap and CSR top/base plate accessory SKUs now map unavailable accessory colours to verified stocked Monument accessory SKUs instead of emitting unpriced colour SKUs.

Verification:
- `npm run build` passed.
- Browser smoke test confirmed the layout/map is collapsed by default.
- Browser smoke test confirmed QSHS Alumawood Kwila generates priced `AW/AWQS` BOM lines with no `No local price` assumptions.
- Programmatic browser/module audit checked QSHS standard colours, economy colours, Alumawood 65mm Kwila/WRC, and Alumawood 90mm WRC. No zero-price BOM lines or local-price assumptions remained for those QSHS cases.

### April 26, 2026 - QSHS stock optimisation and post-count QA correction

Investigated the user concern that the BOM may be ordering finished slat count rather than stock lengths. The formulated workbook confirms QSHS uses stock optimisation:
- Source workbook: `Glass outlet xlsm sheets formulated sheets\Order+Form+CTS+Slat+Side+Frame+Systems+-+V9.1-T1.xlsx`
- Sheet `QSHS`, row 5 labels include `# Slats req'd`, `Slat Length`, and `# Slats cut from length`.
- Sheet `QSHS`, cell `K6` formula pattern: `ROUNDDOWN($K$4/$J6,0)` calculates how many cut slats come from one stock length.
- Sheet `QSHS`, cell `W6` formula pattern: `ROUNDUP($I6/$K6,0)` calculates purchasable stock lengths from required slats divided by cuts-per-length.

Browser test scenario:
- QSHS, 20m run, 1800mm high, 65mm slat, 5mm gap, max panel width 3000mm.
- UI splits into 7 panels.
- Required finished slats = 25 slats/panel x 7 panels = 175 cut pieces.
- Cut length = 2842mm, so 6100mm stock gives 2 cut slats per stock length.
- Expected stock lengths = `ceil(175 / 2) = 88`.
- App BOM correctly produced `XP-6100-S65-B` quantity 88.

Confirmed defect found nearby:
- The local fallback BOM engine was only ordering posts from run boundaries and corners.
- It missed internal posts created when a long run is split into multiple panels.
- In the 20m / 7-panel test, UI correctly displayed 8 posts but the BOM only ordered 2 posts.

Fix applied:
- `src/lib/localBomCalculator.ts` now adds internal panel join posts with `numPanels - 1` per fence segment.
- Segment-level `max_panel_width_mm` is now honoured by the BOM engine when calculating panel count.
- Post BOM note changed to `posts from run boundaries/corners and internal panel joins`.
- `src/lib/suggestedAccessories.ts` now uses the same internal-panel post count for rapid set/base plate/core drill suggestions.

Verification:
- `npm run build` passed.
- Browser retest for the same 20m scenario now produced:
  - `XP-6100-S65-B`: quantity 88.
  - `XP-2400-FP-B`: quantity 8.
  - Rapid set suggestion: quantity 12 bags.

QA agent first audit:
- A read-only QA tester agent confirmed the stock optimisation shape in the workbook and app.
- It also found the QSHS height/slat-count formula did not match the workbook exactly.
- Workbook source:
  - `QSHS!$C$49:$E$51` named range `QS_SlatWidths` maps 65mm to design width 65.3 and 90mm to design width 90.3.
  - `QSHS!Z51` height formula pattern: `ROUND(slat_count * (design_slat_width + gap) - gap + 3, 0)`.
  - `QSHS!I6` maps selected height to slat count via the generated height table.
- Fix applied:
  - `src/lib/localBomCalculator.ts` now uses design widths 65.3/90.3 for QSHS/BAYG slat height calculations.
  - The inverse formula now uses `(target_height + gap - 3) / (design_slat_width + gap)`.
  - `actual_height_mm` now rounds from the same workbook formula.
- Follow-up still needed:
  - Add valid-height UI selection so users pick spreadsheet-valid heights rather than arbitrary typed heights.
  - Build QSHS regression cases for 65mm and 90mm valid heights from the workbook table.
  - Confirm side-frame cap SKU/pack basis (`QS-SFCAP-*-2PK` workbook references versus current seed/app SKU basis).

### April 28, 2026 - VS vertical slat local BOM fallback

Issue found:
- The public/local fallback calculator listed `VS - Vertical Slat` in the UI, but `src/lib/localBomCalculator.ts` only allowed QSHS and BAYG through the BOM engine.
- Result: selecting VS and clicking `Generate BOM` produced no usable BOM lines.

Fix applied:
- Added a dedicated VS calculation path in `src/lib/localBomCalculator.ts`.
- The VS path follows the bundled `supabase/seeds/glass-outlet/products/vs.json` rules:
  - vertical slat count from panel width, slat size, and gap: `floor((panel_width_mm - 8 + slat_gap_mm) / (slat_gap_mm + slat_size_mm))`;
  - vertical slats use the same slat SKUs as QSHS (`XP-6100-S65-*` / `QS-6100-S90-*`) but cut to height;
  - top and bottom horizontal rails use `QS-5000-HORIZ-*`;
  - vertical edge frames use `QS-5800-F-*`;
  - side frames/CFC/caps are included for product-post panel ends;
  - posts and post accessories reuse the same boundary/internal-panel post logic as QSHS/BAYG.
- Shared the post-line emitting helper so VS, QSHS, and BAYG use one consistent post/accessory output path.

Verification:
- `npm run build` passed.
- Browser smoke test on `http://127.0.0.1:5173/calculator`:
  - selected `VS - Vertical Slat`;
  - added a default 2600mm segment;
  - clicked `Generate BOM`;
  - BOM generated 8 priced item groups including `XP-6100-S65-B`, `QS-5000-HORIZ-B`, `QS-5800-F-B`, `QS-5800-SF-B`, posts, caps, and screws;
  - total displayed as `$799.29` inc GST for the default VS scenario.

Open QA note:
- The VS seed contains one contradictory note saying vertical slat cuts are from `QS-5800-F`, but the product description and component selectors identify `XP-6100-S65-*` / `QS-6100-S90-*` as the actual slat stock. The implementation follows the selector/SKU pattern and should be checked against the catalogue/workbook in the next VS QA pass.


### April 28, 2026 - SKU-specific quantity breaks and run-summary QA pass

User correction:
- The Glass Outlet CSV price sheets do not use one global quantity-break threshold for every item.
- Each product row carries its own quantity break columns, for example `XP-6100-S65-B` uses 1/50/100 while `QS-6100-S90-B` uses 1/30/72.

Fix applied:
- Added `src/lib/localPriceBreaks.ts`, generated from the CSV price-list quantity break columns.
- `src/lib/localBomCalculator.ts` now chooses tier1/tier2/tier3 per SKU quantity using those item-specific break quantities.
- The hidden UI pricing-tier selector remains removed; BOM line prices are now automatically recalculated from each line quantity.

BOM rule corrections:
- Horizontal QuickScreen side-frame caps now equal the number of cut side-frame pieces, not double that amount.
- Centre support rail top/base plates were removed from the standard BOM and moved to suggested accessories.
- VS vertical slat BOM now uses `QS-5000-HORIZ-*` plus `QS-5800-SF-*` inserts for top and bottom rails, with two cut pieces of each per panel.
- VS no longer adds `QS-5800-CFC`, `QS-5800-F`, or `QS-SFC-B` as standard parts.
- VS now suggests `XP-FOOT-ADJ` 100mm adjustable support feet.
- For concreted 50mm posts at 1200mm fence height or below, the local engine will use the priced 1800mm post SKU where the catalogue/CSV provides it (`XP-1800-FP-MN` and `XP-1800-FP-W`). Other colours still fall back to the closest seeded post until their 1800mm SKUs/prices are confirmed.
- Suggested accessories now include optional full-length post stock for installers who want to cut posts on site.

UI correction:
- Each run summary now shows total run length including gates, actual calculated fence height, full fence colour name, full post colour name, corner count, segment count, panel count, panel length breakdown, post count, slat size, gap size, post type, and mounting method.

Verification:
- `npm run build` passed after the changes.

Open QA notes:
- Confirm whether 1800mm 50mm full posts exist/priced for colours beyond Monument and Pearl White. The visible CSV rows only showed `XP-1800-FP-MN` and `XP-1800-FP-W` at this pass.
- Confirm whether VS 100mm support foot quantity should be one per panel or a different catalogue rule.

Additional smoke-test fix:
- Browser smoke testing found that selecting a system could leave the run with no real fence segment, or with a stale gate-only segment from the prior UI state, which made `Generate BOM` produce only posts.
- `ProductSelectV3` now creates a default panel segment using the selected system's max panel width and target height.
- `RunListV3` now also creates a default panel segment when adding another run, inheriting run 1 settings.
- Browser verification after reload:
  - QSHS starts with a `Segment`, not a `Gate`, and generates slats, side frames, caps, posts, GST, and total.
  - VS generates `QS-5000-HORIZ-*` and `QS-5800-SF-*`, does not generate `QS-5800-CFC-*`, `QS-5800-F-*`, or `QS-SFC-B`, and shows `XP-FOOT-ADJ` as a suggested accessory.

### April 28, 2026 - Layout mapper usability and 135 degree adapter pass

Mapper UI changes:
- Added a visible `Minimize` button to the layout map drawer header, separate from expand/close controls.
- Renamed the vague `Edit` tool to `Move / Edit`.
- In `Move / Edit`, click-hold-drag on blank canvas now pans/moves the drawing; node dragging and length-label editing remain available.
- The top-left map overlay now describes each segment as `segment length`, with panel count and actual post spacing.
- Gate placement now shows a small placement modal with only gate opening and a default-ticked `Use gate posts as fence termination post` checkbox. Other detailed gate options remain for the run/gate settings flow rather than blocking placement.
- Gate markers carry the `use_gate_posts_as_fence_termination` flag into canonical gate-opening segment variables so later gate/post BOM rules can consume it.

Calculation/data changes:
- Canvas corner conversion now classifies drawn corner angle as 90 or 135 based on the actual drawn interior angle.
- The local BOM engine now adds a 135 degree angle adapter when a segment corner is closer to 135 degrees than 90 or 180.
- Added local fallback component/pricing rows for `XP-6000-135-*` standard colour adapters, `XP-6000-135-M`, and Alumawood `AW-5800-135-KWI/WRC` based on the CSV price list.

Verification:
- `npm run build` passed.
- Browser smoke test confirmed the layout map opens, `Minimize`, `Move / Edit`, and `Use This Layout` display, and the canvas renders.

Open QA notes:
- The current gate post checkbox is now preserved in canonical data, but the full gate-post BOM calculation still needs the dedicated gate calculator pass before it can add/omit gate posts perfectly.

### April 29, 2026 - Gate options first slice

User request:
- Add a `Match run 1` action for later runs that copies run 1 settings without changing segment lengths/details.
- Make the gate section under each run much more complete, based on the QuickScreen / XPress / Alumawood gate catalogue and bundled CSV price lists.

Agent workflow used:
- UI agent: recommended keeping gates as `gate_opening` segments inside each run, not a separate top-level gate workflow.
- Catalogue extractor: confirmed the catalogue has pedestrian swing, driveway/double swing, sliding, XPress lock-box, Alumawood, hinges, latches, drop bolts, stops, track, guide, wheel, catch, and motor families.
- Calculation agent: confirmed `QS_GATE` is reliable only for the QuickScreen pedestrian slice today; driveway/double/sliding should expose workflow and confirmed hardware pricing first, while frame/infill formulas remain QA items before hardcoding.

Changes applied:
- Added `Match run 1` button to runs after run 1. It copies system, variables, and run boundary settings from run 1 while preserving the current run's segments, gate openings, lengths, and geometry.
- Replaced the old free-text gate stub with grouped gate controls:
  - gate type: single swing pedestrian, double swing driveway, sliding driveway;
  - gate build: QuickScreen pedestrian slat gate, XPress lock-box gate kit, QuickScreen/XPress sliding gate;
  - match run height, gate height, and use gate posts as fence termination;
  - hinge/closer, latch/lock, drop bolt, gate stop, optional XPress lock box;
  - sliding track, catch, and motor options when sliding is selected.
- Added `src/lib/gateOptionRules.ts` as the local source for the first UI option model and default gate variables.
- New manually added gate segments now default to:
  - 900mm opening;
  - run height;
  - QuickScreen single swing pedestrian;
  - Magna Latch + Kwik Fit hinge combo;
  - gate posts used as fence termination posts.
- Added local fallback components and pricing for confirmed gate hardware from the bundled CSVs, including D&D hinges/latches/drop bolts/stops and XPress sliding track, anchors, wheels, clamps, guide, catches, stops, motor kits, rack, and remotes.
- Local BOM engine now includes gate-opening segments instead of skipping them:
  - QuickScreen pedestrian swing gates emit confirmed 65mm gate blade stock, HD rail stock, gate stop stock, and selected hinge/latch/drop-bolt/lock-box hardware;
  - double swing currently multiplies per-leaf material/hardware where appropriate and warns that driveway frame rules still need verification;
  - sliding gates emit selected/required sliding hardware from confirmed CSV SKUs and warn that full frame/infill formulas are not hardcoded yet.
- `gateItems` is now populated from generated `gate` and `hardware` BOM lines so the BOM gate tab can display selected gate outputs.

Important seed/data findings:
- The catalogue names newer QSG pedestrian frame parts such as `QSG-4200-GSF50`, `QSG-4800-RAIL65/90`, `QSG-4200-COVER`, `QSG-4800-INF`, `QSG-JOINER65/90-4PK`, and `QSG-GFC-50X50`.
- The current `qs_gate.json` seed has a useful QS pedestrian shell, but some newer QSG SKUs are missing or represented by temporary aliases/pricing-TBD records.
- CSV-confirmed XPress gate parts include `XP-4200-GSF09/20-*`, `XP-4200-GI-*`, `XP-GKIT-LSET09/20-*`, `XP-6100-GB65-*`, `XP-6100-HD6545-*`, and the XPSG sliding hardware family.
- `QuickFrame` was not found as a literal catalogue product name in the local sources searched; closest concepts are QSG gate frame extrusions, XPress patented gate side frames, and XPress lock-box gate kits.

Open QA notes:
- Confirm whether the calculator should use newer QSG catalogue SKUs or continue using CSV-confirmed XPress gate-side-frame / lock-box kit SKUs for priced quotes.
- Confirm pedestrian gate max width rules: catalogue notes horizontal max 2100mm and vertical max 1200mm, while earlier seed/docs had conflicting limits.
- Confirm whether gate lock-box kits should be emitted as one kit SKU or decomposed into side frames, inserts, stops, rubber, caps, and screws.
- Confirm double swing/driveway BOM rules before hardcoding, especially hinge count, latch count, inactive-leaf drop bolts, frame type, and gate post requirements.
- Confirm sliding gate frame/infill formulas and default catch choice before hardcoding beyond the currently priced sliding hardware slice.

Verification:
- `npm run build` passed after the gate UI/BOM changes.

### April 29, 2026 - QSG-only gate UI correction and workbook source map

User correction:
- Hegel has been told that the XP gate frame systems are discontinued.
- The only gate catalogue source to use for learning gate systems is `GO+Quickscreen+Slat+Screening+and+Gates+Catalogue+V1+Low+Res.pdf`.
- Other catalogues can be misleading for gate system rules and should not define selectable gate systems.

Immediate UI correction:
- Gate build options are now QSG-only:
  - `QSG hinged horizontal`
  - `QSG hinged vertical`
  - `QSG sliding horizontal`
  - `QSG sliding vertical`
- Swing gates show swing hardware only: hinges/closers, latches/locks, drop bolts, gate stops.
- Sliding gates show sliding hardware only: track, catch, motor kit. Swing hinge/latch controls are hidden when sliding is selected.
- The previous `XPress lock-box gate kit` selectable build was removed from the gate UI.
- Gate option controls were changed to compact bubble/segmented buttons so the gate segment panel fits better in the run sidebar and matches the rest of the calculator UI.

Workbook source map inspected:
- `Order-Form+QSG+Sliding+Gates~V2-T1 (1).xlsx`
  - Primary QSG sliding source.
  - Relevant sheets: `QSG Hor Slat Sliding Gate`, `HSSG`, `QSG Vert Slat Sliding Gate`, `VSSG1`, `SG_Accessories`, `QSG_StkData`, `MasterLookup`, `MasterPriceList`.
  - Named ranges include `HSSG_PickList`, `HSSG_PickQty`, `VSSG1_PickList`, `VSSG1_PickQty`, `listSlats`, `listSpacers`, `listColours`.
  - Confirmed QSG sliding hardware/accessory rows include steel/aluminium track, anchors, wheels, QSG wheel clamp set, slide guide, U/F catches, stops, and motor/accessory options.
- `CTS+QSG+Pedestrian+Gates~V3-T1 (1).xlsx`
  - Primary QSG pedestrian hinged source.
  - Relevant sheets: `QSG Hor Slat`, `QSG_H_Calcs`, `QSG_H_Packing`, `QSG Vert Slat`, `QSG_V_Calcs`, `QSG_V_Packing`, `QSG_Extrusions`, `Calcs_Extr`, `QSG_Accessories`, `Stock Posts`, `StockData`.
  - Named ranges include `QSGH_PickList`, `QSGH_PickQty`, `QSGV_PickList`, `QSGV_PickQty`, `QSGE_PickList`, `QSGE_PickQty`, `QSGA_PickList`, `QSGA_PickQty`.
  - Confirmed QSG component labels include `QSG-4200-GSF50-*`, `QSG-4800-RAIL65-*`, `QSG-4800-RAIL90-*`, `QSG-4800-INF-*`, `QSG-4200-CINF-*`, `QSG-4200-COVER-*`, `QSG-GFC-50X50-*`, `QSG-JOINER65-4PK`, `QSG-JOINER90-4PK`, and `QS-SCREWS-50PK`.
- `CTS++Pedestrian+Gate+V9.1+Lever+and+Knob (1).xlsx`
  - Useful for legacy hardware and lever/knob references, but not a source for the selectable QSG gate systems while the QSG-only rule is in force.
- `CTS+Slat+Sliding+Gates+-+V9.01+-+Hamptons (2).xlsx` and `CTS+ALUMAWOOD+Sliding+Gates++V8-T1.xlsx`
  - Useful for comparing sliding hardware and old product families.
  - Do not use their XP/Hamptons/Alumawood gate systems to define the current QSG gate calculator unless the user explicitly opens those as separate future calculators.

Implementation note:
- The current local BOM still prices a first gate slice using confirmed local fallback hardware and earlier available gate stock rows. The next hardening pass should replace any remaining legacy/temporary frame assumptions with formulas extracted from the QSG workbook pick lists and QSG catalogue SKUs.

Verification:
- `npm run build` passed after the QSG-only gate UI/filtering correction.
