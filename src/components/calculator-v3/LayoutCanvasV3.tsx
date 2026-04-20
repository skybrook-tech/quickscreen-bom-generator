import { useEffect, useMemo, useRef } from 'react';
import { FenceLayoutCanvas } from '../canvas/FenceLayoutCanvas';
import { useCalculator } from '../../context/CalculatorContext';
import { useProducts } from '../../hooks/useProducts';
import {
  canvasLayoutToCanonical,
  canonicalToCanvasLayout,
  mergeCanonicalPreservingSegmentMeta,
} from '../canvas/canonicalAdapter';
import { calcRunStats } from '../../lib/runStats';
import type { CanvasLayout } from '../canvas/canvasEngine';
import type { initCanvasEngine } from '../canvas/canvasEngine';

export function LayoutCanvasV3() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const { data: products } = useProducts();

  // Ref to engine API for pushing form-driven layout changes to canvas
  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);

  // Source tracking to break the canvas ↔ context update loop
  const sourceRef = useRef<'canvas' | 'form'>('form');

  // Tracks the last run/segment structure pushed to the canvas engine.
  // Only structural changes (runs/segments added, removed, reordered) trigger
  // a loadLayout call. Variable-only changes (max_panel_width_mm, colour, etc.)
  // are intentionally ignored so the user's drawn layout is never destroyed.
  const prevGeomKeyRef = useRef('');

  // Allowed corner angles from the selected product's metadata
  const allowedAngles = useMemo(() => {
    if (!payload?.productCode || !products) return [];
    const product = products.find((p) => p.system_type === payload.productCode);
    return (product?.metadata?.allowedAngles as number[] | undefined) ?? [];
  }, [payload?.productCode, products]);

  // Flat array of per-segment max panel widths for the live post preview.
  // Order matches the non-boundary flat segment order in the engine (allSegmentsFlat).
  const segmentPanelWidths = useMemo(() => {
    if (!payload) return [];
    const jobMax = Number(payload.variables.max_panel_width_mm ?? 2600);
    return payload.runs.flatMap((run) =>
      run.segments
        .filter((s) => s.segmentKind !== "gate_opening")
        .map((s) => Number(s.variables?.max_panel_width_mm ?? jobMax)),
    );
  }, [payload]);

  // Pre-computed stats text using the shared calcRunStats utility.
  // Pushed to the canvas engine overlay so it always matches the form's RunCard display.
  const runStatsTexts = useMemo(() => {
    if (!payload) return { global: '', perRun: [] as string[] };
    const jobMax = Number(payload.variables.max_panel_width_mm ?? 2600);
    const perRun = payload.runs.map((run, i) => {
      const s = calcRunStats(run, jobMax);
      return `Run ${i + 1}  ·  ${s.fenceSegments} ${s.fenceSegments === 1 ? 'seg' : 'segs'}  ·  ${s.panels} ${s.panels === 1 ? 'panel' : 'panels'}  ·  ${s.posts} ${s.posts === 1 ? 'post' : 'posts'}  ·  ${s.corners} ${s.corners === 1 ? 'corner' : 'corners'}`;
    });
    const totals = payload.runs.reduce(
      (acc, run) => {
        const s = calcRunStats(run, jobMax);
        return { panels: acc.panels + s.panels, posts: acc.posts + s.posts, corners: acc.corners + s.corners, segs: acc.segs + s.fenceSegments };
      },
      { panels: 0, posts: 0, corners: 0, segs: 0 },
    );
    const global = `${payload.runs.length} ${payload.runs.length === 1 ? 'run' : 'runs'}  ·  ${totals.segs} ${totals.segs === 1 ? 'seg' : 'segs'}  ·  ${totals.panels} ${totals.panels === 1 ? 'panel' : 'panels'}  ·  ${totals.posts} ${totals.posts === 1 ? 'post' : 'posts'}  ·  ${totals.corners} ${totals.corners === 1 ? 'corner' : 'corners'}`;
    return { global, perRun };
  }, [payload]);

  // Canvas → form (live): convert canvas layout to canonical and dispatch
  function handleLiveSync(layout: CanvasLayout) {
    if (!payload) return;
    try {
      sourceRef.current = 'canvas';
      const generated = canvasLayoutToCanonical(
        layout,
        payload.productCode,
        payload.variables,
      );
      const canonical = mergeCanonicalPreservingSegmentMeta(payload, generated);
      dispatch({ type: 'SET_PAYLOAD', payload: canonical });
    } catch {
      // Canvas layout not yet valid — ignore
    }
  }

  // Form → canvas: when payload changes from a form action, reload canvas geometry.
  // Only fires when the run/segment STRUCTURE changes, not on variable edits.
  useEffect(() => {
    if (!engineRef.current || !payload) return;
    if (sourceRef.current === 'canvas') {
      // This change was triggered by the canvas — don't push back.
      // Update prevGeomKeyRef so the next variable-only form change doesn't
      // falsely see a key mismatch and call loadLayout.
      sourceRef.current = 'form';
      prevGeomKeyRef.current = payload.runs
        .map((r) => r.segments.map((s) => s.segmentId).join(','))
        .join('|');
      return;
    }
    // Compute a fingerprint of just the segment IDs. If only variables changed
    // (max_panel_width_mm, colour, post_size, etc.) the fingerprint is the same
    // and we skip the loadLayout call, preserving the user's drawn layout.
    const key = payload.runs
      .map((r) => r.segments.map((s) => s.segmentId).join(','))
      .join('|');
    if (key === prevGeomKeyRef.current) return;
    prevGeomKeyRef.current = key;
    try {
      const layout = canonicalToCanvasLayout(payload);
      engineRef.current.loadLayout(layout);
    } catch {
      // Invalid payload shape — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  return (
    <div className="space-y-3">
      <FenceLayoutCanvas
        onLayoutChange={handleLiveSync}
        onEngineReady={(engine) => { engineRef.current = engine; }}
        allowedAngles={allowedAngles}
        segmentPanelWidths={segmentPanelWidths}
        jobPanelWidth={Number(payload?.variables.max_panel_width_mm) || 2600}
        runStatsTexts={runStatsTexts}
      />
    </div>
  );
}
