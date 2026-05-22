import { afterEach, describe, expect, it, vi } from "vitest";
import { initCanvasEngine } from "./canvasEngine";

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
  const context = new Proxy(
    {
      canvas: document.createElement("canvas"),
      measureText: (text: string) => ({ width: text.length * 6 }),
      getLineDash: () => [],
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

  it("zooms via engine buttons, Ctrl+wheel, and reset without plain-wheel zoom", () => {
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

    const beforePlainWheel = latestZoom();
    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        deltaY: -100,
        clientX: 120,
        clientY: 120,
      }),
    );
    expect(latestZoom()).toBe(beforePlainWheel);

    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        ctrlKey: true,
        deltaY: -100,
        clientX: 120,
        clientY: 120,
      }),
    );
    expect(latestZoom()).toBeGreaterThan(beforePlainWheel);

    engine.resetView();
    expect(latestZoom()).toBeCloseTo(defaultZoom, 6);

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
});
