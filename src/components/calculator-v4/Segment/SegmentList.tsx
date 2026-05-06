import type { CanonicalRun } from "../../../types/canonical.types";
import { SegmentRow } from "./SegmentRow";

export type SegmentListFilter = "all" | "fence" | "gate";

interface Props {
  run: CanonicalRun;
  runColorIndex: number;
  /** Which rows to list — full chain order, fence spans only, or gates only. */
  filter?: SegmentListFilter;
}

/**
 * Renders sorted SegmentRows for a single run. Fence segments are labelled S1, S2, …
 * and gates G1, G2, … (separate ordinals). Filtering narrows the list without changing labels’ per-kind numbering.
 */
export function SegmentList({
  run,
  runColorIndex,
  filter = "all",
}: Props) {
  const sorted = [...run.segments].sort((a, b) => a.sortOrder - b.sortOrder);

  const segments =
    filter === "fence"
      ? sorted.filter((s) => s.kind === "fence")
      : filter === "gate"
        ? sorted.filter((s) => s.kind === "gate")
        : sorted;

  if (segments.length === 0) {
    const msg =
      filter === "fence"
        ? 'No fence segments yet. Use “Add segment” below or draw on the layout map.'
        : filter === "gate"
          ? 'No gates yet. Use “Add gate” below or place one from the layout map.'
          : 'No segments yet. Click “Add segment” below or draw on the layout map.';
    return (
      <p className="text-xs text-brand-muted italic px-1 py-2">{msg}</p>
    );
  }

  let fenceOrdinal = 0;
  let gateOrdinal = 0;

  return (
    <div className="flex flex-col">
      {segments.map((seg, index) => {
        let segmentLabel: string;
        if (filter === "fence") {
          segmentLabel = `S${++fenceOrdinal}`;
        } else if (filter === "gate") {
          segmentLabel = `G${++gateOrdinal}`;
        } else {
          segmentLabel =
            seg.kind === "gate" ? `G${++gateOrdinal}` : `S${++fenceOrdinal}`;
        }
        const isMaster = index === 0;

        return (
          <SegmentRow
            key={seg.segmentId}
            runId={run.runId}
            seg={seg}
            segmentLabel={segmentLabel}
            runColorIndex={runColorIndex}
            isMaster={isMaster}
          />
        );
      })}
    </div>
  );
}
