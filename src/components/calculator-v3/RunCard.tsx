import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import type {
  CanonicalRun,
  CanonicalSegment,
} from "../../types/canonical.types";
import { calcRunStats } from "../../lib/runStats";
import { Button } from "../ui/Button";
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
  const productCode = state.payload?.productCode ?? "QSHS";

  const stats = calcRunStats(run, jobMax);

  function upsertSegment(segment: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId: run.runId, segment });
  }

  function addFenceSegment() {
    upsertSegment({
      segmentId: crypto.randomUUID(),
      sortOrder: run.segments.length + 1,
      kind: "fence",
      productCode,
      segmentWidthMm: jobMax,
      // targetHeightMm intentionally omitted — the UPSERT_SEGMENT reducer fills
      // it from payload.variables.target_height_mm so canvas-drawn and
      // form-created segments always get the same job-level default.
      leftTermination: { kind: "system" },
      rightTermination: { kind: "system" },
    });
  }

  function addGateSegment() {
    upsertSegment({
      segmentId: crypto.randomUUID(),
      sortOrder: run.segments.length + 1,
      kind: "gate",
      productCode: GATE_PRODUCT_CODE,
      segmentWidthMm: 1000,
      targetHeightMm: 1800,
      leftTermination: { kind: "system" },
      rightTermination: { kind: "system" },
      variables: {
        hinge_type: "dd-kwik-fit-fixed",
        latch_type: "dd-magna-latch-top-pull",
      },
    });
  }

  // Derive a label for the run's external ends from first/last fence segment
  const fenceSegs = [...run.segments]
    .filter((s) => s.kind === "fence")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const leftLabel =
    fenceSegs[0]?.leftTermination.kind === "system"
      ? "post"
      : fenceSegs[0]?.leftTermination.kind === "non_system"
        ? (fenceSegs[0].leftTermination as { kind: "non_system"; subtype: string }).subtype
        : "—";
  const rightLabel =
    fenceSegs[fenceSegs.length - 1]?.rightTermination.kind === "system"
      ? "post"
      : fenceSegs[fenceSegs.length - 1]?.rightTermination.kind === "non_system"
        ? (fenceSegs[fenceSegs.length - 1].rightTermination as { kind: "non_system"; subtype: string }).subtype
        : "—";

  return (
    <div className="border border-brand-border rounded-lg p-4 bg-brand-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-brand-text">
          Run {runIdx + 1}
        </h3>
      </div>

      <div className="flex flex-wrap gap-3 mb-3 text-xs text-brand-muted">
        <span>Left: {leftLabel}</span>
        <span>Right: {rightLabel}</span>
        <span>Corners: {stats.corners}</span>
        <span>Segments: {run.segments.length}</span>
        <span>Total length: {(calcTotalLength(run) / 1000).toFixed(2)}m</span>
        {stats.panels > 0 && <span>Panels: {stats.panels}</span>}
        {stats.posts > 0 && <span>Posts: {stats.posts}</span>}
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
              setExpandedId((id) =>
                id === seg.segmentId ? null : seg.segmentId,
              )
            }
          />
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2 mt-3">
        <Button
          onClick={addFenceSegment}
          icon={Plus}
          variant="ghost"
          size="small"
        >
          Add segment
        </Button>
        <Button
          onClick={addGateSegment}
          icon={Plus}
          variant="ghost"
          size="small"
        >
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
