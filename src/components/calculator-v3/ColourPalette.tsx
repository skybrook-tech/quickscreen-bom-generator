interface ColourPaletteProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  size?: "sm" | "md";
  swatches?: Record<string, string>;
  labels?: Record<string, string>;
}

export function colourName(code: unknown, labels?: Record<string, string>) {
  const value = String(code ?? "");
  return labels?.[value] ?? value;
}

export function ColourPalette({
  value,
  options,
  onChange,
  size = "md",
  swatches = {},
  labels,
}: ColourPaletteProps) {
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option === value;
        const displayName = colourName(option, labels);

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            title={displayName}
            aria-label={displayName}
            aria-pressed={selected}
            className={`${buttonSize} relative inline-flex items-center justify-center rounded-full border text-[10px] font-black uppercase tabular-nums transition-all ${selected
              ? "border-brand-primary ring-2 ring-brand-primary/45 ring-offset-2 ring-offset-brand-card"
              : "border-brand-border hover:border-brand-primary hover:ring-2 hover:ring-brand-primary/20"
              }`}
            style={{ background: swatches[option] ?? "#ddd" }}
          >
            <span
              className="select-none text-white"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,.95), 0 0 2px rgba(0,0,0,.75)" }}
            >
              {option}
            </span>
          </button>
        );
      })}
    </div>
  );
}
