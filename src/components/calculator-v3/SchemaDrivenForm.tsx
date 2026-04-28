import { ColourSelect } from "../fence/ColourSelect";
import { FormField } from "../shared/FormField";
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { useColourOptions } from "../../hooks/useColourOptions";

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
  options_group?: string | null;
  visible_when_json: Record<string, unknown>;
  sort_order: number;
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

// Every field wraps in a 1/3-width flex item on desktop, full-width on mobile.
// Extendable later with per-field `width` hints; intentionally simple for now.
const FIELD_WRAPPER = "w-full md:w-[calc(33.333%-0.6667rem)]";

export function SchemaDrivenForm({
  fields,
  onChange,
  variables,
}: SchemaDrivenFormProps) {
  const { data: allColours = [] } = useColourOptions();

  const finishType = variables["finish_type"] as string | undefined;
  const allowedColours = allColours
    .filter((c) =>
      !finishType || finishType === "standard"
        ? c.finish_group === "standard"
        : c.finish_group === finishType,
    );

  return (
    <div className="flex flex-wrap gap-4">
      {fields.map((field) => {
        if (!isVisible(field.visible_when_json ?? {}, variables)) return null;

        if (field.field_key === "colour_code") {
          const opts = field.options_group === "colours"
            ? allowedColours
            : Array.isArray(field.options_json) && field.options_json.length > 0
              ? (field.options_json as string[]).map((v) => {
                  const found = allColours.find((c) => c.value === v);
                  return found ?? { value: v, label: v, limited: false };
                })
              : allowedColours;
          return (
            <div
              key={field.id}
              data-testid={field.field_key}
              className={FIELD_WRAPPER}
            >
              <FormField label={field.label}>
                <ColourSelect
                  value={String(variables[field.field_key] ?? "")}
                  onChange={(e) => onChange(field.field_key, e.target.value)}
                  options={opts}
                  className="w-full bg-white border border-brand-border rounded px-3 py-2 text-sm text-brand-text"
                />
              </FormField>
            </div>
          );
        }

        if (
          field.control_type === "select" &&
          Array.isArray(field.options_json) &&
          field.options_json.length > 0
        ) {
          // Skip single-option selects (e.g. gates with finish_type=["standard"])
          if (field.options_json.length === 1) return null;
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
                <Select
                  value={String(variables[field.field_key] ?? "")}
                  onChange={(e) => onChange(field.field_key, e.target.value)}
                  className="w-full"
                >
                  {field.options_json.map((opt) => (
                    <option key={String(opt)} value={String(opt)}>
                      {String(opt)}
                    </option>
                  ))}
                </Select>
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
                <Input
                  type="number"
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
                  className="w-full"
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
              <Input
                type="text"
                value={String(variables[field.field_key] ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                className="w-full"
              />
            </FormField>
          </div>
        );
      })}
    </div>
  );
}
