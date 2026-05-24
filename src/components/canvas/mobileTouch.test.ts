import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initCanvasEngine,
  snapRadiusForPointerType,
  type CanvasLayout,
} from "./canvasEngine";
import {
  applyGateDialogSaveToolState,
  touchActionForCanvasTool,
} from "./FenceLayoutCanvas";

type MockCanvasContext = CanvasRenderingContext2D & {
  lineTo: ReturnType<typeof vi.fn>;
};

function mockCanvasContext(): MockCanvasContext {
  const methods = new Map<PropertyKey, ReturnType<typeof vi.fn>>();
  const base = {
    measureText: vi.fn(() => ({ width: 24 })),
  };
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop as keyof typeof target];
      if (!methods.has(prop)) methods.set(prop, vi.fn());
      return methods.get(prop);
    },
    set() {
      return true;
    },
  }) as unknown as MockCanvasContext;
}

function touchAt(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
): Touch {
  return {
    clientX: x,
    clientY: y,
    identifier: 1,
    target: canvas,
  } as unknown as Touch;
}

function dispatchTouch(
  canvas: HTMLCanvasElement,
  type: "touchstart" | "touchmove" | "touchend",
  touches: Touch[],
  changedTouches = touches,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", { value: touches });
  Object.defineProperty(event, "changedTouches", { value: changedTouches });
  canvas.dispatchEvent(event);
}

function dispatchMouseDown(canvas: HTMLCanvasElement, x: number, y: number) {
  canvas.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  );
}

function createEngineHarness() {
  const host = document.createElement("div");
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  document.body.appendChild(host);
  Object.defineProperty(canvas, "getBoundingClientRect", {
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    }),
  });
  const context = mockCanvasContext();
  vi.spyOn(canvas, "getContext").mockReturnValue(context);
  let latestLayout: CanvasLayout | null = null;
  const engine = initCanvasEngine(canvas, {
    snapToGrid: false,
    gridSize: 20,
    showGrid: false,
    onLayoutChange: (layout) => {
      latestLayout = layout;
    },
  });

  return { canvas, context, engine, latestLayout: () => latestLayout };
}

describe("mobile canvas touch helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("uses a larger snap radius for touch than mouse input", () => {
    expect(snapRadiusForPointerType("touch")).toBe(44);
    expect(snapRadiusForPointerType("mouse")).toBe(8);
    expect(snapRadiusForPointerType()).toBe(8);
  });

  it("prevents page scroll while a drawing tool is active", () => {
    expect(touchActionForCanvasTool("draw")).toBe("none");
    expect(touchActionForCanvasTool("gate")).toBe("none");
    expect(touchActionForCanvasTool("move")).toBe("auto");
  });

  it("keeps the gate tool active after saving the gate dialog", () => {
    const setEngineTool = vi.fn();
    const setActiveTool = vi.fn();

    applyGateDialogSaveToolState({ setTool: setEngineTool }, setActiveTool);

    expect(setEngineTool).toHaveBeenCalledWith("gate");
    expect(setEngineTool).not.toHaveBeenCalledWith("move");
    expect(setActiveTool).toHaveBeenCalledWith("gate");
    expect(setActiveTool).not.toHaveBeenCalledWith("move");
  });

  it("does not draw a next-segment preview on tap start before placement", () => {
    const { canvas, context, engine, latestLayout } = createEngineHarness();

    dispatchTouch(canvas, "touchstart", [touchAt(canvas, 100, 100)]);
    dispatchTouch(canvas, "touchend", [], [touchAt(canvas, 100, 100)]);
    context.lineTo.mockClear();

    dispatchTouch(canvas, "touchstart", [touchAt(canvas, 200, 100)]);

    expect(context.lineTo).not.toHaveBeenCalled();

    dispatchTouch(canvas, "touchend", [], [touchAt(canvas, 200, 100)]);
    expect(latestLayout()?.segments).toHaveLength(1);
    engine.destroy();
  });

  it("restores 500ms long-press vertex dragging on touch", () => {
    const { canvas, engine, latestLayout } = createEngineHarness();

    dispatchTouch(canvas, "touchstart", [touchAt(canvas, 100, 100)]);
    dispatchTouch(canvas, "touchend", [], [touchAt(canvas, 100, 100)]);
    dispatchTouch(canvas, "touchstart", [touchAt(canvas, 200, 100)]);
    dispatchTouch(canvas, "touchend", [], [touchAt(canvas, 200, 100)]);
    const beforeDrag = latestLayout()?.segments[0];
    expect(beforeDrag).toBeDefined();

    dispatchTouch(canvas, "touchstart", [touchAt(canvas, 100, 100)]);
    vi.advanceTimersByTime(500);
    dispatchTouch(canvas, "touchmove", [touchAt(canvas, 140, 130)]);
    dispatchTouch(canvas, "touchend", [], [touchAt(canvas, 140, 130)]);

    const afterDrag = latestLayout()?.segments[0];
    expect(afterDrag?.startX).toBeGreaterThan(beforeDrag!.startX);
    expect(afterDrag?.startY).toBeGreaterThan(beforeDrag!.startY);
    engine.destroy();
  });

  it("caps undo history at 20 actions", () => {
    const { canvas, engine } = createEngineHarness();

    for (let index = 0; index < 25; index += 1) {
      dispatchMouseDown(canvas, 80 + index * 10, 100 + (index % 3) * 20);
    }

    expect(engine.getHistoryState()).toMatchObject({
      canUndo: true,
      canRedo: false,
      undoDepth: 20,
      redoDepth: 0,
    });
    engine.destroy();
  });

  it("updates undo and redo availability after history actions", () => {
    const { canvas, engine } = createEngineHarness();

    dispatchMouseDown(canvas, 100, 100);
    dispatchMouseDown(canvas, 200, 100);
    expect(engine.getHistoryState()).toMatchObject({
      canUndo: true,
      canRedo: false,
    });

    engine.undo();
    expect(engine.getHistoryState()).toMatchObject({
      canUndo: true,
      canRedo: true,
      redoDepth: 1,
    });

    engine.redo();
    expect(engine.getHistoryState()).toMatchObject({
      canUndo: true,
      canRedo: false,
      redoDepth: 0,
    });
    engine.destroy();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });
});
