import { FormField } from "../shared/FormField";

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

// Every field wraps in a 1/3-width flex item on desktop, full-width on mobile.
// Extendable later with per-field `width` hints; intentionally simple for now.
const FIELD_WRAPPER = "w-full md:w-[calc(33.333%-0.6667rem)]";

const COLOUR_LABELS: Record<string, string> = {
  B: "Black Satin",
  MN: "Monument Matt",
  G: "Woodland Grey Matt",
  SM: "Surfmist Matt",
  W: "Pearl White Gloss",
  BS: "Basalt Satin",
  D: "Dune Satin",
  M: "Mill (raw aluminium)",
  P: "Primrose",
  PB: "Paperbark",
  S: "Palladium Silver Pearl",
  KWI: "Kwila",
  WRC: "Western Red Cedar",
  IG: "Island Grey",
  TR: "Terrain",
};

const COLOUR_SWATCHES: Record<string, string> = {
  B: "#1a1a1a",
  MN: "#5a5c5e",
  G: "#6b7264",
  SM: "#d6d2c8",
  W: "#e8e4d8",
  BS: "#4a4d52",
  D: "#bca98a",
  M: "#c8c4bc",
  P: "#f5e8c0",
  PB: "#c0a882",
  S: "#b8bec6",
  KWI: "#7a5c3a",
  WRC: "#a07850",
  IG: "#9fa8a8",
  TR: "#8c7055",
};

const ENUM_LABELS: Record<string, string> = {
  standard: "Standard slats",
  economy: "Economy slats",
  alumawood: "Alumawood timber-look",
  in_ground: "Concreted in ground",
  base_plate: "Base-plated to slab",
  core_drill: "Core-drilled into concrete",
  xpl: "XPress Plus posts",
  standard_50: "Standard 50mm posts",
  standard_65: "Standard 65mm HD posts",
  "50": "50x50mm",
  "65": "65x65mm HD",
};

function optionLabel(field: SchemaField, option: unknown): string {
  const value = String(option);
  if (field.field_key === "finish_family") return ENUM_LABELS[value] ?? value;
  if (field.field_key === "colour_code") {
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
    <div className="flex flex-wrap gap-4">
      {fields.map((field) => {
        if (!isVisible(field.visible_when_json ?? {}, variables)) return null;

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
                note={field.unit ? `Units: ${field.unit}` : undefined}
              >
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
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? "border-blue-800 bg-blue-800 text-white shadow-sm"
                            : "border-brand-border bg-slate-50 text-brand-text hover:border-blue-800 hover:text-blue-800"
                        }`}
                      >
                        {field.field_key === "colour_code" && (
                          <span
                            className="h-3 w-3 rounded-full border border-black/20"
                            style={{ background: COLOUR_SWATCHES[value] ?? "#ddd" }}
                          />
                        )}
                        {optionLabel(field, opt)}
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
                note={field.unit ? `Units: ${field.unit}` : undefined}
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
                  className="w-full bg-white border border-brand-border rounded px-3 py-2 text-sm text-brand-text"
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
                className="rounded"
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
              note={field.unit ? `Units: ${field.unit}` : undefined}
            >
              <input
                type="text"
                aria-label={field.label}
                value={String(variables[field.field_key] ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                className="w-full bg-white border border-brand-border rounded px-3 py-2 text-sm text-brand-text"
              />
            </FormField>
          </div>
        );
      })}
    </div>
  );
}
