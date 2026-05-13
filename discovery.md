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

## May 10, 2026 - Brief AY entry simplification and run-defaults teaching

UX finding:
- The launch page works best as a single, fast job-details entry point; the real choice between drawing, describing, or selecting a system belongs inside the calculator sidebar.
- The first generated section is the right moment to teach users that Run Settings become defaults for the rest of the run.

Changes applied:
- Simplified the opening screen to the Glass Outlet title/logo, one `Enter job details` input, and the exact `press Enter to start` hint.
- Replaced scattered empty-workspace controls with three equal numbered sidebar cards: `Draw your fence`, `Describe your fence`, and `Select your fence`.
- Standardised layout-map copy through a shared `DRAW_FENCE_LABEL` constant and added a right-side sidebar affordance to reopen the map after minimising.
- Added panel-count display to run/BOM summaries after a BOM exists, while showing an em-dash placeholder before generation.
- Auto-opened Section 1 after selecting/applying a system and added a one-time `RUN DEFAULTS` teaching card using the existing page/run state rather than a parallel onboarding subsystem.
- Updated the UI-designer skill in both repo skill mirrors with the numbered entry-card pattern.

Verification plan:
- Run the describe-fence corpus, build the app, then browser-smoke the landing entry, three-card sidebar, Select path auto-open, teaching-card dismiss, map reopen button, and BOM panel-count summary.

---

## May 9, 2026 - Brief AT supplier portal pricing seed

Pricing finding:
- The supplier portal companion catalogue contains 187 price rows after expanding POSTA character patterns into individual SKUs.
- Five rows are pricing anomalies that should not be trusted until Glass Outlet confirms them: `TC-H-AT-B`, `TC-H-AT-2L-B`, `ENDURO-SSC-60`, `ENDURO-SSRES`, and `MR-FLGG-S`.
- Bulk-buy `BB-` variants are real purchasable SKUs, but only 14 regular-to-BB pairs are verified enough to map automatically. Three BB rows remain unmapped pending supplier clarification.

Changes applied:
- Added `npm run prices:brief-at` to regenerate `supabase/seeds/glass-outlet/pricing-2026-05-09.json` from the companion markdown and refresh the local catalogue seed.
- Added migration `024_seed_supplier_prices_2026_05_09.sql` so the staged supplier pricing can be applied idempotently to `product_components` and `pricing_rules`.
- Added `src/lib/bulkBuyVariants.ts` and a BOM-row bulk-buy hint for verified BB pairs.
- Updated Diamond Revolution suggested accessories so the kit total is computed from current `REV-*` SKU prices instead of hardcoding the bundle total.
- Documented WHITE latch pricing parity, Diamond kit pricing, BB mapping gaps, and anomaly exclusions in `docs/brief-at-pricing-notes.md`.

Verification:
- `npm run prices:brief-at` generated 181 staged SKUs after de-duplicating one cross-listed SKU and excluding anomaly rows.
- Full build verification was run after this pricing pass before commit.

---

## May 9, 2026 - Brief AM pricing-data import checkpoint

Pricing finding:
- The local CSV exports under `Glass Outlet csv pricelist` contain real supplier quantity-break prices for thousands of SKUs, so pricing should be refreshed from those files rather than maintained as hand-entered constants.
- The current seed model can express per-SKU quantity breaks with pricing rows such as `qty >= 40` and priority equal to the minimum quantity, letting the highest applicable break win.

Changes applied:
- Added `npm run prices:import`, which reads the local Glass Outlet CSV exports and updates product seed JSON pricing rows.
- Imported 2,618 priced CSV SKUs, matched 333 existing seed components, added 2,285 catalogue-only priced components, and generated 17,787 pricing rows from the current CSV folder.
- Added a verified-pricing chip to the BOM UI and a `Price not set` treatment for unpriced BOM lines.
- Changed the local BOM price fallback so missing pricing now returns zero instead of silently using component `default_price`.

Verification:
- `npm run prices:import` completed.
- `npm run build` passed. Vite reports the known large-bundle warning, now larger because the local fallback imports the expanded price catalogue seed.

---

## May 8, 2026 - Mobile mapper audit and phone workflow pass

Mobile finding:
- The phone layout needed to behave as three clear work panes: Run, BOM, and Map. Before this pass, opening the map from the intro could leave the user on an empty mobile pane, and switching back to Run or BOM did not reliably minimize the map overlay.
- The canvas engine primarily listened for mouse events. On a phone, touch taps and drags need to feed the same placement, movement, double-tap finish, and gate-drag logic.
- The satellite-address hint was useful on desktop but blocked the drawing surface on a mobile viewport.

Changes applied:
- Opening the map from the start screen now creates a QSHS fallback payload if no product has been selected yet.
- The mobile bottom tabs now act as real panes: Map opens the mapper, while Run and BOM minimize it.
- The canvas engine now converts single-touch start/move/end events into the existing draw, move, text, and gate workflows, with double-tap support for finishing drawn runs/buildings/boundaries.
- The canvas element opts out of browser touch scrolling, and the toolbar scrolls horizontally on mobile instead of squeezing the drawing controls.
- The phone map hides the satellite-address hint over the canvas and adds footer spacing so fixed mobile navigation does not cover job actions.

Verification:
- `npm run build` passed.
- Chrome mobile emulation verified: start screen opens the map, touch taps draw a two-section run, Run/BOM/Map tabs are reachable, and the BOM pane remains visible on a phone viewport. The only console noise was expected local Supabase connection-refused messages plus a favicon 404 in the dev environment.

---

## May 8, 2026 - Run defaults and double-gate correction

Workflow finding:
- Users expect Run Settings to be the real default source for every section in that run, not a hidden first-section convention.
- The green section code is more useful as an action: green means it matches the run, non-green means it can be clicked to restore the section to the current run defaults.
- Double swing gates are one opening but two leaves. BOM and hinge rating need to use the finished leaf size after hinge/latch clearances, not the full opening width or stock off-cuts.
- Sliding gates need two separate choices: travel direction and the side of the fence they slide along.

Changes applied:
- Run setting edits now clear matching section overrides and push the edited defaults into normal sections and gate-opening segments.
- Section code buttons explain the default-matching behaviour on hover and restore section settings back to Run Settings when clicked.
- Number inputs now keep a local text draft, allowing the user to delete all digits before entering a new measurement.
- Double swing gate calculations now derive leaf width as `(opening - two hinge gaps - one latch gap) / 2`, emit two leaves worth of frame/slats/rails, use one latch, and default a drop bolt.
- Gate hinge/closer and latch options that fail fit checks are hidden under `Other hinges` / `Other latches` but remain selectable for overrides.
- Canvas gate markers now preserve gate type, swing/slide direction, and sliding side through placement, sidebar editing, canonical conversion, and reload.
- Sidebar gate width edits now preserve the original drawn source section length so changing a gate opening does not collapse or distort the drawn run.

Verification:
- `npm run build` passed.
- Browser smoke confirmed the calculator loads from the branded start screen, QSHS opens Run 1, section settings are visible, and Generate BOM controls render.

---

## May 7, 2026 - Sidebar minimisation and map text-note pass

UI finding:
- Installer workflows need the sidebar to stay compact while still showing what is selected. Large always-open run and section settings made longer jobs feel cluttered.
- Gate dimensions are easier to enter and verify in millimetres because supplier/catalogue widths are specified that way.
- The mapper text tool needed a real "draw note box, then type" workflow rather than a tiny click-only label.

Changes applied:
- Run settings are now collapsible and auto-collapse after the pointer has left the run-settings area for 10 seconds.
- Run settings fields render as compact accordions showing the current selected value until opened.
- Section cards now use a stronger centred heading, a compact status/code bubble, and an icon-only settings control that auto-collapses after 10 seconds away from the card.
- Section settings no longer have a separate "Additional settings" button; the editable groups are individually collapsible and show selected summaries.
- Gate sections now show and edit width in millimetres instead of metre length entry.
- The canvas text tool now lets the user drag out a note box, then type text into it.

Verification:
- `npm run build` passed after the changes.

---

## May 7, 2026 - BAY-G panel workflow and launch screen pass

Catalogue/seed finding:
- BAY-G is a buy-as-you-go infill-screen workflow for screens between existing walls, posts, or pillars. It should not behave like a normal post-and-gate fence run.
- Existing seed data already included BAY-G variables and local BOM support, but the active fence selector filtered it out.
- BAY-G spacer handling differs from packed QSHS spacers: the fallback engine emits individual spacers for BAY-G rather than 50-packs.

