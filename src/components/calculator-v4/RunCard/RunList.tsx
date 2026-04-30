import { Plus } from "lucide-react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { RunCard } from "./RunCard";

interface Props {
  onAddGate: (runId: string) => void;
}

/**
 * Render all runs as RunCards plus an Add-run button below.
 */
export function RunList({ onAddGate }: Props) {
  const { state, dispatch } = useCalculatorV4();
  const payload = state.payload;

  if (!payload) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted mb-2 px-1">
        Runs
      </div>
      <div className="overflow-y-auto">
        <div className="space-y-3">
          {payload?.runs.map((run, i) => (
            <RunCard
              key={run.runId}
              run={run}
              index={i + 1}
              onAddGate={onAddGate}
            />
          ))}
        </div>
        <button
          onClick={() => dispatch({ type: "ADD_RUN" })}
          className="w-full mt-3 px-3 py-2.5 rounded-md border border-dashed border-brand-border text-sm font-medium text-brand-muted hover:text-brand-accent hover:border-brand-accent hover:bg-brand-accent/5 transition flex items-center justify-center gap-1.5"
          data-testid="v4-add-run"
        >
          <Plus size={14} /> Add run
        </button>
      </div>
    </div>
  );
}
