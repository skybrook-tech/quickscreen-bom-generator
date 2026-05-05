import { FormField } from "../shared/FormField";
import { Check } from "lucide-react";
import { ColourPalette, COLOUR_LABELS } from "./ColourPalette";

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
}

interface SchemaDrivenFormProps {
  fields: SchemaField[];
  onChange: (key: string, value: string | number | boolean) => void;
  variables: Record<string, string | number | boolean>;
}

function isVisible(
  visibleWhen: Record<string, unknown>,
  variables: Record<string, unknown>,
): boolean {
  for (const [k, v] of Object.entries(visibleWhen)) {
    if (Array.isArray(v)) {
      if (!v.includes(variables[k])) return false;
    } else {
      if (variables[k] !== v) return false;
    }
  }
  return true;
}

const FIELD_WRAPPER = "w-full";

const ENUM_LABELS: Record<string, string> = {
  standard: "Standard slats",
  economy: "Economy slats",
  alumawood: "Alumawood timber-look",
  spacer: "Preset spacer gaps",
  custom: "Custom gap",
  in_ground: "Concreted in ground",
  base_plate: "Base-plated to slab",
  core_drill: "Core-drilled into concrete",
  xpl: "XPress Plus post",
  standard_50: "50mm Post Standard",
  standard_65: "65mm Post Standard HD",
  "50": "50mm Post Standard",
  "65": "65mm Post Standard HD",
};

function optionLabel(field: SchemaField, option: unknown): string {
  const value = String(option);
  if (field.field_key === "finish_family") return ENUM_LABELS[value] ?? value;
  if (field.field_key === "colour_code" || field.field_key === "post_colour_code") {
    const limited = value === "P" || value === "PB" ? " - limited" : "";
    return `${COLOUR_LABELS[value] ?? value} (${value})${limited}`;
  }
  if (field.field_key === "slat_size_mm") return `${value}mm slat`;
  if (field.field_key === "slat_gap_mm") {
    if (value === "5") return "5mm - near privacy";
    if (value === "9") return "9mm - standard";
    if (value === "20") return "20mm - open";
    return `${value}mm`;
  }
  if (field.field_key === "target_height_mm") return `${value}mm`;
  return ENUM_LABELS[value] ?? value.replace(/_/g, " ");
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
  variables,
}: SchemaDrivenFormProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {fields.map((field) => {
        if (!isVisible(field.visible_when_json ?? {}, variables)) return null;

        if (
          field.control_type === "select" &&
          Array.isArray(field.options_json) &&
          field.options_json.length > 0
        ) {
          const currentValue = String(variables[field.field_key] ?? "");
          const isColourField = field.field_key === "colour_code" || field.field_key === "post_colour_code";
          return (
            <div
              key={field.id}
              data-testid={field.field_key}
              className={FIELD_WRAPPER}
            >
              <FormField
                label={field.label}
              >
                {isColourField ? (
                  <ColourPalette
                    value={currentValue}
                    options={field.options_json.map(String)}
                    onChange={(value) =>
                      onChange(field.field_key, coerceValue(field, value))
                    }
                  />
                ) : (
                <div className="flex flex-wrap gap-2">
                  {field.options_json.map((opt) => {
                    const value = String(opt);
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
                        {optionLabel(field, opt)}
                      </button>
                    );
                  })}
                </div>
                )}
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
                <input
                  type="number"
                  aria-label={`${field.label} ${field.unit ?? ""}`.trim()}
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
