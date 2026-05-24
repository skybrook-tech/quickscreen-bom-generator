import { cn } from "../../lib";
import { useEffect, useState } from "react";

interface NumberInputProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  label?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const NumberInput = ({
  value,
  onChange,
  min,
  max,
  step,
  className,
  label,
  onBlur,
}: NumberInputProps) => {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const decimalInput = step !== undefined && !Number.isInteger(step);

  useEffect(() => {
    setDraft(value === null ? "" : String(value));
  }, [value]);

  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-semibold text-brand-muted">{label}</span>}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode={decimalInput ? "decimal" : "numeric"}
        pattern={decimalInput ? "[0-9]*\\.?[0-9]*" : "[0-9]*"}
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (next === "" || next === "-" || next === "." || next === "-.") return;
          const parsed = Number(next);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        className={cn(
          "rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20",
          className,
        )}
        onBlur={(event) => {
          if (draft === "" || !Number.isFinite(Number(draft))) {
            setDraft(value === null ? "" : String(value));
          }
          onBlur?.(event);
        }}
      />
    </label>
  );
};

export default NumberInput;
