import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { clearV4Draft } from "../../../lib/v4DraftStorage";
import { toast } from "sonner";
import { ConfirmDialog } from "../../ui/ConfirmDialog";

interface JobActionsProps {
  onSave?: () => void;
}

/**
 * Save / Clear job buttons.
 * Save is a stub for v4 v1 (toast only) — wire to quotes table in a follow-up.
 */
export function JobActions({ onSave }: JobActionsProps) {
  const { state, dispatch } = useCalculatorV4();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleSave = () => {
    if (onSave) {
      onSave();
      return;
    }
    toast.info("Save job: not yet wired to quotes table (v4 v2)");
  };

  const handleClear = () => {
    dispatch({ type: "RESET_JOB" });
    clearV4Draft();
    setConfirmClearOpen(false);
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
        onClick={() => setConfirmClearOpen(true)}
        disabled={!hasJob}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-border text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-clear-job"
      >
        <Trash2 size={14} /> Clear Job
      </button>
      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear this job?"
        description="This will remove the job name, all runs, segments, gates, generated BOM lines, accessories, and local draft data. This cannot be undone."
        confirmLabel="Clear job"
        onConfirm={handleClear}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
