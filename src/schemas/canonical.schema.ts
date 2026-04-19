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

export type CanonicalPayloadInput = z.input<typeof canonicalPayloadSchema>;
export type CanonicalPayloadOutput = z.output<typeof canonicalPayloadSchema>;
