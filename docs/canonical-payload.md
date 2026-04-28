# Canonical Payload Contract

The **canonical payload** is the single JSON shape shared by every layer of the v3 stack: canvas engine, schema-driven form, `bom-calculator` edge function, and `quote_runs`/`quote_run_segments` persistent storage.

Source files:
- `src/types/canonical.types.ts` (React app)
- `supabase/functions/_shared/canonical.types.ts` (Deno — mirrored)
- `src/schemas/canonical.schema.ts` (Zod validators)

---

## TypeScript types

```typescript
export interface CanonicalPayload {
  productCode: string;     // "QSHS" | "QS_GATE" | future system codes
  schemaVersion: string;   // "v1"
  variables: Record<string, string | number | boolean>;  // job-level defaults
  runs: CanonicalRun[];
}

export interface CanonicalRun {
  runId: string;           // UUID — stable across edits, never regenerated
  productCode: string;     // can differ from top-level (fence run + gate run in one job)
  variables?: Record<string, string | number | boolean>;  // per-run overrides
  leftBoundary: CanonicalBoundary;
  rightBoundary: CanonicalBoundary;
  segments: CanonicalSegment[];
  corners: CanonicalCorner[];
}

export interface CanonicalBoundary {
  type: 'product_post' | 'brick_post' | 'existing_post' | 'wall' | 'corner_90';
  meta?: Record<string, unknown>;
}

export type SegmentKind = 'panel' | 'bay_group' | 'gate_opening' | 'corner';

export interface CanonicalSegment {
  segmentId: string;          // UUID — stable across edits, never regenerated
  sortOrder: number;
  segmentKind: SegmentKind;
  panelWidthMm?: number;      // panel | gate_opening
  targetHeightMm?: number;    // overrides run-level default
  bayCount?: number;          // bay_group only
  gateProductCode?: string;   // gate_opening: e.g. "QS_GATE"
  variables?: Record<string, string | number | boolean>;  // per-segment overrides
}

export interface CanonicalCorner {
  cornerId: string;
  afterSegmentId: string;  // which segment this corner follows
  type: '90';              // only 90° in MVP
}
```

---

## Variable merge precedence

The engine merges variables for each segment using this priority (highest wins):

```
segment.variables > run.variables > payload.variables > product_variables.default_value_json
```

---

## Colour codes

`payload.variables.colourCode` uses **short codes**, not display names. The `bom-calculator` normalises long Colorbond names to short codes before selector resolution:

| Short code | Display name |
|---|---|
| `B` | Black Satin |
| `M` | Monument Matt |
| `WG` | Woodland Grey Matt |
| `SM` | Surfmist Matt |
| `PW` | Pearl White Gloss |
| `BA` | Basalt Satin |
| `D` | Dune Satin |
| `ML` | Mill |
| `PR` | Primrose |
| `PB` | Paperbark |
| `PS` | Palladium Silver Pearl |

---

## Example — QSHS 10m fence with 1 corner + QS_GATE

```json
{
  "productCode": "QSHS",
  "schemaVersion": "v1",
  "variables": {
    "colourCode": "B",
    "slatSizeMm": 65,
    "slatGapMm": 5,
    "finishFamily": "standard"
  },
  "runs": [
    {
      "runId": "11111111-1111-1111-1111-111111111111",
      "productCode": "QSHS",
      "leftBoundary": { "type": "product_post" },
      "rightBoundary": { "type": "product_post" },
      "segments": [
        { "segmentId": "aaaa0001-...", "sortOrder": 1, "segmentKind": "panel", "panelWidthMm": 2500, "targetHeightMm": 1800 },
        { "segmentId": "aaaa0002-...", "sortOrder": 2, "segmentKind": "panel", "panelWidthMm": 2500, "targetHeightMm": 1800 },
        { "segmentId": "aaaa0003-...", "sortOrder": 3, "segmentKind": "panel", "panelWidthMm": 2500, "targetHeightMm": 1800 },
        { "segmentId": "aaaa0004-...", "sortOrder": 4, "segmentKind": "panel", "panelWidthMm": 2500, "targetHeightMm": 1800 }
      ],
      "corners": [
        { "cornerId": "cccc0001-...", "afterSegmentId": "aaaa0002-...", "type": "90" }
      ]
    },
    {
      "runId": "22222222-2222-2222-2222-222222222222",
      "productCode": "QS_GATE",
      "leftBoundary": { "type": "product_post" },
      "rightBoundary": { "type": "product_post" },
      "segments": [
        {
          "segmentId": "bbbb0001-...",
          "sortOrder": 1,
          "segmentKind": "gate_opening",
          "panelWidthMm": 900,
          "targetHeightMm": 1800,
          "variables": {
            "hingeType": "dd-kwik-fit-adjustable",
            "latchType": "dd-magna-latch-top-pull",
            "openingDirection": "left",
            "hingeSide": "left",
            "frameCapSize": "50"
          }
        }
      ],
      "corners": []
    }
  ]
}
```

---

## Zod validators (`src/schemas/canonical.schema.ts`)

```typescript
import { z } from 'zod';

export const canonicalBoundarySchema = z.object({
  type: z.enum(['product_post', 'brick_post', 'existing_post', 'wall', 'corner_90']),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const canonicalSegmentSchema = z.object({
  segmentId: z.string().uuid(),
  sortOrder: z.number().int().nonnegative(),
  segmentKind: z.enum(['panel', 'bay_group', 'gate_opening', 'corner']),
  panelWidthMm: z.number().positive().optional(),
  targetHeightMm: z.number().positive().optional(),
  bayCount: z.number().int().positive().optional(),
  gateProductCode: z.string().optional(),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const canonicalCornerSchema = z.object({
  cornerId: z.string().uuid(),
  afterSegmentId: z.string().uuid(),
  type: z.literal('90'),
});

export const canonicalRunSchema = z.object({
  runId: z.string().uuid(),
  productCode: z.string(),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  leftBoundary: canonicalBoundarySchema,
  rightBoundary: canonicalBoundarySchema,
  segments: z.array(canonicalSegmentSchema),
  corners: z.array(canonicalCornerSchema),
});

export const canonicalPayloadSchema = z.object({
  productCode: z.string(),
  schemaVersion: z.literal('v1'),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  runs: z.array(canonicalRunSchema).min(1),
});
```

---

## Canvas ↔ canonical adapters (`src/components/canvas/canonicalAdapter.ts`)

| Function | Direction | Used when |
|---|---|---|
| `canvasLayoutToCanonical(layout, productCode, variables)` | canvas → payload | Layout changes; before calling `bom-calculator` |
| `canonicalToCanvasLayout(payload)` | payload → canvas | Loading a saved quote back into the canvas |

---

## Critical invariant — stable IDs

**`runId` and `segmentId` must never be regenerated.**

- The canvas stores them in segment metadata
- The form keys row inputs by them
- `quote_runs.id` and `quote_run_segments.id` persist them in the DB
- The `bom-calculator` response tags every `BOMLineItem` with `runId` + `segmentId` for per-run tab filtering

Any code path that generates new UUIDs for existing runs/segments will break quote save/load and BOM tab filtering. Always pass existing IDs through adapter code unchanged.
