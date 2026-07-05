import { useEffect, useMemo, useState } from "react";
import {
  derivedHeightForSlatCount,
  nearestDerivedHeight,
  type DerivedHeight,
} from "../../../lib/heights";
import type { UiCalculatorConfig } from "../../../types/calculatorConfig.types";

type Variables = Record<string, string | number | boolean>;

interface InlineHeightEditorProps {
  config: UiCalculatorConfig;
  variables: Variables;
  valueMm: number;
  ariaLabel: string;
  onChange: (heightMm: number, entry?: DerivedHeight) => void;
}

function clampHeight(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function InlineHeightEditor({
  config,
  variables,
  valueMm,
  ariaLabel,
  onChange,
}: InlineHeightEditorProps) {
  const isFreeform = config.heightUi.mode === "freeform";
  const freeMin = config.heightUi.freeformMinMm ?? 300;
  const freeMax = config.heightUi.freeformMaxMm ?? 2400;
  const freeStep = config.heightUi.freeformStepMm ?? 50;
  const [draft, setDraft] = useState(String(clampHeight(valueMm, freeMin, freeMax)));

  const heightEntries = useMemo<DerivedHeight[]>(
    () => config.heightLadder.entries,
    [config.heightLadder.entries],
  );
  const selectedEntry =
    derivedHeightForSlatCount(heightEntries, variables.slat_count) ??
    nearestDerivedHeight(heightEntries, valueMm);
  const selectedHeight = selectedEntry?.height ?? clampHeight(valueMm, freeMin, freeMax);

  useEffect(() => {
    setDraft(String(clampHeight(valueMm, freeMin, freeMax)));
  }, [valueMm, freeMin, freeMax]);

  function commitDraft(value = draft) {
    const next = clampHeight(Number(value), freeMin, freeMax);
    setDraft(String(next));
    if (next !== clampHeight(valueMm, freeMin, freeMax)) onChange(next);
  }

  const sharedClasses =
    "inline-flex h-8 max-w-full rounded-lg border border-brand-border bg-brand-card px-2 text-xs font-extrabold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";

  if (isFreeform) {
    return (
      <span
        className="inline-flex items-center gap-1"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <input
          type="number"
          aria-label={ariaLabel}
          inputMode="numeric"
          min={freeMin}
          max={freeMax}
          step={freeStep}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commitDraft()}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className={`${sharedClasses} w-24 tabular-nums`}
        />
        <span className="text-xs font-bold text-brand-muted">mm</span>
      </span>
    );
  }

  if (heightEntries.length === 0) {
    return (
      <select
        aria-label={ariaLabel}
        disabled
        className={`${sharedClasses} w-40 text-brand-muted`}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <option>Set slat and gap first</option>
      </select>
    );
  }

  return (
    <select
      aria-label={ariaLabel}
      value={selectedHeight}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const entry = heightEntries.find(
          (item) => item.height === Number(event.target.value),
        );
        if (entry) onChange(entry.height, entry);
      }}
      className={`${sharedClasses} w-44`}
    >
      {heightEntries.map((entry) => (
        <option key={entry.height} value={entry.height}>
          {entry.N ? `${entry.height}mm - ${entry.N} slats` : `${entry.height}mm`}
        </option>
      ))}
    </select>
  );
}
