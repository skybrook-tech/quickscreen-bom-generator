import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { GATE_SEGMENT_STUB_KEYS } from "../../lib/segmentTermination";
import { Button } from "../shared/Button";
import { SegmentRow } from "./SegmentRow";

const GATE_PRODUCT_CODE = "QS_GATE";

interface Props {
  run: CanonicalRun;
  runIdx: number;
}

const calcTotalLength = (run: CanonicalRun) =>
  run.segments.reduce((acc, seg) => acc + (seg.segmentWidthMm ?? 0), 0);

export function RunCard({ run, runIdx }: Props) {
  const { state, dispatch } = useCalculator();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const jobMax = Number(state.payload?.variables.max_panel_width_mm ?? 2600);

  const totalPanels = run.segments
    .filter((s) => s.segmentKind !== "gate_opening")
    .reduce((acc, s) => {
      const segMax = Number(s.variables?.max_panel_width_mm ?? jobMax);
      return acc + Math.ceil((s.segmentWidthMm ?? 0) / segMax);
    }, 0);

  function upsertSegment(segment: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId: run.runId, segment });
  }

  function addFenceSegment() {
    upsertSegment({
      segmentId: crypto.randomUUID(),
      sortOrder: run.segments.length + 1,
      segmentKind: "panel",
      segmentWidthMm: jobMax,
      targetHeightMm: 1800,
    });
  }

  function addGateSegment() {
    upsertSegment({
      segmentId: crypto.randomUUID(),
      sortOrder: run.segments.length + 1,
      segmentKind: "gate_opening",
      segmentWidthMm: 1000,
      targetHeightMm: 1800,
      gateProductCode: GATE_PRODUCT_CODE,
      variables: {
        [GATE_SEGMENT_STUB_KEYS.hingeType]: "dd-kwik-fit-fixed",
        [GATE_SEGMENT_STUB_KEYS.latchType]: "dd-magna-latch-top-pull",
      },
    });
  }

  return (
    <div className="border border-brand-border rounded-lg p-4 bg-brand-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-brand-text">
          Run {runIdx + 1} — {run.productCode}
        </h3>
      </div>

      <div className="flex flex-wrap gap-3 mb-3 text-xs text-brand-muted">
        <span>Run left: {run.leftBoundary.type.replace(/_/g, " ")}</span>
        <span>Run right: {run.rightBoundary.type.replace(/_/g, " ")}</span>
        <span>Corners: {run.corners.length}</span>
        <span>Segments: {run.segments.length}</span>
        <span>Total length: {calcTotalLength(run)}mm</span>
        {totalPanels > 0 && <span>Total panels: {totalPanels}</span>}
      </div>

      {run.segments.length === 0 && (
        <p className="text-xs text-brand-muted italic mb-3">
          No segments yet. Draw on canvas or add manually.
        </p>
      )}

      <div className="space-y-2">
        {run.segments.map((seg, segIdx) => (
          <SegmentRow
            key={seg.segmentId}
            runId={run.runId}
            seg={seg}
            segIdx={segIdx}
            open={expandedId === seg.segmentId}
            onToggle={() =>
              setExpandedId((id) => (id === seg.segmentId ? null : seg.segmentId))
            }
          />
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2 mt-3">
        <Button onClick={addFenceSegment} icon={Plus} variant="ghost" size="small">
          Add segment
        </Button>
        <Button onClick={addGateSegment} icon={Plus} variant="ghost" size="small">
          Add gate
        </Button>
        <Button
          onClick={() => dispatch({ type: "REMOVE_RUN", runId: run.runId })}
          icon={Trash2}
          variant="ghost-danger"
          size="small"
        >
          Remove run
        </Button>
      </div>
    </div>
  );
}
