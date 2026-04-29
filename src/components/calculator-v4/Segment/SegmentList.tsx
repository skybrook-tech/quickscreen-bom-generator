import type { CanonicalRun } from "../../../types/canonical.types";
import { SegmentRow } from "./SegmentRow";

interface Props {
  run: CanonicalRun;
}

/**
 * Renders sorted SegmentRows for a single run. Empty state shown when none.
 */
export function SegmentList({ run }: Props) {
  const segments = [...run.segments].sort((a, b) => a.sortOrder - b.sortOrder);

  if (segments.length === 0) {
    return (
      <p className="text-xs text-brand-muted italic px-1 py-2">
        No segments yet. Click "Add segment" below or draw on the layout map.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {segments.map((seg, idx) => (
        <SegmentRow
          key={seg.segmentId}
          runId={run.runId}
          seg={seg}
          index={idx + 1}
        />
      ))}
    </div>
  );
}
