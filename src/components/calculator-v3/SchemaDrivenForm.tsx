import { FormField } from "../shared/FormField";
import { ColourPalette, COLOUR_LABELS } from "./ColourPalette";
import { DerivationChip } from "../ui/DerivationChip";

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
}

interface SchemaDrivenFormProps {
  fields: SchemaField[];
  onChange: (key: string, value: string | number | boolean) => void;
  variables: Record<string, string | number | boolean>;
}

export function isVisible(
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

function optionValue(option: unknown): string {
  if (option && typeof option === "object" && "value" in option) {
    return String((option as { value: unknown }).value);
  }
  return String(option);
}

function optionLabel(field: SchemaField, option: unknown): string {
  if (option && typeof option === "object" && "label" in option) {
    return String((option as { label: unknown }).label);
  }
  const value = optionValue(option);
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
    <div className="w-full space-y-4">
      {fields.map((field) => {
        if (!isVisible(field.visible_when_json ?? {}, variables)) return null;

        if (
          field.control_type === "select" &&
          Array.isArray(field.options_json) &&
          field.options_json.length > 0
        ) {
          const currentValue = String(variables[field.field_key] ?? "");
          const isColourField = field.field_key === "colour_code" || field.field_key === "post_colour_code";
          const useDropdown = field.options_json.length > 5;

          return (
            <div
              key={field.id}
              data-testid={field.field_key}
              className={FIELD_WRAPPER}
            >
              <FormField
                label={
                  <span className="flex items-center justify-between w-full af-sidebar-field-label">
                    <span>{field.label}</span>
                    {field.unit && (
                      <span className="text-[10px] font-normal text-[#6E7681]">({field.unit})</span>
                    )}
                  </span>
                }
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
                {isColourField ? (
                  <ColourPalette
                    value={currentValue}
                    options={field.options_json.map(String)}
                    onChange={(value) =>
                      onChange(field.field_key, coerceValue(field, value))
                    }
                  />
                ) : useDropdown ? (
                  <select
                    value={currentValue}
                    onChange={(e) =>
                      onChange(field.field_key, coerceValue(field, e.target.value))
                    }
                    className="w-full rounded-lg border border-[#E9E5DD] bg-white px-3 py-2 text-sm font-semibold text-[#11161D] shadow-sm outline-none transition-colors focus:border-[#DD6E1B] focus:ring-2 focus:ring-[#DD6E1B]/20"
                  >
                    <option value="" disabled>Select...</option>
                    {field.options_json.map((opt) => {
                      const value = optionValue(opt);
                      return (
                        <option key={value} value={value}>
                          {optionLabel(field, opt)}
                        </option>
                      );
                    })}
                  </select>
                ) : (
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
                          className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                            selected
                              ? "border-[#DD6E1B] bg-[#DD6E1B] text-white shadow-sm font-bold"
                              : "border-[#E9E5DD] bg-white text-[#11161D] hover:border-[#DD6E1B]/50 hover:bg-[#FCF1E6]/10"
                          }`}
                        >
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
                label={
                  <span className="flex items-center justify-between w-full af-sidebar-field-label">
                    <span>{field.label}</span>
                    {field.unit && (
                      <span className="text-[10px] font-normal text-[#6E7681]">({field.unit})</span>
                    )}
                  </span>
                }
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
                  className="w-full rounded-lg border border-[#E9E5DD] bg-white px-3 py-2 text-sm font-semibold text-[#11161D] shadow-sm outline-none transition-colors focus:border-[#DD6E1B] focus:ring-2 focus:ring-[#DD6E1B]/20"
                />
              </FormField>
            </div>
          );
        }

        if (field.control_type === "toggle") {
          const isChecked = Boolean(variables[field.field_key]);
          return (
            <div
              key={field.id}
              data-testid={field.field_key}
              className={`${FIELD_WRAPPER} flex items-center gap-2.5 py-1.5`}
            >
              <input
                id={field.id}
                type="checkbox"
                checked={isChecked}
                onChange={(e) => onChange(field.field_key, e.target.checked)}
                className="rounded border-[#E9E5DD] text-[#DD6E1B] focus:ring-[#DD6E1B]/20 h-4 w-4 bg-white"
              />
              <label htmlFor={field.id} className="text-xs font-semibold text-[#11161D] select-none">
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
              label={
                <span className="flex items-center justify-between w-full af-sidebar-field-label">
                  <span>{field.label}</span>
                  {field.unit && (
                    <span className="text-[10px] font-normal text-[#6E7681]">({field.unit})</span>
                  )}
                </span>
              }
            >
              <input
                type="text"
                aria-label={field.label}
                value={String(variables[field.field_key] ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                className="w-full rounded-lg border border-[#E9E5DD] bg-white px-3 py-2 text-sm font-semibold text-[#11161D] shadow-sm outline-none transition-colors focus:border-[#DD6E1B] focus:ring-2 focus:ring-[#DD6E1B]/20"
              />
            </FormField>
          </div>
        );
      })}
    </div>
  );
}
