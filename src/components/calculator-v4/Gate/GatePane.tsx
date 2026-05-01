import { useMemo } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { mergeFenceJobRun } from "../../../lib/gateFenceResolve";
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

  const fenceContext = useMemo(
    () =>
      mergeFenceJobRun(state.payload?.variables, run?.variables),
    [state.payload?.variables, run?.variables],
  );

  const maxFenceSegmentHeightMm = useMemo(() => {
    if (!run?.segments?.length) return undefined;
    const fenceSegs = run.segments.filter((s) => s.kind === "fence");
    const heights = fenceSegs
      .map((s) => s.targetHeightMm)
      .filter((h): h is number => typeof h === "number" && h > 0);
    if (heights.length === 0) return undefined;
    return Math.max(...heights);
  }, [run?.segments]);

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
          key={`${runId}:${editingSegmentId ?? "new"}`}
          initialSegment={initialSegment}
          fenceContext={fenceContext}
          maxFenceSegmentHeightMm={maxFenceSegmentHeightMm}
          onCancel={onClose}
          onSave={handleSave}
        />
      )}
    </SlideOutPane>
  );
}
