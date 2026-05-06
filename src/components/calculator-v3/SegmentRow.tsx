import { useState } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import { CheckCircle2, SlidersHorizontal, X } from "lucide-react";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { GateSegmentDetails } from "./GateSegmentDetails";
import NumberInput from "../shared/NumberInput";
import {
  GATE_SEGMENT_STUB_KEYS,
  SEGMENT_TERMINATION_KEYS,
  patchSegmentVariables,
} from "../../lib/segmentTermination";
import {
  defaultGateBuildForMovement,
  gateMovementOrDefault,
} from "../../lib/gateOptionRules";
import {
  clampPostSpacing,
  heightOptionsForSystem,
  maxPanelWidthForSystem,
} from "../../lib/productOptionRules";
import { colourName } from "./ColourPalette";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  segIdx: number;
  runIdx: number;
  open: boolean;
  onToggle: () => void;
  displayLabel?: string;
}

const MOUNTING_LABELS: Record<string, string> = {
  in_ground: "Concreted",
  base_plate: "Base plate",
  core_drill: "Core drill",
};

const POST_SYSTEM_LABELS: Record<string, string> = {
  xpl: "XPress Plus post",
  standard_50: "50mm Post Standard",
  standard_65: "65mm Post Standard HD",
};

function postLabel(productCode: string, variables: Record<string, unknown>) {
  const postSystem = String(
    variables.post_system ?? (productCode === "XPL" ? "xpl" : "standard_50"),
  );
  if (productCode === "XPL" || postSystem === "xpl") {
    return POST_SYSTEM_LABELS[postSystem] ?? "XPress Plus post";
  }
  const postSize = String(variables.post_size ?? "50");
  return postSize === "65" ? "65mm Post Standard HD" : "50mm Post Standard";
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

function sameValue(left: unknown, right: unknown) {
  if (left === undefined || left === null || left === "") {
    return right === undefined || right === null || right === "";
  }
  return String(left) === String(right ?? "");
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
  const maxSpacing = clampPostSpacing(
    segmentVariables.max_panel_width_mm ?? maxPanelWidthForSystem(productCode),
    maxPanelWidthForSystem(productCode),
  );
  const segmentLength = Number(seg.segmentWidthMm ?? 0);
  const panelCount = segmentLength > 0 ? Math.max(1, Math.ceil(segmentLength / maxSpacing)) : 0;
  const leftKind = String(segmentVariables[SEGMENT_TERMINATION_KEYS.leftKind] ?? "");
  const rightKind = String(segmentVariables[SEGMENT_TERMINATION_KEYS.rightKind] ?? "");
  const hasCornerPost =
    leftKind === "corner" ||
    rightKind === "corner" ||
    Number.isFinite(Number(segmentVariables.geometry_angle_deg));
  const endPostCount =
    (leftKind === "system_post" || leftKind === "" ? 1 : 0) +
    (rightKind === "system_post" || rightKind === "" ? 1 : 0);
  const gateVars = seg.variables ?? {};
  const gateBuild = String(
    gateVars[GATE_SEGMENT_STUB_KEYS.gateBuild] ??
      (productCode === "VS" ? "qsg_hinged_vertical" : "qsg_hinged_horizontal"),
  );
  const expectedGateBuild = productCode === "VS"
    ? gateBuild.includes("vertical")
    : !gateBuild.includes("vertical");
  const done = seg.variables?.segment_done === true;
  const compactLabel =
    displayLabel?.replace(/\s+/g, "") ??
    `R${runIdx + 1}${gate ? "G" : "S"}${segIdx + 1}`;
  const titleLabel = gate
    ? `Run ${runIdx + 1} Gate ${segIdx + 1}`
    : `Run ${runIdx + 1} Segment ${segIdx + 1}`;
  const matchesMaster = (() => {
    if (!run) return true;
    if (gate) {
      return (
        expectedGateBuild &&
        Number(seg.targetHeightMm ?? gateVars[GATE_SEGMENT_STUB_KEYS.gateHeightMm] ?? 0) ===
          Number(firstFenceSegment?.targetHeightMm ?? masterVariables.target_height_mm ?? 0)
      );
    }
    if (seg.segmentId === firstFenceSegment?.segmentId) return true;
    const vars = seg.variables ?? {};
    const segmentHeight = Number(seg.targetHeightMm ?? vars.target_height_mm ?? 0);
    const masterSegmentHeight = Number(firstFenceSegment?.targetHeightMm ?? masterVariables.target_height_mm ?? 0);
    if (segmentHeight !== masterSegmentHeight) return false;
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
      SEGMENT_TERMINATION_KEYS.leftKind,
      SEGMENT_TERMINATION_KEYS.leftCornerDegrees,
      SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype,
      SEGMENT_TERMINATION_KEYS.rightKind,
      SEGMENT_TERMINATION_KEYS.rightCornerDegrees,
      SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype,
    ];
    return keys.every((key) => vars[key] === undefined || sameValue(vars[key], masterVariables[key]));
  })();
  const masterFenceColour = String(masterVariables.colour_code ?? "B");
  const masterPostColour = String(masterVariables.post_colour_code ?? masterFenceColour);
  const masterMaxSpacing = clampPostSpacing(
    masterVariables.max_panel_width_mm ?? maxPanelWidthForSystem(productCode),
    maxPanelWidthForSystem(productCode),
  );
  const masterSegmentLength = Number(firstFenceSegment?.segmentWidthMm ?? 0);
  const masterPanelCount =
    masterSegmentLength > 0 ? Math.max(1, Math.ceil(masterSegmentLength / masterMaxSpacing)) : 0;
  const masterLeftKind = String(masterVariables[SEGMENT_TERMINATION_KEYS.leftKind] ?? "");
  const masterRightKind = String(masterVariables[SEGMENT_TERMINATION_KEYS.rightKind] ?? "");
  const masterHasCornerPost =
    masterLeftKind === "corner" ||
    masterRightKind === "corner" ||
    Number.isFinite(Number(masterVariables.geometry_angle_deg));
  const masterEndPostCount =
    (masterLeftKind === "system_post" || masterLeftKind === "" ? 1 : 0) +
    (masterRightKind === "system_post" || masterRightKind === "" ? 1 : 0);
  const summaryBitsBase = [
    { label: "Length", value: `${(segmentLength / 1000).toFixed(2)}m`, emphasis: true },
  ];
  const rawDifferenceBits = gate
    ? [
        {
          label: "Height",
          value: `${selectedHeight}mm`,
          changed: !sameValue(
            selectedHeight,
            firstFenceSegment?.targetHeightMm ?? masterVariables.target_height_mm ?? 1800,
          ),
        },
        {
          label: "Gate style",
          value: gateBuild.includes("vertical") ? "Vertical slat" : "Horizontal slat",
          changed: !expectedGateBuild,
        },
        {
          label: "Colour",
          value: colourName(fenceColour),
          changed: !sameValue(fenceColour, masterFenceColour),
        },
        {
          label: "Slat",
          value: `${segmentVariables[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? masterVariables.slat_size_mm ?? 65}mm`,
          changed: !sameValue(
            segmentVariables[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? masterVariables.slat_size_mm ?? 65,
            masterVariables.slat_size_mm ?? 65,
          ),
        },
        {
          label: "Gap",
          value: `${segmentVariables[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? masterVariables.slat_gap_mm ?? 9}mm`,
          changed: !sameValue(
            segmentVariables[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? masterVariables.slat_gap_mm ?? 9,
            masterVariables.slat_gap_mm ?? 9,
          ),
        },
        ...(postColour !== fenceColour
          ? [
              {
                label: "Post colour",
                value: colourName(postColour),
                changed: !sameValue(postColour, masterPostColour),
              },
            ]
          : []),
      ]
    : [
        {
          label: "Height",
          value: `${selectedHeight}mm`,
          changed: !sameValue(
            selectedHeight,
            firstFenceSegment?.targetHeightMm ?? masterVariables.target_height_mm ?? 1800,
          ),
        },
        {
          label: "System",
          value: productCode,
          changed: !sameValue(productCode, run?.productCode ?? state.payload?.productCode ?? "QSHS"),
        },
        { label: "Colour", value: colourName(fenceColour), changed: !sameValue(fenceColour, masterFenceColour) },
        ...(postColour !== fenceColour
          ? [
              {
                label: "Post colour",
                value: colourName(postColour),
                changed: !sameValue(postColour, masterPostColour),
              },
            ]
          : []),
        {
          label: "Slat",
          value: `${segmentVariables.slat_size_mm ?? 65}mm`,
          changed: !sameValue(segmentVariables.slat_size_mm ?? 65, masterVariables.slat_size_mm ?? 65),
        },
        {
          label: "Gap",
          value: `${segmentVariables.slat_gap_mm ?? 5}mm`,
          changed: !sameValue(segmentVariables.slat_gap_mm ?? 5, masterVariables.slat_gap_mm ?? 5),
        },
        {
          label: "Post",
          value: postLabel(productCode, segmentVariables),
          changed:
            !sameValue(segmentVariables.post_system, masterVariables.post_system) ||
            !sameValue(segmentVariables.post_size ?? 50, masterVariables.post_size ?? 50),
        },
        {
          label: "Mounting",
          value:
            MOUNTING_LABELS[String(segmentVariables.mounting_method ?? segmentVariables.mounting_type ?? "in_ground")] ??
            "Concreted",
          changed:
            !sameValue(segmentVariables.mounting_method ?? segmentVariables.mounting_type ?? "in_ground",
              masterVariables.mounting_method ?? masterVariables.mounting_type ?? "in_ground"),
        },
        { label: "Panel Count", value: panelCount, changed: !sameValue(panelCount, masterPanelCount) },
        { label: "Max Post Spacing", value: `${maxSpacing}mm`, changed: !sameValue(maxSpacing, masterMaxSpacing) },
        { label: "Corner post", value: boolLabel(hasCornerPost), changed: hasCornerPost !== masterHasCornerPost },
        { label: "End post", value: endPostCount, changed: !sameValue(endPostCount, masterEndPostCount) },
      ];
  const differenceBits =
    matchesMaster ? [] : rawDifferenceBits.filter((item) => item.changed);
  const summaryBits = [...summaryBitsBase, ...differenceBits];
  const visibleSettings = rawDifferenceBits.filter((item) => item.label !== "Height");

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

  function setMapHover(value: string | null) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("qsbom:hover-map-label", { detail: value }),
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-primary via-brand-primary/70 to-brand-primary/15 p-[2px] shadow-[0_2px_0_rgba(191,219,254,0.75),0_10px_22px_rgba(30,64,175,0.18)]">
    <div className={`relative overflow-hidden rounded-[0.9rem] text-sm font-semibold shadow-inner ${
      done ? "bg-brand-primary/5" : "bg-brand-card"
    } cursor-pointer`}
      onDoubleClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button,input,select,textarea,a")) return;
        onToggle();
      }}
      title="Double-click to edit options"
    >
      <div className="grid grid-cols-[2.4rem_minmax(0,1fr)] gap-3 p-3">
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={matchesMaster ? undefined : resetToMaster}
            disabled={matchesMaster}
            className={`rounded-full transition-colors ${
              matchesMaster ? "text-brand-success" : "text-brand-muted/35"
            } ${matchesMaster ? "cursor-default" : "hover:text-brand-success"}`}
            title={matchesMaster ? "matching segment 1" : "Reset to match segment 1"}
          >
            <CheckCircle2
              size={20}
              fill={matchesMaster ? "currentColor" : "none"}
              className={matchesMaster ? "text-brand-success" : ""}
            />
          </button>
          <span className="text-xl font-black leading-none tracking-normal text-black">
            <span
              onMouseEnter={() => setMapHover(compactLabel)}
              onMouseLeave={() => setMapHover(null)}
              title="Hover to highlight this segment on the map"
            >
              {compactLabel}
            </span>
          </span>
          <button
            type="button"
            onClick={toggleDone}
            className={`h-3.5 w-3.5 rounded-full border transition-colors ${
              done
                ? "border-brand-primary/90 bg-brand-primary/90"
                : "border-brand-primary/30 bg-brand-primary/15 hover:border-brand-primary"
            }`}
            title={done ? "Segment confirmed" : "Mark segment confirmed"}
            aria-label={done ? "Segment confirmed" : "Mark segment confirmed"}
          />
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0 font-serif text-2xl font-black leading-tight tracking-normal text-black">
              {titleLabel}
            </span>
            <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggle}
              className={`inline-flex h-8 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-extrabold transition-colors ${
                open
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary"
              }`}
              aria-label={open ? "Collapse segment settings" : "Expand segment settings"}
              title={open ? "Save settings and collapse" : "Open settings"}
            >
              <SlidersHorizontal size={16} />
              {open ? "Save" : "Settings"}
            </button>
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
                  ? "bg-brand-danger text-white hover:bg-brand-danger/90"
                  : "text-brand-danger hover:bg-brand-danger/10 hover:text-brand-danger/90"
              }`}
              aria-label={confirmRemove ? "Click again to remove segment" : "Remove segment"}
              title={confirmRemove ? "Click again to remove segment" : "Remove segment"}
            >
              <X size={16} strokeWidth={3} />
            </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] leading-tight">
            {summaryBits.map((item) => (
              <SummaryBit
                key={item.label}
                label={item.label}
                value={item.value}
                emphasis={"emphasis" in item ? item.emphasis : undefined}
              />
            ))}
          </div>

        </div>
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
          <div className="rounded-lg border border-brand-border/60 bg-brand-card/70 p-3">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-muted">
              Current settings
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-tight">
              {visibleSettings.map((item) => (
                <SummaryBit key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
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
