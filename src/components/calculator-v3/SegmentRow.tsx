import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import { Settings2 } from "lucide-react";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { GateSegmentDetails } from "./GateSegmentDetails";
import NumberInput from "../shared/NumberInput";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  segIdx: number;
  open: boolean;
  onToggle: () => void;
}

export function SegmentRow({ runId, seg, segIdx, open, onToggle }: Props) {
  const { state, dispatch } = useCalculator();
  const gate = seg.segmentKind === "gate_opening";

  const jobMax = Number(state.payload?.variables.max_panel_width_mm ?? 2600);
  const effectiveMax = Number(seg.variables?.max_panel_width_mm ?? jobMax);
  const panelsLive = seg.segmentWidthMm
    ? Math.ceil(seg.segmentWidthMm / effectiveMax)
    : 0;

  function updateGeometry(
    key: "segmentWidthMm" | "targetHeightMm",
    value: number,
  ) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: { ...seg, [key]: value },
    });
  }

  return (
    <div className="rounded border border-brand-border/50 bg-brand-bg text-xs overflow-hidden">
      <div className="flex gap-2 items-center p-2">
        <span className="text-brand-muted w-8 shrink-0">#{segIdx + 1}</span>
        <span
          className={`text-[10px] w-[65px] flex items-center justify-center uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
            gate
              ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
              : "bg-brand-accent/10 text-brand-accent border border-brand-accent/25"
          }`}
        >
          {gate ? "Gate" : "Segment"}
        </span>
        <label className="text-brand-muted shrink-0">W:</label>
        <NumberInput
          value={seg.segmentWidthMm ?? 0}
          onChange={(v) => updateGeometry("segmentWidthMm", Number(v))}
        />
        <span className="text-brand-muted">mm</span>
        <label className="text-brand-muted shrink-0">H:</label>
        <NumberInput
          value={seg.targetHeightMm ?? 1800}
          onChange={(v) => updateGeometry("targetHeightMm", Number(v))}
        />
        <span className="text-brand-muted">mm</span>

        {!gate && seg.segmentWidthMm ? (
          <span className="text-[10px] text-brand-muted">
            × {panelsLive} {panelsLive === 1 ? "panel" : "panels"}
          </span>
        ) : null}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={onToggle}
            className="ml-1 p-1 rounded text-brand-muted hover:text-brand-text hover:bg-brand-border/50"
            aria-expanded={open}
            aria-label={open ? "Collapse details" : "Expand details"}
          >
            <Settings2
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
