import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import { ChevronDown, Settings2 } from "lucide-react";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { GateSegmentDetails } from "./GateSegmentDetails";
import NumberInput from "../shared/NumberInput";
import { GATE_SEGMENT_STUB_KEYS } from "../../lib/segmentTermination";
import {
  GATE_MOVEMENTS,
  HINGE_OPTIONS,
  LATCH_OPTIONS,
  SLIDING_CATCH_OPTIONS,
  SLIDING_MOTOR_OPTIONS,
  SLIDING_TRACK_OPTIONS,
  gateMovementOrDefault,
  isSwingGateMovement,
  optionLabel,
} from "../../lib/gateOptionRules";

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

  const run = state.payload?.runs.find((r) => r.runId === runId);
  const jobMax = Number(
    run?.variables?.max_panel_width_mm ??
      state.payload?.variables.max_panel_width_mm ??
      2600,
  );
  const effectiveMax = Number(seg.variables?.max_panel_width_mm ?? jobMax);
  const gateVars = seg.variables ?? {};
  const gateMovement = gateMovementOrDefault(gateVars[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  const panelsLive = seg.segmentWidthMm
    ? Math.ceil(seg.segmentWidthMm / effectiveMax)
    : 0;
  const gateSummaryParts = isSwingGateMovement(gateMovement)
    ? [
        optionLabel(GATE_MOVEMENTS, gateMovement),
        optionLabel(HINGE_OPTIONS, gateVars[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "ML-TL-KF-H-FT"),
        optionLabel(LATCH_OPTIONS, gateVars[GATE_SEGMENT_STUB_KEYS.latchType] ?? "none"),
      ]
    : [
        optionLabel(GATE_MOVEMENTS, gateMovement),
        optionLabel(SLIDING_TRACK_OPTIONS, gateVars[GATE_SEGMENT_STUB_KEYS.slidingTrackType] ?? "XPSG-6000-TRACK-ST"),
        optionLabel(SLIDING_CATCH_OPTIONS, gateVars[GATE_SEGMENT_STUB_KEYS.slidingCatchType] ?? "XPSG-CATCH-U"),
        optionLabel(SLIDING_MOTOR_OPTIONS, gateVars[GATE_SEGMENT_STUB_KEYS.slidingMotorType] ?? "none"),
      ];
  const gateSummary = gate
    ? gateSummaryParts
        .concat(
          gateVars[GATE_SEGMENT_STUB_KEYS.useGatePostsAsFenceTermination] === false
            ? "Own fence termination posts"
            : "Gate posts terminate fence",
        )
        .filter(Boolean)
        .join(" - ")
    : "";

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

  function updateMaxPanelWidth(value: number) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: {
        ...seg,
        variables: {
          ...(seg.variables ?? {}),
          max_panel_width_mm: value,
        },
      },
    });
  }

  return (
    <div className="rounded border border-brand-border/50 bg-brand-bg text-xs overflow-hidden">
      <div className="grid gap-2 p-2">
        <div className="flex flex-wrap items-center gap-2">
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
          <label className="text-brand-muted shrink-0">Width</label>
          <NumberInput
            value={parseFloat(((seg.segmentWidthMm ?? 0) / 1000).toFixed(2))}
            step={0.01}
            min={0.3}
            onChange={(v) => updateGeometry("segmentWidthMm", Math.round(Number(v) * 1000))}
          />
          <span className="text-brand-muted">m</span>
          <label className="text-brand-muted shrink-0">Height</label>
          <NumberInput
            value={seg.targetHeightMm ?? 1800}
            onChange={(v) => updateGeometry("targetHeightMm", Number(v))}
          />
          <span className="text-brand-muted">mm</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onToggle}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
                open
                  ? "border-blue-800 bg-blue-800 text-white"
                  : "border-brand-border bg-white text-brand-text hover:border-blue-800 hover:text-blue-800"
              }`}
              aria-expanded={open}
              aria-label={open ? "Collapse details" : "Expand details"}
            >
              {gate ? "Gate options" : "Segment options"}
              {gate ? (
                <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              ) : (
                <Settings2 size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              )}
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
              className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
              aria-label="Remove segment"
            >
              Remove
            </button>
          </div>
        </div>

        {gate && gateSummary ? (
          <div className="rounded bg-white px-2 py-1 text-[11px] leading-relaxed text-brand-muted">
            {gateSummary}
          </div>
        ) : null}
        {!gate && seg.segmentWidthMm ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-brand-muted">
            <span>
              {panelsLive} {panelsLive === 1 ? "panel" : "panels"}
            </span>
            <label className="shrink-0">Post spacing</label>
            <NumberInput
              value={effectiveMax}
              min={300}
              step={50}
              onChange={(v) => updateMaxPanelWidth(Number(v))}
            />
            <span>mm max</span>
          </div>
        ) : null}
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
