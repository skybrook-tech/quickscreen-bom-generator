---
skill: au-fence-compliance-rules
id: cmpnfyyzq00h406adfhiseb2k
description: Australian fence compliance reference: AS1926.1-2012 (pool barriers), H3/H4 timber treatment, AS3959 BAL bushfire restrictions, state-specific Fences Act requirements, council height caps. Calculator-ready rule set with enforcement levels (block_quote / warn / advisory) so a quoting engine can refuse non-compliant quotes before they reach the customer.
whenToUse: 
tags: 
---

# AU Fence Compliance Rules

Complete reference for Australian fence compliance, structured for ingestion by a calculator engine. Each rule has an `enforcement` level so the calculator knows whether to block a quote, warn, or advisory-flag.

## Enforcement levels

| Level | Behavior in calculator |
|-------|------------------------|
| `block_quote` | Refuse to produce a quote. Show the user the rule that was violated and the corrective action. |
| `warn` | Produce quote but show a yellow banner — user must explicitly acknowledge before printing. |
| `advisory` | Show in a "things to know" sidebar; doesn't block anything. |

## Pool barriers — AS1926.1-2012

Mandatory for all swimming pool enclosures in Australia. State variations exist but AS1926.1 is the baseline everywhere.

```json
{
  "pool_fence": [
    {"rule": "min_height", "value_mm": 1200, "enforcement": "block_quote",
     "message": "Pool fence must be at least 1200mm high (AS1926.1)."},
    {"rule": "max_gap_below", "value_mm": 100, "enforcement": "block_quote",
     "message": "Gap below fence must be ≤100mm (AS1926.1)."},
    {"rule": "max_vertical_gap", "value_mm": 100, "enforcement": "block_quote",
     "message": "Vertical gap between members must be ≤100mm (AS1926.1)."},
    {"rule": "non_climbable_zone", "value_mm": 900, "enforcement": "advisory",
     "message": "900mm non-climbable zone required outside fence — no footholds within this arc."},
    {"rule": "gate_self_closing", "value": true, "enforcement": "block_quote",
     "message": "Pool gate must be self-closing (AS1926.1)."},
    {"rule": "gate_self_latching", "value": true, "enforcement": "block_quote",
     "message": "Pool gate must be self-latching (AS1926.1)."},
    {"rule": "gate_swing_direction", "value": "outward", "enforcement": "block_quote",
     "message": "Pool gate must open OUTWARD, away from the pool (AS1926.1)."},
    {"rule": "latch_min_height", "value_mm": 1500, "enforcement": "block_quote",
     "message": "Latch must be ≥1500mm above ground (or shielded) (AS1926.1)."},
    {"rule": "glass_thickness", "value_mm": 12, "enforcement": "warn",
     "message": "Glass panels should be 12mm Grade A toughened (industry standard)."}
  ]
}
```

**Default-compliant gate kit:** Bunnings stocks the MagnaLatch + TruClose Hinges Safety Kit ($99.55) which satisfies the self-closing, self-latching, and 1500mm latch-height rules in one product. Make this the default gate_kit on any pool fence quote.

## Timber boundary fences

```json
{
  "paling_fence": [
    {"rule": "treatment_above_ground", "value": "H3_CCA", "enforcement": "block_quote",
     "message": "Palings and rails must be H3 CCA-treated (above-ground exposure)."},
    {"rule": "treatment_in_ground", "value": "H4", "enforcement": "block_quote",
     "message": "Posts and any in-ground timber must be H4-treated."},
    {"rule": "min_post_depth", "value_mm": 600, "enforcement": "warn",
     "message": "Recommended minimum 600mm post-hole depth (more in expansive clay or windy zones)."}
  ]
}
```

### Bushfire — AS3959 BAL zones

| BAL zone | Timber fence allowed? | Enforcement |
|----------|------------------------|-------------|
| BAL-LOW, BAL-12.5, BAL-19 | Yes | advisory |
| BAL-29, BAL-40 | Caution — recommend non-combustible alternative within 6m of dwelling | warn |
| BAL-FZ (Flame Zone) | NO — combustible timber prohibited within 6m of dwelling | block_quote |

### State Fences Acts (neighbour consent for dividing fences)

| State | Act | Key obligation |
|-------|-----|----------------|
| NSW | Dividing Fences Act 1991 | Notice of work to neighbour; cost share usually 50/50 for "sufficient dividing fence" |
| VIC | Fences Act 1968 | Mediation via Dispute Settlement Centre of Victoria; cost share 50/50 |
| QLD | Neighbourhood Disputes Resolution Act 2011 | QCAT mediation; cost share 50/50 |
| WA | Dividing Fences Act 1961 | Magistrates Court for disputes |
| SA | Fences Act 1975 | Cost share 50/50 for "sufficient" fence |
| TAS | Boundary Fences Act 1908 | Similar 50/50 structure |
| ACT | Common Boundaries Act 1981 | Civil and Administrative Tribunal |
| NT | Fences Act | Similar |

Calculator behavior: surface the relevant state's act as an `advisory` linking to the act and a "draft your neighbour notice" template.

### Council height caps (typical — varies by LGA)

| Boundary | Typical max without DA |
|----------|-----------------------|
| Front boundary | 1200mm |
| Side/rear boundary | 1800mm |
| Heritage zones | 900mm front / 1500mm side (verify per LGA) |

Calculator behavior: `warn` if requested height exceeds the typical cap; provide link to the user's LGA fencing rules.

## Paling overlap math (BOM calculation, not a regulation)

```
cuts_per_run_metre = ceil(run_length_mm / (paling_width_mm - 6))
```

The 6mm subtraction accounts for the standard 6mm lap overlap convention. Example: 30m run with 150mm palings = ⌈30000 / 144⌉ = 209 palings (plus wastage allowance).

## Aluminium/Colorbond steel fences

No mandatory compliance beyond council height caps and Fences Act neighbour consent — these are the simplest fence type to quote because there's no equivalent of AS1926 or BAL. Bunnings/ProtectorAl post and panel specs are the de facto standard.

## How to wire into the Anyfence calculator engine

1. Load the compliance JSON for the active fence type at quote-start.
2. Run each rule against the user's inputs in priority order: `block_quote` first (fail fast), then `warn`, then `advisory`.
3. For `block_quote`, surface the offending input field with the error message and a suggested fix.
4. For `warn`, render a yellow acknowledgment banner above the BOM.
5. For `advisory`, render in a collapsible "things to know" sidebar.
6. Store the compliance run on the saved quote — auditors and contractors both ask for this trail.

## What's NOT in this skill

- US/UK/NZ fencing codes (out of scope)
- Commercial/industrial fencing (heavier specs — outside residential scope)
- Stormwater, easement, and survey overlay rules (geographic, not fence-specific)
