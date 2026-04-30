import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Plus, Trash2 } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { defaultGateVariables } from "../../lib/gateOptionRules";
import { calcRunStats } from "../../lib/runStats";
import {
  initialVariablesForSystem,
  maxPanelWidthForSystem,
  normaliseVariablesForSystem,
} from "../../lib/productOptionRules";
import { Button } from "../shared/Button";
import { SegmentRow } from "./SegmentRow";

const GATE_PRODUCT_CODE = "QS_GATE";

interface Props {
  run: CanonicalRun;
  runIdx: number;
}

const calcTotalLength = (run: CanonicalRun) =>
  run.segments.reduce((acc, seg) => acc + (seg.segmentWidthMm ?? 0), 0);

const MOUNTING_LABELS: Record<string, string> = {
  in_ground: "Concreted in ground",
  base_plate: "Base-plated to slab",
  core_drill: "Core-drilled into concrete",
};

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

const POST_SYSTEM_LABELS: Record<string, string> = {
  xpl: "XPress Plus post",
  standard_50: "Standard Post 50mm",
  standard_65: "Standard Post 65mm HD",
};

function postSummaryLabel(productCode: string, variables: Record<string, unknown>) {
  const postSystem = String(
    variables.post_system ?? (productCode === "XPL" ? "xpl" : "standard_50"),
  );
  if (productCode === "XPL") {
    return POST_SYSTEM_LABELS[postSystem] ?? "XPress Plus post";
  }
  const postSize = String(variables.post_size ?? "50");
  return postSize === "65" ? "Standard Post 65mm HD" : "Standard Post 50mm";
}

function colourLabel(code: unknown) {
  const colourCode = String(code ?? "B");
  return COLOUR_NAMES[colourCode] ? `${COLOUR_NAMES[colourCode]} (${colourCode})` : colourCode;
}

function actualFenceHeightMm(productCode: string, variables: Record<string, unknown>) {
  const targetHeight = Number(variables.target_height_mm ?? 1800);
  if (productCode === "VS") return targetHeight;
  const slatSize = Number(variables.slat_size_mm ?? 65);
  const slatGap = Number(variables.slat_gap_mm ?? 5);
  const slatDesignWidth = slatSize === 90 ? 90.3 : 65.3;
  const numSlats = Math.max(
    1,
    Math.floor((targetHeight + slatGap - 3) / (slatDesignWidth + slatGap)),
  );
  return Math.round(numSlats * (slatDesignWidth + slatGap) - slatGap + 3);
}

function panelLengthSummary(run: CanonicalRun, jobMaxPanelWidth: number) {
  const lengths = run.segments
    .filter((segment) => segment.segmentKind !== "gate_opening" && Number(segment.segmentWidthMm ?? 0) > 0)
    .flatMap((segment) => {
      const maxPanelWidth = Math.max(
        300,
        Number(segment.variables?.max_panel_width_mm ?? jobMaxPanelWidth),
      );
      const panels = Math.max(1, Math.ceil(Number(segment.segmentWidthMm ?? 0) / maxPanelWidth));
      const panelWidth = Number(segment.segmentWidthMm ?? 0) / panels;
      return Array.from({ length: panels }, () => Math.round(panelWidth));
    });

  const counts = new Map<number, number>();
  for (const length of lengths) counts.set(length, (counts.get(length) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([length, count]) => `${count} x ${(length / 1000).toFixed(2)}m`)
    .join(", ");
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-bg/80 px-2.5 py-1">
      <strong className="font-bold text-brand-text">{label}:</strong>
      <span className="font-semibold text-brand-muted">{value}</span>
    </span>
  );
}

function firstFenceSegment(run: CanonicalRun) {
  return run.segments.find((segment) => segment.segmentKind !== "gate_opening");
}

