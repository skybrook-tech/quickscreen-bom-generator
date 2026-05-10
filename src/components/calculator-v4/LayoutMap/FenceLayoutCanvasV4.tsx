import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FenceLayoutCanvas } from "../../canvas/FenceLayoutCanvas.v2";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProducts } from "../../../hooks/useProducts";
import {
  buildStableIdMapForLayoutSync,
  canvasLayoutToCanonical,
  canonicalToCanvasLayout,
  mergeCanonicalPreservingSegmentMeta,
} from "../../canvas/canonicalAdapter";
import type { CanvasLayout } from "../../canvas/canvasEngine";
import type { initCanvasEngine } from "../../canvas/canvasEngine";
import type {
  CanonicalPayload,
  CanonicalSegment,
} from "../../../types/canonical.types";
import { SegmentContextMenu } from "./SegmentContextMenu";
import { useLayoutSegmentHighlight } from "./LayoutSegmentHighlightContext";

function flatIdxForFenceSegment(
  p: CanonicalPayload,
  runId: string,
  segmentId: string,
): number | null {
  let cursor = 0;
  for (const run of p.runs) {
    for (const seg of run.segments) {
      if (seg.kind === "gate") continue;
      if (run.runId === runId && seg.segmentId === segmentId) return cursor;
      cursor++;
    }
  }
  return null;
}

function buildPayloadGeomKey(p: CanonicalPayload): string {
  return p.runs
    .map((r) =>
      r.segments
        .map((s) => {
          const lt =
            s.leftTermination?.kind === "system_corner"
              ? String((s.leftTermination as { kind: "system_corner"; angleDeg: number }).angleDeg)
              : s.leftTermination?.kind ?? "system";
          const rt =
            s.rightTermination?.kind === "system_corner"
              ? String((s.rightTermination as { kind: "system_corner"; angleDeg: number }).angleDeg)
              : s.rightTermination?.kind ?? "system";
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
  const layoutHighlight = useLayoutSegmentHighlight();

  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);
  /** Bumps when `onEngineReady` fires so highlight can sync to a new engine instance. */
  const [engineGen, setEngineGen] = useState(0);
  const sourceRef = useRef<"canvas" | "form">("form");
  const prevGeomKeyRef = useRef("");
  const syncToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** One auto-fit after form-driven layout lands so the map centres on existing geometry. */
  const initialFormFitDoneRef = useRef(false);

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
      const stableIds = buildStableIdMapForLayoutSync(layout, payload);
      const generated = canvasLayoutToCanonical(
        layout,
        payload.productCode,
        payload.variables,
        stableIds,
      );
      const canonical = mergeCanonicalPreservingSegmentMeta(payload, generated);
      dispatch({ type: "SET_PAYLOAD", payload: canonical });

      // Debounced toast so we don't fire on every mouse-move
      if (syncToastTimerRef.current) clearTimeout(syncToastTimerRef.current);
      syncToastTimerRef.current = setTimeout(() => {
        const totalM = layout.totalLengthM.toFixed(1);
        const segCount = layout.segments.length;
        toast.success(
          `Layout captured: ${totalM} m across ${segCount} segment${segCount === 1 ? "" : "s"}`,
          { id: "canvas-sync", duration: 2000 },
        );
      }, 1000);
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
      if (
        !initialFormFitDoneRef.current &&
        layout.segments.length > 0
      ) {
        initialFormFitDoneRef.current = true;
        requestAnimationFrame(() => engineRef.current?.fitToContent());
      }
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

  const handleFlatSegmentHoverChange = useCallback(
    (flatIdx: number) => {
      if (!layoutHighlight) return;
      if (flatIdx < 0) {
        layoutHighlight.setHighlight(null);
        return;
      }
      if (!payload) return;
      const hit = resolveCanonicalFromFlatIdx(flatIdx);
      if (!hit) {
        layoutHighlight.setHighlight(null);
        return;
      }
      layoutHighlight.setHighlight({
        runId: hit.runId,
        segmentId: hit.segment.segmentId,
      });
    },
    [layoutHighlight, payload],
  );

  const handleFenceSegmentClick = useCallback(
    (flatIdx: number) => {
      if (!layoutHighlight || !payload) return;
      const hit = resolveCanonicalFromFlatIdx(flatIdx);
      if (!hit) return;
      layoutHighlight.requestOpenSegment(hit.runId, hit.segment.segmentId);
    },
    [layoutHighlight, payload],
  );

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (!layoutHighlight || !payload) {
      engine.setUiHighlightFlatSeg(null);
      return;
    }
    const h = layoutHighlight.highlight;
    if (!h) {
      engine.setUiHighlightFlatSeg(null);
      return;
    }
    const flat = flatIdxForFenceSegment(payload, h.runId, h.segmentId);
    engine.setUiHighlightFlatSeg(flat);
  }, [layoutHighlight, layoutHighlight?.highlight, payload, engineGen]);

  function handleSegmentContextMenu(
    flatIdx: number,
    screenX: number,
    screenY: number,
  ) {
    const hit = resolveCanonicalFromFlatIdx(flatIdx);
    if (!hit) return;
    setCtxMenu({
      runId: hit.runId,
      segment: hit.segment,
      x: screenX,
      y: screenY,
    });
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
    <div className="flex min-h-0 flex-1 flex-col rounded-[var(--brand-radius)] border border-brand-border p-4">
      <FenceLayoutCanvas
        onLayoutChange={handleLiveSync}
        onEngineReady={(engine) => {
          engineRef.current = engine;
          setEngineGen((g) => g + 1);
        }}
        allowedAngles={allowedAngles}
        segmentPanelWidths={segmentPanelWidths}
        jobPanelWidth={Number(payload?.variables.max_panel_width_mm) || 2600}
        onSegmentContextMenu={handleSegmentContextMenu}
        onFlatSegmentHoverChange={
          layoutHighlight ? handleFlatSegmentHoverChange : undefined
        }
        onFenceSegmentClick={
          layoutHighlight ? handleFenceSegmentClick : undefined
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
