import { ChevronUp, Check } from "lucide-react";
import { useEffect } from "react";
import { useCalculator } from "../../../context/CalculatorContext";
import type { CanonicalRun } from "../../../types/canonical.types";
import {
  defaultGateBuildForMovementInfill,
  gateMovementOrDefault,
} from "../../../lib/gateOptionRules";
import {
  defaultGateInfillForCode,
  initialVariablesForSystem,
  isPanelStrategyCode,
  maxPanelWidthForSystem,
  normaliseVariablesForSystem,
} from "../../../lib/productOptionRules";
import { GATE_SEGMENT_STUB_KEYS, patchSegmentVariables } from "../../../lib/segmentTermination";
import { localFenceProducts } from "../../../lib/localSeedData";
import { isPreferredGroutSku } from "../../../lib/postFixingOptions";
import { getPreferredGroutSku, setPreferredGroutSku } from "../../../lib/userPrefs";
import { SchemaSettingsForm } from "../SchemaSettingsForm";
import { useCalculatorConfig } from "../../../hooks/useCalculatorConfig";
import { runFields } from "../../../lib/runFieldOverrides";
import { InlineHeightEditor } from "./InlineHeightEditor";
import { DerivedHeight } from "../../../types/calculatorConfig.types";
import { CanonicalSegment } from "../../../types/canonical.types";

interface Props {
  run: CanonicalRun;
  onCollapse?: () => void;
}

export function RunCardSettings({ run, onCollapse }: Props) {
  const { dispatch } = useCalculator();
  const productCode = run.productCode;
  const variables = {
    ...(run.variables ?? {}),
  } as Record<string, string | number | boolean>;
  const config = useCalculatorConfig(productCode, variables);

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

  if (!config) return null;
  const cfg = config;

  const fields = runFields(cfg);

  function patchRunVariables(patch: Record<string, string | number | boolean | null | undefined>) {
    const entries = Object.entries(patch).filter(
      (entry): entry is [string, string | number | boolean] => entry[1] !== null && entry[1] !== undefined,
    );
    if (entries.length === 0) return;
    const [[firstKey, firstValue], ...rest] = entries;
    updateRunVariables(firstKey, firstValue, productCode, Object.fromEntries(rest));
  }

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
    if (key === "post_fixing_material_sku" && isPreferredGroutSku(value, cfg.postFixingMaterials)) {
      setPreferredGroutSku(value);
    }
    if (key === "post_system") {
      nextVariables.post_size = value === "standard_65" ? 65 : 50;
    }
    if (key === "colour_code" && (!run.variables?.post_colour_code || previousPostColour === previousColour)) {
      nextVariables.post_colour_code = value;
    }
    // Dispatch the raw edit — the useRunReconciliation hook normalises via the
    // backend (cascade corrections like economy → slat 65, colour subset) so
    // this component stays product-agnostic.
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
        variables: nextVariables,
        segments: syncKeys.has(key)
          ? run.segments.map((segment) => {
            if (segment.segmentKind === "gate_opening") {
              const movement = gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
              return {
                ...segment,
                variables: {
                  ...(clearKeys(segment.variables) ?? {}),
                  [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovementInfill(
                    movement,
                    defaultGateInfillForCode(nextProductCode),
                  ),
                  [GATE_SEGMENT_STUB_KEYS.colourCode]: String(nextVariables.colour_code ?? "B"),
                  [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(nextVariables.slat_size_mm ?? 65),
                  [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(nextVariables.slat_gap_mm ?? 9),
                  [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(nextVariables.post_size ?? 50),
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
    // Product-switch is the one path that is legitimately product-aware (the
    // user is explicitly choosing a system), so it uses the legacy
    // normaliser + product-code maps. The useRunReconciliation hook
    // then re-normalises against the new product's resolved config.
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
          .filter((segment) => !isPanelStrategyCode(nextProductCode) || segment.segmentKind !== "gate_opening")
          .map((segment) => ({
            ...segment,
            variables:
              segment.segmentKind === "gate_opening"
                ? {
                  ...(segment.variables ?? {}),
                  [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovementInfill(
                    gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]),
                    defaultGateInfillForCode(nextProductCode),
                  ),
                  [GATE_SEGMENT_STUB_KEYS.colourCode]: String(nextVariables.colour_code ?? "B"),
                  [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(nextVariables.slat_size_mm ?? 65),
                  [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(nextVariables.slat_gap_mm ?? 9),
                  [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(nextVariables.post_size ?? 50),
                }
                : {
                  ...(segment.variables ?? {}),
                  ...(isPanelStrategyCode(nextProductCode) && segment.variables?.panel_quantity == null
                    ? { panel_quantity: 1 }
                    : {}),
                },
          })),
      },
    });
  }

  const runHeight = Number(variables.target_height_mm ?? 1800)

  function segmentInheritsRunHeight(segment: CanonicalSegment) {
    const segmentHeight = Number(segment.targetHeightMm ?? runHeight);
    const variables = segment.variables ?? {};
    const hasHeightOverride =
      variables.target_height_mm != null ||
      variables.slat_count != null ||
      variables[GATE_SEGMENT_STUB_KEYS.gateHeightMm] != null;
    return !hasHeightOverride || segmentHeight === runHeight;
  }

  function updateRunHeight(heightMm: number, entry?: DerivedHeight) {
    const nextVariables: CanonicalRun["variables"] = {
      ...(run.variables ?? {}),
      target_height_mm: heightMm,
    };
    if (entry) nextVariables.slat_count = entry.N;
    else delete nextVariables.slat_count;

    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        variables: nextVariables,
        segments: run.segments.map((segment) => {
          if (!segmentInheritsRunHeight(segment)) return segment;
          const cleared = patchSegmentVariables(segment, {
            target_height_mm: null,
            slat_count: null,
            [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: null,
          });
          return {
            ...cleared,
            targetHeightMm: heightMm,
          };
        }),
      },
    });
  }


  return (
    <div className="mb-3 space-y-4 border-brand-border/70 bg-brand-bg/55 p-3">
      <p className="text-xs font-semibold text-brand-muted">
        Sections inherit these settings unless overridden.
      </p>
      <div className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-muted">
          Height
        </h4>

        <InlineHeightEditor
          config={config}
          variables={variables}
          valueMm={Number(variables.target_height_mm ?? 1800)}
          ariaLabel={`Run default height`}
          onChange={(heightMm) => updateRunHeight(heightMm)}
        />
      </div>
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-muted">
          System type
        </h4>
        <div className="flex flex-wrap gap-2">
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
      </div>


      <SchemaSettingsForm
        fields={fields}
        groups={cfg.formGroups}
        variables={variables}
        onChange={updateRunVariables}
        onPatch={patchRunVariables}
        extra={{ productCode, postFixingMaterials: cfg.postFixingMaterials, config: cfg }}
      />

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
