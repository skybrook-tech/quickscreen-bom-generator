import { useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { SegmentDetails } from "./SegmentDetails";
import { SegmentHeader } from "./SegmentHeader";
import { cn } from "../../../lib";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  index: number;
}

export function SegmentRow({ runId, seg, index }: Props) {
  const { dispatch } = useCalculatorV4();
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn("rounded-lg border overflow-hidden transition-colors", {
        "border-brand-border bg-brand-card": open,
        "border-blue-500 bg-blue-500/10 hover:bg-blue-500/20":
          seg.kind === "fence",
        "border-amber-500 bg-amber-500/10 hover:bg-amber-500/20":
          seg.kind === "gate",
      })}
      data-testid={`v4-segment-row-${seg.segmentId}`}
    >
      <SegmentHeader
        seg={seg}
        index={index}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onLengthChange={(lengthMm) =>
          dispatch({
            type: "UPSERT_SEGMENT",
            runId,
            segment: { ...seg, segmentWidthMm: lengthMm },
          })
        }
        onHeightChange={(heightMm) =>
          dispatch({
            type: "UPSERT_SEGMENT",
            runId,
            segment: { ...seg, targetHeightMm: heightMm },
          })
        }
        onDuplicate={() =>
          dispatch({
            type: "DUPLICATE_SEGMENT",
            runId,
            segmentId: seg.segmentId,
          })
        }
        onRemove={() =>
          dispatch({
            type: "REMOVE_SEGMENT",
            runId,
            segmentId: seg.segmentId,
          })
        }
      />
      {open && <SegmentDetails runId={runId} seg={seg} />}
    </div>
  );
}
