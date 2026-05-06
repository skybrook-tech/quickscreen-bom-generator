import type { SchemaField } from "../components/calculator-v3/SchemaDrivenForm";
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
} from "../types/canonical.types";
import { COLOUR_HEX } from "./colourHex";
import {
  computeSegmentRunSettingDeviations,
  type SegmentRunDeviation,
} from "./segmentRunDeviation";
import { slugToLabel } from "./slugLabels";

export interface CollapsedColourSwatch {
  code: string;
  label: string;
  hex: string | null;
}

export interface CollapsedSpecChip {
  id: string;
  chipText: string;
  tooltip: string;
  sortKey: number;
}

export interface CollapsedSegmentSpecsResult {
  colour: CollapsedColourSwatch | null;
  /** Segment colour differs from job+run baseline only (same rule as deviation chips). */
  showColourSwatch: boolean;
  chips: CollapsedSpecChip[];
  showSubRow: boolean;
}

function formatScalar(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/** Resolve human-readable chip text from schema field + stored value. */
export function formatVariableValueForChip(
  field: SchemaField | undefined,
  value: unknown,
): string {
  if (value === undefined || value === null) return "—";
  if (!field) return formatScalar(value);

  if (
    field.control_type === "select" &&
    Array.isArray(field.options_json) &&
    field.options_json.length > 0
  ) {
    const sv = String(value);
    const opt = field.options_json.find((o) => String(o) === sv);
    if (opt !== undefined) return slugToLabel(String(opt));
  }

  if (field.data_type === "number" || field.data_type === "integer") {
    const n = Number(value);
    const u = field.unit ? ` ${field.unit}` : "";
    return `${Number.isFinite(n) ? n : value}${u}`;
  }

  return formatScalar(value);
}

/** Ordering keys aligned with SegmentDetails job fieldset + structural keys. */
const STRUCTURAL_BEFORE_JOB_KEYS = [
  "max_panel_width_mm",
  "post_size",
  "post_width_mm",
] as const;

function structuralOrderIndex(fieldKey: string): number {
  const i = STRUCTURAL_BEFORE_JOB_KEYS.indexOf(
    fieldKey as (typeof STRUCTURAL_BEFORE_JOB_KEYS)[number],
  );
  return i >= 0 ? i : 1000;
}

function jobFieldSortOrder(
  fieldKey: string,
  jobFields: SchemaField[],
): number {
  const f = jobFields.find((x) => x.field_key === fieldKey);
  return f?.sort_order ?? 5000 + fieldKey.charCodeAt(0);
}

function fieldLabel(
  fieldKey: string,
  jobFields: SchemaField[],
  segmentFields: SchemaField[],
): string {
  return (
    segmentFields.find((f) => f.field_key === fieldKey)?.label ??
    jobFields.find((f) => f.field_key === fieldKey)?.label ??
    fieldKey.replace(/_/g, " ")
  );
}

function chipSortKey(
  kind: "variable" | "product",
  fieldKey: string,
  jobFields: SchemaField[],
): number {
  if (kind === "product") return 90000;
  const struct = structuralOrderIndex(fieldKey);
  if (struct < 1000) return struct;
  return 100 + jobFieldSortOrder(fieldKey, jobFields);
}

function groupVariableDeviations(
  deviations: SegmentRunDeviation[],
  jobFields: SchemaField[],
): {
  chips: CollapsedSpecChip[];
  consumedKeys: Set<string>;
} {
  const devByKey = new Map(deviations.map((d) => [d.fieldKey, d]));
  const consumed = new Set<string>();
  const chips: CollapsedSpecChip[] = [];

  const byGroup = new Map<string, SchemaField[]>();
  for (const f of jobFields) {
    const g = f.options_group?.trim();
    if (!g) continue;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(f);
  }

  for (const [, fields] of byGroup) {
    if (fields.length < 2) continue;
    const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);
    const parts: SchemaField[] = [];
    for (const f of sorted) {
      if (devByKey.has(f.field_key)) parts.push(f);
    }
    if (parts.length !== sorted.length || parts.length < 2) continue;

    const texts = parts.map((f) => {
      const v = devByKey.get(f.field_key)!.effectiveValue;
      if (f.data_type === "number" || f.data_type === "integer") {
        const n = Number(v);
        return Number.isFinite(n) ? String(n) : formatScalar(v);
      }
      return formatVariableValueForChip(f, v);
    });
    const chipText = texts.join("/");
    const tooltip = parts.map((f) => f.label).join(" · ");
    const groupKey = sorted[0].options_group?.trim() ?? "grp";
    const minSort = Math.min(
      ...parts.map((f) =>
        chipSortKey("variable", f.field_key, jobFields),
      ),
    );
    chips.push({
      id: `grp:${groupKey}`,
      chipText,
      tooltip,
      sortKey: minSort,
    });
    for (const f of parts) consumed.add(f.field_key);
  }

  return { chips, consumedKeys: consumed };
}

