import { useEffect, useMemo, useState } from "react";
import {
  useColourOptions,
  type ColourOption as ColourRow,
} from "../../../hooks/useColourOptions";
import {
  isVisible,
  type SchemaField,
} from "../../calculator-v3/SchemaDrivenForm";
import { POST_TYPE_LABELS } from "../../../lib/productOptionRules";
import { Segmented } from "../../ui/Segmented";
import {
  ColourPicker,
  type ColourPickerOption,
} from "../../ui/ColourPicker";

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
  const postColourField = visibleFields.find(
    (f) => f.field_key === "post_colour_code",
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
      {visibleFields
        .filter((field) => field.field_key !== "post_colour_code")
        .map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          variables={variables}
          onChange={onChange}
          colourRows={allColours}
          allowedColourRows={allowedColours}
          postColourField={postColourField}
        />
      ))}
    </div>
  );
}

interface FieldRendererProps {
  field: SchemaField;
  variables: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
  colourRows: ColourRow[];
  allowedColourRows: ColourRow[];
  postColourField?: SchemaField;
}

function FieldRenderer({
  field,
  variables,
  onChange,
  colourRows,
  allowedColourRows,
  postColourField,
}: FieldRendererProps) {
  if (field.field_key === "colour_code") {
    return (
      <FieldWrap label={field.label} testId={field.field_key}>
        <ColourControls
          colourField={field}
          postColourField={postColourField}
          variables={variables}
          onChange={onChange}
          colourRows={colourRows}
          allowedColourRows={allowedColourRows}
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
              label:
                field.field_key === "post_size"
                  ? (POST_TYPE_LABELS[String(opt)] ?? String(opt))
                  : String(opt),
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
          className="w-full px-3 py-2 rounded-lg border border-brand-border text-sm text-brand-text font-mono tabular-nums focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none"
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

function codeForValue(value: string, colourRows: ColourRow[]) {
  const row = colourRows.find(
    (c) => c.value === value || c.short_code === value,
  );
  return row?.short_code ?? value;
}

function colourOptionsFromField(
  field: SchemaField | undefined,
  fallbackRows: ColourRow[],
  allRows: ColourRow[],
): ColourPickerOption[] {
  const rawOptions = Array.isArray(field?.options_json)
    ? field.options_json.map(String)
    : [];
  const sourceRows =
    rawOptions.length > 0
      ? rawOptions
          .map((value) =>
            allRows.find((c) => c.value === value || c.short_code === value),
          )
          .filter((row): row is ColourRow => Boolean(row))
      : fallbackRows;

  return sourceRows.map((row) => ({
    value: row.short_code,
    code: row.short_code,
    label: row.label,
    limited: row.limited,
  }));
}

function ColourControls({
  colourField,
  postColourField,
  variables,
  onChange,
  colourRows,
  allowedColourRows,
}: {
  colourField: SchemaField;
  postColourField?: SchemaField;
  variables: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
  colourRows: ColourRow[];
  allowedColourRows: ColourRow[];
}) {
  const colourValue = codeForValue(
    String(variables[colourField.field_key] ?? ""),
    colourRows,
  );
  const postColourValue = codeForValue(
    String(variables.post_colour_code ?? colourValue),
    colourRows,
  );
  const postColourDifferent = postColourValue !== colourValue;

  const colourOptions = colourOptionsFromField(
    colourField,
    allowedColourRows,
    colourRows,
  );
  const postColourOptions = colourOptionsFromField(
    postColourField,
    colourRows,
    colourRows,
  );

  function setFenceColour(value: string) {
    onChange(colourField.field_key, value);
    if (!postColourDifferent && postColourField) {
      onChange(postColourField.field_key, value);
    }
  }

  function togglePostColour(different: boolean) {
    if (!postColourField) return;
    const nextPostColour = different
      ? (postColourOptions.find((option) => option.code !== colourValue)?.code ??
        postColourValue)
      : colourValue;
    onChange(postColourField.field_key, nextPostColour);
  }

  return (
    <div className="space-y-3">
      <ColourPicker
        value={colourValue}
        onChange={setFenceColour}
        options={colourOptions}
      />

      {postColourField && (
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-brand-muted">
            <input
              type="checkbox"
              checked={postColourDifferent}
              onChange={(e) => togglePostColour(e.target.checked)}
              className="rounded border-brand-border text-brand-accent focus:ring-brand-accent/40"
            />
            Different colour for posts?
          </label>

          {postColourDifferent && (
            <div className="rounded-lg border border-brand-border/70 bg-brand-bg/40 p-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Post colour
              </div>
              <ColourPicker
                value={postColourValue}
                onChange={(value) => onChange(postColourField.field_key, value)}
                options={postColourOptions}
              />
            </div>
          )}
        </div>
      )}
    </div>
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
              className="w-28 px-3 py-2 rounded-lg border border-brand-border text-sm text-brand-text font-mono tabular-nums focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none"
              aria-label="Custom slat gap mm"
            />
            <span className="text-xs text-neutral-500">mm</span>
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
