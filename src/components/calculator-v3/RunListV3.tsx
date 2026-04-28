import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalRun } from "../../types/canonical.types";
import { maxPanelWidthForSystem } from "../../lib/productOptionRules";
import { RunCard } from "./RunCard";

export function RunListV3() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;

  if (!payload) return null;

  function addRun() {
    const firstRun = payload!.runs[0];
    const productCode = firstRun?.productCode ?? payload!.productCode;
    const variables = {
      ...(payload!.variables ?? {}),
      ...(firstRun?.variables ?? {}),
    };
    const initialWidth = Number(
      variables.max_panel_width_mm ?? maxPanelWidthForSystem(productCode),
    );
    const initialHeight = Number(variables.target_height_mm ?? 1800);
    const newRun: CanonicalRun = {
      runId: crypto.randomUUID(),
      productCode,
      variables,
      leftBoundary: firstRun?.leftBoundary ?? { type: "product_post" },
      rightBoundary: firstRun?.rightBoundary ?? { type: "product_post" },
      segments: [
        {
          segmentId: crypto.randomUUID(),
          sortOrder: 1,
          segmentKind: "panel",
          segmentWidthMm: initialWidth,
          targetHeightMm: initialHeight,
        },
      ],
      corners: [],
    };
    dispatch({ type: "UPSERT_RUN", run: newRun });
  }

  return (
    <div className="space-y-4">
      {payload.runs.map((run, runIdx) => (
        <RunCard key={run.runId} run={run} runIdx={runIdx} />
      ))}
      <button
        type="button"
        onClick={addRun}
        className="w-full text-sm text-brand-muted border border-dashed border-brand-border rounded-lg py-3 hover:border-brand-accent/50 hover:text-brand-accent transition-colors"
      >
        + Add run
      </button>
    </div>
  );
}
