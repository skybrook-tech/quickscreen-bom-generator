import { useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { SegmentDetails } from "./SegmentDetails";
import { SegmentHeader } from "./SegmentHeader";

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
      className={[
        "rounded-lg border overflow-hidden transition-colors",
        open
          ? "border-neutral-600 bg-neutral-900"
          : "border-neutral-700 bg-neutral-900 hover:bg-neutral-800/50",
      ].join(" ")}
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
