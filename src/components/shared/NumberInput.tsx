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
      {label && <span className="text-brand-muted">{label}</span>}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number(value).toString()}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "bg-white border border-brand-border rounded px-3 py-2 text-brand-text",
          className,
        )}
        onBlur={onBlur}
      />
    </label>
  );
};

export default NumberInput;
