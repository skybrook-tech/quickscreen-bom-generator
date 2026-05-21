import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_MAPS_MISSING_API_KEY_MESSAGE } from "../lib/googleMaps/loader";
import type { GoogleMapsState } from "./useGoogleMaps";
import "../components/calculator/AddressInput.test";
import "../components/calculator/PropertyAnchorFormGate.test";
import "../components/calculator-v3/RunListV3.propertyAnchor.test";
import "../components/canvas/CanvasOverlay.drawMode.test";
import "../components/canvas/canonicalAdapter.propertyAnchor.test";
import "../components/canvas/mapOverlayIntegration.test";
import "../lib/geo/coordinates.test";
import "../pages/CalculatorV4Page.smoke.test";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderHookProbe(useHook: () => GoogleMapsState) {
  let latestState: GoogleMapsState | null = null;
  const container = document.createElement("div");
  const root = createRoot(container);

  function Probe() {
    latestState = useHook();
    return <output>{latestState.error?.message ?? ""}</output>;
  }

  return {
    get latestState() {
      return latestState;
    },
    async render() {
      await act(async () => {
        root.render(<Probe />);
      });
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      });
    },
    unmount() {
      act(() => root.unmount());
    },
  };
}

describe("useGoogleMaps", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("surfaces a clear error when VITE_GOOGLE_MAPS_API_KEY is missing", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    const { resetGoogleMapsLoaderForTests } = await import("../lib/googleMaps/loader");
    const { useGoogleMaps } = await import("./useGoogleMaps");
    resetGoogleMapsLoaderForTests();

    const probe = renderHookProbe(useGoogleMaps);
    await probe.render();

    expect(probe.latestState?.loading).toBe(false);
    expect(probe.latestState?.ready).toBe(false);
    expect(probe.latestState?.error?.message).toBe(GOOGLE_MAPS_MISSING_API_KEY_MESSAGE);

    probe.unmount();
  });
});
