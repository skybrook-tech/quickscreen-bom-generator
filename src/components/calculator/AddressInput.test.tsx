import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddressInput, type LocatedAddress } from "./AddressInput";

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
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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
});
