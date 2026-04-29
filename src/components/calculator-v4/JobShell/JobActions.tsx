import { Save, Trash2 } from "lucide-react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { toast } from "sonner";

interface JobActionsProps {
  onSave?: () => void;
}

/**
 * Save / Clear job buttons.
 * Save is a stub for v4 v1 (toast only) — wire to quotes table in a follow-up.
 */
export function JobActions({ onSave }: JobActionsProps) {
  const { state, dispatch } = useCalculatorV4();

  const handleSave = () => {
    if (onSave) {
      onSave();
      return;
    }
    toast.info("Save job: not yet wired to quotes table (v4 v2)");
  };

  const handleClear = () => {
    if (
      !confirm(
        "Clear the entire job? Run config, segments, and BOM result will be discarded.",
      )
    )
      return;
    dispatch({ type: "RESET_JOB" });
  };

  const hasJob = !!state.payload;

  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={handleSave}
        disabled={!hasJob}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-text text-brand-bg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-save-job"
      >
        <Save size={14} /> Save Job
      </button>
      <button
        onClick={handleClear}
        disabled={!hasJob}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-border text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-clear-job"
      >
        <Trash2 size={14} /> Clear Job
      </button>
    </div>
  );
}
