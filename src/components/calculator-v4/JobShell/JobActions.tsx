import { useRef } from "react";
import { Save, Trash2 } from "lucide-react";
import {
  useCalculatorV4,
  type AddedSuggestion,
  type ExtraItem,
} from "../../../context/CalculatorContextV4";
import { clearV4Draft } from "../../../lib/v4DraftStorage";
import { useQuotes } from "../../../hooks/useQuotes";
import { useUndoToast } from "../../../hooks/useUndoToast";
import { toast } from "sonner";
import type { CanonicalPayload } from "../../../types/canonical.types";

interface JobActionsProps {
  onSave?: () => void;
}

interface ClearSnapshot {
  jobName: string;
  payload: CanonicalPayload | null;
  bomResult: Record<string, unknown> | null;
  addedSuggestions: AddedSuggestion[];
  dismissedSuggestionSkus: Set<string>;
  removedSkus: Set<string>;
  extraItems: ExtraItem[];
  qtyOverrides: Record<string, number>;
}

export function JobActions({ onSave }: JobActionsProps) {
  const { state, dispatch } = useCalculatorV4();
  const { saveQuote, updateQuote } = useQuotes();
  const clearSnapshotRef = useRef<ClearSnapshot | null>(null);

  const { trigger: triggerClearUndo } = useUndoToast(
    "Job cleared",
    () => {
      if (clearSnapshotRef.current) {
        dispatch({ type: "HYDRATE_V4_DRAFT", snapshot: clearSnapshotRef.current });
      }
    },
    10000,
  );

  const handleSave = async () => {
    if (onSave) {
      onSave();
      return;
    }

    if (!state.payload) {
      toast.warning("Nothing to save — add a run first.");
      return;
    }

    const customerRef =
      state.quoteDetails.customer.trim() ||
      state.jobName.trim() ||
      "Untitled job";
    const notesPayload = JSON.stringify({
      v4_payload: state.payload,
      bomResult: state.bomResult,
      quoteDetails: state.quoteDetails,
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
    // Capture snapshot for undo before destroying state
    clearSnapshotRef.current = {
      jobName: state.jobName,
      payload: state.payload,
      bomResult: state.bomResult,
      addedSuggestions: [...state.addedSuggestions],
      dismissedSuggestionSkus: new Set(state.dismissedSuggestionSkus),
      removedSkus: new Set(state.removedSkus),
      extraItems: [...state.extraItems],
      qtyOverrides: { ...state.qtyOverrides },
    };
    dispatch({ type: "RESET_JOB" });
    clearV4Draft();
    triggerClearUndo();
  };

  const hasJob = !!state.payload;
  const isSaving = saveQuote.isPending || updateQuote.isPending;

  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={handleSave}
        disabled={!hasJob || isSaving}
        className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--brand-radius-sm)] bg-brand-text text-brand-bg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-save-job"
      >
        <Save size={14} />
        {isSaving ? "Saving…" : state.savedQuoteId ? "Update Job" : "Save Job"}
      </button>
      <button
        onClick={handleClear}
        disabled={!hasJob}
        className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--brand-radius-sm)] border border-brand-border text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-clear-job"
      >
        <Trash2 size={14} /> Clear Job
      </button>
    </div>
  );
}
