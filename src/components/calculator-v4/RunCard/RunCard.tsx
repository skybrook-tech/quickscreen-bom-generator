import { useEffect, useMemo, useRef, useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useUndoToast } from "../../../hooks/useUndoToast";
import type {
  CanonicalRun,
  CanonicalSegment,
} from "../../../types/canonical.types";
import { SegmentList, type SegmentListFilter } from "../Segment/SegmentList";
import { RunActions } from "./RunActions";
import { MasterFenceVariableSeeds } from "./MasterFenceVariableSeeds";
import { RunHeader } from "./RunHeader";
import { RunSubHeader } from "./RunSubHeader";
import { useRunSummary } from "./useRunSummary";
import { Tabs } from "../shared/Tabs";
import { isCustomCalculator } from "../../../lib/customCalculators";
import { useProductVariables } from "../../../hooks/useProductVariables";
import { SchemaDrivenFormV4 } from "./SchemaDrivenFormV4";
import { Sparkles } from "lucide-react";

interface Props {
  run: CanonicalRun;
  index: number;
  /** 0-based index — matches canvas non-boundary run colour cycle */
  runColorIndex: number;
  onAddGate: (runId: string) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** Ensures the card is expanded (e.g. when opening run config for a new run). */
  expandRun?: () => void;
}

type BrowseTab = "full" | "segments" | "gates";

const BROWSE_TAB_FILTER: Record<BrowseTab, SegmentListFilter> = {
  full: "all",
  segments: "fence",
  gates: "gate",
};

export function RunCard({
  run,
  index,
  runColorIndex,
  onAddGate,
  expanded,
  onToggleExpanded,
  expandRun,
}: Props) {
  const { state, dispatch } = useCalculatorV4();
  const [browseTab, setBrowseTab] = useState<BrowseTab>("full");

  useEffect(() => {
    if (state.openRunConfigRunId !== run.runId) return;
    expandRun?.();
    dispatch({ type: "CLEAR_OPEN_RUN_CONFIG" });
  }, [state.openRunConfigRunId, run.runId, dispatch, expandRun]);

  const effectiveVars = useMemo(
    () => ({
      ...(state.payload?.variables ?? {}),
      ...(run.variables ?? {}),
    }),
    [state.payload?.variables, run.variables],
  );

  const summary = useRunSummary(run, effectiveVars);
  const runProductCode = run.productCode ?? "—";
  const fenceProductCode =
    run.productCode ?? state.payload?.productCode ?? "";

  const { data: jobFields = [] } = useProductVariables(fenceProductCode, "job");
  const isCustom = isCustomCalculator(fenceProductCode);

  const fenceCount = run.segments.filter((s) => s.kind === "fence").length;
  const gateCount = run.segments.filter((s) => s.kind === "gate").length;
  const segmentTotal = run.segments.length;
  const canRemoveRun = (state.payload?.runs.length ?? 0) > 1;
  const removedPayloadRef = useRef<typeof state.payload>(null);

  const { trigger: triggerRemoveUndo } = useUndoToast(
    `Run ${index + 1} removed`,
    () => {
      if (removedPayloadRef.current) {
        dispatch({ type: "SET_PAYLOAD", payload: removedPayloadRef.current });
      }
    },
    6000,
  );

  function handleRemoveRun() {
    removedPayloadRef.current = state.payload;
    dispatch({ type: "REMOVE_RUN", runId: run.runId });
    triggerRemoveUndo();
  }

  function handleAddSegment() {
    const sorted = [...run.segments].sort((a, b) => a.sortOrder - b.sortOrder);
    const prevFence = [...sorted].reverse().find((s) => s.kind === "fence");
    const prev = prevFence ?? sorted[sorted.length - 1];
    const sortOrder = run.segments.length;

    const base: CanonicalSegment = prev
      ? {
        segmentId: crypto.randomUUID(),
        sortOrder,
        kind: "fence",
        productCode: fenceProductCode,
        segmentWidthMm: 3000,
        targetHeightMm:
          prev.targetHeightMm ??
          Number(effectiveVars["target_height_mm"] ?? 1800),
        leftTermination: structuredClone(prev.leftTermination),
        rightTermination: structuredClone(prev.rightTermination),
        confirmed: false,
      }
      : {
        segmentId: crypto.randomUUID(),
        sortOrder,
        kind: "fence",
        productCode: fenceProductCode,
        segmentWidthMm: 3000,
        targetHeightMm: Number(effectiveVars["target_height_mm"] ?? 1800),
        leftTermination: { kind: "system" },
        rightTermination: { kind: "system" },
        confirmed: false,
      };

    dispatch({ type: "UPSERT_SEGMENT", runId: run.runId, segment: base });
  }

  const tabs = [
    { id: "full", label: "Full run", count: segmentTotal },
    { id: "segments", label: "Segments", count: fenceCount },
    { id: "gates", label: "Gates", count: gateCount },
  ];

  return (
    <div
      className="rounded-[var(--brand-radius)] border border-brand-border bg-brand-card overflow-hidden shadow-sm"
      data-testid={`v4-run-card-${run.runId}`}
    >
      <MasterFenceVariableSeeds run={run} />

      <RunHeader
        runId={run.runId}
        index={index}
        runColorIndex={runColorIndex}
        displayName={run.displayName}
        systemCode={runProductCode}
        summary={summary}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        showProductSelect={expanded}
        canRemoveRun={canRemoveRun}
        onRemoveRun={handleRemoveRun}
      />

      {expanded && (
        <>
          <RunSubHeader
            effectiveVars={effectiveVars}
            productCode={fenceProductCode || null}
          />

          {isCustom && (
            <div className="px-4 py-3 border-t border-brand-border bg-slate-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                  Run Settings Defaults
                </h4>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "OPEN_LOGIC_EDITOR", productCode: fenceProductCode })}
                  className="text-xs text-brand-accent hover:text-brand-accent/80 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles size={12} /> Edit Calculator Logic
                </button>
              </div>
              {jobFields.length > 0 ? (
                <SchemaDrivenFormV4
                  fields={jobFields}
                  variables={run.variables ?? {}}
                  onChange={(key, value) => {
                    dispatch({
                      type: "UPSERT_RUN_VARIABLES",
                      runId: run.runId,
                      variables: { [key]: value },
                    });
                  }}
                />
              ) : (
                <p className="text-xs text-brand-muted italic">
                  No variables defined. Click "Edit Calculator Logic" to add options.
                </p>
              )}
            </div>
          )}

          <div className="border-t border-brand-border  pt-1">
            <Tabs tabs={tabs} activeId={browseTab} onChange={(id) => setBrowseTab(id as BrowseTab)} />

            <SegmentList
              run={run}
              runColorIndex={runColorIndex}
              filter={BROWSE_TAB_FILTER[browseTab]}
            />
            <RunActions
              onAddSegment={handleAddSegment}
              onAddGate={() => onAddGate(run.runId)}
              onRemoveRun={handleRemoveRun}
              canRemove={canRemoveRun}
            />
          </div>
        </>
      )}
    </div>
  );
}
