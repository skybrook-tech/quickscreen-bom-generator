import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { TerminationControl } from "./TerminationControl";

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

export function SegmentDetails({ runId, seg }: Props) {
  const { dispatch } = useCalculatorV4();
  const [overridesOpen, setOverridesOpen] = useState(false);

  const update = (patch: Partial<CanonicalSegment>) => {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: { ...seg, ...patch },
    });
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 font-mono tabular-nums focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none";
  const labelClass =
    "block text-[11px] font-medium uppercase tracking-wider text-neutral-500";

  return (
    <div className="border-t border-neutral-700/60 p-3 bg-neutral-800/30 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className={labelClass}>Length (m)</label>
          <div className="relative">
            <input
              type="number"
              value={(seg.segmentWidthMm ?? 0) / 1000}
              step={0.1}
              onChange={(e) =>
                update({ segmentWidthMm: Math.max(0, Number(e.target.value) * 1000) })
              }
              className={`${inputClass} pr-8`}
              data-testid={`v4-seg-length-${seg.segmentId}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 pointer-events-none">
              m
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Height (mm)</label>
          <div className="relative">
            <input
              type="number"
              value={seg.targetHeightMm ?? 0}
              onChange={(e) =>
                update({ targetHeightMm: Math.max(0, Number(e.target.value)) })
              }
              className={`${inputClass} pr-10`}
              data-testid={`v4-seg-height-${seg.segmentId}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 pointer-events-none">
              mm
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TerminationControl runId={runId} seg={seg} side="left" />
        <TerminationControl runId={runId} seg={seg} side="right" />
      </div>

      {/* Segment overrides — collapsible amber-tinted block */}
      <div className="rounded-lg border border-amber-800/40 overflow-hidden">
        <button
          type="button"
          onClick={() => setOverridesOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-amber-950/30 text-[11px] font-medium text-amber-400/80 hover:bg-amber-950/50 transition-colors"
        >
          <span>Segment style overrides</span>
          <ChevronDown
            size={13}
            className={`transition-transform ${overridesOpen ? "rotate-180" : ""}`}
          />
        </button>
        {overridesOpen && (
          <div className="px-3 py-3 bg-amber-950/10 space-y-2">
            <p className="text-xs text-amber-400/60 italic">
              Coming soon — per-segment colour, slat size, and gap overrides.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
