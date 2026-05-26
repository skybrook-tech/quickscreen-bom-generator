import { act, type ComponentProps } from "react";
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

type HeaderTestProps = ComponentProps<typeof Header>;

function renderHeader(props: HeaderTestProps = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  function render(nextProps: HeaderTestProps) {
    root.render(
      <MemoryRouter>
        <ThemeProvider>
          <Header onClearJobRequest={() => undefined} {...nextProps} />
        </ThemeProvider>
      </MemoryRouter>,
    );
  }

  act(() => {
    render(props);
  });

  return {
    container,
    root,
    rerender(nextProps: HeaderTestProps) {
      act(() => {
        render(nextProps);
      });
    },
  };
}

describe("Header menu", () => {
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
        .querySelector<HTMLButtonElement>('[aria-label="Open menu"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="menu-offline-indicator"]')).not.toBeNull();
    expect(container.textContent).toContain("Offline - quotes can't be saved");

    act(() => root.unmount());
  });

  it("omits the offline item when the browser is online", () => {
    setOnline(true);
    const { container, root } = renderHeader();

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Open menu"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="menu-offline-indicator"]')).toBeNull();
    expect(container.textContent).not.toContain("Offline - quotes can't be saved");

    act(() => root.unmount());
  });

  it("renders customer mode and install videos in the shared menu", () => {
    const onCustomerModeChange = vi.fn();
    const { container, root } = renderHeader({ onCustomerModeChange });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Open menu"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Customer Mode");
    expect(container.textContent).toContain("Install Videos");

    act(() => {
      Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent?.includes("Install Videos"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[aria-label="Install Videos"]')).not.toBeNull();
    expect(container.textContent).toContain("QSHS installation");
    expect(container.textContent).toContain("XPL installation");
    expect(container.textContent).toContain("VS installation");
    expect(container.textContent).toContain("BAYG installation");

    act(() => root.unmount());
  });

  it("renders New Quote in the centered title slot while keeping the brand logo", () => {
    const { container, root } = renderHeader({
      jobTitle: "New Quote",
      brandLogoSrc: "/icons/glass-outlet-symbol.svg",
      brandLogoAlt: "Glass Outlet",
    });

    expect(container.querySelector('[data-testid="header-job-title"]')?.textContent).toBe(
      "New Quote",
    );
    expect(container.querySelector('img[src="/icons/glass-outlet-symbol.svg"]')).not.toBeNull();

    act(() => root.unmount());
  });

  it("updates the title when the job name prop changes", () => {
    const view = renderHeader({ jobTitle: "New Quote" });

    expect(view.container.querySelector('[data-testid="header-job-title"]')?.textContent).toBe(
      "New Quote",
    );

    view.rerender({ jobTitle: "Smith House 123 Main" });

    expect(view.container.querySelector('[data-testid="header-job-title"]')?.textContent).toBe(
      "Smith House 123 Main",
    );

    act(() => view.root.unmount());
  });

  it("truncates long job names while preserving price and menu controls", () => {
    const { container, root } = renderHeader({
      jobTitle: "Smith Family Beachfront Property at 47 Beach Road",
      priceLabel: "$12,345",
    });

    const title = container.querySelector('[data-testid="header-job-title"]');
    expect(title?.className).toContain("truncate");
    expect(title?.textContent).toBe("Smith Family Beachfront Property at 47 Beach Road");
    expect(container.querySelector('[data-testid="header-price"]')?.textContent).toBe("$12,345");
    expect(container.querySelector('[aria-label="Open menu"]')).not.toBeNull();

    act(() => root.unmount());
  });
});
