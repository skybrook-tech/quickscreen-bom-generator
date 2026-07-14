# QuickScreen BOM Generator — Task Tracker

## Current Phase

> **Phase 7 (v1 polish)** complete — v1 code removed. **v4 route removed.**
> The live calculator is the **static engine** (`bom-calculator-static` + `get-calculator-config`). The fully data-driven `bom-calculator` engine is **retired** — code deleted, DB rule tables dropped (2026-07 migration compaction; single squashed init migration `20260706000000_init.sql`) — see [`docs/_deprecated/data-driven-approach/`](./_deprecated/data-driven-approach/) and [`docs/vendor-model-plan.md`](./vendor-model-plan.md).
> Start here for the live architecture: [`docs/configurable-static-calculator-plan.md`](./configurable-static-calculator-plan.md) and [`AGENTS.md`](../AGENTS.md).
> In progress: retiring `src/lib/productOptionRules.ts` (legacy client-side per-product branching) in favour of the resolved config + `useRunReconciliation`. First cut done (v4 removed, dead exports/gapChoices string path removed, `clampPostSpacing` → `postSpacing.ts`); deferred: the normaliser core (`normaliseVariablesForSystem`/`initialVariablesForSystem` in `calculatorV3Helpers` + product-switch paths).

Latest migrations → timestamp naming (2026-07-09): switched `supabase/migrations/` from sequential `001_/002_` to the Supabase CLI default `YYYYMMDDHHMMSS_name.sql` (`001_init.sql` → `20260706000000_init.sql`, `002_timber_paling_system_type.sql` → `20260708000000_timber_paling_system_type.sql`; timestamps track the real squash/commit dates). Avoids the `003_` collision two branches hit adding "the next" migration, and matches `supabase migration new`. Local `db reset` replays the renamed files unchanged (14-digit prefixes sort lexicographically). Doc refs updated (AGENTS.md §3/§5/§11a, both migration headers, `product_components.schema.json` comment, tasks.md current-phase). **Remote requires a one-time history repair** because Supabase tracks applied migrations by the filename version prefix: the remote's `schema_migrations` row is `001`, so after the rename you must `supabase migration repair --status reverted 001 --linked` + `--status applied 20260706000000 --linked` (repoints init, no SQL re-run), then `supabase db push` applies the still-missing timber migration (`20260708000000…`). Verify with `supabase migration list --linked`. (The remote was also missing the timber migration independently — it had only the init applied.)

Org rows from org.json + logo recolor (2026-07-09, follow-up on org-driven logos): **(1) `organizations.sql` retired → per-org `org.json` + `seed:orgs`.** The SQL seed was the wrong mechanism: it only ran on local `db reset` (`config.toml [db.seed]`), so remote onboarding needed a manual `psql`, and its `ON CONFLICT DO UPDATE SET branding` clobbered live branding on every re-apply. Replaced with `supabase/seeds/<slug>/org.json` (name, slug, branding incl. cssVars) as the single source of org identity, loaded by shared `tools/orgs.js` (slug↔dir validation) and upserted by new `tools/seed-orgs.js` — a service-role upsert that works identically local + remote (no psql) and **never overwrites live branding without `--force`** (insert-if-missing default, mirroring the products `managed_by` no-clobber ethos). `seed-auth.js` now sources the org list from `org.json` (`loadOrgDefs`) and keeps only the dev login fixtures (`USERS_BY_SLUG`). `config.toml [db.seed]` disabled; `organizations.sql` deleted. `db:reset` reordered to `seed:orgs → seed:products → seed:org-logos → seed:auth`; `db:seed-remote` now chains push + all four `:remote` seeders in order (remote onboarding is one command, no manual SQL). Docs updated (README layout/commands/onboarding, AGENTS.md §3/§5, 001_init.sql header comment). **(2) GO logo recolored to brand blue.** The seeded GO logo was a white wordmark (faint on light bg); retinted its RGB to `#1e40af` (`--brand-primary`) preserving the alpha mask (via a dependency-free node zlib PNG decode/recolor/encode). Also added **content-hash cache-busting** to `seed-org-logos.js` — `logo_url` now carries `?v=<sha1[:10]>` so a re-seeded logo always busts stale browser/CDN cache while staying cached between identical seeds. Files: `seeds/glass-outlet/org.json` + `seeds/amazing-fencing/org.json` (new), `tools/orgs.js` + `tools/seed-orgs.js` (new), `seed-auth.js`, `package.json`, `config.toml`, `organizations.sql` (deleted), `tools/seed-org-logos.js` (cache-bust), `glass-outlet/assets/logo.png` (recolored), README/AGENTS/001_init.sql (doc refs).

Org-driven logos (2026-07-09, follow-up on the cosmetic branding gap flagged below): **Logos are now data/config driven per org.** The tenant-branding plumbing was half-built — `ProfileContext` already fetched each org's `branding` jsonb into `tenantTheme`, and `Header`/`AppShell` already had `branding`/`brandLogoSrc` props — but nothing consumed any of it, so the hardcoded `GlassOutletLogo` SVG appeared for every org (incl. AF). Fix: each org's logo is an **image URL** in the existing `organisations.logo_url` column, surfaced via `useProfile()` (`orgName`, `logoUrl` — query now selects `organisations(name, logo_url, branding)`), rendered by a new context-aware `src/components/brand/BrandLogo.tsx` that shows the `<img>` when set and otherwise a themed **initials badge** from the org name (`orgInitials()` in `tenantThemes.ts`; "The Glass Outlet"→GO, "Amazing Fencing"→AF). `GlassOutletLogo.tsx` deleted; its 3 call sites (`ProductCatalog`, `CalculatorIntro`, `CalculatorBomPane`) now use `<BrandLogo size=…>`. `Header` reads `useProfile()` directly (props still override) so every page/AppShell is org-branded without threading props; the hardcoded "The Glass Outlet" text fallback is gone. `LoginPage` drops the tenant line (pre-login has no org → neutral SkybrookAI platform brand). PDF export (`BomV3PDFTemplate` + `BOMExportActions`) is org-driven too — org name replaces "The Glass Outlet" in header+footer and the logo renders as a react-pdf `<Image>` when set (GO logo converted webp→PNG since react-pdf can't do SVG/webp). Print CSS (`index.css`) generalised from the old SVG-rect rules to `img[data-print-logo]` + the badge. **Seeding:** new org-agnostic `tools/seed-org-logos.js` owns `logo_url` — uploads each org's `seeds/<slug>/assets/logo.<ext>` to `product-images` under org-prefixed key `logos/<slug>.<ext>` (no cross-org collision), sets `logo_url`; orgs with no asset → null → initials badge. Wired into `db:reset` (+ `db:seed-remote`); the GO-only `seed-images.js` no longer touches `logo_url`. GO seeds a real logo; AF intentionally has none (renders "AF"). `README.md` onboarding gained a logo step; **out of scope**: per-org accent colours (`tenantTheme.cssVars` remains fetched-but-unapplied). Files: `BrandLogo.tsx` (new), `seed-org-logos.js` (new), `ProfileContext.tsx`, `tenantThemes.ts`, `Header.tsx`, `LoginPage.tsx`, `ProductCatalog/CalculatorIntro/CalculatorBomPane.tsx`, `BomV3PDFTemplate.tsx`, `BOMExportActions.tsx`, `index.css`, `package.json`, `seeds/README.md`, `glass-outlet/seed-images.js` (logo block removed), `glass-outlet/assets/logo.png` (new).

Cross-org leak fix + reset-free onboarding (2026-07-08, follow-up on the AF branch): **(1) Cross-org product leak fixed.** Signed into amazing-fencing, the picker showed Glass Outlet products. Server-side RLS verified correct (REST as AF admin returns only CB_GATE/COLORBOND/TIMBER_PALING; anon 401s) — the leak was pure client: (a) the TanStack cache is keyed user-agnostically (`['products']`, staleTime 5min) and was never cleared on sign-in/sign-out, so a prior GO session's list survived into an AF session; (b) `useProducts`/`useProductSearch` silently fell back to the **Glass Outlet build-time fixtures** (`localSeedData.ts`) on error/empty/no-session — an auth race at login showed GO's catalogue to any org and cached it. Fixes: `queryClient.ts` subscribes to `onAuthStateChange` and clears the whole cache whenever the user id changes (incl. sign-out, not token refreshes); local fixtures now only serve when `!isSupabaseConfigured` (offline dev) — with a live backend, errors throw (React Query error state) and empty is truthful; `ProductCatalog` gained explicit loading/error/empty-catalogue states; `RunListV3`/`ProductCatalog` dead `?? localFenceProducts` fallbacks removed. Verified in a real browser (headless Chrome via CDP; the Cypress binary won't start on this macOS build): GO login shows QSHS/VS/XPL/BAYG/COLORBOND, sign out → AF login in the SAME session shows only COLORBOND/TIMBER_PALING. A Cypress regression spec covering the flow is committed at `cypress/e2e/multi_org_product_catalog.cy.js` (runnable where the Cypress binary works, e.g. CI). Known cosmetic follow-up: `ProductCatalog` hardcodes the Glass Outlet logo for every org — per-org branding on the catalogue page is still pending. **(2) Reset-free tenant onboarding + data ownership.** `seed-products.js` gained `--org <slug>` (seed exactly one org — onboarding never touches other orgs' rows) and a **managed_by ownership guard**: every seeded component is stamped `metadata.managed_by:"seed"`; any future in-app price/SKU editing surface must flip edited rows to `"ui"`; the seeder refuses (loudly, listing SKUs) to overwrite ui-managed components or their pricing_rules (ownership is per-SKU — pricing_rules has no metadata column) unless `--force` reclaims them. Verified live: simulated a ui edit ($99.99 + managed_by=ui) → scoped seed run failed listing the SKU and preserved the price → `--force` overwrote + reclaimed. New `supabase/seeds/README.md` documents the layout, the no-reset onboarding steps (psql organizations.sql → org seed dir → `seed:products -- --org` → ORGS array + seed:auth), and the ownership model; AGENTS.md §3/§16 updated. Note: `organizations.sql` still clobbers live branding on re-apply (documented), and a per-org `seed:dump` export is the planned reverse-sync once supplier self-service editing ships.

Latest Amazing Fencing tenant onboarding (2026-07-08): second tenant org (`amazing-fencing`) seeded end-to-end on branch `amazing-fencing-onboarding` — the first real multi-org exercise of the platform. **Seed layer generalised**: `seed-products.js` discovers `supabase/seeds/<org-slug>/products/` dirs (org_slug cross-checked against the dir name, throws on mismatch) and gained a `calculator_configs` section that upserts per-org overlay rows into `supplier_product_calculator_configs` with a top-level `CalculatorConfig` key allowlist; `seed-auth.js` rewritten around an ORGS array and **fixed the org-binding bug** (the signup trigger reads `raw_user_meta_data`/user_metadata, not app_metadata — previously every seeded user landed in glass-outlet via the default branch; now verified per-profile, fail-loud). **AF Colorbond** rides the existing `COLORBOND` calculator via an org overlay (heights 1200–2400 options mode, 2360/3100 bays at 3 sheets, C-post terminals, full SKU-map override) plus typed `ColorbondConfig` knobs: `capRule` (`single_double` GO default | `half_posts` = ceil(posts/2) AF), `cutDownNoteByFinished`, `terminalPostNote` + `{postHeight}` token on the terminal template — components seeded UNPRICED (default_price 0, no pricing_rules) pending AF's price list. **Colorbond gates shipped for both orgs** (was `supported: false` despite the GO catalogue p7/p17 gate kit): typed `ColorbondConfig.gates` with `kit` mode (GO: stile 2-pack + 2× CB-GATE-R-830 + infill sheet + tek pack per leaf, hinges/latch from new `CB_GATE` fields product) and `bundle` mode (AF: pre-built `AF-CBD-GATE-STD-SGL/DBL-{width}` snapped to nearest width + movement-keyed hardware kits); engine gate scope productCode now honours `gateRules.gateProductCode`. **TIMBER_PALING family** (new strategy + `calculators/timber-paling.ts`, migration `002` extends `chk_system_types_values`, seed schema enum matched): butted (27 palings/2.4m bay incl. wastage) + lapped-and-capped (19+19 layers, per-layer 45/57mm nail rules, 0.5 capping lengths/bay), pine/hardwood with species-keyed post stock (cut-down notes) and species-conditional concrete, rails-by-height ladder, flat-ground v1 (stepping deferred) — AF's parameters ARE the base config, seeded with real tier1/2/3 prices from the supplier doc (`catalogues/amazing-fencing/`). **Fail-loud posture throughout**: `config/af_overlay_test.ts` parity guards merge the REAL seed overlays over base configs and assert every emittable SKU (heights × bays × gates; timber style × species × height) exists in the seed catalogue — the silent-$0 failure class is now a red test. Verified: 95 unit tests green (S18 colorbond-gate + S19 priced-timber snapshots additive, existing snapshots byte-identical), `npm run build` green, integration suite extended to 7 (DB-I05 AF overlay path, DB-I06 timber, DB-I07 AF SKU resolution) all green against the seeded stack, both orgs' users land in the right org on `db:reset`. Docs: vendor-model-plan § 7 status note (AF = tenant org via ORG overlay; `suppliers` table still unbuilt; § 3 price-freeze still open — saved AF quotes will silently reprice from $0 once prices arrive), AGENTS.md § 11a registration checklist updated. Open questions: AF terminal-post product TBC (v1 assumes C-posts), gate bundle width×height matrix TBC (bundles carry width only), AF fixing-screw quantities not auto-calculated (loud warning + typeahead extras instead), AF images deferred (storage keys need org-prefixing first — see seed-images.js warning).

Latest CI rework + DB integration tests (2026-07-07): `ci.yml`'s dead `integration` job (scaffolding with the test step pointing at the deleted `npm run test:integration`) is replaced by three jobs: **build** (unchanged), **engine-tests** (the 65-test Deno suite via `setup-deno`, no Supabase — it prices from fixtures), and **db-integration** (supabase start → `db:reset` → new `integration_db_test.ts`). The new test file (4 tests, `DB-I01…04`, gated on `RUN_DB_TESTS=1`, new `npm run test:integration`) imports the edge function's own loaders + engine directly — no HTTP/auth layer — against the seeded DB and asserts **components only** (sorted sku+qty pairs hardcoded from verified output for QSHS 10m and COLORBOND 3-bay; prices deliberately ignored so price edits never break it), plus pagination (>1000 components loaded — the exact PostgREST-truncation class that previously shipped $0 BOMs) and every-emitted-SKU-resolves-in-catalogue. Enabling this required extracting `loadAllPages`/`loadDbComponents`/`loadDbPricing` from `index.ts` into `supabase/functions/bom-calculator-static/db.ts` (pure move; `deno check` green, HTTP re-smoke identical: 10 lines / 0 unpriced / $2,550.57). Verified: unit suite 65 passed + 4 ignored (gate works), integration 4/4 green in 44ms against the local stack. AGENTS.md § 14 documents the new command.

Latest migration compaction (2026-07-06): the 32-migration history is **squashed into a single `supabase/migrations/001_init.sql`** and every remaining data-driven-engine artifact is gone. Method: `supabase db dump --local` at head 032 after `DROP`ping the 9 dead rule tables + `colour_options` + the `rule_stage` enum, then two hand-appended blocks pg_dump can't capture — the `on_auth_user_created` trigger (lives on `auth.users`, outside the dumped schema) and an **ACL normalisation** block (Supabase's `ALTER DEFAULT PRIVILEGES` re-grants ALL to `anon`/`authenticated` on re-created tables and pg_dump emits no REVOKEs — without the block the no-RLS pricing tables would have been readable-by-default; caught by before/after schema diff). Deleted alongside: seeder dead-table upserts (`seed-products.js` now seeds only `products`/`product_components`/`pricing_rules`; floors updated), 9 dead seed schemas + `product-file.schema.json` trimmed, dead sections stripped from all `products/*.json` (~100KB), `dump-to-json.js` + `seed:dump` (stale rule-engine tooling), `colour-options.json`, orphaned `seeds/glass-outlet/tests/` fixtures, both `.disabled` files, and the admin rule-browser UI (`useProductEngineData`, `EngineTable`, `ColoursAdminPage` + `useColourOptions` + dead `ColourSelect`, `/admin/colours` route; `ProductDetailPage` reduced to the live components view, `useAdminProducts` no longer joins dead count tables). Migration 028 (brief-AT price data) dropped outright after verifying all 181 SKUs + qty-break rules are already covered by `price_catalogue.json`. **Verified from zero**: `db reset` + seeds green (7 products / 2,788 components / 18,462 pricing rules; admin promotion proves signup trigger), rebuilt schema **byte-identical** to the pre-squash dump, 65 Deno tests green, `npm run build` green, live edge smoke green (QSHS 10m + Colorbond 3-bay: 18 lines, 0 unpriced, $3,177.69 inc GST), anon REST on `pricing_rules`/`product_components` → permission denied. Remote (`jpvjwbovowqcyecwkhyw`) reset + `001_init.sql` applied + full reseed (user-approved wipe; same floors met) + admin promoted; remote edge functions **redeployed from local** (the deploy pipeline is failing on a stale `SUPABASE_ACCESS_TOKEN` secret — needs re-minting at supabase.com/dashboard/account/tokens + `gh secret set`), which also fixed the remote's stale pre-pagination function build (was silently returning 7/10 unpriced lines); post-deploy remote smoke matches local exactly (18 lines, 0 unpriced, $3,177.69). AGENTS.md §5 rewritten table-oriented with the default-privileges/auth-trigger gotchas; `_deprecated` README updated (tables now dropped).

