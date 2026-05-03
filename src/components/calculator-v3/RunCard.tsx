import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Plus, Trash2 } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { defaultGateVariables } from "../../lib/gateOptionRules";
import {
  clampPostSpacing,
  initialVariablesForSystem,
  maxPanelWidthForSystem,
  normaliseVariablesForSystem,
} from "../../lib/productOptionRules";
import { calcRunStats } from "../../lib/runStats";
import { Button } from "../shared/Button";
import { SegmentRow } from "./SegmentRow";

const GATE_PRODUCT_CODE = "QS_GATE";

interface Props {
  run: CanonicalRun;
  runIdx: number;
}

const calcTotalLength = (run: CanonicalRun) =>
  run.segments.reduce((acc, seg) => acc + (seg.segmentWidthMm ?? 0), 0);

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

export function RunCard({ run, runIdx }: Props) {
  const { state, dispatch } = useCalculator();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runVariables = useMemo(
    () => runMasterVariables(run, state.payload?.variables),
    [run, state.payload?.variables],
  );
  const jobMax = clampPostSpacing(
    runVariables.max_panel_width_mm ?? maxPanelWidthForSystem(run.productCode),
    maxPanelWidthForSystem(run.productCode),
  );
  const fenceSegments = run.segments.filter((segment) => segment.segmentKind !== "gate_opening");
  const gates = run.segments.filter((segment) => segment.segmentKind === "gate_opening");
  const runStats = useMemo(() => calcRunStats(run, jobMax), [run, jobMax]);
  const matchesRunOne = run.variables?.settings_mode === "match_run_1";

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
            Total Length : {(calcTotalLength(run) / 1000).toFixed(2)}m, Segments : {fenceSegments.length}, Gates {gates.length}, Total Post : {runStats.posts}
          </span>
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
              displayLabel={`R${runIdx + 1}S${segIdx + 1}`}
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
                    displayLabel={`R${runIdx + 1}G${gateIdx + 1}`}
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
