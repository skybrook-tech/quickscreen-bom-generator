import { describe, expect, it } from "vitest";
import {
  combinedGapChoicesForSystem,
  gapChoiceId,
  normaliseGapMode,
  parseGapChoiceId,
} from "./gapChoices";

describe("combined gap choices", () => {
  it("encodes spacer gap type and size in one option id", () => {
    expect(gapChoiceId("spacer", 12)).toBe("spacer:12");
    expect(parseGapChoiceId("spacer:12")).toMatchObject({
      mode: "spacer",
      gapMm: 12,
      label: "Aluminum spacer 12mm",
    });
  });

  it("keeps custom gap choices available for systems that support them", () => {
    const choices = combinedGapChoicesForSystem("QSHS", "custom", 18);

    expect(choices).toContainEqual({
      id: "custom:18",
      mode: "custom",
      gapMm: 18,
      label: "Custom 18mm",
    });
    expect(normaliseGapMode("QSHS", "custom")).toBe("custom");
  });

  it("falls back to spacer mode for systems without custom gaps", () => {
    expect(normaliseGapMode("XPL", "custom")).toBe("spacer");
    expect(
      combinedGapChoicesForSystem("XPL", "custom", 18).some((choice) =>
        choice.id.startsWith("custom:"),
      ),
    ).toBe(false);
  });
});
