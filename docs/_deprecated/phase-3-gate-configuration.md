# Phase 3 — Gate Configuration

## Goal

Build the gate configuration UI — adding, editing, and removing gates — with "Match Gate to Fence" toggle and all gate-specific hardware options.

## Steps

1. Build `GateContext` with reducer
2. Build `GateForm`, `GateList`, `GateConfigPanel`
3. Implement "Match Gate to Fence" toggle
4. Implement add/edit/remove gate flow

## Components to Build

| Component | Description |
|-----------|-------------|
| `GateConfigPanel.tsx` | Gate configuration section wrapper |
| `GateForm.tsx` | Individual gate form |
| `GateList.tsx` | List of configured gates |
| `GateTypeSelect.tsx` | Single swing / double swing / sliding |

## Zod Schema

```typescript
// src/schemas/gate.schema.ts
export const GateSchema = z.object({
  id: z.string().uuid(),
  gateType: GateType.default('single-swing'),
  openingWidth: z.number().positive(),
  gateHeight: z.union([
    z.literal('match-fence'),
    z.number().min(600).max(2400),
  ]).default('match-fence'),
  colour: z.union([z.literal('match-fence'), Colour]).default('match-fence'),
  slatGap: z.union([z.literal('match-fence'), SlatGap]).default('match-fence'),
  slatSize: z.union([z.literal('match-fence'), SlatSize]).default('match-fence'),
  gatePostSize: GatePostSize.default('65x65'),
  hingeType: HingeType.default('dd-kwik-fit-adjustable'),
  latchType: LatchType.default('dd-magna-latch-top-pull'),
  matchFence: z.boolean().default(true),
});
```

## Context & Reducer

```typescript
// src/context/GateContext.tsx
type GateAction =
  | { type: 'ADD_GATE'; gate: GateConfig }
  | { type: 'UPDATE_GATE'; id: string; updates: Partial<GateConfig> }
  | { type: 'REMOVE_GATE'; id: string }
  | { type: 'SET_GATES'; gates: GateConfig[] }  // for canvas layout or quote load
  | { type: 'CLEAR_ALL' };
```

## Gate Hardware Reference Data

### Gate Types
| Value | Label |
|-------|-------|
| `single-swing` | Single Swing Gate |
| `double-swing` | Double Swing Gate |
| `sliding` | Sliding Gate |

### Post Sizes
| Value | Label | Warning |
|-------|-------|---------|
| `50x50` | 50×50mm post | — |
| `65x65` | 65×65mm HD post | — |
| `75x75` | 75×75mm post | Confirm stock |
| `100x100` | 100×100mm post | Confirm stock |

### Hinge Types
| Value | Label |
|-------|-------|
| `dd-kwik-fit-fixed` | D&D Kwik Fit — Fixed Tension |
| `dd-kwik-fit-adjustable` | D&D Kwik Fit — Adjustable |
| `heavy-duty-weld-on` | Heavy Duty (weld-on) |

### Latch Types
| Value | Label |
|-------|-------|
| `dd-magna-latch-top-pull` | D&D Magna Latch — Top Pull |
| `dd-magna-latch-lock-box` | D&D Magna Latch + Lock Box |
| `drop-bolt` | Drop Bolt only |
| `none` | No Latch |

## Gate BOM Rules (enforced in the edge function — Phase 4)

| Rule | Detail |
|------|--------|
| Swing gates always use 65mm slats | `swingGateForces65mm: true` |
| 90mm slats only for sliding gates | `slat90mmSlidingOnly: true` |
| Max recommended swing gate width | 1200mm |
| Hinges per single swing | 2 |
| Hinges per double swing | 4 |
| Sliding gate | track + guide rollers instead of hinges |
| Double swing | drop bolts as additional line items |

### Standard Gate Heights (mm)
900, 1050, 1200, 1500, 1800, 1950, 2100

## "Match Gate to Fence" Toggle

When `matchFence: true`:
- `gateHeight`, `colour`, `slatGap`, and `slatSize` all resolve to `'match-fence'`
- The BOM edge function reads the fence config values when it sees `'match-fence'`
- The UI hides/disables those fields

When `matchFence: false`:
- Each field can be set independently
- Gate colour, slat size, gap, and height are independently configurable

## Completion Criteria

- Users can add multiple gates
- Each gate has its own independent form
- "Match Gate to Fence" toggle correctly shows/hides overridable fields
- Gate list shows a summary of each configured gate
- Gates can be removed individually
- `GateContext` state is accessible to the BOM hook
