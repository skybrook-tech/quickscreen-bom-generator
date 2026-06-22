import { useMemo } from "react";
import { useProducts } from "./useProducts";
import {
  parseTargetHeightUi,
  buildPitchLadderHeightOptions,
  heightOptionsWithCurrent,
  getFreeformHeightBounds,
  isFreeformHeightUi,
  clampHeightMm,
  type TargetHeightUiMeta,
} from "../lib/targetHeightOptions";
import { getCustomCalculators } from "../lib/customCalculators";

export function useSegmentHeightOptions(
  productCode: string | null,
  mergedVars: Record<string, string | number | boolean>,
  currentHeightMm: number | undefined,
) {
  const { data: products = [] } = useProducts();

  return useMemo(() => {
    // 1. Check if this is a custom calculator
    const customCalcs = getCustomCalculators();
    const customCalc = customCalcs.find((c) => c.id === productCode);

    if (customCalc) {
      // Find the height variable inside the custom calculator
      const heightVar = customCalc.variables.find(
        (v) =>
          v.field_key === "target_height_mm" ||
          v.field_key === "paling_height" ||
          v.field_key === "height" ||
          v.field_key.toLowerCase().includes("height") ||
          v.label.toLowerCase().includes("height")
      );

      if (heightVar) {
        const freeform = heightVar.control_type === "number";
        const freeformBounds = freeform
          ? { minMm: 300, maxMm: 6000 }
          : null;

        let optionsMm: number[] = [];
        if (!freeform && Array.isArray(heightVar.options_json)) {
          optionsMm = heightVar.options_json
            .map((opt) => {
              const cleaned = String(opt).replace(/[^0-9]/g, "");
              return Number(cleaned);
            })
            .filter((n) => Number.isFinite(n) && n > 0);
        }

        const optionsMmWithCurrent = heightOptionsWithCurrent(optionsMm, currentHeightMm);

        return {
          meta: {
            mode: freeform ? ("freeform_mm" as const) : ("pitch_ladder" as const),
            pitch_var_keys: ["", ""] as [string, string],
          },
          freeform,
          freeformBounds,
          optionsMm: optionsMmWithCurrent,
          clampFreeform: (mm: number) =>
            freeformBounds ? clampHeightMm(mm, freeformBounds) : mm,
        };
      }
    }

    // 2. Fall back to standard/database product height parsing
    const product = products.find((p) => p.system_type === productCode);
    const meta: TargetHeightUiMeta = parseTargetHeightUi(product?.metadata);

    const freeform = isFreeformHeightUi(meta);
    const freeformBounds = freeform ? getFreeformHeightBounds(mergedVars) : null;

    const optionsRaw = freeform
      ? []
      : buildPitchLadderHeightOptions(mergedVars, meta);
    const optionsMm = heightOptionsWithCurrent(optionsRaw, currentHeightMm);

    return {
      meta,
      freeform,
      freeformBounds,
      optionsMm,
      clampFreeform: (mm: number) =>
        freeformBounds ? clampHeightMm(mm, freeformBounds) : mm,
    };
  }, [products, productCode, mergedVars, currentHeightMm]);
}
