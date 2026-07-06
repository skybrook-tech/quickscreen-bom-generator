import type { FieldRenderer } from "./types";

interface MatchingKit {
  label: string;
  kitSku: string;
}

/** control_type: "kit_toggle" — offers the matched hinge+latch kit SKU, if any. */
export const kitToggleRenderer: FieldRenderer = ({ field, variables, onChange, extra }) => {
  const matchingKit = extra.matchingHardwareKit as MatchingKit | undefined;
  if (!matchingKit) return null;
  const selectedKitSku = String(variables[field.field_key] ?? "");
  const usingKit = selectedKitSku === matchingKit.kitSku;

  return (
    <div className="w-full rounded-lg border border-brand-success/40 bg-brand-success/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-brand-success">Save as kit</p>
          <p className="text-xs font-bold text-brand-muted">
            {matchingKit.label} - {matchingKit.kitSku}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(field.field_key, usingKit ? "" : matchingKit.kitSku)}
          className="rounded-lg border border-brand-success bg-brand-card px-3 py-1.5 text-xs font-black text-brand-success hover:shadow-sm"
        >
          {usingKit ? "Using kit" : "Use kit"}
        </button>
      </div>
    </div>
  );
};
