import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClearJobConfirmDialog } from "./ClearJobConfirmDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ClearJobConfirmDialog", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("waits for explicit Clear confirmation before clearing", () => {
    const onCancel = vi.fn();
    const onClear = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ClearJobConfirmDialog onCancel={onCancel} onClear={onClear} />,
      );
    });

    expect(container.textContent).toContain("Are you sure?");
    expect(onClear).not.toHaveBeenCalled();

    const clearButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Clear",
    );

    act(() => {
      clearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClear).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });
});
