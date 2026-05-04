import { Check } from "lucide-react";
import { cn } from "../../lib";
import {
  COLOUR_HEX,
  LIMITED_COLOURS,
  getSwatchTextColour,
} from "../../lib/colourHex";
import { Tooltip } from "./Tooltip";

export interface ColourPickerOption {
  value: string;
  code: string;
  label: string;
  limited?: boolean;
}

interface ColourPickerProps {
  value: string;
  options: ColourPickerOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ColourPicker({
  value,
  options,
  onChange,
  className,
  disabled = false,
}: ColourPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const selected = option.value === value || option.code === value;
        const hex = COLOUR_HEX[option.value] ?? COLOUR_HEX[option.code] ?? "#888888";
        const ink = getSwatchTextColour(hex);
        const limited =
          option.limited ||
          LIMITED_COLOURS.has(option.value) ||
          LIMITED_COLOURS.has(option.code);

        return (
          <Tooltip
            key={`${option.value}-${option.code}`}
            content={
              <span>
                {option.label}
                {limited ? " - limited stock" : ""}
              </span>
            }
          >
            <button
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.code)}
              className={cn(
                "relative grid h-9 w-9 place-items-center rounded-full border text-[11px] font-black uppercase tabular-nums transition",
                "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-accent/40",
                selected
                  ? "border-brand-accent ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-bg"
                  : "border-brand-border",
                limited && "border-dashed",
                disabled && "cursor-not-allowed opacity-50 hover:scale-100",
              )}
              style={{ backgroundColor: hex, color: ink }}
            >
              <span>{option.code}</span>
              {selected && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-brand-success text-white ring-2 ring-brand-card">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
