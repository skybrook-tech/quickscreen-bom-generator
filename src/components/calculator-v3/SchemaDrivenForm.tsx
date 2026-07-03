import { FormField } from "../shared/FormField";
import { Check } from "lucide-react";
import { DerivationChip } from "../ui/DerivationChip";
import type { UiCalculatorConfig } from "../../types/calculatorConfig.types";
import { combinedGapRenderer } from "./formRenderers/combinedGap";
import { postFixingSelectRenderer } from "./formRenderers/postFixingSelect";
import { colourPaletteRenderer } from "./formRenderers/colourPalette";
import { colourPaletteOptionalRenderer } from "./formRenderers/colourPaletteOptional";
import { hardwareRankedRenderer } from "./formRenderers/hardwareRanked";
import { hardwareDropdownRenderer } from "./formRenderers/hardwareDropdown";
import { leafWidthPairRenderer } from "./formRenderers/leafWidthPair";
import { kitToggleRenderer } from "./formRenderers/kitToggle";
import { optionalAddonsRenderer } from "./formRenderers/optionalAddons";
import { automationGroupRenderer } from "./formRenderers/automationGroup";
import type { FieldRenderer } from "./formRenderers/types";

export type { FieldRenderer, FieldRendererContext } from "./formRenderers/types";

export interface SchemaField {
  id: string;
  field_key: string;
  label: string;
  control_type: string;
  data_type: string;
  unit?: string;
  required: boolean;
  default_value_json?: unknown;
  options_json: unknown[];
  visible_when_json: Record<string, unknown>;
  sort_order: number;
  options_group?: string;
  // Groups this field under one of the config's formGroups headings. Fields
  // without a group are schema-only (declared but not rendered by
  // SchemaSettingsForm).
  group?: string;
  // Which UI surfaces this field renders on: "run" (Run Settings, also seeds
  // run.variables defaults) and/or "segment" (per-segment override UI).
  // Defaults to ["run","segment"] when omitted. Visibility only — merge
  // semantics (run -> segment inheritance) are unchanged.
  settings_for?: ("run" | "segment")[];
  // Show this run field as an always-visible chip in the run header strip
  // (RunCard.tsx), instead of only inside the Run Settings drawer.
  show_in_run_summary?: boolean;
  // Renderer hint for non-generic presentation — set in fields.json, read here.
  // Replaces field_key switches: "colour" → colour label+limited badge.
  render_hint?: string;
}

interface SchemaDrivenFormProps {
  fields: SchemaField[];
  onChange: (key: string, value: string | number | boolean) => void;
  variables: Record<string, string | number | boolean>;
  /** Multi-key atomic writes, for controls that touch more than one variable (combined_gap, leaf pairs, hardware pickers). Defaults to sequential onChange calls. */
  onPatch?: (patch: Record<string, string | number | boolean | null | undefined>) => void;
  /** Free-form context bag consumed by custom control-type renderers (productCode, segment, leaves, etc). */
  extra?: Record<string, unknown>;
  /** Extra/override control-type renderers, merged over the built-in registry. */
  renderers?: Record<string, FieldRenderer>;
}

/**
 * `visible_when_json` supports:
 *   { field: value }              — exact match
 *   { field: [v1, v2] }           — value is one of
 *   { field: { not: value } }     — value is not
 *   { field: { not_in: [v1,v2] } } — value is not one of
 * All entries are AND-ed together.
 */
export function isVisible(
  visibleWhen: Record<string, unknown>,
  variables: Record<string, unknown>,
): boolean {
  for (const [k, v] of Object.entries(visibleWhen)) {
    const actual = variables[k];
    if (Array.isArray(v)) {
      if (!v.includes(actual)) return false;
      continue;
    }
    if (v && typeof v === "object") {
      const condition = v as { not?: unknown; not_in?: unknown[] };
      if ("not" in condition && actual === condition.not) return false;
      if (Array.isArray(condition.not_in) && condition.not_in.includes(actual)) return false;
      continue;
    }
    if (actual !== v) return false;
  }
  return true;
}

