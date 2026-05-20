import { describe, expect, it } from "vitest";
import { calculateLocalBom } from "../../lib/localBomCalculator";
import type { CanonicalPayload } from "../../types/canonical.types";
import type { CanvasLayout } from "./canvasEngine";
import {
  canvasLayoutToCanonical,
  canonicalToCanvasLayout,
  mergeCanonicalPreservingSegmentMeta,
} from "./canonicalAdapter";

const variables = {
  target_height_mm: 1800,
  slat_size_mm: 65,
  slat_gap_mm: 9,
  colour: "black-satin",
  max_panel_width_mm: 2600,
  post_mounting: "base-plated",
  finish_type: "standard",
  finish_family: "standard",
};

const stableIds = {
  "run:0": "11111111-1111-4111-8111-111111111111",
  "0:0": "22222222-2222-4222-8222-222222222222",
};

const tenMetreNorthLayout: CanvasLayout = {
  segments: [
    {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: -1000,
      lengthMM: 10000,
      angleDeg: -90,
    },
  ],
  gates: [],
  totalLengthM: 10,
  cornerCount: 0,
  runs: [
    {
      label: "Run 1",
      totalLengthM: 10,
      cornerCount: 0,
      gates: [],
    },
  ],
  boundaries: [],
};

function stripVolatile(result: ReturnType<typeof calculateLocalBom>) {
  return {
    lines: result.lines,
    runResults: result.runResults,
    gateItems: result.gateItems,
    totals: result.totals,
    warnings: result.warnings,
    errors: result.errors,
    assumptions: result.assumptions,
    computed: result.computed,
    pricingTier: result.pricingTier,
  };
}

describe("map overlay canonical integration", () => {
  it("stores anchored canvas geometry as metre offsets and preserves BOM output", () => {
    const previous: CanonicalPayload = {
      productCode: "QSHS",
      schemaVersion: "v1",
      propertyAnchor: {
        lat: -33.8688,
        lng: 151.2093,
        address: "Sydney NSW, Australia",
      },
      variables,
      runs: [
        {
          runId: stableIds["run:0"],
          productCode: "QSHS",
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "product_post" },
          segments: [],
          corners: [],
        },
      ],
    };

    const generated = canvasLayoutToCanonical(
      tenMetreNorthLayout,
      "QSHS",
      variables,
      { ...stableIds },
    );
    const anchored = mergeCanonicalPreservingSegmentMeta(previous, generated);

    const metrePoints = anchored.runs[0].geometry?.metrePoints ?? [];
    expect(metrePoints).toHaveLength(2);
    expect(metrePoints[0].dxMetres).toBeCloseTo(0, 6);
    expect(metrePoints[0].dyMetres).toBeCloseTo(0, 6);
    expect(metrePoints[1].dxMetres).toBeCloseTo(0, 6);
    expect(metrePoints[1].dyMetres).toBeCloseTo(10, 6);

    const roundTrip = canonicalToCanvasLayout(anchored);
    expect(roundTrip.segments[0]).toMatchObject({
      startX: 0,
      startY: 0,
      endX: 0,
      endY: -1000,
      lengthMM: 10000,
    });

    const legacy: CanonicalPayload = {
      ...anchored,
      propertyAnchor: undefined,
      runs: anchored.runs.map((run) => ({
        ...run,
        geometry: run.geometry
          ? { points: run.geometry.points }
          : run.geometry,
      })),
    };

    expect(stripVolatile(calculateLocalBom(anchored))).toEqual(
      stripVolatile(calculateLocalBom(legacy)),
    );
  });
});
