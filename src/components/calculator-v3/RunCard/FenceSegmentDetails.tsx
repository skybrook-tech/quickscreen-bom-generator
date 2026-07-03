import { useMemo } from "react";
import { useCalculator } from "../../../context/CalculatorContext";
import { useCalculatorConfig } from "../../../hooks/useCalculatorConfig";
import type { CanonicalSegment } from "../../../types/canonical.types";
import {
  clampPostSpacing,
} from "../../../lib/productOptionRules";
import {
  patchSegmentVariables,
} from "../../../lib/segmentTermination";
import { SchemaSettingsForm } from "../SchemaSettingsForm";
import { useFenceProducts } from "../../../hooks/useProducts";
import { localFenceProducts } from "../../../lib/localSeedData";
import { isPanelStrategyCode } from "../../../lib/productOptionRules";
import { segmentFields } from "../../../lib/runFieldOverrides";
import { Check } from "lucide-react";

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
  const fenceProductsQuery = useFenceProducts();
  const fenceProducts = fenceProductsQuery.data ?? localFenceProducts;

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
    const productOverride = nextProductCode === runProductCode ? null : nextProductCode;
    const panelQuantityPatch = isPanelStrategyCode(nextProductCode)
      ? { panel_quantity: seg.variables?.panel_quantity ?? 1 }
      : {};
    upsertSegment(
      patchSegmentVariables(seg, {
        product_code: productOverride,
        ...panelQuantityPatch,
      }),
    );
  }

  if (!config || !runConfig) return null;
  const resolvedConfig = config;
  const productCode = segProductCode;

  const fields = segmentFields(resolvedConfig);


  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-muted">
          System type
        </h4>
        <div className="flex flex-wrap gap-2">
          {fenceProducts.map((product) => (
            <button
              key={product.system_type}
              type="button"
              onClick={() => onSystemTypeChange(product.system_type)}
              aria-pressed={product.system_type === segProductCode}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${product.system_type === segProductCode
                ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
                }`}
            >
              {product.system_type === segProductCode && <Check size={16} aria-hidden />}
              {product.system_type}
            </button>
          ))}
        </div>
      </div>

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
