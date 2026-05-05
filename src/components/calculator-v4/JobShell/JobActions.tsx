import { Save, Trash2 } from "lucide-react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { clearV4Draft } from "../../../lib/v4DraftStorage";
import { useQuotes } from "../../../hooks/useQuotes";
import { toast } from "sonner";

interface JobActionsProps {
  onSave?: () => void;
}

export function JobActions({ onSave }: JobActionsProps) {
  const { state, dispatch } = useCalculatorV4();
  const { saveQuote, updateQuote } = useQuotes();

  const handleSave = async () => {
    if (onSave) {
      onSave();
      return;
    }

    if (!state.payload) {
      toast.warning("Nothing to save — add a run first.");
      return;
    }

    const customerRef = state.jobName.trim() || "Untitled job";
    const notesPayload = JSON.stringify({
      v4_payload: state.payload,
      bomResult: state.bomResult,
    });

    try {
      if (state.savedQuoteId) {
        await updateQuote.mutateAsync({
          id: state.savedQuoteId,
          updates: {
            customer_ref: customerRef,
            notes: notesPayload,
          },
        });
      } else {
        const saved = await saveQuote.mutateAsync({
          customer_ref: customerRef,
          notes: notesPayload,
          // v4 stores canonical payload in notes; these v1 fields are stubs
          fence_config: {} as never,
          gates: [],
          bom: {} as never,
          contact: {} as never,
          status: "draft",
          org_id: "",
          user_id: "",
        });
        dispatch({ type: "SET_SAVED_QUOTE_ID", id: saved.id });
      }

      const time = new Date().toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
      });
      toast.success(`Saved · ${time}`);
    } catch (err) {
      console.error("[JobActions] save failed", err);
      toast.error("Save failed — please try again.");
    }
  };

  const handleClear = () => {
    if (
      !confirm(
        "Clear the entire job? Run config, segments, and BOM result will be discarded.",
      )
    )
      return;
    dispatch({ type: "RESET_JOB" });
    clearV4Draft();
  };

  const hasJob = !!state.payload;
  const isSaving = saveQuote.isPending || updateQuote.isPending;

  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={handleSave}
        disabled={!hasJob || isSaving}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-text text-brand-bg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-save-job"
      >
        <Save size={14} />
        {isSaving ? "Saving…" : state.savedQuoteId ? "Update Job" : "Save Job"}
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
