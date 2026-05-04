import { useEffect, useMemo, useState } from "react";
import { cn } from "../../../lib";
import { useColourOptions } from "../../../hooks/useColourOptions";
import {
  isVisible,
  type SchemaField,
} from "../../calculator-v3/SchemaDrivenForm";
import { Segmented } from "../../ui/Segmented";
import { ColourSwatches } from "../../ui/ColourSwatches";

/** Matches `Input.tsx` surfaces: `bg-white dark:bg-brand-card` + `border-brand-border`. */
const CONTROL_CLASS = cn(
  "w-full px-3 py-2 rounded-lg bg-white dark:bg-brand-card",
  "border border-brand-border text-sm text-brand-text",
  "focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none",
);

const CONTROL_MONO_CLASS = cn(CONTROL_CLASS, "font-mono tabular-nums");

const CUSTOM_GAP_SEG_VALUE = "custom";
/** Allow arbitrary mm; BOM spacer SKU mapping may still assume standard gaps. */
const CUSTOM_GAP_MIN_MM = 0;
const CUSTOM_GAP_MAX_MM = 40;

function firstGapMmNotInPresets(presetNums: number[]): number {
  for (let g = CUSTOM_GAP_MIN_MM; g <= CUSTOM_GAP_MAX_MM; g++) {
    if (!presetNums.includes(g)) return g;
  }
  return 7;
}

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
      <p className="text-xs text-brand-muted italic">
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
    field.field_key === "slat_gap_mm" &&
    field.control_type === "select" &&
    Array.isArray(field.options_json) &&
    field.options_json.length > 0
  ) {
    return (
      <SlatGapControl
        field={field}
        variables={variables}
        onChange={onChange}
      />
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
          className={cn(CONTROL_CLASS, "appearance-auto")}
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
          className={CONTROL_MONO_CLASS}
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
        <label className="text-sm font-medium text-brand-text">
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
        className={CONTROL_CLASS}
      />
    </FieldWrap>
  );
}

function SlatGapControl({
  field,
  variables,
  onChange,
}: {
  field: SchemaField;
  variables: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
}) {
  const presetNums = useMemo(
    () =>
      field.options_json.map((o) => Number(o)).filter((n) => Number.isFinite(n)),
    [field.options_json],
  );

  const raw = variables[field.field_key];
  const num =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw)
        : Number(field.default_value_json ?? 0);

  const inPresets = presetNums.includes(num);
  const [customMode, setCustomMode] = useState(!inPresets);

  const gapFromVars = variables[field.field_key];
  useEffect(() => {
    const n = Number(gapFromVars);
    if (!Number.isFinite(n)) return;
    setCustomMode(!presetNums.includes(n));
  }, [gapFromVars, presetNums]);

  const segmentedValue = customMode ? CUSTOM_GAP_SEG_VALUE : String(num);

  function applyPreset(presetMm: number) {
    setCustomMode(false);
    onChange(
      field.field_key,
      field.data_type === "integer" ? Math.round(presetMm) : presetMm,
    );
  }

  function applyCustomMm(mm: number) {
    const clamped = Math.min(
      CUSTOM_GAP_MAX_MM,
      Math.max(CUSTOM_GAP_MIN_MM, Math.round(mm)),
    );
    setCustomMode(true);
    onChange(field.field_key, clamped);
  }

  return (
    <FieldWrap label={field.label} testId={field.field_key} unit={field.unit}>
      <div className="space-y-2">
        <Segmented
          value={segmentedValue}
          onChange={(v) => {
            if (v === CUSTOM_GAP_SEG_VALUE) {
              if (presetNums.includes(num)) {
                applyCustomMm(firstGapMmNotInPresets(presetNums));
              } else {
                setCustomMode(true);
              }
              return;
            }
            applyPreset(Number(v));
          }}
          options={[
            ...presetNums.map((p) => ({
              value: String(p),
              label: String(p),
            })),
            { value: CUSTOM_GAP_SEG_VALUE, label: "Custom" },
          ]}
          size="sm"
        />
        {customMode && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={CUSTOM_GAP_MIN_MM}
              max={CUSTOM_GAP_MAX_MM}
              step={1}
              value={Number.isFinite(num) ? num : 0}
              onChange={(e) => applyCustomMm(Number(e.target.value))}
              className={cn(CONTROL_MONO_CLASS, "w-28")}
              aria-label="Custom slat gap mm"
            />
            <span className="text-xs text-brand-muted">mm</span>
          </div>
        )}
      </div>
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
      <label className="block text-[11px] font-medium uppercase tracking-wider text-brand-muted">
        {label}
        {unit && (
          <span className="ml-1 normal-case tracking-normal text-brand-muted">
            ({unit})
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
