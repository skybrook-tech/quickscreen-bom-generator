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
import { heightOptionsForSystem } from "../../lib/productOptionRules";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  segIdx: number;
  runIdx: number;
  open: boolean;
  onToggle: () => void;
}

export function SegmentRow({ runId, seg, segIdx, runIdx, open, onToggle }: Props) {
  const { state, dispatch } = useCalculator();
  const gate = seg.segmentKind === "gate_opening";

  const run = state.payload?.runs.find((r) => r.runId === runId);
  const jobMax = Number(
    run?.variables?.max_panel_width_mm ??
      state.payload?.variables.max_panel_width_mm ??
      2600,
  );
  const effectiveMax = Number(seg.variables?.max_panel_width_mm ?? jobMax);
  const runVariables = {
    ...(state.payload?.variables ?? {}),
    ...(run?.variables ?? {}),
  };
  const heightOptions = run
    ? heightOptionsForSystem(run.productCode, runVariables)
    : [];
  const selectedHeight =
    heightOptions.length > 0
      ? heightOptions.includes(Number(seg.targetHeightMm))
        ? Number(seg.targetHeightMm)
        : heightOptions.reduce((best, height) =>
            Math.abs(height - Number(seg.targetHeightMm ?? 1800)) <
            Math.abs(best - Number(seg.targetHeightMm ?? 1800))
              ? height
              : best,
          )
      : Number(seg.targetHeightMm ?? 1800);
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

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-border/60 bg-brand-card text-sm font-semibold shadow-sm">
      <div className="grid gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 font-bold text-brand-text">
            R{runIdx + 1}-#{segIdx + 1}
          </span>
          <span
            className={`flex w-[78px] shrink-0 items-center justify-center rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-wide ${
              gate
                ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                : "bg-brand-accent/10 text-brand-accent border border-brand-accent/25"
            }`}
          >
            {gate ? "Gate" : "Segment"}
          </span>
          <label className="text-brand-muted shrink-0">Length</label>
          <NumberInput
            value={parseFloat(((seg.segmentWidthMm ?? 0) / 1000).toFixed(2))}
            step={0.01}
            min={0.3}
            onChange={(v) => updateGeometry("segmentWidthMm", Math.round(Number(v) * 1000))}
          />
          <span className="text-brand-muted">m</span>
          <label className="text-brand-muted shrink-0">Height</label>
          {heightOptions.length > 0 ? (
            <select
              value={selectedHeight}
              onChange={(event) =>
                updateGeometry("targetHeightMm", Number(event.target.value))
              }
              className="rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
            >
              {heightOptions.map((height) => (
                <option key={height} value={height}>
                  {height}
                </option>
              ))}
            </select>
          ) : (
            <NumberInput
              value={seg.targetHeightMm ?? 1800}
              onChange={(v) => updateGeometry("targetHeightMm", Number(v))}
            />
          )}
          <span className="text-brand-muted">mm</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onToggle}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                open
                  ? "border-blue-800 bg-blue-800 text-white"
                  : "border-brand-border bg-brand-card text-brand-text hover:border-blue-800 hover:text-blue-800"
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
              className="rounded-full px-3 py-2 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-700"
              aria-label="Remove segment"
            >
              Remove
            </button>
          </div>
        </div>

        {gate && gateSummary ? (
          <div className="rounded-xl border border-brand-border/50 bg-brand-bg/60 px-3 py-2 text-sm font-semibold leading-relaxed text-brand-muted">
            {gateSummary}
          </div>
        ) : null}
        {!gate && seg.segmentWidthMm ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-border/50 bg-brand-bg/60 px-3 py-2 text-sm font-semibold text-brand-muted">
            <span>
              {panelsLive} {panelsLive === 1 ? "panel" : "panels"}
            </span>
            <span>Max post spacing {effectiveMax}mm</span>
          </div>
        ) : null}
      </div>

      {open && (
        <div className="space-y-4 border-t border-brand-border/50 bg-brand-bg/50 p-3">
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
