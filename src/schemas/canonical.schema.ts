import { z } from 'zod';

const canonicalVariableValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const canonicalBoundarySchema = z.object({
  type: z.enum(['product_post', 'brick_post', 'existing_post', 'wall', 'corner_90']),
  meta: z.record(z.string(), z.unknown()).optional(),
});

// V4 termination schema — kept for backward compatibility
export const segmentTerminationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('system') }),
  z.object({ kind: z.literal('non_system'), subtype: z.enum(['wall', 'post', 'other']) }),
  z.object({ kind: z.literal('segment_join') }),
  z.object({
    kind: z.literal('system_corner'),
    angleDeg: z.number().min(-179).max(179).refine((v) => v !== 0, {
      message: 'system_corner angleDeg must be non-zero',
    }),
  }),
]);

export const canonicalCornerSchema = z.object({
  cornerId: z.string().uuid(),
  afterSegmentId: z.string().uuid(),
  type: z.enum(['90', '135', 'custom']),
});

export const canonicalSegmentSchema = z.object({
  segmentId: z.string().uuid(),
  sortOrder: z.number().int().nonnegative(),
  // V4 fields (optional for V3 payloads)
  kind: z.enum(['fence', 'gate']).optional(),
  confirmed: z.boolean().optional(),
  productCode: z.string().optional(),
  leftTermination: segmentTerminationSchema.optional(),
  rightTermination: segmentTerminationSchema.optional(),
  // V3 fields (optional for V4 payloads)
  segmentKind: z.enum(['panel', 'bay_group', 'gate_opening', 'corner']).optional(),
  bayCount: z.number().int().positive().optional(),
  gateProductCode: z.string().optional(),
  // Shared fields
  segmentWidthMm: z.number().positive().optional(),
  positionOnSegment: z.number().min(0).max(1).optional(),
  gateAnchor: z.enum(['start', 'center', 'end']).optional(),
  canvasSegmentIndex: z.number().int().nonnegative().optional(),
  sourceSegmentLengthMm: z.number().positive().optional(),
  targetHeightMm: z.number().positive().optional(),
  variables: z.record(z.string(), canonicalVariableValueSchema).optional(),
});

export const canonicalRunSchema = z.object({
  runId: z.string().uuid(),
  productCode: z.string(),
  displayName: z.string().max(120).optional(),
  variables: z.record(z.string(), canonicalVariableValueSchema).optional(),
  // V3 fields (optional for V4 payloads)
  leftBoundary: canonicalBoundarySchema.optional(),
  rightBoundary: canonicalBoundarySchema.optional(),
  corners: z.array(canonicalCornerSchema).optional(),
  segments: z.array(canonicalSegmentSchema),
  geometry: z
    .object({
      points: z.array(z.object({ x: z.number(), y: z.number() })),
      metrePoints: z
        .array(z.object({ dxMetres: z.number(), dyMetres: z.number() }))
        .optional(),
    })
    .optional(),
});

export const canonicalPayloadSchema = z.object({
  productCode: z.string(),
  schemaVersion: z.string(),
  propertyAnchor: z
    .object({
      lat: z.number(),
      lng: z.number(),
      address: z.string(),
    })
    .optional(),
  job: z
    .object({
      description: z.string().optional(),
      pendingGates: z
        .array(
          z.object({
            id: z.string(),
            kind: z.enum(['pedestrian', 'sliding', 'double_swing']),
            widthMm: z.number().positive().optional(),
            runId: z.string().uuid(),
          }),
        )
        .optional(),
    })
    .optional(),
  variables: z.record(z.string(), canonicalVariableValueSchema),
  runs: z.array(canonicalRunSchema).min(1),
});

export type CanonicalPayloadInput = z.input<typeof canonicalPayloadSchema>;
export type CanonicalPayloadOutput = z.output<typeof canonicalPayloadSchema>;