Changes applied:
- Restored BAY-G in the system selector with the label `BAY-G - Infill Screens`.
- BAY-G runs now add panel-size groups where each group has width, height, and quantity.
- BAY-G hides gate controls and post controls in the run/section UI, and the local fallback BOM suppresses post and post-fixing lines.
- The opening calculator state now uses a branded Glass Outlet intro screen with only three ways to begin: choose a system, open the map, or enter a job name.
- The layout map CTA now uses a drawing-tool style icon and stronger visual treatment.
- Gate settings now use collapsible sections like section settings.
- The map toolbar is grouped into Draw, Site, Actions, and View. Site tools now include existing post and pillar markers for drawing wall/post context.

Verification:
- `npm run build` passed after the changes.
- Chrome smoke test confirmed intro render, BAY-G selection, BAY-G panel quantity UI, hidden BAY-G gate control, BAY-G BOM generation, grouped map toolbar, text note placement, and existing-post placement.

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

### April 29, 2026 - Final sandbox polish and smoke check

User priorities:
- Keep XPress Plus as a fence system while removing only the discontinued XP gate frame systems.
- Make horizontal sliding gates generate slats/frame lines, not hardware only.
- Correct spacer quantities to one spacer per gap per end.
- Make the calculator easier on the eye, improve dark mode, and make segment controls easier to read.

Changes applied:
- Restored XPL to the local fallback BOM path so the XPress Plus fence option is selectable and no longer produces an unsupported empty BOM warning.
- Added QSHS custom gap mode while keeping preset spacer gaps for standard spacer-supported configurations.
- Height choices for horizontal systems are now generated from the selected slat size and gap so users only choose achievable actual fence heights.
- Sliding QSG gate BOMs now emit horizontal gate blade stock, HD rail stock, QSG side-frame stock, joiner blocks, rail screws, and selected sliding hardware.
- Spacer quantity now follows `gaps x 2 ends x panels`, so a 25-slat panel has 24 gaps and 48 spacers.
- Dark mode was fixed across the v3 calculator by removing hard-coded white/slate calculator surfaces and using the theme tokens instead.
- Segment rows, gate options, form fields, accessory cards, and BOM quantity inputs were softened with rounder controls and stronger, larger text.

Verification:
- `npm run build` passed.
- `git diff --check` passed with line-ending warnings only.
- Local dev server responded with HTTP 200 at `http://127.0.0.1:5173/calculator`.
- Existing Cypress QSHS baseline spec was attempted, but it is still written for the old login flow and fails looking for `[data-testid="sign-in-btn"]`. The test suite needs an auth-free sandbox update before it can be used as a reliable regression gate.

### April 30, 2026 - Segment-led defaults, gate inheritance, and mapper stability

User workflow finding:
- Real jobs commonly have 10-15 segments and several gates, so separate run settings plus segment settings made material ordering confusing.
- The cleaner workflow is for the first fence segment in a run to act as the default settings source for that run. Later fence segments and gates inherit those settings unless edited locally.

Changes applied:
- Moved the practical run configuration into the first segment options flow: system, colour, slat size, gap, height, post type, post size, mounting method, and max post spacing.
- Removed visible stock-length controls, left termination type, and right termination type from the segment sidebar.
- Added clearer segment labels (`R1 S1`, `R1 S2`) and grouped gate labels (`R1 G1`, `R1 G2`) so the sidebar matches the mapper.
- Added a segment done toggle so long jobs can be marked off as each segment is checked.
- New fence segments inherit the first segment's settings without copying mapper-only angle markers.
- Gates now default from the run/first-segment style. A VS run creates vertical gate defaults, horizontal runs create horizontal gate defaults, and the first latch option is selected by default.
- BOM calculations now merge first fence segment variables into the run variables before calculating, so the calculator engine follows the segment-led UI.
- QSG gate blade logic now supports 90mm slats, instead of only defaulting to 65mm gate blades.
- Vertical slat fence BOM now includes the F-section required to accept the vertical U-channel.
- BOM row keys were made unique so manually changing a BOM quantity reliably refreshes that line's displayed total.

Mapper stability note:
- Canvas-to-canonical conversion now stores a `geometry_angle_deg` hint on generated panel segments.
- Canonical-to-canvas conversion uses those angle hints when rebuilding the drawing, which prevents sidebar edits, undo, or gate splits from flattening angled/cornered runs into a straight line.
- Gate splitting still needs deeper QA on complex angled layouts, but the current pass preserves the original segment angle enough to stop the obvious straight-line regression.

### April 30, 2026 - Run master display and QSG gate BOM hardening

User workflow finding:
- Long material-order jobs need fast visual confirmation that later segments and gates still match the run master settings.
- Gate segments created from the mapper must inherit the run master settings even when they are created from geometry first and edited later in the sidebar.

Changes applied:
- Run headings now show total length, fence segment count, and gate count, followed by an italic `Master Settings for Run` line.
- The run summary lists the first segment's master settings in bold pills, including height, colour, slat size, gap, post, mounting method, and max post spacing.
- Segment and gate cards now show a large green check when their key settings still match the run master.
- Removed the gate `Match run height` control because height now defaults from the run master.
- Added a gate post size selector, defaulting to the run master post size.
- Updated swing gate defaults:
  - D&D TruClose heavy duty hinge set defaults for single and double swing.
  - Lokk Latch Deluxe keyed alike defaults for single and double swing.
  - Single swing defaults to no drop bolt.
  - Double swing defaults to 300mm black drop bolt.
  - Single and double swing default to no gate stop.
- QSG gate BOM now emits side frames, joiner blocks, screw covers, rail screws, and frame top caps for swing gates as well as sliding gates.
- Vertical gate builds now calculate vertical slat counts from gate width and cut slats to gate height, rather than using horizontal-blade logic.
- Horizontal gate builds continue to calculate stacked slats by height and cut lengths by gate/leaf width.
- Mapper labels now use the same language as the sidebar (`R1 S1`, `R1 G1`) and split fence labels around gate openings.
- Live mapper post previews now split around gate openings, so post spacings are recalculated and shown separately on each side of a placed gate.

Verification:
- `npm run build` passed after these changes.

### May 7, 2026 - Brief T guided gate hardware picker

Catalogue/product rule finding:
- Gate hardware selection needs to be guided by estimated gate mass, self-closing requirements, hinge rating, hinge gap suitability, and finish availability rather than a flat dropdown.
- The active QuickScreen gate hardware set includes D&D TruClose/Kwik Fit/SureClose hinges, Six Star/Zeus/Colourbond hinge options, D&D Magna Latch/Lokk Latch/T-Latch latch options, white hardware variants where the catalogue offers them, four drop-bolt SKUs, and known hinge/latch kit combinations.
- The local fallback can safely estimate gate weight for selector guidance using catalogue kg/m constants, but pricing remains sourced from the existing seed/catalogue data path.

Changes applied:
- Added a gate hardware rules module with live weight estimation, hinge/latch ranking, white-SKU resolution helpers, TruClose detection, and known kit matching.
- Replaced swing-gate hinge and latch dropdowns with guided picker cards that show fit/tight/fail status, reason tags, white-finish limitations, recommended hardware, and kit-use prompts.
- Kept drop bolts and gate stops as searchable inventory dropdowns, with the active drop-bolt list narrowed to four selectable SKUs plus `none`.
- Updated the local fallback BOM to emit the selected hinge/latch or selected kit, auto-add `TC-CAPS3` for TruClose hardware, and add optional `LLB` external access kits when selected.

Verification:
- `npm run build` passed.
- Rules smoke check: 900x900 65/9 recommends `TC-H-AT-B`, 1500x1800 65/9 estimates 38.8kg and recommends `TC-H-AT-HD-B`, and 2100x2100 90/9 recommends `KF-AH-AT`.

### May 7, 2026 - Brief U live height derivation

Catalogue/formula finding:
- QSHS and XPL height choices must derive from the QuickScreen catalogue formula `Height = ((slat + gap) x N) - gap + 3`, where `N` is the slat count.
- The previous generated heights used effective slat widths (`65.3`/`90.3`) in the UI helper, which made examples like 65/5/14 land at 982mm instead of the catalogue 978mm.
- VS remains a free height because the vertical slat system is not constrained by the same horizontal slat height table.

