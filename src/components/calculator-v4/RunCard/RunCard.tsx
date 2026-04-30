import { useMemo, useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import type {
  CanonicalRun,
  CanonicalSegment,
} from "../../../types/canonical.types";
import { SegmentList } from "../Segment/SegmentList";
import { RunActions } from "./RunActions";
import { RunConfigPanel } from "./RunConfigPanel";
import { RunHeader } from "./RunHeader";
import { RunSubHeader, type RunTab } from "./RunSubHeader";
import { useRunSummary } from "./useRunSummary";

interface Props {
  run: CanonicalRun;
  index: number;
  onAddGate: (runId: string) => void;
}

export function RunCard({ run, index, onAddGate }: Props) {
  const { state, dispatch } = useCalculatorV4();
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<RunTab>("style");

  const effectiveVars = useMemo(
    () => ({
      ...(state.payload?.variables ?? {}),
      ...(run.variables ?? {}),
    }),
    [state.payload?.variables, run.variables],
  );

  const summary = useRunSummary(run, effectiveVars);
  const runProductCode = run.productCode ?? "—";

  function handleAddSegment() {
    const sortOrder = run.segments.length;
    const newSeg: CanonicalSegment = {
      segmentId: crypto.randomUUID(),
      sortOrder,
      kind: "fence",
      productCode: runProductCode,
      segmentWidthMm: 3000,
      targetHeightMm: Number(effectiveVars["target_height_mm"] ?? 1800),
      leftTermination: { kind: "system" },
      rightTermination: { kind: "system" },
    };

    dispatch({ type: "UPSERT_SEGMENT", runId: run.runId, segment: newSeg });
  }

  return (
    <div
      className="rounded-xl border border-brand-border bg-brand-card overflow-hidden shadow-sm"
      data-testid={`v4-run-card-${run.runId}`}
    >
      <RunHeader index={index} systemCode={runProductCode} summary={summary} />

      <RunSubHeader
        editing={editing}
        onToggleEditing={() => setEditing((e) => !e)}
        effectiveVars={effectiveVars}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {editing && <RunConfigPanel run={run} activeTab={activeTab} />}

      {!editing && (
        <div className="border-t border-brand-border p-4 space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Segments ({run.segments.length})
          </h3>
          <SegmentList run={run} />
          <RunActions
            onAddSegment={handleAddSegment}
            onAddGate={() => onAddGate(run.runId)}
            onRemoveRun={() =>
              dispatch({ type: "REMOVE_RUN", runId: run.runId })
            }
            canRemove={(state.payload?.runs.length ?? 0) > 1}
          />
        </div>
      )}
    </div>
  );
}
