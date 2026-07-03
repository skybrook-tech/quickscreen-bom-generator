import { useState } from "react";
import { optionLabel, type GateOption } from "../../lib/gateOptionRules";
import {
  baseHardwareSku,
  type GateHardwareStatus,
  type HingeHardware,
  type LatchHardware,
  type RankedHardware,
} from "../../lib/gateHardware";
import { useProductSearch } from "../../hooks/useProductSearch";
import { optionalAccessoriesForParent } from "../../lib/bomMetadata";

/**
 * Presentational gate hardware pickers, shared between `GateSegmentDetails`
 * and the `hardware_ranked` / `hardware_dropdown` / `optional_addons`
 * SchemaDrivenForm renderers. No calculation logic lives here — callers pass
 * pre-computed ranked/option lists and a plain `onChange`.
 */

export function statusClasses(status: GateHardwareStatus) {
  if (status === "fit") return "border-brand-success/50 bg-brand-success/10 text-brand-success";
  if (status === "tight") return "border-brand-warning/60 bg-brand-warning/10 text-brand-warning";
  return "border-brand-danger/50 bg-brand-danger/10 text-brand-danger";
}

export function statusLabel(status: GateHardwareStatus) {
  if (status === "fit") return "Fits";
  if (status === "tight") return "Tight fit";
  return "Does not fit";
}

export function rankedLabel<T extends { sku: string; label: string }>(
  options: Array<RankedHardware<T>>,
  value: string,
) {
  const match = options.find((option) => option.effectiveSku === value || option.sku === value);
  return match?.label ?? value;
}