Changes applied:
- Added `src/lib/heights.ts` with `deriveHeights`, nearest-height, and slat-count lookup helpers.
- Updated product option normalisation to keep `slat_count` in form variables and recompute height from that count when slat size or gap changes.
- Run settings and section settings now show a derivation chip for QSHS/XPL height choices, display height options as `height - N slats`, and show `Custom height` for VS.
- The local fallback QSHS/BAYG horizontal slat count now uses exact 65mm/90mm catalogue widths so generated BOM slat counts align with the new height selector.

Verification:
- `npm run build` passed.
- Formula smoke check passed for 65/5/14 = 978, 65/9/14 = 1030, 65/20/14 = 1173, 90/5/14 = 1328, and 90/9/14 = 1380.

### May 7, 2026 - Brief V vertical gate infill SKU fix

Catalogue/formula finding:
- The current local fallback already routed vertical QuickScreen gates to `QSG-4200-CINF-*` and horizontal QuickScreen gates to `QSG-4800-INF-*`.
- Pedestrian gate cut logic was correct: horizontal gate infill cuts to the rail/gate-width cut, while vertical channel infill cuts to the side-frame/gate-height cut.
- Sliding gate cut logic still used the side-frame/gate-height cut for both horizontal and vertical infill, which made horizontal sliding gate `QSG-4800-INF-*` stock counts wrong.

Changes applied:
- Updated the QSG sliding gate frame helper so horizontal sliding gate infill cuts from `QSG-4800-INF-*` use the gate-width rail cut.
- Kept vertical sliding gate channel infill on `QSG-4200-CINF-*` with the gate-height side-frame cut.
- Confirmed `QSG-4200-CINF-*` exists in the local fallback metadata and `qs_gate.json` seed for active catalogue colours.

Verification:
- `npm run build` passed.
- Source-level check: `gateInfillSkuFor(verticalBuild, colour)` emits `QSG-4200-CINF-*` for vertical builds and `QSG-4800-INF-*` for horizontal builds; sliding infill stock count now uses `infillCutMm` derived from orientation.

### May 7, 2026 - Brief W gate width validation

Catalogue/rule finding:
- QuickScreen gate maximum widths differ by movement and orientation: pedestrian horizontal 2100mm, pedestrian vertical 1200mm, sliding horizontal 6150mm, and sliding vertical 6166mm.
- Pedestrian gates can warn up to 110% of max and suggest a catalogue alternative; sliding gates should hard-block once over the catalogue maximum because there is no larger QuickScreen sliding alternative.

Changes applied:
- Added `src/lib/gateConstraints.ts` with max-width constants, gate type/orientation resolution, validation status, alternative suggestions, and switch-to-alternative patches.
- Gate section length editing now shows yellow warning chips for soft overages and red hard errors with a switch button when an alternative exists.
- Generate BOM buttons and the Ctrl+Enter path now block while any hard gate-width error exists; warning-only gates still allow BOM generation.

Verification:
- `npm run build` passed.
- Validation smoke check passed for pedestrian horizontal 2100/2200/2400, pedestrian vertical 1200/2000, and sliding horizontal 6000/6500.

### May 7, 2026 - Brief X sliding gate component completeness

Catalogue/rule finding:
- Current sliding gates already emitted QSG sliding rails, side frames, wheels, clamping set, track, slide guide, stop, catch, and motor rack where relevant.
- Missing/incomplete pieces were the selectable top guide system, required CSR kit for wide sliding gates, and optional CSR suggestions for shorter sliding gates.
- Track type and catch type were already user-selectable; this pass preserved those controls and added the missing top guide selector.

Changes applied:
- Added a `sliding_guide_type` gate variable with catalogue options `XPSG-GUIDE` and `XPSG-TOPROLL-2PK`.
- Sliding gate BOM now emits the selected guide system instead of hardcoding `XPSG-GUIDE`.
- Sliding gate BOM now auto-adds centre support rail stock, one CSR cap, and two top/base plates for gates over 3000mm.
- Suggested accessories now offers the CSR, cap, and two plates for sliding gates at or under 3000mm.

Verification:
- `npm run build` passed.
- Source-level check confirmed track quantity still uses `ceil((2 x gate width) / track length)`, catch emits the selected `XPSG-CATCH-U/F`, and guide emits the selected `XPSG-GUIDE` or `XPSG-TOPROLL-2PK`.

### May 7, 2026 - Brief Y Filo 400 sliding gate automation

Catalogue/rule finding:
- The Filo 400 kit family was already present in the local seed/pricing fallback, but the UI only exposed a simple motor-kit dropdown and the BOM only emitted the motor plus rack.
- The catalogue automation flow needs power-source choice, split-pack substitution for long mains runs, solar kit, backup battery, keypad, extra remotes, and rack quantity from gate width.

Changes applied:
- Added sliding gate automation variables for enabled state, power source, mains distance, battery, keypad, and extra remotes.
- Replaced the sliding motor dropdown with an "Add automation kit" sub-flow shown only for sliding gates.
- Added a live automation summary card with selected SKUs, rack count, subtotal, and electrician note.
- Updated the BOM fallback to emit automation SKUs under a new `automation` category: motor/split-pack, solar kit, battery, keypad, extra remotes, and rack sections.

Verification:
- `npm run build` passed.
- Source-level check confirmed rack quantity remains `ceil(gate_width_mm / 1000)`, mains distance over 30m selects `XPSG-FILO-400PRO-SP`, and solar emits `XPSG-FILO-400` plus `XPSG-FILO-SOLAR`.

### May 7, 2026 - Brief Z end-condition field

Catalogue/rule finding:
- The local fallback already had a wall-termination path that skips product-post behaviour and emits F-section stock for wall ends.
- The UI did not expose a simple installer-facing endpoint choice, and the existing hidden non-system subtype only supported wall/non-standard post.

Changes applied:
- Replaced the unused termination dropdown with a chip-based endpoint control for Post, Wall, Pillar, and Void.
- Added the end-condition picker to fence section additional settings for both left and right ends.
- Mid-run endpoints without explicit overrides display as read-only and show "Shared with adjacent section".
- Extended non-system subtype parsing so Wall, Pillar, and Void all flow through the existing wall/F-section BOM behaviour.

Verification:
- `npm run build` passed.
- Source-level check confirmed default endpoints remain Post, while Wall/Pillar/Void store `non_system_termination` and resolve to the wall/F-section BOM path.

### May 2, 2026 - QSG gate online pricing pass

Pricing workflow finding:
- Glass Outlet online product pricing can be checked by logging into the customer site and calling `ajaxstuff.aspx/GetProductDetails` with `{ code, qty }`.
- The current QSG gate seed still had active rows with `default_price: null` for gate side frames, gate infills, screw covers, top caps, joiners, rail screws, screws, and spacer packs.
- `QSG-JBLOCK-90-4PK` did not resolve on the supplier site. The current online code is `QSG-JOINER90-4PK`.
- Legacy placeholder rows `QSG-SC-10PK`, `QSG-RS-10PK`, `QSG-FTC-50`, and `QSG-FTC-65` did not resolve online and are superseded by the current QSG rows already used by the calculator: `QSG-4200-COVER-{colour}`, `AR-SCR-BR-50PK`, and `QSG-GFC-50X50-{colour}`.
- Palladium Silver `-S` QSG gate extrusion/cap lookups did not resolve online. The seed now uses the standard coated colour price as a temporary pricing fallback and records that note in component metadata pending supplier confirmation.

Changes applied:
- Updated `qs_gate.json` so active QSG gate components have non-zero default pricing and pricing rules.
- Added quantity-break rules for `AR-SCR-BR-50PK` based on the online quantity lookup.
- Replaced the 90mm joiner placeholder SKU with `QSG-JOINER90-4PK`.
- Marked unresolved legacy placeholder rows inactive so they do not appear as missing active gate pricing.
- Updated the local fallback data for the same QSG gate component price defaults.

Verification:
- Active gate pricing audit now reports zero active `GATE` / `QS_GATE` component SKUs missing a positive default price or pricing rule.
- Seed JSON schema validation passed after the pricing update.

### May 1, 2026 - Lever/knob pedestrian gate options

User workflow finding:
- The lever and knob pedestrian gate workbook needs to be represented as selectable gate hardware without bringing back the discontinued XP gate frame system as a gate type.

Source checked:
- `Glass outlet xlsm sheets formulated sheets/CTS++Pedestrian+Gate+V9.1+Lever+and+Knob (1).xlsx`

