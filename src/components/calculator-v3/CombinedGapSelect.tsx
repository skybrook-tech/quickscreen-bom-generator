import { useMemo } from "react";
import {
  combinedGapChoicesForSystem,
  normaliseGapMode,
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
  const supportsCustom = choices.some((choice) => choice.mode === "custom");
  const spacerChoices = choices.filter((choice) => choice.mode === "spacer");
  const visibleSpacerChoices = supportsCustom
    ? spacerChoices.slice(0, 5)
    : spacerChoices;
  const customValue = currentMode === "custom" ? currentGap : "";

  function buttonClasses(active: boolean) {
    return `min-h-10 rounded-lg border px-3 text-sm font-black tabular-nums transition-colors ${
      active
        ? "border-brand-primary bg-brand-primary text-white shadow-sm"
        : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary"
    }`;
  }

  return (
    <div data-testid="combined-gap-select">
      <FormField label="Slat gap">
        <div className="flex flex-wrap gap-2">
          {visibleSpacerChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChange("spacer", choice.gapMm)}
              className={buttonClasses(currentMode === "spacer" && currentGap === choice.gapMm)}
            >
              {choice.gapMm}mm
            </button>
          ))}
          {supportsCustom && (
            <label
              className={`flex min-h-10 items-center gap-1 rounded-lg border px-3 text-sm font-black tabular-nums transition-colors ${
                currentMode === "custom"
                  ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                  : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary"
              }`}
            >
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                value={customValue}
                onFocus={() => {
                  if (currentMode !== "custom") onChange("custom", currentGap);
                }}
                onChange={(event) => {
                  const nextGap = Number(event.target.value);
                  if (Number.isFinite(nextGap)) {
                    onChange("custom", Math.max(0, Math.round(nextGap)));
                  }
                }}
                placeholder="Custom"
                aria-label="Custom slat gap"
                className="h-8 w-16 bg-transparent text-center font-black outline-none placeholder:text-brand-muted/80"
              />
              <span>mm</span>
            </label>
          )}
        </div>
      </FormField>
    </div>
  );
}
