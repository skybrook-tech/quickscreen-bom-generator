import { afterEach, describe, expect, it, vi } from "vitest";
import { initCanvasEngine, type CanvasLayout } from "./canvasEngine";
import {
  canvasLayoutToCanonical,
  canonicalToCanvasLayout,
} from "./canonicalAdapter";
import { GATE_SEGMENT_STUB_KEYS } from "../../lib/segmentTermination";

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

function installZoomCanvasMock() {
  const scaleCalls: Array<[number, number]> = [];
  const translateCalls: Array<[number, number]> = [];
  const context = new Proxy(
    {
      canvas: document.createElement("canvas"),
      measureText: (text: string) => ({ width: text.length * 6 }),
      getLineDash: () => [],
      translate: (x: number, y: number) => {
        translateCalls.push([x, y]);
      },
      scale: (x: number, y: number) => {
        scaleCalls.push([x, y]);
      },
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
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);

  return {
    latestZoom() {
      return scaleCalls[scaleCalls.length - 1]?.[0] ?? 0;
    },
    latestPan() {
      const latest = translateCalls[translateCalls.length - 1];
      return latest ? { x: latest[0], y: latest[1] } : { x: 0, y: 0 };
    },
  };
}

function installLayerCanvasMock() {
  const drawImage = vi.fn();
  const alphaWrites: number[] = [];
  const context = new Proxy(
    {
      canvas: document.createElement("canvas"),
      measureText: (text: string) => ({ width: text.length * 6 }),
      getLineDash: () => [],
      drawImage,
      get globalAlpha() {
        return alphaWrites.length > 0 ? alphaWrites[alphaWrites.length - 1] : 1;
      },
      set globalAlpha(value: number) {
        alphaWrites.push(value);
      },
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
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);

  class MockImage {
    width = 640;
    height = 360;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    crossOrigin = "";
    #src = "";

    set src(value: string) {
      this.#src = value;
      queueMicrotask(() => this.onload?.());
    }

    get src() {
      return this.#src;
    }
  }

  vi.stubGlobal("Image", MockImage);
  return { drawImage, alphaWrites };
}

function clickCanvas(canvas: HTMLCanvasElement, x: number, y: number) {
  canvas.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  );
  canvas.dispatchEvent(
    new MouseEvent("mouseup", {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  );
}

type TestTouch = Pick<Touch, "clientX" | "clientY">;

function dispatchTouch(
  canvas: HTMLCanvasElement,
  type: "touchstart" | "touchmove" | "touchend",
  touches: TestTouch[],
  changedTouches: TestTouch[] = touches,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: touches as unknown as TouchList,
  });
  Object.defineProperty(event, "changedTouches", {
    value: changedTouches as unknown as TouchList,
  });
  canvas.dispatchEvent(event);
}

describe("canvas engine Static Maps snapshot scale", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("converts known snapshot pixel distances into real metres", () => {
    installCanvasMock();
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
        right: 640,
        bottom: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const metresPerPixel = 0.1;
    const engine = initCanvasEngine(canvas, {
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
    });
    engine.setScale(1 / metresPerPixel);
    engine.fitToWidth(640 * metresPerPixel);

    clickCanvas(canvas, 100, 100);
    clickCanvas(canvas, 200, 100);

    const layout = engine.getLayout();
    expect(layout.segments).toHaveLength(1);
    expect(layout.segments[0].lengthMM).toBeCloseTo(10000, 1);
    expect(layout.totalLengthM).toBeCloseTo(10, 3);

    engine.destroy();
    canvas.remove();
  });

  it("draws visible Static Maps layers in stack order with their own opacities", async () => {
    const { drawImage, alphaWrites } = installLayerCanvasMock();
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
        right: 640,
        bottom: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const engine = initCanvasEngine(canvas, {
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
    });
    engine.loadMapTileLayers(
      [
        { imageUrl: "https://example.test/satellite.png", opacity: 1 },
        { imageUrl: "https://example.test/roadmap.png", opacity: 0.5 },
      ],
      -33.8688,
      19,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(alphaWrites.slice(0, 2)).toEqual([1, 0.5]);

    engine.loadMapTileLayers([], -33.8688, 19);
    expect(engine.hasSatelliteUnderlay()).toBe(false);

    engine.destroy();
    canvas.remove();
  });

  it("zooms via engine buttons, direct wheel, Ctrl-wheel, and reset", () => {
    const { latestZoom } = installZoomCanvasMock();
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
        right: 640,
        bottom: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const engine = initCanvasEngine(canvas, {
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
    });
    engine.setViewportTransform({
      pan: { x: -320, y: -180 },
      zoom: 2,
      scale: 10,
    });
    const defaultZoom = latestZoom();

    engine.zoomIn();
    expect(latestZoom()).toBeGreaterThan(defaultZoom);

    engine.zoomOut();
    engine.zoomOut();
    expect(latestZoom()).toBeLessThan(defaultZoom);

    const beforeWheel = latestZoom();
    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        deltaY: -100,
        clientX: 120,
        clientY: 120,
      }),
    );
    expect(latestZoom()).toBeGreaterThan(beforeWheel);

    const beforeCtrlWheel = latestZoom();
    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        ctrlKey: true,
        deltaY: 100,
        clientX: 120,
        clientY: 120,
      }),
    );
    expect(latestZoom()).toBeLessThan(beforeCtrlWheel);

    engine.resetView();
    expect(latestZoom()).toBeCloseTo(defaultZoom, 6);

    engine.destroy();
    canvas.remove();
  });

  it("zooms the map canvas with a two-finger pinch gesture", () => {
    const { latestZoom } = installZoomCanvasMock();
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
        right: 640,
        bottom: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const engine = initCanvasEngine(canvas, {
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
    });
    engine.setViewportTransform({
      pan: { x: 0, y: 0 },
      zoom: 1,
      scale: 10,
    });

    dispatchTouch(canvas, "touchstart", [
      { clientX: 200, clientY: 180 },
      { clientX: 300, clientY: 180 },
    ]);
    dispatchTouch(canvas, "touchmove", [
      { clientX: 175, clientY: 180 },
      { clientX: 325, clientY: 180 },
    ]);

    expect(latestZoom()).toBeGreaterThan(1);

    dispatchTouch(
      canvas,
      "touchend",
      [],
      [
        { clientX: 175, clientY: 180 },
        { clientX: 325, clientY: 180 },
      ],
    );

    engine.destroy();
    canvas.remove();
  });

  it("zooms out below the default view down to the larger snapshot reveal level", () => {
    const { latestZoom } = installZoomCanvasMock();
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
        right: 640,
        bottom: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const engine = initCanvasEngine(canvas, {
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
    });
    engine.setViewportTransform({
      pan: { x: 0, y: 0 },
      zoom: 1,
      scale: 10,
    });

    engine.zoomOut();
    expect(latestZoom()).toBeCloseTo(1 / 1.2, 6);

    for (let i = 0; i < 8; i++) {
      engine.zoomOut();
    }
    expect(latestZoom()).toBeCloseTo(0.5, 6);

    engine.destroy();
    canvas.remove();
  });

  it("preserves the zoomed-out viewport when finishing a run and syncing the same layout", () => {
    const { latestPan, latestZoom } = installZoomCanvasMock();
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
        right: 640,
        bottom: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const layoutChanges: CanvasLayout[] = [];
    const engine = initCanvasEngine(canvas, {
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
      onLayoutChange: (layout) => {
        layoutChanges.push(layout);
      },
    });
    engine.setViewportTransform({
      pan: { x: -320, y: -180 },
      zoom: 0.5,
      scale: 10,
    });

    clickCanvas(canvas, 200, 160);
    clickCanvas(canvas, 320, 160);
    canvas.dispatchEvent(
      new MouseEvent("dblclick", {
        bubbles: true,
        button: 0,
        clientX: 320,
        clientY: 160,
      }),
    );
    const finishedLayout = layoutChanges[layoutChanges.length - 1];
    expect(finishedLayout?.segments).toHaveLength(1);
    if (!finishedLayout) throw new Error("Expected a finished layout change");

    const panBeforeSync = latestPan();
    const zoomBeforeSync = latestZoom();
    engine.loadLayout(finishedLayout);

    expect(latestPan()).toEqual(panBeforeSync);
    expect(latestZoom()).toBeCloseTo(zoomBeforeSync, 6);
    expect(engine.getLayout().segments[0]).toMatchObject({
      startX: 1040,
      startY: 680,
      endX: 1280,
      endY: 680,
    });

    engine.destroy();
    canvas.remove();
  });

  it("preserves the viewport when a finished run syncs through canonical rounded lengths", () => {
    const { latestPan, latestZoom } = installZoomCanvasMock();
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
        right: 640,
        bottom: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const layoutChanges: CanvasLayout[] = [];
    const engine = initCanvasEngine(canvas, {
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
      onLayoutChange: (layout) => {
        layoutChanges.push(layout);
      },
    });
    engine.setViewportTransform({
      pan: { x: -320, y: -180 },
      zoom: 0.5,
      scale: 7.3,
    });

    clickCanvas(canvas, 200, 160);
    clickCanvas(canvas, 323, 177);
    canvas.dispatchEvent(
      new MouseEvent("dblclick", {
        bubbles: true,
        button: 0,
        clientX: 323,
        clientY: 177,
      }),
    );
    const finishedLayout = layoutChanges[layoutChanges.length - 1];
    expect(finishedLayout?.segments).toHaveLength(1);
    if (!finishedLayout) throw new Error("Expected a finished layout change");

    const canonical = canvasLayoutToCanonical(finishedLayout, "QSHS", {});
    const roundTrippedLayout = canonicalToCanvasLayout(canonical);
    expect(roundTrippedLayout.segments[0].lengthMM).not.toBe(
      finishedLayout.segments[0].lengthMM,
    );

    const panBeforeSync = latestPan();
    const zoomBeforeSync = latestZoom();
    engine.loadLayout(roundTrippedLayout);

    expect(latestPan()).toEqual(panBeforeSync);
    expect(latestZoom()).toBeCloseTo(zoomBeforeSync, 6);

    engine.destroy();
    canvas.remove();
  });

  it("does not angle-snap drawing points while snap is disabled", () => {
    installCanvasMock();
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
        right: 640,
        bottom: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    const engine = initCanvasEngine(canvas, {
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
      allowedAngles: [90],
    });
    engine.setViewportTransform({
      pan: { x: 0, y: 0 },
      zoom: 1,
      scale: 10,
    });

    clickCanvas(canvas, 100, 100);
    clickCanvas(canvas, 250, 187);
    clickCanvas(canvas, 360, 229);

    const layout = engine.getLayout();
    expect(layout.segments[0]).toMatchObject({
      startX: 100,
      startY: 100,
      endX: 250,
      endY: 187,
    });
    expect(layout.segments[1]).toMatchObject({
      startX: 250,
      startY: 187,
      endX: 360,
      endY: 229,
    });

    engine.destroy();
    canvas.remove();
  });

  it("keeps Gate mode active and supports gate variables plus session removal", () => {
    installCanvasMock();
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
        right: 640,
        bottom: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const variables = {
      [GATE_SEGMENT_STUB_KEYS.gateMovement]: "single_swing",
      [GATE_SEGMENT_STUB_KEYS.openingDirection]: "out",
      [GATE_SEGMENT_STUB_KEYS.hingeType]: "TC-H-AT-HD-B",
      [GATE_SEGMENT_STUB_KEYS.latchType]: "LL-DL-KA",
      [GATE_SEGMENT_STUB_KEYS.slatGapMm]: 9,
    };
    const placedIds: string[] = [];
    let engine: ReturnType<typeof initCanvasEngine>;
    engine = initCanvasEngine(canvas, {
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
      onGatePlaced: (flatSegIdx, gateIdx) => {
        const gateId = `gate-${gateIdx}`;
        placedIds.push(gateId);
        engine.setGateId(flatSegIdx, gateIdx, gateId);
        engine.setGateVariables(gateId, variables);
      },
    });

    engine.setViewportTransform({ pan: { x: 0, y: 0 }, zoom: 1, scale: 100 });
    clickCanvas(canvas, 100, 100);
    clickCanvas(canvas, 300, 100);
    engine.setTool("gate");
    engine.setPendingGatePlacement({
      gateType: "single-swing",
      widthMM: 900,
      swingDirection: "out",
      slidingSide: "front",
      variables,
    });

    clickCanvas(canvas, 150, 100);
    clickCanvas(canvas, 250, 100);

    const layoutWithGates = engine.getLayout();
    expect(placedIds).toEqual(["gate-0", "gate-1"]);
    expect(layoutWithGates.gates).toHaveLength(2);
    expect(layoutWithGates.gates[0].variables).toMatchObject(variables);
    expect(layoutWithGates.gates[1].variables).toMatchObject(variables);

    engine.removeGatesById(placedIds);
    expect(engine.getLayout().gates).toHaveLength(0);

    engine.destroy();
    canvas.remove();
  });
});