const DEFAULT_RENDERERS: Record<string, FieldRenderer> = {
  combined_gap: combinedGapRenderer,
  post_fixing_select: postFixingSelectRenderer,
  colour_palette: colourPaletteRenderer,
  colour_palette_optional: colourPaletteOptionalRenderer,
  hardware_ranked: hardwareRankedRenderer,
  hardware_dropdown: hardwareDropdownRenderer,
  leaf_width_pair: leafWidthPairRenderer,
  kit_toggle: kitToggleRenderer,
  optional_addons: optionalAddonsRenderer,
  automation_group: automationGroupRenderer,
};

const FIELD_WRAPPER = "w-full";

// Labels for values that are NOT backed by a config-defined {value,label}
// option — either client-only synthetic fields (finish_family, slat_gap_mode)
// or forced/non-selectable values (XPL's "xpl" post system, never offered as
// a dropdown choice). Anything selectable from config should carry its own
// label in options_json instead of being added here — see config/forms/*.ts.
const ENUM_LABELS: Record<string, string> = {
  standard: "Standard slats",
  economy: "Economy slats",
  alumawood: "Alumawood timber-look",
  spacer: "Preset spacer gaps",
  custom: "Custom gap",
  xpl: "XPress Plus post",
};

function optionValue(option: unknown): string {
  if (option && typeof option === "object" && "value" in option) {
    return String((option as { value: unknown }).value);
  }
  return String(option);
}

function optionLabel(field: SchemaField, option: unknown, colourNames?: Record<string, string>): string {
  if (option && typeof option === "object" && "label" in option) {
    return String((option as { label: unknown }).label);
  }
  const value = optionValue(option);
  if (field.render_hint === "colour") {
    const limited = value === "P" || value === "PB" ? " - limited" : "";
    const label = colourNames?.[value] ?? value;
    return `${label} (${value})${limited}`;
  }
  if (field.field_key === "target_height_mm") return `${value}mm`;
  return ENUM_LABELS[value] ?? value.replace(/_/g, " ");
}

/**
 * Human-readable label for a raw variable value, given the SchemaField it
 * belongs to. Looks up a matching `{value,label}` pair in `field.options_json`
 * first (the config-driven, single-source-of-truth path) and falls back to
 * `optionLabel`'s generic handling (colour names, units, ENUM_LABELS) when no
 * match is found. Use this instead of ad-hoc label dictionaries in summary/
 * display code outside the form itself (RunCard, SegmentRow, etc).
 */
export function valueLabel(
  field: SchemaField | undefined,
  rawValue: unknown,
  fallback = "Default",
  colourNames?: Record<string, string>,
): string {
  if (!field) return fallback;
  if (rawValue === undefined || rawValue === null || rawValue === "") return fallback;
  const options = Array.isArray(field.options_json) ? field.options_json : [];
  const match = options.find((opt) => optionValue(opt) === String(rawValue));
  if (match !== undefined) return optionLabel(field, match, colourNames);
  const generic = optionLabel(field, rawValue, colourNames);
  // optionLabel's field-key-specific branches already append units for slat
  // size/gap/height; for everything else without a config-defined option
  // match, fall back to the field's declared unit (e.g. max_panel_width_mm).
  return generic === String(rawValue) && field.unit ? `${rawValue}${field.unit}` : generic;
}

function coerceValue(field: SchemaField, value: string): string | number | boolean {
  if (field.data_type === "number" || field.data_type === "integer") {
    return Number(value);
  }
  if (field.data_type === "boolean") return value === "true";
  return value;
}

