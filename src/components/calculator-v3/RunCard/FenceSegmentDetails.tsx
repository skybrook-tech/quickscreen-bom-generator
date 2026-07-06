import { useMemo } from "react";
import { useCalculator } from "../../../context/CalculatorContext";
import {
  useCalculatorConfig,
  useAllCalculatorConfigs,
  configForProduct,
} from "../../../hooks/useCalculatorConfig";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { clampPostSpacing } from "../../../lib/postSpacing";
import { nearestDerivedHeight } from "../../../lib/heights";
import {
  patchSegmentVariables,
} from "../../../lib/segmentTermination";
import { SchemaSettingsForm } from "../SchemaSettingsForm";
import { segmentFields } from "../../../lib/runFieldOverrides";
import ProductSelector from "../formRenderers/ProductSelector";

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

export function FenceSegmentDetails({ runId, seg }: Props) {
  const { state, dispatch } = useCalculator();
  const run = state.payload?.runs.find((r) => r.runId === runId);
  const runProductCode = run?.productCode ?? state.payload?.productCode ?? "";
  const segProductCode = String(seg.variables?.product_code ?? runProductCode);

  const v = seg.variables ?? {};
  const runVariables = useMemo<Record<string, string | number | boolean>>(
    () => ({ ...(run?.variables ?? {}) }),
    [run],
  );
  const displayVariables: Record<string, string | number | boolean> = {
    ...runVariables,
    ...v,
  };
  const runConfig = useCalculatorConfig(runProductCode, runVariables);
  const config = useCalculatorConfig(segProductCode, displayVariables);

  const allConfigs = useAllCalculatorConfigs();

  function upsertSegment(s: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: s });
  }

  function onJobOverrideChange(key: string, value: string | number | boolean) {
    const base = runVariables[key];
    const nextPatch: Record<string, string | number | boolean | null> = {
      [key]: value === base ? null : value,
    };
    if (key === "colour_code") {
      const runColour = String(runVariables.colour_code ?? "");
      const runPostColour = String(runVariables.post_colour_code ?? runColour);
      const currentColour = String(displayVariables.colour_code ?? "");
      const currentPostColour = String(displayVariables.post_colour_code ?? currentColour);
      const explicitPostColour = v.post_colour_code;
      const postColourFollowsColour =
        explicitPostColour === undefined ||
          explicitPostColour === null ||
          explicitPostColour === ""
          ? runPostColour === runColour
          : currentPostColour === currentColour;
      if (postColourFollowsColour) {
        nextPatch.post_colour_code = value === runVariables.colour_code ? null : value;
      }
    }
    if (key === "max_panel_width_mm") {
      const jobMax = clampPostSpacing(
        runVariables.max_panel_width_mm,
        runConfig?.panelRules.maxPanelWidthMm ?? 2600,
      );
      const clamped = clampPostSpacing(Number(value), jobMax);
      nextPatch.max_panel_width_mm = clamped === runVariables.max_panel_width_mm ? null : clamped;
      upsertSegment(patchSegmentVariables(seg, nextPatch));
      return;
    }
    upsertSegment(patchSegmentVariables(seg, nextPatch));
  }

  function onJobOverridePatch(patch: Record<string, string | number | boolean | null | undefined>) {
    const jobMax = clampPostSpacing(
      runVariables.max_panel_width_mm,
      runConfig?.panelRules.maxPanelWidthMm ?? 2600,
    );
    const nextPatch: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined) continue;
      if (key === "max_panel_width_mm") {
        const clamped = clampPostSpacing(Number(value), jobMax);
        nextPatch[key] = clamped === runVariables.max_panel_width_mm ? null : clamped;
        continue;
      }
      nextPatch[key] = value === runVariables[key] ? null : value;
    }
    upsertSegment(patchSegmentVariables(seg, nextPatch));
  }

  // Switch this segment's fence system. Stores product_code as a structural
  // override (null = inherit run product) and seeds panel_quantity for
  // panel-strategy products so the segment isn't left invalid. Full cascade
  // normalisation is backend-driven on the next resolve; this only bridges the
  // one structural + quantity gap the run-scoped reconciliation won't touch.
  function onSystemTypeChange(nextProductCode: string) {
    const targetConfig = configForProduct(allConfigs, nextProductCode);

    // Preserve the section's geometry across the switch. Width is a top-level
    // segment field (survives via ...seg). Height must survive too, but snapped
    // to a value the target product actually offers — its height ladder differs
    // (QSHS is slat-derived; Colorbond is [1500,1800,2100]), and an out-of-ladder
    // height builds catalogue SKUs that don't exist and prices $0.
    const currentHeight = Number(
      seg.targetHeightMm ??
        displayVariables.target_height_mm ??
        runVariables.target_height_mm ??
        1800,
    );
    const heightEntry = targetConfig
      ? nearestDerivedHeight(targetConfig.heightLadder.entries, currentHeight)
      : undefined;
    const height = heightEntry?.height ?? currentHeight;
    const heightVars: Record<string, number> = {
      target_height_mm: height,
      ...(heightEntry ? { slat_count: heightEntry.N } : {}),
    };

    // Back to the run product → inherit the run again: drop all overrides, keep
    // only geometry. Keep an explicit height override only when it differs from
    // the run height (otherwise fully inherit).
    if (nextProductCode === runProductCode) {
      const runHeight = Number(
        runVariables.target_height_mm ?? runConfig?.defaults.targetHeightMm ?? 1800,
      );
      const nextVars = Math.round(height) !== Math.round(runHeight) ? heightVars : undefined;
      upsertSegment({ ...seg, variables: nextVars, targetHeightMm: height });
      return;
    }

    // Differ from the run product → set ALL variables to the target product's
    // defaults (do not inherit from the run), plus the product_code override and
    // the preserved height. Panel-strategy products keep a panel_quantity seed.
    const isPanel = targetConfig?.strategy.fence === "panel";
    const nextVars: Record<string, string | number | boolean> = {
      ...(targetConfig?.normalisedVariables ?? {}),
      product_code: nextProductCode,
      ...heightVars,
      ...(isPanel ? { panel_quantity: Number(seg.variables?.panel_quantity ?? 1) } : {}),
    };
    upsertSegment({ ...seg, variables: nextVars, targetHeightMm: height });
  }

  if (!config || !runConfig) return null;
  const resolvedConfig = config;
  const productCode = segProductCode;

  const fields = segmentFields(resolvedConfig);


  return (
    <div className="space-y-5">
      <ProductSelector onSystemTypeChange={onSystemTypeChange} value={segProductCode} disabled={!allConfigs} />

      <SchemaSettingsForm
        fields={fields}
        groups={resolvedConfig.formGroups}
        variables={displayVariables}
        onChange={onJobOverrideChange}
        onPatch={onJobOverridePatch}
        extra={{ productCode, postFixingMaterials: resolvedConfig.postFixingMaterials, config: resolvedConfig }}
      />
    </div>
  );
}
