import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MobileBomTotals } from "./MobileBomTotals";

describe("MobileBomTotals", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders sticky mobile totals from the current BOM summary", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MobileBomTotals subtotal={1200} gst={120} grandTotal={1320} />,
      );
    });

    expect(
      container.querySelector('[data-testid="mobile-bom-totals"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("$1,200.00");
    expect(container.textContent).toContain("$120.00");
    expect(container.textContent).toContain("$1,320.00");

    act(() => root.unmount());
  });
});
