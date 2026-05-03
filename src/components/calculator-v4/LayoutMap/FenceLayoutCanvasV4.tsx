import { useEffect, useMemo, useRef, useState } from "react";
import { FenceLayoutCanvas } from "../../canvas/FenceLayoutCanvas.v2";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProducts } from "../../../hooks/useProducts";
import {
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
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-brand-border p-4">
      <FenceLayoutCanvas
        onLayoutChange={handleLiveSync}
        onEngineReady={(engine) => {
          engineRef.current = engine;
        }}
        allowedAngles={allowedAngles}
        segmentPanelWidths={segmentPanelWidths}
        jobPanelWidth={Number(payload?.variables.max_panel_width_mm) || 2600}
        onSegmentContextMenu={handleSegmentContextMenu}
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