Changes applied:
- Added latch/lock dropdown options for `XP-HDL-KNOB`, `XP-HDL-LEVER`, and `XP-HDL-LW534`.
- Added local fallback product and pricing records for those handle sets.
- Added the same handle set component/pricing rows to `supabase/seeds/glass-outlet/products/qs_gate.json`.
- Updated the local QSG swing gate BOM so selecting one of those lever/knob handle sets also adds the colour-matched `XP-LBOX-LSET-*` lockbox.

Implementation note:
- This keeps the current QSG-only gate direction: the selectable gate build remains QSG hinged/sliding, while the lever/knob workbook contributes hardware options for pedestrian swing gates.

### May 2, 2026 - Sliding gate QSG component correction

User workflow finding:
- Sliding gate BOMs need to follow the QSG sliding gate catalogue pages, not the earlier simplified HD-rail-only fallback.

Sources checked:
- `Glass outlet xlsm sheets formulated sheets/CTS+Slat+Sliding+Gates+-+V9.01+-+Hamptons (2).xlsx`
- `Glass outlet xlsm sheets formulated sheets/CTS+ALUMAWOOD+Sliding+Gates++V8-T1.xlsx`
- User-supplied QSG catalogue screenshots for sliding gate option 1 horizontal and option 2 vertical.

Changes applied:
- Horizontal sliding gates now emit separate QSG sliding top rail, QSG sliding bottom rail, QSG gate side frames, gate infill, screw cover, joiner blocks, spacers, wafer screws, top caps, wheels, wheel clamping set, track, and selected sliding hardware.
- Vertical sliding gates now emit QSG sliding top rail, bottom rail, side frames, channel infill, screw cover, joiner blocks, spacers, wafer screws, top caps, wheels, wheel clamping set, track, and selected sliding hardware.
- Horizontal sliding gates now add centre support rails and top/bottom plates when the workbook spacing threshold requires them.
- The local sliding gate quantity formulas now use the workbook/catalouge deductions for slat cuts, side-frame cuts, rail cuts, and slat counts.
- Added local fallback and seed component/pricing rows for the QSG sliding rail and wheel SKUs: `QSG-S-6100-TR65-*`, `QSG-S-6100-TR90-*`, `QSG-S-6100-BR-*`, `QSG-S-WHEEL`, and `QSG-S-WHEEL-CS-2PK`.

Implementation note:
- The older XPSG rail and wheel rows remain in the seed/catalogue data for reference and historical compatibility, but the local sliding gate BOM now outputs the QSG catalogue codes shown in the current screenshots.

### May 1, 2026 - Sidebar readability and endpoint gate placement

User workflow finding:
- The run master settings were hard to scan because labels and answers had the same visual weight.
- New jobs should start with an explicit 0m first segment so the user enters the measured length rather than editing a prefilled panel length.
- Gates need to be placeable at the start, end, or corner of a segment when the existing/corner post is intended to act as the gate post.

Changes applied:
- Removed the redundant `Runs` sidebar caption and made each `Run 1`, `Run 2` title larger and more prominent.
- Master setting pills now render as label/value pairs, with the value in muted grey so the selected answers are easier to pick out.
- New first segments now default to 0m for all systems.
- Segment length and height controls were compacted for laptop sidebar layouts.
- Canvas gate markers now support start/end anchoring. Clicking near the segment start or end places the gate opening flush with that endpoint/corner while preserving the full gate opening width.
- Gate post previews, map labels, hit testing, canvas layout export, and canonical conversion now use the anchored gate opening range instead of forcing every gate to be centred away from the segment end.

Verification:
- `npm run build` passed after these changes.
- Local app responded with HTTP 200 at `http://127.0.0.1:5173/calculator`.

### May 1, 2026 - Living app overview file

Project management finding:
- The project now has enough moving parts that future calculator work needs a single current map of routes, files, data flow, canvas mapper responsibilities, fallback engine behavior, Supabase seed structure, and verification rules.

Changes applied:
- Added `docs/app-overview.md` as the living overview file.
- Linked the overview from `docs/tasks.md` so future developers and agents can find it before changing calculator behavior.
- Documented that this branch's active local calculator route is `/calculator`, even though older docs may mention `/fence-calculator`.

Maintenance rule:
- Update `docs/app-overview.md` whenever routes, file ownership, mapper behavior, backend seed structure, save/export behavior, or calculator engine responsibilities change.

### May 1, 2026 - BOM grouping and clean mapper start

User workflow finding:
- The generated BOM should read like an order form: one row per product/SKU, not repeated rows per segment.
- Users still need scoped tabs for all items, each run, all gates, and each labelled gate (`R1 G1`, `R2 G2`, etc.).
- Pressing Generate BOM should replace the old result immediately so the user is not looking at stale pricing while the new calculation runs.
- The mapper should open visually clear, without a blue snap dot before the first point is placed.

Changes applied:
- BOM display now aggregates matching SKU/category/description/unit lines inside each tab.
- Added individual gate tabs based on canonical gate segment labels.
- Generate BOM now clears the previous result before calling the calculator.
- Local fallback run results now preserve `runId`, `segmentId`, and `productCode` metadata so gate tabs can filter accurately.
- The canvas snap indicator now appears only after a drawing run has started.
- Zero-length initial payload segments are skipped when rebuilding the canvas layout, so the map starts clear.

### May 1, 2026 - Segment card readability pass

User workflow finding:
- The run card was still repeating master-setting language that did not help quoting.
- Segment cards needed to show the practical order details directly, while keeping editable dimensions and deeper settings inside the segment options dropdown.

Changes applied:
- Removed the `Master Settings for Run` line and the master setting pill block from each run card.
- Run headers now only show run number, total length, segment count, and gate count.
- Segment headings now emphasize labels such as `R1 S1` in larger blue type.
- Closed segment cards now show a tight summary for length, height, system, colour, slat, gap, post type, mounting, post spacing, corner post, end post, and total post.
- Post colour is only shown when it differs from the fence colour.
- Length and height edit controls moved into the expanded segment options area.
- Replaced the large segment-confirmed button with a small blue status dot and replaced the remove button with a red X.
- Added a 3D blue gradient border around each segment card so separate segments are visually distinct.
- Made the layout map button larger, moved it beside the initial fence-style selection, and made the same button open/minimize the map.
- Changed the initial prompt to `Select fence style or open layout map`.
- Segment summary values now carry the bold emphasis while labels are grey; length and height are slightly larger than the rest.
- Segment removal now requires two clicks on the red X.
- Local app responded with HTTP 200 at `http://127.0.0.1:5173/calculator`.

### May 1, 2026 - VS F-section cut length correction

Catalogue finding:
- In the vertical slat assembly, the F section is the vertical side receiver for each panel, not a top/bottom rail.
- Each vertical slat panel needs two F-section pieces: one on each side of the panel.
- Those F-section pieces are cut to the fence/panel height, while the QuickScreen frame and U-channel rails are cut to panel length.

Changes applied:
- Corrected the local fallback vertical slat BOM so `QS-5800-F-*` stock is calculated from `targetHeightMm`.
- Kept top/bottom U-channel and QuickScreen frame insert calculations tied to `panelWidthMm`.
- Updated the F-section BOM note to say `2 vertical side F-sections/panel` with height-based cuts.
- Confirmed the backend VS seed already uses `target_height_mm` for `fsec_stocks`, so no seed rule change was needed for this correction.

### May 1, 2026 - QSG pedestrian gate component correction

Catalogue/workbook finding:
- The QSG pedestrian gate formula workbook is `Glass outlet xlsm sheets formulated sheets/CTS+QSG+Pedestrian+Gates~V3-T1 (1).xlsx`.
- Both horizontal and vertical pedestrian gates use the QSG 50x50 gate side frame (`QSG-4200-GSF50-*`), not the older placeholder side-frame SKU.
- Pedestrian gates use normal QSG horizontal gate rails (`QSG-4800-RAIL65-*` or `QSG-4800-RAIL90-*`). A later sliding-gate pass replaced the temporary heavy-duty rail fallback with the current QSG sliding top/bottom rails.
- Required QSG pedestrian gate default components include side frames, top/bottom gate rails, slats, gate/channel infill, screw cover, 65/90 joiner blocks, slat spacers, `AR-SCR-BR-50PK` rail screws, `QS-SCREWS-50PK` wafer screws, `QSG-GFC-50X50-*` top caps, and selected hinges/latches.

