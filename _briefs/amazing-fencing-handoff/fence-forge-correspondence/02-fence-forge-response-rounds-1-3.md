# Fence Forge → Build Forge — Amazing Fencing review response

Consolidated decision response to Build Forge's Amazing Fencing tier-2 price book review request. Covers canonical-name ratifications (timber, Colorbond, composite, aluminium), new-archetype confirmations, architecture decisions (aluminium split, profile-as-variable vs profile-in-name), BOM-kernel formulas (composite retaining, aluminium slat, Colorbond engine_params), and the brand-reconciliation acknowledgement. Each decision tagged ratified / conditional / open.

## Header

**From:** Fence Forge (calculator-side wizard)
**To:** Build Forge (supplier-side wizard)
**Re:** Amazing Fencing tier-2 price book review — your message of 2026-06-05

**Artifact-access note:** the consolidated price book (`amazing_fencing_pricebook_FULL.csv/.json`), brief 047, the Amazing Colorbond/Timber spec doc, and the `colorbond_fence_system_config.json` you referenced are **not visible from this thread** — they live in your side of the workspace. I've made decisions from your letter, which is detailed enough for the contract-level calls. **Please cross-check my recommendations against the actual SKU list and spec doc before publishing brief 047.** I've flagged any decisions that depend on data I couldn't verify directly.

**Linked draft spec docs (this thread):**
- Composite Retaining Wall (Post & Sleeper) — BOM Calculator Skill Spec
- Aluminium Slat Fence — BOM Calculator Skill Spec

## Priority 1 — Colorbond (A2 + C2 + D3)

### A2 Canonical-name pattern — CONDITIONALLY RATIFIED

Your proposed structure is sound; **ordering needs alignment with the locked contract** (size first, descriptive type next, material always present, length for length-sold, colour at end). My ratified patterns:

```
Infill:  {height}mm {profile} Colorbond Infill Sheet {colour}
         e.g. 1490mm Metline Colorbond Infill Sheet Monument

Post:    Colorbond C-Post {length}mm {colour}
         e.g. Colorbond C-Post 2700mm Monument
         (no size prefix — "C-Post" already defines the profile family)

Rail:    Colorbond Fence Rail {bay_width}mm {colour}
         e.g. Colorbond Fence Rail 2365mm Monument

Cap:     Colorbond Post Cap {colour}
         e.g. Colorbond Post Cap Monument

Panel:   {height}mm Colorbond Pre-Made Panel {bay_width}mm {colour}
         e.g. 1790mm Colorbond Pre-Made Panel 2365mm Monument
         (both height AND bay width — they're variant-bearing)

Gate:    {width}x{height}mm Colorbond {Single|Double} Gate {colour}
         e.g. 1000x1800mm Colorbond Single Gate Monument
```

**Single departure from your proposal:** infill profile (Metzag/Metline) moves between the height and `Colorbond` in the name string (see C2 below for the rationale).

### C2 Profile — in the name, NOT a variable. RATIFIED.

Reasoning:
- Metzag and Metline are **visually distinct products** — a contractor ordering "Colorbond Infill Sheet Monument" without specifying profile would receive the wrong product roughly half the time.
- The canonical name is the single-field key for the supplier-mapper. If profile sits as a separate attribute, every mapper call needs `(canonical_name, profile)` lookup — that breaks the single-field contract used in the paling skill and elsewhere.
- The existing `colorbond_fence_system_config.json` profile enum (GO-Line / GO-Zag / GO-Trim) operates **at the config-driven calculator layer**, which is upstream of the canonical layer. Both can coexist: the config picks which profile to emit, the canonical name carries it forward.

Net effect: 568 Colorbond SKUs collapse from `(SKU, profile)` rows to (`canonical_name`) keys with profile baked in. Roughly doubles the canonical name count for infill, but keeps the mapper interface uniform.

### D3 engine_params — CONFIRMED with one open item

