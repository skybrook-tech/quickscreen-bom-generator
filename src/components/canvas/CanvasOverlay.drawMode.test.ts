/// <reference types="google.maps" />

import { afterEach, describe, expect, it, vi } from "vitest";
import { metresToLatLng, latLngToMetres, type LatLngLiteral } from "../../lib/geo/coordinates";
import type { CanonicalPayload } from "../../types/canonical.types";
import { canvasLayoutToCanonical, mergeCanonicalPreservingSegmentMeta } from "./canonicalAdapter";
import { initCanvasEngine, type CanvasLayout } from "./canvasEngine";

const anchor: LatLngLiteral = {
  lat: -28.503385,
  lng: 153.526262,
};

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

function installCanvasMock() {
  const context = new Proxy(
    {
      canvas: document.createElement("canvas"),
      measureText: (text: string) => ({ width: text.length * 6 }),
      getLineDash: () => [],
    },
    {
      get(target, key) {
        if (key in target) return target[key as keyof typeof target];
        return () => undefined;
      },
      set(target, key, value) {
        (target as Record<PropertyKey, unknown>)[key] = value;
        return true;
      },
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
}

function installGoogleMapsMock() {
  const overlayMouseTarget = document.createElement("div");

  class FakeLatLng {
    private readonly value: LatLngLiteral;

    constructor(latOrLiteral: number | LatLngLiteral, lng?: number) {
      this.value =
        typeof latOrLiteral === "number"
          ? { lat: latOrLiteral, lng: lng ?? 0 }
          : latOrLiteral;
    }

    lat() {
      return this.value.lat;
    }

    lng() {
      return this.value.lng;
    }
  }

  class FakeOverlayView {
    setMap(map: unknown) {
      if (map) {
        (this as unknown as { onAdd?: () => void; draw?: () => void }).onAdd?.();
        (this as unknown as { onAdd?: () => void; draw?: () => void }).draw?.();
      } else {
        (this as unknown as { onRemove?: () => void }).onRemove?.();
      }
    }

    getPanes() {
      return { overlayMouseTarget };
    }

    getProjection() {
      return {
        fromLatLngToDivPixel(latLng: FakeLatLng) {
          const offset = latLngToMetres(anchor, {
            lat: latLng.lat(),
            lng: latLng.lng(),
          });
          return {
            x: 500 + offset.dxMetres * 100,
            y: 500 - offset.dyMetres * 100,
          };
        },
      };
    }
  }

  class FakeMap {
    addListener() {
      return { remove: vi.fn() };
    }

    getBounds() {
      return {
        getNorthEast: () => new FakeLatLng(metresToLatLng(anchor, 5, 5)),
        getSouthWest: () => new FakeLatLng(metresToLatLng(anchor, -5, -5)),
      };
    }
  }

  vi.stubGlobal("google", {
    maps: {
      LatLng: FakeLatLng,
      Map: FakeMap,
      OverlayView: FakeOverlayView,
    },
  });

  return { overlayMouseTarget };
}

function dispatchCanvasClick(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  canvas.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, button: 0, clientX, clientY }),
  );
  canvas.dispatchEvent(
    new MouseEvent("mouseup", { bubbles: true, button: 0, clientX, clientY }),
  );
}

function requireCanonicalPayload(value: CanonicalPayload | null): CanonicalPayload {
  expect(value).not.toBeNull();
  if (!value) throw new Error("Expected canonical payload to be updated.");
  return value;
}

describe("CanvasOverlay draw mode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("lets draw-mode clicks reach the canvas and persist metre offsets from the anchor", async () => {
    installCanvasMock();
    const { overlayMouseTarget } = installGoogleMapsMock();
    const { CanvasOverlay } = await import("../../lib/googleMaps/CanvasOverlay");

    const fallbackParent = document.createElement("div");
    const canvas = document.createElement("canvas");
    fallbackParent.appendChild(canvas);
    document.body.appendChild(fallbackParent);
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 1000,
      width: 1000,
      height: 1000,
      toJSON: () => ({}),
    } as DOMRect);

    const latest: { canonical: CanonicalPayload | null } = { canonical: null };
    const previous: CanonicalPayload = {
      productCode: "QSHS",
      schemaVersion: "v1",
      variables,
      propertyAnchor: {
        lat: anchor.lat,
        lng: anchor.lng,
        address: "9 Mogo Place, Billinudgel NSW, Australia",
      },
      runs: [],
    };
    const stableIds = {
      "run:0": "11111111-1111-4111-8111-111111111111",
      "0:0": "22222222-2222-4222-8222-222222222222",
    };
    const engine = initCanvasEngine(canvas, {
      snapToGrid: true,
      gridSize: 20,
      showGrid: true,
      onLayoutChange: (layout: CanvasLayout) => {
        latest.canonical = mergeCanonicalPreservingSegmentMeta(
          previous,
          canvasLayoutToCanonical(layout, "QSHS", variables, { ...stableIds }),
        );
      },
    });
    engine.setTool("draw");

    const overlay = new CanvasOverlay({
      map: new google.maps.Map(document.createElement("div")),
      canvas,
      fallbackParent,
      engine,
      anchor,
      drawMode: false,
    });
    overlay.setDrawMode(true);

    expect(overlayMouseTarget.contains(canvas)).toBe(true);
    expect(canvas.style.pointerEvents).toBe("auto");

    dispatchCanvasClick(canvas, 500, 500);
    dispatchCanvasClick(canvas, 500, 300);

    const canonical = requireCanonicalPayload(latest.canonical);
    const metrePoints = canonical.runs[0]?.geometry?.metrePoints ?? [];
    expect(metrePoints).toHaveLength(2);
    expect(metrePoints[0].dxMetres).toBeCloseTo(0, 6);
    expect(metrePoints[0].dyMetres).toBeCloseTo(0, 6);
    expect(metrePoints[1].dxMetres).toBeCloseTo(0, 6);
    expect(metrePoints[1].dyMetres).toBeCloseTo(2, 6);

    overlay.setMap(null);
    engine.destroy();
  });
});
