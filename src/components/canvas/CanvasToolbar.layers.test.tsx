import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasToolbar } from "./CanvasToolbar";
import type { initCanvasEngine } from "./canvasEngine";
import type {
  CanonicalMapLayerId,
  CanonicalMapSnapshotLayer,
} from "../../types/canonical.types";

const freehandStyle = {
  color: "#3b82f6",
  width: 2,
  lineStyle: "solid" as const,
  opacity: 1,
  arrow: false,
};

function renderToolbar(
  onMapLayerChange: (
    layerId: CanonicalMapLayerId,
    updates: Partial<Pick<CanonicalMapSnapshotLayer, "visible" | "opacity">>,
  ) => void,
  engine: Partial<ReturnType<typeof initCanvasEngine>> | null = null,
  options: {
    canUndo?: boolean;
    canRedo?: boolean;
    onToolChange?: (tool: Parameters<typeof CanvasToolbar>[0]["activeTool"]) => void;
    onMapLayersChange?: (
      updates: Partial<
        Record<
          CanonicalMapLayerId,
          Partial<Pick<CanonicalMapSnapshotLayer, "visible" | "opacity">>
        >
      >,
    ) => void;
    mapLayers?: Partial<Record<CanonicalMapLayerId, CanonicalMapSnapshotLayer>>;
  } = {},
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const mapLayers = options.mapLayers ?? {
    satellite: {
      url: "https://example.test/satellite.png",
      visible: true,
      opacity: 1,
    },
    roadmap: {
      url: "https://example.test/roadmap.png",
      visible: true,
      opacity: 1,
    },
  };

  act(() => {
    root.render(
      <CanvasToolbar
        engineRef={{
          current: engine as ReturnType<typeof initCanvasEngine> | null,
        }}
        activeTool="draw"
        onToolChange={options.onToolChange ?? (() => undefined)}
        snapEnabled={false}
        onSnapToggle={() => undefined}
        gateSnap100={false}
        onGateSnap100Toggle={() => undefined}
        showGrid={false}
        onToggleGrid={() => undefined}
        expanded={false}
        onToggleExpand={() => undefined}
        onHelpOpen={() => undefined}
        onPrintMap={() => undefined}
        canUndo={options.canUndo}
        canRedo={options.canRedo}
        freehandStyle={freehandStyle}
        onFreehandStyleChange={() => undefined}
        mapLayers={mapLayers}
        onMapLayerChange={onMapLayerChange}
        onMapLayersChange={options.onMapLayersChange}
      />,
    );
  });

  return { container, root };
}

describe("CanvasToolbar map layers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });



  it("routes Gate toolbar clicks through the engine and parent tool handler", () => {
    const onMapLayerChange = vi.fn();
    const setTool = vi.fn();
    const onToolChange = vi.fn();
    const { container, root } = renderToolbar(onMapLayerChange, { setTool }, { onToolChange });

    const gateButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Gate"),
    );
    expect(gateButton).toBeDefined();

    act(() => {
      gateButton!.click();
    });

    expect(setTool).toHaveBeenCalledWith("gate");
    expect(onToolChange).toHaveBeenCalledWith("gate");

    act(() => root.unmount());
  });



  it("omits canvas zoom controls from the toolbar", () => {
    const engine = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
    };
    const { container, root } = renderToolbar(vi.fn(), engine);

    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Zoom in canvas"]',
      ),
    ).toBeNull();
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Zoom out canvas"]',
      ),
    ).toBeNull();

    expect(engine.zoomIn).not.toHaveBeenCalled();
    expect(engine.zoomOut).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it("disables undo and redo until history is available", () => {
    const engine = {
      undo: vi.fn(),
      redo: vi.fn(),
    };
    const { container, root } = renderToolbar(vi.fn(), engine);
    const undoButtons = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).filter((button) =>
      button.textContent?.includes("Undo"),
    );
    const redoButtons = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).filter((button) =>
      button.textContent?.includes("Redo"),
    );

    expect(undoButtons.length).toBeGreaterThan(0);
    expect(redoButtons.length).toBeGreaterThan(0);
    expect(undoButtons.every((button) => button.disabled)).toBe(true);
    expect(redoButtons.every((button) => button.disabled)).toBe(true);

    act(() => {
      undoButtons[0].click();
      redoButtons[0].click();
    });

    expect(engine.undo).not.toHaveBeenCalled();
    expect(engine.redo).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it("wires enabled undo and redo buttons to the engine", () => {
    const engine = {
      undo: vi.fn(),
      redo: vi.fn(),
    };
    const { container, root } = renderToolbar(vi.fn(), engine, {
      canUndo: true,
      canRedo: true,
    });
    const undoButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("Undo"),
    );
    const redoButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("Redo"),
    );

    expect(undoButton?.disabled).toBe(false);
    expect(redoButton?.disabled).toBe(false);

    act(() => {
      undoButton!.click();
      redoButton!.click();
    });

    expect(engine.undo).toHaveBeenCalledTimes(1);
    expect(engine.redo).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });

  it("opens a clear confirmation before clearing the canvas", () => {
    const engine = {
      clear: vi.fn(),
      setTool: vi.fn(),
    };
    const { container, root } = renderToolbar(vi.fn(), engine);
    const clearButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Clear canvas"]',
    );

    expect(clearButton).not.toBeNull();
    act(() => {
      clearButton!.click();
    });

    expect(engine.clear).not.toHaveBeenCalled();
    const dialog = container.querySelector<HTMLElement>(
      '[role="dialog"][aria-label="Clear canvas confirmation"]',
    );
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain(
      "This will delete all runs and gates. The map snapshot will be kept. This can be undone.",
    );

    const confirmClear = Array.from(dialog!.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === "Clear",
    );
    expect(confirmClear).not.toBeUndefined();
    act(() => {
      confirmClear!.click();
    });

    expect(engine.clear).toHaveBeenCalledTimes(1);
    expect(engine.setTool).toHaveBeenCalledWith("draw");

    act(() => root.unmount());
  });
});
