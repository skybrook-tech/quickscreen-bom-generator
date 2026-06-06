# Amazing Fencing — Antigravity handoff bundle

Everything produced for Amazing Fencing's pricing + calculator work, packaged for Google Antigravity.

**Start with `00-START-HERE-antigravity-prompt.md`** — paste it (or its substance) to Antigravity as the build prompt.

## Contents

```
00-START-HERE-antigravity-prompt.md   The build prompt — read first
README.md                              This index

briefs/
  brief_047_amazing_pricebook_v2.md    Publish-ready brief: Colorbond price book
                                       + 2 timber fixes + 30kg concrete canonicals.
                                       Fence-Forge-cleared. Drop into _briefs/00-inbox/.

seed-data/
  brief_047_seed_timber_colorbond.csv  620 lines (52 timber + 568 Colorbond) — the 047 seed
  amazing_fencing_pricebook_FULL_736.csv/.json  All 4 systems, 736 lines, ratified canonical
                                       names, status per line (ratified / ratified-slat /
                                       pending-archetype), tier-2 ex+inc GST
  per-system/
    amazing_colorbond_pricebook.csv    568 SKUs
    amazing_timber_pricebook.csv       52 SKUs
    amazing_composite_pricebook.csv    41 SKUs (SuperPost + TUFFPOLY)
    amazing_aluminium_pricebook.csv    75 SKUs (slat + gate + posts + ...)

specs/                                 NEW archetype specs (Fence Forge)
  aluminium-slat-fence-calculator-spec.md
  composite-retaining-wall-calculator-spec.md

fence-forge-correspondence/            Canonical-name ratification trail
  01-build-forge-review-request.md
  02-fence-forge-response-rounds-1-3.md   (the authority on all naming decisions)
  03-build-forge-confirmations.md

context/
  Amazing-Fencing-JobFlow-System.docx     Their full Channel-2 SaaS scope
  supabase-workflow-approach-comparison.md Ship-mechanism governance (brief queue)
```

## Data lineage

- Timber pricing: Cin7 export `MassDownloadProducts_20260526_0305PM.xlsx` (52 SKUs).
- Colorbond/composite/aluminium: 11× Cin7 exports `MassDownloadProducts_20260603_*` (1,225 products → deduped per system).
- Tier-2 = Cin7 `BuyPriceEx` (ex-GST). GST inc = ex × 1.10.
- Price fixes (Liam-approved): paling 1200mm $0.33→$1.33; 2100mm $0.00→$2.15.

## Status at handoff

| System | SKUs | Canonical status | Brief |
|---|---|---|---|
| Colorbond | 568 | ratified | 047 (cleared) |
| Timber | 52 | ratified (contract) | 047 (cleared) |
| Composite | 41 | ratified | 048 (pending archetype) |
| Aluminium slat | 34 | ratified-slat | 049 (pending archetype) |
| Aluminium other | 41 | pending-archetype | 050 (gate spec TBD) |

Open with Liam: queue Brief 047; save the treated-pine SKILLCONFIG draft (drops the concrete annotation).
