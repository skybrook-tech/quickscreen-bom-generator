import { useMemo } from "react";
import {
  combinedGapChoicesForSystem,
  gapChoiceId,
  normaliseGapMode,
  parseGapChoiceId,
  type GapMode,
} from "../../lib/gapChoices";
import { FormField } from "../shared/FormField";

interface CombinedGapSelectProps {
  productCode: string;
  mode: unknown;
  gapMm: unknown;
  onChange: (mode: GapMode, gapMm: number) => void;
}

export function CombinedGapSelect({
  productCode,
  mode,
  gapMm,
  onChange,
}: CombinedGapSelectProps) {
  const choices = useMemo(
    () => combinedGapChoicesForSystem(productCode, mode, gapMm),
    [gapMm, mode, productCode],
  );
  const currentMode = normaliseGapMode(productCode, mode);
  const currentGap = Math.max(0, Math.round(Number(gapMm) || 9));
  const currentId = gapChoiceId(currentMode, currentGap);
  const value = choices.some((choice) => choice.id === currentId)
    ? currentId
    : choices[0]?.id ?? currentId;

  return (
    <div data-testid="combined-gap-select">
      <FormField
        label={
          <span className="flex items-center justify-between w-full af-sidebar-field-label">
            <span>Slat gap</span>
          </span>
        }
      >
        <select
          value={value}
          onChange={(event) => {
            const choice = parseGapChoiceId(event.target.value);
            onChange(choice.mode, choice.gapMm);
          }}
          className="w-full rounded-lg border border-[#E9E5DD] bg-white px-3 py-2 text-sm font-semibold text-[#11161D] shadow-sm outline-none transition-colors focus:border-[#DD6E1B] focus:ring-2 focus:ring-[#DD6E1B]/20"
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
