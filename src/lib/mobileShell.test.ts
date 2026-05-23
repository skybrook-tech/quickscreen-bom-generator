import { describe, expect, it } from "vitest";
import { calculatorPaneVisibility } from "./mobileShell";

describe("calculatorPaneVisibility", () => {
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

