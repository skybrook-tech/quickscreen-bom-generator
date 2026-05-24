import { describe, expect, it } from "vitest";
import { snapRadiusForPointerType } from "./canvasEngine";
import { touchActionForCanvasTool } from "./FenceLayoutCanvas";

describe("mobile canvas touch helpers", () => {
  it("uses a larger snap radius for touch than mouse input", () => {
    expect(snapRadiusForPointerType("touch")).toBe(44);
    expect(snapRadiusForPointerType("mouse")).toBe(8);
    expect(snapRadiusForPointerType()).toBe(8);
  });

  it("prevents page scroll while a drawing tool is active", () => {
    expect(touchActionForCanvasTool("draw")).toBe("none");
    expect(touchActionForCanvasTool("gate")).toBe("none");
    expect(touchActionForCanvasTool("move")).toBe("auto");
  });
});
