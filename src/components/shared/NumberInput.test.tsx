import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import NumberInput from "./NumberInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderNumberInput(step: number | undefined) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<NumberInput value={1} step={step} onChange={vi.fn()} />);
  });

  return {
    input: container.querySelector("input") as HTMLInputElement,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("NumberInput", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("uses a numeric keyboard hint for whole-number inputs", () => {
    const view = renderNumberInput(1);

    expect(view.input.inputMode).toBe("numeric");
    expect(view.input.getAttribute("pattern")).toBe("[0-9]*");

    view.unmount();
  });

  it("uses a decimal keyboard hint for decimal measurement inputs", () => {
    const view = renderNumberInput(0.01);

    expect(view.input.inputMode).toBe("decimal");
    expect(view.input.getAttribute("pattern")).toBe("[0-9]*\\.?[0-9]*");

    view.unmount();
  });
});
