import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PwaStatusBanners } from "./PwaStatusBanners";

describe("PwaStatusBanners", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.localStorage.clear();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("shows an offline indicator when the browser is offline", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<PwaStatusBanners />);
    });

    expect(container.querySelector('[data-testid="offline-indicator"]')).not.toBeNull();
    expect(container.textContent).toContain("You're offline");

    act(() => root.unmount());
  });
});
