import { act } from "react";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasToolbar } from "./CanvasToolbar";
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
      visible: false,
      opacity: 1,
    },
  };

  act(() => {
    root.render(
      <CanvasToolbar
        engineRef={{ current: null }}
        activeTool="draw"
        onToolChange={() => undefined}
        snapEnabled={false}
        onSnapToggle={() => undefined}
        orthoEnabled={false}
        onOrthoToggle={() => undefined}
        gateSnap100={false}
        onGateSnap100Toggle={() => undefined}
        showGrid
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

  it("emits canonical snapshot layer visibility and opacity updates", () => {
    const onMapLayerChange = vi.fn();
    const { container, root } = renderToolbar(onMapLayerChange);

    const roadmapToggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Show Roadmap layer"]',
    );
    expect(roadmapToggle).not.toBeNull();
    act(() => {
      roadmapToggle!.click();
    });

    const satelliteOpacity = container.querySelector<HTMLInputElement>(
      'input[aria-label="Satellite layer opacity"]',
    );
    expect(satelliteOpacity).not.toBeNull();
    act(() => {
      satelliteOpacity!.value = "45";
      satelliteOpacity!.dispatchEvent(new Event("input", { bubbles: true }));
      satelliteOpacity!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onMapLayerChange).toHaveBeenNthCalledWith(1, "roadmap", {
      visible: true,
    });
    expect(onMapLayerChange).toHaveBeenNthCalledWith(2, "satellite", {
      opacity: 0.45,
    });

    act(() => root.unmount());
  });

  it("keeps layer checkbox and opacity changes after a canonical-state rerender", () => {
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
          visible: false,
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
          orthoEnabled={false}
          onOrthoToggle={() => undefined}
          gateSnap100={false}
          onGateSnap100Toggle={() => undefined}
          showGrid
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

    const roadmapToggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Show Roadmap layer"]',
    );
    const roadmapOpacity = container.querySelector<HTMLInputElement>(
      'input[aria-label="Roadmap layer opacity"]',
    );
    expect(roadmapToggle?.checked).toBe(false);

    act(() => {
      roadmapToggle!.click();
    });
    expect(roadmapToggle?.checked).toBe(true);
    expect(roadmapOpacity?.disabled).toBe(false);

    act(() => {
      roadmapOpacity!.value = "50";
      roadmapOpacity!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(roadmapOpacity?.value).toBe("50");

    act(() => {
      root.render(<Harness />);
    });
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Show Roadmap layer"]',
      )?.checked,
    ).toBe(true);
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Roadmap layer opacity"]',
      )?.value,
    ).toBe("50");

    act(() => root.unmount());
  });
});
