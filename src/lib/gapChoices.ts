import { gapOptionsForSystem } from "./productOptionRules";

export type GapMode = "spacer" | "custom";

export interface CombinedGapChoice {
  id: string;
  mode: GapMode;
  gapMm: number;
  label: string;
}

const CUSTOM_GAP_MIN_MM = 1;
const CUSTOM_GAP_MAX_MM = 50;

export function supportsCustomGap(productCode: string) {
  return productCode === "QSHS" || productCode === "VS";
}

export function normaliseGapMode(productCode: string, mode: unknown): GapMode {
  return supportsCustomGap(productCode) && mode === "custom" ? "custom" : "spacer";
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

export function combinedGapChoicesForSystem(
  productCode: string,
  currentMode: unknown,
  currentGap: unknown,
): CombinedGapChoice[] {
  const spacerChoices = gapOptionsForSystem(productCode).map((gapMm) => ({
    id: gapChoiceId("spacer", gapMm),
    mode: "spacer" as const,
    gapMm,
    label: combinedGapLabel("spacer", gapMm),
  }));

  if (!supportsCustomGap(productCode)) return spacerChoices;

  const customGaps = new Set(
    Array.from(
      { length: CUSTOM_GAP_MAX_MM - CUSTOM_GAP_MIN_MM + 1 },
      (_, index) => CUSTOM_GAP_MIN_MM + index,
    ),
  );
  const numericCurrentGap = Math.round(Number(currentGap));
  if (currentMode === "custom" && Number.isFinite(numericCurrentGap)) {
    customGaps.add(Math.max(0, numericCurrentGap));
  }

  const customChoices = [...customGaps]
    .sort((a, b) => a - b)
    .map((gapMm) => ({
      id: gapChoiceId("custom", gapMm),
      mode: "custom" as const,
      gapMm,
      label: combinedGapLabel("custom", gapMm),
    }));

  return [...spacerChoices, ...customChoices];
}
