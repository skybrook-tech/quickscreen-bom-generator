import { describe, expect, it } from "vitest";
import type { CanonicalPayload } from "../types/canonical.types";
import { calculateLocalBom } from "./localBomCalculator";

describe("calculateLocalBom", () => {
  it("uses section-level overrides when regenerating slat SKUs", () => {
    const payload: CanonicalPayload = {
      productCode: "QSHS",
      schemaVersion: "v3",
      variables: {
        colour_code: "B",
        finish_family: "standard",
        slat_size_mm: 65,
        slat_gap_mm: 9,
        target_height_mm: 1800,
        max_panel_width_mm: 2600,
        mounting_method: "in_ground",
      },
      runs: [
        {
          runId: "run-1",
          productCode: "QSHS",
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "product_post" },
          corners: [],
          variables: {},
          segments: [
            {
              segmentId: "section-1",
              sortOrder: 1,
              segmentKind: "panel",
              segmentWidthMm: 2400,
              targetHeightMm: 1800,
            },
            {
              segmentId: "section-2",
              sortOrder: 2,
              segmentKind: "panel",
              segmentWidthMm: 2400,
              targetHeightMm: 1800,
              variables: {
                colour_code: "MN",
                slat_size_mm: 90,
                slat_gap_mm: 20,
              },
            },
          ],
        },
      ],
    };

    const result = calculateLocalBom(payload);
    const skus = result.lines.map((line) => line.sku);

    expect(skus).toContain("XP-6100-S65-B");
    expect(skus).toContain("QS-6100-S90-MN");
  });

  it("normalizes long Colorbond color names to short codes in calculated SKUs", () => {
    const payload: CanonicalPayload = {
      productCode: "QSHS",
      schemaVersion: "v3",
      variables: {
        colour_code: "black-satin",
        finish_family: "standard",
        slat_size_mm: 65,
        slat_gap_mm: 9,
        target_height_mm: 1800,
        max_panel_width_mm: 2600,
        mounting_method: "in_ground",
      },
      runs: [
        {
          runId: "run-1",
          productCode: "QSHS",
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "product_post" },
          corners: [],
          variables: {},
          segments: [
            {
              segmentId: "section-1",
              sortOrder: 1,
              segmentKind: "panel",
              segmentWidthMm: 2400,
              targetHeightMm: 1800,
              variables: {
                colour_code: "monument-matt",
              }
            },
          ],
        },
      ],
    };

    const result = calculateLocalBom(payload);
    const skus = result.lines.map((line) => line.sku);

    // Verify that the color names mapped correctly to short codes
    expect(skus).toContain("XP-6100-S65-B");
    expect(skus).toContain("QS-5800-SF-MN");
  });
});
