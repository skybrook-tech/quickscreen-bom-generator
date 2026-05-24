import { describe, expect, it } from "vitest";
import { INITIAL_MOBILE_CALCULATOR_TAB, calculatorPaneVisibility } from "./mobileShell";

describe("calculatorPaneVisibility", () => {
  it("starts new mobile calculator sessions on the Job tab", () => {
    expect(INITIAL_MOBILE_CALCULATOR_TAB).toBe("job");
  });

  it("shows only the active pane in mobile layout", () => {
    expect(calculatorPaneVisibility(true, "job")).toEqual({
      job: true,
      map: false,
      bom: false,
    });
    expect(calculatorPaneVisibility(true, "map")).toEqual({
      job: false,
      map: true,
      bom: false,
    });
    expect(calculatorPaneVisibility(true, "bom")).toEqual({
      job: false,
      map: false,
      bom: true,
    });
  });

  it("keeps all major panes available in desktop layout", () => {
    expect(calculatorPaneVisibility(false, "map")).toEqual({
      job: true,
      map: true,
      bom: true,
    });
  });
});

