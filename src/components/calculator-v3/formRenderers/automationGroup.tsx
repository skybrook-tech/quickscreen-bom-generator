import NumberInput from "../../shared/NumberInput";
import type { FieldRenderer } from "./types";

interface AutomationSummaryItem {
  sku: string;
  qty: number;
}

/**
 * control_type: "automation_group" — sliding gate automation kit. One field
 * (`automation_enabled`) owns the whole conditional block (power source,
 * cable distance, battery, keypad, remotes, summary) rather than scattering
 * six separate config fields across the form, since they only ever appear
 * together.
 */
export const automationGroupRenderer: FieldRenderer = ({ field, variables, onChange, extra }) => {
  const enabled = Boolean(variables[field.field_key]);
  const powerSource = String(variables.automation_power_source ?? "mains");
  const cableDistanceM = Number(variables.automation_cable_distance_m ?? 0);
  const extraRemoteCount = Math.min(10, Math.max(0, Number(variables.automation_extra_remotes ?? 0)));
  const summary = (extra.automationSummary as AutomationSummaryItem[]) ?? [];

  return (
    <div className="w-full space-y-3 rounded-lg border border-brand-border/70 bg-brand-card p-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(field.field_key, e.target.checked)}
        />
        <span className="text-sm font-black text-brand-text">Add automation kit?</span>
      </label>
      {enabled && (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-bold text-brand-muted">Power source</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "mains", label: "Mains powered" },
                { value: "solar", label: "Solar powered" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange("automation_power_source", option.value)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                    powerSource === option.value
                      ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                      : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {powerSource === "mains" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold text-brand-muted">Motor distance from mains outlet (m)</span>
              <NumberInput
                value={cableDistanceM}
                min={0}
                step={1}
                className="w-24 px-2 py-1.5 text-center tabular-nums"
                onChange={(value) => onChange("automation_cable_distance_m", Number(value))}
              />
              {cableDistanceM > 30 && (
                <span className="rounded-full border border-brand-success/30 bg-brand-success/10 px-2 py-1 text-xs font-bold text-brand-success">
                  Switched to Split Pack - better for long cable runs
                </span>
              )}
            </label>
          )}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={variables.automation_battery === true}
              onChange={(e) => onChange("automation_battery", e.target.checked)}
            />
            <span className="text-sm font-bold text-brand-muted">Add backup battery for power outages</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={variables.automation_keypad === true}
              onChange={(e) => onChange("automation_keypad", e.target.checked)}
            />
            <span className="text-sm font-bold text-brand-muted">Wireless keypad</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-brand-muted">Extra remotes</span>
            <NumberInput
              value={extraRemoteCount}
              min={0}
              max={10}
              step={1}
              className="w-20 px-2 py-1.5 text-center tabular-nums"
              onChange={(value) => onChange("automation_extra_remotes", Math.min(10, Math.max(0, Number(value))))}
            />
          </label>
          <div className="rounded-lg border border-brand-border/70 bg-brand-bg/70 p-3">
            <p className="text-sm font-black text-brand-text">Automation summary</p>
            <div className="mt-2 space-y-1 text-xs font-bold text-brand-muted">
              {summary.map((item) => (
                <div key={item.sku} className="flex justify-between gap-2">
                  <span>{item.qty} x {item.sku}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs font-semibold text-brand-muted">Pricing shown after BOM is calculated.</p>
            <p className="mt-2 text-xs font-semibold text-brand-muted">
              Installation by certified electrician recommended for mains-powered kits.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
