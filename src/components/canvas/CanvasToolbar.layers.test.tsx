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
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const mapLayers = {
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
        mapLayers={mapLayers}
        onMapLayerChange={onMapLayerChange}
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

  it("emits map underlay visibility and opacity updates without per-layer checkboxes", () => {
    const onMapLayerChange = vi.fn();
    const { container, root } = renderToolbar(onMapLayerChange);

    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Show Satellite layer"]',
      ),
    ).toBeNull();
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Show Roadmap layer"]',
      ),
    ).toBeNull();

    const satelliteOpacity = container.querySelector<HTMLInputElement>(
      'input[aria-label="Satellite layer opacity"]',
    );
    expect(satelliteOpacity).not.toBeNull();
    act(() => {
      satelliteOpacity!.value = "45";
      satelliteOpacity!.dispatchEvent(new Event("input", { bubbles: true }));
      satelliteOpacity!.dispatchEvent(new Event("change", { bubbles: true }));
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
    expect(onMapLayerChange).toHaveBeenNthCalledWith(2, "satellite", {
      visible: false,
    });
    expect(onMapLayerChange).toHaveBeenNthCalledWith(3, "roadmap", {
      visible: false,
    });

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

  it("re-enables a hidden captured layer when its opacity is adjusted", () => {
    const onMapLayerChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
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
          mapLayers={{
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
          }}
          onMapLayerChange={onMapLayerChange}
        />,
      );
    });

    const roadmapOpacity = container.querySelector<HTMLInputElement>(
      'input[aria-label="Roadmap layer opacity"]',
    );
    expect(roadmapOpacity).not.toBeNull();

    act(() => {
      roadmapOpacity!.value = "75";
      roadmapOpacity!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(onMapLayerChange).toHaveBeenCalledWith("roadmap", {
      opacity: 0.75,
      visible: true,
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

  it("shows canvas zoom controls wired to the engine", () => {
    const engine = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetView: vi.fn(),
    };
    const { container, root } = renderToolbar(vi.fn(), engine);

    const zoomIn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom in canvas"]',
    );
    const zoomOut = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom out canvas"]',
    );

    expect(zoomIn).not.toBeNull();
    expect(zoomOut).not.toBeNull();

    act(() => {
      zoomIn!.click();
      zoomOut!.click();
    });

    expect(engine.zoomIn).toHaveBeenCalledTimes(1);
    expect(engine.zoomOut).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });
});
