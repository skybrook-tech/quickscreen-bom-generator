import { useEffect, useMemo, useState } from "react";
import { cn } from "../../../lib";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import type {
  CanonicalRun,
  CanonicalSegment,
} from "../../../types/canonical.types";
import { SegmentList, type SegmentListFilter } from "../Segment/SegmentList";
import { RunActions } from "./RunActions";
import { RunConfigPanel } from "./RunConfigPanel";
import { RunDefaultsCard } from "./RunDefaultsCard";
import { RunHeader } from "./RunHeader";
import { RunSubHeader, type RunTab } from "./RunSubHeader";
import { useRunSummary } from "./useRunSummary";

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
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<RunTab>("style");
  const [browseTab, setBrowseTab] = useState<BrowseTab>("full");

  useEffect(() => {
    if (state.openRunConfigRunId !== run.runId) return;
    setEditing(true);
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
  const isBayg = runProductCode === "BAYG";

  const fenceCount = run.segments.filter((s) => s.kind === "fence").length;
  const gateCount = run.segments.filter((s) => s.kind === "gate").length;
  const segmentTotal = run.segments.length;
  const browseTabs: Array<{ id: BrowseTab; label: string; count: number }> =
    isBayg
      ? [{ id: "full", label: "Panels", count: fenceCount }]
      : [
          { id: "full", label: "Full run", count: segmentTotal },
          { id: "segments", label: "Segments", count: fenceCount },
          { id: "gates", label: "Gates", count: gateCount },
        ];

  useEffect(() => {
    if (isBayg && activeTab === "posts") setActiveTab("style");
    if (isBayg && browseTab === "gates") setBrowseTab("full");
  }, [activeTab, browseTab, isBayg]);

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
          productCode: runProductCode,
          segmentWidthMm: isBayg ? 1000 : 3000,
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
          productCode: runProductCode,
          segmentWidthMm: isBayg ? 1000 : 3000,
          targetHeightMm: Number(effectiveVars["target_height_mm"] ?? 1800),
          leftTermination: { kind: "system" },
          rightTermination: { kind: "system" },
          confirmed: false,
        };

    dispatch({ type: "UPSERT_SEGMENT", runId: run.runId, segment: base });
  }

  function handleBulkAddPanels(
    count: number,
    widthMm: number,
    heightMm: number,
  ) {
    if (!isBayg) return;
    const startOrder =
      run.segments.length === 0
        ? 0
        : Math.max(...run.segments.map((s) => s.sortOrder)) + 1;

    const segments: CanonicalSegment[] = Array.from({ length: count }, (_, i) => ({
      segmentId: crypto.randomUUID(),
      sortOrder: startOrder + i,
      kind: "fence",
      productCode: runProductCode,
      segmentWidthMm: widthMm,
      targetHeightMm: heightMm,
      leftTermination: { kind: "system" },
      rightTermination: { kind: "system" },
      confirmed: false,
    }));

    const payload = state.payload;
    if (!payload) return;
    dispatch({
      type: "SET_PAYLOAD",
      payload: {
        ...payload,
        runs: payload.runs.map((r) =>
          r.runId === run.runId
            ? { ...r, segments: [...r.segments, ...segments] }
            : r,
        ),
      },
    });
  }

  function handleMatchPanels() {
    if (!isBayg) return;
    const payload = state.payload;
    const firstPanel = [...run.segments]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .find((s) => s.kind === "fence");
    if (!payload || !firstPanel) return;

    dispatch({
      type: "SET_PAYLOAD",
      payload: {
        ...payload,
        runs: payload.runs.map((r) =>
          r.runId === run.runId
            ? {
                ...r,
                segments: r.segments.map((s) =>
                  s.kind === "fence"
                    ? {
                        ...s,
                        productCode: firstPanel.productCode ?? runProductCode,
                        segmentWidthMm: firstPanel.segmentWidthMm,
                        targetHeightMm: firstPanel.targetHeightMm,
                        variables: firstPanel.variables
                          ? { ...firstPanel.variables }
                          : undefined,
                      }
                    : s,
                ),
              }
            : r,
        ),
      },
    });
  }

  return (
    <div
      className="rounded-xl border border-brand-border bg-brand-card overflow-hidden shadow-sm"
      data-testid={`v4-run-card-${run.runId}`}
    >
      <RunHeader
        runId={run.runId}
        index={index}
        displayName={run.displayName}
        systemCode={runProductCode}
        summary={summary}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        compact={!expanded}
        isBayg={isBayg}
      />

      {expanded && (
        <>
          <RunSubHeader
            editing={editing}
            onToggleEditing={() => setEditing((e) => !e)}
            effectiveVars={effectiveVars}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isBayg={isBayg}
          />

          {editing && <RunConfigPanel run={run} activeTab={activeTab} />}

          {!editing && (
            <div className="border-t border-brand-border p-4 pt-1 space-y-3">
          <RunDefaultsCard
            productCode={runProductCode}
            effectiveVars={effectiveVars}
            onEdit={() => setEditing(true)}
            isBayg={isBayg}
          />
          <div className="flex flex-wrap gap-0 -mx-4 px-4 border-b border-brand-border">
            {browseTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBrowseTab(tab.id)}
                className={cn(
                  "py-2 px-3 text-xs font-medium border-b-2 transition-colors -mb-px",
                  browseTab === tab.id
                    ? "border-brand-accent text-brand-accent"
                    : "border-transparent text-neutral-500 hover:text-neutral-300",
                )}
                data-testid={`v4-run-browse-${tab.id}`}
              >
                {tab.label}{" "}
                <span className="tabular-nums opacity-80">({tab.count})</span>
              </button>
            ))}
          </div>
          <SegmentList
            run={run}
            runColorIndex={runColorIndex}
            filter={BROWSE_TAB_FILTER[browseTab]}
            isBayg={isBayg}
          />
          <RunActions
            onAddSegment={handleAddSegment}
            onBulkAdd={handleBulkAddPanels}
            onMatchPanels={handleMatchPanels}
            onAddGate={() => onAddGate(run.runId)}
            onRemoveRun={() =>
              dispatch({ type: "REMOVE_RUN", runId: run.runId })
            }
            canRemove={(state.payload?.runs.length ?? 0) > 1}
            isBayg={isBayg}
            removeSummary={`This will delete Run ${index + 1} with ${fenceCount} ${
              isBayg ? "panel" : "segment"
            }${fenceCount === 1 ? "" : "s"}${
              isBayg ? "" : ` and ${gateCount} gate${gateCount === 1 ? "" : "s"}`
            }. Generated BOM lines for this run will no longer apply.`}
          />
            </div>
          )}
        </>
      )}
    </div>
  );
}
