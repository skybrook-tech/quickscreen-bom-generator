import { describe, expect, it } from "vitest";
import type { CanonicalPayload } from "../types/canonical.types";
import { prepareBomCalculatorPayload } from "./bomPayloadAdapter";

describe("prepareBomCalculatorPayload", () => {
  it("adds engine fields to v3 panel segments without changing measured length", () => {
    const payload: CanonicalPayload = {
      productCode: "QSHS",
      schemaVersion: "v1",
      variables: {},
      runs: [
        {
          runId: "run-1",
          productCode: "QSHS",
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "wall" },
          corners: [],
          segments: [
            {
              segmentId: "seg-1",
              sortOrder: 0,
              segmentKind: "panel",
              segmentWidthMm: 2400,
              targetHeightMm: 1800,
            },
          ],
        },
      ],
    };

    const result = prepareBomCalculatorPayload(payload);
    const segment = result.runs[0].segments[0];

    expect(segment.segmentWidthMm).toBe(2400);
    expect(segment.segmentKind).toBe("panel");
    expect(segment.kind).toBe("fence");
    expect(segment.productCode).toBe("QSHS");
    expect(segment.leftTermination).toEqual({ kind: "system" });
    expect(segment.rightTermination).toEqual({ kind: "non_system", subtype: "wall" });
  });

  it("maps v3 run corners onto both sides of the joined engine segments", () => {
    const payload: CanonicalPayload = {
      productCode: "QSHS",
      schemaVersion: "v1",
      variables: {},
      runs: [
        {
          runId: "run-1",
          productCode: "QSHS",
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "product_post" },
          corners: [{ cornerId: "corner-1", afterSegmentId: "seg-1", type: "90" }],
          segments: [
            {
              segmentId: "seg-1",
              sortOrder: 0,
              segmentKind: "panel",
              segmentWidthMm: 1800,
            },
            {
              segmentId: "seg-2",
              sortOrder: 1,
              segmentKind: "panel",
              segmentWidthMm: 1800,
            },
          ],
        },
      ],
    };

    const result = prepareBomCalculatorPayload(payload);
    const [first, second] = result.runs[0].segments;

    expect(first.rightTermination).toEqual({ kind: "system_corner", angleDeg: 90 });
    expect(second.leftTermination).toEqual({ kind: "system_corner", angleDeg: 90 });
  });

  it("marks embedded v3 gate openings as QS_GATE engine segments", () => {
    const payload: CanonicalPayload = {
      productCode: "QSHS",
      schemaVersion: "v1",
      variables: {},
      runs: [
        {
          runId: "run-1",
          productCode: "QSHS",
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "product_post" },
          corners: [],
          segments: [
            {
              segmentId: "left-panel",
              sortOrder: 0,
              segmentKind: "panel",
              segmentWidthMm: 1200,
            },
            {
              segmentId: "gate-1",
              sortOrder: 1,
              segmentKind: "gate_opening",
              gateProductCode: "QS_GATE",
              segmentWidthMm: 900,
            },
            {
              segmentId: "right-panel",
              sortOrder: 2,
              segmentKind: "panel",
              segmentWidthMm: 1200,
            },
          ],
        },
      ],
    };

    const result = prepareBomCalculatorPayload(payload);
    const [leftPanel, gate, rightPanel] = result.runs[0].segments;

    expect(leftPanel.rightTermination).toEqual({ kind: "segment_join" });
    expect(gate.kind).toBe("gate");
    expect(gate.productCode).toBe("QS_GATE");
    expect(gate.leftTermination).toEqual({ kind: "segment_join" });
    expect(gate.rightTermination).toEqual({ kind: "segment_join" });
    expect(rightPanel.leftTermination).toEqual({ kind: "segment_join" });
  });
});
