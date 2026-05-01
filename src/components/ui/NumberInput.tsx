import { Input } from "./Input";

interface NumberInputProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  label?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
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
  disabled,
}: NumberInputProps) => {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-brand-muted">{label}</span>}
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number(value).toString()}
        onChange={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        className={className}
        onBlur={onBlur}
        disabled={disabled}
      />
    </label>
  );
};

export default NumberInput;
