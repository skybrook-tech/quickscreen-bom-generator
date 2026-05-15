export const COLOUR_LABELS: Record<string, string> = {
  B: "Black Satin",
  "black-satin": "Black Satin",
  MN: "Monument Matt",
  "monument-matt": "Monument Matt",
  G: "Woodland Grey Matt",
  "woodland-grey-matt": "Woodland Grey Matt",
  SM: "Surfmist Matt",
  "surfmist-matt": "Surfmist Matt",
  W: "Pearl White Gloss",
  "pearl-white-gloss": "Pearl White Gloss",
  BS: "Basalt Satin",
  "basalt-satin": "Basalt Satin",
  D: "Dune Satin",
  "dune-satin": "Dune Satin",
  M: "Mill (raw aluminium)",
  mill: "Mill (raw aluminium)",
  P: "Primrose",
  primrose: "Primrose",
  PB: "Paperbark",
  paperbark: "Paperbark",
  S: "Palladium Silver Pearl",
  "palladium-silver-pearl": "Palladium Silver Pearl",
  KWI: "Kwila",
  WRC: "Western Red Cedar",
  IG: "Island Grey",
  TR: "Terrain",
};

export const COLOUR_SWATCHES: Record<string, string> = {
  B: "#1a1a1a",
  "black-satin": "#1a1a1a",
  MN: "#5a5c5e",
  "monument-matt": "#5a5c5e",
  G: "#6b7264",
  "woodland-grey-matt": "#6b7264",
  SM: "#d6d2c8",
  "surfmist-matt": "#d6d2c8",
  W: "#f5f3ea",
  "pearl-white-gloss": "#f5f3ea",
  BS: "#4a4d52",
  "basalt-satin": "#4a4d52",
  D: "#bca98a",
  "dune-satin": "#bca98a",
  M: "#c8c4bc",
  mill: "#c8c4bc",
  P: "#f5e8c0",
  primrose: "#f5e8c0",
  PB: "#c0a882",
  paperbark: "#c0a882",
  S: "#b8bec6",
  "palladium-silver-pearl": "#b8bec6",
  KWI: "#7a5c3a",
  WRC: "#a07850",
  IG: "#9fa8a8",
  TR: "#8c7055",
};

interface ColourPaletteProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  size?: "sm" | "md";
}

export function colourName(code: unknown) {
  const value = String(code ?? "B");
  return COLOUR_LABELS[value] ?? value;
}

export function ColourPalette({
  value,
  options,
  onChange,
  size = "md",
}: ColourPaletteProps) {
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            title={colourName(option)}
            aria-label={colourName(option)}
            aria-pressed={selected}
            className={`${buttonSize} relative inline-flex items-center justify-center rounded-full border text-[10px] font-black uppercase tabular-nums transition-all ${
              selected
                ? "border-brand-primary ring-2 ring-brand-primary/45 ring-offset-2 ring-offset-brand-card"
                : "border-brand-border hover:border-brand-primary hover:ring-2 hover:ring-brand-primary/20"
            }`}
            style={{ background: COLOUR_SWATCHES[option] ?? "#ddd" }}
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
