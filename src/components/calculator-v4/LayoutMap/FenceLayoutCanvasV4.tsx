import { useEffect, useMemo, useRef } from "react";
import { FenceLayoutCanvas } from "../../canvas/FenceLayoutCanvas";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProducts } from "../../../hooks/useProducts";
import {
  canvasLayoutToCanonical,
  canonicalToCanvasLayout,
  mergeCanonicalPreservingSegmentMeta,
} from "../../canvas/canonicalAdapter";
import { calcRunStats } from "../../../lib/runStats";
import type { CanvasLayout } from "../../canvas/canvasEngine";
import type { initCanvasEngine } from "../../canvas/canvasEngine";

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

  const runStatsTexts = useMemo(() => {
    if (!payload) return { global: "", perRun: [] as string[] };
    const jobMax = Number(payload.variables.max_panel_width_mm ?? 2600);
    const perRun = payload.runs.map((run, i) => {
      const runMax = Number(run.variables?.max_panel_width_mm ?? jobMax);
      const s = calcRunStats(run, runMax);
      return `Run ${i + 1}  ·  ${s.fenceSegments} ${s.fenceSegments === 1 ? "seg" : "segs"}  ·  ${s.panels} ${s.panels === 1 ? "panel" : "panels"}  ·  ${s.posts} ${s.posts === 1 ? "post" : "posts"}  ·  ${s.corners} ${s.corners === 1 ? "corner" : "corners"}`;
    });
    const totals = payload.runs.reduce(
      (acc, run) => {
        const runMax = Number(run.variables?.max_panel_width_mm ?? jobMax);
        const s = calcRunStats(run, runMax);
        return {
          panels: acc.panels + s.panels,
          posts: acc.posts + s.posts,
          corners: acc.corners + s.corners,
          segs: acc.segs + s.fenceSegments,
        };
      },
      { panels: 0, posts: 0, corners: 0, segs: 0 },
    );
    const global = `${payload.runs.length} ${payload.runs.length === 1 ? "run" : "runs"}  ·  ${totals.segs} ${totals.segs === 1 ? "seg" : "segs"}  ·  ${totals.panels} ${totals.panels === 1 ? "panel" : "panels"}  ·  ${totals.posts} ${totals.posts === 1 ? "post" : "posts"}  ·  ${totals.corners} ${totals.corners === 1 ? "corner" : "corners"}`;
    return { global, perRun };
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

    const buildKey = () =>
      payload.runs
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

    if (sourceRef.current === "canvas") {
      sourceRef.current = "form";
      prevGeomKeyRef.current = buildKey();
      return;
    }

    const key = buildKey();
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

  return (
    <div className="p-4">
      <FenceLayoutCanvas
        onLayoutChange={handleLiveSync}
        onEngineReady={(engine) => {
          engineRef.current = engine;
        }}
        allowedAngles={allowedAngles}
        segmentPanelWidths={segmentPanelWidths}
        jobPanelWidth={Number(payload?.variables.max_panel_width_mm) || 2600}
        runStatsTexts={runStatsTexts}
      />
    </div>
  );
}
