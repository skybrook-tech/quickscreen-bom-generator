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
});
