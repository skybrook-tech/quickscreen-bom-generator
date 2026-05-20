import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { PropertyAnchorFormGate } from "./PropertyMap";

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
  it("marks form children inert until the property anchor is confirmed", () => {
    const { container, root } = renderGate(false);
    const gated = container.querySelector("div[inert]");

    expect(container.textContent).toContain("Confirm property location to start drawing");
    expect(gated).not.toBeNull();
    expect(gated?.className).toContain("opacity-50");

    act(() => root.unmount());
  });

  it("removes inert once the property anchor is confirmed", () => {
    const { container, root } = renderGate(true);

    expect(container.querySelector("div[inert]")).toBeNull();
    expect(container.textContent).not.toContain("Confirm property location to start drawing");

    act(() => root.unmount());
  });
});
