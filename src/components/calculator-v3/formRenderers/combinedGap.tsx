import { CombinedGapSelect } from "../CombinedGapSelect";
import type { FieldRenderer } from "./types";

/** control_type: "combined_gap" — writes slat_gap_mode + slat_gap_mm together. */
export const combinedGapRenderer: FieldRenderer = ({ variables, onPatch, extra }) => {
  const productCode = String(extra.productCode ?? variables.product_code ?? "QSHS");
  return (
    <CombinedGapSelect
      productCode={productCode}
      mode={variables.slat_gap_mode}
      gapMm={variables.slat_gap_mm}
      onChange={(mode, gapMm) => onPatch({ slat_gap_mode: mode, slat_gap_mm: gapMm })}
    />
  );
};