Changes applied:
- Created a specialist gate-worker agent to inspect the gate path while the local fix was implemented.
- Updated the local fallback pedestrian gate calculator to emit the QSG component stack for horizontal and vertical swing gates.
- Vertical swing gates now use normal slat SKUs and channel infill by default; horizontal swing gates use normal slats and gate infill.
- Sliding gates were still using a temporary HD rail fallback at this point; this was corrected in the later sliding-gate pass.
- Added local fallback component metadata for QSG gate extrusions/caps so the BOM displays readable descriptions while final pricing is still being confirmed.
- Updated the `qs_gate.json` seed direction to move away from HD pedestrian rails and old QSG placeholder side-frame SKUs.

### May 1, 2026 - Mapper centering and gate hardware selectors

User workflow finding:
- When dimensions were typed into the sidebar first and the mapper was opened afterward, the imported line appeared at the top-left of the canvas rather than centered for editing.
- Gate hardware needed to feel like inventory selection: each hardware type should be chosen from a dropdown, with searchable product lookup available directly inside that selector.

Changes applied:
- Canvas `loadLayout` now fits the view to imported content after rebuilding runs from the canonical payload.
- Swing gate hardware controls now use dropdown selectors for hinge/closer, latch/lock, drop bolt, and gate stop.
- Sliding gate hardware controls now use dropdown selectors for track, catch, and motor kit.
- Each hardware selector includes an inventory search box; selecting a searched SKU stores that SKU as the selected hardware value for BOM generation.

### May 1, 2026 - Segment confirmation and master reset controls

User workflow finding:
- The segment card summary was too noisy; the per-card panel/max-post-spacing box duplicated information and distracted from confirming the segment.
- The green master-match check needs to be actionable, not just a status marker.

Changes applied:
- Removed the extra segment summary box that displayed panel count and max post spacing inside each segment card.
- Renamed `Mark done` to `Segment confirmed`.
- The first segment height now updates the run master height and flows through later fence segments and gates in that run.
- The green check is now a reset-to-master button when an item differs from the run master. Pressing it restores the segment/gate settings to the run master and turns the check green.
- Gate match status now only checks the user-facing master requirements: gate height and horizontal/vertical gate system type.
- Gate height edits from the segment row now also update the gate BOM height variable.
- Gate expanded settings now include segment-like controls for colour, slat size, slat gap, gate post size, and gate termination-post usage.
- Run master settings now explicitly include system type.

Verification:
- `npm run build` passed after these changes.

### May 2, 2026 - Discontinued XP gate-frame removal

Catalogue finding:
- The attached XP pedestrian/sliding gate pages show the old slotted XP gate-frame family, including `XP-4200-GSF09`, `XP-4200-GSF20`, `XP-6100-GB65`, `XP-6100-HD6545`, `XP-LBOX-*`, and `XP-HDL-*`.
- The current gate direction for horizontal and vertical slat gates is QuickScreen Gate System only: `QSG-4200-GSF50-*` side frames, `QSG-4800-RAIL65/90-*` pedestrian rails, `QSG-S-6100-TR65/90-*` sliding top rails, `QSG-S-6100-BR-*` sliding bottom rails, QSG infills/covers/caps/joiners, and normal slats.
- `XP-6100-S65-*` remains valid because the current QuickScreen catalogue uses that as the normal 65mm slat. `XP-6100-GB65-*` is the retired screw-fluted gate blade and must not be emitted.
- XPRESS Plus fence posts remain valid for XPL fence runs, but gates inside QSHS, VS, and XPL jobs must use the QuickScreen gate system.

Changes applied:
- Disabled the legacy gate seed file by renaming it to `gate_legacy.json.disabled`.
- Set old XP gate-frame/blade/lockbox/lever-handle rows inactive in `qs_gate.json` and disabled their QS_GATE selectors/rules.
- Removed old XP lever/knob latch options from the gate UI and blocked persisted old XP gate SKUs from the local fallback BOM.
- Expanded current gate hardware choices with D&D, Six Star, Zeus, Colourbond, black/white hinge options, Magna Latch/Lokk Latch/T-Latch latch options, and gate-stop/drop-bolt options.

### May 2, 2026 - Segment heading and max post spacing clarity

User workflow finding:
- First-time users need both a plain-language segment title and the compact code used on the map.
- The compact code should not contain spaces, so `R1S1` and `R1G1` visually match the mapper labels.
- Max post spacing is a user setting, not just a calculated panel spacing display, and the default should be 2600mm while still allowing 100-3000mm.
- Vertical slat jobs need the same custom-gap escape hatch as QSHS horizontal slat jobs.

Changes applied:
- Segment and gate cards now show `Run 1 Segment 1` / `Run 1 Gate 1` alongside compact labels such as `R1S1` / `R1G1`.
- The green reset-to-master check and blue confirmed dot moved into the left rail of each segment/gate card, leaving more room for the title and summary.
- Sidebar and mapper labels now use the same no-space compact codes.
- `Post spacing` wording changed to `Max Post Spacing` in summaries and segment options.
- Max post spacing now defaults to 2600mm and clamps to 100-3000mm across UI normalisation, mapper stats, local fallback BOM, suggested accessories, and seed constraints.
- VS vertical slat settings now support `Custom gap` as well as preset spacer gaps.
- Standard post labels now put dimensions first: `50mm Post Standard` and `65mm Post Standard HD`.

Verification:
- `npm run build` passed after these changes.

### May 7, 2026 - Brief AA economy slat pack enforcement

Catalogue finding:
- Economy 65mm slats (`XP-6500-E65-*`) are sold only in packs of 96 and use 6500mm stock length.
- Economy slats are 65mm only; 90mm economy is not a valid catalogue combination.

Changes applied:
- Local fallback BOM now aggregates required economy stock lengths by run before rounding to packs, so small sections in one run do not over-order separate packs.
- Economy slat BOM lines display as packs, show `pack of 96` in the table, and carry a `Sold in packs of 96 only` note.
- Waste above 50% adds a `Switch to Standard slats?` prompt and a BOM-row `Switch` button that updates affected economy sections to Standard and regenerates the BOM.
- The page blocks invalid 90mm economy payloads, including old saved jobs or imported payloads that bypass the normal product-option filtering.
- Pricing for economy packs is calculated from 96 ordered slat lengths per pack, while tier selection still uses the actual ordered length count.

Verification:
- `npm run build` passed after the changes.

### May 7, 2026 - Brief AD louvre bracket treatment

Catalogue/CSV finding:
- QuickScreen/Xpress louvre bracket packs (`QS-LB-*`) suit 65 x 16.5mm slats and include one left bracket, one right bracket, and screws.
- CSV quantity breaks are 1-41, 42-149, and 150+ with standard coated pricing at 4.43 / 4.11 / 3.67, mill at 3.40 / 3.17 / 2.90, and Paperbark/White at 4.26 / 3.95 / 3.53.

Changes applied:
- Added a QSHS-only louvre treatment toggle in section additional settings. It is usable only for 65mm slats and explains that louvres are 40-degree fixed-angle brackets.
- Local fallback BOM emits one `QS-LB-*` bracket pack per slat per panel when louvre treatment is on.
- Slat fixing screws are reduced for louvre sections because the bracket pack handles the slat-end fixing.
- Added local component metadata, pricing rules, and quantity breaks for QS-LB colour variants found in the CSV.

Verification:
- `npm run build` passed after the changes.

### May 8, 2026 - Glass Outlet branding pass

UI finding:
- The launch screen used plain text for The Glass Outlet, and the BOM panel only showed `Bill of Materials`, so the supplier brand did not carry through strongly enough.

Changes applied:
- Added a reusable `GlassOutletLogo` component that recreates the stacked glass-pane mark and wordmark as an SVG/text lockup using the app's `brand-primary` dark-blue token.
- Replaced the launch-screen plain heading with the dark-blue Glass Outlet logo lockup.
- Added the same Glass Outlet logo lockup to the BOM header beside the Bill of Materials label.

Verification:
- `npm run build` passed after adding the component and wiring it into the page.

### May 8, 2026 - Layout map and sidebar settings polish

UI finding:
- The active layout-map overlay was still using a fixed left offset, so it could drift over the run/sidebar column when the sidebar was resized.
- Section and gate controls had become too icon-heavy after the compacting pass; first-time users needed clearer labels without reopening the clutter.
- Louvre treatment belongs at run level for the normal workflow because it should usually apply to the whole run, not be discovered separately inside every section.

