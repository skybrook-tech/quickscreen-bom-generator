import { describe, expect, it } from "vitest";
import { payloadFromV3FenceConfig } from "../../lib/quotePayload";
import { canonicalPayloadSchema } from "../../schemas/canonical.schema";
import type { CanonicalPayload } from "../../types/canonical.types";
import { GATE_SEGMENT_STUB_KEYS } from "../../lib/segmentTermination";
import type { CanvasGate } from "./canvasEngine";
import {
  canonicalToCanvasLayout,
  canvasLayoutToCanonical,
  mergeCanonicalPreservingSegmentMeta,
} from "./canonicalAdapter";

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

  it("round-trips gate variables through canvas to canonical conversions", () => {
    const variables = {
      [GATE_SEGMENT_STUB_KEYS.gateMovement]: "sliding",
      [GATE_SEGMENT_STUB_KEYS.openingDirection]: "right",
      [GATE_SEGMENT_STUB_KEYS.slidingSide]: "back",
      [GATE_SEGMENT_STUB_KEYS.hingeType]: "none",
      [GATE_SEGMENT_STUB_KEYS.latchType]: "LLAA",
      [GATE_SEGMENT_STUB_KEYS.slatGapMm]: 20,
      [GATE_SEGMENT_STUB_KEYS.useGatePostsAsFenceTermination]: false,
    };
    const gate: CanvasGate = {
      segmentIndex: 0,
      positionOnSegment: 0.5,
      anchor: "center",
      widthMM: 900,
      gateId: "33333333-3333-4333-8333-333333333333",
      useGatePostsAsFenceTermination: false,
      gateType: "sliding",
      swingDirection: "right",
      slidingSide: "back",
      variables,
    };
    const payload = canvasLayoutToCanonical(
      {
        segments: [
          {
            startX: 0,
            startY: 0,
            endX: 300,
            endY: 0,
            lengthMM: 3000,
            angleDeg: 0,
          },
        ],
        gates: [gate],
        totalLengthM: 3,
        cornerCount: 0,
        runs: [
          {
            label: "Run 1",
            totalLengthM: 3,
            cornerCount: 0,
            gates: [gate],
          },
        ],
        boundaries: [],
      },
      "QSHS",
      {},
    );

    const gateSegment = payload.runs[0].segments.find(
      (segment) => segment.segmentKind === "gate_opening",
    );
    expect(gateSegment?.variables).toMatchObject(variables);

    const restored = canonicalToCanvasLayout(payload);
    expect(restored.gates[0].variables).toMatchObject(variables);
    expect(restored.runs[0].gates[0].variables).toMatchObject(variables);
  });
});