function runMasterVariables(
  run: CanonicalRun,
  jobVariables: Record<string, string | number | boolean> | undefined,
) {
  const firstSegment = firstFenceSegment(run);
  return {
    ...(jobVariables ?? {}),
    ...(run.variables ?? {}),
    ...(firstSegment?.variables ?? {}),
  };
}

function masterSummaryItems(productCode: string, variables: Record<string, unknown>) {
  const height = actualFenceHeightMm(productCode, variables);
  return [
    { label: "System type", value: productCode },
    { label: "Height", value: `${height}mm` },
    { label: "Fence colour", value: colourLabel(variables.colour_code) },
    { label: "Post colour", value: colourLabel(variables.post_colour_code ?? variables.colour_code) },
    { label: "Slat", value: `${variables.slat_size_mm ?? 65}mm` },
    { label: "Gap", value: `${variables.slat_gap_mm ?? 5}mm` },
    { label: "Post", value: postSummaryLabel(productCode, variables) },
    {
      label: "Mounting",
      value:
        MOUNTING_LABELS[String(variables.mounting_method ?? variables.mounting_type ?? "in_ground")] ??
        "Concreted in ground",
    },
    {
      label: "Max post spacing",
      value: `${variables.max_panel_width_mm ?? maxPanelWidthForSystem(productCode)}mm`,
    },
  ];
}

