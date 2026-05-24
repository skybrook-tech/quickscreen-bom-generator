import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../context/ThemeContext";
import { Header } from "./Header";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: null, session: null, loading: false }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value,
  });
}

function renderHeader() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <ThemeProvider>
          <Header onClearJobRequest={() => undefined} />
        </ThemeProvider>
      </MemoryRouter>,
    );
  });

  return { container, root };
}

describe("Header mobile menu", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.localStorage.clear();
    setOnline(true);
  });

  it("shows the offline item only while the browser is offline", () => {
    setOnline(false);
    const { container, root } = renderHeader();

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Open mobile menu"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="mobile-menu-offline-indicator"]')).not.toBeNull();
    expect(container.textContent).toContain("Offline - quotes can't save");

    act(() => root.unmount());
  });

  it("omits the offline item when the browser is online", () => {
    setOnline(true);
    const { container, root } = renderHeader();

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Open mobile menu"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="mobile-menu-offline-indicator"]')).toBeNull();
    expect(container.textContent).not.toContain("Offline - quotes can't save");

    act(() => root.unmount());
  });
});