Changes applied:
- The active-job map button now lives beside the BOM action buttons and uses a more obvious 3D globe-style drawing CTA.
- The map header controls moved to the left and the overlay now starts after the actual sidebar width, preventing overlap.
- Section cards now show labelled `Section settings` / `Gate settings` buttons, with the remove X isolated on the right.
- Current settings now show `Panel width` rather than `Max Post Spacing`; the editable post spacing control is collapsed at the bottom of section settings.
- Section `Style overrides` was renamed to `Slats, colors, and spacings`.
- QSHS louvre treatment moved from section settings into run settings next to post-fixing material.
- Gate settings were split into separate collapsible controls for type, QSG gate system, direction, post, colour, slat size, slat gap, termination posts, and hardware. The duplicate gate-height field was removed from the gate details panel.

Verification:
- `npm run build` passed.
- Browser smoke test confirmed the map overlay no longer overlaps the sidebar, the renamed section settings appear, and the gate details no longer show `Gate basics`.

### May 10, 2026 - Repo-local specialist skill library

Process finding:
- The calculator specialist skills were useful but lived only in local user folders (`C:\Users\bbfen\.codex\skills` and `C:\Users\bbfen\.agents\skills`), so another developer or AI session working from the repository would not automatically have the same guidance.
- Follow-up: the first repo copy was placed under `.agents/skills/`, but the developer workflow was already checking `.claude/skills/`.

Changes applied:
- Added repo-local skill copies under `.agents/skills/`.
- Mirrored the same skill set into `.claude/skills/`, which is now the canonical repo location for Claude/Codex-compatible skill lookup.
- Updated `.gitignore` so all `.claude/skills/**` and `.agents/skills/**` files can be tracked.
- Included the Glass calculator project manager, UI designer, QA tester, catalogue extractor, QuickScreen BOM, and seed-mapper skills with their bundled reference files/scripts.
- Added skill README files explaining when to use each skill and how to keep the mirrored folders updated.
- Updated `docs/app-overview.md` so future contributors can find the project agent skills.

Verification:
- Scanned the copied skill folders for obvious secret patterns. The only hit was an instructional reference to an API header name, not a stored credential.

### May 10, 2026 - Opening screen job-name workflow

UX finding:
- The intro screen treated typing a job name as the first move and immediately opened the workspace. This made it hard to name a job before choosing when to start the calculator.

Changes applied:
- The intro screen now stays open while the user types the job name.
- The `Open workspace` button is the explicit action that opens the workspace, with the typed job name preserved in the sidebar/BOM job-name state.
- Removed the intro job-name label, changed the placeholder to `Name Your Job Here`, simplified the button text to `Open workspace`, and added a bottom `Save run settings` collapse button in the Run Settings dropdown.

Verification:
- `npm run build` passed after the changes.

### May 10, 2026 - Double swing gate clarification

Calculation finding:
- The local fallback gate BOM already had the right double-swing formula, but only when the movement value was exactly `double_swing`. Gate values coming from older UI/canvas paths could be `double-swing` or other aliases, which made the fallback treat the opening as a single gate.

Changes applied:
- Added shared gate movement normalization so `double`, `double-swing`, `double swing`, and `double_swing` all resolve to the same double-swing gate type.
- Added a shared leaf-geometry helper used by both the sidebar summary and the local BOM calculator.
- Locked the double-swing rule as two equal leaves in one opening: subtract one hinge clearance for each leaf plus one shared latch clearance, then split the remaining opening equally.
- Local fallback BOM notes now state the opening, per-leaf width, hinge gap, and shared latch gap so double-gate material lines are easier to audit.

Verification:
- `npm run build` passed after the changes.

### May 7, 2026 - Brief AE suggested accessory expansion

Catalogue/CSV finding:
- Accessory prompts were missing several installer add-ons that should be offered contextually but not auto-added to the BOM: gate handles, driver bits, post plugs, core-drill tooling, threadlocker, silicone, and core-drill epoxy.
- CSV pricing was found for the new accessories, including post plugs, driver bits, Diamond Revolution drill/bit SKUs, Soudal/Bostik chemical products, and substrate fixing kits.

Changes applied:
- Suggested accessories now show `LL-GH` once per gate, `DB-PH3` when QSG joiner blocks are in the BOM, and `DB-SQ3.4` when gate rail screws are in the BOM.
### May 10, 2026 - Brief AV Describe Your Fence v1

Workflow finding:
- The natural-language entry point should be deterministic for v1, with no external AI calls, so common prose can pre-fill the calculator while ambiguous or missing details remain visible to the user.
- The companion corpus (`describe-fence-test-corpus.md`) is the parser contract; TC-01 through TC-12 now run via `npm run test:describe-fence`.

Changes applied:
- Added `parseDescription()` in `src/lib/describeFenceParser.ts`, plus shared filler-word stripping and a small Web Speech API wrapper for dictation.
- Added `DescribeFenceBox`, `ParsePreviewCard`, and `GatePositionModal` under `src/components/calculator/`.
- Added the describe box to the opening screen as a fourth entry path and to the calculator sidebar as a collapsed "Describe more attributes" card.
- Parsed attributes apply to the canonical payload: system, length, height, slat size, gap, colour, mounting, terminations, corner hints, pending gates, and `job.description` metadata.
- Parsed gates appear as "Position not set" badges; confirming a gate position splits the run into a panel, gate opening, and panel.
- Job description metadata now appears in the BOM header and CSV export.

Verification:
- `npm run test:describe-fence` passed for TC-01 through TC-12.
- `npm run build` passed after the changes.
- Static source check found no `fetch`, Supabase, OpenAI, Anthropic, or API calls inside the parser/voice/describe components.

- Base-plated and core-drilled jobs now suggest nearest-colour post plugs in B / MN / W at one 4-pack per four posts.
- Base-plated jobs suggest `ULTRALOC-3242`; core-drilled jobs suggest `SOUD-EPOFIX`; every job suggests `FB-V60`.
- Larger core-drilled jobs with more than five posts now surface the Diamond Revolution drill kit and bit SKUs as optional suggestions only.
- Touch-up paint suggestions now also consider gate colours that differ from the run colour.
- Local fallback component metadata, quantity breaks, and pricing were added for the newly suggested SKUs and for the previously unpriced substrate/Soudafix items.

Verification:
- `npm run build` passed after the changes.

### May 7, 2026 - Brief AF BOM polish

Catalogue/audit finding:
- The BOM panel needed to better communicate the flat-pack delivery model, show catalogue-page context, expose carton buying hints, and provide installer video links without changing pricing logic.

Changes applied:
- Added a line-items / cut-list toggle to the BOM result tabs. The cut-list view groups stock into Pack 1 long lengths, Pack 2 slats, and Pack 3 hardware/accessories, using existing BOM notes to show cut lengths where available.
- Added `src/lib/cataloguePages.ts` so BOM SKUs show compact `p.N` catalogue chips. The chips currently provide page tooltips because no public hosted catalogue PDF URL has been locked in.
- Added `src/lib/cartonQuantities.ts` so BOM rows near a carton threshold show how many more units reach the carton quantity and the approximate saving when seeded tier pricing supports it.
- Added QR install-video cards using `qrcode.react`. They render in run headers and under the active BOM section for QSHS, VS, pedestrian gate, and sliding gate contexts.

Verification:
- `npm run build` passed after the changes.
- Real phone-camera QR scanning was not performed inside Codex; the generated QR SVGs contain the placeholder install URLs from the brief and are visible in the browser/print BOM surface.

### May 7, 2026 - Brief AC concrete, grout, and fixing-kit choices

Catalogue finding:
- Page 24 offers multiple concrete/grout choices rather than a single rapid-set suggestion.
- Base-plated posts need substrate-specific fixing kits: timber lag kit or concrete threaded rod kit.
- Soudafix chemical anchor and the matching gun are useful suggested accessories for concrete base plates, but should not be auto-added to every job.

Changes applied:
- Added run-level `Post-fixing material` and `Substrate` controls in Run Settings. Grout choice persists in local storage as the next-run default.
- Local fallback BOM now emits the selected concrete/grout SKU at 1.5 bags per concreted-in post.
- Base-plate mounting now emits `S-120ROD-4PK` for concrete substrate or `S-110LAG-4PK` for timber substrate at one pack per base-plated post.
- Suggested accessories now show `SOUD-CA1400` when base-plated to concrete. `SOUD-GUN` appears only after the chemical anchor is added.
- Added local component metadata for the five grout choices, both substrate fixing kits, and Soudafix items. Prices are intentionally left at zero until supplier pricing is verified.