export function HardwareReasonTags({
  status,
  reasons,
}: {
  status: GateHardwareStatus;
  reasons: string[];
}) {
  const tags = reasons.length > 0 ? reasons : status === "tight" ? ["Close to required rating"] : [];
  if (tags.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {tags.map((reason) => (
        <span
          key={reason}
          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClasses(status)}`}
        >
          {reason}
        </span>
      ))}
    </div>
  );
}

export function HardwareDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Search inventory",
}: {
  label: string;
  value: string;
  options: GateOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const selectedLabel = optionLabel(options, value);
  const hasPresetValue = options.some((option) => option.value === value);
  const [query, setQuery] = useState("");
  const { data: suggestions = [], isFetching } = useProductSearch(query);
  const filteredSuggestions = suggestions.filter((item) => {
    const haystack = `${item.sku} ${item.name} ${item.description} ${item.category}`.toLowerCase();
    return haystack.includes("gate") || haystack.includes("hinge") || haystack.includes("latch") ||
      haystack.includes("bolt") || haystack.includes("catch") || haystack.includes("track") ||
      haystack.includes("motor") || haystack.includes("stop");
  });

  return (
    <div className="space-y-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold text-brand-muted">{label}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-bold text-brand-text shadow-sm focus:border-brand-primary focus:outline-none"
        >
          {!hasPresetValue && value && (
            <option value={value}>{value} - inventory selection</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-lg border border-brand-border/70 bg-brand-card/80 p-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`${placeholder} for ${label.toLowerCase()}`}
          className="w-full rounded-md border border-brand-border bg-brand-bg px-2 py-1.5 text-sm font-semibold text-brand-text placeholder:text-brand-muted/70 focus:border-brand-primary focus:outline-none"
        />
        <p className="mt-1 text-xs font-semibold text-brand-muted">
          Selected: <span className="text-brand-text">{selectedLabel || value}</span>
        </p>
        {query.trim().length >= 2 && (
          <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-brand-border/60 bg-brand-bg">
            {isFetching ? (
              <div className="px-2 py-2 text-xs font-semibold text-brand-muted">Searching...</div>
            ) : filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item) => (
                <button
                  key={item.sku}
                  type="button"
                  onClick={() => {
                    onChange(item.sku);
                    setQuery("");
                  }}
                  className="block w-full border-b border-brand-border/50 px-2 py-2 text-left text-xs font-semibold text-brand-text last:border-b-0 hover:bg-brand-primary hover:text-white"
                >
                  <span className="block text-sm">{item.sku}</span>
                  <span className="block text-brand-muted">{item.name}</span>
                </button>
              ))
            ) : (
              <div className="px-2 py-2 text-xs font-semibold text-brand-muted">No hardware matches.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function OptionalAddOns({
  parentSku,
  selected,
  onChange,
}: {
  parentSku: string;
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const options = optionalAccessoriesForParent(parentSku);
  if (options.length === 0) return null;

  return (
    <div className="rounded-lg border border-brand-border/70 bg-brand-card p-3">
      <p className="text-sm font-black text-brand-text">Optional add-ons</p>
      <p className="mb-2 text-xs font-semibold text-brand-muted">
        These are offered with {parentSku} and only appear on the BOM when ticked.
      </p>
      <div className="space-y-2">
        {options.map((option) => {
          const checked = selected.includes(option.sku);
          return (
            <label
              key={`${parentSku}-${option.sku}`}
              className="flex items-start gap-2 rounded-lg border border-brand-border/60 bg-brand-bg/50 p-2"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                onChange={(event) => {
                  onChange(
                    event.target.checked
                      ? [...selected, option.sku]
                      : selected.filter((sku) => sku !== option.sku),
                  );
                }}
              />
              <span>
                <span className="block text-sm font-bold text-brand-text">
                  + {option.label}
                </span>
                <span className="block text-xs font-semibold text-brand-muted">
                  {option.sku}
                  {option.unitPrice > 0 ? ` - $${option.unitPrice.toFixed(2)} ex GST` : " - price not set"}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function HingePicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: RankedHardware<HingeHardware>[];
  onChange: (value: string) => void;
}) {
  const baseValue = baseHardwareSku(value);
  const primaryOptions = options.filter((option) => option.status !== "fail");
  const otherOptions = options.filter((option) => option.status === "fail");
  const renderOption = (option: RankedHardware<HingeHardware>) => {
    const active = baseValue === option.sku || value === option.effectiveSku;
    return (
      <button
        key={option.sku}
        type="button"
        onClick={() => onChange(option.effectiveSku)}
        className={`rounded-lg border p-3 text-left shadow-none transition hover:shadow-sm ${
          active
            ? "border-brand-primary bg-brand-primary/10"
            : "border-brand-border bg-brand-card hover:border-brand-primary"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-black text-brand-text">{option.label}</p>
            <p className="text-xs font-bold text-brand-muted">
              {option.effectiveSku} - {option.ratingKg}kg - gap {option.gapMinMm}-{option.gapMaxMm}mm
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {option.recommended && (
              <span className="rounded-full bg-brand-success px-2 py-0.5 text-[11px] font-black text-white">
                Recommended cheapest fit
              </span>
            )}
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${statusClasses(option.status)}`}>
              {statusLabel(option.status)}
            </span>
          </div>
        </div>
        <HardwareReasonTags status={option.status} reasons={option.reasons} />
      </button>
    );
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-brand-muted">Hinge / closer</p>
        <span className="text-xs font-bold text-brand-muted">{options.length} catalogue hinges</span>
      </div>
      <div className="grid gap-2">
        {primaryOptions.map(renderOption)}
        {otherOptions.length > 0 && (
          <details className="rounded-lg border border-brand-border bg-brand-card/70">
            <summary className="cursor-pointer px-3 py-2 text-sm font-black text-brand-muted">
              Other hinges
            </summary>
            <div className="grid gap-2 border-t border-brand-border/60 p-2">
              {otherOptions.map(renderOption)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

export function LatchPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: RankedHardware<LatchHardware>[];
  onChange: (value: string) => void;
}) {
  const baseValue = baseHardwareSku(value);
  const primaryOptions = options.filter((option) => option.status !== "fail");
  const otherOptions = options.filter((option) => option.status === "fail");
  const renderOption = (option: RankedHardware<LatchHardware>) => {
    const active = baseValue === option.sku || value === option.effectiveSku;
    return (
      <button
        key={option.sku}
        type="button"
        onClick={() => onChange(option.effectiveSku)}
        className={`rounded-lg border p-3 text-left shadow-none transition hover:shadow-sm ${
          active
            ? "border-brand-primary bg-brand-primary/10"
            : "border-brand-border bg-brand-card hover:border-brand-primary"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-black text-brand-text">{option.label}</p>
            <p className="text-xs font-bold text-brand-muted">
              {option.effectiveSku}
              {option.lockable ? " - lockable" : ""}
              {option.poolSafe ? " - pool safe" : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {option.recommended && (
              <span className="rounded-full bg-brand-success px-2 py-0.5 text-[11px] font-black text-white">
                Recommended
              </span>
            )}
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${statusClasses(option.status)}`}>
              {statusLabel(option.status)}
            </span>
          </div>
        </div>
        <HardwareReasonTags status={option.status} reasons={option.reasons} />
      </button>
    );
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-brand-muted">Latch / lock</p>
        <span className="text-xs font-bold text-brand-muted">Filtered to gate movement</span>
      </div>
      <div className="grid gap-2">
        {primaryOptions.map(renderOption)}
        {otherOptions.length > 0 && (
          <details className="rounded-lg border border-brand-border bg-brand-card/70">
            <summary className="cursor-pointer px-3 py-2 text-sm font-black text-brand-muted">
              Other latches
            </summary>
            <div className="grid gap-2 border-t border-brand-border/60 p-2">
              {otherOptions.map(renderOption)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
