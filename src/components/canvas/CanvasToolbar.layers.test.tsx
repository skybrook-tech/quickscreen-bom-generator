import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasToolbar } from "./CanvasToolbar";
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
});
