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
import { RunHeader } from "./RunHeader";
import { RunSubHeader, type RunTab } from "./RunSubHeader";
import { useRunSummary } from "./useRunSummary";

interface Props {
  run: CanonicalRun;
  index: number;
  /** 0-based index — matches canvas non-boundary run colour cycle */
  runColorIndex: number;
  onAddGate: (runId: string) => void;
}

type BrowseTab = "full" | "segments" | "gates";

const BROWSE_TAB_FILTER: Record<BrowseTab, SegmentListFilter> = {
  full: "all",
  segments: "fence",
  gates: "gate",
};

export function RunCard({ run, index, runColorIndex, onAddGate }: Props) {
  const { state, dispatch } = useCalculatorV4();
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<RunTab>("style");
  const [browseTab, setBrowseTab] = useState<BrowseTab>("full");

  useEffect(() => {
    if (state.openRunConfigRunId !== run.runId) return;
    setEditing(true);
    dispatch({ type: "CLEAR_OPEN_RUN_CONFIG" });
  }, [state.openRunConfigRunId, run.runId, dispatch]);

  const effectiveVars = useMemo(
    () => ({
      ...(state.payload?.variables ?? {}),
      ...(run.variables ?? {}),
    }),
    [state.payload?.variables, run.variables],
  );

  const summary = useRunSummary(run, effectiveVars);
  const runProductCode = run.productCode ?? "—";

  const fenceCount = run.segments.filter((s) => s.kind === "fence").length;
  const gateCount = run.segments.filter((s) => s.kind === "gate").length;
  const segmentTotal = run.segments.length;

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
          segmentWidthMm: 3000,
          targetHeightMm:
            prev.targetHeightMm ??
            Number(effectiveVars["target_height_mm"] ?? 1800),
          leftTermination: structuredClone(prev.leftTermination),
          rightTermination: structuredClone(prev.rightTermination),
          variables: prev.variables ? { ...prev.variables } : undefined,
          confirmed: false,
        }
      : {
          segmentId: crypto.randomUUID(),
          sortOrder,
          kind: "fence",
          productCode: runProductCode,
          segmentWidthMm: 3000,
          targetHeightMm: Number(effectiveVars["target_height_mm"] ?? 1800),
          leftTermination: { kind: "system" },
          rightTermination: { kind: "system" },
          confirmed: false,
        };

    dispatch({ type: "UPSERT_SEGMENT", runId: run.runId, segment: base });
  }

  return (
    <div
      className="rounded-xl border border-brand-border bg-brand-card overflow-hidden shadow-sm"
      data-testid={`v4-run-card-${run.runId}`}
    >
      <RunHeader index={index} systemCode={runProductCode} summary={summary} />

      <RunSubHeader
        editing={editing}
        onToggleEditing={() => setEditing((e) => !e)}
        effectiveVars={effectiveVars}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {editing && <RunConfigPanel run={run} activeTab={activeTab} />}

      {!editing && (
        <div className="border-t border-brand-border p-4 pt-1 space-y-3">
          <div className="flex flex-wrap gap-0 -mx-4 px-4 border-b border-brand-border">
            {(
              [
                { id: "full" as const, label: "Full run", count: segmentTotal },
                {
                  id: "segments" as const,
                  label: "Segments",
                  count: fenceCount,
                },
                { id: "gates" as const, label: "Gates", count: gateCount },
              ] as const
            ).map((tab) => (
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
          />
          <RunActions
            onAddSegment={handleAddSegment}
            onAddGate={() => onAddGate(run.runId)}
            onRemoveRun={() =>
              dispatch({ type: "REMOVE_RUN", runId: run.runId })
            }
            canRemove={(state.payload?.runs.length ?? 0) > 1}
          />
        </div>
      )}
    </div>
  );
}
