import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalRun } from "../../types/canonical.types";
import { RunCard } from "./RunCard";

export function RunListV3() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;

  if (!payload) return null;

  function addRun() {
    const newRun: CanonicalRun = {
      runId: crypto.randomUUID(),
      productCode: payload!.productCode,
      leftBoundary: { type: "product_post" },
      rightBoundary: { type: "product_post" },
      segments: [],
      corners: [],
    };
    dispatch({ type: "UPSERT_RUN", run: newRun });
  }

  console.log(payload.runs);

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
