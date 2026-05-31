// @vitest-environment jsdom

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { setGateDiagramHover } from "../../lib/gateDiagramHover";
import { GateComponentList } from "./GateComponentList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderGateComponentList(
  props: Partial<ComponentProps<typeof GateComponentList>> = {},
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <GateComponentList
        orientation="horizontal"
        movement="single_swing"
        slatSizeMm={65}
        slatGapMm={9}
        colourCode="B"
        hingeSku="KF-FIXED"
        latchSku="ML-TL-KF"
        {...props}
      />,
    );
  });
  return { container, root };
}

function cleanup(root?: Root, container?: HTMLElement) {
  if (root) act(() => root.unmount());
  container?.remove();
}

function rect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 100,
    width: 100,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("GateComponentList", () => {
  afterEach(() => {
    act(() => setGateDiagramHover(null));
    document.body.innerHTML = "";
  });

  it("renders the matching gate diagram below the checklist", () => {
    const { container, root } = renderGateComponentList({ orientation: "vertical" });

    const image = container.querySelector<HTMLImageElement>(
      'img[alt="Vertical gate assembly with numbered component callouts"]',
    );
    expect(image?.getAttribute("src")).toBe("/gate-diagrams/qsg-vertical-gate.png");
    expect(container.querySelector('[data-testid="gate-component-checklist"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="gate-diagram-dot-2"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid="gate-diagram-dot-4"]')).toHaveLength(2);

    cleanup(root, container);
  });

  it("highlights diagram dots from the shared gate diagram hover event", () => {
    const { container, root } = renderGateComponentList();

    act(() => setGateDiagramHover(3));

    expect(
      container.querySelector('[data-testid="gate-diagram-dot-3"]')?.className,
    ).toContain("scale-125");

    cleanup(root, container);
  });

  it("updates the active dot when the checklist scrolls", () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame;

    const { container, root } = renderGateComponentList();
    const checklist = container.querySelector<HTMLElement>(
      '[data-testid="gate-component-checklist"]',
    );
    expect(checklist).not.toBeNull();
    checklist!.getBoundingClientRect = () => rect(0, 100);

    for (let number = 1; number <= 12; number += 1) {
      const row = container.querySelector<HTMLElement>(
        `[data-testid="gate-component-row-${number}"]`,
      );
      expect(row).not.toBeNull();
      row!.getBoundingClientRect = () =>
        number === 6 ? rect(40, 60) : rect(220 + number * 20, 238 + number * 20);
    }

    act(() => {
      checklist!.dispatchEvent(new Event("scroll"));
    });

    expect(
      container.querySelector('[data-testid="gate-diagram-dot-6"]')?.className,
    ).toContain("scale-125");

    cleanup(root, container);
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });
});
