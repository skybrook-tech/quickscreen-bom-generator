import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PROPERTY_MAP_INTERACTION_OPTIONS,
  PropertyAnchorFormGate,
  PropertyMap,
} from "./PropertyMap";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderGate(anchorConfirmed: boolean) {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(
      <PropertyAnchorFormGate anchorConfirmed={anchorConfirmed}>
        <button type="button">Schema driven form child</button>
      </PropertyAnchorFormGate>,
    );
  });
  return { container, root };
}

describe("PropertyAnchorFormGate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("keeps form children interactive before the property anchor is confirmed", () => {
    const { container, root } = renderGate(false);

    expect(container.querySelector("div[inert]")).toBeNull();
    expect(container.textContent).not.toContain("Confirm property location to start drawing");
    expect(container.querySelector("button")?.textContent).toBe("Schema driven form child");

    act(() => root.unmount());
  });

  it("keeps form children interactive once the property anchor is confirmed", () => {
    const { container, root } = renderGate(true);

    expect(container.querySelector("div[inert]")).toBeNull();
    expect(container.textContent).not.toContain("Confirm property location to start drawing");

    act(() => root.unmount());
  });

  it("collapses the property map to a slim row for an existing confirmed anchor", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <PropertyMap
          initialAnchor={{
            lat: -33.8688,
            lng: 151.2093,
            address: "1 Macquarie Street, Sydney NSW 2000, Australia",
          }}
          onAnchorConfirmed={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('[data-testid="property-map-collapsed"]')).not.toBeNull();
    expect(container.textContent).toContain("1 Macquarie Street, Sydney NSW 2000, Australia");
    expect(container.textContent).toContain("Change view");
    expect(container.querySelector('[aria-label="Property hybrid map"]')).toBeNull();

    act(() => root.unmount());
  });

  it("starts with only the address controls before the user engages", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<PropertyMap initialAnchor={null} onAnchorConfirmed={vi.fn()} />);
    });

    expect(container.textContent).toContain("Property address");
    expect(container.textContent).toContain("Find property");
    expect(container.querySelector('[aria-label="Property hybrid map"]')).toBeNull();

    act(() => root.unmount());
  });

  it("keeps the sidebar Google Map interactive for framing the snapshot", () => {
    expect(PROPERTY_MAP_INTERACTION_OPTIONS).toMatchObject({
      gestureHandling: "greedy",
      zoomControl: true,
      draggable: true,
      scrollwheel: true,
      keyboardShortcuts: true,
    });
  });

  it("renders the hybrid map without the map type selector or GPS coordinates", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <PropertyMap
          initialAnchor={{
            lat: -28.503385,
            lng: 153.526262,
            address: "9 Mogo Place, Billinudgel NSW, Australia",
          }}
          onAnchorConfirmed={vi.fn()}
        />,
      );
    });

    const changeView = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Change view"),
    );
    expect(changeView).not.toBeUndefined();
    act(() => {
      changeView!.click();
    });

    expect(container.querySelector('[aria-label="Property map type"]')).toBeNull();
    expect(container.querySelector('[aria-label="Property hybrid map"]')).not.toBeNull();
    expect(container.textContent).toContain("Use this view");
    expect(container.textContent).not.toContain("Pin:");
    expect(container.textContent).not.toContain("-28.503385");
    expect(container.textContent).not.toContain("153.526262");

    act(() => root.unmount());
  });

  it("renders the use-view action before the map in DOM order", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <PropertyMap
          initialAnchor={{
            lat: -28.503385,
            lng: 153.526262,
            address: "9 Mogo Place, Billinudgel NSW, Australia",
          }}
          onAnchorConfirmed={vi.fn()}
        />,
      );
    });

    const changeView = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Change view"),
    );
    act(() => {
      changeView!.click();
    });

    const useView = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Use this view"),
    );
    const map = container.querySelector('[aria-label="Property hybrid map"]');
    expect(useView).not.toBeUndefined();
    expect(map).not.toBeNull();
    expect(Boolean(useView!.compareDocumentPosition(map!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
      true,
    );

    act(() => root.unmount());
  });

  it("captures satellite and roadmap Static Maps layer URLs when using the current view", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
    const requestedUrls: string[] = [];
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin = "";
      #src = "";

      set src(value: string) {
        this.#src = value;
        requestedUrls.push(value);
        queueMicrotask(() => this.onload?.());
      }

      get src() {
        return this.#src;
      }
    }
    vi.stubGlobal("Image", MockImage);

    const onAnchorConfirmed = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <PropertyMap
          initialAnchor={{
            lat: -28.503385,
            lng: 153.526262,
            address: "9 Mogo Place, Billinudgel NSW, Australia",
          }}
          onAnchorConfirmed={onAnchorConfirmed}
        />,
      );
    });

    const changeView = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Change view"),
    );
    expect(changeView).not.toBeUndefined();
    act(() => {
      changeView!.click();
    });

    const useView = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Use this view"),
    );
    expect(useView).not.toBeUndefined();
    await act(async () => {
      useView!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(requestedUrls.length).toBeGreaterThanOrEqual(2);
    expect(requestedUrls.map((url) => new URL(url).searchParams.get("maptype"))).toEqual(
      expect.arrayContaining(["satellite", "roadmap"]),
    );
    expect(requestedUrls.map((url) => new URL(url).searchParams.get("size"))).toEqual(
      requestedUrls.map(() => "640x640"),
    );
    expect(onAnchorConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({
          width: 640,
          height: 640,
          sourceViewportWidth: 640,
          sourceViewportHeight: 480,
          layers: {
            satellite: expect.objectContaining({
              url: expect.stringContaining("maptype=satellite"),
              visible: true,
              opacity: 1,
            }),
            roadmap: expect.objectContaining({
              url: expect.stringContaining("maptype=roadmap"),
              visible: true,
              opacity: 0.5,
            }),
          },
        }),
      }),
    );

    act(() => root.unmount());
  });
});
