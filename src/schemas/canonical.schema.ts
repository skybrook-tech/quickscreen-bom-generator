import { z } from "zod";

const segmentTerminationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("system") }),
  z.object({
    kind: z.literal("non_system"),
    subtype: z.enum(["wall", "post", "other"]),
  }),
  z.object({ kind: z.literal("segment_join") }),
  z.object({
    kind: z.literal("system_corner"),
    // Signed interior angle: positive = CW (right turn), negative = CCW (left turn).
    // Magnitude in [1, 179]. e.g. +90, -90, +135, -135.
    angleDeg: z.number().min(-179).max(179).refine((v) => v !== 0, {
      message: "system_corner angleDeg must be non-zero",
    }),
  }),
]);

export const canonicalSegmentSchema = z.object({
  segmentId: z.string().uuid(),
  sortOrder: z.number().int().nonnegative(),
  kind: z.enum(["fence", "gate"]),
  productCode: z.string(),
  segmentWidthMm: z.number().positive().optional(),
  targetHeightMm: z.number().positive().optional(),
  confirmed: z.boolean().optional(),
  leftTermination: segmentTerminationSchema,
  rightTermination: segmentTerminationSchema,
  variables: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export const canonicalRunSchema = z
  .object({
    runId: z.string().uuid(),
    displayName: z.string().max(120).optional(),
    productCode: z.string().optional(),
    variables: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
    segments: z.array(canonicalSegmentSchema),
    geometry: z
      .object({
        points: z.array(z.object({ x: z.number(), y: z.number() })),
      })
      .optional(),
  })
  .superRefine((run, ctx) => {
    // Each pair of adjacent segments must agree on their shared boundary type.
    // Valid: both segment_join, or both system_corner with matching angleDeg.
    const segs = [...run.segments].sort((a, b) => a.sortOrder - b.sortOrder);
    for (let i = 0; i < segs.length - 1; i++) {
      const right = segs[i].rightTermination;
      const left = segs[i + 1].leftTermination;
      const rightKind = right.kind;
      const leftKind = left.kind;

      const bothJoin = rightKind === "segment_join" && leftKind === "segment_join";
      const bothCorner =
        rightKind === "system_corner" && leftKind === "system_corner";

      if (!bothJoin && !bothCorner) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Adjacent segments ${segs[i].segmentId} and ${segs[i + 1].segmentId} must both use segment_join or both use system_corner at their shared boundary`,
          path: ["segments"],
        });
      } else if (
        bothCorner &&
        (right as { kind: "system_corner"; angleDeg: number }).angleDeg !==
          (left as { kind: "system_corner"; angleDeg: number }).angleDeg
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Mismatched system_corner angleDeg between segments ${segs[i].segmentId} (right=${(right as { kind: "system_corner"; angleDeg: number }).angleDeg}) and ${segs[i + 1].segmentId} (left=${(left as { kind: "system_corner"; angleDeg: number }).angleDeg})`,
          path: ["segments"],
        });
      }
    }

    // Leftmost segment's leftTermination must not be segment_join or system_corner.
    if (
      segs.length > 0 &&
      (segs[0].leftTermination.kind === "segment_join" ||
        segs[0].leftTermination.kind === "system_corner")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `First segment ${segs[0].segmentId} cannot have segment_join or system_corner on its left (run start)`,
        path: ["segments", 0, "leftTermination"],
      });
    }

    // Rightmost segment's rightTermination must not be segment_join or system_corner.
    if (
      segs.length > 0 &&
      (segs[segs.length - 1].rightTermination.kind === "segment_join" ||
        segs[segs.length - 1].rightTermination.kind === "system_corner")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Last segment ${segs[segs.length - 1].segmentId} cannot have segment_join or system_corner on its right (run end)`,
        path: ["segments", segs.length - 1, "rightTermination"],
      });
    }
  });

export const canonicalPayloadSchema = z.object({
  productCode: z.string(),
  schemaVersion: z.literal("v2"),
  variables: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
  runs: z.array(canonicalRunSchema).min(1),
});

export type CanonicalPayloadInput = z.input<typeof canonicalPayloadSchema>;
export type CanonicalPayloadOutput = z.output<typeof canonicalPayloadSchema>;
