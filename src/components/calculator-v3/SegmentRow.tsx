import { useState } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import { CheckCircle2, ChevronDown, Settings2, X } from "lucide-react";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { GateSegmentDetails } from "./GateSegmentDetails";
import NumberInput from "../shared/NumberInput";
import {
  GATE_SEGMENT_STUB_KEYS,
  SEGMENT_TERMINATION_KEYS,
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
import { heightOptionsForSystem, maxPanelWidthForSystem } from "../../lib/productOptionRules";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  segIdx: number;
  runIdx: number;
  open: boolean;
  onToggle: () => void;
  displayLabel?: string;
}

const COLOUR_NAMES: Record<string, string> = {
  B: "Black Satin",
  MN: "Monument Matt",
  G: "Woodland Grey Matt",
  SM: "Surfmist Matt",
  W: "Pearl White Gloss",
  BS: "Basalt Satin",
  D: "Dune Satin",
  M: "Mill",
  P: "Primrose",
  PB: "Paperbark",
  S: "Palladium Silver Pearl",
  KWI: "Kwila",
  WRC: "Western Red Cedar",
};

const MOUNTING_LABELS: Record<string, string> = {
  in_ground: "Concreted",
  base_plate: "Base plate",
  core_drill: "Core drill",
};

const POST_SYSTEM_LABELS: Record<string, string> = {
  xpl: "XPress Plus post",
  standard_50: "Standard Post 50mm",
  standard_65: "Standard Post 65mm HD",
};

function colourLabel(code: unknown) {
  const colourCode = String(code ?? "B");
  return COLOUR_NAMES[colourCode] ?? colourCode;
}

function postLabel(productCode: string, variables: Record<string, unknown>) {
  const postSystem = String(
    variables.post_system ?? (productCode === "XPL" ? "xpl" : "standard_50"),
  );
  if (productCode === "XPL" || postSystem === "xpl") {
    return POST_SYSTEM_LABELS[postSystem] ?? "XPress Plus post";
  }
  const postSize = String(variables.post_size ?? "50");
  return postSize === "65" ? "Standard Post 65mm HD" : "Standard Post 50mm";
}

function boolLabel(value: boolean) {
  return value ? "Yes" : "No";
}

function SummaryBit({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <span className={`inline-flex items-baseline gap-1 whitespace-nowrap ${emphasis ? "text-[13px]" : ""}`}>
      <span className="font-semibold text-brand-muted">{label}:</span>
      <strong className={`font-extrabold text-brand-text ${emphasis ? "text-sm" : ""}`}>{value}</strong>
    </span>
  );
}

