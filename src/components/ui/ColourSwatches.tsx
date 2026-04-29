import {
  COLOUR_HEX,
  LIMITED_COLOURS,
  getSwatchTextColour,
} from "../../lib/colourHex";

export interface ColourOption {
  value: string;
  label: string;
}

interface ColourSwatchesProps {
  value: string;
  onChange: (code: string) => void;
  colours: ColourOption[];
  className?: string;
}

export function ColourSwatches({
  value,
  onChange,
  colours,
  className = "",
}: ColourSwatchesProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {colours.map((c) => {
        const hex = COLOUR_HEX[c.value] ?? "#888888";
        const selected = c.value === value;
        const limited = LIMITED_COLOURS.has(c.value);
        const textCol = getSwatchTextColour(hex);

        return (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onClick={() => onChange(c.value)}
            className={[
              "relative w-8 h-8 rounded-md transition-all",
              selected
                ? "ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-bg scale-110"
                : "ring-1 ring-neutral-700 hover:scale-105",
            ].join(" ")}
            style={{ backgroundColor: hex }}
          >
            {selected && (
              <span
                className="absolute inset-0 flex items-center justify-center text-[9px] font-bold leading-none"
                style={{ color: textCol }}
              >
                ✓
              </span>
            )}
            {limited && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
