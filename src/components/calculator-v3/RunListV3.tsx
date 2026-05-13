import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalRun } from "../../types/canonical.types";
import { RunCard } from "./RunCard";

export function RunListV3({
  autoOpenFirstRunId,
  onAutoOpenConsumed,
}: {
  autoOpenFirstRunId?: string | null;
  onAutoOpenConsumed?: () => void;
}) {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const hasRuns = Boolean(payload?.runs.length);

  if (!payload) return null;

  function addRun() {
    const firstRun = payload!.runs[0];
    const productCode = firstRun?.productCode ?? payload!.productCode;
    const variables = {
      ...(payload!.variables ?? {}),
      ...(firstRun?.variables ?? {}),
    };
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
          segmentWidthMm: 0,
          targetHeightMm: initialHeight,
          variables: productCode === "BAYG" ? { panel_quantity: 1 } : undefined,
        },
      ],
      corners: [],
    };
    dispatch({ type: "UPSERT_RUN", run: newRun });
  }

  return (
    <div className="space-y-4">
      {payload.runs.map((run, runIdx) => (
        <RunCard
          key={run.runId}
          run={run}
          runIdx={runIdx}
          autoOpenFirstSection={autoOpenFirstRunId === run.runId}
          onAutoOpenConsumed={onAutoOpenConsumed}
        />
      ))}
      <button
        type="button"
        onClick={addRun}
        className={`w-full rounded-lg py-3 text-sm font-black transition-all ${
          hasRuns
            ? "border border-brand-primary/50 bg-brand-primary px-4 text-white shadow-sm hover:bg-brand-primary/90 hover:shadow-md"
            : "border border-brand-primary bg-brand-primary px-4 text-white shadow-md ring-2 ring-brand-primary ring-offset-2 ring-offset-brand-card hover:bg-brand-primary/90 hover:shadow-lg"
        }`}
      >
        + Add run
      </button>
    </div>
  );
}
