import { describe, expect, it } from "vitest";
import { payloadFromV3FenceConfig } from "../../lib/quotePayload";
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

const snapshot = {
  centerLat: -31.9523,
  centerLng: 115.8613,
  zoom: 19,
  width: 640,
  height: 360,
  metresPerPixel: 0.212345,
  capturedAt: "2026-05-22T00:00:00.000Z",
  layers: {
    satellite: {
      url: "https://example.test/satellite.png",
      visible: true,
      opacity: 1,
    },
    roadmap: {
      url: "https://example.test/roadmap.png",
      visible: false,
      opacity: 1,
    },
  },
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
      snapshot,
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
    expect(mergeCanonicalPreservingSegmentMeta(previous, generated).snapshot).toEqual(
      previous.snapshot,
    );
  });

  it("accepts propertyAnchor and snapshot as optional canonical payload state", () => {
    expect(canonicalPayloadSchema.safeParse(basePayload).success).toBe(true);
    expect(
      canonicalPayloadSchema.safeParse({
        ...basePayload,
        propertyAnchor: {
          lat: -31.9523,
          lng: 115.8613,
          address: "Perth WA, Australia",
        },
        snapshot,
      }).success,
    ).toBe(true);
  });

  it("round-trips a saved v3 quote payload with the same snapshot view", () => {
    const payload: CanonicalPayload = {
      ...basePayload,
      propertyAnchor: {
        lat: -31.9523,
        lng: 115.8613,
        address: "Perth WA, Australia",
      },
      snapshot,
    };

    const reloaded = payloadFromV3FenceConfig({
      calculator: "v3",
      jobName: "Snapshot quote",
      payload,
    });

    expect(reloaded?.snapshot).toEqual(snapshot);
    expect(reloaded?.propertyAnchor).toEqual(payload.propertyAnchor);
  });

  it("migrates a legacy single-image saved snapshot into a satellite layer", () => {
    const payload: CanonicalPayload = {
      ...basePayload,
      snapshot: {
        centerLat: -31.9523,
        centerLng: 115.8613,
        zoom: 19,
        width: 640,
        height: 360,
        metresPerPixel: 0.212345,
        capturedAt: "2026-05-22T00:00:00.000Z",
        url: "https://example.test/legacy.png",
      },
    };

    const reloaded = payloadFromV3FenceConfig({
      calculator: "v3",
      jobName: "Legacy snapshot quote",
      payload,
    });

    expect(reloaded?.snapshot?.layers?.satellite).toEqual({
      url: "https://example.test/legacy.png",
      visible: true,
      opacity: 1,
    });
    expect(reloaded?.snapshot?.layers?.roadmap).toEqual({
      url: null,
      visible: false,
      opacity: 1,
    });
  });
});
