import { describe, expect, it } from "vitest";
import { canonicalPayloadSchema } from "../../schemas/canonical.schema";
import type { CanonicalPayload } from "../../types/canonical.types";
import { mergeCanonicalPreservingSegmentMeta } from "./canonicalAdapter";

const basePayload: CanonicalPayload = {
  productCode: "QSHS",
  schemaVersion: "v1",
  variables: {},
  runs: [
    {
      runId: "11111111-1111-4111-8111-111111111111",
      productCode: "QSHS",
      segments: [
        {
          segmentId: "22222222-2222-4222-8222-222222222222",
          sortOrder: 0,
          segmentKind: "panel",
          segmentWidthMm: 2400,
        },
      ],
    },
  ],
};

describe("canonicalAdapter propertyAnchor", () => {
  it("preserves a confirmed property anchor during canvas-to-canonical metadata merges", () => {
    const previous: CanonicalPayload = {
      ...basePayload,
      propertyAnchor: {
        lat: -27.4698,
        lng: 153.0251,
        address: "Brisbane City QLD, Australia",
      },
    };
    const generated: CanonicalPayload = {
      ...basePayload,
      runs: [
        {
          ...basePayload.runs[0],
          segments: [
            {
              ...basePayload.runs[0].segments[0],
              segmentWidthMm: 2600,
            },
          ],
        },
      ],
    };

    expect(mergeCanonicalPreservingSegmentMeta(previous, generated).propertyAnchor).toEqual(
      previous.propertyAnchor,
    );
  });

  it("accepts propertyAnchor as optional canonical payload state", () => {
    expect(canonicalPayloadSchema.safeParse(basePayload).success).toBe(true);
    expect(
      canonicalPayloadSchema.safeParse({
        ...basePayload,
        propertyAnchor: {
          lat: -31.9523,
          lng: 115.8613,
          address: "Perth WA, Australia",
        },
      }).success,
    ).toBe(true);
  });
});
