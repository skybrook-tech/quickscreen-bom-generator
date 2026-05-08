import { Check } from "lucide-react";
import { useEffect } from "react";
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
import {
  POST_FIXING_MATERIALS,
  isPreferredGroutSku,
} from "../../lib/postFixingOptions";
import { getPreferredGroutSku, setPreferredGroutSku } from "../../lib/userPrefs";
import { SchemaDrivenForm, type SchemaField } from "./SchemaDrivenForm";
import { colourName } from "./ColourPalette";

interface Props {
  run: CanonicalRun;
}

const HIDDEN_FIELD_KEYS = new Set([
  "left_boundary_type",
  "right_boundary_type",
  "slat_stock_length_mm",
  "rail_stock_length_mm",
  "side_frame_stock_length_mm",
  "louvre_treatment",
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

function fieldValueLabel(field: SchemaField, variables: Record<string, string | number | boolean>) {
  const raw = variables[field.field_key] ?? field.default_value_json;
  if (field.field_key === "colour_code" || field.field_key === "post_colour_code") {
    return colourName(raw);
  }
  if (raw === true) return "Yes";
  if (raw === false) return "No";
  if (raw === undefined || raw === null || raw === "") return "Default";
  return `${raw}${field.unit ? field.unit : ""}`;
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
  const mountingType = String(
    variables.mounting_type ?? variables.mounting_method ?? "in_ground",
  );
  const postFixingSku = isPreferredGroutSku(variables.post_fixing_material_sku)
    ? variables.post_fixing_material_sku
    : getPreferredGroutSku();
  const substrate = String(variables.base_plate_substrate ?? "concrete");
  const slatSize = Number(variables.slat_size_mm ?? 65);
  const louvreEnabled = variables.louvre_treatment === true || variables.louvre_treatment === "true";

  useEffect(() => {
    if (run.variables?.post_fixing_material_sku) return;
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        variables: {
          ...(run.variables ?? {}),
          post_fixing_material_sku: getPreferredGroutSku(),
        },
      },
    });
  }, [dispatch, run]);

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
      if (value === "base_plate" && !nextVariables.base_plate_substrate) {
        nextVariables.base_plate_substrate = "concrete";
      }
      if (value === "in_ground" && !nextVariables.post_fixing_material_sku) {
        nextVariables.post_fixing_material_sku = getPreferredGroutSku();
      }
    }
    if (key === "post_fixing_material_sku" && isPreferredGroutSku(value)) {
      setPreferredGroutSku(value);
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
      "finish_family",
      "slat_size_mm",
      "slat_gap_mm",
      "slat_gap_mode",
      "slat_count",
      "colour_code",
      "post_colour_code",
      "post_size",
      "post_system",
      "mounting_type",
      "mounting_method",
      "max_panel_width_mm",
      "louvre_treatment",
    ]);
    const resetSectionKeys = [
      key,
      ...(key === "target_height_mm" ? ["target_height_mm", "slat_count"] : []),
      ...(key === "colour_code" ? ["colour_code", "post_colour_code"] : []),
      ...(key === "post_system" ? ["post_system", "post_size"] : []),
      ...(key === "mounting_type" || key === "mounting_method" ? ["mounting_type", "mounting_method"] : []),
    ];
    const clearKeys = (vars: Record<string, unknown> | undefined) => {
      const next: Record<string, string | number | boolean> = {};
      for (const [item, value] of Object.entries(vars ?? {})) {
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          next[item] = value;
        }
      }
      for (const item of resetSectionKeys) delete next[item];
      return Object.keys(next).length ? next : undefined;
    };

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
                    ...(clearKeys(segment.variables) ?? {}),
                    [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(movement, nextProductCode === "VS"),
                    [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: Number(normalised.target_height_mm ?? segment.targetHeightMm ?? 1800),
                    [GATE_SEGMENT_STUB_KEYS.colourCode]: String(normalised.colour_code ?? "B"),
                    [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(normalised.slat_size_mm ?? 65),
                    [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(normalised.slat_gap_mm ?? 9),
                    [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(normalised.post_size ?? 50),
                  },
                };
              }
              return {
                ...segment,
                targetHeightMm: Number(normalised.target_height_mm ?? segment.targetHeightMm ?? 1800),
                variables: clearKeys(segment.variables),
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
        segments: run.segments
          .filter((segment) => nextProductCode !== "BAYG" || segment.segmentKind !== "gate_opening")
          .map((segment) => ({
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
                : {
                    ...(segment.variables ?? {}),
                    ...(nextProductCode === "BAYG" && segment.variables?.panel_quantity == null
                      ? { panel_quantity: 1 }
                      : {}),
                  },
          })),
      },
    });
  }

  return (
    <div className="mb-3 space-y-2 rounded-2xl border border-brand-border/70 bg-brand-bg/55 p-3">
      <p className="text-xs font-semibold text-brand-muted">
        Sections inherit these settings unless overridden.
      </p>
      <details className="rounded-xl border border-brand-border/60 bg-brand-card/70">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-extrabold text-brand-text">
          <span>System type</span>
          <span className="rounded-full bg-brand-primary px-3 py-1 text-xs text-white">
            {run.productCode}
          </span>
        </summary>
        <div className="flex flex-wrap gap-2 border-t border-brand-border/50 p-3">
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
      </details>
      <div className="grid gap-2">
        {fields.map((field) => (
          <details
            key={`${field.id}-${field.field_key}`}
            className="rounded-xl border border-brand-border/60 bg-brand-card/70"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-extrabold text-brand-text">
              <span>{field.label}</span>
              <span className="max-w-[12rem] truncate rounded-full bg-brand-bg px-3 py-1 text-xs font-bold text-brand-muted">
                {fieldValueLabel(field, variables)}
              </span>
            </summary>
            <div className="border-t border-brand-border/50 p-3">
              <SchemaDrivenForm fields={[field]} variables={variables} onChange={updateRunVariables} />
            </div>
          </details>
        ))}
      </div>
      {productCode !== "BAYG" && (
      <div className="mt-3 grid gap-3 rounded-2xl border border-brand-border/60 bg-brand-card/70 p-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-brand-muted">Post-fixing material</span>
          <select
            value={postFixingSku}
            onChange={(event) =>
              updateRunVariables("post_fixing_material_sku", event.target.value)
            }
            className="rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          >
            {POST_FIXING_MATERIALS.map((item) => (
              <option key={item.sku} value={item.sku}>
                {item.label}
              </option>
            ))}
          </select>
          <span className="text-xs font-semibold text-brand-muted">
            Used for concreted-in posts at 1.5 bags per post.
          </span>
        </label>

        {productCode === "QSHS" && (
          <label className="flex items-start gap-3 rounded-xl border border-brand-border/60 bg-brand-bg/50 p-3">
            <input
              type="checkbox"
              checked={louvreEnabled && slatSize === 65}
              disabled={slatSize !== 65}
              onChange={(event) =>
                updateRunVariables("louvre_treatment", event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
            />
            <span>
              <span className="block text-sm font-extrabold text-brand-text">
                Louvre treatment
              </span>
              <span className="mt-1 block text-xs font-semibold text-brand-muted">
                40 degree slat angle. Available with 65mm slats.
              </span>
              {slatSize !== 65 && (
                <span className="mt-1 block text-xs font-bold text-brand-warning">
                  Switch run slats to 65mm to use louvre brackets.
                </span>
              )}
            </span>
          </label>
        )}

        {mountingType === "base_plate" && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-brand-muted">Substrate</span>
            <select
              value={substrate}
              onChange={(event) =>
                updateRunVariables("base_plate_substrate", event.target.value)
              }
              className="rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
            >
              <option value="concrete">Concrete</option>
              <option value="timber">Timber</option>
            </select>
            <span className="text-xs font-semibold text-brand-muted">
              Selects the fixing kit for each base-plated post.
            </span>
          </label>
        )}
      </div>
      )}
    </div>
  );
}
