import { cn } from "../../lib";

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
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-semibold text-brand-muted">{label}</span>}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number(value).toString()}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20",
          className,
        )}
        onBlur={onBlur}
      />
    </label>
  );
};

export default NumberInput;
