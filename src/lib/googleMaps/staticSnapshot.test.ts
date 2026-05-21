import { describe, expect, it, vi } from "vitest";
import {
  buildStaticMapUrl,
  clampStaticMapSize,
  createLayeredMapSnapshot,
  createMapSnapshot,
  metresPerPixelAt,
  normalizeMapSnapshot,
  STATIC_MAP_MAX_DIMENSION,
  updateMapSnapshotLayer,
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

  it("builds typed Static Maps URLs from a snapshot", () => {
    const snapshot = createMapSnapshot({
      centerLat: -33.8688,
      centerLng: 151.2093,
      zoom: 19,
      viewportWidth: 640,
      viewportHeight: 360,
      capturedAt: "2026-05-22T00:00:00.000Z",
    });

    const url = new URL(buildStaticMapUrl(snapshot, "test-key"));
    const roadmapUrl = new URL(buildStaticMapUrl(snapshot, "test-key", "roadmap"));
    expect(url.origin + url.pathname).toBe(
      "https://maps.googleapis.com/maps/api/staticmap",
    );
    expect(url.searchParams.get("center")).toBe("-33.8688,151.2093");
    expect(url.searchParams.get("zoom")).toBe("19");
    expect(url.searchParams.get("size")).toBe("640x360");
    expect(url.searchParams.get("maptype")).toBe("satellite");
    expect(url.searchParams.get("key")).toBe("test-key");
    expect(roadmapUrl.searchParams.get("maptype")).toBe("roadmap");
  });

  it("preloads satellite and roadmap snapshot requests in parallel", async () => {
    const calls: string[] = [];
    const resolvers: Array<() => void> = [];
    const snapshotPromise = createLayeredMapSnapshot(
      {
        centerLat: -28.503385,
        centerLng: 153.526262,
        zoom: 20,
        viewportWidth: 1280,
        viewportHeight: 720,
        capturedAt: "2026-05-22T00:00:00.000Z",
      },
      "test-key",
      (url) => {
        calls.push(url);
        return new Promise<void>((resolve) => {
          resolvers.push(resolve);
        });
      },
    );

    expect(calls.map((url) => new URL(url).searchParams.get("maptype"))).toEqual([
      "satellite",
      "roadmap",
    ]);
    resolvers.forEach((resolve) => resolve());

    const snapshot = await snapshotPromise;
    expect(snapshot.layers?.satellite?.url).toContain("maptype=satellite");
    expect(snapshot.layers?.roadmap?.url).toContain("maptype=roadmap");
    expect(snapshot.layers?.satellite).toMatchObject({
      visible: true,
      opacity: 1,
    });
    expect(snapshot.layers?.roadmap).toMatchObject({
      visible: false,
      opacity: 1,
    });
  });

  it("falls back to satellite-only if the roadmap preload fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const snapshot = await createLayeredMapSnapshot(
      {
        centerLat: -28.503385,
        centerLng: 153.526262,
        zoom: 20,
        viewportWidth: 1280,
        viewportHeight: 720,
        capturedAt: "2026-05-22T00:00:00.000Z",
      },
      "test-key",
      (url) =>
        new URL(url).searchParams.get("maptype") === "roadmap"
          ? Promise.reject(new Error("roadmap auth failed"))
          : Promise.resolve(),
    );

    expect(snapshot.layers?.satellite?.url).toContain("maptype=satellite");
    expect(snapshot.layers?.roadmap).toEqual({
      url: null,
      visible: false,
      opacity: 1,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Roadmap layer could not be preloaded"),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("migrates a legacy single-image snapshot into a satellite layer", () => {
    const snapshot = createMapSnapshot({
      centerLat: -33.8688,
      centerLng: 151.2093,
      zoom: 19,
      viewportWidth: 640,
      viewportHeight: 360,
      capturedAt: "2026-05-22T00:00:00.000Z",
    });

    const normalized = normalizeMapSnapshot({
      ...snapshot,
      url: "https://example.test/legacy-satellite.png",
    });

    expect(normalized?.layers?.satellite).toEqual({
      url: "https://example.test/legacy-satellite.png",
      visible: true,
      opacity: 1,
    });
    expect(normalized?.layers?.roadmap).toEqual({
      url: null,
      visible: false,
      opacity: 1,
    });
  });

  it("updates layer visibility and opacity without replacing the snapshot", () => {
    const snapshot = createMapSnapshot({
      centerLat: -33.8688,
      centerLng: 151.2093,
      zoom: 19,
      viewportWidth: 640,
      viewportHeight: 360,
      capturedAt: "2026-05-22T00:00:00.000Z",
    });
    const layered = normalizeMapSnapshot(snapshot, "test-key");

    const updated = updateMapSnapshotLayer(layered!, "roadmap", {
      visible: true,
      opacity: 0.5,
    });

    expect(updated.centerLat).toBe(snapshot.centerLat);
    expect(updated.layers?.satellite?.visible).toBe(true);
    expect(updated.layers?.roadmap).toMatchObject({
      visible: true,
      opacity: 0.5,
    });
  });
});
