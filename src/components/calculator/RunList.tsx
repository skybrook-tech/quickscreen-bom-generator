import { Plus } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import { RunItem } from "./RunItem";
import { defaultRunConfig } from "../../schemas/calculator.schema";

export function RunList() {
  const { state, dispatch } = useCalculator();

  const addRun = () => {
    dispatch({
      type: "ADD_RUN",
      run: { ...defaultRunConfig, id: crypto.randomUUID() },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-brand-text">
          Runs{" "}
          {state.runs.length > 0 && (
            <span className="text-brand-muted font-normal">
              ({state.runs.length})
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={addRun}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-accent hover:bg-brand-accent/10 border border-brand-accent/30 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Run
        </button>
      </div>

      {state.runs.length === 0 ? (
        <div className="text-center py-8 text-sm text-brand-muted border border-dashed border-brand-border rounded-lg">
          No runs added yet. Click "+ Add Run" to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {state.runs.map((run, i) => (
            <RunItem key={run.id} run={run} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
