import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import { ChevronDown } from "lucide-react";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { GateSegmentDetails } from "./GateSegmentDetails";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  segIdx: number;
  open: boolean;
  onToggle: () => void;
}

export function SegmentRow({ runId, seg, segIdx, open, onToggle }: Props) {
  const { dispatch } = useCalculator();
  const gate = seg.segmentKind === "gate_opening";

  function updateGeometry(
    key: "panelWidthMm" | "targetHeightMm",
    value: number,
  ) {
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: { ...seg, [key]: value } });
  }

  return (
    <div className="rounded border border-brand-border/50 bg-brand-bg text-xs overflow-hidden">
      <div className="flex gap-2 items-center p-2">
        <span className="text-brand-muted w-8 shrink-0">#{segIdx + 1}</span>
        <span
          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
            gate
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              : "bg-brand-accent/10 text-brand-accent border border-brand-accent/25"
          }`}
        >
          {gate ? "Gate" : "Segment"}
        </span>
        <label className="text-brand-muted shrink-0">W:</label>
        <input
          type="number"
          value={seg.panelWidthMm ?? 0}
          onChange={(e) => updateGeometry("panelWidthMm", Number(e.target.value))}
          className="w-20 bg-brand-card border border-brand-border rounded px-2 py-1 text-brand-text"
        />
        <span className="text-brand-muted">mm</span>
        <label className="text-brand-muted shrink-0">H:</label>
        <input
          type="number"
          value={seg.targetHeightMm ?? 1800}
          onChange={(e) =>
            updateGeometry("targetHeightMm", Number(e.target.value))
          }
          className="w-20 bg-brand-card border border-brand-border rounded px-2 py-1 text-brand-text"
        />
        <span className="text-brand-muted">mm</span>
        <button
          type="button"
          onClick={onToggle}
          className="ml-1 p-1 rounded text-brand-muted hover:text-brand-text hover:bg-brand-border/50"
          aria-expanded={open}
          aria-label={open ? "Collapse details" : "Expand details"}
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: "REMOVE_SEGMENT",
              runId,
              segmentId: seg.segmentId,
            })
          }
          className="ml-auto text-red-400 hover:text-red-300 text-xs p-1"
        >
          &#x2715;
        </button>
      </div>

      {open && (
        <div className="border-t border-brand-border/50 p-3 space-y-4 bg-brand-card/40">
          {gate ? (
            <GateSegmentDetails runId={runId} seg={seg} />
          ) : (
            <FenceSegmentDetails runId={runId} seg={seg} />
          )}
        </div>
      )}
    </div>
  );
}
