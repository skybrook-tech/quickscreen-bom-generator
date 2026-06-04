# 05 — Australian Fence Compliance Rules

These are **legal constraints**, not preferences. The engine evaluates a config's `compliance[]` rules before a quote finalises. Enforcement levels:

- **`block_quote`** — hard stop. The engine must refuse to finalise a non-compliant quote.
- **`warn`** — surface a prominent warning; allow override with acknowledgement.
- **`advisory`** — informational note (e.g. a calculated zone the installer should check on site).

> Liability note: pool-fencing non-compliance is a real liability vector for the platform. `block_quote` rules must be genuinely un-bypassable in the quote flow, and the consumer marketplace needs T&Cs + a verification layer on top.

---

## AS1926.1-2012 — Swimming pool barriers (NON-NEGOTIABLE)

| Rule | Value | Enforcement |
|---|---|---|
| Minimum barrier height | **1200mm** | block_quote |
| Maximum gap below barrier | **100mm** | block_quote |
| Maximum vertical gap between members | **100mm** | block_quote (warn if 90–100mm) |
| Non-climbable zone | **900mm** horizontal arc outside barrier, no footholds | advisory (installer verifies on site) |
| Gate — self-closing AND self-latching | required | block_quote |
| Gate — opens **OUTWARD**, away from pool | required | block_quote |
| Latch height | **≥1500mm** above ground (or shielded) | block_quote |
| Glass panels | **12mm Grade A toughened** (AS2208), 1200mm fixed height standard | block_quote |

**AS1926-compliant defaults for pool gates:** the **MagnaLatch + TruClose Hinges Safety Kit** (~$99.55) is the default `gate_kit` for every pool gate. Spigots: 95×95 chisel (SS ~$169 / Black ~$199) or 60×128 slimline (~$189).

---

## AS3959-2018 — Bushfire (BAL ratings)

| BAL rating | Timber/combustible fencing |
|---|---|
| **BAL-FZ (Flame Zone)** | **Prohibited** within 6m of a habitable building — block_quote for combustible materials |
| BAL-40 / BAL-29 | Caution on timber — warn; prefer steel/aluminium/masonry |
| BAL-19 / BAL-12.5 | Timber generally permitted — advisory |

The engine should accept a job's BAL context and block combustible fence configs in BAL-FZ within 6m of the dwelling.

---

## AS/NZS 1604 — Timber treatment

- **H3 (CCA)** — above-ground use (palings, rails, capping).
- **H4** — in-ground use (posts). A timber paling fence config must specify H3 for above-ground members and H4 for posts; flag mismatches as `warn`.

---

## Council height caps (most LGAs)

| Boundary | Typical max without a DA |
|---|---|
| Front boundary | **1200mm** |
| Side / rear boundary | **1800mm** |

Taller requires a Development Application. Enforcement: `warn` (council rules vary by LGA — surface, don't hard-block).

---

## State Fences Acts — neighbour consent (dividing fences)

| State | Act |
|---|---|
| NSW | Dividing Fences Act 1991 |
| VIC | Fences Act 1968 |
| QLD | Neighbourhood Disputes (Dividing Fences and Trees) Act 2011 |
| (other states have equivalents) | |

For a **new dividing fence** or a material change: neighbour notice/consent is required, and cost is typically **50/50** for a "sufficient dividing fence" standard. Enforcement: `advisory` (surface as a step in the consumer/contractor flow, not a quote blocker).

---

## Footings

Minimum post-hole depth **600mm** (more in expansive clay or high-wind zones). Enforcement: `advisory` in the BOM/installation notes.

---

## How this maps into `compliance[]`

Each rule in a config:
```jsonc
{
  "rule_id": "as1926_min_height",
  "standard": "AS1926.1-2012",
  "value": { "min_height_mm": 1200 },
  "enforcement": "block_quote",
  "user_message": "Pool barriers must be at least 1200mm high (AS1926.1-2012)."
}
```
The exported skill `skills/calculator-engine/au-fence-compliance-rules.md` is the full calculator-ready rule set with enforcement levels and user messages — use it to seed the `compliance[]` arrays per fence type (pool, timber, etc.).
