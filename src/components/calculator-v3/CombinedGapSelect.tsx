import { useMemo } from "react";
import {
  combinedGapChoicesForConfig,
  combinedGapChoicesForSystem,
  gapChoiceId,
  normaliseGapMode,
  normaliseGapModeConfig,
  parseGapChoiceId,
  type GapMode,
} from "../../lib/gapChoices";
import type { UiCalculatorConfig } from "../../types/calculatorConfig.types";
import { FormField } from "../shared/FormField";

export interface CombinedGapSelectProps {
  /** @deprecated pass `config` instead — product codes are no longer branched on in v3. */
  productCode?: string;
  config?: UiCalculatorConfig;
  mode: unknown;
  gapMm: unknown;
  onChange: (mode: GapMode, gapMm: number) => void;
}

export function CombinedGapSelect({
  productCode,
  config,
  mode,
  gapMm,
  onChange,
}: CombinedGapSelectProps) {
  const choices = useMemo(
    () =>
      config
        ? combinedGapChoicesForConfig(config, mode, gapMm)
        : combinedGapChoicesForSystem(productCode ?? "", mode, gapMm),
    [config, gapMm, mode, productCode],
  );
  const currentMode = config
    ? normaliseGapModeConfig(config, mode)
    : normaliseGapMode(productCode ?? "", mode);
  const currentGap = Math.max(0, Math.round(Number(gapMm) || 9));
  const currentId = gapChoiceId(currentMode, currentGap);
  const value = choices.some((choice) => choice.id === currentId)
    ? currentId
    : choices[0]?.id ?? currentId;

  return (
    <div data-testid="combined-gap-select">
      <FormField label="Slat gap">
        <select
          value={value}
          onChange={(event) => {
            const choice = parseGapChoiceId(event.target.value);
            onChange(choice.mode, choice.gapMm);
          }}
          className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
        >
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
      </FormField>
    </div>
  );
}
