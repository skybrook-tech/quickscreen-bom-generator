import { useColourOptions } from "../../../hooks/useColourOptions";
import {
  isVisible,
  type SchemaField,
} from "../../calculator-v3/SchemaDrivenForm";
import { Segmented } from "../../ui/Segmented";
import { ColourSwatches } from "../../ui/ColourSwatches";

interface Props {
  fields: SchemaField[];
  variables: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
}

export function SchemaDrivenFormV4({ fields, variables, onChange }: Props) {
  const { data: allColours = [] } = useColourOptions();

  const finishType = variables["finish_type"] as string | undefined;
  const allowedColours = allColours.filter((c) =>
    !finishType || finishType === "standard"
      ? c.finish_group === "standard"
      : c.finish_group === finishType,
  );

  const visibleFields = fields.filter((f) =>
    isVisible(f.visible_when_json ?? {}, variables),
  );

  if (visibleFields.length === 0) {
    return (
      <p className="text-xs text-neutral-500 italic">
        No configurable fields for this product.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visibleFields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          variables={variables}
          onChange={onChange}
          allowedColours={allowedColours.map((c) => ({
            value: c.value,
            label: c.label,
          }))}
        />
      ))}
    </div>
  );
}

interface FieldRendererProps {
  field: SchemaField;
  variables: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
  allowedColours: { value: string; label: string }[];
}

function FieldRenderer({
  field,
  variables,
  onChange,
  allowedColours,
}: FieldRendererProps) {
  if (field.field_key === "colour_code") {
    return (
      <FieldWrap label={field.label} testId={field.field_key}>
        <ColourSwatches
          value={String(variables[field.field_key] ?? "")}
          onChange={(v) => onChange(field.field_key, v)}
          colours={allowedColours}
        />
      </FieldWrap>
    );
  }

  if (
    field.control_type === "select" &&
    Array.isArray(field.options_json) &&
    field.options_json.length > 0
  ) {
    if (field.options_json.length === 1) return null;

    // ≤ 5 options → Segmented control; > 5 → native select
    if (field.options_json.length <= 9) {
      return (
        <FieldWrap
          label={field.label}
          testId={field.field_key}
          unit={field.unit}
        >
          <Segmented
            value={String(variables[field.field_key] ?? "")}
            onChange={(v) => onChange(field.field_key, v)}
            options={field.options_json.map((opt) => ({
              value: String(opt),
              label: String(opt),
            }))}
            size="sm"
          />
        </FieldWrap>
      );
    }

    return (
      <FieldWrap label={field.label} testId={field.field_key} unit={field.unit}>
        <select
          value={String(variables[field.field_key] ?? "")}
          onChange={(e) => onChange(field.field_key, e.target.value)}
          className="w-full px-3 py-2 rounded-lg  border border-neutral-700 text-sm text-neutral-100 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none"
        >
          {field.options_json.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </FieldWrap>
    );
  }

  if (field.control_type === "number") {
    return (
      <FieldWrap label={field.label} testId={field.field_key} unit={field.unit}>
        <input
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
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 font-mono tabular-nums focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none"
        />
      </FieldWrap>
    );
  }

  if (field.control_type === "toggle") {
    return (
      <div
        data-testid={field.field_key}
        className="flex items-center gap-3 pt-5"
      >
        <input
          type="checkbox"
          checked={Boolean(variables[field.field_key])}
          onChange={(e) => onChange(field.field_key, e.target.checked)}
          className="rounded"
        />
        <label className="text-sm font-medium text-neutral-300">
          {field.label}
        </label>
      </div>
    );
  }

  return (
    <FieldWrap label={field.label} testId={field.field_key} unit={field.unit}>
      <input
        type="text"
        value={String(variables[field.field_key] ?? "")}
        onChange={(e) => onChange(field.field_key, e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none"
      />
    </FieldWrap>
  );
}

interface FieldWrapProps {
  label: string;
  testId: string;
  unit?: string;
  children: React.ReactNode;
}

function FieldWrap({ label, testId, unit, children }: FieldWrapProps) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
        {unit && (
          <span className="ml-1 normal-case tracking-normal text-neutral-600">
            ({unit})
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
