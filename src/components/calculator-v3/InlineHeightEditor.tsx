import { useEffect, useMemo, useState } from "react";
import { heightEntriesForSystem } from "../../lib/productOptionRules";
import { type DerivedHeight } from "../../lib/heights";
import { useSegmentHeightOptions } from "../../hooks/useSegmentHeightOptions";
import { isCustomCalculator } from "../../lib/customCalculators";

type Variables = Record<string, string | number | boolean>;

interface InlineHeightEditorProps {
  productCode: string;
  variables: Variables;
  valueMm: number;
  ariaLabel: string;
  onChange: (heightMm: number, entry?: DerivedHeight) => void;
}

export function InlineHeightEditor({
  productCode,
  variables,
  valueMm,
  ariaLabel,
  onChange,
}: InlineHeightEditorProps) {
  const [draft, setDraft] = useState(String(valueMm));
  const { freeform, freeformBounds, optionsMm, clampFreeform } = useSegmentHeightOptions(
    productCode,
    variables,
    valueMm
  );
  const isCustom = isCustomCalculator(productCode);
  const heightEntries = useMemo(
    () => (isCustom ? [] : heightEntriesForSystem(productCode, variables)),
    [productCode, variables, isCustom]
  );

  useEffect(() => {
    setDraft(String(valueMm));
  }, [valueMm]);

  function commitDraft(value = draft) {
    const next = freeformBounds ? clampFreeform(Number(value)) : Number(value);
    setDraft(String(next));
    if (next !== valueMm) onChange(next);
  }

  const sharedClasses =
    "inline-flex h-8 max-w-full rounded-lg border border-brand-border bg-brand-card px-2 text-xs font-extrabold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";

  if (freeform) {
    const minMm = freeformBounds?.minMm ?? 300;
    const maxMm = freeformBounds?.maxMm ?? 2400;
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
          min={minMm}
          max={maxMm}
          step={50}
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

  if (optionsMm.length === 0) {
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
      value={valueMm}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const val = Number(event.target.value);
        const entry = heightEntries.find((item) => item.height === val);
        onChange(val, entry);
      }}
      className={`${sharedClasses} w-44`}
    >
      {optionsMm.map((opt) => {
        const entry = heightEntries.find((item) => item.height === opt);
        const label = entry ? `${opt}mm - ${entry.N} slats` : `${opt}mm`;
        return (
          <option key={opt} value={opt}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

