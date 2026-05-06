import { Check } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import { useProductVariables } from "../../hooks/useProductVariables";
import type { CanonicalRun } from "../../types/canonical.types";
import { defaultGateBuildForMovement, gateMovementOrDefault } from "../../lib/gateOptionRules";
import {
  applyProductOptionRules,
  initialVariablesForSystem,
  maxPanelWidthForSystem,
  normaliseVariablesForSystem,
} from "../../lib/productOptionRules";
import { GATE_SEGMENT_STUB_KEYS } from "../../lib/segmentTermination";
import { localFenceProducts } from "../../lib/localSeedData";
import { SchemaDrivenForm, type SchemaField } from "./SchemaDrivenForm";

interface Props {
  run: CanonicalRun;
}

const HIDDEN_FIELD_KEYS = new Set([
  "left_boundary_type",
  "right_boundary_type",
  "slat_stock_length_mm",
  "rail_stock_length_mm",
  "side_frame_stock_length_mm",
]);

function shapeRunField(field: SchemaField, productCode: string): SchemaField | null {
  if (HIDDEN_FIELD_KEYS.has(field.field_key)) return null;
  if (
    field.field_key === "mounting_method" &&
    field.label.toLowerCase().includes("mounting")
  ) {
    return {
      ...field,
      label: "Post mounting type",
      default_value_json: "in_ground",
      options_json: ["in_ground", "base_plate", "core_drill"],
    };
  }
  if (field.field_key === "mounting_type") {
    return {
      ...field,
      label: "Post mounting type",
      default_value_json: "in_ground",
      options_json: ["in_ground", "base_plate", "core_drill"],
    };
  }
  if (field.field_key === "post_system") {
    return {
      ...field,
      label: "Post type",
      default_value_json: productCode === "XPL" ? "xpl" : "standard_50",
    };
  }
  if (field.field_key === "post_size") {
    return {
      ...field,
      label: "Standard post size",
      default_value_json: "50",
    };
  }
  if (field.field_key === "max_panel_width_mm") {
    return {
      ...field,
      label: "Max Post Spacing",
      default_value_json: 2600,
    };
  }
  return field;
}

export function RunSettingsEditor({ run }: Props) {
  const { state, dispatch } = useCalculator();
  const productCode = run.productCode;
  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  const { data: runFields = [] } = useProductVariables(productCode, "run");
  const variables = {
    ...(state.payload?.variables ?? {}),
    ...(run.variables ?? {}),
  } as Record<string, string | number | boolean>;

  const fields = applyProductOptionRules(
    productCode,
    [
      ...jobFields.filter((field) => !HIDDEN_FIELD_KEYS.has(field.field_key)),
      ...runFields
        .map((field) => shapeRunField(field, productCode))
        .filter((field): field is SchemaField => Boolean(field)),
    ],
    variables,
  );

  function updateRunVariables(
    key: string,
    value: string | number | boolean,
    nextProductCode = productCode,
  ) {
    const previousColour = String(variables.colour_code ?? "");
    const previousPostColour = String(variables.post_colour_code ?? previousColour);
    const nextVariables: Record<string, string | number | boolean> = {
      ...(run.variables ?? {}),
      [key]: value,
    };
    if (key === "mounting_type" || key === "mounting_method") {
      nextVariables.mounting_type = value;
      nextVariables.mounting_method = value;
    }
    if (key === "post_system") {
      nextVariables.post_size = value === "standard_65" ? 65 : 50;
    }
    if (key === "colour_code" && (!run.variables?.post_colour_code || previousPostColour === previousColour)) {
      nextVariables.post_colour_code = value;
    }
    if (key === "target_height_mm") {
      delete nextVariables.slat_count;
    }
    const normalised = normaliseVariablesForSystem(nextProductCode, nextVariables);
    const syncKeys = new Set([
      "target_height_mm",
      "slat_size_mm",
      "slat_gap_mm",
      "slat_gap_mode",
      "slat_count",
      "colour_code",
      "post_colour_code",
      "post_size",
      "post_system",
    ]);

    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        productCode: nextProductCode,
        variables: normalised,
        segments: syncKeys.has(key)
          ? run.segments.map((segment) => {
              if (segment.segmentKind === "gate_opening") {
                const movement = gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
                return {
                  ...segment,
                  targetHeightMm: Number(normalised.target_height_mm ?? segment.targetHeightMm ?? 1800),
                  variables: {
                    ...(segment.variables ?? {}),
                    [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(movement, nextProductCode === "VS"),
                    [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: Number(normalised.target_height_mm ?? segment.targetHeightMm ?? 1800),
                    [GATE_SEGMENT_STUB_KEYS.colourCode]: String(normalised.colour_code ?? "B"),
                    [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(normalised.slat_size_mm ?? 65),
                    [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(normalised.slat_gap_mm ?? 9),
                    [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(normalised.post_size ?? 50),
                  },
                };
              }
              if (segment.variables?.target_height_mm !== undefined) return segment;
              return {
                ...segment,
                targetHeightMm: Number(normalised.target_height_mm ?? segment.targetHeightMm ?? 1800),
              };
            })
          : run.segments,
      },
    });
  }

  function changeRunProduct(nextProductCode: string) {
    const nextVariables = normaliseVariablesForSystem(nextProductCode, {
      ...initialVariablesForSystem(nextProductCode),
      ...variables,
      max_panel_width_mm: variables.max_panel_width_mm ?? maxPanelWidthForSystem(nextProductCode),
    });
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        productCode: nextProductCode,
        variables: nextVariables,
        segments: run.segments.map((segment) => ({
          ...segment,
          targetHeightMm: Number(nextVariables.target_height_mm ?? segment.targetHeightMm ?? 1800),
          variables:
            segment.segmentKind === "gate_opening"
              ? {
                  ...(segment.variables ?? {}),
                  [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(
                    gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]),
                    nextProductCode === "VS",
                  ),
                  [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: Number(nextVariables.target_height_mm ?? segment.targetHeightMm ?? 1800),
                  [GATE_SEGMENT_STUB_KEYS.colourCode]: String(nextVariables.colour_code ?? "B"),
                  [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(nextVariables.slat_size_mm ?? 65),
                  [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(nextVariables.slat_gap_mm ?? 9),
                  [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(nextVariables.post_size ?? 50),
                }
              : segment.variables,
        })),
      },
    });
  }

  return (
    <div className="mb-3 rounded-2xl border border-brand-border/70 bg-brand-bg/55 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-muted">
          Run Settings
        </p>
        <span className="text-xs font-semibold text-brand-muted">
          Sections inherit these settings unless overridden.
        </span>
      </div>
      <div className="mb-3">
        <p className="mb-2 text-sm font-bold text-brand-muted">System type</p>
        <div className="flex flex-wrap gap-2">
          {localFenceProducts.map((product) => (
            <button
              key={product.system_type}
              type="button"
              onClick={() => changeRunProduct(product.system_type)}
              aria-pressed={product.system_type === run.productCode}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                product.system_type === run.productCode
                  ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                  : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
              }`}
            >
              {product.system_type === run.productCode && <Check size={16} aria-hidden />}
              {product.system_type}
            </button>
          ))}
        </div>
      </div>
      <SchemaDrivenForm fields={fields} variables={variables} onChange={updateRunVariables} />
    </div>
  );
}
