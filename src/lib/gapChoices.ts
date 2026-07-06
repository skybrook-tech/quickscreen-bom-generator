import type { UiCalculatorConfig } from "../types/calculatorConfig.types";

export type GapMode = "spacer" | "custom";

export interface CombinedGapChoice {
  id: string;
  mode: GapMode;
  gapMm: number;
  label: string;
}

const CUSTOM_GAP_MIN_MM = 1;
const CUSTOM_GAP_MAX_MM = 50;

type GapRulesSource = { allowCustom: boolean; customMinMm: number; customMaxMm: number };

function gapRulesFromConfig(config: UiCalculatorConfig | undefined): GapRulesSource | undefined {
  return config?.gapRules;
}

export function supportsCustomGapConfig(config: UiCalculatorConfig | undefined): boolean {
  const rules = gapRulesFromConfig(config);
  return rules ? rules.allowCustom : false;
}

export function normaliseGapModeConfig(config: UiCalculatorConfig | undefined, mode: unknown): GapMode {
  return supportsCustomGapConfig(config) && mode === "custom" ? "custom" : "spacer";
}

export function gapChoiceId(mode: GapMode, gapMm: number) {
  return `${mode}:${Math.max(0, Math.round(gapMm))}`;
}

export function parseGapChoiceId(id: string): CombinedGapChoice {
  const [modeRaw, gapRaw] = id.split(":");
  const mode: GapMode = modeRaw === "custom" ? "custom" : "spacer";
  const gapMm = Math.max(0, Math.round(Number(gapRaw) || 0));
  return {
    id: gapChoiceId(mode, gapMm),
    mode,
    gapMm,
    label: combinedGapLabel(mode, gapMm),
  };
}

export function combinedGapLabel(mode: GapMode, gapMm: number) {
  const resolvedGap = Number.isFinite(gapMm) ? Math.max(0, Math.round(gapMm)) : 9;
  return mode === "custom"
    ? `Custom ${resolvedGap}mm`
    : `Aluminum spacer ${resolvedGap}mm`;
}

function spacerChoicesFor(gaps: number[]): CombinedGapChoice[] {
  return gaps.map((gapMm) => ({
    id: gapChoiceId("spacer", gapMm),
    mode: "spacer" as const,
    gapMm,
    label: combinedGapLabel("spacer", gapMm),
  }));
}

function customChoicesFor(
  minMm: number,
  maxMm: number,
  currentMode: unknown,
  currentGap: unknown,
): CombinedGapChoice[] {
  const customGaps = new Set(
    Array.from({ length: maxMm - minMm + 1 }, (_, index) => minMm + index),
  );
  const numericCurrentGap = Math.round(Number(currentGap));
  if (currentMode === "custom" && Number.isFinite(numericCurrentGap)) {
    customGaps.add(Math.max(0, numericCurrentGap));
  }
  return [...customGaps]
    .sort((a, b) => a - b)
    .map((gapMm) => ({
      id: gapChoiceId("custom", gapMm),
      mode: "custom" as const,
      gapMm,
      label: combinedGapLabel("custom", gapMm),
    }));
}

/**
 * Config-driven variant: spacer options come from the resolved `slat_gap_mm`
 * field's options, and custom-gap availability/range from `config.gapRules`.
 */
export function combinedGapChoicesForConfig(
  config: UiCalculatorConfig,
  currentMode: unknown,
  currentGap: unknown,
): CombinedGapChoice[] {
  const gapField = config.fields.find((f) => f.field_key === "slat_gap_mm");
  const gaps = Array.isArray(gapField?.options_json)
    ? (gapField!.options_json as number[])
    : [];
  const spacerChoices = spacerChoicesFor(gaps);
  if (!supportsCustomGapConfig(config)) return spacerChoices;
  const min = config.gapRules.customMinMm || CUSTOM_GAP_MIN_MM;
  const max = config.gapRules.customMaxMm || CUSTOM_GAP_MAX_MM;
  return [...spacerChoices, ...customChoicesFor(min, max, currentMode, currentGap)];
}
