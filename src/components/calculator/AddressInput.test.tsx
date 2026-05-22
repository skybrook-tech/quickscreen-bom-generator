import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as googleMapsLoader from "../../lib/googleMaps/loader";
import {
  AddressInput,
  PLACES_API_ENABLEMENT_MESSAGE,
  type LocatedAddress,
} from "./AddressInput";

const loaderLoadMock = vi.fn();

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function renderAddressInput(onLocated = vi.fn<(location: LocatedAddress) => void>()) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<AddressInput onLocated={onLocated} />);
  });

  const input = container.querySelector("input") as HTMLInputElement;
  const form = container.querySelector("form") as HTMLFormElement;

  return {
    container,
    input,
    form,
    onLocated,
    async submit(value: string) {
      await act(async () => {
        setInputValue(input, value);
      });
      await act(async () => {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      });
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("AddressInput", () => {
  beforeEach(() => {
    loaderLoadMock.mockReset();
    loaderLoadMock.mockResolvedValue(undefined);
    vi.spyOn(googleMapsLoader, "getGoogleMapsLoader").mockReturnValue({
      load: loaderLoadMock,
    } as unknown as ReturnType<typeof googleMapsLoader.getGoogleMapsLoader>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("geocodes Australian addresses and emits the selected location", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [
          {
            formatted_address: "1 Macquarie Street, Sydney NSW 2000, Australia",
            geometry: { location: { lat: -33.859972, lng: 151.213245 } },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const view = renderAddressInput();
    await view.submit("1 Macquarie Street Sydney NSW");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("region")).toBe("au");
    expect(url.searchParams.get("components")).toBe("country:au");
    expect(url.searchParams.get("address")).toBe("1 Macquarie Street Sydney NSW");
    expect(view.onLocated).toHaveBeenCalledWith({
      address: "1 Macquarie Street Sydney NSW",
      lat: -33.859972,
      lng: 151.213245,
      formattedAddress: "1 Macquarie Street, Sydney NSW 2000, Australia",
    });

    view.unmount();
  });

  it("shows a no-result error without emitting a location", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ZERO_RESULTS", results: [] }),
      }),
    );

    const view = renderAddressInput();
    await view.submit("Not a real place");

    expect(view.onLocated).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("No Australian property found");

    view.unmount();
  });

  it("shows an API-key error before calling fetch", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const view = renderAddressInput();
    await view.submit("Brisbane QLD");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("VITE_GOOGLE_MAPS_API_KEY is not set");

    view.unmount();
  });

  it("renders Places API suggestions while typing", async () => {
    vi.useFakeTimers();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const fetchAutocompleteSuggestions = vi.fn().mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            placeId: "sydney-nsw",
            text: { text: "Sydney NSW, Australia" },
            secondaryText: { text: "New South Wales, Australia" },
          },
        },
      ],
    });
    vi.stubGlobal("google", {
      maps: {
        importLibrary: vi.fn().mockResolvedValue({
          AutocompleteSuggestion: { fetchAutocompleteSuggestions },
          AutocompleteSessionToken: class AutocompleteSessionToken {},
        }),
      },
    });

    const view = renderAddressInput();

    await act(async () => {
      setInputValue(view.input, "Sydney NSW");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(loaderLoadMock).toHaveBeenCalledTimes(1);
    expect(fetchAutocompleteSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        input: "Sydney NSW",
        region: "AU",
        includedRegionCodes: ["au"],
        locationRestriction: expect.objectContaining({
          south: -44,
          west: 112.9,
          north: -10,
          east: 153.7,
        }),
      }),
    );
    expect(view.container.textContent).toContain("Sydney NSW, Australia");
    expect(infoSpy).toHaveBeenCalledWith(
      "[Autocomplete] Places API returned 1 suggestions for query: Sydney NSW",
    );

    view.unmount();
  });

  it("logs the Places API enablement error and keeps manual geocoding available", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("google", {
      maps: {
        importLibrary: vi.fn().mockRejectedValue(new Error("Places API disabled")),
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [
          {
            formatted_address: "Sydney NSW, Australia",
            geometry: { location: { lat: -33.8688, lng: 151.2093 } },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const view = renderAddressInput();

    await act(async () => {
      setInputValue(view.input, "Sydney NSW");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(errorSpy).toHaveBeenCalledWith(
      PLACES_API_ENABLEMENT_MESSAGE,
      expect.any(Error),
    );
    expect(view.input.value).toBe("Sydney NSW");

    await act(async () => {
      view.form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(view.onLocated).toHaveBeenCalledWith({
      address: "Sydney NSW",
      lat: -33.8688,
      lng: 151.2093,
      formattedAddress: "Sydney NSW, Australia",
    });

    view.unmount();
  });
});
