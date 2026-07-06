import NumberInput from "../../shared/NumberInput";
import type { FieldRenderer } from "./types";

/**
 * control_type: "leaf_width_pair" — double-swing leaf widths. Two config
 * fields (`leaf_1_width_mm`/`leaf_2_width_mm`) share this control type; only
 * the first (lowest `sort_order`) renders the full pair UI, the second is a
 * no-op so the pair isn't drawn twice.
 */
export const leafWidthPairRenderer: FieldRenderer = ({ field, extra }) => {
  if (field.field_key !== "leaf_1_width_mm") return null;
  const leafWidthsMm = (extra.leafWidthsMm as number[]) ?? [];
  const clearOpeningMm = Number(extra.clearOpeningMm ?? 0);
  const gateWidthMm = Number(extra.gateWidthMm ?? 0);
  const hingeGapMm = Number(extra.hingeGapMm ?? 0);
  const latchGapMm = Number(extra.latchGapMm ?? 0);
  const updateLeafWidth = extra.updateLeafWidth as (leafIndex: 0 | 1, widthMm: number) => void;

  return (
    <div className="w-full space-y-3">
      <div className="rounded-lg border border-brand-border/70 bg-brand-card p-3 text-xs font-bold text-brand-muted">
        Finished leaves are calculated after hinge gaps and the shared latch gap. Changing one leaf automatically
        adjusts the other.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((index) => {
          const leafWidth = Math.round(leafWidthsMm[index] ?? clearOpeningMm / 2);
          return (
            <label key={index} className="flex flex-col gap-1">
              <span className="text-sm font-bold text-brand-muted">Leaf {index + 1} finished width (mm)</span>
              <NumberInput
                value={leafWidth}
                min={1}
                max={Math.max(1, Math.round(clearOpeningMm) - 1)}
                step={10}
                className="w-28 px-2 py-1.5 text-center tabular-nums"
                onChange={(value) => updateLeafWidth(index as 0 | 1, Number(value))}
              />
              {leafWidth < 800 && (
                <span className="text-xs font-bold text-brand-warning">Soft warning: leaf is under 800mm.</span>
              )}
            </label>
          );
        })}
      </div>
      <p className="text-xs font-semibold text-brand-muted">
        Clear leaf total: <b className="text-brand-text">{Math.round(clearOpeningMm)}mm</b> from a{" "}
        <b className="text-brand-text">{Math.round(gateWidthMm)}mm</b> opening after{" "}
        {Math.round(hingeGapMm)}mm hinge gap on each side and {Math.round(latchGapMm)}mm shared latch gap.
      </p>
    </div>
  );
};
