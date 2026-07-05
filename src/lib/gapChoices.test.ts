import { describe, expect, it } from "vitest";
import {
  combinedGapChoicesForConfig,
  gapChoiceId,
  normaliseGapModeConfig,
  parseGapChoiceId,
} from "./gapChoices";
import type { UiCalculatorConfig } from "../types/calculatorConfig.types";

// Minimal config exercising only what the gap helpers read: the resolved
// slat_gap_mm option list + gapRules.
function configWithGap(allowCustom: boolean): UiCalculatorConfig {
  return {
    fields: [{ field_key: "slat_gap_mm", options_json: [5, 9, 20] }],
    gapRules: { allowCustom, customMinMm: 1, customMaxMm: 50 },
  } as unknown as UiCalculatorConfig;
}

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
    const config = configWithGap(true);
    const choices = combinedGapChoicesForConfig(config, "custom", 18);

    expect(choices).toContainEqual({
      id: "custom:18",
      mode: "custom",
      gapMm: 18,
      label: "Custom 18mm",
    });
    expect(normaliseGapModeConfig(config, "custom")).toBe("custom");
  });

  it("falls back to spacer mode for systems without custom gaps", () => {
    const config = configWithGap(false);
    expect(normaliseGapModeConfig(config, "custom")).toBe("spacer");
    expect(
      combinedGapChoicesForConfig(config, "custom", 18).some((choice) =>
        choice.id.startsWith("custom:"),
      ),
    ).toBe(false);
  });
});
