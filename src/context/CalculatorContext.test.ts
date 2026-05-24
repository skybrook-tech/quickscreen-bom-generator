import { describe, expect, it } from "vitest";
import { calculatorReducer, type CalculatorState } from "./CalculatorContext";

const stateWithBom: CalculatorState = {
  entryMethod: "select",
  bomResult: {
    lines: [{ sku: "OLD", quantity: 1, lineTotal: 100 }],
    grandTotal: 110,
  },
  payload: {
    productCode: "QSHS",
    schemaVersion: "v1",
    variables: {},
    runs: [
      {
        runId: "run-1",
        productCode: "QSHS",
        variables: {},
        leftBoundary: { type: "product_post" },
        rightBoundary: { type: "product_post" },
        segments: [
          {
            segmentId: "seg-1",
            sortOrder: 1,
            segmentKind: "panel",
            segmentWidthMm: 1200,
            targetHeightMm: 1800,
          },
        ],
        corners: [],
      },
    ],
  },
};

describe("calculatorReducer", () => {
  it("clears stale BOM totals when a run is removed", () => {
    const next = calculatorReducer(stateWithBom, {
      type: "REMOVE_RUN",
      runId: "run-1",
    });

    expect(next.bomResult).toBeNull();
    expect(next.payload?.runs).toHaveLength(0);
  });

  it("clears stale BOM totals when a segment is removed", () => {
    const next = calculatorReducer(stateWithBom, {
      type: "REMOVE_SEGMENT",
      runId: "run-1",
      segmentId: "seg-1",
    });

    expect(next.bomResult).toBeNull();
    expect(next.payload?.runs[0]?.segments).toHaveLength(0);
  });
});
