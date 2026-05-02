import type { CanonicalRun } from "../../../types/canonical.types";
import { SegmentRow } from "./SegmentRow";

interface Props {
  run: CanonicalRun;
  runColorIndex: number;
}

/**
 * Renders sorted SegmentRows for a single run. Empty state shown when none.
 * Fence segments are labelled S1, S2, … and gates G1, G2, … (separate ordinals).
 */
export function SegmentList({ run, runColorIndex }: Props) {
  const segments = [...run.segments].sort((a, b) => a.sortOrder - b.sortOrder);

  if (segments.length === 0) {
    return (
      <p className="text-xs text-brand-muted italic px-1 py-2">
        No segments yet. Click "Add segment" below or draw on the layout map.
      </p>
    );
  }

  let fenceOrdinal = 0;
  let gateOrdinal = 0;

  return (
    <div className="space-y-2">
      {segments.map((seg) => {
        const segmentLabel =
          seg.kind === "gate"
            ? `G${++gateOrdinal}`
            : `S${++fenceOrdinal}`;
        return (
          <SegmentRow
            key={seg.segmentId}
            runId={run.runId}
            seg={seg}
            segmentLabel={segmentLabel}
            runColorIndex={runColorIndex}
          />
        );
      })}
    </div>
  );
}
