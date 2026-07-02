import { Check, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import { useCalculatorConfig } from "../../hooks/useCalculatorConfig";
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
import { defaultVariablesFromFields } from "../../hooks/useProductVariables";
import { isPreferredGroutSku } from "../../lib/postFixingOptions";
import { getPreferredGroutSku, setPreferredGroutSku } from "../../lib/userPrefs";
import { SchemaDrivenForm, valueLabel, type SchemaField } from "./SchemaDrivenForm";
import { colourName } from "./ColourPalette";
import { SettingsDisclosureRow } from "./SettingsDisclosureRow";
import { combinedGapLabel, normaliseGapMode } from "../../lib/gapChoices";

interface Props {
  run: CanonicalRun;
  onCollapse?: () => void;
}

const HIDDEN_FIELD_KEYS = new Set([
  "target_height_mm",
  "slat_stock_length_mm",
  "rail_stock_length_mm",
  "side_frame_stock_length_mm",
]);

function fieldValueLabel(field: SchemaField, variables: Record<string, string | number | boolean>) {
  const raw = variables[field.field_key] ?? field.default_value_json;
  if (field.field_key === "colour_code" || field.field_key === "post_colour_code") {
    return colourName(raw);
  }
  if (raw === true) return "Yes";
  if (raw === false) return "No";
  return valueLabel(field, raw);
}

function postLabel(productCode: string, variables: Record<string, string | number | boolean>) {
  const postSystem = String(variables.post_system ?? (productCode === "XPL" ? "xpl" : "standard_50"));
  if (postSystem === "xpl") return "XPress Plus post";
  if (postSystem === "standard_65" || Number(variables.post_size ?? 50) === 65) return "65mm Post Standard HD";
  return "50mm Post Standard";
}

export function RunSettingsEditor({ run, onCollapse }: Props) {
  const { state, dispatch } = useCalculator();
  const [postColourOpen, setPostColourOpen] = useState(() => {
    const colour = String(run.variables?.colour_code ?? "B");
    return Boolean(run.variables?.post_colour_code && run.variables.post_colour_code !== colour);
  });
  const productCode = run.productCode;
  const config = useCalculatorConfig(productCode);
  // Needed by changeRunProduct() below when switching TO BAYG — segment
  // defaults (panel_quantity) live under BAYG's config regardless of which
  // product is currently active, so fetch it unconditionally (cheap: shares
  // the same TanStack cache key RunCard already warms).
  const baygConfig = useCalculatorConfig("BAYG");
  const variables = {
    ...(state.payload?.variables ?? {}),
    ...(run.variables ?? {}),
  } as Record<string, string | number | boolean>;

  const fields = applyProductOptionRules(
    productCode,
    [
      ...config.formFields.job.filter((field) => !HIDDEN_FIELD_KEYS.has(field.field_key)),
      ...config.formFields.run.filter((field) => !HIDDEN_FIELD_KEYS.has(field.field_key)),
    ],
    variables,
  );
  const gapMode = normaliseGapMode(productCode, variables.slat_gap_mode);
  const gapMm = Number(variables.slat_gap_mm ?? 9);
  const fieldMap = useMemo(() => new Map(fields.map((field) => [field.field_key, field])), [fields]);
  const mountingField = fieldMap.get("mounting_type") ?? fieldMap.get("mounting_method");
  const showPostColourControl = productCode !== "BAYG" && fieldMap.has("post_colour_code");

  function patchRunVariables(patch: Record<string, string | number | boolean | null | undefined>) {
    const entries = Object.entries(patch).filter(
      (entry): entry is [string, string | number | boolean] => entry[1] !== null && entry[1] !== undefined,
    );
    if (entries.length === 0) return;
    const [[firstKey, firstValue], ...rest] = entries;
    updateRunVariables(firstKey, firstValue, productCode, Object.fromEntries(rest));
  }

  function renderField(key: string) {
    const field = fieldMap.get(key);
    if (!field) return null;
    return (
      <SchemaDrivenForm
        fields={[field]}
        variables={variables}
        onChange={updateRunVariables}
        onPatch={patchRunVariables}
        extra={{ productCode, postFixingMaterials: config.postFixingMaterials }}
      />
    );
  }

  function valueFor(key: string, fallback = "Default") {
    const field = fieldMap.get(key);
    return field ? fieldValueLabel(field, variables) : fallback;
  }

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
    extraVariables: Record<string, string | number | boolean> = {},
  ) {
    const previousColour = String(variables.colour_code ?? "");
    const previousPostColour = String(variables.post_colour_code ?? previousColour);
    const nextVariables: Record<string, string | number | boolean> = {
      ...(run.variables ?? {}),
      [key]: value,
      ...extraVariables,
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
    if (key === "post_fixing_material_sku" && isPreferredGroutSku(value, config.postFixingMaterials)) {
      setPreferredGroutSku(value);
    }
    if (key === "post_system") {
      nextVariables.post_size = value === "standard_65" ? 65 : 50;
    }
    if (key === "colour_code" && (!run.variables?.post_colour_code || previousPostColour === previousColour)) {
      nextVariables.post_colour_code = value;
    }
    const normalised = normaliseVariablesForSystem(nextProductCode, nextVariables);
    const syncKeys = new Set([
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
      ...Object.keys(extraVariables),
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
                variables: {
                  ...(clearKeys(segment.variables) ?? {}),
                  [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(movement, nextProductCode === "VS"),
                  [GATE_SEGMENT_STUB_KEYS.colourCode]: String(normalised.colour_code ?? "B"),
                  [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(normalised.slat_size_mm ?? 65),
                  [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(normalised.slat_gap_mm ?? 9),
                  [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(normalised.post_size ?? 50),
                },
              };
            }
            return {
              ...segment,
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
            variables:
              segment.segmentKind === "gate_opening"
                ? {
                  ...(segment.variables ?? {}),
                  [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(
                    gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]),
                    nextProductCode === "VS",
                  ),
                  [GATE_SEGMENT_STUB_KEYS.colourCode]: String(nextVariables.colour_code ?? "B"),
                  [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(nextVariables.slat_size_mm ?? 65),
                  [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(nextVariables.slat_gap_mm ?? 9),
                  [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(nextVariables.post_size ?? 50),
                }
                : {
                  ...(segment.variables ?? {}),
                  ...(nextProductCode === "BAYG" && segment.variables?.panel_quantity == null
                    ? (defaultVariablesFromFields(baygConfig.formFields.segment) as Record<
                        string,
                        string | number | boolean
                      >)
                    : {}),
                },
          })),
      },
    });
  }

  return (
    <div className="mb-3 space-y-2 border-t border-brand-border/70 bg-brand-bg/55 p-3">
      <p className="text-xs font-semibold text-brand-muted">
        Sections inherit these settings unless overridden.
      </p>
      <SettingsDisclosureRow
        id={`${run.runId}-system-type`}
        label="System type"
        value={run.productCode}
      >
        <div className="flex flex-wrap gap-2 border-t border-brand-border/50 p-3">
          {localFenceProducts.map((product) => (
            <button
              key={product.system_type}
              type="button"
              onClick={() => changeRunProduct(product.system_type)}
              aria-pressed={product.system_type === run.productCode}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${product.system_type === run.productCode
                ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
                }`}
            >
              {product.system_type === run.productCode && <Check size={16} aria-hidden />}
              {product.system_type}
            </button>
          ))}
        </div>
      </SettingsDisclosureRow>
      <SettingsDisclosureRow
        id={`${run.runId}-slats-colours-spacings`}
        label="Slats, colors, and spacings"
        value={`${valueFor("finish_family")} / ${colourName(variables.colour_code)} / ${valueFor("slat_size_mm")} / ${combinedGapLabel(gapMode, gapMm)}`}
      >
        <div className="space-y-4">
          {renderField("finish_family")}
          {renderField("colour_code")}
          {showPostColourControl && (
            <>
              <button
                type="button"
                onClick={() => setPostColourOpen((value) => !value)}
                className="rounded-lg border border-brand-border px-3 py-2 text-sm font-extrabold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                {postColourOpen ? "Hide alternate post colour" : "Alternate post colour"}
              </button>
              {postColourOpen && renderField("post_colour_code")}
            </>
          )}
          {renderField("slat_size_mm")}
          {renderField("slat_gap_mm")}
          {productCode === "QSHS" && renderField("louvre_treatment")}
        </div>
      </SettingsDisclosureRow>
      {productCode !== "BAYG" && (
        <SettingsDisclosureRow
          id={`${run.runId}-post-mounting`}
          label="Post size, mounting and spacing"
          value={`${valueFor("post_system", postLabel(productCode, variables))} / ${colourName(variables.post_colour_code ?? variables.colour_code)} / ${valueFor("max_panel_width_mm", "2600mm")}`}
        >
          <div className="space-y-4">
            {renderField("post_system")}
            {renderField("post_size")}
            {mountingField && (
              <SchemaDrivenForm
                fields={[mountingField]}
                variables={variables}
                onChange={updateRunVariables}
                onPatch={patchRunVariables}
                extra={{ productCode }}
              />
            )}
            {renderField("post_fixing_material_sku")}
            {renderField("base_plate_substrate")}
            {renderField("max_panel_width_mm")}
            {renderField("left_boundary_type")}
            {renderField("right_boundary_type")}
          </div>
        </SettingsDisclosureRow>
      )}
      {onCollapse && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onCollapse}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-brand-primary bg-brand-primary text-sm font-extrabold text-white transition-colors hover:bg-brand-primary/90"
            aria-label="Collapse run settings"
            title="Collapse run settings"
          >
            <ChevronUp size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
