import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../context/ThemeContext";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: null, session: null, loading: false }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createTestClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function installCanvasMock() {
  const context = new Proxy(
    {
      canvas: document.createElement("canvas"),
      measureText: (text: string) => ({ width: text.length * 6 }),
      getLineDash: () => [],
    },
    {
      get(target, key) {
        if (key in target) return target[key as keyof typeof target];
        return () => undefined;
      },
      set(target, key, value) {
        (target as Record<PropertyKey, unknown>)[key] = value;
        return true;
      },
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
}

describe("CalculatorV4Page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    window.localStorage.clear();
  });

  it("renders the V4 surface without crashing", async () => {
    window.localStorage.clear();
    installCanvasMock();
    const { CalculatorV4Page } = await import("./CalculatorV4Page");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const client = createTestClient();

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/fence-calculator-v4"]}>
          <QueryClientProvider client={client}>
            <ThemeProvider>
              <CalculatorV4Page />
            </ThemeProvider>
          </QueryClientProvider>
        </MemoryRouter>,
      );
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain("Pick a fence product to begin");

    act(() => root.unmount());
    client.clear();
    container.remove();
  });
});
