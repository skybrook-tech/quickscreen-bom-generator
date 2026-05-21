import { describe, expect, it } from "vitest";
import {
  buildStaticMapUrl,
  clampStaticMapSize,
  createMapSnapshot,
  metresPerPixelAt,
  STATIC_MAP_MAX_DIMENSION,
} from "./staticSnapshot";

describe("Static Maps snapshots", () => {
  it("computes metres per pixel from the Google ground-resolution formula", () => {
    const zoom = 20;
    for (const lat of [-16.9186, -27.4698, -33.8688, -37.8136, -42.8821]) {
      const expected =
        (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
      expect(metresPerPixelAt(lat, zoom)).toBeCloseTo(expected, 12);
    }
  });

  it("clamps Static Maps dimensions while preserving viewport aspect", () => {
    expect(clampStaticMapSize(1280, 720)).toEqual({ width: 640, height: 360 });
    expect(clampStaticMapSize(300, 900)).toEqual({ width: 213, height: 640 });
    expect(clampStaticMapSize(480, 320)).toEqual({ width: 480, height: 320 });
    expect(STATIC_MAP_MAX_DIMENSION).toBe(640);
  });

  it("captures snapshot params with clamped size and scale", () => {
    const snapshot = createMapSnapshot({
      centerLat: -28.503385,
      centerLng: 153.526262,
      zoom: 20,
      viewportWidth: 1280,
      viewportHeight: 720,
      capturedAt: "2026-05-22T00:00:00.000Z",
    });

    expect(snapshot).toMatchObject({
      centerLat: -28.503385,
      centerLng: 153.526262,
      zoom: 20,
      width: 640,
      height: 360,
      capturedAt: "2026-05-22T00:00:00.000Z",
    });
    expect(snapshot.metresPerPixel).toBeCloseTo(
      metresPerPixelAt(-28.503385, 20),
      12,
    );
  });

  it("builds a satellite Static Maps URL from a snapshot", () => {
    const snapshot = createMapSnapshot({
      centerLat: -33.8688,
      centerLng: 151.2093,
      zoom: 19,
      viewportWidth: 640,
      viewportHeight: 360,
      capturedAt: "2026-05-22T00:00:00.000Z",
    });

    const url = new URL(buildStaticMapUrl(snapshot, "test-key"));
    expect(url.origin + url.pathname).toBe(
      "https://maps.googleapis.com/maps/api/staticmap",
    );
    expect(url.searchParams.get("center")).toBe("-33.8688,151.2093");
    expect(url.searchParams.get("zoom")).toBe("19");
    expect(url.searchParams.get("size")).toBe("640x360");
    expect(url.searchParams.get("maptype")).toBe("satellite");
    expect(url.searchParams.get("key")).toBe("test-key");
  });
});
