# Brief Inventory — quickscreen-colorbond-generator

| # | Title | Status | PR | Notes |
|---|---|---|---|---|
| 028 | Multi-supplier foundation housekeeping | in-progress | — | This brief |
| 032 | Supplier + Archetype + Instance schema | inbox | — | Depends on 028 |
| 033 | Data backfill — Glass Outlet supplier + archetypes + instances + provenance | inbox | — | Depends on 032 |
| 034 | Versioned price books + quote pinning | inbox | — | Depends on 033 |
| 035 | Admin UI — Suppliers + Instances CRUD | inbox | — | Depends on 033 |
| 036 | Admin UI — Products CRUD + bulk CSV/Cin7 import | inbox | — | Depends on 035 |
| 037 | Admin UI — Rule authoring (template + data) | inbox | — | Depends on 036 |
| 038 | Workbook regression upload + diff | inbox | — | Depends on 037 |
| 039 | User-scoped authoring + RLS | inbox | — | Depends on 035 |
| 040 | Community publication path | inbox | — | Depends on 038 + 039 |
| 041 | Quality reports + demotion automation | inbox | — | Depends on 040 |
| 042 | Discount Fencing — supplier + system instances (6 instances incl. aluminium slat gate) | inbox | — | Depends on 033 |
| 043 | Discount Fencing — seed data + price book v1 (3 seeded instances: timber, aluminium pool, slat gate) | inbox | — | Depends on 042 + 034 |
| 044 | Platform org + visibility layer (Layer 5) | inbox | — | Depends on 043 |
| 045 | Amazing Fencing — supplier + system instances (6 instances: ColorBond, PermaSteel, timber paling, slat screen, chainwire, retaining wall) | inbox | — | Depends on 033 |
| 046 | Amazing Fencing — seed data + PUBLISHED tier2 trade price book (6 instances; ~40 SKUs priced from Cin7 export; ColorBond/PermaSteel/slat/chainwire pricing pending) | inbox | — | Depends on 045 + 034 |

## Pre-release Antigravity branches (not in the brief queue)

| Branch | Commit | Status |
|---|---|---|
| `codex/brief-031-run-section-gate-ui-consistency` | dec7b59 | Awaiting PR from Liam |
| `codex/glass-outlet-calculator-rollout-setup` | 4b2d70a | Superseded by brief 028 (architecture docs now land via this brief) |
| `codex/qsg-sliding-gates-calculator` | 7c955a2 | Awaiting PR + workbook regression |

See `_briefs/03-paused/PRE-RELEASE-ANTIGRAVITY-BRANCHES.md` for the review plan.

## Stop points encountered

(empty)
