import { describe, expect, it } from "vitest";
import { computePrintViewport } from "./printMap";

describe("computePrintViewport", () => {
  it("centres drawn bounds with ten percent padding", () => {
    const viewport = computePrintViewport(
      { minX: 100, minY: 200, maxX: 500, maxY: 400, width: 400, height: 200 },
      1200,
      800,
    );

    expect(viewport.paddedBounds).toEqual({
      minX: 60,
      minY: 180,
      maxX: 540,
      maxY: 420,
      width: 480,
      height: 240,
    });
    expect(viewport.zoom).toBeCloseTo(2.5, 6);
    expect(viewport.pan).toEqual({ x: -150, y: -350 });
  });

  it("uses the limiting canvas axis and respects max zoom", () => {
    const viewport = computePrintViewport(
      { minX: 0, minY: 0, maxX: 50, maxY: 50, width: 50, height: 50 },
      1000,
      1000,
      0.1,
      8,
    );

    expect(viewport.zoom).toBe(8);
    expect(viewport.paddedBounds.width).toBe(60);
    expect(viewport.paddedBounds.height).toBe(60);
  });
});

