import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { BOMResultTabs } from "./BOMResultTabs";
import type { CalculatorBOMResult } from "../../types/bom.types";

const result: CalculatorBOMResult = {
  runResults: [],
  gateItems: [],
  allItems: [
    {
      category: "posts_and_mounting",
      sku: "POST-001",
      description: "65x65 post",
      quantity: 2,
      unit: "each",
      unitPrice: 50,
      lineTotal: 100,
      sources: [{ scopeKind: "fence_run", scopeId: "run-1", scopeLabel: "Run 1", qty: 2 }],
    },
  ],
  total: 100,
  gst: 10,
  grandTotal: 110,
  pricingTier: "tier1",
  generatedAt: "2026-05-24T00:00:00.000Z",
};

describe("BOMResultTabs mobile cards", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders mobile card markup alongside the desktop table markup", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<BOMResultTabs result={result} />);
    });

    expect(
      container.querySelector('[data-testid="bom-mobile-cards"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="bom-desktop-table"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("POST-001");
    expect(container.textContent).toContain("Run 1: 2");

    act(() => root.unmount());
  });

  it("uses the desktop table for print output", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<BOMResultTabs result={result} />);
    });

    expect(
      container.querySelector('[data-testid="bom-mobile-cards"]')?.className,
    ).toContain("print:hidden");
    expect(
      container.querySelector('[data-testid="bom-desktop-table"]')?.className,
    ).toContain("print:block");

    act(() => root.unmount());
  });

  it("hides price columns and totals in customer mode", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<BOMResultTabs result={result} customerMode />);
    });

    expect(container.textContent).toContain("POST-001");
    expect(container.textContent).toContain("Run 1: 2");
    expect(container.textContent).not.toContain("Unit $");
    expect(container.textContent).not.toContain("Line $");
    expect(container.textContent).not.toContain("$50.00");
    expect(container.textContent).not.toContain("$100.00");
    expect(container.textContent).not.toContain("Subtotal");
    expect(container.textContent).not.toContain("Total (inc. GST)");

    act(() => root.unmount());
  });
});