Deferred:
- Perth depot warning is not wired yet because the current app has no depot preference field to test against.

Verification:
- `npm run build` passed after the changes.
- Source review confirmed the existing stock-length branch already uses 6500mm for economy and 6100mm for standard slats.

### May 10, 2026 - Brief AU gate-scoped BOM aggregation and optional accessories

Catalogue / workflow finding:
- The All BOM view needs to order one line per SKU for purchasing, but installers still need to inspect each run and each gate independently.
- The old raw `category` field is used by engine selectors, so changing it for nicer UI grouping would risk breaking component selection.
- TruClose safety caps (`TC-CAPS3`) belong near TruClose hinges, but they are optional and should not be auto-added.

Changes applied:
- Added BOM source breakdowns so each aggregated line records which run or gate contributed each quantity.
- The All BOM view groups matching SKUs into one row while run/gate tabs derive and re-price their quantities from the source breakdown.
- Added display taxonomy metadata (`metadata.bomCategory`, `subCategory`, `companionOf`, `sortPriority`) to seeded product components without changing the engine selector `category`.
- Added `src/lib/bomMetadata.ts` and a reusable annotation script at `scripts/annotate-bom-metadata.mjs`.
- Added inline optional add-ons under gate hardware. TruClose safety caps are now only emitted when the user selects them.
- Updated QuickScreen BOM and seed-mapper skill files in both `.claude/skills/` and `.agents/skills/` so future agents keep the same category and optional-accessory conventions.

Verification:
- `npm run build` passed after the changes.
- Local JSON schema validation passed for every file in `supabase/seeds/glass-outlet/products/`.
- `npm run seed:products` could not run because `.env.local` is missing `SUPABASE_SERVICE_ROLE_KEY`; the seed files validate locally but were not upserted into Supabase in this pass.

### May 7, 2026 - Brief AB 135-degree angle adapter

Catalogue finding:
- QuickScreen 135-degree angle adapters are 6000mm stock lengths and are required when a section turns through an obtuse 135-degree corner rather than a normal 90-degree post corner.
- The app already carried raw drawn geometry and had an older nearest-90/135 fallback, but it did not classify custom angles or add the adapter screw pack.

Changes applied:
- Added a shared corner classifier: 90 degrees within 2 degrees is `right`, 135 degrees within 5 degrees is `obtuse`, everything else is `custom`.
- Canvas-to-canonical conversion now stores detected corner type, measured angle, and corner degree metadata on the preceding section.
- Section settings now show a compact `Corners` editor when a corner exists, allowing the user to manually choose 90-degree, 135-degree adapter, or custom verification. Manual selections persist through live layout sync until the layout is reset.
- Local fallback BOM now emits one 135-degree adapter and one colour-matched `XP-SCREWS-*` pack per 135-degree corner, with the adapter cut note tied to run/section height.
- Custom angles emit a supplier-verification BOM line and warning instead of silently choosing the nearest standard corner.

Verification:
- `npm run build` passed after the changes.

### May 10, 2026 - Brief BA sidebar polish, map cleanup, and BOM print

Workflow finding:
- The post-AY entry/sidebar flow had the right structure but still felt cluttered: the job-name input behaved like a normal form field, the three entry cards did not match the prototype, destructive actions used inconsistent confirmation patterns, and the map/BOM print surfaces still showed unnecessary chrome.

Changes applied:
- Added a reusable `ConfirmButton` and wired it into Clear Map, Clear Job, Remove Run, and section remove actions so the first click enters a danger confirm state and outside click or timeout cancels.
- Added a reusable `JobNameEditor` so landing, sidebar, and BOM header share the same commit-on-Enter/Tab/blur and click-to-reedit behavior.
- Reworked entry cards with prototype-style number badges, custom draw/describe/select icons, hover motion, and a shared paper-card treatment.
- Defaulted new sections to 0m, removed the Match Run 1 control, collapsed run settings by default, and made section match state ignore structural post/corner differences.
- Cleaned the map by removing the satellite hint and dead Use This Layout button, increasing default canvas height by 20%, indenting section summaries under runs, and adding canvas-only run/section details to print output.
- Cleaned the BOM print header by showing job name and logo while hiding the top price and layout controls from print.

Verification:
- `npm run build` passed after the changes.
- Local HTTP smoke check returned 200 for `http://127.0.0.1:5173/fence-calculator`.

### May 11, 2026 - Brief BB calculator flow refinements and tactile fixes

Workflow finding:
- BA's sidebar and map polish made the workspace cleaner, but deploy-preview testing showed several tactile issues: gate diagrams needed clearer physical swing/slide communication, the describe-fence preview still treated unknowns as blockers, the map toggle could disappear while scrolling, install videos were too buried in run cards, and BA's whole-section drag mode did not match installer expectations.

Changes applied:
- Removed the parser `missing` confidence state. Every describe-fence attribute now receives a value from the BB defaults table, default chips are warning-highlighted, and a 0m run length is communicated as a footer note instead of a blocking chip.
- Restyled the parse preview to use the same compact bordered card language as the section settings panels.
- Moved install videos from run cards into a top-right header button beside the theme toggle, opening the existing QR-card video UI.
- Made the sidebar job/map header sticky and turned the map affordance into a persistent open/close toggle.
- Made landing-page job-name Enter/Tab/blur commit a non-empty name and open the workspace in one action while preserving normal rename behavior inside the calculator.
- Increased the default canvas height from 504px to 630px and replaced BA's translate-whole-section drag behavior with pivot-around-opposite-end endpoint dragging.
- Cleaned gate canvas visuals so single swing, double swing, and sliding gates render clearer direction-specific indicators.

Deferred:
- The brief requested PR screenshots and auto-merge after CI, but this sandbox pass was kept to commit/push for deploy-preview testing.

Verification:
- `npm run test:describe-fence` passed for TC-01 through TC-12.
- `npm run build` passed after rerunning with a longer timeout.
- Local HTTP smoke check returned 200 for `http://127.0.0.1:5173/fence-calculator`.

### May 11, 2026 - Brief BC unified calculator experience

Workflow finding:
- The post-BB workspace still treated map entry differently from select/describe entry because the map lived in a separate overlay. That made it too easy for map state to be remounted or hidden from the rest of the calculator workflow.
- The existing canonical payload already models gates as `gate_opening` segments for BOM scope, so a true nested `section.gates[]` migration would be risky without a matching engine/schema migration. The safe BC implementation stores section ownership on gate segments with `parent_section_id` while keeping the flat engine-compatible shape.

Changes applied:
- Added a persistent right-pane `Map` / `BOM` tab system. Draw entry opens Map; Describe and Select open BOM. Both views stay available after entry.
- Removed the schematic Plan tab from the right pane and made the existing BOM panel the peer view of the Map.
- Removed the old sticky/open map overlay from the sidebar. The map canvas now lives in the right pane and remains mounted while switching tabs, which keeps drawings intact through BOM generation.
- Added entry-method tracking to `CalculatorContext` for future analytics without using it to gate behaviour.
- Added section-owned gate UX: each section can show linked gate chips, edit a gate from the chip, two-click remove the gate, and add a gate from the section settings panel.
- Added a lightweight runtime migration that assigns legacy/unowned `gate_opening` segments to the preceding section when clear. Canvas-created gate openings now carry `parent_section_id` when a preceding panel exists.
- Added expanded map mode that fills the workspace to the right of the sidebar, hides the tab chrome while expanded, and exits with Escape or the map toolbar collapse button.
- Added installer-oriented run details below the map: each run lists defaults, lengths, panels, linked gates, and any section overrides. Clicking a run or section in that detail panel opens the matching item in the sidebar.
- Added shared map shortcut metadata, visible shortcut badges, an updated help sheet, keyboard switching for Draw/Gate/Move/Site/Text tools, zoom keys, and spacebar temporary pan.
- Existing posts and pillars are now rendered as grey site context markers so they read as non-product structures. BOM auto-adds for wall brackets/wrap saddles remain deferred until supplier SKUs and rules are confirmed.

Deferred:
- The brief asked for true `section.gates: Gate[]`; this pass intentionally preserved the flat canonical `gate_opening` model because the BOM engine, save shape, and canvas adapter already rely on it. `parent_section_id` gives the UI section ownership without breaking existing calculations.
- Existing structures can be drawn and marked on the map, but they are not yet converted into BOM-affecting hardware because the v3 seed data does not define verified SKUs/rules for wall brackets, pillar wrap saddles, or equivalent termination accessories.
- Side-by-side PR screenshots and auto-merge were not performed in this sandbox workflow; changes were committed for local/deploy-preview testing instead.