Latest architecture direction — vendor model, price freezing, timber (2026-07-06): full static-vs-data-driven re-examination with the rollback history on the table, written up as **[`docs/vendor-model-plan.md`](./vendor-model-plan.md)** (agreed direction, nothing implemented yet). Decisions: rules engine stays retired; **one-engine rule** (every extension plugs into `bom-calculator-static` via registry/config/DB-override seams — no parallel paths, ever); new **supplier-as-role** dimension (`suppliers` table within the org, Glass Outlet as the `is_self` row since it manufactures QuickScreen but merely supplies Colorbond; `supplier_id` on `product_components` + `supplier_product_calculator_configs`; config = base ⊕ org patch ⊕ supplier patch; vendor picker only for multi-supplier systems); **frozen `quote_lines` + explicit reprice** (current silent reprice-on-first-edit of saved quotes treated as a bug; versioned price books deferred as YAGNI); **three variance axes** (quote-time options = fields.json, installer build method = org overlay, vendor catalogue = supplier rows) with timber fencing as the worked example (one skeleton calculator + `TimberConfig`, installer differences as org overlays — NOT per-installer code; stepping/sloped-ground promoted to timber v1, currently zero slope handling repo-wide). Also logged for paydown: shared-post defects (inter-segment junction undercount; synthetic-run boundary double-count at mixed-product splits), legacy product-code touchpoints (`fence.schema.ts` enum, `FenceConfigContext` XPL branch, `systemLabel`, describe-parser lists), the `chk_system_types_values` migration requirement missing from AGENTS.md § 11a, and `postSpacing.ts` ignoring `config.panelRules` bounds. Implementation order in the plan doc § 7 (guardrails → frozen lines → supplier dimension → onboarding surface → paydown → timber). **Validated against real vendor data** (plan § 4a): Amazing Fencing's Colorbond + timber-paling docs map onto the model — AF Colorbond = supplier overlay on the one `COLORBOND` code (bay widths, 5-height ladder, colour-less SKU templates, cut-down stock idiom) plus one typed `capRule` knob (`ceil(posts/2)` vs per-join/per-end — first real vendor math divergence, absorbed per escape-hatch discipline); one genuine plan addition: a small typed `catalogue_gate` strategy for pre-built gate bundles (AF sells gates by width, unlike fabricated `QS_GATE`); `TimberConfig` requirements confirmed + refined (per-layer lapped fixings, species-conditional concrete companions, explicit wastage factor).

Latest AGENTS.md accuracy audit: fixed actively-misleading guidance — § 4 rewritten to point at the LIVE rule sources (`fields.json` cascades + `BASE_<CODE>_CONFIG` + server `normaliseVariables`) instead of the v1-era `fence.schema.ts`/`FenceConfigContext` (now explicitly flagged legacy); colours documented as **short codes with per-product sets** (long brand names demoted to label maps); § 15's seed-file bullet corrected (the seed JSONs' `products`/`product_components`/`pricing_rules` sections are LIVE — it previously said they feed the parked engine, contradicting § 3); § 14 test commands corrected (`npm run test:unit:static` via npx — global `deno` isn't installed; vitest/jsdom breakage documented so agents don't misattribute it); § 5 migration table extended to 032; § 3 component dir list refreshed; routes scope + § 5a calculator list gained COLORBOND. Added new **§ 6a "Runs, segments & mixed products"** capturing the undocumented state model (segment `variables.product_code` overrides, `expandSectionSystemOverrides` synthetic runs, run-only reconciliation scope, `patchSegmentVariables` merge-only semantics, redundant height storage + the options-mode `N:0` sentinel) and § 15 debugging/verification recipes ($0-line diagnosis chain, psql on 54322, verify-against-code-not-docs, verification bar per change type).

Latest section product-switch behaviour: when a **section**'s fence product is changed to **differ** from its run's product, the section now takes that product's **full defaults** (`configForProduct(allConfigs, code).normalisedVariables`) rather than inheriting run variables; when switched **back** to the run product, its variables are **emptied** so it inherits the run again. **Height and width are preserved** across the switch — width is the top-level `segmentWidthMm`, and height is snapped to the target product's nearest ladder entry (`nearestDerivedHeight(targetConfig.heightLadder.entries, …)`) so it stays a value the product actually offers (an out-of-ladder height would rebuild nonexistent SKUs → $0). This replaces the earlier colour-only snap in `FenceSegmentDetails.onSystemTypeChange` with a whole-variable-set rule (the branches build the segment directly and dispatch `UPSERT_SEGMENT`, since `patchSegmentVariables` only merges). Server-side `normaliseRunVariables` (below) stays as the safety net that also fixes run-level colour reads (Colorbond `terminalPost`/`sharkfin`). Verified: 65 Deno tests green (O05 unchanged), `npm run build` green.

Latest mixed-run Colorbond bug fixes (QSHS run + Colorbond section): two bugs fixed. **(1) Section height couldn't be changed on a Colorbond section.** Colorbond's height ladder is *options mode* — `config/heights.ts` synthesizes every entry with the `N:0` "not slat-derived" sentinel. On commit `updateDerivedHeight` writes the segment's `slat_count = entry.N = 0`, and on re-render `derivedHeightForSlatCount(entries, 0)` matched the *first* `N:0` entry (1500), snapping the display back regardless of the pick. Fixed with a one-line guard in `src/lib/heights.ts` (`n <= 0` → `undefined`), so options-mode ladders fall through to `nearestDerivedHeight(target_height_mm)`; fixes both call sites (`SegmentRow`, `InlineHeightEditor`). Slat ladders (N≥5) are unaffected. **(2) Colorbond BOM items priced $0.** A Colorbond section inherits `colour_code: "B"` (QSHS default) from the run; `"B"` is not a valid Colorbond colour (`MN/G/SM/BS/PB/P`), so the calculator built nonexistent SKUs (`CB-GLINE-1490-B`, `CB-RAIL-2365-B`, …) → whole section $0. **Not** a per-run load or missing-seed issue (loading is org-wide; 151 CB components / 501 prices are seeded). Fixed **server + client**: (a) `engine.ts` now normalises each run's effective variables against its config (`normaliseVariables`) before dispatch — snaps invalid inherited values to the product default (B→MN) and warns; product-agnostic safety net, idempotent for valid runs. (b) `FenceSegmentDetails.onSystemTypeChange` snaps the section's colour (+ post colour) to the target product's default when the inherited colour isn't in that product's colour set, keeping the picker + payload consistent. New engine test `O05` locks the colour-snap (asserts `CB-…-MN` SKUs + warning, no `-B`). Verified: 65 Deno tests green, `npm run build` green. (Client `npm test` still blocked by the pre-existing repo-wide jsdom `html-encoding-sniffer`/`@exodus/bytes` ESM interop — unrelated.)

