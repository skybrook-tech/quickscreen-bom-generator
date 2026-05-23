import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileCalculatorTabs, type MobileCalculatorTab } from "./MobileCalculatorTabs";

describe("MobileCalculatorTabs", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the Job, Map, and BOM mobile tabs", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<MobileCalculatorTabs activeTab="job" onChange={() => undefined} />);
    });

    expect(container.querySelector('[data-testid="mobile-calculator-tabs"]')).not.toBeNull();
    expect(container.textContent).toContain("Job");
    expect(container.textContent).toContain("Map");
    expect(container.textContent).toContain("BOM");
    expect(container.querySelector('[aria-current="page"]')?.textContent).toContain("Job");

    act(() => root.unmount());
  });

  it("switches active tab through the onChange handler", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onChange = vi.fn();
    let activeTab: MobileCalculatorTab = "job";

    const render = () =>
      root.render(<MobileCalculatorTabs activeTab={activeTab} onChange={onChange} />);

    act(render);
    const mapButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Map"),
    );
    expect(mapButton).toBeDefined();

    act(() => {
      mapButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("map");

    activeTab = "map";
    act(render);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toContain("Map");

    act(() => root.unmount());
  });
});

