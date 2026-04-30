import { useMemo } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import { useProductVariables } from "../../hooks/useProductVariables";
import type { CanonicalSegment } from "../../types/canonical.types";
import { localFenceProducts } from "../../lib/localSeedData";
import {
  applyProductOptionRules,
  initialVariablesForSystem,
  maxPanelWidthForSystem,
  normaliseVariablesForSystem,
} from "../../lib/productOptionRules";
import {
  GATE_SEGMENT_STUB_KEYS,
  SEGMENT_OPTION_KEYS,
  patchSegmentVariables,
} from "../../lib/segmentTermination";
import { SchemaDrivenForm } from "./SchemaDrivenForm";
import NumberInput from "../shared/NumberInput";
import { defaultGateBuildForMovement, gateMovementOrDefault } from "../../lib/gateOptionRules";

const POST_SIZE_LABELS: Record<string, string> = {
  "50": "Standard Post 50mm",
  "65": "Standard Post 65mm HD",
};

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

export function FenceSegmentDetails({ runId, seg }: Props) {
  const { state, dispatch } = useCalculator();
  const run = state.payload?.runs.find((item) => item.runId === runId);
  const productCode = run?.productCode ?? state.payload?.productCode ?? null;
  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  const { data: runFields = [] } = useProductVariables(productCode, "run");

  // Post size options from the run-scoped post_size variable
  const postSizeOptions = useMemo(() => {
    const v = runFields.find((f) => f.field_key === "post_size");
    const raw = v?.options_json ?? ["50", "65"];
    return raw.map(String);
  }, [runFields]);

  const v = seg.variables ?? {};
  const firstFenceSegmentId = run?.segments.find(
    (segment) => segment.segmentKind !== "gate_opening",
  )?.segmentId;
  const isDefaultSegment = seg.segmentId === firstFenceSegmentId;
  const runVariables = {
    ...(state.payload?.variables ?? {}),
    ...(run?.variables ?? {}),
  };
  const displayVariables = {
    ...runVariables,
    ...v,
  };
  const postSize = (displayVariables[SEGMENT_OPTION_KEYS.postSize] as string) ?? "";
  const isCustomPost = postSize === "custom";

  function upsertSegment(s: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: s });
  }

  function setScalar(key: string, value: string | number | boolean | null) {
    if (isDefaultSegment && value !== null) {
      syncDefaultVariables(key, value);
      return;
    }
    upsertSegment(patchSegmentVariables(seg, { [key]: value }));
  }

  function onJobOverrideChange(key: string, value: string | number | boolean) {
    const base = runVariables[key];
    upsertSegment(
      patchSegmentVariables(seg, { [key]: value === base ? null : value }),
    );
  }

  const jobMax = Number(state.payload?.variables.max_panel_width_mm ?? 2600);
  const effectiveMax = Number(v.max_panel_width_mm ?? jobMax);

  function updateMaxPanelWidth(value: number | null) {
    if (isDefaultSegment && value !== null) {
      syncDefaultVariables("max_panel_width_mm", value);
      return;
    }
    upsertSegment(patchSegmentVariables(seg, { max_panel_width_mm: value }));
  }

  const mergedJobDisplay: Record<string, string | number | boolean> = {
    ...displayVariables,
  };
  const optionFields = useMemo(
    () =>
      productCode
        ? applyProductOptionRules(
            productCode,
            jobFields.filter(
              (field) =>
                !field.field_key.endsWith("_stock_length_mm") &&
                field.field_key !== "max_panel_width_mm",
            ),
            mergedJobDisplay,
          )
        : [],
    [jobFields, mergedJobDisplay, productCode],
  );
  const visibleRunFields = useMemo(
    () =>
      runFields
        .filter(
          (field) => {
            if (["left_boundary_type", "right_boundary_type"].includes(field.field_key)) {
              return false;
            }
            if (
              field.field_key === "mounting_method" &&
              runFields.some((candidate) => candidate.field_key === "mounting_type")
            ) {
              return false;
            }
            return true;
          },
        )
        .map((field) => {
          if (field.field_key === "mounting_type" || field.field_key === "mounting_method") {
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
          return field;
        }),
    [productCode, runFields],
  );

  function syncDefaultVariables(
    key: string,
    value: string | number | boolean,
  ) {
    if (!run || !productCode) return;
    const previousColour = String(runVariables.colour_code ?? "");
    const previousPostColour = String(
      runVariables.post_colour_code ?? previousColour,
    );
    const nextVariables = {
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
    if (
      key === "colour_code" &&
      (!run.variables?.post_colour_code || previousPostColour === previousColour)
    ) {
      nextVariables.post_colour_code = value;
    }
    const normalised = normaliseVariablesForSystem(productCode, nextVariables);
    const syncGeometryKeys = [
      "target_height_mm",
      "slat_size_mm",
      "slat_gap_mm",
      "slat_gap_mode",
      "colour_code",
      "post_colour_code",
      "post_size",
      "post_system",
    ];
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        variables: normalised,
        segments: syncGeometryKeys.includes(key)
          ? run.segments.map((segment) => {
              if (segment.segmentKind === "gate_opening") {
                const movement = gateMovementOrDefault(
                  segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement],
                );
                return {
                  ...segment,
                  targetHeightMm: Number(normalised.target_height_mm ?? segment.targetHeightMm ?? 1800),
                  variables: {
                    ...(segment.variables ?? {}),
                    [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: Number(normalised.target_height_mm ?? segment.targetHeightMm ?? 1800),
                    [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(
                      movement,
                      productCode === "VS",
                    ),
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
              };
            })
          : run.segments,
      },
    });
  }

  function handleOptionChange(key: string, value: string | number | boolean) {
    if (isDefaultSegment) {
      syncDefaultVariables(key, value);
      return;
    }
    onJobOverrideChange(key, value);
  }

  function changeRunProduct(nextProductCode: string) {
    if (!run) return;
    const variables = normaliseVariablesForSystem(nextProductCode, {
      ...initialVariablesForSystem(nextProductCode),
      ...runVariables,
      max_panel_width_mm:
        runVariables.max_panel_width_mm ?? maxPanelWidthForSystem(nextProductCode),
    });
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        productCode: nextProductCode,
        variables,
        segments: run.segments.map((segment) => ({
          ...segment,
          targetHeightMm: Number(variables.target_height_mm ?? segment.targetHeightMm ?? 1800),
          variables:
            segment.segmentKind === "gate_opening"
              ? {
                  ...(segment.variables ?? {}),
                  [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(
                    gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]),
                    nextProductCode === "VS",
                  ),
                  [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: Number(variables.target_height_mm ?? segment.targetHeightMm ?? 1800),
                  [GATE_SEGMENT_STUB_KEYS.colourCode]: String(variables.colour_code ?? "B"),
                  [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(variables.slat_size_mm ?? 65),
                  [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(variables.slat_gap_mm ?? 9),
                  [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(variables.post_size ?? 50),
                }
              : segment.variables,
        })),
      },
    });
  }

  return (
    <div className="space-y-4">
      {isDefaultSegment && run && (
        <div className="space-y-3 rounded-2xl border border-brand-border/50 bg-brand-bg/60 p-3">
          <p className="text-sm font-bold text-brand-muted">Default settings for this run</p>
          <div>
            <p className="mb-2 text-sm font-bold text-brand-muted">System type</p>
            <div className="flex flex-wrap gap-2">
              {localFenceProducts.map((product) => (
                <button
                  key={product.system_type}
                  type="button"
                  onClick={() => changeRunProduct(product.system_type)}
                  className={`rounded-full border px-3 py-2 text-sm font-bold shadow-sm transition-colors ${
                    product.system_type === run.productCode
                      ? "border-blue-800 bg-blue-800 text-white shadow-sm"
                      : "border-brand-border bg-brand-card text-brand-text hover:border-blue-800 hover:text-blue-800"
                  }`}
                >
                  {product.system_type}
                </button>
              ))}
            </div>
          </div>
          <SchemaDrivenForm
            fields={optionFields}
            variables={mergedJobDisplay}
            onChange={handleOptionChange}
          />
          {visibleRunFields.length > 0 && (
            <SchemaDrivenForm
              fields={visibleRunFields}
              variables={mergedJobDisplay}
              onChange={handleOptionChange}
            />
          )}
        </div>
      )}

      {!isDefaultSegment && optionFields.length > 0 && (
        <div className="rounded-2xl border border-brand-border/50 bg-brand-bg/60 p-3">
          <p className="mb-2 text-sm font-bold text-brand-muted">
            Segment overrides
          </p>
          <SchemaDrivenForm
            fields={optionFields}
            variables={mergedJobDisplay}
            onChange={handleOptionChange}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Max panel width override */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-brand-muted">Max Post Spacings (mm)</span>
          <NumberInput
            value={effectiveMax}
            onChange={(v) => updateMaxPanelWidth(v)}
            min={300}
            max={2600}
            step={50}
          />
        </label>

        {/* Post type - data-driven from run-scoped post_size variable */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-brand-muted">Post type</span>
          <select
            value={postSize}
            onChange={(e) =>
              setScalar(
                SEGMENT_OPTION_KEYS.postSize,
                e.target.value || null,
              )
            }
            className="rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          >
            <option value="">Job default</option>
            {postSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {POST_SIZE_LABELS[opt] ?? `${opt}mm Post`}
              </option>
            ))}
            <option value="custom">Non-standard post</option>
          </select>
        </label>

        {/* Post width - only unlocked for non-standard posts */}
        {isCustomPost && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-brand-muted">Post width (mm)</span>
            <NumberInput
              value={(v[SEGMENT_OPTION_KEYS.postWidthMm] as number | null) ?? null}
              onChange={(val) =>
                setScalar(SEGMENT_OPTION_KEYS.postWidthMm, val)
              }
              min={1}
            />
          </label>
        )}
      </div>

    </div>
  );
}