Latest static-engine consolidation (5 workstreams): **(WS4)** deleted the dead data-driven engine — `supabase/functions/bom-calculator/`, `calculate-pricing/`, dead-only `_shared/{types,canonical.types,segmentTermination}.ts`, `scripts/compare-calculators.ts` + `test-integration.sh`, the zero-consumer `useProductVariables` client hook + `getLocalVariables`; `test:unit` is now static-only and deploy.yml ships 3 functions. DB rule-table compaction (migrations 011–014, seed dead sections, upserter floors, admin engine-editor UI) explicitly deferred. **(WS2)** the engine is **DB-only**: the synthetic catalogue moved verbatim to test-only `engine_test_fixtures.ts`; `makeDefaultCalcContext` is empty (no-ctx runs = correct SKUs/quantities at $0); engine_test builds an explicit fixture ctx so all price-bearing snapshots stayed **byte-identical**; new O01 locks the unpriced-offline contract. **(WS1)** the `CalculatorConfig` god type is split into a common core + optional `slat?: SlatConfig` / `colorbond?: ColorbondConfig` blocks (dead fields dropped: `colours.csrCap/post`, `strategy.gate`, `gateRules.heightMin/MaxMm`, unread slat `defaults`); `BASE_COLORBOND_CONFIG` is standalone with no slat blocks; quickscreen guards on `cfg.slat` (replacing the hardcoded SUPPORTED_PRODUCTS set); the client wire shape stays flat (`gapRules`/`heightLadder` synthesized) so zero client-component changes; client type drift fixed (`heightUi: "options"`, `colorbond_sheet`). Bonus: fixed the long-standing type errors in `engine-utils`/`merge.ts`/`index.ts` — the whole engine now passes `deno check`, and **`--no-check` was removed from the test scripts**. **(WS3)** `suggestAccessories` is slat-gated (no more XP-slat suggestions on Colorbond runs — new test), the `maxPanelWidthForSystem` hardcoded map is deleted (config `panelRules` is the source), and the economy-pack rule is config-driven (`slat.economySlatSkuPrefix` + the previously-unread `packSizes.economySlat`). **(WS5)** new `calculators/shared.ts` `applyExtraRules` typed extension hook (existing rule types + new `variable_warning`), wired into both calculators; Colorbond ships depot-availability warnings (GO-Line = Brisbane/GC, GO-Trim = Newcastle) — closing a catalogue-audit follow-up. **Bonus production bug found & fixed by the live smoke:** the edge loaders fetched components/pricing without pagination and PostgREST caps at 1000 rows — the live engine was silently pricing from a truncated catalogue (7/10 QSHS lines unpriced); `index.ts` now paginates (`loadAllPages`), and the full-catalogue smoke shows 0 unpriced lines (QSHS 10m $2,550.57; Colorbond 3-bay $503.61 incl. depot warning). Verified: 64 Deno tests green **with** type checking, snapshots byte-identical, client build green, seed pipeline green.

Latest Colorbond catalogue re-audit (full 32-page re-read of `catalogues/GO_colorbond_V2B_lowres.pdf` vs implementation): **fixed a channel-post undercount** — the p6 panel recipe specifies **2 channel posts per bay** (each bay's sheets slot into its own C-channel each side; interior joins are back-to-back pairs per the p14 two-way config; segment ends are one-way posts affixed to the 65×65 terminal, since rails can only terminate into a C-channel). The calculator previously emitted `bays − 1`. Now: `channelPostsPerBay: 2` (new `ColorbondConfig` field), double-sided caps per interior join + single-sided caps at segment ends (CB-POSTCAP-SGL now emitted), and concrete/sharkfin counted per **footing** (join pairs and terminal 65×65+channel share a footing/fin) — concrete quantities unchanged. Audit also confirmed: our 16 gap-filled sheet SKUs are all genuine order codes (p10/11/28 list the full 6-colour matrix incl. all GO-TRIM and the 1490-MN/G/SM codes missing from the price CSV — so `price_estimated` flags stay only for prices, not existence); `CB-TS-SM-15PK` is real (p28); post-height mapping and post-spacing (+10mm) match. Noted for later: depot-availability warnings (GO-LINE Bris/GC only, GO-TRIM Newcastle only), optional contrasting rail/post colour (Night Sky is rails/posts-only — a `post_colour_code`-style field), 65×65 terminals are "commonly used" (recommended) — currently always included, and bags-per-footing=1 remains an assumption. 8 colorbond tests updated + pass; 62-test static suite unchanged.

Latest product-catalogue landing + Colorbond seed consolidation: a new full-screen **product catalogue** is now the first thing a user sees on a new quote (`src/components/calculator-v3/ProductCatalog.tsx`, rendered at the top-level fork in `CalculatorV3Page` gated by `showCatalog = !quoteId && no runs`). It lists active fence products from the DB via `useFenceProducts()` as cards (name/description, `image_url` when present else a colour accent), disabled until `useAllCalculatorConfigs()` loads, with a "describe your fence" entry; picking a product seeds the run (`buildInitialFencePayload`, extracted from `RunListV3.createPayloadForSystem` into `src/lib/newQuotePayload.ts`) and drops into the workspace — users still mix-and-match per run/segment via the existing DB-driven `ProductSelector`. Dead `ProductSelectV3.tsx` removed; `CalculatorIntro` no longer wired. **Colorbond components consolidated** out of the shared `price_catalogue.json` into `colorbond.json` (134 `CB-*` components + 447 pricing_rules moved, retagged `system_types: ["COLORBOND"]`; shared `XPSG-2700-ST65`/`GROUT-CONCRETE` kept in the catalogue), plus 16 gap sheet SKUs filled (all GO-TRIM + `CB-GLINE-1490-MN` + `CB-GZAG-1490-{MN,G,SM}`; GO-TRIM prices estimated from GO-Line siblings and flagged `metadata.price_estimated`). Fence component `bomCategory` aligned to engine buckets (sheets→screening, etc.). Schema enum + new migration `032_allow_colorbond_system_type.sql` extend the `chk_system_types_values` constraint to allow `COLORBOND`. **Colorbond is now priced** (not $0) — real CSV prices seeded. Verified: `npm run build` green, 8 `colorbond_test.ts` pass, every calc-emittable SKU resolves + priced (0 gaps), `npm run seed:products` succeeds and DB shows 150 COLORBOND components / 501 pricing rows / COLORBOND active in the picker. Follow-up: GO-TRIM + 1490-MN prices are estimates — confirm with supplier; product images for QSHS/VS/XPL/BAYG still need `seed-images.js` mapping reconciled.

Latest Colorbond MVP: added a first non-slat product — **Colorbond steel fencing** (`COLORBOND`) — proving the static engine drops in a new *kind* of calculator. Bay-based BOM (posts + 2 rails/bay + 3–4 sheets/bay + tek packs + caps + mounting), discrete heights (1500/1800/2100), no gates (`gateRules.supported: false`), **unpriced** ($0 + "no price" note until a price list is seeded). New: `calculators/colorbond.ts` (registered in `calculators/registry.ts`), `config/products/colorbond/fields.json`, `BASE_COLORBOND_CONFIG` in `config/base.ts`. Additive type changes in `config/types.ts` (`strategy.fence += "colorbond_sheet"`, `heightUi.mode += "options"` + `heightOptions`, optional `colorbond?: ColorbondConfig` block) and `config/heights.ts` (`options` mode → discrete entries). `engine.ts` gains Colorbond synthetic components (price 0), category-map entries (`sheet`/`cap`/`fixing`), and a `COLORBOND` max-panel-width entry; `engine-utils.ts` `MAX_POST_SPACING_MM` raised 3000→3200 for the 3125mm bay. Client height UI generalised for non-slat products (`SegmentRow`/`InlineHeightEditor`: `heightInputsReady` no longer requires slat vars when discrete entries exist; labels drop "N slats" when `N=0`). Registered in `displayNames`/`systemDisplay` + a `products` seed row (`supabase/seeds/glass-outlet/products/colorbond.json`, imported into `localSeedData`). Verified: 8 new `colorbond_test.ts` cases + 62 existing static snapshots pass; `npm run build` green; `resolveUiConfig(COLORBOND)` returns clean discrete-height UI config. **Follow-ups:** seed a real Colorbond price list; confirm supplier open-questions (post-count at terminals/corners, concrete-per-post, GO-TRIM heights, `B`=Night-Sky-vs-Black); optional Colorbond gate + toppers + Alumawall. Live browser smoke pending (`npm run db:reset` to seed the product row + reload edge functions).

Latest v3 "remove job scope" pass: the v3 calculator no longer has a job scope — runs and segments are the sole source of truth. Each product's `jobFields.json` / `runFields.json` / `segmentFields.json` / `groups.json` are consolidated into a single `supabase/functions/bom-calculator-static/config/products/<code>/fields.json` shaped `{ "fields": FormFieldDef[], "fieldGroups": [...] }`. Every field carries `settings_for: ("run" | "segment")[]` (defaults to `["run","segment"]`) controlling which UI surface it renders on; former job+run fields map to `["run","segment"]`, former segment fields map to `["segment"]`. `CalculatorConfig.formFields` (the `{job,run,segment}` object) is replaced by a flat `fields: FormFieldDef[]`; `formGroups` is retained (mapped from the file's `fieldGroups`). `base.ts`, `resolve.ts` (`runVisibleFields`/`segmentVisibleFields` helpers), and `optionRules.ts` (`findField` scans `config.fields`; `defaultVariablesFromFields` seeds run-scope fields) updated. Frontend `UiCalculatorConfig.formFields` → `fields: SchemaField[]` with `settings_for`; `useCalculatorConfig` normalises the flat array and defaults `settings_for`; new `runFields`/`segmentFields`/`segmentOnlyFields` helpers in `runFieldOverrides.ts` replace the old buckets across `RunCardSettings`, `FenceSegmentDetails`, `GateSegmentDetails`, `SegmentRow`, `RunCard`, `useDefaultVariables`, `gapChoices`. v3 stops reading/writing `payload.variables`: read sites (`RunCard`, settings, `useRunReconciliation`, `useCalculatorBom`, `RunDetailsPanel`, `CalculatorContext` `UPSERT_SEGMENT`, canvas) now source from `run.variables`; factories (`createInitialPayload`/`createEmptyPayload`, `ProductSelectV3`, `RunListV3`, describe-fence, `quotePayload` reload, `canvasLayoutToCanonical`) seed full defaults onto `run.variables` and emit `payload.variables: {}`. `engine.ts` accessory touch-up paint colours now union colours from every `run.variables` (was a direct `payload.variables.colour_code` read). The shared `CanonicalPayload` type/schema still carries `variables` for v4 compatibility; v4 is untouched. `RunSectionGateUi.test.tsx` mock updated to flat `fields[]` with `settings_for`; stray `supabase.ts` debug edit reverted; temp `tmp_render_check.mjs` + `cfg.tmp.json` deleted. `npm run build` (tsc + vite) passes. Manual follow-up: restart local `get-calculator-config` and smoke-test QSHS/VS/XPL/BAYG + QS_GATE in `/fence-calculator`. (Note: the jsdom vitest runner remains broken repo-wide by a `html-encoding-sniffer@6`/`@exodus/bytes` ESM interop in `node_modules` — pre-existing, unrelated to this change.)

