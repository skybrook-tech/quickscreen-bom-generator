# Phase V3-3 — Canonical Payload Contract

> **Status:** Not started
> **Depends on:** Nothing (pure types — can run in parallel with V3-1/V3-2)
> **Unblocks:** V3-4 (edge function input schema), V3-5 (canvas/form both read/write this shape)

## Goal

Define **one JSON shape** that every component — canvas engine, schema-driven form, `bom-calculator` edge function, `quote_runs`/`quote_run_segments` rows — reads and writes. Single source of truth. No bespoke adapters per layer.

## Shape

```typescript
// supabase/functions/_shared/canonical.types.ts (and mirrored in src/types/canonical.types.ts)

export interface CanonicalPayload {
  productCode: string;          // "QSHS" | "QSHS_GATE" | future
  schemaVersion: string;        // "v1"
  variables: Record<string, string | number | boolean>;  // job-level defaults (colourCode, slatSizeMm, slatGapMm, finishFamily, ...)
  runs: CanonicalRun[];
}

export interface CanonicalRun {
  runId: string;                // UUID; stable across edits
  productCode: string;          // can differ from top-level (fence run + gate run in one job)
  variables?: Record<string, string | number | boolean>;  // per-run overrides
  leftBoundary: CanonicalBoundary;
  rightBoundary: CanonicalBoundary;
  segments: CanonicalSegment[];
  corners: CanonicalCorner[];
}

export interface CanonicalBoundary {
  type: 'product_post' | 'brick_post' | 'existing_post' | 'wall' | 'corner_90';
  meta?: Record<string, unknown>; // e.g. existing post size, wall material
}

export type SegmentKind = 'panel' | 'bay_group' | 'gate_opening' | 'corner';

export interface CanonicalSegment {
  segmentId: string;            // UUID; stable across edits
  sortOrder: number;            // position within run
  segmentKind: SegmentKind;
  panelWidthMm?: number;        // panel | gate_opening
  targetHeightMm?: number;      // panel | bay_group | gate_opening (overrides run default)
  bayCount?: number;            // bay_group only
  gateProductCode?: string;     // gate_opening: points to QSHS_GATE or HSSG etc.
  variables?: Record<string, string | number | boolean>; // per-segment overrides
}

export interface CanonicalCorner {
  cornerId: string;
  afterSegmentId: string;       // which segment this corner comes after
  type: '90';                   // only 90° in MVP
}
```

## Example (QSHS 10m fence with 1 corner + QSHS_GATE)

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
        { "segmentId": "22222222-...", "sortOrder": 1, "segmentKind": "panel", "panelWidthMm": 2500, "targetHeightMm": 1800 },
        { "segmentId": "33333333-...", "sortOrder": 2, "segmentKind": "panel", "panelWidthMm": 2500, "targetHeightMm": 1800 },
        { "segmentId": "44444444-...", "sortOrder": 3, "segmentKind": "panel", "panelWidthMm": 2500, "targetHeightMm": 1800 },
        { "segmentId": "55555555-...", "sortOrder": 4, "segmentKind": "panel", "panelWidthMm": 2500, "targetHeightMm": 1800 }
      ],
      "corners": [
        { "cornerId": "66666666-...", "afterSegmentId": "22222222-...", "type": "90" }
      ]
    },
    {
      "runId": "77777777-...",
      "productCode": "QSHS_GATE",
      "leftBoundary": { "type": "product_post" },
      "rightBoundary": { "type": "product_post" },
      "segments": [
        {
          "segmentId": "88888888-...",
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

## Zod validator

`src/schemas/canonical.schema.ts`:

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

## Canvas ↔ canonical adapter

`src/components/canvas/canonicalAdapter.ts`:

```typescript
import type { CanvasLayout } from './canvasEngine';
import type { CanonicalPayload, CanonicalRun, CanonicalSegment } from '../../types/canonical.types';

export function canvasLayoutToCanonical(
  layout: CanvasLayout,
  topProductCode: string,
  variables: Record<string, string | number | boolean>,
): CanonicalPayload {
  // Map each CanvasRunSummary to a CanonicalRun
  // Each CanvasSegment becomes a CanonicalSegment with segmentKind inferred from gates[]
  // Corners mapped from canvas corner metadata
}

export function canonicalToCanvasLayout(
  payload: CanonicalPayload,
): CanvasLayout {
  // Reverse for quote reload / view page
  // segmentId MUST round-trip identically; canvas engine uses it as a stable key
}
```

**Critical invariant:** `segmentId` and `runId` are stable across round-trips. Canvas stores them in segment metadata, form keys row inputs by them, `quote_run_segments.id` persists them. Any code path that regenerates UUIDs breaks load/save.

## Persisted form on disk

`quote_runs` + `quote_run_segments` (from V3-1 migrations) store exactly the canonical payload shape: one row per run, one row per segment, JSONB overrides at both levels. Saving a v3 quote = upserting these rows. Loading = reading them back into a `CanonicalPayload` via a simple SQL-to-object mapper (SQL JSON aggregation is acceptable; no separate service needed).

## Verification

1. `npm run build` — zero TypeScript errors against new types
2. Import `canonicalPayloadSchema` and `.parse(validFixture)` in a one-off script — succeeds
3. `.parse(invalidFixture)` (missing runId) — fails with Zod error
4. `canvasLayoutToCanonical(canonicalToCanvasLayout(fixture))` — deep-equal round-trip

## Out of scope

- Canvas adapter implementation — owned by V3-5 (need the canvas engine's exact run/segment output shape)
- Quote save/load UI — deferred per V3 MVP scope
- Patios / non-fence product variants of this shape — MVP-locked to fence+gate
