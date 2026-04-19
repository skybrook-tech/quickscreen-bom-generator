import { useCalculator } from "../../context/CalculatorContext";
import { COLOURS, SLAT_SIZES, SLAT_GAPS } from "../../lib/constants";

export function DefaultSettings() {
  const { state, dispatch } = useCalculator();
  const { productOptions, defaults } = state;

  if (!productOptions) return null;

  const availableSlatSizes = SLAT_SIZES.filter((s) =>
    productOptions.slatSize.includes(s.value),
  );
  const availableSlatGaps = SLAT_GAPS.filter((s) =>
    productOptions.slatGap.includes(s.value),
  );
  const availableColours = COLOURS.filter((c) =>
    productOptions.colour.includes(c.value),
  );

  const update = (field: string, value: string) => {
    dispatch({ type: "SET_DEFAULTS", defaults: { [field]: value } });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-brand-muted mb-1.5">
          Slat Size
        </label>
        <select
          value={defaults.slatSize}
          onChange={(e) => update("slatSize", e.target.value)}
          className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-brand-text text-sm focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent outline-none"
        >
          {availableSlatSizes.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-muted mb-1.5">
          Slat Gap
        </label>
        <select
          value={defaults.slatGap}
          onChange={(e) => update("slatGap", e.target.value)}
          className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-brand-text text-sm focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent outline-none"
        >
          {availableSlatGaps.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-muted mb-1.5">
          Colour
        </label>
        <select
          value={defaults.colour}
          onChange={(e) => update("colour", e.target.value)}
          className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-brand-text text-sm focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent outline-none"
        >
          {availableColours.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
              {c.limited ? " ⚠ Limited" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