/**
 * Colour swatch + chips only for segment variables that differ from job→run
 * (same basis as {@link computeSegmentRunSettingDeviations}). No height or terminations.
 */
export function buildCollapsedSegmentSpecs(
  payload: CanonicalPayload | null,
  run: CanonicalRun | undefined,
  seg: CanonicalSegment,
  jobFields: SchemaField[],
  segmentFields: SchemaField[],
): CollapsedSegmentSpecsResult {
  const jobVars = payload?.variables ?? {};
  const payloadProductCode = payload?.productCode;

  const deviations = computeSegmentRunSettingDeviations(
    payloadProductCode,
    jobVars,
    run,
    seg,
  );

  const variableDeviations = deviations.filter(
    (d) => d.fieldKey !== "productCode",
  );

  const colourDev = variableDeviations.find((d) => d.fieldKey === "colour_code");
  const colourField = jobFields.find((f) => f.field_key === "colour_code");
  const effectiveColour = colourDev
    ? String(colourDev.effectiveValue ?? "").trim()
    : "";
  const showColourSwatch = Boolean(colourDev && effectiveColour);
  const colour: CollapsedColourSwatch | null = showColourSwatch
    ? {
        code: effectiveColour,
        label: formatVariableValueForChip(colourField, colourDev!.effectiveValue),
        hex: COLOUR_HEX[effectiveColour] ?? null,
      }
    : null;

  const chipSourceDeviations = variableDeviations.filter(
    (d) => d.fieldKey !== "colour_code",
  );

  const chips: CollapsedSpecChip[] = [];

  const { chips: grouped, consumedKeys } = groupVariableDeviations(
    chipSourceDeviations,
    jobFields,
  );
  chips.push(...grouped);

  for (const d of chipSourceDeviations) {
    if (consumedKeys.has(d.fieldKey)) continue;
    const field = jobFields.find((f) => f.field_key === d.fieldKey);
    chips.push({
      id: `var:${d.fieldKey}`,
      chipText: formatVariableValueForChip(field, d.effectiveValue),
      tooltip: field?.label ?? fieldLabel(d.fieldKey, jobFields, segmentFields),
      sortKey: chipSortKey("variable", d.fieldKey, jobFields),
    });
  }

  const pcDev = deviations.find((d) => d.fieldKey === "productCode");
  if (pcDev) {
    chips.push({
      id: "productCode",
      chipText: formatScalar(pcDev.effectiveValue),
      tooltip: "Product code",
      sortKey: chipSortKey("product", "productCode", jobFields),
    });
  }

  chips.sort((a, b) => a.sortKey - b.sortKey || a.id.localeCompare(b.id));

  const showSubRow = showColourSwatch || chips.length > 0;

  return {
    colour,
    showColourSwatch,
    chips,
    showSubRow,
  };
}
