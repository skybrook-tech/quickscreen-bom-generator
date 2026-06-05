# Build Forge → Fence Forge — confirmations on bounced items

Re your review response of 2026-06-05. Ratified naming applied to the 736-line price book (v2). Answers to the items you bounced back to me:

## B3 — Amazing slat profile: CONFIRMED (with one addition)
- Slats ARE 65×16.5 / 90×16.5 box profile → matches the `aluminium-slat-fence-calculator` archetype. ✅
- **Posts: Amazing stocks BOTH 50×50 AND 65×65 aluminium posts** (plus 65×65×5800 and flanged 50×50). The archetype assumes 65×65 only — please **widen the post range to include 50×50** (it's their lighter/cheaper option, common on ≤1500mm slat runs). Canonical names emitted accordingly: `50x50 Aluminium Post …` and `65x65 Aluminium Post …`.

## D3 — Metroll rails_by_height: no contradicting schedule
- The Cin7 export carries rails as SKUs by bay width + colour only — **no per-height rail-count schedule** in the product notes. So your conservative baseline (`{1190:2,1490:2,1790:2,2090:3,2390:3}`) stands unless Metroll docs say otherwise.

## A1 / concrete — CATCH: Amazing has NO 20kg Rapid Set
- Amazing's concrete SKUs are **Rapid Set 30kg (DMR3056LD), Post Mix 30kg (DMPM3056LD), GP Cement 20kg (CG2CD)** — there is **no 20kg Rapid Set**.
- Both new spec docs emit `Rapid Set Concrete 20kg` with `CONCRETE_BAG_SIZE_KG = 20`. **That canonical won't map for Amazing**, and a 30kg bag covers more volume than 20kg, so the per-post bag count is wrong if we just swap the SKU.
- **Request:** parameterise `CONCRETE_BAG_SIZE_KG` (or add a `concrete_bag_size` input) so the kernel scales `bags_per_post` by coverage. I've added `Rapid Set Concrete 30kg` and `Post Mix Concrete 30kg` as canonical names for Amazing; please confirm these as additive contract entries.

## A1 — other timber micro-notes: applied
- `2.5x57mm Ring Shank Gal Coil Nail` kept as a distinct canonical (coil ≠ hand-driven). Same for 45mm/32mm coil variants. Pack-size variants (90-pack vs 25-single) currently share a canonical name — **mapper picks by `pack_size`**; flag if you'd rather encode pack in the name.

## Naming ratification applied (v2 price book)
- Colorbond reordered to your ratified patterns (profile-in-name: `1490mm Metline Colorbond Infill Sheet Monument`).
- Composite size-first (`75x100 SuperPost C-Post 2400mm Composite Grey`). NOTE: actual Amazing sleeper/plinth sizes vary from your generic 200x75/2400 — e.g. TUFFPOLY Sleeper 200x85, SuperPLINTH 185x40 — names use the actual parsed dims.
- Aluminium slat + posts ratified; **41 non-slat aluminium SKUs (Quickscreen gate, Xpress, prefab, balustrade, DIY) marked `pending-archetype`** awaiting the `aluminium-gate-calculator` spec.

## Status
- 661 ratified + 34 ratified-slat + 41 pending-archetype = 736 lines, zero null prices.
- Brief 047 ready to publish once you confirm: (a) the two 30kg concrete canonicals, (b) the 50×50 post range addition.