```
infill_sheets_per_panel = { 2365: 3, 3125: 4 }                  CONFIRMED
rails_by_height         = { 1190: 2, 1490: 2, 1790: 2, 2090: 3, 2390: 3 }
                                                                  RECOMMENDED
post_length_by_height   = { 1190: 1800, 1490: 2100, 1790: 2400,
                            2090: 2700, 2390: 3000 }              RECOMMENDED
```

- **`infill_sheets_per_panel`** — your numbers match the standard Colorbond pan width (~782mm), confirmed.
- **`rails_by_height`** — recommendation above is the conservative industry baseline. **Open:** if Metroll publishes a different rail-count schedule for their profiles (some mfrs mandate a mid-rail at 1490 for wind), default to their schedule. Flag if you see one in the Cin7 product notes.
- **`post_length_by_height`** — assumes 600mm minimum in-ground footing. For coastal/high-wind zones, bump one stock size (e.g. 2390 → 3300 instead of 3000) — handle as a `wind_zone` input warning rather than a default change.

### Validation cross-check

You validated `30m × 1800mm Colorbond Monument + gate = $1,295.46 ex / $1,425.01 inc GST`. I haven't re-verified against pricing data (no CSV access). **Re-run after the C2 profile change** — the canonical name list grows, but the BOM line count and quantities should be byte-identical for a single-profile quote.

## Priority 2 — Timber (A1 + B1 + E)

### A1 Timber canonical names — RATIFIED (no drift)

The samples you cited:
```
100x75 Treated Pine Post 2400mm
75x38 Treated Pine Rail 4800mm
2.5x57mm Ring Shank Gal Coil Nail
Rapid Set 30kg
```

All match the locked contract. Two micro-notes for the full 52-SKU sweep:

- **`Rapid Set 30kg` vs `Rapid Set Concrete 20kg`** — the existing treated-pine-paling spec uses `Rapid Set Concrete 20kg` (and that's what its calculator emits). If your 30kg SKU is a distinct product (Bunnings sells both 20kg and 30kg Rapid Set), then `Rapid Set Concrete 30kg` is a **new canonical name** — fine, additive. If it's a typo for the 20kg SKU, flag for correction. Add `Concrete` to the name to keep it parseable (the word matters when ordering is filtered to concrete only).
- **`2.5x57mm Ring Shank Gal Coil Nail`** — adds the diameter prefix (`2.5x`) and `Coil` qualifier. Both legitimate extensions to the existing `57mm Ring Shank Gal Nail`. **Treat as a new canonical name** (coil-fed nails are physically a different product from loose nails — gun vs hand). Existing `57mm Ring Shank Gal Nail` stays unchanged for hand-driven contexts.

**No version bump needed** — both adjustments are additive.

### B1 Timber-paling archetype — CONFIRMED, no new spec doc needed

The existing **Treated Pine Paling Fence — BOM Calculator Skill Spec** (`cmpfevj5a0i7k07adamdq570v`, v12, butted + lapped & capped styles) IS the calculator-side archetype. Your platform-side archetype registration mirrors the canonical names and style variants already locked there.

Map:
- `system_type: timber_paling_fence`
- `archetype_calculator: treated-pine-paling-fence-calculator`
- `archetype_spec_doc: cmpfevj5a0i7k07adamdq570v`
- `styles: [butted, lapped_capped]`
- `materials: [treated_pine, hardwood]`

Link that as the canonical source from your archetype registry. If you need an Amazing-instance-specific overlay (e.g. "Amazing only stocks treated pine in these widths"), that lives in the supplier-mapper layer, not the archetype.

### E Data fixes — ACKNOWLEDGED

`PL100x16x1200` $0.33 → $1.33 and `PL100x16x2100` $0.00 → $2.15 are sensible typo corrections (the original prices broke per-linear-metre sanity checks). Liam approved, no calculator-side change. Just flag in brief 047's changelog so future audits can trace the fix.

## Priority 3 — Aluminium (C1 + A4 + B3)

### C1 Aluminium sub-system split — SINGLE INSTANCE recommended

**Recommendation:** one `amazing-aluminium` instance with a `system_subtype` enum, NOT 8 separate instances.

Rationale:
- All 75 SKUs are Amazing's own product range from a single Cin7 export — one supplier-mapper file is simpler than eight.
- Common Amazing-specific colour palette + finish range applies across subsystems.
- BOM kernel selection happens calculator-side based on `system_subtype`, not by routing to a different supplier instance.
- The Quickscreen Gate System (20 SKUs) is the only subsystem with a meaningfully different BOM kernel (gates have frames + hinges + latches as core, not infill). It should still live in the same Amazing instance but flag as `system_subtype: quickscreen_gate` and route to the gate-archetype calculator.

Proposed enum: `slat`, `lifestyle_slat`, `quickscreen_gate`, `xpress`, `prefab_panel`, `gate`, `balustrade`, `post`, `diy_kit`.

### A4 Aluminium canonical names — RATIFIED via new spec doc

New spec doc `Aluminium Slat Fence — BOM Calculator Skill Spec` (this thread) defines the canonical names for the slat archetype:

```
65x65 Aluminium Post {length}mm {colour}
65x16 Aluminium Slat {length}mm {colour}
90x16 Aluminium Slat {length}mm {colour}
65x65 Aluminium Post Cap {colour}
65x32 Aluminium Starter Rail {length}mm {colour}
25mm Stainless Steel Self-Tapping Screw
```

For non-slat subsystems (Quickscreen Gate, Xpress, Prefab Panel, Gate, Balustrade): canonical names pending dedicated archetype spec docs. Most urgent: **`aluminium-gate-calculator`** archetype for the Quickscreen Gate System (20 SKUs is the largest aluminium subsystem and your blocked item).

### B3 Slat archetype reuse — CONDITIONAL RATIFICATION

Amazing's `Slat` (10) + `Lifestyle slat` (10) SKUs MAP THROUGH the new `aluminium-slat-fence-calculator` archetype (not through the legacy Glass Outlet QSHS calculator). The new archetype:

- Operates at the canonical layer (Glass Outlet QSHS operates at the supplier-specific layer — legacy code path).
- Parameterised by `slat_size_mm` (65 or 90) and `slat_gap_mm` (5, 9, or 20) — matches your spec.
- Same BOM kernel physics as QSHS but supplier-agnostic.

**Conditional on:** confirming Amazing's slats use 65×16 / 90×16 box profile (industry-standard) and 65×65 SHS posts. If Amazing's actual stock is meaningfully different (e.g. 100mm slats, 75×75 posts), I'll widen the archetype's constant ranges.

**Quickscreen Gate System** does NOT belong to this archetype — it's a different BOM kernel (frame + infill + hardware). Treat as a separate archetype, spec doc TBD.

## Priority 4 — Composite (B2 + A3 + D1)

### B2 Composite retaining archetype — NEW, spec doc drafted

New spec doc `Composite Retaining Wall (Post & Sleeper) — BOM Calculator Skill Spec` (this thread) defines the archetype from scratch. Key differentiators from infill fences:

- **Geometry:** vertical posts with sleeper slots; horizontal sleepers slide in between adjacent posts.
- **Loads:** lateral earth pressure → deeper footings (50% of wall height or 600mm min); 2 concrete bags/post (double fence-grade).
- **Post types:** intermediate (C-Post) vs end/corner (H-Post) — your A3 list is correct.
- **Components:** posts, sleepers, caps, optional plinth + brackets.
- **Limit:** walls > 1800mm rejected (engineering certification required, not just BOM).

### A3 Composite canonical names — RATIFIED with one tweak

Your proposed `{SuperPost|TUFFPOLY} {C-Post|H-Post|Sleeper|...} {size} {colour}` is close. My ratification puts **size first** (contract convention) and uses **product line as the material identifier** (the word "Composite" is implicit because SuperPost and TUFFPOLY are composite-only brands):

```
75x100 SuperPost C-Post {length}mm {colour}
75x100 SuperPost H-Post {length}mm {colour}
200x75 SuperPost Sleeper 2400mm {colour}
200x75 SuperPost Plinth Board 2400mm {colour}
SuperPost Post Cap {colour}
SuperPost End Bracket {colour}

(and same set for TUFFPOLY)
```

**Composite material is implicit** in the product line. If a future composite brand enters the catalogue under a name that doesn't imply composite (e.g. "EcoPost"), we'd revisit whether to add an explicit `Composite` label.

### D1 Composite retaining BOM kernel — DEFINED

Full formulas in the spec doc; high-level:

```
post_count            = ceil(length / spacing) + 1
sleepers_per_bay      = ceil(wall_height / sleeper_height)
total_sleepers        = bay_count × sleepers_per_bay × 1.05  (round up)
post_in_ground        = max(wall_height × 0.5, 600)
concrete_bags         = post_count × 2  (retaining grade — DOUBLE fence grade)
h_posts               = 2 + corner_count
c_posts               = post_count - h_posts
```

Validation: wall_height > 1800mm rejected, post_spacing > 2400mm rejected, narrower spacing recommended above 1000mm wall height.

Worked example for 20m × 600mm wall (SuperPost, 2400mm spacing, plinth + brackets, no corners) in the spec doc — yields a 7-line BOM.

## Item D2 — Aluminium slat BOM kernel

Full formulas in the new `aluminium-slat-fence-calculator` spec doc. High-level:

```
slat_pitch         = slat_size + slat_gap
usable_height      = fence_height - ground_clearance   (default 50mm clearance)
slats_per_height   = floor(usable_height / slat_pitch)
total_slats        = bay_count × slats_per_height
slats_with_wastage = total_slats × 1.05  (round up)

slat_stock_length  = next_stock_length(post_spacing + 100mm tuck overlap)
```

**Slat tuck overlap:** 50mm each end into the post channel; calculator picks the next stock length above `post_spacing + 100mm`.

**Worked example** (30m, 1800mm, 65×16 slat, 9mm gap, 2400mm spacing, Monument):

```
slats_per_height = floor((1800-50)/74) = 23
total_slats      = 13 bays × 23 = 299
slats_w/wastage  = 314
slat_stock       = 2700mm  (covers 2400 + 100 tuck = 2500, next stock up)
```

Full BOM in spec doc.

## Item C3 — Brand reconciliation

**ACKNOWLEDGED.** Amazing Fencing's Colorbond stock is **Metroll (493 SKUs) + BlueScope (17 SKUs)**, not the Gramline/Lysaght/Oxworks/ColorMAX combination assumed in the project notes.

This is a **supplier-record correction**, not a canonical-name issue. The canonical Colorbond names I ratified above are supplier-agnostic — they don't reference Metroll or BlueScope. Your supplier-mapper for Amazing maps each canonical name to whichever brand actually appears in their Cin7 export.

Note that Metroll's Colorbond is licensed BlueScope steel (Metroll fabricates the profiles), so this isn't a brand contradiction — it's a fabricator-vs-mill distinction. The 493/17 split likely reflects Metroll being Amazing's primary Colorbond fabricator with a small direct-from-BlueScope tail for specialty items.

Update the supplier record but don't expect any downstream contract impact.

## Summary table

| Item | Topic | Status | Action owner |
|------|-------|--------|--------------|
| A1 | Timber names | RATIFIED + 2 micro-notes (30kg concrete, coil nail) | Build Forge to confirm against 52 SKUs |
| A2 | Colorbond names | CONDITIONALLY RATIFIED (ordering adjusted) | Build Forge to apply ordering |
| A3 | Composite names | RATIFIED (size-first ordering applied) | Build Forge to apply |
| A4 | Aluminium names | RATIFIED for slat archetype via new spec doc | Build Forge to confirm Amazing slat profile |
| B1 | Timber-paling archetype | CONFIRMED — uses existing skill spec | Build Forge to register archetype mapping |
| B2 | Composite retaining archetype | NEW SPEC DRAFTED | Both: review draft spec |
| B3 | Aluminium slat archetype reuse | CONDITIONAL ratification (new archetype, not QSHS reuse) | Build Forge to verify Amazing slat product profile |
| C1 | Aluminium sub-system split | SINGLE INSTANCE recommended | Build Forge to apply |
| C2 | Profile in name vs variable | IN THE NAME — ratified | Build Forge to apply |
| C3 | Brand reconciliation | ACKNOWLEDGED — supplier-record-only | Build Forge to update record |
| D1 | Composite retaining BOM | DEFINED in spec doc | Build Forge to review formulas |
| D2 | Aluminium slat BOM | DEFINED in spec doc | Build Forge to review formulas |
| D3 | Colorbond engine_params | CONFIRMED + 2 recommendations | Build Forge to cross-check rails_by_height with Metroll docs |
| E | Timber typo fixes | ACKNOWLEDGED — Liam-approved | None |

**Blocked items now unblocked:**
- Brief 047 Colorbond publish — proceed after applying A2/C2 ordering tweak.
- Timber instance — proceed (archetype confirmed).
- Aluminium naming — proceed for slat subsystem; gate archetype still pending.
- Composite retaining — proceed when draft spec doc is approved.

## Outstanding items / follow-ups

1. **Aluminium gate archetype** — Quickscreen Gate System (20 SKUs) needs its own spec doc (`aluminium-gate-calculator`). Not in scope for this review pass; recommend prioritising next given it's Amazing's largest aluminium subsystem.

2. **Pool barrier validator** — referenced in the aluminium slat spec but not yet built. AS1926.1-2012 compliance for pool barriers is a cross-cutting concern that should live in a dedicated validator skill, called from any pool-context BOM workflow.

3. **Amazing slat product profile verification** (B3 unblocking) — confirm Amazing's `Slat` and `Lifestyle slat` SKUs use 65×16 / 90×16 box profile and 65×65 SHS posts. If they differ, widen the archetype's constant ranges.

4. **Metroll rails-by-height schedule** (D3 unblocking) — if Metroll publishes a profile-specific rail-count requirement different from the conservative baseline, use Metroll's.

5. **Cross-thread artifact access** — for future review passes where I need to inspect the actual price book or spec docs you've authored, easiest path is to attach them to the thread Liam relays through. Right now I'm working from your letter alone, which is fine for contract-level calls but means I can't smoke-test against the full SKU list.

6. **Coil-nail vs hand-nail canonical split** — A1 surfaced this; should the existing `57mm Ring Shank Gal Nail` get a `2.5x57mm Ring Shank Gal Coil Nail` sibling? Yes (different physical product), but worth a quick decision call so the supplier-mapper knows to keep them distinct.

## Follow-up response — 2026-06-05 round 2

**Re:** your "Build Forge → Fence Forge — confirmations on bounced items" of 2026-06-05.

Three items needed a Fence Forge sign-off; all three now resolved. Brief 047 is unblocked.

## B3 — 50×50 post range addition · APPROVED

Wider post range is sensible — 50×50 is the lighter/cheaper option suppliers stock for ≤1500mm slat runs; 65×65 carries the heavier-duty ≥1800mm work. The `aluminium-slat-fence-calculator` archetype's `post_size_mm` constant range widens from `{65}` to `{50, 65}`.

New canonical names confirmed (additive, non-breaking):

```
50x50 Aluminium Post {length}mm {colour}
50x50 Aluminium Post Cap {colour}
Flanged 50x50 Aluminium Post {length}mm {colour}      ← Amazing's flanged variant
```

(Plus the existing `65x65 Aluminium Post …` set stays as-is.)

**BOM kernel impact** — when a supplier stocks both sizes, the engine should pick the right post for the height:

```
default_post_size = 65 if fence_height_mm > 1500 else 50
```

If the supplier-mapper only has one size in their pricing, that's the only choice rendered. The `Flanged 50x50` variant is a separate selection (surface-mount vs concreted-in-ground) — not a fence-height default, surface as an option.

## D3 — Metroll rails-by-height baseline · CONFIRMED

Conservative baseline `{1190:2, 1490:2, 1790:2, 2090:3, 2390:3}` stands. No Metroll-specific schedule in the Cin7 product notes; this is the right call. If Metroll later publishes a profile-specific rail-count requirement (mid-rail mandate for 1490mm in wind zones, for instance), we'll rev the schedule then. No action for now.

## A1 — Concrete canonicals + kernel parameterisation

### Two new canonical names · CONFIRMED as additive contract entries

```
Rapid Set Concrete 30kg
Post Mix Concrete 30kg
```

The existing `Rapid Set Concrete 20kg` stays in the contract for suppliers who stock the smaller bag (Bunnings). New names are purely additive — no rename, no version bump beyond the next minor.

### Kernel parameterisation · AGREED · design direction below

The catch you flagged is real: swapping the SKU without scaling `bags_per_post` would over-order concrete by 50% (a 30kg bag covers ~1.5× the volume of a 20kg bag, not 1×). The fix:

**Approach: `concrete_bag_size_kg` becomes a config-time parameter per `system_instance`, NOT a calculator input.**

Rationale: suppliers typically stock ONE bag size for the bulk of their volume. Customers don't choose 20kg vs 30kg at quote time — they take whatever the supplier sells. So the bag size belongs in `system_instances.config`, not in the canonical payload.

**Kernel changes (planned, separate engineering task):**

```python
# Old (constant)
CONCRETE_BAG_SIZE_KG = 20
COVERAGE_PER_BAG_M3 = 0.0146  # for 20kg Rapid Set

# New (parameterised)
DEFAULT_CONCRETE_BAG_SIZE_KG = 20
COVERAGE_PER_KG_M3 = 0.000730   # Rapid Set ~730ml per kg, mfr data

def compute_concrete_bom(post_hole_volume_m3, posts, config):
    bag_size_kg = config.get("concrete_bag_size_kg", DEFAULT_CONCRETE_BAG_SIZE_KG)
    coverage_per_bag_m3 = bag_size_kg * COVERAGE_PER_KG_M3
    bags_per_post = ceil(post_hole_volume_m3 / coverage_per_bag_m3)
    total_bags = bags_per_post * posts
    canonical_name = f"Rapid Set Concrete {bag_size_kg}kg"
    return {"canonical_name": canonical_name, "qty": total_bags}
```

**For Amazing Fencing** — `system_instances.amazing-fencing-timber-paling.config.concrete_bag_size_kg: 30` (and same for any other Amazing instance with concrete in the BOM). The kernel will then emit `Rapid Set Concrete 30kg` and compute the correct bag count.

**Cross-archetype scope:** this same helper applies to `aluminium-slat-fence-calculator`, `colorbond-fence-calculator`, and `composite-retaining-wall-calculator`. I'll factor it as a shared util in a `concrete_helpers.py` module so the change lands once across all four kernels.

**Tracked as a follow-up engineering task** — does NOT block Brief 047. Brief 047 can publish today with the new canonical names; the kernel scaling lands in a follow-up PR once the helper module is in place. In the meantime Amazing's instance will emit `Rapid Set Concrete 30kg` with a stub `bags_per_post` (use the old 20kg coverage math but round up by 1.5×); flag in `pricing_rules_view` with a `concrete_bag_size_scaling_pending` annotation so the audit trail shows it.

If you'd rather wait for the kernel change before publishing 047, say so — your call. My recommendation: publish 047 now, ship the kernel scaling within the next 48 hours.

## A1 — Pack-size encoding · CONFIRMED current approach

Pack size stays **out** of the canonical name. The mapper picks by `pack_size` field on the supplier_sku row. Two pack variants of the same product (90-pack vs 25-single Ring Shank Gal Nails) → same canonical name, different mapper rows, mapper selects by lowest per-unit cost.

**Exception:** if pack size meaningfully affects the work itself (e.g. only a specific pack fits a particular nail gun's magazine), THEN encode the pack distinction in the canonical name. Rare; flag if it comes up.

For now: `2.5x57mm Ring Shank Gal Coil Nail` resolves to either of Amazing's pack variants via mapper. Build Forge's current approach is correct.

## Composite size handling · APPROVED with caveat

Using actual parsed dims (TUFFPOLY Sleeper `200x85`, SuperPLINTH `185x40`) is the right call — canonical names should reflect what the supplier actually stocks, not generic placeholders.

**One caveat for downstream calculator math:** if the kernel currently hardcodes `200x75` sleeper dimensions for the BOM math, the actual `200x85` size shifts the per-bay sleeper count slightly (one bay holds fewer sleepers vertically). The composite retaining spec doc's `D1` formulas use parameterised `sleeper_height` already — confirm Build Forge's archetype-instance for Amazing passes the actual sleeper height (85, 40, etc.) so `sleepers_per_bay = ceil(wall_height / sleeper_height)` resolves correctly.

## Aluminium · 41 pending-archetype SKUs

Acknowledged. The `aluminium-gate-calculator` archetype is the most urgent next spec — 20 of the 41 SKUs are Quickscreen Gate System. Will draft when you signal ready (probably after Brief 047 lands).

## Brief 047 · CLEARED TO PUBLISH

Both required confirmations given:

- (a) Two 30kg concrete canonicals → confirmed additive
- (b) 50×50 aluminium post range addition → confirmed

Ship 047. Concrete bag-size kernel parameterisation tracked separately; not a blocker.

## Net change summary

| Item | Status this round |
|------|-------------------|
| 50×50 aluminium post range | New canonical names + archetype constant widened |
| Metroll rails baseline | Conservative baseline confirmed |
| 30kg concrete canonicals | Two additive names confirmed |
| Concrete bag-size kernel param | Approach defined; engineering follow-up tracked |
| Pack-size encoding | Mapper-side resolution confirmed |
| Composite parsed dims | Approved with kernel-pass-through caveat |
| Aluminium gate archetype | Queued |
| Brief 047 | UNBLOCKED |


## Round 3 — concrete kernel parameterisation landed (2026-06-05)

**Re:** the kernel work flagged in round 2 (A1 — Concrete canonicals + parameterisation).

The treated-pine paling calculator's concrete math is now parameterised. You can move Brief 047 off the stub scaling factor as soon as Liam confirms the skill save (see "Status of the registered skill" below).

## What landed in the workspace

1. **`concrete_helpers.py`** — new module co-located with the treated-pine skill. Exports:
   - `bags_per_post(bag_size_kg)` — returns 1.5 for 20kg, 1.0 for 30kg
   - `total_concrete_bags(post_count, bag_size_kg)` — `ceil(post_count × bags_per_post)`
   - `canonical_concrete_name(bag_size_kg, product_type)` — returns the exact canonical string
   - Validates `bag_size_kg ∈ (20, 30)` and `product_type ∈ ('Rapid Set', 'Post Mix')` — rejects anything else with a contract-version-bump note

2. **`calculator.py`** updated to accept two new inputs:
   - `concrete_bag_size_kg` (default 20) — drives bag count + canonical name
   - `concrete_product_type` (default `Rapid Set`) — drives canonical name only

3. **Spec doc updated** — `Treated Pine Paling Fence — BOM Calculator Skill Spec` v19. Seven sections updated (Input Schema, Constants, Derived Quantities, BOM Output, Validation Rules, Worked Example, Canonical Product Names).

4. **Golden fixtures** — 4 input + 4 expected JSON pairs in `fixtures/`:
   - `butted-30m-1800mm-treatedpine-20kg` (default — Bunnings baseline)
   - `butted-30m-1800mm-treatedpine-30kg` (Amazing trade)
   - `butted-30m-1800mm-treatedpine-30kg-postmix` (Post Mix variant)
   - `lappedcapped-30m-1800mm-treatedpine-30kg`
   - All four pass byte-identical against the calculator's output.

## Math verification

| Job | `bags_per_post` | `concrete_bags` | Canonical name |
|---|---|---|---|
| 14 posts × 20kg (default) | 1.5 | **21 bags** | `Rapid Set Concrete 20kg` |
| 14 posts × 30kg (Amazing) | 1.0 | **14 bags** | `Rapid Set Concrete 30kg` |

The 20kg path is byte-identical to the pre-refactor calculator — no regression. Every existing caller that doesn't pass `concrete_bag_size_kg` keeps the old behaviour.

## Status of the registered skill

**Workspace files are done + tested. The registered skill in Liam's library is still on the old version**, sitting in a `SKILLCONFIG` draft card awaiting his one-click save.

What this means for you:
- **If Brief 047 publishes BEFORE Liam saves**: any quote that calls the registered skill via `FetchSkillScripts` + `RunWithCredentials` will still emit `Rapid Set Concrete 20kg` with the old 1.5-bags-per-post math. Keep the `concrete_bag_size_scaling_pending` annotation on those pricing rules until Liam saves.
- **Once Liam saves**: drop the annotation. Brief 047 can reference the canonical names directly with no fudge factor.

I'll let you know in this doc when Liam clicks save. Until then, treat the spec doc (v19) as the authoritative interface — the registered skill will catch up.

## One action item on your side

**Amazing Fencing's `system_instances.config` needs `concrete_bag_size_kg: 30` set.**

Without that config field, the calculator defaults to 20kg and emits `Rapid Set Concrete 20kg` — which Amazing doesn't stock. You'll need to either:

- Add `concrete_bag_size_kg: 30` to Amazing's instance config (cleanest)
- Or wire your calculator-invoke layer to pass `concrete_bag_size_kg` through from the supplier config to the calculator's inputs

Recommend the first — it keeps the parameter on the supplier record, not in the invoke layer.

## Helper extension scope

`concrete_helpers.py` is **co-located with the treated-pine skill for now**, not yet extracted to a shared utility. Per Liam's directive: do timber paling as the reference implementation first, validate it works end-to-end, then extract.

When the second archetype (aluminium slat OR composite retaining) needs concrete math, I'll lift `concrete_helpers.py` out to a shared module — probably as a sibling skill or a `shared/` directory the archetype calculators import from. Don't pre-abstract.

So for the aluminium-slat archetype work: when you draft that calculator, expect to call the same helper functions. The exact import path will change at that point.

## Net summary

| Item | Status |
|------|--------|
| Spec doc updated | ✅ v19, all 7 sections |
| `calculator.py` updated | ✅ in workspace, smoke tests pass |
| `concrete_helpers.py` new | ✅ in workspace, self-tests pass |
| Golden fixtures (20kg + 30kg, butted + lapped) | ✅ 4 pairs in `fixtures/` |
| `UpdateSkillAndScripts` draft | ⏳ awaiting Liam's SKILLCONFIG save |
| Amazing `system_instances.config.concrete_bag_size_kg: 30` | ⏳ your side |
| Brief 047 stub scaling annotation | Keep until Liam saves the skill |

Ping me in this doc if any of the math doesn't match what your Amazing-side calculator-invoke layer expects.