Verification:
- `npm run build` passed.
- Local HTTP smoke check returned 200 for `http://127.0.0.1:5173/fence-calculator`.

### May 12, 2026 - Brief BC reversal completion

Workflow finding:
- The later BC brief reversed three pieces of the earlier BC implementation: the AY three-card entry flow needed to be removed, expanded map needed to cover the sidebar too, and gates needed to be listed in a run-bottom group rather than inline under each section.

Changes applied:
- Deleted `EntryChoiceCard.tsx` and removed the sidebar Draw/Describe/Select card flow. Landing now creates an empty calculator payload and opens the BOM tab; the sidebar starts with the job name, then a compact `DescribeFenceBox`, then the run list/Add run controls.
- Kept Describe Your Fence as the same parser/preview/apply flow, but anchored it directly below the job name. The collapsed state now shows a chevron, text icon, and the first part of the last description.
- Changed map expanded mode from "right pane only" to a fixed full-viewport workspace. The sidebar, tabs, BOM panel, mobile nav, and run details are hidden while expanded; Escape or the high-contrast Minimize button returns to docked mode.
- Moved Add Gate into each section header next to the section code chip. Gates remain stored as flat `gate_opening` segments with `parent_section_id` for engine compatibility, but render in a `Gates` group at the bottom of each run.
- Removed inline gate chips under section cards. The bottom Gates group labels each gate by parent section, type, and width; clicking a chip opens the gate settings panel and the delete control uses the existing two-click confirm pattern.

Verification:
- `npm run test:describe-fence` passed all TC-01 through TC-12 parser corpus cases.
- `npm run build` passed.
- Local HTTP smoke check returned 200 for `http://127.0.0.1:5173/fence-calculator`.

Deferred:
- BC.7 BOM-affecting existing-structure rules remain deferred until verified Glass Outlet SKUs/rules are seeded for wall brackets, pillar/post terminations, and related fasteners.
- The brief's true `section.gates[]` data-shape checkbox remains intentionally implemented as `gate_opening` plus `parent_section_id`; this keeps the current v3 BOM engine/save/canvas adapter contract intact while delivering section-owned UI behavior.

### May 12, 2026 - Brief BD gate experience polish

Catalogue / workflow finding:
- Installers need a quick way to connect the QSG gate settings diagram to the BOM lines, especially because a finished double swing gate is two leaves inside one gate opening rather than a single oversized leaf.
- The existing local fallback had enough QSG pedestrian and sliding gate components to calculate the line items, but the UI did not explain which catalogue component each row represented.

Changes applied:
- Added `GateComponentDiagram.tsx` plus horizontal and vertical SVG assets as QSG component diagrams with twelve numbered callouts: side frame, rail, slat, infill, screw cover, joiner block, spacers, rail screws, wafer screws, top cap, hinges, and latch.
- Added `src/lib/gateDiagramMapping.ts` and `src/lib/gateDiagramHover.ts` so gate BOM rows can show numbered badges and cross-highlight against the diagram.
- Mirrored the same diagram numbers into `supabase/seeds/glass-outlet/products/qs_gate.json` component metadata so future backend/seed work has the same mapping.
- Extended the canonical gate-opening segment shape with `leaves: [{ widthMm }]`. Single swing stores one finished leaf; double swing stores two leaves after hinge/latch clearances; sliding uses the opening width.
- Added a double-gate leaf editor in gate settings. Editing one leaf width automatically adjusts the other, keeps the total equal to the clear opening, and shows a soft warning when a leaf is under 800mm.
- Updated the local fallback BOM so swing-gate frame/slat/rail quantities are calculated across all leaves while keeping one latch and defaulting double gates to one drop bolt. Canvas double-gate arcs now render from the leaf widths when available.

Verification:
- `npm run build` passed.
- `npm run test:describe-fence` passed for TC-01 through TC-12.
- Local HTTP smoke check returned 200 for `http://127.0.0.1:5173/fence-calculator`.

### May 12, 2026 - Brief BD hinge and tier-label correction

Workflow / calculation finding:
- The user clarified that hinge quantity is uniform: every swing gate leaf uses exactly two hinges. There is no heavy-gate or tall-gate exception in this calculator.
- The BOM row still displayed per-line pricing tier labels, which exposed the internal quantity-break tier mechanism instead of just showing the applied price.

Changes applied:
- Updated the local QSG swing-gate fallback so selected hinge hardware emits `leafCount * 2` units. Single swing therefore emits 2 hinges and double swing emits 4 hinges.
- Updated the QS_GATE seed companion metadata to add `leaf_count` and emit selected hinge hardware with `leaf_count * 2`; the older single `qty_hinge_latch` component rule is disabled to avoid variable hinge-count ambiguity.
- Removed visible per-line Tier 1 / Tier 2 / Tier 3 chips from `BOMResultTabs`. Unpriced rows still show `Price not set`, and quantity-break hints now say the user is close to a lower unit price without naming an internal tier.

Verification:
- `npm run build` passed.
- `npm run test:describe-fence` passed for TC-01 through TC-12.
- Local HTTP smoke check returned 200 for `http://127.0.0.1:5173/fence-calculator`.

### May 13, 2026 - Brief BE sandbox consolidation

Workflow / calculation finding:
- The BB/BD gate workflow correctly modelled double swing gates as two leaves, but the width validator still used a single pedestrian maximum in places and could block a valid double gate opening.
- Several entry/default surfaces still carried the older 5mm gap default even though the current testing baseline expects 9mm gaps and 1800mm height.

Changes applied:
- Gate width validation now accepts single swing gates up to 2100mm, double swing gates up to a 4200mm opening (2100mm per leaf), and sliding gates on their existing sliding limits.
- Switching a 900mm single swing gate to double swing now changes the opening to 1800mm and splits the clear opening into two leaves. Switching back to single uses the current two leaf widths as the new single opening basis.
- Updated product option defaults, local fallback defaults, and Glass Outlet seed JSON defaults so new QSHS, VS, XPL, BAYG, and QS_GATE setups start with 9mm gaps and 1800mm heights.
- Increased the docked layout canvas height from 630px to 788px, removed the visible `Powered by SkyBrookAI` header subtitle, simplified run-card summary clutter, and made the BOM header summary use full system and gate wording.

Verification notes:
- The gate settings panel currently has one visible height selector in the main section/gate geometry area; `GateSegmentDetails` does not render a second height dropdown.
- Earlier BB items verified in source: gates still render in the run-bottom Gates group, expanded map mode covers the whole viewport, BOM tier labels remain hidden, and QSG hinge quantity remains two hinges per leaf.

### May 13, 2026 - Brief BF post-BE polish

Workflow / UX finding:
- The Describe Your Fence preview step added friction for deterministic parsing. Users can get to the right outcome faster if parsing writes directly to the calculator and opens the map with the generated layout visible.
- Split gate openings still need BOM-accurate left/right panel sections, but the map should see the original straight fence line so the gate can sit visually in the centre instead of being drawn on the end of a split panel.

Changes applied:
- `DescribeFenceBox` now validates for usable parser output, applies directly, keeps the description text visible for re-parsing, and shows a small inline message for empty or unusable descriptions. The preview card no longer renders in this path.
- `CalculatorV3Page` now normalises parsed variables through the product option rules, so parsed heights snap to the nearest catalogue height. Parsed gates create gate-opening segments immediately, with double gates split into two leaves after hinge/latch clearance.
- Parsed gate layouts now add canvas-only geometry metadata: BOM sections remain split around the gate, while the canvas reconstructs one straight source section and centers the gate on that section.
- Committed job names render at the larger read-only size with truncation, including the BOM header.
- The first Add run button now uses the primary-brand background/ring treatment.
- Run-bottom gates now render as full gate cards using the section-card pattern: R1G1/R1G2 code chips, inline gate type/opening/direction/hinge side/hardware summaries, Gate settings expander, and the same two-click remove affordance.

Verification:
- `npm run test:describe-fence` passed for TC-01 through TC-12.
- `npm run build` passed.
- Playwright/Chrome smoke test passed at `http://127.0.0.1:5175/fence-calculator`: entered a job name, opened Describe Your Fence, parsed a 30m fence with a 900mm single gate, saw the direct-apply message, canvas present, and R1G1 gate inline settings visible.
