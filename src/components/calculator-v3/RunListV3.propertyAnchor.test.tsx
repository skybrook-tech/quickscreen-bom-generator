import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanonicalPayload } from "../../types/canonical.types";
import { RunListV3 } from "./RunListV3";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const dispatchMock = vi.fn();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const anchoredEmptyPayload: CanonicalPayload = {
  productCode: "QSHS",
  schemaVersion: "v1",
  variables: {},
  propertyAnchor: {
    lat: -28.503385,
    lng: 153.526262,
    address: "9 Mogo Place, Billinudgel NSW, Australia",
  },
  snapshot: {
    centerLat: -28.503385,
    centerLng: 153.526262,
    zoom: 20,
    width: 640,
    height: 360,
    metresPerPixel: 0.107,
    capturedAt: "2026-05-22T00:00:00.000Z",
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

  it("preserves the confirmed property anchor and snapshot when starting the first run", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <RunListV3 />
        </QueryClientProvider>
      );
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
    expect(setPayloadAction?.payload.snapshot).toEqual(
      anchoredEmptyPayload.snapshot,
    );

    act(() => root.unmount());
    container.remove();
  });
});