export function SegmentRow({ runId, seg, segIdx, runIdx, open, onToggle, displayLabel }: Props) {
  const { state, dispatch } = useCalculator();
  const [confirmRemove, setConfirmRemove] = useState(false);
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
  const productCode = run?.productCode ?? state.payload?.productCode ?? "QSHS";
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
  const fenceColour = String(segmentVariables.colour_code ?? "B");
  const postColour = String(segmentVariables.post_colour_code ?? fenceColour);
  const maxSpacing = Number(
    segmentVariables.max_panel_width_mm ?? maxPanelWidthForSystem(productCode),
  );
  const segmentLength = Number(seg.segmentWidthMm ?? 0);
  const panelCount = segmentLength > 0 ? Math.max(1, Math.ceil(segmentLength / Math.max(300, maxSpacing))) : 0;
  const postSpacing = panelCount > 0 ? Math.round(segmentLength / panelCount) : 0;
  const leftKind = String(segmentVariables[SEGMENT_TERMINATION_KEYS.leftKind] ?? "");
  const rightKind = String(segmentVariables[SEGMENT_TERMINATION_KEYS.rightKind] ?? "");
  const hasCornerPost =
    leftKind === "corner" ||
    rightKind === "corner" ||
    Number.isFinite(Number(segmentVariables.geometry_angle_deg));
  const endPostCount =
    (leftKind === "system_post" || leftKind === "" ? 1 : 0) +
    (rightKind === "system_post" || rightKind === "" ? 1 : 0);
  const totalPostCount = panelCount > 0 ? panelCount + 1 : 0;
  const summaryBits = gate
    ? [
        { label: "Length", value: `${(segmentLength / 1000).toFixed(2)}m`, emphasis: true },
        { label: "Height", value: `${selectedHeight}mm`, emphasis: true },
        { label: "System", value: productCode },
        { label: "Colour", value: colourLabel(fenceColour) },
        ...(postColour !== fenceColour ? [{ label: "Post colour", value: colourLabel(postColour) }] : []),
      ]
    : [
        { label: "Length", value: `${(segmentLength / 1000).toFixed(2)}m`, emphasis: true },
        { label: "Height", value: `${selectedHeight}mm`, emphasis: true },
        { label: "System", value: productCode },
        { label: "Colour", value: colourLabel(fenceColour) },
        ...(postColour !== fenceColour ? [{ label: "Post colour", value: colourLabel(postColour) }] : []),
        { label: "Slat", value: `${segmentVariables.slat_size_mm ?? 65}mm` },
        { label: "Gap", value: `${segmentVariables.slat_gap_mm ?? 5}mm` },
        { label: "Post", value: postLabel(productCode, segmentVariables) },
        {
          label: "Mounting",
          value:
            MOUNTING_LABELS[String(segmentVariables.mounting_method ?? segmentVariables.mounting_type ?? "in_ground")] ??
            "Concreted",
        },
        { label: "Post spacing", value: postSpacing > 0 ? `${postSpacing}mm` : "0mm" },
        { label: "Corner post", value: boolLabel(hasCornerPost) },
        { label: "End post", value: endPostCount },
        { label: "Total post", value: totalPostCount },
      ];
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
    <div className="rounded-2xl bg-gradient-to-br from-blue-950 via-blue-600 to-sky-200 p-[2px] shadow-[0_2px_0_rgba(191,219,254,0.75),0_10px_22px_rgba(30,64,175,0.18)]">
    <div className={`relative overflow-hidden rounded-[0.9rem] text-sm font-semibold shadow-inner ${
      done ? "bg-blue-800/5" : "bg-brand-card"
    }`}>
      <button
        type="button"
        onClick={matchesMaster ? undefined : resetToMaster}
        disabled={matchesMaster}
        className={`absolute right-3 top-3 rounded-full transition-colors ${
          matchesMaster ? "text-emerald-500" : "text-brand-muted/35"
        } ${matchesMaster ? "cursor-default" : "hover:text-emerald-600"}`}
        title={matchesMaster ? "matching segment 1" : "Reset to match segment 1"}
      >
        <CheckCircle2 size={28} fill={matchesMaster ? "currentColor" : "none"} className={matchesMaster ? "text-emerald-500" : ""} />
      </button>
      <div className="grid gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2 pr-9">
          <span className="shrink-0 text-xl font-extrabold leading-none tracking-normal text-blue-800">
            {displayLabel ?? `R${runIdx + 1} S${segIdx + 1}`}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] leading-tight">
              {summaryBits.map((item) => (
                <SummaryBit key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>
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
              className={`h-3.5 w-3.5 rounded-full border transition-colors ${
                done
                  ? "border-blue-900 bg-blue-900"
                  : "border-sky-300 bg-sky-200 hover:border-blue-800"
              }`}
              title={done ? "Segment confirmed" : "Mark segment confirmed"}
              aria-label={done ? "Segment confirmed" : "Mark segment confirmed"}
            />
            <button
              type="button"
              onClick={() => {
                if (!confirmRemove) {
                  setConfirmRemove(true);
                  return;
                }
                dispatch({
                  type: "REMOVE_SEGMENT",
                  runId,
                  segmentId: seg.segmentId,
                });
              }}
              onBlur={() => setConfirmRemove(false)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                confirmRemove
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "text-red-500 hover:bg-red-500/10 hover:text-red-700"
              }`}
              aria-label={confirmRemove ? "Click again to remove segment" : "Remove segment"}
              title={confirmRemove ? "Click again to remove segment" : "Remove segment"}
            >
              <X size={18} strokeWidth={3} />
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold text-brand-muted">Length (m)</span>
              <NumberInput
                value={parseFloat(((seg.segmentWidthMm ?? 0) / 1000).toFixed(2))}
                step={0.01}
                min={0}
                className="w-24 px-2 py-1.5 text-center tabular-nums"
                onChange={(v) => updateGeometry("segmentWidthMm", Math.round(Number(v) * 1000))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold text-brand-muted">Height (mm)</span>
              {heightOptions.length > 0 ? (
                <select
                  value={selectedHeight}
                  onChange={(event) =>
                    updateGeometry("targetHeightMm", Number(event.target.value))
                  }
                  className="w-28 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
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
                  className="w-24 px-2 py-1.5 text-center tabular-nums"
                  onChange={(v) => updateGeometry("targetHeightMm", Number(v))}
                />
              )}
            </label>
          </div>
          {gate ? (
            <GateSegmentDetails runId={runId} seg={seg} />
          ) : (
            <FenceSegmentDetails runId={runId} seg={seg} />
          )}
        </div>
      )}
    </div>
    </div>
  );
}
