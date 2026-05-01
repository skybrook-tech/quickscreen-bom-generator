import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { FenceLayoutCanvas } from "../../canvas/FenceLayoutCanvas.v2";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProducts } from "../../../hooks/useProducts";
import {
  canvasLayoutToCanonical,
  canonicalToCanvasLayout,
  mergeCanonicalPreservingSegmentMeta,
} from "../../canvas/canonicalAdapter";
import { RUN_LINE_COLORS } from "../../../lib/runLineColors";
import type { CanvasLayout, CanvasRunSummary } from "../../canvas/canvasEngine";
import type { initCanvasEngine } from "../../canvas/canvasEngine";
import type { CanonicalPayload, CanonicalSegment } from "../../../types/canonical.types";
import { SegmentContextMenu } from "./SegmentContextMenu";

function buildPayloadGeomKey(p: CanonicalPayload): string {
  return p.runs
    .map((r) =>
      r.segments
        .map((s) => {
          const lt =
            s.leftTermination.kind === "system_corner"
              ? String(s.leftTermination.angleDeg)
              : s.leftTermination.kind;
          const rt =
            s.rightTermination.kind === "system_corner"
              ? String(s.rightTermination.angleDeg)
              : s.rightTermination.kind;
          return `${s.segmentId}:${s.segmentWidthMm ?? 0}:${lt}:${rt}`;
        })
        .join(","),
    )
    .join("|");
}

/**
 * v4 wrapper around the existing canvas engine (vanilla TS port — see
 * CLAUDE.md §8). The engine itself is unchanged; this component simply
 * bridges canvas <-> v4 reducer.
 */