export function SchemaDrivenForm({
  fields,
  onChange,
  onPatch,
  variables,
  extra = {},
  renderers,
}: SchemaDrivenFormProps) {
  const registry = renderers ? { ...DEFAULT_RENDERERS, ...renderers } : DEFAULT_RENDERERS;
  const colourNames = (extra.config as UiCalculatorConfig | undefined)?.colours.names;
  const patch =
    onPatch ??
    ((p: Record<string, string | number | boolean | null | undefined>) => {
      for (const [key, value] of Object.entries(p)) {
        if (value !== null && value !== undefined) onChange(key, value);
      }
    });

  return (
    <div className="flex flex-wrap gap-3">
      {fields.map((field) => {
        if (!isVisible(field.visible_when_json ?? {}, variables)) return null;

        const customRenderer = registry[field.control_type];
        if (customRenderer) {
          return (
            <div key={field.id} data-testid={field.field_key} className={FIELD_WRAPPER}>
              {customRenderer({ field, variables, onChange, onPatch: patch, extra })}
            </div>
          );
        }

        if (
          field.control_type === "select" &&
          Array.isArray(field.options_json) &&
          field.options_json.length > 0
        ) {
          const currentValue = String(variables[field.field_key] ?? "");
          return (
            <div
              key={field.id}
              data-testid={field.field_key}
              className={FIELD_WRAPPER}
            >
              <FormField
                label={field.label}
              >
                {field.field_key === "target_height_mm" && (
                  <div className="mb-2">
                    {field.options_json.length > 0 ? (
                      <DerivationChip
                        label="Heights for"
                        value={`${variables.slat_size_mm ?? "?"}mm x ${variables.slat_gap_mm ?? "?"}mm gap`}
                      />
                    ) : (
                      <DerivationChip label="Custom height" value="free input" tone="muted" />
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {field.options_json.map((opt) => {
                    const value = optionValue(opt);
                    const selected = value === currentValue;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          onChange(field.field_key, coerceValue(field, value))
                        }
                        aria-pressed={selected}
                        className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                          selected
                            ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                            : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
                        }`}
                      >
                        {selected && <Check size={16} aria-hidden />}
                        {optionLabel(field, opt, colourNames)}
                      </button>
                    );
                  })}
                </div>
              </FormField>
            </div>
          );
        }

        if (field.control_type === "number") {
          return (
            <div
              key={field.id}
              data-testid={field.field_key}
              className={FIELD_WRAPPER}
            >
              <FormField
                label={field.label}
              >
                {field.field_key === "target_height_mm" && (
                  <div className="mb-2">
                    <DerivationChip label="Custom height" value="free input" tone="muted" />
                  </div>
                )}
                <input
                  type="number"
                  aria-label={`${field.label} ${field.unit ?? ""}`.trim()}
                  inputMode={field.data_type === "integer" ? "numeric" : "decimal"}
                  pattern={field.data_type === "integer" ? "[0-9]*" : "[0-9]*\\.?[0-9]*"}
                  value={Number(
                    variables[field.field_key] ?? field.default_value_json ?? 0,
                  )}
                  onChange={(e) =>
                    onChange(
                      field.field_key,
                      field.data_type === "integer"
                        ? parseInt(e.target.value)
                        : parseFloat(e.target.value),
                    )
                  }
                  className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                />
              </FormField>
            </div>
          );
        }

        if (field.control_type === "toggle") {
          return (
            <div
              key={field.id}
              data-testid={field.field_key}
              className={`${FIELD_WRAPPER} flex items-center gap-3`}
            >
              <input
                type="checkbox"
                checked={Boolean(variables[field.field_key])}
                onChange={(e) => onChange(field.field_key, e.target.checked)}
                className="rounded border-brand-border bg-brand-card text-brand-accent"
              />
              <label className="text-sm font-medium text-brand-text">
                {field.label}
              </label>
            </div>
          );
        }

        return (
          <div
            key={field.id}
            data-testid={field.field_key}
            className={FIELD_WRAPPER}
          >
            <FormField
              label={field.label}
            >
              <input
                type="text"
                aria-label={field.label}
                value={String(variables[field.field_key] ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              />
            </FormField>
          </div>
        );
      })}
    </div>
  );
}
