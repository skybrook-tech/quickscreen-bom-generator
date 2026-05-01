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

export function useSegmentHeightOptions(
  productCode: string | null,
  mergedVars: Record<string, string | number | boolean>,
  currentHeightMm: number | undefined,
) {
  const { data: products = [] } = useProducts();

  return useMemo(() => {
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
