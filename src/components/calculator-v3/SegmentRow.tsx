import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import { CheckCircle2, ChevronDown, Settings2 } from "lucide-react";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { GateSegmentDetails } from "./GateSegmentDetails";
import NumberInput from "../shared/NumberInput";
import {
  GATE_SEGMENT_STUB_KEYS,
  patchSegmentVariables,
} from "../../lib/segmentTermination";
import {
  GATE_MOVEMENTS,
  HINGE_OPTIONS,
  LATCH_OPTIONS,
  SLIDING_CATCH_OPTIONS,
  SLIDING_MOTOR_OPTIONS,
  SLIDING_TRACK_OPTIONS,
  defaultGateBuildForMovement,
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
  displayLabel?: string;
}

export function SegmentRow({ runId, seg, segIdx, runIdx, open, onToggle, displayLabel }: Props) {
  const { state, dispatch } = useCalculator();
  const gate = seg.segmentKind === "gate_opening";

  const run = state.payload?.runs.find((r) => r.runId === runId);
  const runVariables = {
    ...(state.payload?.variables ?? {}),
    ...(run?.variables ?? {}),
  };
  const firstFenceSegment = run?.segments.find((item) => item.segmentKind !== "gate_opening");
  const masterVariables = {
    ...runVariables,
    ...(firstFenceSegment?.variables ?? {}),
  };
  const segmentVariables = {
    ...runVariables,
    ...(seg.variables ?? {}),
  };
  const heightOptions = run
    ? heightOptionsForSystem(run.productCode, segmentVariables)
    : [];
  const selectedHeight =
    heightOptions.length > 0
      ? heightOptions.includes(Number(seg.targetHeightMm))
        ? Number(seg.targetHeightMm)
        : heightOptions.reduce((best, height) =>
            Math.abs(height - Number(seg.targetHeightMm ?? segmentVariables.target_height_mm ?? 1800)) <
            Math.abs(best - Number(seg.targetHeightMm ?? segmentVariables.target_height_mm ?? 1800))
              ? height
              : best,
          )
      : Number(seg.targetHeightMm ?? segmentVariables.target_height_mm ?? 1800);
  const gateVars = seg.variables ?? {};
  const gateMovement = gateMovementOrDefault(gateVars[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  const gateSummaryParts = isSwingGateMovement(gateMovement)
    ? [
        optionLabel(GATE_MOVEMENTS, gateMovement),
        optionLabel(HINGE_OPTIONS, gateVars[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B"),
        optionLabel(LATCH_OPTIONS, gateVars[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA"),
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
  const done = seg.variables?.segment_done === true;
  const matchesMaster = (() => {
    if (!run) return true;
    if (gate) {
      const gateVars = seg.variables ?? {};
      const gateBuild = String(
        gateVars[GATE_SEGMENT_STUB_KEYS.gateBuild] ??
          (run.productCode === "VS" ? "qsg_hinged_vertical" : "qsg_hinged_horizontal"),
      );
      const expectedBuild = run.productCode === "VS"
        ? gateBuild.includes("vertical")
        : !gateBuild.includes("vertical");
      return (
        expectedBuild &&
        Number(seg.targetHeightMm ?? gateVars[GATE_SEGMENT_STUB_KEYS.gateHeightMm] ?? 0) ===
          Number(firstFenceSegment?.targetHeightMm ?? masterVariables.target_height_mm ?? 0)
      );
    }
    if (seg.segmentId === firstFenceSegment?.segmentId) return true;
    const vars = seg.variables ?? {};
    const keys = [
      "target_height_mm",
      "colour_code",
      "post_colour_code",
      "slat_size_mm",
      "slat_gap_mm",
      "slat_gap_mode",
      "post_size",
      "post_system",
      "mounting_type",
      "mounting_method",
      "max_panel_width_mm",
    ];
    return keys.every((key) => vars[key] === undefined || String(vars[key]) === String(masterVariables[key] ?? ""));
  })();

  function updateGeometry(
    key: "segmentWidthMm" | "targetHeightMm",
    value: number,
  ) {
    if (key === "targetHeightMm" && run && seg.segmentId === firstFenceSegment?.segmentId) {
      dispatch({
        type: "UPSERT_RUN",
        run: {
          ...run,
          variables: {
            ...(run.variables ?? {}),
            target_height_mm: value,
          },
          segments: run.segments.map((segment) => {
            if (segment.segmentKind === "gate_opening") {
              const movement = gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
              return {
                ...segment,
                targetHeightMm: value,
                variables: {
                  ...(segment.variables ?? {}),
                  [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: value,
                  [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(
                    movement,
                    run.productCode === "VS",
                  ),
                },
              };
            }
            return { ...segment, targetHeightMm: value };
          }),
        },
      });
      return;
    }
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment:
        gate && key === "targetHeightMm"
          ? {
              ...patchSegmentVariables(seg, {
                [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: value,
              }),
              targetHeightMm: value,
            }
          : { ...seg, [key]: value },
    });
  }

  function resetToMaster() {
    if (!run) return;
    const masterHeight = Number(firstFenceSegment?.targetHeightMm ?? masterVariables.target_height_mm ?? 1800);
    if (gate) {
      const movement = gateMovementOrDefault(seg.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
      dispatch({
        type: "UPSERT_SEGMENT",
        runId,
        segment: {
          ...patchSegmentVariables(seg, {
            [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(
              movement,
              run.productCode === "VS",
            ),
            [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: masterHeight,
            [GATE_SEGMENT_STUB_KEYS.colourCode]: String(masterVariables.colour_code ?? "B"),
            [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(masterVariables.slat_size_mm ?? 65),
            [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(masterVariables.slat_gap_mm ?? 9),
            [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(masterVariables.post_size ?? 50),
          }),
          targetHeightMm: masterHeight,
        },
      });
      return;
    }
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: {
        ...patchSegmentVariables(seg, {
          target_height_mm: null,
          colour_code: null,
          post_colour_code: null,
          slat_size_mm: null,
          slat_gap_mm: null,
          slat_gap_mode: null,
          post_size: null,
          post_system: null,
          mounting_type: null,
          mounting_method: null,
          max_panel_width_mm: null,
        }),
        targetHeightMm: masterHeight,
      },
    });
  }

  function toggleDone() {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: patchSegmentVariables(seg, { segment_done: !done }),
    });
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border text-sm font-semibold shadow-sm ${
      done ? "border-emerald-500/40 bg-emerald-500/5" : "border-brand-border/60 bg-brand-card"
    }`}>
      <button
        type="button"
        onClick={matchesMaster ? undefined : resetToMaster}
        disabled={matchesMaster}
        className={`absolute right-3 top-3 rounded-full transition-colors ${
          matchesMaster ? "text-emerald-500" : "text-brand-muted/35"
        } ${matchesMaster ? "cursor-default" : "hover:text-emerald-600"}`}
        title={matchesMaster ? "Matches master settings" : "Reset to run master settings"}
      >
        <CheckCircle2 size={28} fill={matchesMaster ? "currentColor" : "none"} className={matchesMaster ? "text-emerald-500" : ""} />
      </button>
      <div className="grid gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2 pr-9">
          <span className="w-16 shrink-0 font-bold text-brand-text">
            {displayLabel ?? `R${runIdx + 1} S${segIdx + 1}`}
          </span>
          <span
            className={`flex w-[78px] shrink-0 items-center justify-center rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-wide ${
              gate
                ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                : "bg-brand-accent/10 text-brand-accent border border-brand-accent/25"
            }`}
          >
            {gate ? "Gate" : done ? "Done" : "Segment"}
          </span>
          <span className="rounded-full bg-brand-bg/80 px-2.5 py-1 font-bold text-brand-text">
            {((seg.segmentWidthMm ?? 0) / 1000).toFixed(2)}m x {selectedHeight}mm
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
              {gate ? "Configure more gate settings" : "Segment options"}
              {gate ? (
                <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              ) : (
                <Settings2 size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              )}
            </button>
            <button
              type="button"
              onClick={toggleDone}
              className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                done
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700"
                  : "border-brand-border bg-brand-card text-brand-muted hover:border-emerald-500/50 hover:text-emerald-700"
              }`}
            >
              {done ? "Confirmed" : "Segment confirmed"}
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
