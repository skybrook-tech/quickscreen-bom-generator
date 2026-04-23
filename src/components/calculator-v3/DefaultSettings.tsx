import { useEffect } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import { useProductVariables } from "../../hooks/useProductVariables";
import { ColourSelect } from "../fence/ColourSelect";
import { SlatSizeSelect } from "../fence/SlatSizeSelect";
import { SlatGapSelect } from "../fence/SlatGapSelect";
import { FormField } from "../shared/FormField";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { isVisible, type SchemaField } from "./SchemaDrivenForm";

// Static lookup — avoids Tailwind purge issues from dynamic string interpolation
const SM_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

function getGridCols(count: number): number {
  if (count <= 3) return count;
  if (count === 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

function renderField(
  field: SchemaField,
  variables: Record<string, string | number | boolean>,
  onChange: (key: string, value: string | number | boolean) => void,
) {
  if (field.field_key === "colour_code") {
    return (
      <FormField key={field.id} label={field.label}>
        <ColourSelect
          value={String(variables[field.field_key] ?? "")}
          onChange={(e) => onChange(field.field_key, e.target.value)}
          className="w-full bg-white border border-brand-border rounded px-3 py-2 text-sm text-brand-text"
          data-testid={field.field_key}
        />
      </FormField>
    );
  }

  if (field.field_key === "slat_size_mm") {
    return (
      <FormField
        key={field.id}
        label={field.label}
        note={field.unit ? `Units: ${field.unit}` : undefined}
      >
        <SlatSizeSelect
          value={String(variables[field.field_key] ?? "65")}
          onChange={(e) => onChange(field.field_key, Number(e.target.value))}
          className="w-full bg-white border border-brand-border rounded px-3 py-2 text-sm text-brand-text"
          data-testid={field.field_key}
        />
      </FormField>
    );
  }

  if (field.field_key === "slat_gap_mm") {
    return (
      <FormField
        key={field.id}
        label={field.label}
        note={field.unit ? `Units: ${field.unit}` : undefined}
      >
        <SlatGapSelect
          value={String(variables[field.field_key] ?? "5")}
          onChange={(e) => onChange(field.field_key, Number(e.target.value))}
          className="w-full bg-white border border-brand-border rounded px-3 py-2 text-sm text-brand-text"
          data-testid={field.field_key}
        />
      </FormField>
    );
  }

  if (
    field.control_type === "select" &&
    Array.isArray(field.options_json) &&
    field.options_json.length > 0
  ) {
    return (
      <FormField
        key={field.id}
        label={field.label}
        note={field.unit ? `Units: ${field.unit}` : undefined}
      >
        <Select
          value={String(variables[field.field_key] ?? "")}
          onChange={(e) => onChange(field.field_key, e.target.value)}
          className="w-full"
          data-testid={field.field_key}
        >
          {field.options_json.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </Select>
      </FormField>
    );
  }

  if (field.control_type === "number") {
    return (
      <FormField
        key={field.id}
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
          data-testid={field.field_key}
        />
      </FormField>
    );
  }

  if (field.control_type === "toggle") {
    return (
      <div
        key={field.id}
        className="flex items-center gap-3 pt-5"
        data-testid={field.field_key}
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
    <FormField
      key={field.id}
      label={field.label}
      note={field.unit ? `Units: ${field.unit}` : undefined}
    >
      <Input
        type="text"
        value={String(variables[field.field_key] ?? "")}
        onChange={(e) => onChange(field.field_key, e.target.value)}
        className="w-full"
        data-testid={field.field_key}
      />
    </FormField>
  );
}

export function DefaultSettings() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload!;

  const { data: jobFields = [] } = useProductVariables(
    payload.productCode,
    "job",
  );

  // Seed payload.variables with product_variables defaults for any key not yet set.
  // Runs once per product selection so user edits are never overwritten.
  useEffect(() => {
    if (jobFields.length === 0) return;
    const missing: Record<string, string | number | boolean> = {};
    for (const f of jobFields) {
      if (!(f.field_key in payload.variables) && f.default_value_json != null) {
        missing[f.field_key] = f.default_value_json as string | number | boolean;
      }
    }
    if (Object.keys(missing).length === 0) return;
    dispatch({
      type: "SET_PAYLOAD",
      payload: {
        ...payload,
        variables: { ...missing, ...payload.variables },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobFields, payload.productCode]);

  function handleFieldChange(key: string, value: string | number | boolean) {
    dispatch({
      type: "SET_PAYLOAD",
      payload: {
        ...payload,
        variables: { ...payload.variables, [key]: value },
      },
    });
  }

  // Filter to visible fields, excluding max_panel_width_mm (rendered as the universal field)
  const visibleJobFields = jobFields.filter(
    (f) =>
      f.field_key !== "max_panel_width_mm" &&
      isVisible(f.visible_when_json ?? {}, payload.variables),
  );

  const visibleCount = 1 + visibleJobFields.length;
  const cols = getGridCols(visibleCount);
  const gridClass = `grid grid-cols-1 ${SM_COLS[cols] ?? "sm:grid-cols-3"} gap-4`;

  return (
    <div className={gridClass}>
      {/* Universal field — applies to all fence products */}
      <FormField
        label="Max panel width"
        note="300–2600mm · panels split evenly to stay at or below this width"
      >
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={300}
            max={2600}
            step={50}
            value={Number(payload.variables.max_panel_width_mm ?? 2600)}
            onChange={(e) =>
              handleFieldChange("max_panel_width_mm", Number(e.target.value))
            }
            onBlur={(e) =>
              handleFieldChange(
                "max_panel_width_mm",
                Math.min(2600, Math.max(300, Number(e.target.value))),
              )
            }
            className="w-full"
            data-testid="max_panel_width_mm"
          />
          <span className="text-sm text-brand-muted shrink-0">mm</span>
        </div>
      </FormField>

      {/* Schema-driven job fields */}
      {visibleJobFields.map((field) =>
        renderField(field, payload.variables, handleFieldChange),
      )}
    </div>
  );
}
