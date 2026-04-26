import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalRun } from "../../types/canonical.types";
import { RunCard } from "./RunCard";
import { Button } from "../ui/Button";

export function RunListV3() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;

  if (!payload) return null;

  function addRun() {
    const newRun: CanonicalRun = {
      runId: crypto.randomUUID(),
      segments: [],
    };
    dispatch({ type: "UPSERT_RUN", run: newRun });
  }

  return (
    <div className="space-y-4">
      {payload.runs.map((run, runIdx) => (
        <RunCard key={run.runId} run={run} runIdx={runIdx} />
      ))}
      <Button
        variant="secondary"
        onClick={addRun}
        className="w-full justify-center border-dashed rounded-lg py-3 text-brand-muted hover:border-brand-accent/50 hover:text-brand-accent hover:bg-transparent"
      >
        + Add run
      </Button>
    </div>
  );
}