export function FenceLayoutCanvasV4() {
  const { state, dispatch } = useCalculatorV4();
  const payload = state.payload;
  const { data: products } = useProducts();

  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);
  const sourceRef = useRef<"canvas" | "form">("form");
  const prevGeomKeyRef = useRef("");

  const [ctxMenu, setCtxMenu] = useState<{
    runId: string;
    segment: CanonicalSegment;
    x: number;
    y: number;
  } | null>(null);

  const allowedAngles = useMemo(() => {
    if (!payload?.productCode || !products) return [];
    const product = products.find((p) => p.system_type === payload.productCode);
    return (product?.metadata?.allowedAngles as number[] | undefined) ?? [];
  }, [payload?.productCode, products]);

  // For panel width preview the engine wants per-segment widths. v4 doesn't
  // expose per-segment overrides yet — fall back to run-level then job-level.
  const segmentPanelWidths = useMemo(() => {
    if (!payload) return [];
    const jobMax = Number(payload.variables.max_panel_width_mm ?? 2600);
    return payload.runs.flatMap((run) => {
      const runMax = Number(run.variables?.max_panel_width_mm ?? jobMax);
      return run.segments
        .filter((s) => s.kind !== "gate")
        .map((s) => Number(s.variables?.max_panel_width_mm ?? runMax));
    });
  }, [payload]);

  function handleLiveSync(layout: CanvasLayout) {
    if (!payload) return;
    try {
      sourceRef.current = "canvas";
      // Use job-level vars for canvas-driven canonical generation. Run-level
      // vars are preserved by mergeCanonicalPreservingSegmentMeta.
      const generated = canvasLayoutToCanonical(
        layout,
        payload.productCode,
        payload.variables,
      );
      const canonical = mergeCanonicalPreservingSegmentMeta(payload, generated);
      dispatch({ type: "SET_PAYLOAD", payload: canonical });
    } catch {
      // Canvas layout not yet valid
    }
  }

  useEffect(() => {
    if (!engineRef.current || !payload) return;

    if (sourceRef.current === "canvas") {
      sourceRef.current = "form";
      prevGeomKeyRef.current = buildPayloadGeomKey(payload);
      return;
    }

    const key = buildPayloadGeomKey(payload);
    if (key === prevGeomKeyRef.current) return;
    prevGeomKeyRef.current = key;
    try {
      const layout = canonicalToCanvasLayout(payload);
      engineRef.current.loadLayout(layout);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  /**
   * Map a canvas flat segment index -> (runId, canonical segment).
   *
   * canonicalToCanvasLayout emits exactly one canvas segment per canonical
   * fence segment (gates are attached to the preceding canvas segment as
   * markers, not as their own canvas segment). So the flat index is the Nth
   * non-gate canonical segment walked in run order.
   */
  function resolveCanonicalFromFlatIdx(
    flatIdx: number,
  ): { runId: string; segment: CanonicalSegment } | null {
    if (!payload) return null;
    let cursor = 0;
    for (const run of payload.runs) {
      for (const seg of run.segments) {
        if (seg.kind === "gate") continue;
        if (cursor === flatIdx) return { runId: run.runId, segment: seg };
        cursor++;
      }
    }
    return null;
  }

  function handleSegmentContextMenu(
    flatIdx: number,
    screenX: number,
    screenY: number,
  ) {
    const hit = resolveCanonicalFromFlatIdx(flatIdx);
    if (!hit) return;
    setCtxMenu({ runId: hit.runId, segment: hit.segment, x: screenX, y: screenY });
  }

  function handleCommitCtxLength(mm: number) {
    if (!ctxMenu) return;
    const updated: CanonicalSegment = {
      ...ctxMenu.segment,
      segmentWidthMm: mm,
    };
    dispatch({
      type: "UPSERT_SEGMENT",
      runId: ctxMenu.runId,
      segment: updated,
    });
  }

  function handleDeleteCtxSegment() {
    if (!ctxMenu) return;
    dispatch({
      type: "REMOVE_SEGMENT",
      runId: ctxMenu.runId,
      segmentId: ctxMenu.segment.segmentId,
    });
    setCtxMenu(null);
  }

  useEffect(() => {
    if (!ctxMenu || !payload) return;
    const run = payload.runs.find((r) => r.runId === ctxMenu.runId);
    const exists = run?.segments.some(
      (s) => s.segmentId === ctxMenu.segment.segmentId,
    );
    if (!exists) setCtxMenu(null);
  }, [payload, ctxMenu]);

  // Prefer the latest canonical version of the segment (e.g. after an earlier
  // edit) when rendering the popover so the length field stays in sync.
  const ctxMenuSegment = ctxMenu
    ? (payload?.runs
        .find((r) => r.runId === ctxMenu.runId)
        ?.segments.find((s) => s.segmentId === ctxMenu.segment.segmentId) ??
        ctxMenu.segment)
    : null;

  return (
    <div className="p-4 h-full">
      <FenceLayoutCanvas
        onLayoutChange={handleLiveSync}
        onEngineReady={(engine) => {
          engineRef.current = engine;
        }}
        allowedAngles={allowedAngles}
        segmentPanelWidths={segmentPanelWidths}
        jobPanelWidth={Number(payload?.variables.max_panel_width_mm) || 2600}
        onSegmentContextMenu={handleSegmentContextMenu}
        renderOverlay={(runs: CanvasRunSummary[]) =>
          payload ? (
            <RunsOverviewOverlay
              runs={runs}
              runIdsOrdered={payload.runs.map((r) => r.runId)}
              onRemoveRun={(runId) =>
                dispatch({ type: "REMOVE_RUN", runId })
              }
              canRemoveRun={payload.runs.length > 1}
            />
          ) : null
        }
      />
      {ctxMenu && ctxMenuSegment ? (
        <SegmentContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          segment={ctxMenuSegment}
          onCommitLengthMm={handleCommitCtxLength}
          onDelete={handleDeleteCtxSegment}
          onClose={() => setCtxMenu(null)}
        />
      ) : null}
    </div>
  );
}

function RunsOverviewOverlay({
  runs,
  runIdsOrdered,
  onRemoveRun,
  canRemoveRun,
}: {
  runs: CanvasRunSummary[];
  runIdsOrdered: string[];
  onRemoveRun: (runId: string) => void;
  canRemoveRun: boolean;
}) {
  if (runs.length === 0) return null;
  const totalLengthM = runs.reduce((s, r) => s + r.totalLengthM, 0);
  const totalCorners = runs.reduce((s, r) => s + r.cornerCount, 0);
  const totalGates = runs.reduce((s, r) => s + r.gates.length, 0);
  return (
    <aside
      className="absolute top-2 right-2 bottom-2 w-[260px] rounded-lg border border-brand-border bg-brand-card/95 backdrop-blur shadow-lg flex flex-col overflow-hidden pointer-events-auto"
      data-testid="canvas-runs-overview"
    >
      <header className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted border-b border-brand-border">
        Runs ({runs.length})
      </header>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-brand-bg/60 text-brand-muted uppercase tracking-wider">
              <th className="text-left px-2 py-1.5 font-semibold w-8" aria-hidden />
              <th className="text-left px-2 py-1.5 font-semibold">Run</th>
              <th className="text-right px-2 py-1.5 font-semibold">Len</th>
              <th className="text-right px-2 py-1.5 font-semibold">Cnr</th>
              <th className="text-right px-2 py-1.5 font-semibold">Gt</th>
              <th className="w-8 px-1" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {runs.map((run, i) => {
              const color =
                RUN_LINE_COLORS[i % RUN_LINE_COLORS.length] ?? RUN_LINE_COLORS[0];
              const runId = runIdsOrdered[i];
              return (
                <tr
                  key={`${run.label}-${runId ?? i}`}
                  className="border-t border-brand-border/50 text-brand-text"
                >
                  <td className="pl-2 py-1 align-middle">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20"
                      style={{ backgroundColor: color }}
                      title={`Run colour ${i + 1}`}
                    />
                  </td>
                  <td className="py-1 pr-1 text-brand-muted">{run.label}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {run.totalLengthM.toFixed(2)}m
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {run.cornerCount}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {run.gates.length}
                  </td>
                  <td className="py-1 pr-1 text-center align-middle">
                    {runId && canRemoveRun ? (
                      <button
                        type="button"
                        title="Remove run from layout"
                        className="p-1 rounded text-brand-muted hover:text-red-400 hover:bg-red-500/15"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveRun(runId);
                        }}
                        data-testid={`canvas-remove-run-${runId}`}
                      >
                        <span className="sr-only">Remove run</span>
                        <Trash2 size={13} aria-hidden />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {runs.length > 1 && (
        <footer className="border-t border-brand-border px-3 py-2 text-xs font-semibold text-brand-text bg-brand-bg/50 flex items-center justify-between gap-2">
          <span className="text-brand-muted shrink-0">Total</span>
          <span className="tabular-nums text-right truncate">
            {totalLengthM.toFixed(2)}m · {totalCorners} cnr · {totalGates} gt
          </span>
        </footer>
      )}
    </aside>
  );
}
