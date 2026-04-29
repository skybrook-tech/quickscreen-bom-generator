import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { SlideOutPane } from "../shared/SlideOutPane";
import { GateForm } from "./GateForm";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The run that the gate will be attached to. */
  runId: string | null;
  /** Existing gate segment when editing, null when adding. */
  editingSegmentId: string | null;
}

/**
 * Slide-out wrapper around GateForm. On save, dispatches UPSERT_SEGMENT to the
 * targeted run with kind="gate".
 */
export function GatePane({ open, onClose, runId, editingSegmentId }: Props) {
  const { state, dispatch } = useCalculatorV4();
  const run = state.payload?.runs.find((r) => r.runId === runId);
  const initialSegment = editingSegmentId
    ? (run?.segments.find((s) => s.segmentId === editingSegmentId) ?? null)
    : null;

  function handleSave(segment: CanonicalSegment) {
    if (!runId) return;
    // For new gates, sort_order is end of run; preserve for edits.
    const existingRun = state.payload?.runs.find((r) => r.runId === runId);
    if (!existingRun) return;
    if (!editingSegmentId) {
      segment.sortOrder = existingRun.segments.length;
    }
    dispatch({ type: "UPSERT_SEGMENT", runId, segment });
    onClose();
  }

  return (
    <SlideOutPane
      open={open}
      onClose={onClose}
      title={editingSegmentId ? "Edit gate" : "Add gate"}
      subtitle={runId ? `Attaches to run ${runId.slice(0, 8)}…` : undefined}
    >
      {open && runId && (
        <GateForm
          initialSegment={initialSegment}
          onCancel={onClose}
          onSave={handleSave}
        />
      )}
    </SlideOutPane>
  );
}
