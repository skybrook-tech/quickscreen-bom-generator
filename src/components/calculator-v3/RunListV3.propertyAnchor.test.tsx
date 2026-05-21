import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanonicalPayload } from "../../types/canonical.types";
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

  it("preserves the confirmed property anchor when starting the first run", () => {
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

    act(() => {
      qshsButton?.click();
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
});
