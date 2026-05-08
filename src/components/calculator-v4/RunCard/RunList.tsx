import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useLayoutSegmentHighlight } from "../LayoutMap/LayoutSegmentHighlightContext";
import { RunCard } from "./RunCard";

interface Props {
  onAddGate: (runId: string) => void;
}

/**
 * Render all runs as RunCards plus an Add-run button below.
 */
export function RunList({ onAddGate }: Props) {
  const { state, dispatch } = useCalculatorV4();
  const payload = state.payload;
  const layoutHl = useLayoutSegmentHighlight();

  /** Runs in this set are collapsed (session-only). */
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const prevRunCountRef = useRef(0);

  useEffect(() => {
    const n = payload?.runs.length ?? 0;
    if (n === prevRunCountRef.current + 1 && payload?.runs.length) {
      setCollapsedIds(new Set(payload.runs.slice(0, -1).map((r) => r.runId)));
    }
    prevRunCountRef.current = n;
  }, [payload?.runs]);

  const toggleExpanded = useCallback((runId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  }, []);

  const expandRun = useCallback((runId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(runId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!layoutHl) return;
    layoutHl.setExpandRunForCanvas(expandRun);
    return () => layoutHl.setExpandRunForCanvas(null);
  }, [layoutHl, expandRun]);

  if (!payload) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted mb-2 px-1">
        Runs
      </div>
      <div className="overflow-y-auto">
        <div className="space-y-3">
          {payload?.runs.map((run, i) => (
            <RunCard
              key={run.runId}
              run={run}
              index={i + 1}
              runColorIndex={i}
              onAddGate={onAddGate}
              expanded={!collapsedIds.has(run.runId)}
              onToggleExpanded={() => toggleExpanded(run.runId)}
              expandRun={() => expandRun(run.runId)}
            />
          ))}
        </div>
        <button
          onClick={() => dispatch({ type: "ADD_RUN" })}
          className="w-full mt-3 px-3 py-2.5 rounded-[var(--brand-radius-sm)] border border-dashed border-brand-border text-sm font-medium text-brand-muted hover:text-brand-accent hover:border-brand-accent hover:bg-brand-accent/5 transition flex items-center justify-center gap-1.5"
          data-testid="v4-add-run"
        >
          <Plus size={14} /> Add run
        </button>
      </div>
    </div>
  );
}