export function RunCard({ run, runIdx }: Props) {
  const { state, dispatch } = useCalculator();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runVariables = useMemo(
    () => runMasterVariables(run, state.payload?.variables),
    [run, state.payload?.variables],
  );
  const jobMax = Number(
    runVariables.max_panel_width_mm ?? maxPanelWidthForSystem(run.productCode),
  );
  const stats = calcRunStats(run, jobMax);
  const panelLengths = panelLengthSummary(run, jobMax);
  const fenceSegments = run.segments.filter((segment) => segment.segmentKind !== "gate_opening");
  const gates = run.segments.filter((segment) => segment.segmentKind === "gate_opening");
  const matchesRunOne = run.variables?.settings_mode === "match_run_1";
  const completedSegments = run.segments.filter(
    (segment) => segment.variables?.segment_done === true,
  ).length;

  function toggleRunOneSettings() {
    const runOne = state.payload?.runs[0];
    if (!runOne || runOne.runId === run.runId) return;
    if (matchesRunOne) {
      dispatch({
        type: "UPSERT_RUN",
        run: {
          ...run,
          variables: normaliseVariablesForSystem(run.productCode, {
            ...initialVariablesForSystem(run.productCode),
            settings_mode: "default",
          }),
        },
      });
      return;
    }
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        productCode: runOne.productCode,
        variables: normaliseVariablesForSystem(runOne.productCode, {
          ...(runOne.variables ?? {}),
          settings_mode: "match_run_1",
        }),
        leftBoundary: runOne.leftBoundary,
        rightBoundary: runOne.rightBoundary,
      },
    });
  }

  function upsertSegment(segment: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId: run.runId, segment });
  }

  function addFenceSegment() {
    const firstSegment = firstFenceSegment(run);
    const inheritedVariables = firstSegment?.variables
      ? Object.fromEntries(
          Object.entries(firstSegment.variables).filter(
            ([key]) => !["geometry_angle_deg", "segment_done"].includes(key),
          ),
        )
      : undefined;
    upsertSegment({
      segmentId: crypto.randomUUID(),
      sortOrder: run.segments.length + 1,
      segmentKind: "panel",
      segmentWidthMm: jobMax,
      targetHeightMm: Number(firstSegment?.targetHeightMm ?? runVariables.target_height_mm ?? 1800),
      variables: inheritedVariables
        ? { ...inheritedVariables, segment_done: false }
        : undefined,
    });
  }

  function addGateSegment() {
    const firstSegment = firstFenceSegment(run);
    const masterVariables = runMasterVariables(run, state.payload?.variables);
    const targetHeight = Number(firstSegment?.targetHeightMm ?? masterVariables.target_height_mm ?? 1800);
    const segmentId = crypto.randomUUID();
    upsertSegment({
      segmentId,
      sortOrder: run.segments.length + 1,
      segmentKind: "gate_opening",
      segmentWidthMm: 900,
      targetHeightMm: targetHeight,
      gateProductCode: GATE_PRODUCT_CODE,
      variables: defaultGateVariables({ ...masterVariables, productCode: run.productCode }, targetHeight),
    });
    setExpandedId(segmentId);
  }

  return (
    <div className="rounded-2xl border border-brand-border/70 bg-brand-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h3 className="grid gap-1 text-brand-text">
          <span className="text-3xl font-extrabold leading-tight tracking-normal">
            Run {runIdx + 1}
          </span>
          <span className="text-sm font-bold text-brand-text">
            Total Length : {(calcTotalLength(run) / 1000).toFixed(2)}m, Segments : {fenceSegments.length}, Gates {gates.length}
          </span>
          <span className="text-sm italic text-brand-muted">Master Settings for Run {runIdx + 1}</span>
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {runIdx > 0 && (
            <Button
              onClick={toggleRunOneSettings}
              icon={Copy}
              variant={matchesRunOne ? "primary" : "ghost"}
              size="small"
            >
              {matchesRunOne ? "Default settings" : "Match run 1"}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-sm font-semibold">
        {masterSummaryItems(run.productCode, runVariables).map((item) => (
          <SummaryItem key={item.label} label={item.label} value={item.value} />
        ))}
        <SummaryItem label="Corners" value={run.corners.length} />
        <SummaryItem label="Segments" value={fenceSegments.length} />
        <SummaryItem label="Done" value={`${completedSegments}/${run.segments.length}`} />
        {stats.panels > 0 && <SummaryItem label="Panels" value={stats.panels} />}
        {panelLengths && <SummaryItem label="Panel lengths" value={panelLengths} />}
        {stats.posts > 0 && <SummaryItem label="Posts" value={stats.posts} />}
      </div>

      {run.segments.length === 0 && (
        <p className="mb-3 text-xs italic text-brand-muted">
          No segments yet. Draw on canvas or add manually.
        </p>
      )}

      <div className="space-y-2">
        {run.segments
          .filter((segment) => segment.segmentKind !== "gate_opening")
          .map((seg, segIdx) => (
            <SegmentRow
              key={seg.segmentId}
              runId={run.runId}
              seg={seg}
              segIdx={segIdx}
              runIdx={runIdx}
              displayLabel={`R${runIdx + 1} S${segIdx + 1}`}
              open={expandedId === seg.segmentId}
              onToggle={() =>
                setExpandedId((id) => (id === seg.segmentId ? null : seg.segmentId))
              }
            />
          ))}
        {run.segments.some((segment) => segment.segmentKind === "gate_opening") && (
          <div className="pt-2">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-muted">
              <CheckCircle2 size={15} />
              Gates
            </p>
            <div className="space-y-2">
              {run.segments
                .filter((segment) => segment.segmentKind === "gate_opening")
                .map((seg, gateIdx) => (
                  <SegmentRow
                    key={seg.segmentId}
                    runId={run.runId}
                    seg={seg}
                    segIdx={gateIdx}
                    runIdx={runIdx}
                    displayLabel={`R${runIdx + 1} G${gateIdx + 1}`}
                    open={expandedId === seg.segmentId}
                    onToggle={() =>
                      setExpandedId((id) => (id === seg.segmentId ? null : seg.segmentId))
                    }
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button onClick={addFenceSegment} icon={Plus} variant="ghost" size="small">
          Add segment
        </Button>
        <Button onClick={addGateSegment} icon={Plus} variant="ghost" size="small">
          Add gate
        </Button>
        <Button
          onClick={() => dispatch({ type: "REMOVE_RUN", runId: run.runId })}
          icon={Trash2}
          variant="ghost-danger"
          size="small"
        >
          Remove run
        </Button>
      </div>
    </div>
  );
}
