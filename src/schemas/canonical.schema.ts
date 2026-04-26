import { z } from "zod";

const segmentTerminationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("system") }),
  z.object({
    kind: z.literal("non_system"),
    subtype: z.enum(["wall", "post", "other"]),
  }),
  z.object({
    kind: z.literal("segment_join"),
    angleDeg: z.number(),
  }),
]);

export const canonicalSegmentSchema = z.object({
  segmentId: z.string().uuid(),
  sortOrder: z.number().int().nonnegative(),
  kind: z.enum(["fence", "gate"]),
  productCode: z.string(),
  segmentWidthMm: z.number().positive().optional(),
  targetHeightMm: z.number().positive().optional(),
  leftTermination: segmentTerminationSchema,
  rightTermination: segmentTerminationSchema,
  variables: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export const canonicalRunSchema = z
  .object({
    runId: z.string().uuid(),
    segments: z.array(canonicalSegmentSchema),
    geometry: z
      .object({
        points: z.array(z.object({ x: z.number(), y: z.number() })),
      })
      .optional(),
  })
  .superRefine((run, ctx) => {
    // Each pair of adjacent segments must agree on their shared segment_join angleDeg.
    const segs = [...run.segments].sort((a, b) => a.sortOrder - b.sortOrder);
    for (let i = 0; i < segs.length - 1; i++) {
      const right = segs[i].rightTermination;
      const left = segs[i + 1].leftTermination;
      if (right.kind !== "segment_join" || left.kind !== "segment_join") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Adjacent segments ${segs[i].segmentId} and ${segs[i + 1].segmentId} must both use segment_join termination at their shared boundary`,
          path: ["segments"],
        });
      } else if (right.angleDeg !== left.angleDeg) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Mismatched segment_join angleDeg between segments ${segs[i].segmentId} (right=${right.angleDeg}) and ${segs[i + 1].segmentId} (left=${left.angleDeg})`,
          path: ["segments"],
        });
      }
    }

    // Leftmost segment's leftTermination must not be segment_join.
    if (segs.length > 0 && segs[0].leftTermination.kind === "segment_join") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `First segment ${segs[0].segmentId} cannot have segment_join on its left (run start)`,
        path: ["segments", 0, "leftTermination"],
      });
    }

    // Rightmost segment's rightTermination must not be segment_join.
    if (
      segs.length > 0 &&
      segs[segs.length - 1].rightTermination.kind === "segment_join"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Last segment ${segs[segs.length - 1].segmentId} cannot have segment_join on its right (run end)`,
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