Latest v3 config-driven settings forms: `RunCardSettings`, `FenceSegmentDetails`, and `GateSegmentDetails` are now fully config-driven and unwrapped from accordion sections. Field definitions moved out of `config/forms/fence.ts` + `gate.ts` (deleted) into namespaced per-product JSON under `supabase/functions/bom-calculator-static/config/products/<code>/` (QSHS, VS, XPL, BAYG, QS_GATE), shaped like the v4 `jobFields.json` example with `{value,label}` static options and a `group` key. `FormFieldDef` gained `id` + `group`; `CalculatorConfig` gained `formGroups`; `base.ts` imports the JSON per product. `resolve.ts` now resolves segment fields too (QS_GATE `gate_build`/`opening_direction` options swap by `gate_movement` server-side; gate `colour_code` uses `colours.gate`; `slat_gap_mm` falls back to the segment field's own options for QS_GATE) and projects `formGroups`. New `src/components/calculator-v3/SchemaSettingsForm.tsx` renders a flat, group-headed, `sort_order`-driven form reusing the v3 `SchemaDrivenForm` renderer registry; a new `colour_palette_optional` renderer drives the alternate-post-colour reveal. `SettingsDisclosureRow.tsx` + `GateSettingsSection` removed; `RunSectionGateUi.test.tsx` updated to the flat group-heading structure. `npm run build` passes. (Note: the jsdom vitest runner is currently broken repo-wide by a `html-encoding-sniffer@6`/`@exodus/bytes` ESM interop in `node_modules` — affects the untouched `npm test` too, not this change.)

Latest v3 RunCard provider removal + segment product override restore: the `RunCardProvider`/`RunCardContext` centralisation has been reverted. Each `RunCard` subtree component now fetches its own variables-aware config via `useCalculatorConfig(productCode, variables)` (TanStack dedupes by query key), and the one genuinely central piece — the run-level cascade reconciliation effect — lives in a standalone `src/hooks/useRunReconciliation.ts` called once in `RunCardInner`. Segment-level product/system overrides are restored: segments may again carry `seg.variables.product_code` to use a different fence system than their run, with a "System type" selector re-added to `FenceSegmentDetails` (driven by `useFenceProducts()` + `localFenceProducts` fallback) and a "System: <code>" difference bit re-added to the `SegmentRow` collapsed header (`matchesMaster` now accounts for it). `InlineHeightEditor` takes its `config` as an explicit prop from `RunCardInner`. `npm run build` and `tsc` pass; acceptance grep for `RunCardProvider|useRunCardConfig|useRunConfig|useGateConfig` is clean.

Latest print BOM header pass: printed BOMs no longer show the mobile subtotal/GST/total strip at the top, the job name prints as a large bold heading, and the Glass Outlet three-square mark uses explicit print-safe styling.

Latest v3 RunCard folder refactor: the v3 run/segment UI is now grouped under `src/components/calculator-v3/RunCard/` mirroring the v4 folder convention. `RunCard` (shell), `RunCardSettings` (renamed from `RunSettingsEditor`), `SegmentRow` (collapsed header), and `SegmentRowSettings` (new — the expanded settings panel) are the four components; `InlineHeightEditor`, `FenceSegmentDetails`, `GateSegmentDetails` moved into the same folder, and shared summary helpers were extracted into `segmentSummary.tsx`. `RunListV3` and `RunSectionGateUi.test.tsx` import paths updated; `npm run build` passes.

Latest PWA install-banner cleanup: the `/fence-calculator` top bar no longer mounts the custom install-for-offline-access prompt or iPhone home-screen hint, and mobile QA now verifies those install banners stay absent.

Latest PWA install-banner cleanup: the `/fence-calculator` top bar no longer mounts the custom install-for-offline-access prompt or iPhone home-screen hint, and mobile QA now verifies those install banners stay absent.

Latest print BOM map-options merge fix: `codex/print-bom-map-options` is synced with current master, keeps the print dialog/map option and print BOM cleanup, and retains the BOM workings toggle plus PR #79 BOM-generation fixes.

Latest BOM readability pass: run/gate tab item counts now render as highlighted explicit item-count pills, and per-line source/workings text is controlled by the BOM workings toggle.

Latest infrastructure fix: duplicate Supabase migration version 029 was resolved by keeping the earlier profile-email migration at 029 and renaming the later quote property-anchor migration to 030.

Latest print BOM cleanup: printed BOMs now force the desktop line-item table, hide mobile card-only price-break/source details, remove the print-only run/section appendix, and pin explicit Glass Outlet logo print styling.

Latest gate assembly diagram pass: horizontal and vertical gate component checklists now show matching assembly images with orange numbered overlays, and checklist scroll/hover state stays synced with BOM row highlighting.

Latest print options pass: the BOM header no longer carries a persistent Include map checkbox; Print BOM now opens a print options dialog every time so the layout map can be included per print.

Latest point label cleanup: fence drawing no longer renders permanent A/B/C labels on placed points.

Latest QuickScreen post-colour UI pass: section Slats, colors, and spacings now keeps the alternate post colour button under Colour as the only section-level post-colour control.

Latest sidebar post-colour parity pass: run settings now places Alternate post colour directly under Colour in Slats, colors, and spacings; section settings mirrors the same run dropdown order and keeps post colour out of the posts dropdown.

Latest Brief 014 pass: the mobile Job tab now prioritises job/address/system/run controls, supports Web Speech API address dictation, adds numeric and decimal mobile keyboard hints, enlarges key touch targets, and keeps Save/Clear/Generate actions in a keyboard-aware sticky action bar.

Latest Brief 017 pass: the calculator now has production-only PWA registration, manifest/icons, install and offline banners, customer quote mode that hides costs, and a real-device mobile QA checklist.

Latest Brief 019 pass: the V3 calculator header now uses the Glass Outlet symbol with a live non-zero total, opens new mobile sessions on the Job tab, moves Clear Job plus offline-only status into the mobile hamburger menu, removes duplicate Generate controls, clears stale BOM totals when runs or sections are deleted, and deploys the bundled icon assets to `public/icons/`.

Latest Brief 020 pass: mobile canvas drawing now defers draw/gate taps until touch release, suppresses all placement and previews during multi-touch pinch gestures plus a cooldown, supports double-tap run finishing without adding a duplicate point, clears stale preview lines after point placement, and lets mobile users place gates before the gate editor opens.

Latest Brief 020 fix-up: real-device iPhone regressions were addressed by suppressing tap-start phantom previews, restoring 500ms long-press vertex dragging, and keeping Gate mode active after saving a placed gate.

Latest Brief 021 pass: the canvas toolbar now removes zoom buttons, labels Move/Edit clearly, exposes history-aware Undo/Redo plus a clear-confirmation modal, caps canvas history at 20 actions, uses a compact mobile layers sheet, and keeps the map underlay toggle working across desktop and mobile.

Latest Brief 021 iPhone fix-up: undo now clears stale canvas segment previews, the mobile layers sheet is constrained to 45dvh with internal scrolling, and map visibility changes are batched so the underlay hides on both desktop and mobile.

Latest Brief 029 pass: property map Static Maps captures now use hybrid label-decluttering style parameters, crop the Google attribution band from newly captured map snapshots before sending them to the canvas, and fall back to the uncropped URL if browser canvas/CORS restrictions block the crop.
Latest Brief 028 pass: canvas drawing now renders the first fence point immediately, keeps the viewport transform stable across point placement, opens the gate configuration dialog as soon as Gate is selected, places configured gates without a second dialog, and hides cursor hints after the first canvas action until Clear resets the map.

Latest sandbox polish: run sidebar readability, 0m first-segment defaults, compact length/height controls, and endpoint/corner gate placement are implemented on `codex/qshs-calculator-sandbox`.

Living app overview: [`docs/app-overview.md`](./app-overview.md) now tracks current routes, file responsibilities, data flow, mapper responsibilities, fallback engine behavior, Supabase seed structure, and update rules.

Latest brief queue pass: Brief 001 removes the pre-address confirm-location warning from the calculator entry flow and hides custom-angle warning chips in the V3 sidebar while leaving BOM calculation behavior unchanged.

Latest BOM workflow pass: generated BOM rows aggregate by product within each tab, individual gate tabs are labelled from the canonical gate segments, Generate BOM clears stale results before recalculating, and the mapper opens without the initial snap dot.

Latest Brief BP pass: on-screen and print BOM run summaries now use one compact run-details block, the line-item subtitle is simplified, section settings put Slat Range before Color, section-only post-size override controls are hidden, Generate BOM uses a fresh canonical payload snapshot, and run/settings disclosures keep the 60 second idle collapse behavior.

Latest sidebar pass: run cards now remove the redundant master-settings line, segment cards show compact order summaries with bold values, length/height editing moved into segment options, segment cards have a blue 3D border, segment confirm/remove controls were reduced to a blue dot and two-click red X, and the layout map button now opens/minimizes the map.

Latest calculation correction: VS F-section stock in the local fallback calculator now uses two height-cut side F-sections per panel, matching the QuickScreen vertical slat catalogue assembly.

Latest gate correction: QSG horizontal and vertical pedestrian swing gates now use the QSG side frame, normal QSG 65/90 gate rails, infill/channel infill, screw cover, joiner blocks, spacers, rail screws, wafer screws, and 50x50 top caps in the local fallback BOM. HD rails remain reserved for sliding-gate logic.

Latest workflow/UI correction: form-entered dimensions now center in the mapper when loaded, and gate hardware choices are dropdown selectors with inventory search inside each selector.

Latest segment clarity pass: segment and gate cards now show full beginner-friendly titles (`Run 1 Segment 1`, `Run 1 Gate 1`) alongside compact map codes (`R1S1`, `R1G1`) in bold black, the master-match check and confirmed dot sit in the left rail, max post spacing defaults to 2600mm with an editable 100-3000mm draft input, vertical slat runs can use custom gaps, and standard post labels now put the dimensions first.

Latest Codex PR brief pass: Tier 6 Brief AF is complete. The BOM now has a cut-list view, catalogue page chips, carton-proximity hints, and install-video QR cards in both run headers and BOM sections.

Latest double-gate correction: double swing gates now normalize legacy `double-swing` / `double` values to `double_swing`, calculate two equal gate leaves inside one opening, subtract hinge clearance on both leaves plus one shared latch gap, and multiply QSG gate frame/slat/rail/hinge materials by two leaves in the local fallback BOM.

Latest opening-screen workflow pass: typing in the intro job-name box no longer opens the workspace by itself; the Open workspace button now opens the workspace and carries the typed job name through to the quote UI. Intro copy was simplified, and Run Settings now has a bottom save/collapse button.

Latest agent-skill portability pass: the specialist calculator skills are now stored in the repo under `.agents/skills/` with an index README, so future developers and AI agents can access the same project-manager, UI, QA, catalogue-extraction, QuickScreen BOM, and seed-mapping guidance.

Latest skill-location fix: the same specialist skill set is now mirrored under `.claude/skills/`, and `.gitignore` now allows all `.claude/skills/**` and `.agents/skills/**` files so new project skills are pushed instead of staying local-only.

Latest Brief I pass: the `/calculator` BOM hero now uses an editorial summary layout with the scoped total as the main typographic element, BOM rows show the active quantity-break tier, and rows close to the next seeded quantity break show how many more units are needed for the next tier.

Latest Brief J pass: fence segment settings now use progressive disclosure. Geometry stays immediately visible, deeper Style/Posts/Advanced settings sit behind a persisted "Show more settings" control, keeping the initial segment editor compact.

Latest Brief K pass: selected controls on the `/calculator` sandbox now use a clearer brand-primary selected state, checkmarks, `aria-pressed`, 8px button radius, and stronger hover affordances for product, system, and option controls.

Latest Brief L pass: the calculator now has keyboard shortcut help (`?`), shortcuts for Generate BOM and CSV export, title tooltips on shortcut-enabled actions, BOM loading skeletons, a clearer empty state, and animated grand-total updates.

Latest Brief M pass: suggested accessories now support add/remove toggling, persistent hide/restore preferences with undo toast, and pinned catalogue suggestions via SKU/description search.

Latest Brief N pass: the app header now prioritises The Glass Outlet, the desktop run/BOM divider width persists locally, and mobile users get bottom Run/BOM/Map tabs so the BOM and layout map remain reachable on phones.

Latest Brief O pass: the layout canvas now renders against a device-pixel-ratio-aware backing store for sharper lines on laptops/retina screens, and gate placement/dragging can snap to 100mm increments from the existing canvas toolbar.

Latest Brief P pass: the map underlay now uses the Google Maps key path for Static Maps and Places autocomplete, auto-calibrates canvas scale from latitude/zoom when an address loads, shows calibration feedback, and keeps a satellite empty-state hint visible until an address is selected.

Latest Brief Q pass: canvas-to-canonical payloads now retain per-gate position, gate anchor, and source canvas segment metadata so multi-run layouts and gate markers survive save/load round-trips; applying a drawn layout now asks before replacing existing configured runs.

Latest Brief R pass: the canvas toolbar now includes Redo with Ctrl+Y/Ctrl+Shift+Z support, undone actions can be restored from full canvas snapshots, and placed gates now render differently for single swing, double swing, and sliding directions based on the gate editor settings.

Latest Brief S pass: the layout mapper now has a top-level Help button with a four-section cheat sheet, first-use Boundary mode guidance, hidden corner instruction clutter, a clarified px/m scale control, and token-aligned primary mapper actions.

Latest installer-map workflow pass: user-facing segment copy is now section copy in the active V3 workspace, run settings are directly editable at the run level, section codes show green when matching run settings, typed section length edits take priority when redrawing the map, gate placement asks for width/type before dropping with a width preview, and the canvas toolbar can print an installer-ready map.

Latest Brief T pass: swing gates now show a live estimated gate weight, rank catalogue hinges by fit/tight/fail against the required rating, guide latch selection with white-finish handling, expose the four active drop-bolt SKUs, offer known hinge/latch kits, and emit selected hardware/TruClose caps through the local fallback BOM.

Latest Brief U pass: QSHS/XPL height choices now derive live from the catalogue formula `((slat + gap) x N) - gap + 3`, store the selected slat count, rebuild when slat size/gap changes, show derivation chips, and keep VS as a custom free-height input.

Latest Brief V pass: QSG gate infill selection now keeps horizontal gates on `QSG-4800-INF` cut to gate width and vertical gates on `QSG-4200-CINF` cut to gate height, including the sliding-gate fallback path.

Latest Brief W pass: gate openings now validate against catalogue width maximums by gate type/orientation, show warning/error chips with alternative suggestions, offer a switch-to-alternative action, and block Generate BOM only for hard gate-width errors.

Latest Brief X pass: sliding gates now expose track, top guide, and catch choices, emit the selected guide/catch/track SKUs, auto-add centre support rail/cap/plates for sliding gates over 3000mm, and suggest the same CSR kit for shorter sliding gates.

Latest Brief Y pass: sliding gates now have an optional Filo 400 automation flow with mains/solar power, long-run split-pack switching, battery/keypad/extra remote options, rack count preview, automation subtotal, and BOM lines grouped under automation.

Latest Brief Z pass: fence section settings now include left/right end-condition chips for Post, Wall, Pillar, and Void; non-post ends flow through the existing wall/F-section BOM path while adjacent shared ends render read-only.

Latest sidebar and mapper usability pass: run settings now collapse independently with auto-collapse after idle hover, run fields render as compact selected-value accordions, section cards have a stronger centered title and map-code bubble, section settings use compact collapsible groups without a separate advanced button, gate dimensions edit as millimetre widths, and the mapper text tool now supports dragging a note box before typing.

Latest BAY-G and launch workflow pass: BAY-G is restored to the active system selector as an infill-screen workflow, BAY-G runs use width/height/quantity panel groups with no gate/post controls and no post BOM lines, the calculator now opens on a branded Glass Outlet start screen, the layout-map CTA uses a drawing-oriented treatment, gate settings are grouped into collapsible sections, and the mapper toolbar now groups drawing/site/action/view tools with existing-post and pillar markers.

Latest run-default and gate-behaviour pass: Run Settings now actively reset section and gate defaults for the whole run, matching section codes stay green and can be clicked to revert an overridden section, number fields allow clearing before retyping, double swing gates calculate as two leaves with hinge/latch clearance and default drop bolt handling, failed hinge/latch options move under override sections, and sliding gates carry slide-side data through the sidebar, canvas, canonical payload, and local fallback BOM.

Latest mobile mapper audit pass: the `/calculator` mobile workflow now opens the layout map from the intro with a fallback QSHS payload, uses the bottom Run/BOM/Map tabs as true mobile panes, keeps Run/BOM reachable by minimizing the map when those tabs are selected, gives the mapper touch start/move/end support for phone drawing and gate dragging, switches the mapper toolbar to horizontal scrolling on narrow screens, hides the satellite hint over the phone canvas, and adds mobile footer clearance so action buttons are not covered by the bottom nav.

Latest Brief 006 pass: the mapper now has a first-class Arrow site tool with its own toolbar button and `A` shortcut. Arrows are placed as straight tail-to-head annotations, render with a fixed dark-grey style, and round-trip through the canonical payload alongside the existing canvas data.

Latest Brief AU pass: BOM rows now retain source breakdowns for run/gate scoped review, the All BOM tab aggregates to one line per SKU while filtered tabs re-price by scoped quantity, BOM display categories now use a richer category/subcategory/sort order taxonomy, seed components carry display metadata without changing engine selector categories, and TruClose safety caps (`TC-CAPS3`) are offered as an optional add-on instead of being auto-added.

Latest print BOM pass: the print/PDF BOM now hides screen-only pricing hints, tier badges, derivation notes, next-tier/carton prompts, source chips, edit controls, accessory/search panels, and QR cards; print CSS resets scroll-container heights so long BOMs can paginate beyond page one; optional map inclusion prints the layout map as a normal bottom section after the BOM.

Latest pricing data pass: Brief AM is in progress. A repeatable `npm run prices:import` task now ingests the local Glass Outlet CSV price exports, updates seed pricing rows with per-SKU `qty >= minQty` quantity-break rules, creates a catalogue-only seed for additional priced supplier SKUs, refreshes local break hints, removes default-price fallback from the local BOM calculator, and adds BOM UI chips for verified prices and unpriced lines.

Latest Brief AT pass: supplier-portal pricing captured on 2026-05-09 now has a repeatable `npm run prices:brief-at` staging flow, `pricing-2026-05-09.json`, and an idempotent pricing migration. Verified BB bulk-buy pairs are mapped in code, the BOM can show BB saving hints, Diamond Revolution kit suggestions compute their total from live SKU prices, and pricing anomalies/WHITE latch parity notes are documented in `docs/brief-at-pricing-notes.md`.

Latest Brief AY pass: the landing screen is simplified to a single job-details entry, the empty workspace sidebar now offers three equal numbered choices (Draw, Describe, Select), the map entry copy is standardised as `Draw your fence`, run/BOM summaries surface post-BOM panel counts with an em-dash placeholder before generation, and first-section settings auto-open with a one-time run-defaults teaching card.

Latest Brief BB pass: gate diagrams now use clearer single/double swing arcs and sliding direction indicators, Describe Your Fence previews no longer block on missing values and instead highlight sensible defaults, the sidebar map toggle is sticky and always reachable, install videos moved to the top-right header icon, landing Enter/Tab/blur commits a non-empty job name and opens the workspace, the default canvas height is now 630px, and endpoint dragging pivots around the opposite end with BA's whole-section/Alt-drag mode removed.

Latest Brief BD pass: gate settings now include numbered QSG component diagrams for horizontal and vertical gates, BOM rows show matching numbered badges with hover cross-highlighting, QS gate seed component metadata mirrors the same diagram references, and double-swing gate openings now carry editable finished leaf widths so the local BOM, canvas arcs, and gate summaries treat a double gate as two leaves in one opening.

Latest Brief BD follow-up: BOM rows no longer expose per-line Tier 1/2/3 labels, quantity-break hints remain user-facing as lower-unit-price prompts, and QSG swing-gate hinge quantities are harmonised to exactly 2 hinges per leaf in both local fallback emission and QS_GATE seed companion metadata.

Latest Brief BN completion pass: run, section, and gate settings buttons are icon-only, disclosure rows use blue chevrons instead of show/hide text, the initial Describe affordance includes `(Click to describe)` and disappears once a system/description is applied, BOM display/export no longer prints the original description, section alternate post colour opens the post colour palette, gate settings are grouped into four shared disclosure rows, gate summaries show hardware names instead of internal codes, and the Map/BOM tabs plus BOM actions now live in the top header with BOM actions hidden on Map view.

Latest Brief BE sandbox consolidation: gate width validation now treats single swing as max 2100mm and double swing as two leaves up to a 4200mm opening, switching single to double doubles the opening before splitting leaves, switching double to single combines the leaves back into one opening, all active seed/UI defaults now start on 9mm gaps and 1800mm height, the map default canvas height increased by 25%, the Glass Outlet header no longer shows the SkyBrookAI powered subtitle, run cards remove flat panel/gate count clutter, and the BOM header uses full system/gate wording.

Latest Brief BH pass: run cards now sit on a very light blue run surface with clearer spacing between runs, the QSG gate component diagram has been replaced by a compact numbered Gate components list with the same BOM badge cross-highlighting, and canvas-placed existing posts/pillars now snap onto fence sections, split a section when placed mid-run, and use the F-section termination BOM path.

Latest Brief BI pass: empty-run workspaces now show four primary fence-system buttons (QSHS, VS, XPL, BAYG), run/section/gate settings share the same selected-value disclosure row with one-open/60-second idle collapse, run settings are grouped into Color, Slat size, Gap size, and Post size/mounting/spacings, section/gate cards keep editable length/width and height visible, End conditions UI was removed without changing termination data, and the BOM includes a printable run/section breakdown above line items.

Latest Brief BJ pass: BI's run/section parity gaps were closed. Run and section settings now share the same grouped disclosure pattern, section system overrides are supported without adding a parallel data model, section height is edited only in the expanded section panel, run-level height display was removed, and BOM summaries no longer show height as a run-level attribute.

Latest Brief BK pass: section headers now keep Section as the primary heading while length/height render as smaller metadata, new gates show the same green match indicator when their run-derived style settings match, run settings no longer auto-collapse at 10 seconds, a muted green-code helper note appears above section cards, and the run subheading no longer repeats the run length.

Latest Brief BL pass: calculator entry and Clear Job now default to the BOM tab, the BOM empty state has one bold italic instruction line, Describe Your Fence is a centered message-icon flow under the system buttons, Add Run is hidden until the first run exists, section settings can override alternate post colour below the colour picker, run corner editing is removed while geometry-derived corner counts still display, section headings now show bold length and height without `(L)/(H)`, and code-chip hover copy now says `Click to restore to run settings`.

Latest Brief BM pass: the map toolbar/search workflow now has address search above the canvas with a compact Map settings popover, the duplicate tab-bar expand button is removed, Draw is labelled Draw Fence, Existing wall is labelled Dotted line, buildings are drawn as click-drag rectangles, free-draw strokes and dimensioned post/pillar markers are supported, text notes render transparently and can be moved/resized, cursor hints guide each tool, Ortho snapping is available, right-click/Delete item actions work for map elements, free-draw controls are available, and Print Map fits the drawn content with a job/run/gate/date summary.

Latest skill sync pass: the BI sidebar conventions were added to the repo skill mirrors under `.claude/skills/` and `.agents/skills/`, including `finish_family` as Slat range, the shared `SettingsDisclosureRow` pattern, hidden End Conditions UI with preserved termination data, and the printable BOM run/section summary convention.

Latest Google Maps plumbing pass: `codex/google-maps-plumbing` adds the `@googlemaps/js-api-loader` dependency, env examples, a lazy singleton Maps JavaScript API loader with geometry library support, a `useGoogleMaps` hook, setup documentation, and a focused missing-key unit test without touching canvas or calculator UI.

Latest property-map UI pass: `codex/calculator-property-map` adds the V3 calculator property map surface above the run/form controls, Australian address geocoding, satellite/hybrid map toggle, draggable/confirmable property pins, nullable quote `property_anchor` storage, top-level canonical `propertyAnchor`, `.nvmrc`, and focused unit coverage for geocoding, anchor gating, and canonical anchor persistence without changing canvas drawing or BOM calculation logic.

Latest canvas snapshot pivot: `codex/canvas-engine-map-overlay` now captures the sidebar Google Map view as persisted Static Maps snapshot params, loads the resulting satellite image through the existing canvas underlay path, keeps drawing in the vanilla pixel-coordinate canvas engine, preserves snapshot state across product/run selection and quote reloads, and removes the custom `OverlayView`, Pan/Draw toolbar mode, diagnostic logs, and event-bridge draw-tool wiring.

Latest layered snapshot pass: PR #30 now captures both satellite and roadmap Static Maps snapshots for the same view at 2x the sidebar framing size where Static Maps limits allow, opens the canvas on the centred original framing so zoom-out reveals the extra captured area, defaults Satellite to 100% and Roadmap to 50% opacity so the aerial remains visible under labels, keeps the sidebar Google Map explicitly interactive for pan/zoom framing, restores visible canvas zoom +/- controls with Ctrl-wheel and reset-to-default zoom behaviour, logs Places autocomplete success/failure clearly, writes layer toggles through the calculator reducer so they survive re-render/save/reload, renders successful layers in stack order below the existing canvas drawing layer, and migrates legacy single-image snapshots into a satellite layer with a disabled roadmap fallback.

Latest mapper control simplification: PR #30 now starts the map canvas with angle snap, gate snap, and grid off, removes the Ortho toolbar option, replaces per-layer visibility checkboxes with opacity-only layer rows, and adds a single Map on/off button that hides or restores the map underlay while leaving drawn fence geometry on the canvas.

Latest map regression fix: PR #30 now caps Static Maps snapshot width and height independently after the 2x viewport multiplier, stores the original sidebar viewport size for the default centred crop, lets canvas zoom-out reach the 0.5 reveal level, and fully disables angle snapping when the Angle snap checkbox is off.

Latest map canvas zoom pass: PR #30 now supports direct mouse/trackpad wheel zoom over the map canvas and two-finger pinch zoom on touch screens, while keeping toolbar buttons, keyboard zoom, and reset-to-default zoom controls.

Latest edit-gate workflow pass: `codex/edit-gate-workflow-v2` re-implements PR #29's persistent draggable Edit Gate dialog on top of the post-snapshot canvas, keeps Gate mode active for repeated placements, adds session-scoped cancel removal, carries gate variables through canvas/canonical round-trips, suppresses noisy hover stats, and hides the initial draw hint after the first draw click until clear.

Latest Brief BN v2 pass: the sandbox BN work now completes the top-bar reorganisation by moving Map/BOM tabs into the app header as a segmented control, moving BOM actions beside them only while BOM is active, removing the duplicate in-panel action row, and preserving the icon-only settings/Describe/gate-settings conventions in the repo skill mirrors.

Latest Brief BO pass: run summaries now show only accepted run-default fields with height/length removed from the subheading, BOM colour display strips internal dispatch-code suffixes, section and gate match codes stay green when their run-derived settings match, and Print BOM now prints materials and totals first, then Run & Section Details, then the optional map at the bottom.

Latest Brief 031 pass: run headings now show full system names with inline editable default height, section and gate headings share the same inline height editor, settings buttons are labeled text controls, run/section gap selectors combine type and size in one dropdown, section settings mirror run settings grouping, and closed section subheadings show only settings that differ from run defaults.

Latest map-label cleanup pass: layout map angle annotations and gate direction text have been removed; section/gate codes now share smaller black labels, section and gate measurements share smaller blue labels, and redundant gate-to-section-end distance text has been consolidated out of the canvas.

Latest roadmap underlay fix: new property-map captures now send the roadmap Static Maps layer to the canvas as a visible 50% overlay above satellite, while preserving the current per-layer visibility controls.

Latest canvas finish fix: finishing a run with double-click now preserves the user's current canvas viewport through the canvas-to-canonical sync, even when canonical length rounding changes a segment by a fraction of a millimetre.

Latest canvas point-placement fix: repeated canvas-to-canonical syncs no longer reload and re-anchor unchanged Static Maps layers, so the satellite/roadmap underlay stays pinned under drawn points across later runs.

---

## Phases Overview

| Phase | Title | Status |
|-------|-------|--------|
| 0 | Cypress Test Suite | ✅ Complete |
| 1 | Foundation | ✅ Complete |
| 2 | Fence Configuration | ✅ Complete |
| 3 | Gate Configuration | ✅ Complete |
| 4 | BOM Engine (Edge Functions) | ✅ Complete |
| 5 | Quotes & Export | ✅ Complete |
| 6 | Canvas Layout Tool | ✅ Complete |
| 7 | Polish + v1 removal | ✅ Complete |
| V3-1 | Engine migrations | ✅ Complete |
| V3-2 | QSHS + QSHS_GATE seeds | ✅ Complete |
| V3-3 | Canonical payload contract | ✅ Complete |
| V3-4 | `bom-calculator` edge function | ✅ Complete |
| V3-5 | Multi-run UI at `/calculator` (form + canvas are hand-coded, shared across fencing systems) | ✅ Complete |
| V3-6 | BOM output (per-run tabs + trace panel) | ✅ Complete |
| V3-7 | Docs (CLAUDE.md + tasks.md + how_it_works.md) | 🔄 In progress |

---

## Phase 0 — Cypress Test Suite


- [x] Install Cypress and TypeScript support
- [x] Create `cypress/support/selectors.ts` (data-testid abstraction layer)
- [x] Create `cypress/support/helpers.ts` (`fillFenceConfig`, `addGate`, `generateBom`, `assertBomLine`, `assertGrandTotal`, etc.)
- [x] Create pricing fixture files (`tier1.json`, `tier2.json`, `tier3.json`)
- [x] Create test files TC1–TC10 (BOM line items & accessory quantities)
- [x] Create test files TC11–TC19 (pricing tiers, colour switching, system type, post count)
- [x] Create test files TC24–TC26 (edge cases)
- [x] Add `data-testid` attributes to existing HTML app (non-destructive)
- [x] Run suite against existing HTML app — TC1 and TC5 pass; failures documented
- [x] Document all other failures (test bug vs app bug) → `docs/cypress-test-report.md`

---

## Phase 1 — Foundation


- [x] Scaffold Vite + React + TypeScript
- [x] Install and configure Tailwind CSS (v3 with PostCSS)
- [x] Install all dependencies (Supabase, TanStack Query, React Hook Form, Zod, React Router, Lucide, etc.)
- [ ] `supabase init` + `supabase start` (local dev stack) *(requires Supabase CLI install)*
- [x] Write migration `001_create_organisations.sql` + seed Glass Outlet org
- [x] Write migration `002_create_profiles.sql` (profiles table, `auth.user_org_id()` helper, signup trigger)
- [x] Write migration `003_create_quotes.sql` (quotes table + RLS policies)
- [x] Write migration `004_create_pricing.sql` (product pricing, no RLS)
- [x] Write migration `005_create_products.sql` (top-level products — fence systems and gate products, no RLS)
- [x] Write migration `006_create_product_components.sql` (component catalog — individual SKUs/hardware, no RLS)
- [ ] Apply all migrations *(requires Supabase CLI)*
- [x] Set up `src/lib/supabase.ts` and `src/lib/queryClient.ts`
- [x] Configure Tailwind theme (brand colours)
- [x] Build `AppShell.tsx`, `Header.tsx`
- [x] Set up React Router with routes: `/login`, `/`
- [x] Build `LoginForm.tsx` and `SignUpForm.tsx`
- [x] Build `AuthGuard.tsx` (redirect unauthenticated users)
- [x] Implement `useAuth.ts` hook
- [ ] Verify login → main app and logout → login page redirect *(requires Supabase running)*

---

## Phase 2 — Fence Configuration


- [x] Write `src/schemas/fence.schema.ts` (Zod)
- [x] Build `FenceConfigContext.tsx` with reducer and business rule enforcement
- [x] Build `FenceConfigForm.tsx` (React Hook Form + Zod)
- [x] Build `ColourSelect.tsx` (with limited-availability flag)
- [x] Build `SlatSizeSelect.tsx`
- [x] Build `SlatGapSelect.tsx`
- [x] Build `AccordionSection.tsx`, `FormField.tsx` shared components
- [x] Enforce XPL → 65mm slat rule in reducer and form (watch + setValue)
- [x] Verify form validates with Zod before submission (zero TypeScript errors, clean Vite build)
- [x] Wire `FenceConfigForm` into `MainApp.tsx` inside `AccordionSection`
- [x] Build `src/lib/constants.ts` — all reference data: SYSTEM_TYPES, COLOURS, SLAT_SIZES, SLAT_GAPS, PANEL_WIDTHS, POST_MOUNTINGS, TERMINATIONS, gate constants

---

## Phase 3 — Gate Configuration


- [x] Write `src/schemas/gate.schema.ts` (Zod)
- [x] Write `src/types/gate.types.ts`
- [x] Build `GateContext.tsx` with reducer
- [x] Build `GateTypeSelect.tsx`
- [x] Build `GateForm.tsx` (individual gate)
- [x] Build `GateList.tsx` (summary of all configured gates)
- [x] Build `GateConfigPanel.tsx` (section wrapper)
- [x] Implement "Match Gate to Fence" toggle (height/colour/slat fields default to match-fence)
- [x] Implement add gate flow
- [x] Implement edit gate flow
- [x] Implement remove gate flow
- [x] Add warnings for post sizes that require stock confirmation

---

## Phase 4 — BOM Engine (Edge Functions)


- [x] Create `supabase/functions/_shared/cors.ts`
- [x] Create `supabase/functions/_shared/auth.ts`
- [x] Create `supabase/functions/_shared/types.ts`
- [x] Implement `calculate-bom` edge function — full QSHS BOM engine (panel layout, posts, slats, rails, brackets/accessories, gate BOM)
- [x] Implement `calculate-bom` edge function — system-specific rules (QSHS, VS, XPL, BAYG)
- [x] Implement `calculate-pricing` edge function (reprice existing BOM by tier)
- [x] Seed `product_pricing` table (migration 007 — all SKUs × 3 tiers × 11 colours)
- [x] Build `useBOM.ts` hook (TanStack Query mutation → `calculate-bom` edge function)
- [x] Build `src/types/bom.types.ts`
- [x] Build `BOMDisplay.tsx` (table with fence/gate/all filter)
- [x] Build `BOMLineItem.tsx` (with correct data-testid attributes)
- [x] Build `BOMSummary.tsx` (subtotal, GST, grand total with data-testid="bom-grand-total")
- [x] Build `PricingTierSelect.tsx` (data-testid="pricing-tier")
- [x] Wire BOM accordion into MainApp (conditional on mutation result)
- [x] Add `data-testid="match-gate-to-fence"` checkbox to GateForm
- [ ] Run Supabase CLI + apply migrations + verify TC1 and TC5 pass *(requires Supabase running)*

---

## Phase 5 — Quotes & Export


- [x] Write `src/schemas/quote.schema.ts` and `src/schemas/contact.schema.ts`
- [x] Write `src/types/quote.types.ts`
- [x] Build `useQuotes.ts` hook (TanStack Query — list, save, load, delete, invalidate)
- [x] Build `SavedQuotesList.tsx` (slide-in panel, load + delete actions)
- [x] Build `QuoteActions.tsx` (Save, Load, PDF, CSV, Copy, Print buttons)
- [x] Build `QuotePDFTemplate.tsx` (@react-pdf/renderer — fence spec, gates, BOM table, totals)
- [x] Build `ContactDeliveryForm.tsx` (name, company, phone, email, fulfilment, delivery address)
- [x] Build `JobSummary.tsx` (live panel + gate count preview)
- [x] Implement CSV export (Papaparse — all BOM items + grand total row)
- [x] Implement PDF download (react-pdf blob → anchor click)
- [x] Implement clipboard copy (tab-separated for Excel/Sheets paste)
- [x] Build print stylesheet (`@media print` in index.css)
- [x] Build `QuoteViewPage.tsx` at `/quote/:id`
- [x] Add `/quote/:id` route to App.tsx + QueryClientProvider
- [x] `handleLoadQuote` in MainApp repopulates fence config, gates, BOM, contact, notes
- [x] App.tsx wraps entire tree in QueryClientProvider

---

## Phase 6 — Canvas Layout Tool


- [x] Extract canvas drawing code from existing `index.html`
- [x] Port into `src/components/canvas/canvasEngine.ts` (pure TS, no React)
- [x] Implement `initCanvasEngine()` with full public API (`destroy`, `getLayout`, `setTool`, `undo`, `clear`, etc.)
- [x] Port grid snap logic
- [x] Port pan & zoom (scroll = zoom, right-drag = pan)
- [x] Port undo stack
- [x] Port segment label editing (click label to edit real-world length)
- [x] Port gate marker placement on segments
- [x] Port Google Maps tile underlay logic
- [x] Build `FenceLayoutCanvas.tsx` React wrapper (`useRef` + `useEffect`)
- [x] Build `CanvasToolbar.tsx` (Draw, Gate, Move, Undo, Clear buttons)
- [x] Build `MapControls.tsx` (address search, opacity slider, map type)
- [x] Wire "Use This Layout →" → dispatch to `FenceConfigContext` and `GateContext`
- [x] Verify canvas event listeners are cleaned up on unmount
- [x] Hide canvas section on mobile breakpoint

---

## Phase 7 — Polish


- [x] Audit all components for dark theme consistency — fixed `hover:bg-white/5` → `hover:bg-brand-border/40` in AccordionSection
- [x] Add loading spinners/skeletons to all async operations — Loader2 spinner on BOM pending state
- [x] Add React Error Boundaries to BOM display and canvas sections — `ErrorBoundary` wraps both
- [x] Add toast notifications (quote save, clipboard copy, CSV download, auth errors, edge function errors) — sonner installed, toasts on save/copy/csv/bom-error
- [ ] Responsive audit: mobile form-only mode, tablet canvas, desktop full layout
- [ ] Verify canvas has no memory leaks (mount/unmount in dev tools)
- [ ] Verify BOM re-pricing (tier switch) does not re-trigger edge function
- [ ] Check for unnecessary React re-renders caused by canvas updates
- [ ] Run full Cypress suite (all 23 test cases) on production build
- [ ] Complete security checklist (see phase-7 doc)
- [ ] Move GitHub repo to private

---

## v3 Engine (Schema-Driven BOM)

> See spec docs in `docs/phase-v3-*.md`. One-page overview at [`docs/how_it_works.md`](./how_it_works.md).
> Scope: QSHS fence + QSHS_GATE pedestrian gate.

### V3-1 — Engine migrations
- [x] Write migrations 011–014, 018, 019 (rule_sets, rule_versions, product_rules, constraints, variables, validations, selectors, companion rules, warnings, quote_runs/segments, admin role)
- [x] Scope reduction: migrations 015 (form schema), 016 (layout schema), 017 (input_aliases) dropped — fencing-only product surface means form + canvas are hand-coded and shared across systems
- [ ] Apply migrations locally (`npm run db:reset`) *(requires Supabase running)*
- [ ] Verify all new tables exist, `touch_updated_at` triggers attached, `admin` enum value added *(requires Supabase running)*
- [ ] RLS smoke-tested *(requires Supabase running)*

### V3-2 — QSHS + QSHS_GATE seeds
- [x] Write `supabase/seeds/glass-outlet/v3-qshs-engine.sql` with ordered inserts (products → components → rule_sets → rule_versions → constraints → variables → validations → rules → selectors → companion rules → warnings → pricing_rules)
- [x] Extend `supabase/seeds/seed-auth.js` to create `admin@glass-outlet.com` / `123456` with `role = 'admin'`
- [x] Write `supabase/seeds/glass-outlet/v3-verify-seeds.sql` row-count assertions
- [x] Add QSHS_GATE-specific rules (133mm structural offset, slat cut = width − 86, rail cut = width − 80, side frame cut = height − 3)
- [x] Scope reduction: form-schema inserts (product_input_*), layout-schema inserts (product_layout_*), and input_aliases inserts dropped alongside migrations 015/016/017
- [ ] `npm run db:reset` passes `v3-verify-seeds.sql` *(requires Supabase running)*

### V3-3 — Canonical payload contract
- [x] Write `supabase/functions/_shared/canonical.types.ts` (CanonicalPayload, Run, Segment, Boundary, Corner)
- [x] Mirror at `src/types/canonical.types.ts`
- [x] Write `src/schemas/canonical.schema.ts` Zod validators
- [x] Write `src/components/canvas/canonicalAdapter.ts` (canvasLayoutToCanonical + canonicalToCanvasLayout)
- [ ] Round-trip test: canvas layout → canonical → canvas layout deep-equal *(manual test pending)*

### V3-4 — `bom-calculator` edge function
- [x] Create `supabase/functions/bom-calculator/index.ts` (12-step pipeline)
- [x] Reuse `_shared/auth.ts`, `_shared/cors.ts`
- [x] Port `resolvePrice`, `loadPricing`, `COLOUR_CODES` from `calculate-bom-v2`
- [x] Admin trace gating (`role === 'admin'` → full trace; else `trace: []` + minimal computed)
- [x] Graceful math.js failure handling (try/catch per rule, log to trace, skip on failure)
- [ ] Write `index_test.ts` with 8 fixtures (TC-V3-1 through TC-V3-8) *(deferred)*
- [ ] Manual curl test with QSHS 5m payload *(requires Supabase running)*

### V3-5 — Multi-run UI at `/calculator`
- [x] Build `src/components/calculator-v3/` (ProductSelectV3, SchemaDrivenForm as generic renderer, RunListV3, LayoutCanvasV3)
- [x] Build `src/pages/CalculatorV3Page.tsx` (hand-coded `FALLBACK_FIELDS` drive SchemaDrivenForm — shared fence config form)
- [x] Build `src/hooks/useBomCalculator.ts`
- [x] Extend `src/context/CalculatorContext.tsx` (payload: `SET_PAYLOAD`, `UPSERT_RUN`, `UPSERT_SEGMENT`, `REMOVE_SEGMENT`, `REMOVE_RUN`, `SET_BOM_RESULT`)
- [x] Wire `/calculator` route in `src/App.tsx`
- [x] SchemaDrivenForm emits `data-testid={field_key}` for Cypress compatibility
- [x] Scope reduction: `useProductSchema` hook deleted, `LayoutCanvasV3 actions` prop removed — form/canvas toolbar are shared across fencing systems, not per-product schema-driven
- [ ] Canvas ↔ form round-trip verified *(manual test pending — requires Supabase running)*

### V3-6 — BOM output
- [x] Move `src/components/calculator/BOMResultTabs.tsx` → `src/components/shared/BOMResultTabs.tsx`
- [x] Update v2 import path (`src/pages/CalculatorPage.tsx`) to new location
- [x] Build `src/components/calculator-v3/BOMWarningsPanel.tsx` (errors red, warnings amber, assumptions grey)
- [x] Build `src/components/calculator-v3/AchievedHeightBadge.tsx` (inline per-segment)
- [x] Build `src/components/calculator-v3/BOMTracePanel.tsx` (admin-only collapsible)
- [ ] Verify all tab filters + recomputed totals work *(manual test pending — requires Supabase running)*
- [ ] Admin-vs-non-admin trace gating confirmed *(manual test pending)*

### V3-7 — Docs
- [x] Write `docs/how_it_works.md` (1-page plain-English overview)
- [x] Update `CLAUDE.md` sections 1, 3, 5, 5a (new), 6, 8, 11, 14, 15, 16
- [x] Write this v3 Engine section in `docs/tasks.md`
- [x] Update "Current Phase" header
- [ ] Cross-link all phase docs + CLAUDE.md sections + how_it_works.md — verify links resolve

---

## Seed-mapping / Self-serve Seeding

**Stage 1+2 combined (shipped)** — JSON is the source of truth for ALL seed
data (fences, gates, legacy catalog, pricing, v3 engine rules). A Node
upserter writes directly to Postgres via supabase-js. One file per product
under `supabase/seeds/glass-outlet/products/`. `slat-fencing.sql` has been
disabled (renamed `.sql.disabled`); `organizations.sql` is the only
remaining SQL seed. Products table is now flat (`parent_id` unused) with a
`product_type` column ('fence' | 'gate' | 'other') and a
`compatible_with_system_types` array that lets a gate declare which fences
it pairs with. QSHS_GATE renamed to QS_GATE (shared across QSHS/VS/XPL/BAYG).
Enables reliable LLM authoring and sets up an in-app AI import feature later
(see `docs/seed-data-mapping-spec.md`).

- [x] JSON Schemas for every engine + catalog table (`supabase/seeds/schemas/*.schema.json`)
- [x] Wrapper schema `product-file.schema.json` — LLM output contract for per-variant files
- [x] Per-product file layout: 7 files under `supabase/seeds/glass-outlet/products/` (qshs, vs, xpl, bayg, qs_gate, gate_legacy, other)
- [x] Migration 022 — flatten products, add `product_type` + `compatible_with_system_types`
- [x] Rename QSHS_GATE → QS_GATE (its own file, `compatible_with_system_types: ['QSHS','VS','XPL','BAYG']`)
- [x] Migrate slat-fencing.sql content into JSON (catalog + pricing + 4 fence products + 12 inactive families); rename original to `.sql.disabled`

### v3 UI polish + v2 retirement (shipped)

- [x] Searchable fence-only product dropdown (`ProductSelectV3` rewritten as a typeahead, filters `product_type='fence'`)
- [x] Data-driven job settings — `useProductVariables` hook loads `product_variables` from Postgres; `FALLBACK_FIELDS` deleted
- [x] `SchemaDrivenForm` wraps fields at 1/3 width on desktop (responsive flex grid)
- [x] Gate management UI — `GateListV3` + `GateFormV3` modal, backed by canonical payload QS_GATE runs
- [x] Retired old XP gate-frame hardware from active gate paths: `gate_legacy.json` is disabled, QS_GATE seed rows/selectors/rules for `XP-6100-GB65-*`, `XP-4200-GSTOP-*`, `XP-LBOX-*`, and `XP-HDL-*` are inactive, and the local fallback blocks those discontinued SKUs from BOM output.
- [x] Added a wider current-catalogue gate hardware menu for QSG gates, including D&D TruClose/Kwik Fit/SureClose hinges, Six Star/Zeus/Colourbond hinge options, Lokk Latch/Magna Latch/T-Latch latch options, white hardware variants, drop bolts, and gate stops.
- [x] Sliding gate local fallback corrected to output QSG sliding gate rails, side frames, infill/channel infill, screw covers, joiners, spacers, top caps, wheel/clamp hardware, track, and horizontal centre support rails/plates.
- [x] QSG gate pricing pass: verified missing active gate SKUs through Glass Outlet online lookup, added pricing for side frames, infills, screw covers, top caps, joiners, rail screws, screws, and spacers, and retired legacy placeholder QSG-SC/QSG-RS/QSG-FTC rows.
- [x] Run/segment sidebar cleanup: run headings now show total posts, matching segment cards only show length/height, changed segment cards only show differing settings, and segment options open by double-clicking the card.
- [x] Tier 1 Brief A foundation pass started: hardcoded primary/success/warning/danger colour utility classes replaced with brand tokens, Inter added as the app font, action buttons moved toward the 8px radius standard, and icon sizes normalized to 16/20px with the layout-map CTA kept at 22px.
- [x] Tier 6 Brief AA: Economy 65mm slats now aggregate required stock lengths by run, order `XP-6500-E65-*` as packs of 96, show the pack note/waste prompt, block invalid 90mm economy combinations, and provide a BOM switch action to convert affected run sections to Standard slats.
- [x] Tier 6 Brief AB: Canvas-derived corners now classify as 90 degree, 135 degree, or custom, section settings expose editable corner overrides, 135 degree corners emit the adapter plus screw pack, and custom angles produce a supplier-verification BOM warning line.
- [x] Tier 6 Brief AC: Run settings now include post-fixing material and base-plate substrate choices, local BOM emits selected concrete/grout and substrate fixing kits, chemical anchor suggestions appear for concrete base plates, and grout choice persists locally for future runs.
- [x] Tier 6 Brief AD: QSHS 65mm sections can enable louvre treatment, the local BOM emits `QS-LB-*` bracket packs per slat/panel, slat fixing screws are reduced for louvre sections, and QS-LB pricing/quantity breaks are loaded from the CSV.
- [x] Tier 6 Brief AE: Suggested accessories now include gate handles, driver bits, post plugs, core-drill dress-ring/tooling/epoxy prompts, base-plate threadlocker prompts, general silicone, and gate-colour touch-up paint suggestions with local CSV-backed pricing for the new SKUs.
- [x] Tier 6 Brief AF: BOM polish added a line-items/cut-list toggle, Pack 1/2/3 delivery grouping, catalogue page chips, carton threshold hints, and install-video QR cards for QSHS, VS, pedestrian gates, and sliding gates.
- [x] Layout/sidebar polish pass: layout-map controls moved left, map overlay now respects the live sidebar width, active-job draw-map CTA moved into the BOM action area with a 3D globe treatment, section controls now show Section/Gate settings labels, current settings show Panel width instead of Max Post Spacing, post spacing is collapsed at the bottom of section settings, louvre treatment moved to run settings, and gate settings were split into per-setting dropdown sections.
- [x] Glass Outlet branding pass: opening screen and BOM header now use a dark-blue Glass Outlet logo/wordmark treatment.
- [x] Extra items panel — typeahead against existing SKUs (via `search-products`) + create-on-the-fly for one-off lines
- [x] v2 retired — `CalculatorPage`, `src/components/calculator/*`, `useCalculatorBOM`, `useFenceProducts`, `calculate-bom-v2` edge function all deleted. `/` redirects to `/calculator`.
- [x] v1 (`/new`, `MainApp`, `calculate-bom`) removal — complete.
- [x] `dump-to-json.js` emits per-variant wrapped files
- [x] `seed-products.js` Node upserter — validates each file, resolves FKs by business keys, upserts all sections via supabase-js, runs post-check row-count floors
- [x] Migration 020 — unique indexes on engine tables (upsert conflict targets)
- [x] Migration 021 — RLS across all engine + catalog tables (authenticated SELECT org-scoped on engine config; deny-by-default on `product_components` + `pricing_rules`)
- [x] `npm run seed:products` wired in; `db:reset` runs it after migrations + slat-fencing.sql
- [x] Round-trip verified: upsert → dump → identical JSON; dup-SKU sanity test passes
- [x] RLS smoke test: authenticated user sees engine rows, denied on pricing/components
- [x] Portable mapping spec at `docs/seed-data-mapping-spec.md`
- [x] Claude skill at `.claude/skills/seed-mapper/` (SKILL.md + schema-catalogue + expression-syntax + worked examples for QSHS_GATE and a hypothetical VS system)
- [x] Brief AT supplier portal price staging: generated `supabase/seeds/glass-outlet/pricing-2026-05-09.json`, added `npm run prices:brief-at`, refreshed local catalogue pricing rows, and documented excluded anomaly SKUs for supplier review.
- [x] Brief AV Describe Your Fence v1: added deterministic no-AI natural-language parsing, landing/sidebar describe-entry UI, confidence preview chips with inline edits, Web Speech API dictation fallback, parsed-gate position badges/modal, job description metadata persistence, CSV/print summary inclusion, and a TC-01 through TC-12 parser corpus runner.
- [x] Brief BA sidebar polish/map/BOM cleanup: job names now commit into bold inline text, the three-entry cards match the darker prototype style, sections default to 0m and nest visually under runs, Clear Map/Clear Job/Remove Run use one shared two-click confirm pattern, the map summary lists sections under runs, and BOM print hides top price/UI chrome. Brief BB later replaced BA's Move/Edit drag behavior with pivot-around-opposite-end endpoint editing.
- [x] Brief BC unified calculator experience: landing now goes straight to the calculator with a sidebar Describe Your Fence component instead of AY's three entry cards, Map/BOM tabs host the right pane, typed/canvas length edits continue to sync through the canonical payload, gate openings remain section-owned but render in a run-bottom Gates group, expanded map mode covers the whole viewport including the sidebar, map shortcuts/help were surfaced, and run details render below the docked map while preserving the flat BOM-compatible `gate_opening` segments.
- [x] Brief BF post-BE polish: committed job names now render larger with truncation, the map retains the 50m default view and centers parsed layouts, Describe Your Fence now direct-applies deterministic parser results without the preview card, parsed gates are auto-added/centered with catalogue-height normalization, Add run has primary-brand prominence, and gate cards now mirror section cards with R1G1 codes plus inline gate settings.
- [x] Brief BG post-BF cleanup: fresh calculator entry and Clear Job now default to the Map tab, hidden-to-visible canvas resize recalibrates empty maps back to the 50m default view, corner-post editing has moved out of section settings into run settings, and clicking a v3 gate marker on the map now opens the matching sidebar gate settings row.
- [x] Brief BI sidebar uniformity: empty-run landing now offers QSHS, VS, XPL, and BAYG system buttons; run, section, and gate settings use one selected-value disclosure pattern; run settings are reorganized into Color, Slat size, Gap size, and Post size/mounting/spacings; color tiles show catalogue abbreviations; section/gate cards show inline editable dimensions; End conditions controls are hidden while termination data remains intact; and the BOM has a printable run/section information block.
- [x] Brief BJ run/section parity completion: fence-system buttons now have larger primary text, run and section settings share the same System type / Slats-colors-spacings / Post size-mounting-spacing disclosure groups, section length/height edits live only inside the expanded panel, section headers show length plus bold height, run-level height was removed, section match indicators ignore height, section system overrides dispatch through their own BOM system path, and BOM summaries no longer show a run-level height.
- [x] Brief BK post-BJ polish: section length/height metadata now uses a lighter heading hierarchy, gate green-match checks ignore gate-only hardware/direction choices, settings collapse timing is consistently 60 seconds, a green-code helper note explains matching run settings, and the run subheading no longer repeats length.
- [x] Brief BL post-BK polish: BOM-first entry/default reset, simplified BOM empty-state guidance, message-icon Describe flow with Apply/collapse, section-level alternate post colour, read-only corner-count display, refined section heading format, and restore-to-run tooltip copy.
- [x] Brief BO punch-list and Print BOM redesign: removed height/length clutter from run subheadings, stripped colour dispatch-code suffixes in BOM/print display, verified green section/gate match indicators, and reordered print output to materials first, run/section details second, map last.
- [x] Brief BM map canvas overhaul foundation: moved address search above the canvas with a collapsed map-settings popover, removed the duplicate right-pane expand button, renamed Draw to Draw Fence and Existing wall to Dotted line, added click-drag building rectangles, free-draw strokes, post/pillar dimensions, transparent text notes, cursor hints, fitted print-map output with job/run/gate/date summary, and preserved map annotations through layout reloads.
- [x] Brief BM completion pass: added Ortho snapping for Draw Fence/Dotted line, free-draw colour/width/style/opacity/arrow controls, map item selection with Delete/Backspace removal, right-click context actions, draggable/resizable text notes, movable/resizable building rectangles, movable existing post/pillar markers, and editable text/post/pillar details without changing BOM dispatch.
- [x] Brief BO residual punch-list: removed redundant run-subheading length/height, kept height section-only in the visible UI, added stripped colour-code display text for BOM summaries/rows/exports, tightened visible green section/gate match chips, and confirmed the existing icon Describe trigger plus hidden initial Add Run behaviour.
- [x] Brief 011 queue pass: double-click fence finish now preserves the user's zoomed-out canvas viewport during same-geometry form sync, preventing the satellite/background view from shifting away from the drawn run.
- [x] Roadmap underlay fix: new layered Static Maps captures now make the roadmap layer visible by default while preserving the current Satellite/Roadmap visibility toggles.
- [x] Canvas finish viewport fix: double-click run completion now treats canonical round-trip millimetre rounding as the same geometry, so the mapper does not refit away from the line just drawn.
- [x] Canvas point-placement underlay fix: unchanged Static Maps layers are cached through live canvas syncs, and same-URL layer reloads preserve their world origin instead of re-centering under the current viewport.
- [x] Brief 016 mobile BOM cards: mobile BOM view now renders grouped stacked cards, sticky totals, collapsible accessory cards, a bottom BOM action bar, and Share PDF support with Web Share API plus download fallback while preserving the desktop BOM table.
- [x] Master baseline keyboard-offset fix: removed the duplicate `keyboardOffset` state declaration left by the mobile brief merge and rewired the orphaned Job-tab Generate BOM button to the current `handleManualBomGenerate` handler.
- [x] Brief 030 canvas roadmap layer fix: property map capture now builds separate satellite and roadmap Static Maps layers, crops attribution from both captured layers, exposes per-layer Satellite/Roadmap visibility toggles with opacity controls, and keeps the drawing layer rendered above map underlays.
- [x] BOM workings toggle: added a top-of-BOM control to show or hide per-line source/workings text across mobile cards and desktop line items.
- [x] Preview BOM fallback fix: top-level edge-function error payloads now fall back to the local BOM calculator instead of rendering an empty BOM result.
- [x] Print BOM cleanup: print output now suppresses run/section labels and mobile price-break/source chips, uses the desktop BOM table for printing, and keeps the Glass Outlet logo visible with print-specific sizing.
- [ ] Stage 3 — in-app AI import feature backed by the same JSON Schemas (not scheduled)

---

## Done

- **Phase 0** — Cypress test suite: all 23 test files written, TC test bugs fixed (TC3, TC4, TC11, TC12, TC14, TC17, TC24), failures documented in `docs/cypress-test-report.md`
- **Phase 1** — Foundation: Vite + React + TS scaffolded, Tailwind v3 + PostCSS configured, all 6 SQL migrations written, auth components built (LoginForm, SignUpForm, AuthGuard, useAuth), AppShell + Header built, React Router configured. *(Supabase CLI install + migration apply pending.)*
- **Phase 2** — Fence Configuration: Zod schema, FenceConfigContext (useReducer, XPL enforcement), FenceConfigForm (RHF + Zod, all data-testid attrs), ColourSelect, SlatSizeSelect, SlatGapSelect, AccordionSection, FormField, constants. Build passes with zero TypeScript errors.
- **V3 Planning** — Reviewed `qshs_mvp_build_pack/` + `qshs_gates_build_pack/`, wrote 7 phase specs (`docs/phase-v3-*.md`), one-page overview (`docs/how_it_works.md`), updated CLAUDE.md with v3 architecture, added v3 section to `docs/tasks.md`.

---

## Notes

- The existing `index.html` is the **historical reference** for fence field/validation coverage — no longer the active specification
- **Deferred features** (do NOT build): AI job description parsing, AI BOM review
- All prices and BOM logic must live in Supabase Edge Functions — never in the client bundle
- Currency: AUD, GST: 10%, measurements: metric (mm / m)
- **v3 scope is fencing-only.** QSHS fence + QSHS_GATE in MVP. Post-MVP phases add VS/XPL/BAYG via new seed rows, then QSVS/QSGH/HSSG gate families, then patios-as-fences. All fencing systems share one hand-coded form and canvas toolbar; per-product differences live in the BOM engine seed data. Non-fence products (balustrades, pool fencing that isn't slat-based, etc.) are out of scope.

