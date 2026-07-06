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
      notes: "Post formula note",
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

  it("toggles per-line workings from the BOM toolbar", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<BOMResultTabs result={result} />);
    });

    expect(container.textContent).toContain("Run 1: 2");
    expect(container.textContent).toContain("Post formula note");

    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-testid="bom-workings-toggle"]',
    );
    expect(toggle).not.toBeNull();
    expect(toggle?.textContent).toContain("Hide workings");

    act(() => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).not.toContain("Run 1: 2");
    expect(container.textContent).not.toContain("Post formula note");
    expect(toggle?.textContent).toContain("Show workings");

    act(() => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Run 1: 2");
    expect(container.textContent).toContain("Post formula note");
    expect(toggle?.textContent).toContain("Hide workings");

    act(() => root.unmount());
  });
});
