import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanonicalPayload } from "../../types/canonical.types";
import { ACTIVATE_CANVAS_DRAW_TOOL_EVENT } from "../canvas/canvasToolEvents";
import { RunListV3 } from "./RunListV3";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const dispatchMock = vi.fn();

const anchoredEmptyPayload: CanonicalPayload = {
  productCode: "QSHS",
  schemaVersion: "v1",
  variables: {},
  propertyAnchor: {
    lat: -28.503385,
    lng: 153.526262,
    address: "9 Mogo Place, Billinudgel NSW, Australia",
  },
  runs: [],
};

vi.mock("../../context/CalculatorContext", () => ({
  useCalculator: () => ({
    state: {
      payload: anchoredEmptyPayload,
    },
    dispatch: dispatchMock,
  }),
}));

describe("RunListV3 propertyAnchor wiring", () => {
  afterEach(() => {
    dispatchMock.mockClear();
    document.body.innerHTML = "";
  });

  it("preserves the confirmed property anchor when starting the first run", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<RunListV3 />);
    });

    const qshsButton = container.querySelector(
      '[data-testid="landing-system-QSHS"]',
    ) as HTMLButtonElement | null;
    expect(qshsButton).not.toBeNull();

    await act(async () => {
      qshsButton?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 90));
    });

    const setPayloadAction = dispatchMock.mock.calls.find(
      ([action]) => action.type === "SET_PAYLOAD",
    )?.[0];

    expect(setPayloadAction?.payload.propertyAnchor).toEqual(
      anchoredEmptyPayload.propertyAnchor,
    );

    act(() => root.unmount());
    container.remove();
  });

  it("activates the canvas draw tool when starting any fence system", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const events: Array<{ runId?: string; productCode?: string }> = [];
    const handler = (event: Event) => {
      events.push((event as CustomEvent<{ runId?: string; productCode?: string }>).detail);
    };
    window.addEventListener(ACTIVATE_CANVAS_DRAW_TOOL_EVENT, handler);

    act(() => {
      root.render(<RunListV3 />);
    });

    for (const productCode of ["QSHS", "VS", "XPL", "BAYG"]) {
      const button = container.querySelector(
        `[data-testid="landing-system-${productCode}"]`,
      ) as HTMLButtonElement | null;
      expect(button).not.toBeNull();

      await act(async () => {
        button?.click();
        await new Promise((resolve) => window.setTimeout(resolve, 90));
      });
    }

    expect(events.map((event) => event.productCode)).toEqual([
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
    ]);
    expect(events.every((event) => Boolean(event.runId))).toBe(true);

    window.removeEventListener(ACTIVATE_CANVAS_DRAW_TOOL_EVENT, handler);
    act(() => root.unmount());
    container.remove();
  });
});
