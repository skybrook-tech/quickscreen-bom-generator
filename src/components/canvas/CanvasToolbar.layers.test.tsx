import { act } from "react";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasToolbar } from "./CanvasToolbar";
import type { initCanvasEngine } from "./canvasEngine";
import { updateMapSnapshotLayer } from "../../lib/googleMaps/staticSnapshot";
import type {
  CanonicalMapLayerId,
  CanonicalMapSnapshot,
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

  it("emits map underlay visibility and opacity updates with per-layer checkboxes", () => {
    const onMapLayerChange = vi.fn();
    const { container, root } = renderToolbar(onMapLayerChange);

    const satelliteToggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Show Satellite layer"]',
    );
    const roadmapToggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Show Roadmap layer"]',
    );
    expect(satelliteToggle?.checked).toBe(true);
    expect(roadmapToggle?.checked).toBe(true);

    const satelliteOpacity = container.querySelector<HTMLInputElement>(
      'input[aria-label="Satellite layer opacity"]',
    );
    expect(satelliteOpacity).not.toBeNull();
    act(() => {
      satelliteOpacity!.value = "45";
      satelliteOpacity!.dispatchEvent(new Event("input", { bubbles: true }));
      satelliteOpacity!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    act(() => {
      roadmapToggle!.click();
    });

    const mapToggle = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Hide map underlay"]',
    );
    expect(mapToggle).not.toBeNull();
    act(() => {
      mapToggle!.click();
    });

    expect(onMapLayerChange).toHaveBeenNthCalledWith(1, "satellite", {
      opacity: 0.45,
    });
    expect(onMapLayerChange).toHaveBeenNthCalledWith(2, "roadmap", {
      visible: false,
    });
    expect(onMapLayerChange).toHaveBeenNthCalledWith(3, "satellite", {
      visible: false,
    });
    expect(onMapLayerChange).toHaveBeenNthCalledWith(4, "roadmap", {
      visible: false,
    });

    act(() => root.unmount());
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

  it("keeps map visibility and opacity changes after a canonical-state rerender", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const initialSnapshot: CanonicalMapSnapshot = {
      centerLat: -33.8688,
      centerLng: 151.2093,
      zoom: 19,
      width: 640,
      height: 360,
      metresPerPixel: 0.2,
      capturedAt: "2026-05-22T00:00:00.000Z",
      layers: {
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
      },
    };

    function Harness() {
      const [snapshot, setSnapshot] = useState(initialSnapshot);
      return (
        <CanvasToolbar
          engineRef={{ current: null }}
          activeTool="draw"
          onToolChange={() => undefined}
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
          freehandStyle={freehandStyle}
          onFreehandStyleChange={() => undefined}
          mapLayers={snapshot.layers}
          onMapLayerChange={(layerId, updates) =>
            setSnapshot((current) =>
              updateMapSnapshotLayer(current, layerId, updates),
            )
          }
        />
      );
    }

    act(() => {
      root.render(<Harness />);
    });

    const hideMap = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Hide map underlay"]',
    );
    expect(hideMap).not.toBeNull();

    act(() => {
      hideMap!.click();
    });
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Show map underlay"]',
      ),
    ).not.toBeNull();

    act(() => {
      root.render(<Harness />);
    });
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Show map underlay"]',
      ),
    ).not.toBeNull();

    const showMap = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Show map underlay"]',
    );
    act(() => {
      showMap!.click();
    });
    const roadmapOpacity = container.querySelector<HTMLInputElement>(
      'input[aria-label="Roadmap layer opacity"]',
    );
    expect(roadmapOpacity?.disabled).toBe(false);
    act(() => {
      roadmapOpacity!.value = "50";
      roadmapOpacity!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Hide map underlay"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Roadmap layer opacity"]',
      )?.value,
    ).toBe("50");

    act(() => root.unmount());
  });

  it("batches whole-map visibility changes so both layers hide in one update", () => {
    const onMapLayerChange = vi.fn();
    const onMapLayersChange = vi.fn();
    const { container, root } = renderToolbar(onMapLayerChange, null, {
      onMapLayersChange,
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Hide map underlay"]')!
        .click();
    });

    expect(onMapLayerChange).not.toHaveBeenCalled();
    expect(onMapLayersChange).toHaveBeenCalledTimes(1);
    expect(onMapLayersChange).toHaveBeenCalledWith({
      satellite: { visible: false },
      roadmap: { visible: false },
    });

    act(() => root.unmount());
  });

  it("emits an independent update when the roadmap layer is enabled", () => {
    const onMapLayerChange = vi.fn();
    const { container, root } = renderToolbar(vi.fn(), null, {
      mapLayers: {
        satellite: {
          url: "https://example.test/satellite.png",
          visible: true,
          opacity: 1,
        },
        roadmap: {
          url: "https://example.test/roadmap.png",
          visible: false,
          opacity: 0.5,
        },
      },
      onMapLayersChange: onMapLayerChange,
    });

    const roadmapToggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Show Roadmap layer"]',
    );
    const roadmapOpacity = container.querySelector<HTMLInputElement>(
      'input[aria-label="Roadmap layer opacity"]',
    );
    expect(roadmapToggle?.checked).toBe(false);
    expect(roadmapOpacity?.disabled).toBe(true);

    act(() => {
      roadmapToggle!.click();
    });

    expect(onMapLayerChange).toHaveBeenCalledWith({
      roadmap: { visible: true },
    });

    act(() => root.unmount());
  });

  it("restores the previous partial map layer visibility when toggled back on", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const changes: Array<{
      layerId: CanonicalMapLayerId;
      updates: Partial<Pick<CanonicalMapSnapshotLayer, "visible" | "opacity">>;
    }> = [];
    const initialSnapshot: CanonicalMapSnapshot = {
      centerLat: -33.8688,
      centerLng: 151.2093,
      zoom: 19,
      width: 640,
      height: 360,
      metresPerPixel: 0.2,
      capturedAt: "2026-05-22T00:00:00.000Z",
      layers: {
        satellite: {
          url: "https://example.test/satellite.png",
          visible: true,
          opacity: 1,
        },
        roadmap: {
          url: "https://example.test/roadmap.png",
          visible: false,
          opacity: 0.5,
        },
      },
    };

    function Harness() {
      const [snapshot, setSnapshot] = useState(initialSnapshot);
      return (
        <CanvasToolbar
          engineRef={{ current: null }}
          activeTool="draw"
          onToolChange={() => undefined}
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
          freehandStyle={freehandStyle}
          onFreehandStyleChange={() => undefined}
          mapLayers={snapshot.layers}
          onMapLayerChange={(layerId, updates) => {
            changes.push({ layerId, updates });
            setSnapshot((current) =>
              updateMapSnapshotLayer(current, layerId, updates),
            );
          }}
        />
      );
    }

    act(() => {
      root.render(<Harness />);
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Hide map underlay"]')!
        .click();
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Show map underlay"]')!
        .click();
    });

    expect(changes).toContainEqual({
      layerId: "satellite",
      updates: { visible: true, opacity: 1 },
    });
    expect(changes).toContainEqual({
      layerId: "roadmap",
      updates: { visible: false, opacity: 0.5 },
    });

    act(() => root.unmount());
  });

  it("starts optional snap/grid controls unchecked and omits Ortho", () => {
    const { container, root } = renderToolbar(vi.fn());

    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Angle snap"]')
        ?.checked,
    ).toBe(false);
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Gate snap 100mm"]',
      )?.checked,
    ).toBe(false);
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Show grid"]')
        ?.checked,
    ).toBe(false);
    expect(container.textContent).not.toContain("Ortho");

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

  it("opens the mobile layers sheet at roughly half-screen height with internal scrolling", () => {
    const { container, root } = renderToolbar(vi.fn());
    const layersButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open map layers"]',
    );

    act(() => {
      layersButton!.click();
    });

    const sheet = container.querySelector<HTMLElement>(
      '[data-testid="layers-bottom-sheet"]',
    );
    expect(sheet).not.toBeNull();
    expect(sheet?.className).toContain("min-h-[45dvh]");
    expect(sheet?.className).toContain("max-h-[45dvh]");
    expect(sheet?.className).toContain("overflow-y-auto");

    act(() => root.unmount());
  });
});
