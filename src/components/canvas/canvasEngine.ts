// canvasEngine.ts — Pure TypeScript canvas engine (no React imports)
// All drawing, interaction, snap, undo logic lives here.

export interface CanvasSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  lengthMM: number; // real-world length in mm (user-editable)
  angleDeg: number; // angle from horizontal
}

export interface CanvasGate {
  segmentIndex: number;
  positionOnSegment: number; // 0–1 fraction along segment
  widthMM: number;
}

export interface CanvasRunSummary {
  label: string;
  totalLengthM: number;
  cornerCount: number;
  gates: CanvasGate[];
}

export interface CanvasLayout {
  segments: CanvasSegment[];
  gates: CanvasGate[];
  totalLengthM: number;
  cornerCount: number; // count of ~90° angles between adjacent segments
  runs: CanvasRunSummary[];
  /** Non-product boundary lines (neighbouring fences, property lines, etc.). Ignored by canonicalAdapter. */
  boundaries: CanvasSegment[];
}

export interface CanvasEngineConfig {
  snapToGrid: boolean;
  gridSize: number; // px
  showGrid: boolean;
  /** Interior corner angles (degrees) permitted at post junctions. Empty = no constraint. */
  allowedAngles?: number[];
  onLayoutChange?: (layout: CanvasLayout) => void;
  /** Called immediately when the user places a NEW gate marker on a segment */
  onGatePlaced?: (
    segIdx: number,
    gateIdx: number,
    defaultWidthMM: number,
  ) => void;
  /** Called when the user clicks (not drags) an existing gate marker — open its editor */
  onGateEdit?: (
    flatSegIdx: number,
    gateIdx: number,
    gateId: string | undefined,
    currentWidthMM: number,
  ) => void;
}

// ── Internal state types ──────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

interface Segment {
  p1: Point;
  p2: Point;
  lengthMM: number; // mm; defaults derived from pixel distance × scale
  gates: GateMarker[];
}

interface GateMarker {
  t: number; // 0–1 along segment
  widthMM: number;
  gateId?: string; // matches the GateConfig.id in GateContext once the gate is saved
}

type Tool = "draw" | "gate" | "move" | "boundary";

type UndoAction =
  | { type: "ADD_POINT"; runIdx: number }
  | { type: "FINISH_RUN"; runIdx: number }
  | { type: "RESUME_RUN"; runIdx: number }
  | { type: "ADD_RUN" }
  | { type: "ADD_GATE"; segIdx: number; gateIdx: number }
  | { type: "CLEAR"; runs: Run[]; scale: number }
  | { type: "CHAIN_POINT"; prevRunIdx: number; newRunIdx: number };

interface Run {
  points: Point[];
  finished: boolean;
  segments: Segment[];
  isBoundary?: boolean;
}

// ── Scale constant: pixels per metre ──────────────────────────────────────────
// Default: 100px = 1 metre. User can adjust with the scale input.
const DEFAULT_SCALE = 100; // px per metre

// ── Corner detection angle threshold ─────────────────────────────────────────
// Legacy threshold (30°) replaced by angleBetween() with 2°–175° range per HTML spec

// ── Gate default width ────────────────────────────────────────────────────────
const DEFAULT_GATE_WIDTH_MM = 900;

// ── Colours ───────────────────────────────────────────────────────────────────
const COLOR = {
  grid: "rgba(0, 0, 0, 0.1)",
  gridAxis: "rgba(255,255,255,0.22)",
  segment: "#3b82f6",
  segmentHover: "#60a5fa",
  point: "#3b82f6",
  pointFill: "#1a1d2e",
  activePoint: "#60a5fa",
  preview: "rgba(96,165,250,0.5)",
  gate: "#f59e0b",
  gateFill: "rgba(245,158,11,0.2)",
  label: "#e5e7eb",
  labelBg: "rgba(26,29,46,0.85)",
  snap: "rgba(96,165,250,0.4)",
};

// Distinct run colors (dark-theme palette, cycling for >8 runs)
const RUN_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f43f5e", // rose
  "#a855f7", // purple
  "#f97316", // orange
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#84cc16", // lime
];
const RUN_COLORS_HOVER = [
  "#60a5fa",
  "#34d399",
  "#fb7185",
  "#c084fc",
  "#fb923c",
  "#22d3ee",
  "#fde047",
  "#a3e635",
];

function getRunColor(nonBoundaryRunIdx: number) {
  return RUN_COLORS[nonBoundaryRunIdx % RUN_COLORS.length];
}
function getRunColorHover(nonBoundaryRunIdx: number) {
  return RUN_COLORS_HOVER[nonBoundaryRunIdx % RUN_COLORS_HOVER.length];
}

// ── Utility ───────────────────────────────────────────────────────────────────

function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function angleDeg(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function snapToGrid(p: Point, gridSize: number): Point {
  return {
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  };
}

/**
 * Snap `candidate` so the interior corner angle at `junctionPoint`
 * (between the incoming segment prevPoint→junctionPoint and the outgoing
 * segment junctionPoint→candidate) equals the nearest value in `angles`.
 * Returns `candidate` unchanged if `angles` is empty or distance is zero.
 */
function snapToAllowedAngle(
  prevPoint: Point,
  junctionPoint: Point,
  candidate: Point,
  angles: number[],
): Point {
  if (angles.length === 0) return candidate;
  const d = dist(junctionPoint, candidate);
  if (d === 0) return candidate;

  const current = angleBetween(prevPoint, junctionPoint, candidate);

  const nearest = angles.reduce((best, a) =>
    Math.abs(a - current) < Math.abs(best - current) ? a : best,
  );

  // Direction from junction toward prev point (B→A)
  const phi_BA = Math.atan2(
    prevPoint.y - junctionPoint.y,
    prevPoint.x - junctionPoint.x,
  );
  const nearestRad = (nearest * Math.PI) / 180;

  // Two candidate directions: rotate phi_BA by ±nearest degrees
  const phi1 = phi_BA + nearestRad;
  const phi2 = phi_BA - nearestRad;

  // Actual direction from junction toward candidate (B→M)
  const phi_BM = Math.atan2(
    candidate.y - junctionPoint.y,
    candidate.x - junctionPoint.x,
  );

  // Angular distance normalised to [0, π]
  function angDiff(a: number, b: number): number {
    const diff = Math.abs(a - b) % (2 * Math.PI);
    return diff > Math.PI ? 2 * Math.PI - diff : diff;
  }

  const chosen =
    angDiff(phi1, phi_BM) <= angDiff(phi2, phi_BM) ? phi1 : phi2;

  return {
    x: junctionPoint.x + d * Math.cos(chosen),
    y: junctionPoint.y + d * Math.sin(chosen),
  };
}

function screenToCanvas(screen: Point, pan: Point, zoom: number): Point {
  return {
    x: (screen.x - pan.x) / zoom,
    y: (screen.y - pan.y) / zoom,
  };
}

function canvasToScreen(canvas: Point, pan: Point, zoom: number): Point {
  return {
    x: canvas.x * zoom + pan.x,
    y: canvas.y * zoom + pan.y,
  };
}

function pixelsToMM(px: number, scale: number): number {
  // scale = px per metre
  return (px / scale) * 1000;
}

function buildSegmentsFromPoints(points: Point[], scale: number): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const px = dist(points[i], points[i + 1]);
    segs.push({
      p1: points[i],
      p2: points[i + 1],
      lengthMM: pixelsToMM(px, scale),
      gates: [],
    });
  }
  return segs;
}

function angleBetween(a: Point, b: Point, c: Point): number {
  // Returns interior angle at b (in degrees) formed by segments a→b and b→c
  const dx1 = a.x - b.x,
    dy1 = a.y - b.y;
  const dx2 = c.x - b.x,
    dy2 = c.y - b.y;
  const dot = dx1 * dx2 + dy1 * dy2;
  const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  if (mag1 === 0 || mag2 === 0) return 180;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

function countCorners(runs: Run[]): number {
  let count = 0;
  for (const run of runs) {
    const pts = run.points;
    for (let i = 1; i < pts.length - 1; i++) {
      const angle = angleBetween(pts[i - 1], pts[i], pts[i + 1]);
      if (angle > 2 && angle < 175) count++;
    }
  }
  return count;
}

function totalLengthM(runs: Run[]): number {
  let total = 0;
  for (const run of runs) {
    for (const seg of run.segments) {
      total += seg.lengthMM;
    }
  }
  return total / 1000;
}

function closestPointOnSegment(
  p: Point,
  s: Segment,
): { point: Point; t: number; d: number } {
  const dx = s.p2.x - s.p1.x;
  const dy = s.p2.y - s.p1.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { point: s.p1, t: 0, d: dist(p, s.p1) };
  const t = Math.max(
    0,
    Math.min(1, ((p.x - s.p1.x) * dx + (p.y - s.p1.y) * dy) / len2),
  );
  const proj = lerp(s.p1, s.p2, t);
  return { point: proj, t, d: dist(p, proj) };
}

// ── Label editing overlay ─────────────────────────────────────────────────────

function createLabelInput(
  container: HTMLElement,
  screenPos: Point,
  initialValue: string,
  onCommit: (v: string) => void,
  onCancel: () => void,
): HTMLInputElement {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.value = initialValue;
  inp.style.cssText = `
    position: absolute;
    left: ${screenPos.x - 40}px;
    top: ${screenPos.y - 13}px;
    width: 80px;
    padding: 2px 6px;
    font-size: 12px;
    background: #1a1d2e;
    color: #e5e7eb;
    border: 1px solid #3b82f6;
    border-radius: 4px;
    outline: none;
    z-index: 100;
    text-align: center;
  `;
  container.appendChild(inp);
  inp.focus();
  inp.select();

  const commit = () => onCommit(inp.value);
  const cancel = () => {
    onCancel();
    cleanup();
  };
  const cleanup = () => {
    inp.removeEventListener("keydown", onKey);
    inp.removeEventListener("blur", onBlur);
    if (inp.parentNode) inp.parentNode.removeChild(inp);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      commit();
      cleanup();
    }
    if (e.key === "Escape") {
      cancel();
    }
  };
  const onBlur = () => {
    commit();
    cleanup();
  };

  inp.addEventListener("keydown", onKey);
  inp.addEventListener("blur", onBlur);
  return inp;
}

// ── Main engine factory ───────────────────────────────────────────────────────

export function initCanvasEngine(
  canvas: HTMLCanvasElement,
  config: CanvasEngineConfig,
) {
  const ctx = canvas.getContext("2d")!;
  const container = canvas.parentElement as HTMLElement;

  // ── Mutable state ──────────────────────────────────────────────────────────
  let runs: Run[] = [];
  let activeRunIdx = -1; // index of the run currently being drawn
  let tool: Tool = "draw";
  let zoom = 1;
  let pan: Point = { x: 0, y: 0 };
  let scale = DEFAULT_SCALE; // px per metre
  let snap = config.snapToGrid;
  let showGrid = config.showGrid;
  let gridSize = config.gridSize;
  let allowedAngles: number[] = config.allowedAngles ?? [];
  let mouseCanvas: Point = { x: 0, y: 0 };
  let isPanning = false;
  let panStart: Point = { x: 0, y: 0 };
  let panOrigin: Point = { x: 0, y: 0 };
  let undoStack: UndoAction[] = [];
  let mapImage: HTMLImageElement | null = null;
  let mapOpacity = 0.5;
  let mapWorldOriginX = 0; // world px — centre of the tile
  let mapWorldOriginY = 0; // world px — centre of the tile
  let mapWorldWidth = 0; // world px
  let mapWorldHeight = 0; // world px
  let editingLabel = false;
  let hoveredSegIdx = -1; // flat index into all segments across all runs
  let animFrame = 0;
  let draggingNode: { runIdx: number; ptIdx: number } | null = null;
  let draggingGate: {
    runIdx: number;
    segIdx: number;
    gateIdx: number;
    flatSegIdx: number;
    startScreenPt: Point;
  } | null = null;
  // Post positions from BOM result. In canvas world coordinates — the same
  // coordinate space as the drawn nodes (canvas pixels before pan/zoom transform).
  // null = nothing to render.
  let postPositions: Array<{ x: number; y: number; label?: string }> | null =
    null;
  // Per-segment max panel widths (flat array, index = flat segment index from allSegmentsFlat).
  // Used by drawComputedPosts to show live post-position preview.
  let segmentPanelWidths: number[] = [];
  // Job-level default panel width — used to draw post previews on the in-progress segment.
  let jobPanelWidthMm: number | null = null;

  // Resize canvas to fill its CSS size
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }

  // ── Layout helpers ─────────────────────────────────────────────────────────

  function allSegmentsFlat(): Array<{
    seg: Segment;
    runIdx: number;
    segIdx: number;
    flatIdx: number;
  }> {
    const result: Array<{
      seg: Segment;
      runIdx: number;
      segIdx: number;
      flatIdx: number;
    }> = [];
    let flat = 0;
    for (let r = 0; r < runs.length; r++) {
      if (runs[r].isBoundary) continue; // boundary runs excluded from flat index (no gates/hover)
      for (let s = 0; s < runs[r].segments.length; s++) {
        result.push({
          seg: runs[r].segments[s],
          runIdx: r,
          segIdx: s,
          flatIdx: flat++,
        });
      }
    }
    return result;
  }

  function getLayout(): CanvasLayout {
    const allSegs = allSegmentsFlat(); // excludes boundary runs
    const segments: CanvasSegment[] = allSegs.map(({ seg }) => ({
      startX: seg.p1.x,
      startY: seg.p1.y,
      endX: seg.p2.x,
      endY: seg.p2.y,
      lengthMM: seg.lengthMM,
      angleDeg: angleDeg(seg.p1, seg.p2),
    }));
    const gates: CanvasGate[] = [];
    allSegs.forEach(({ seg, flatIdx }) => {
      seg.gates.forEach((g) => {
        gates.push({
          segmentIndex: flatIdx,
          positionOnSegment: g.t,
          widthMM: g.widthMM,
        });
      });
    });

    // Boundary segments (non-product context lines)
    const boundaries: CanvasSegment[] = [];
    for (const run of runs) {
      if (!run.isBoundary) continue;
      for (const seg of run.segments) {
        boundaries.push({
          startX: seg.p1.x,
          startY: seg.p1.y,
          endX: seg.p2.x,
          endY: seg.p2.y,
          lengthMM: seg.lengthMM,
          angleDeg: angleDeg(seg.p1, seg.p2),
        });
      }
    }

    // Build per-run summaries (non-boundary runs only)
    const nonBoundaryRuns = runs.filter((r) => !r.isBoundary);
    const runSummaries: CanvasRunSummary[] = nonBoundaryRuns.map((run, ri) => {
      const runLengthM =
        run.segments.reduce((sum, s) => sum + s.lengthMM, 0) / 1000;
      const runCorners = countCorners([run]);
      const runGates: CanvasGate[] = [];
      // Compute the flat segment index offset for this run's first segment
      let flatOffset = 0;
      for (let r = 0; r < ri; r++) {
        flatOffset += nonBoundaryRuns[r].segments.length;
      }
      run.segments.forEach((seg, si) => {
        seg.gates.forEach((g) => {
          runGates.push({
            segmentIndex: flatOffset + si,
            positionOnSegment: g.t,
            widthMM: g.widthMM,
          });
        });
      });
      return {
        label: `Run ${ri + 1}`,
        totalLengthM: runLengthM,
        cornerCount: runCorners,
        gates: runGates,
      };
    });

    return {
      segments,
      gates,
      totalLengthM: totalLengthM(nonBoundaryRuns),
      cornerCount: countCorners(nonBoundaryRuns),
      runs: runSummaries,
      boundaries,
    };
  }

  function notifyChange() {
    config.onLayoutChange?.(getLayout());
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  function draw() {
    resizeCanvas();
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Map underlay — drawn inside the pan/zoom transform so the image scales
    // with the canvas coordinate system and stays correctly georeferenced.
    if (mapImage && mapWorldWidth > 0) {
      ctx.save();
      ctx.globalAlpha = mapOpacity;
      ctx.drawImage(
        mapImage,
        mapWorldOriginX - mapWorldWidth / 2,
        mapWorldOriginY - mapWorldHeight / 2,
        mapWorldWidth,
        mapWorldHeight,
      );
      ctx.restore();
    }

    // Grid
    if (showGrid) {
      drawGrid(W, H);
    }

    // All segments — coloured by run
    const allSegs = allSegmentsFlat();
    // Build runIdx → non-boundary run index (for color lookup)
    const runColorIdx = new Map<number, number>();
    {
      let nbIdx = 0;
      for (let ri = 0; ri < runs.length; ri++) {
        if (!runs[ri].isBoundary) runColorIdx.set(ri, nbIdx++);
      }
    }
    for (const { seg, flatIdx, runIdx } of allSegs) {
      const colorIdx = runColorIdx.get(runIdx) ?? 0;
      drawSegment(seg, flatIdx === hoveredSegIdx, getRunColor(colorIdx), getRunColorHover(colorIdx));
    }

    // Boundary runs — dashed gray lines (non-product context lines)
    {
      const hasActiveBoundary =
        tool === "boundary" &&
        activeRunIdx >= 0 &&
        runs[activeRunIdx]?.isBoundary &&
        !runs[activeRunIdx].finished;
      for (const run of runs) {
        if (!run.isBoundary) continue;
        if (run.segments.length === 0) continue;
        ctx.save();
        ctx.setLineDash([8 / zoom, 4 / zoom]);
        ctx.strokeStyle = "#6b7280";
        ctx.lineWidth = 2 / zoom;
        for (const seg of run.segments) {
          ctx.beginPath();
          ctx.moveTo(seg.p1.x, seg.p1.y);
          ctx.lineTo(seg.p2.x, seg.p2.y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
      }
      // Preview line for active boundary run
      if (hasActiveBoundary) {
        const run = runs[activeRunIdx];
        const lastPt = run.points[run.points.length - 1];
        ctx.save();
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.strokeStyle = "rgba(107,114,128,0.5)";
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(lastPt.x, lastPt.y);
        ctx.lineTo(mouseCanvas.x, mouseCanvas.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // Preview line (while drawing)
    if (tool === "draw" && activeRunIdx >= 0) {
      const run = runs[activeRunIdx];
      if (run && run.points.length > 0 && !run.finished) {
        const lastPt = run.points[run.points.length - 1];
        let target = snap ? snapToGrid(mouseCanvas, gridSize) : mouseCanvas;
        if (allowedAngles.length > 0 && run.points.length >= 2) {
          const prev = run.points[run.points.length - 2];
          target = snapToAllowedAngle(prev, lastPt, target, allowedAngles);
        }
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = COLOR.preview;
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(lastPt.x, lastPt.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.restore();

        // Post position preview along the in-progress segment
        const segDist = dist(lastPt, target);
        if (jobPanelWidthMm && jobPanelWidthMm > 0 && segDist > 0) {
          const previewLengthMm = pixelsToMM(segDist, scale);
          const numPanels = Math.ceil(previewLengthMm / jobPanelWidthMm);
          const sq = 5 / zoom;
          const half = sq / 2;
          const bw = 1.5 / zoom;
          ctx.save();
          for (let i = 0; i <= numPanels; i++) {
            const t = i / numPanels;
            const px = lastPt.x + t * (target.x - lastPt.x);
            const py = lastPt.y + t * (target.y - lastPt.y);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(px - half - bw, py - half - bw, sq + bw * 2, sq + bw * 2);
            ctx.fillStyle = "#f59e0b";
            ctx.fillRect(px - half, py - half, sq, sq);
          }
          ctx.restore();
        }

        // Distance label on active preview line
        if (segDist > 0) {
          const mm = pixelsToMM(segDist, scale);
          const label =
            mm >= 1000
              ? `${(mm / 1000).toFixed(2)}m`
              : `${Math.round(mm)}mm`;
          const mid: Point = {
            x: (lastPt.x + target.x) / 2,
            y: (lastPt.y + target.y) / 2,
          };
          ctx.save();
          ctx.font = `${12 / zoom}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const textW = ctx.measureText(label).width;
          const pad = 4 / zoom;
          ctx.fillStyle = COLOR.labelBg;
          ctx.beginPath();
          ctx.roundRect(
            mid.x - textW / 2 - pad,
            mid.y - 8 / zoom,
            textW + pad * 2,
            16 / zoom,
            4 / zoom,
          );
          ctx.fill();
          ctx.fillStyle = COLOR.label;
          ctx.fillText(label, mid.x, mid.y);
          ctx.restore();
        }
      }
    }

    // Gate preview (while in gate mode, hovering a segment)
    if (tool === "gate" && hoveredSegIdx >= 0) {
      const info = allSegs[hoveredSegIdx];
      if (info) {
        const proj = closestPointOnSegment(mouseCanvas, info.seg);
        drawGatePreview(info.seg, proj.t);
      }
    }

    // Snap indicator
    if (tool === "draw") {
      let snapped = snap ? snapToGrid(mouseCanvas, gridSize) : mouseCanvas;
      if (
        allowedAngles.length > 0 &&
        activeRunIdx >= 0 &&
        runs[activeRunIdx] &&
        runs[activeRunIdx].points.length >= 2 &&
        !runs[activeRunIdx].finished
      ) {
        const run = runs[activeRunIdx];
        const junction = run.points[run.points.length - 1];
        const prev = run.points[run.points.length - 2];
        snapped = snapToAllowedAngle(prev, junction, snapped, allowedAngles);
      }
      if (snap || allowedAngles.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(snapped.x, snapped.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = COLOR.snap;
        ctx.fill();
        ctx.restore();
      }
    }

    // Node labels (A, B, C…) and corner angle annotations
    if (zoom > 0.3) {
      ctx.save();
      let nbLabelIdx = 0;
      for (const run of runs) {
        if (run.isBoundary) continue;
        const colorIdx = nbLabelIdx++;
        const pts = run.points;
        if (pts.length < 2) continue;
        const runCol = getRunColor(colorIdx);
        // Node labels
        for (let i = 0; i < pts.length; i++) {
          const label = String.fromCharCode(65 + i);
          const fs = Math.max(8, 10 / zoom);
          ctx.font = `${fs}px sans-serif`;
          ctx.fillStyle = runCol;
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";
          ctx.fillText(
            label,
            pts[i].x - (fs * 0.8) / zoom,
            pts[i].y - 4 / zoom,
          );
        }
        // Corner angle annotations at intermediate nodes
        for (let i = 1; i < pts.length - 1; i++) {
          const angle = angleBetween(pts[i - 1], pts[i], pts[i + 1]);
          if (angle > 2 && angle < 175) {
            const angleText = `${Math.round(angle)}°`;
            const fs2 = Math.max(7, 9 / zoom);
            ctx.font = `${fs2}px sans-serif`;
            ctx.fillStyle = "#a78bfa";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(angleText, pts[i].x + 4 / zoom, pts[i].y + 4 / zoom);
          }
        }
      }
      ctx.restore();
    }

    // Post position squares (from BOM result) — rendered on top of fence lines
    if (postPositions !== null && zoom > 0.2) {
      drawPostPositions();
    }

    // Computed post positions from per-segment panel widths — live preview
    if (segmentPanelWidths.length > 0 && zoom > 0.2) {
      drawComputedPosts();
    }

    ctx.restore();

    // Stats overlay — drawn in screen space, independent of pan/zoom
    drawStatsOverlay();
  }

  function drawStatsOverlay() {
    const allSegs = allSegmentsFlat();
    const nbRuns = runs.filter((r) => !r.isBoundary && r.finished);
    if (nbRuns.length === 0 && allSegs.length === 0) return;

    let line: string;

    if (hoveredSegIdx >= 0 && hoveredSegIdx < allSegs.length) {
      // Hover mode — identify the run containing the hovered segment
      const { runIdx } = allSegs[hoveredSegIdx];
      const run = runs[runIdx];
      let nbIdx = 0;
      let flatStart = 0;
      for (let ri = 0; ri < runs.length; ri++) {
        if (runs[ri].isBoundary) continue;
        if (ri === runIdx) break;
        flatStart += runs[ri].segments.length;
        nbIdx++;
      }
      const segs = run.segments.length;
      const corners = countCorners([run]);
      let panels = 0;
      for (let si = 0; si < segs; si++) {
        const maxW = segmentPanelWidths[flatStart + si] ?? 0;
        if (maxW > 0) panels += Math.ceil(run.segments[si].lengthMM / maxW);
      }
      line = `Run ${nbIdx + 1}  ·  ${segs} ${segs === 1 ? "seg" : "segs"}  ·  ${panels} ${panels === 1 ? "panel" : "panels"}  ·  ${corners} ${corners === 1 ? "corner" : "corners"}`;
    } else {
      // No hover — global totals
      const totalSegs = allSegs.length;
      const totalCorners = countCorners(nbRuns);
      let totalPanels = 0;
      for (let i = 0; i < allSegs.length; i++) {
        const maxW = segmentPanelWidths[i] ?? 0;
        if (maxW > 0)
          totalPanels += Math.ceil(allSegs[i].seg.lengthMM / maxW);
      }
      line = `${nbRuns.length} ${nbRuns.length === 1 ? "run" : "runs"}  ·  ${totalSegs} ${totalSegs === 1 ? "seg" : "segs"}  ·  ${totalPanels} ${totalPanels === 1 ? "panel" : "panels"}  ·  ${totalCorners} ${totalCorners === 1 ? "corner" : "corners"}`;
    }

    const pad = 8;
    const fs = 12;
    const x = 10;
    const y = 10;
    ctx.save();
    ctx.font = `${fs}px sans-serif`;
    const w = ctx.measureText(line).width + pad * 2;
    const h = fs + pad * 2;
    ctx.fillStyle = "rgba(26,29,46,0.85)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.fillStyle = "#e5e7eb";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(line, x + pad, y + h / 2);
    ctx.restore();
  }

  function drawPostPositions() {
    if (!postPositions) return;
    const squareSize = 6 / zoom;
    const half = squareSize / 2;
    const borderWidth = 1.5 / zoom;
    for (const pos of postPositions) {
      ctx.save();
      // White border
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        pos.x - half - borderWidth,
        pos.y - half - borderWidth,
        squareSize + borderWidth * 2,
        squareSize + borderWidth * 2,
      );
      // Amber fill (#f59e0b)
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(pos.x - half, pos.y - half, squareSize, squareSize);
      // Optional label
      if (pos.label) {
        const fs = Math.max(8, 10 / zoom);
        ctx.font = `${fs}px sans-serif`;
        ctx.fillStyle = COLOR.label;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(pos.label, pos.x, pos.y - half - borderWidth - 1 / zoom);
      }
      ctx.restore();
    }
  }

  function drawComputedPosts() {
    if (segmentPanelWidths.length === 0) return;
    const squareSize = 6 / zoom;
    const half = squareSize / 2;
    const borderWidth = 1.5 / zoom;
    ctx.save();
    let flatIdx = 0;
    for (const run of runs) {
      if (run.isBoundary || !run.finished) continue;
      for (const seg of run.segments) {
        const maxW = segmentPanelWidths[flatIdx] ?? 0;
        flatIdx++;
        if (maxW <= 0 || seg.lengthMM <= 0) continue;
        const numPanels = Math.ceil(seg.lengthMM / maxW);
        const panelWidthMm = seg.lengthMM / numPanels;
        for (let i = 0; i <= numPanels; i++) {
          const t = (i * panelWidthMm) / seg.lengthMM;
          const px = seg.p1.x + t * (seg.p2.x - seg.p1.x);
          const py = seg.p1.y + t * (seg.p2.y - seg.p1.y);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(
            px - half - borderWidth,
            py - half - borderWidth,
            squareSize + borderWidth * 2,
            squareSize + borderWidth * 2,
          );
          ctx.fillStyle = "#f59e0b";
          ctx.fillRect(px - half, py - half, squareSize, squareSize);
        }
      }
    }
    ctx.restore();
  }

  function drawGrid(W: number, H: number) {
    // Adaptive grid: pick an interval in metres so cells are 40–150px on screen
    const pxPerMetreOnScreen = zoom * scale;
    const INTERVALS_M = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];
    const intervalM =
      INTERVALS_M.find((i) => i * pxPerMetreOnScreen >= 40) ?? 100;
    // Size of one cell in canvas world coordinates
    const cellSize = intervalM * scale;

    const tl = screenToCanvas({ x: 0, y: 0 }, pan, zoom);
    const br = screenToCanvas({ x: W, y: H }, pan, zoom);

    const startX = Math.floor(tl.x / cellSize) * cellSize;
    const startY = Math.floor(tl.y / cellSize) * cellSize;

    ctx.save();
    ctx.lineWidth = 0.5 / zoom;

    for (let x = startX; x <= br.x; x += cellSize) {
      ctx.strokeStyle =
        Math.abs(x) < cellSize * 0.01 ? COLOR.gridAxis : COLOR.grid;
      ctx.beginPath();
      ctx.moveTo(x, tl.y);
      ctx.lineTo(x, br.y);
      ctx.stroke();
    }
    for (let y = startY; y <= br.y; y += cellSize) {
      ctx.strokeStyle =
        Math.abs(y) < cellSize * 0.01 ? COLOR.gridAxis : COLOR.grid;
      ctx.beginPath();
      ctx.moveTo(tl.x, y);
      ctx.lineTo(br.x, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSegment(seg: Segment, hovered: boolean, runColor = COLOR.segment, runColorHover = COLOR.segmentHover) {
    const lw = 3 / zoom;
    const segColor = hovered ? runColorHover : runColor;
    const segLw = hovered ? lw * 1.5 : lw;

    // Build sorted list of gate gaps as (tStart, tEnd) pairs
    type GateGap = { tStart: number; tEnd: number; widthMM: number };
    const gaps: GateGap[] = seg.gates
      .map((g) => {
        const halfT = seg.lengthMM > 0 ? g.widthMM / seg.lengthMM / 2 : 0;
        return {
          tStart: Math.max(0, g.t - halfT),
          tEnd: Math.min(1, g.t + halfT),
          widthMM: g.widthMM,
        };
      })
      .sort((a, b) => a.tStart - b.tStart);

    // Draw fence line as sections between/around gate gaps
    ctx.save();
    ctx.strokeStyle = segColor;
    ctx.lineWidth = segLw;
    ctx.lineCap = "round";

    let cursor = 0; // current t position
    for (const gap of gaps) {
      // Solid fence section before this gate
      if (gap.tStart > cursor) {
        const from = lerp(seg.p1, seg.p2, cursor);
        const to = lerp(seg.p1, seg.p2, gap.tStart);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      cursor = gap.tEnd;
    }
    // Final solid section after last gate (or whole line if no gates)
    if (cursor < 1) {
      const from = lerp(seg.p1, seg.p2, cursor);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(seg.p2.x, seg.p2.y);
      ctx.stroke();
    }
    ctx.restore();

    // Draw each gate gap as a dashed amber line + distance annotations
    for (const gap of gaps) {
      const pStart = lerp(seg.p1, seg.p2, gap.tStart);
      const pEnd = lerp(seg.p1, seg.p2, gap.tEnd);

      // Dashed amber gap line
      ctx.save();
      ctx.strokeStyle = COLOR.gate;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.setLineDash([5 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Small post indicators at gap edges
      for (const pt of [pStart, pEnd]) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = COLOR.gate;
        ctx.fill();
      }
      ctx.restore();

      // Distance annotations (only when zoomed in enough)
      if (zoom > 0.25) {
        const ang = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
        const perpX = -Math.sin(ang);
        const perpY = Math.cos(ang);
        const offset = 12 / zoom;
        const fs = Math.max(8, 10 / zoom);

        // Distance before gate (p1 → gap start)
        const distBeforeM = (gap.tStart * seg.lengthMM) / 1000;
        // Distance after gate (gap end → p2)
        const distAfterM = ((1 - gap.tEnd) * seg.lengthMM) / 1000;
        // Gate opening width
        const gateWidthM = gap.widthMM / 1000;

        ctx.save();
        ctx.font = `${fs}px sans-serif`;
        ctx.fillStyle = COLOR.gate;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Mid-before label
        if (distBeforeM > 0.05) {
          const midBefore = lerp(seg.p1, pStart, 0.5);
          ctx.fillText(
            `${distBeforeM.toFixed(2)}m`,
            midBefore.x + perpX * offset,
            midBefore.y + perpY * offset,
          );
        }
        // Gate opening label (centred on the gap)
        const midGate = lerp(pStart, pEnd, 0.5);
        ctx.fillStyle = COLOR.gate;
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.fillText(
          `${Math.round(gap.widthMM)}mm`,
          midGate.x + perpX * offset,
          midGate.y + perpY * offset,
        );
        void gateWidthM;
        ctx.font = `${fs}px sans-serif`;

        // Mid-after label
        if (distAfterM > 0.05) {
          const midAfter = lerp(pEnd, seg.p2, 0.5);
          ctx.fillStyle = COLOR.gate;
          ctx.fillText(
            `${distAfterM.toFixed(2)}m`,
            midAfter.x + perpX * offset,
            midAfter.y + perpY * offset,
          );
        }
        ctx.restore();
      }
    }

    // End-point dots
    ctx.save();
    for (const pt of [seg.p1, seg.p2]) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = COLOR.pointFill;
      ctx.fill();
      ctx.strokeStyle = segColor;
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
    }
    ctx.restore();

    // Length label
    drawLabel(seg);
  }

  function drawLabel(seg: Segment) {
    const mid = lerp(seg.p1, seg.p2, 0.5);
    const ang = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
    const labelText =
      seg.lengthMM >= 1000
        ? `${(seg.lengthMM / 1000).toFixed(2)}m`
        : `${Math.round(seg.lengthMM)}mm`;

    ctx.save();
    ctx.translate(mid.x, mid.y);
    // Keep label readable (flip if upside-down)
    const flip = ang > Math.PI / 2 || ang < -Math.PI / 2;
    ctx.rotate(flip ? ang + Math.PI : ang);

    const fs = Math.max(10, 12 / zoom);
    ctx.font = `${fs}px sans-serif`;
    const tw = ctx.measureText(labelText).width;
    const pad = 4 / zoom;
    const bh = fs + pad * 2;

    ctx.fillStyle = COLOR.labelBg;
    ctx.beginPath();
    ctx.roundRect(-tw / 2 - pad, -bh / 2, tw + pad * 2, bh, 3 / zoom);
    ctx.fill();

    ctx.fillStyle = COLOR.label;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, 0, 0);

    ctx.restore();
  }

  function drawGatePreview(seg: Segment, t: number) {
    const gp = lerp(seg.p1, seg.p2, t);
    const size = 10 / zoom;
    const ang = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);

    ctx.save();
    ctx.translate(gp.x, gp.y);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.6;

    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI);
    ctx.strokeStyle = COLOR.gate;
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();

    ctx.restore();
  }

  function scheduleRedraw() {
    cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(() => draw());
  }

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  function eventToCanvas(e: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return screenToCanvas(screen, pan, zoom);
  }

  function eventToScreen(e: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // ── Hit testing ────────────────────────────────────────────────────────────

  function hitTestSegments(pt: Point, threshold = 8): number {
    const threshWorld = threshold / zoom;
    const allSegs = allSegmentsFlat();
    let closest = -1;
    let closestD = Infinity;
    for (const { seg, flatIdx } of allSegs) {
      const { d } = closestPointOnSegment(pt, seg);
      if (d < threshWorld && d < closestD) {
        closestD = d;
        closest = flatIdx;
      }
    }
    return closest;
  }

  function hitTestLabel(pt: Point): number {
    // Returns flat segment index if pt is near its midpoint label
    const allSegs = allSegmentsFlat();
    for (const { seg, flatIdx } of allSegs) {
      const mid = lerp(seg.p1, seg.p2, 0.5);
      if (dist(pt, mid) < 30 / zoom) return flatIdx;
    }
    return -1;
  }

  function getAllGateMidpoints(): Array<{
    screenPt: Point;
    runIdx: number;
    segIdx: number;
    gateIdx: number;
    flatSegIdx: number;
  }> {
    const result: Array<{
      screenPt: Point;
      runIdx: number;
      segIdx: number;
      gateIdx: number;
      flatSegIdx: number;
    }> = [];
    let flatSeg = 0;
    for (let ri = 0; ri < runs.length; ri++) {
      const run = runs[ri];
      for (let si = 0; si < run.segments.length; si++) {
        const seg = run.segments[si];
        for (let gi = 0; gi < seg.gates.length; gi++) {
          const gate = seg.gates[gi];
          const midWorld = lerp(seg.p1, seg.p2, gate.t);
          result.push({
            screenPt: canvasToScreen(midWorld, pan, zoom),
            runIdx: ri,
            segIdx: si,
            gateIdx: gi,
            flatSegIdx: flatSeg,
          });
        }
        flatSeg++;
      }
    }
    return result;
  }

  // ── Chain stop helper ──────────────────────────────────────────────────────

  /**
   * Stops an in-progress chain draw. If the active run has only one point (i.e.
   * it is the pending chain stub), discard it. If it has ≥2 points (the very
   * first run started with the draw tool before any chain occurred), finish it
   * normally. In either case activeRunIdx is reset to -1.
   */
  function stopChain(popExtra = true) {
    if (activeRunIdx < 0 || runs[activeRunIdx]?.finished) return;
    const run = runs[activeRunIdx];

    // The dblclick's first mousedown already added the dblclick point — pop it.
    // Skip the pop when called from keyboard (Enter/Escape) since no extra point was added.
    if (popExtra && run.points.length > 1) {
      run.points.pop();
      run.segments = buildSegmentsFromPoints(run.points, scale);
      // The matching ADD_POINT was just pushed; remove it from the undo stack.
      if (undoStack[undoStack.length - 1]?.type === "ADD_POINT") {
        undoStack.pop();
      }
    }

    if (run.points.length < 2) {
      // Only the start point remains — discard the run entirely
      runs.splice(activeRunIdx, 1);
      if (undoStack[undoStack.length - 1]?.type === "ADD_RUN") {
        undoStack.pop();
      }
    } else {
      // Finish the run with its accumulated points
      run.finished = true;
      undoStack.push({ type: "FINISH_RUN", runIdx: activeRunIdx });
      notifyChange();
    }

    activeRunIdx = -1;
    scheduleRedraw();
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  function onMouseDown(e: MouseEvent) {
    if (e.button === 2) {
      // Right button: start pan
      isPanning = true;
      panStart = eventToScreen(e);
      panOrigin = { ...pan };
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;

    const canvasPt = eventToCanvas(e);
    let worldPt = snap ? snapToGrid(canvasPt, gridSize) : canvasPt;
    if (
      allowedAngles.length > 0 &&
      activeRunIdx >= 0 &&
      runs[activeRunIdx] &&
      !runs[activeRunIdx].finished &&
      runs[activeRunIdx].points.length >= 2
    ) {
      const run = runs[activeRunIdx];
      const junction = run.points[run.points.length - 1];
      const prev = run.points[run.points.length - 2];
      worldPt = snapToAllowedAngle(prev, junction, worldPt, allowedAngles);
    }
    const screenPtDown = eventToScreen(e);

    // ── Gate hit-test (all modes) ────────────────────────────────────────────
    // Check for an existing gate click/drag before any tool-specific handling.
    // A short move (<5px) will be treated as a click → edit; a longer move → drag.
    {
      const gateMids = getAllGateMidpoints();
      for (const gm of gateMids) {
        const dx = screenPtDown.x - gm.screenPt.x;
        const dy = screenPtDown.y - gm.screenPt.y;
        if (Math.sqrt(dx * dx + dy * dy) < 12) {
          draggingGate = {
            runIdx: gm.runIdx,
            segIdx: gm.segIdx,
            gateIdx: gm.gateIdx,
            flatSegIdx: gm.flatSegIdx,
            startScreenPt: screenPtDown,
          };
          return;
        }
      }
    }

    if (tool === "draw") {
      if (activeRunIdx === -1 || runs[activeRunIdx]?.finished) {
        // Check if click is on the end-point of a finished run — resume it
        let resumedIdx = -1;
        for (let ri = 0; ri < runs.length; ri++) {
          const run = runs[ri];
          if (!run.finished || run.isBoundary || run.points.length === 0) continue;
          const endPtScreen = canvasToScreen(
            run.points[run.points.length - 1],
            pan,
            zoom,
          );
          const dx = screenPtDown.x - endPtScreen.x;
          const dy = screenPtDown.y - endPtScreen.y;
          if (Math.sqrt(dx * dx + dy * dy) < 10) {
            resumedIdx = ri;
            break;
          }
        }

        if (resumedIdx >= 0) {
          // Resume the existing run — un-finish it so new points can be appended
          runs[resumedIdx].finished = false;
          activeRunIdx = resumedIdx;
          undoStack.push({ type: "RESUME_RUN", runIdx: resumedIdx }); // undo will re-finish it
        } else {
          // Start a new run with this as the first point
          const newRun: Run = {
            points: [worldPt],
            finished: false,
            segments: [],
          };
          undoStack.push({ type: "ADD_RUN" });
          runs.push(newRun);
          activeRunIdx = runs.length - 1;
        }
      } else {
        // Append point to the current run (multi-point polyline)
        const run = runs[activeRunIdx];
        run.points.push(worldPt);
        run.segments = buildSegmentsFromPoints(run.points, scale);
        notifyChange();
        undoStack.push({ type: "ADD_POINT", runIdx: activeRunIdx });
      }
      scheduleRedraw();
      return;
    }

    if (tool === "boundary") {
      if (activeRunIdx === -1 || runs[activeRunIdx]?.finished) {
        const newRun: Run = {
          points: [worldPt],
          finished: false,
          segments: [],
          isBoundary: true,
        };
        undoStack.push({ type: "ADD_RUN" });
        runs.push(newRun);
        activeRunIdx = runs.length - 1;
      } else {
        const run = runs[activeRunIdx];
        const prevRunIdx = activeRunIdx;
        run.points.push(worldPt);
        run.segments = buildSegmentsFromPoints(run.points, scale);
        run.finished = true;
        notifyChange();
        const newRun: Run = {
          points: [{ ...worldPt }],
          finished: false,
          segments: [],
          isBoundary: true,
        };
        runs.push(newRun);
        const newRunIdx = runs.length - 1;
        activeRunIdx = newRunIdx;
        undoStack.push({ type: "CHAIN_POINT", prevRunIdx, newRunIdx });
      }
      scheduleRedraw();
      return;
    }

    if (tool === "gate") {
      const flatIdx = hitTestSegments(canvasPt, 12);
      if (flatIdx >= 0) {
        const allSegs = allSegmentsFlat();
        const info = allSegs[flatIdx];
        const proj = closestPointOnSegment(canvasPt, info.seg);
        const gateIdx = info.seg.gates.length;
        undoStack.push({ type: "ADD_GATE", segIdx: flatIdx, gateIdx });
        info.seg.gates.push({ t: proj.t, widthMM: DEFAULT_GATE_WIDTH_MM });
        notifyChange();
        scheduleRedraw();
        config.onGatePlaced?.(flatIdx, gateIdx, DEFAULT_GATE_WIDTH_MM);
      }
      return;
    }

    if (tool === "move") {
      // Hit test nodes first (screen-space comparison for consistent 8px threshold)
      for (let ri = 0; ri < runs.length; ri++) {
        const run = runs[ri];
        for (let pi = 0; pi < run.points.length; pi++) {
          const nodePtScreen = canvasToScreen(run.points[pi], pan, zoom);
          const dx = screenPtDown.x - nodePtScreen.x;
          const dy = screenPtDown.y - nodePtScreen.y;
          if (Math.sqrt(dx * dx + dy * dy) < 8) {
            draggingNode = { runIdx: ri, ptIdx: pi };
            return;
          }
        }
      }

      // Label click-to-edit
      if (!editingLabel) {
        const labelIdx = hitTestLabel(canvasPt);
        if (labelIdx >= 0) {
          startLabelEdit(labelIdx, eventToScreen(e));
        }
      }
      return;
    }
  }

  function onMouseMove(e: MouseEvent) {
    const canvasPt = eventToCanvas(e);
    mouseCanvas = canvasPt;

    if (isPanning) {
      const screen = eventToScreen(e);
      pan = {
        x: panOrigin.x + (screen.x - panStart.x),
        y: panOrigin.y + (screen.y - panStart.y),
      };
      scheduleRedraw();
      return;
    }

    // Node dragging
    if (draggingNode !== null) {
      const snapped = snap ? snapToGrid(canvasPt, gridSize) : canvasPt;
      const run = runs[draggingNode.runIdx];
      run.points[draggingNode.ptIdx] = snapped;
      run.segments = buildSegmentsFromPoints(run.points, scale);
      scheduleRedraw();
      return;
    }

    // Gate dragging
    if (draggingGate !== null) {
      const seg = runs[draggingGate.runIdx].segments[draggingGate.segIdx];
      if (seg) {
        const dx = seg.p2.x - seg.p1.x;
        const dy = seg.p2.y - seg.p1.y;
        const len2 = dx * dx + dy * dy;
        if (len2 > 0) {
          const t =
            ((canvasPt.x - seg.p1.x) * dx + (canvasPt.y - seg.p1.y) * dy) /
            len2;
          seg.gates[draggingGate.gateIdx].t = Math.max(0.05, Math.min(0.95, t));
        }
        scheduleRedraw();
      }
      return;
    }

    // Update hover state
    const prevHover = hoveredSegIdx;
    hoveredSegIdx = hitTestSegments(canvasPt, 10);

    // Gate hover cursor works in all modes
    const screenPt = eventToScreen(e);
    let overGate = false;
    const gateMids = getAllGateMidpoints();
    for (const gm of gateMids) {
      const dx = screenPt.x - gm.screenPt.x;
      const dy = screenPt.y - gm.screenPt.y;
      if (Math.sqrt(dx * dx + dy * dy) < 12) {
        overGate = true;
        break;
      }
    }

    if (draggingGate !== null) {
      canvas.style.cursor = "grabbing";
    } else if (overGate) {
      canvas.style.cursor = "grab";
    } else if (tool === "move") {
      // Check if hovering a node
      let overNode = false;
      for (const run of runs) {
        for (const pt of run.points) {
          const nodePtScreen = canvasToScreen(pt, pan, zoom);
          const dx = screenPt.x - nodePtScreen.x;
          const dy = screenPt.y - nodePtScreen.y;
          if (Math.sqrt(dx * dx + dy * dy) < 8) {
            overNode = true;
            break;
          }
        }
        if (overNode) break;
      }
      canvas.style.cursor = overNode
        ? "grab"
        : hoveredSegIdx >= 0
          ? "pointer"
          : "default";
    } else if (hoveredSegIdx !== prevHover) {
      canvas.style.cursor =
        hoveredSegIdx >= 0
          ? tool === "gate"
            ? "crosshair"
            : "pointer"
          : tool === "draw"
            ? "crosshair"
            : "default";
    }

    scheduleRedraw();
  }

  function onMouseUp(e: MouseEvent) {
    if (e.button === 2) {
      isPanning = false;
    }

    if (draggingNode !== null) {
      notifyChange();
      draggingNode = null;
      canvas.style.cursor = "default";
      return;
    }

    if (draggingGate !== null) {
      const { flatSegIdx, gateIdx, startScreenPt, runIdx, segIdx } =
        draggingGate;
      const endScreen = eventToScreen(e);
      const dx = endScreen.x - startScreenPt.x;
      const dy = endScreen.y - startScreenPt.y;
      const wasDrag = Math.sqrt(dx * dx + dy * dy) > 5;

      if (wasDrag) {
        notifyChange();
      } else {
        // Click (not drag) on an existing gate → edit it
        const gate = runs[runIdx]?.segments[segIdx]?.gates[gateIdx];
        config.onGateEdit?.(
          flatSegIdx,
          gateIdx,
          gate?.gateId,
          gate?.widthMM ?? DEFAULT_GATE_WIDTH_MM,
        );
      }
      draggingGate = null;
      canvas.style.cursor = tool === "draw" ? "crosshair" : "default";
      return;
    }
  }

  function onDblClick(e: MouseEvent) {
    if (tool === "draw" && activeRunIdx >= 0 && !runs[activeRunIdx]?.finished) {
      // Stop the chain: discard the pending single-point run started by the first
      // click of this double-click, and undo the CHAIN_POINT so the previous
      // finished run is properly un-finished and trimmed.
      stopChain();
      scheduleRedraw();
      return;
    }

    // Scale calibration: double-click on an existing segment to set its real-world length
    const canvasPt = eventToCanvas(e);
    const flatIdx = hitTestSegments(canvasPt, 12);
    if (flatIdx >= 0) {
      const allSegs = allSegmentsFlat();
      const info = allSegs[flatIdx];
      if (!info) return;
      const seg = info.seg;
      const segLengthWorld = Math.sqrt(
        (seg.p2.x - seg.p1.x) ** 2 + (seg.p2.y - seg.p1.y) ** 2,
      );
      if (segLengthWorld === 0) return;
      const response = prompt(
        "Enter real-world length for this segment (e.g. 2500 for 2500mm or 2.5 for 2.5m):",
      );
      if (response === null) return;
      const parsed = parseFloat(response.replace(",", "."));
      if (isNaN(parsed) || parsed <= 0) return;
      const enteredMM = parsed < 30 ? parsed * 1000 : parsed;
      // Update scale: mm per world unit
      scale = enteredMM / segLengthWorld;
      // Recalculate all segment lengths with new scale
      for (const r of runs) {
        r.segments = buildSegmentsFromPoints(r.points, scale);
      }
      notifyChange();
      scheduleRedraw();
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const screen = eventToScreen(e);
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));

    // Zoom toward cursor
    pan = {
      x: screen.x - (screen.x - pan.x) * (newZoom / zoom),
      y: screen.y - (screen.y - pan.y) * (newZoom / zoom),
    };
    zoom = newZoom;
    scheduleRedraw();
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (editingLabel) return;
    if (e.key === "Enter" && tool === "draw") {
      if (activeRunIdx >= 0 && !runs[activeRunIdx]?.finished) {
        stopChain(false); // keyboard — no extra mousedown point to pop
        scheduleRedraw();
      }
    }
    if (e.key === "Escape" && tool === "draw") {
      if (activeRunIdx >= 0 && !runs[activeRunIdx]?.finished) {
        stopChain(false); // keyboard — no extra mousedown point to pop
        scheduleRedraw();
      }
    }
    if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undoLast();
    }
  }

  function onResize() {
    scheduleRedraw();
  }

  // ── Label editing ──────────────────────────────────────────────────────────

  function startLabelEdit(flatIdx: number, screenPos: Point) {
    const allSegs = allSegmentsFlat();
    const info = allSegs[flatIdx];
    if (!info) return;
    editingLabel = true;

    const current =
      info.seg.lengthMM >= 1000
        ? `${(info.seg.lengthMM / 1000).toFixed(2)}`
        : `${Math.round(info.seg.lengthMM)}`;

    createLabelInput(
      container,
      screenPos,
      current,
      (val) => {
        editingLabel = false;
        const num = parseFloat(val.replace(",", "."));
        if (!isNaN(num) && num > 0) {
          // Determine unit: if the number looks like metres (≤ 30), convert to mm
          info.seg.lengthMM = num < 30 ? num * 1000 : num;
          notifyChange();
        }
        scheduleRedraw();
      },
      () => {
        editingLabel = false;
        scheduleRedraw();
      },
    );
  }

  // ── Undo ───────────────────────────────────────────────────────────────────

  function undoLast() {
    if (undoStack.length === 0) return;
    const action = undoStack.pop()!;

    switch (action.type) {
      case "ADD_RUN": {
        runs.pop();
        activeRunIdx = -1;
        break;
      }
      case "ADD_POINT": {
        const run = runs[action.runIdx];
        if (run && run.points.length > 1) {
          run.points.pop();
          run.segments = buildSegmentsFromPoints(run.points, scale);
        } else if (run) {
          runs.splice(action.runIdx, 1);
          undoStack.pop(); // also remove the ADD_RUN
          activeRunIdx = -1;
        }
        break;
      }
      case "CHAIN_POINT": {
        // Remove the newly-started chain run
        runs.splice(action.newRunIdx, 1);
        // Un-finish the previous run and remove its last (chained) point
        const prevRun = runs[action.prevRunIdx];
        if (prevRun) {
          prevRun.finished = false;
          if (prevRun.points.length > 1) {
            prevRun.points.pop();
            prevRun.segments = buildSegmentsFromPoints(prevRun.points, scale);
          }
        }
        activeRunIdx = action.prevRunIdx;
        break;
      }
      case "FINISH_RUN": {
        const run = runs[action.runIdx];
        if (run) {
          run.finished = false;
          activeRunIdx = action.runIdx;
        }
        break;
      }
      case "RESUME_RUN": {
        // Undo a resume — re-finish the run and clear active draw state
        const run = runs[action.runIdx];
        if (run) {
          run.finished = true;
          activeRunIdx = -1;
        }
        break;
      }
      case "ADD_GATE": {
        const allSegs = allSegmentsFlat();
        const info = allSegs[action.segIdx];
        if (info) {
          info.seg.gates.splice(action.gateIdx, 1);
        }
        break;
      }
      case "CLEAR": {
        runs = action.runs;
        scale = action.scale;
        activeRunIdx = -1;
        break;
      }
    }

    notifyChange();
    scheduleRedraw();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function setTool(t: Tool) {
    tool = t;
    if (t === "draw" || t === "boundary") {
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "default";
      // Finish any active drawing run
      if (activeRunIdx >= 0 && !runs[activeRunIdx]?.finished) {
        const run = runs[activeRunIdx];
        if (run.points.length >= 2) {
          run.finished = true;
          undoStack.push({ type: "FINISH_RUN", runIdx: activeRunIdx });
          notifyChange();
        } else {
          runs.splice(activeRunIdx, 1);
        }
        activeRunIdx = -1;
      }
    }
    scheduleRedraw();
  }

  function undo() {
    undoLast();
  }

  function clear() {
    undoStack.push({
      type: "CLEAR",
      runs: JSON.parse(JSON.stringify(runs)),
      scale,
    });
    runs = [];
    activeRunIdx = -1;
    notifyChange();
    scheduleRedraw();
  }

  /** Set zoom so that `targetMetres` of real-world width fits the canvas. */
  function fitToWidth(targetMetres = 50) {
    const W = canvas.getBoundingClientRect().width || canvas.width || 800;
    zoom = W / (targetMetres * scale);
    pan = { x: 0, y: 0 };
    scheduleRedraw();
  }

  /** Zoom and pan so all drawn runs fill the canvas with padding. */
  function fitToContent() {
    const allPts = runs.flatMap((r) => r.points);
    if (allPts.length === 0) {
      fitToWidth(50);
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of allPts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const W = canvas.getBoundingClientRect().width || canvas.width || 800;
    const H = canvas.getBoundingClientRect().height || canvas.height || 420;
    const pad = 80; // px
    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    zoom = Math.min((W - pad * 2) / contentW, (H - pad * 2) / contentH, 8);
    pan = {
      x: W / 2 - zoom * (minX + contentW / 2),
      y: H / 2 - zoom * (minY + contentH / 2),
    };
    scheduleRedraw();
  }

  function resetView() {
    fitToWidth(50);
  }

  function setSnapToGrid(s: boolean) {
    snap = s;
    scheduleRedraw();
  }

  function setAllowedAngles(angles: number[]) {
    allowedAngles = angles;
    scheduleRedraw();
  }

  function setShowGrid(s: boolean) {
    showGrid = s;
    scheduleRedraw();
  }

  function setScale(pxPerMetre: number) {
    scale = pxPerMetre;
    // Recalculate all segment lengths
    for (const run of runs) {
      run.segments = buildSegmentsFromPoints(run.points, scale);
    }
    notifyChange();
    scheduleRedraw();
  }

  /**
   * Load a Google Static Maps tile and register its geo-scale so the image is
   * drawn at the correct real-world size inside the canvas coordinate system.
   *
   * @param imageUrl  Google Static Maps URL (already built with center/zoom/size)
   * @param opacity   0–1 overlay opacity
   * @param lat       Centre latitude of the tile (decimal degrees)
   * @param mapZoom   Google Maps zoom level used in the URL (e.g. 20)
   */
  function loadMapTile(
    imageUrl: string,
    opacity: number,
    lat: number,
    mapZoom: number,
  ) {
    mapOpacity = opacity;
    if (!imageUrl) {
      mapImage = null;
      mapWorldWidth = 0;
      scheduleRedraw();
      return;
    }

    // Ground resolution: metres per image pixel at this latitude and zoom level.
    // Formula from Google Maps documentation (Mercator projection).
    const metersPerPixel =
      (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, mapZoom);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      mapImage = img;
      // Canvas world size of the tile (world pixels = metres × scale)
      mapWorldWidth = img.width * metersPerPixel * scale;
      mapWorldHeight = img.height * metersPerPixel * scale;
      // Anchor the tile centre to the current view centre so the map appears
      // immediately beneath the visible canvas area when loaded.
      const cw = canvas.width || canvas.getBoundingClientRect().width || 800;
      const ch = canvas.height || canvas.getBoundingClientRect().height || 400;
      mapWorldOriginX = (cw / 2 - pan.x) / zoom;
      mapWorldOriginY = (ch / 2 - pan.y) / zoom;
      scheduleRedraw();
    };
    img.onerror = () => {
      mapImage = null;
      mapWorldWidth = 0;
      scheduleRedraw();
    };
    img.src = imageUrl;
  }

  function setMapOpacity(opacity: number) {
    mapOpacity = opacity;
    scheduleRedraw();
  }

  function updateGateWidth(segIdx: number, gateIdx: number, widthMM: number) {
    const allSegs = allSegmentsFlat();
    const info = allSegs[segIdx];
    if (info && info.seg.gates[gateIdx] !== undefined) {
      info.seg.gates[gateIdx].widthMM = widthMM;
      scheduleRedraw();
    }
  }

  /** Associate a GateConfig id with a canvas gate marker so it can be found for editing. */
  function setGateId(flatSegIdx: number, gateIdx: number, id: string) {
    const allSegs = allSegmentsFlat();
    const info = allSegs[flatSegIdx];
    if (info && info.seg.gates[gateIdx] !== undefined) {
      info.seg.gates[gateIdx].gateId = id;
    }
  }

  /**
   * Set post positions to overlay on the canvas after BOM generation.
   * Positions are in canvas world coordinates — the same space as drawn nodes
   * (i.e. canvas pixels relative to the origin, before the pan/zoom transform).
   * Pass null to clear.
   */
  function setPostPositions(
    positions: Array<{ x: number; y: number; label?: string }> | null,
  ) {
    postPositions = positions;
    scheduleRedraw();
  }

  /** Set per-segment max panel widths (flat array, index matches allSegmentsFlat order). */
  function setSegmentPanelWidths(widths: number[]) {
    segmentPanelWidths = widths;
    scheduleRedraw();
  }

  /** Set the job-level default panel width for the in-progress preview segment. */
  function setJobPanelWidth(mm: number | null) {
    jobPanelWidthMm = mm;
    scheduleRedraw();
  }

  /**
   * Replace the current canvas state with the runs described by `layout`.
   * Used for form-driven geometry changes (bidirectional sync).
   * Boundary runs in `layout.boundaries` are also restored.
   */
  function loadLayout(layout: CanvasLayout) {
    const newRuns: Run[] = [];

    // Group flat segments into runs using totalLengthM as slice boundaries
    let segIdx = 0;
    for (const runSummary of layout.runs) {
      const targetLengthMm = runSummary.totalLengthM * 1000;
      let cumLength = 0;
      const runSegs: CanvasSegment[] = [];
      while (segIdx < layout.segments.length) {
        const cseg = layout.segments[segIdx];
        runSegs.push(cseg);
        cumLength += cseg.lengthMM;
        segIdx++;
        if (Math.abs(cumLength - targetLengthMm) < 1) break;
      }
      if (runSegs.length === 0) continue;

      const points: Point[] = [
        { x: runSegs[0].startX, y: runSegs[0].startY },
      ];
      const segments: Segment[] = runSegs.map((cseg) => {
        const p1 = { x: cseg.startX, y: cseg.startY };
        const p2 = { x: cseg.endX, y: cseg.endY };
        points.push({ ...p2 });
        return { p1, p2, lengthMM: cseg.lengthMM, gates: [] };
      });
      // Remove duplicated intermediate points (each segment pushed its p2)
      // points is [run start, seg0.end, seg1.end, ...] which is correct as-is
      newRuns.push({ points, segments, finished: true });
    }

    // Restore boundary runs
    for (const cseg of layout.boundaries ?? []) {
      const p1 = { x: cseg.startX, y: cseg.startY };
      const p2 = { x: cseg.endX, y: cseg.endY };
      newRuns.push({
        points: [p1, p2],
        segments: [{ p1, p2, lengthMM: cseg.lengthMM, gates: [] }],
        finished: true,
        isBoundary: true,
      });
    }

    // Re-attach gates by flat segment index (non-boundary runs only)
    let flatIdx = 0;
    for (const run of newRuns) {
      if (run.isBoundary) continue;
      for (const seg of run.segments) {
        const segsGates = layout.gates.filter(
          (g) => g.segmentIndex === flatIdx,
        );
        seg.gates = segsGates.map((g) => ({
          t: g.positionOnSegment,
          widthMM: g.widthMM,
        }));
        flatIdx++;
      }
    }

    runs = newRuns;
    activeRunIdx = -1;
    undoStack = [];
    // Do NOT call notifyChange() here — this is a form→canvas push.
    // The caller already has the latest data in context; firing onLayoutChange
    // would trigger handleLiveSync which dispatches SET_PAYLOAD with fresh IDs,
    // causing all RunCard components to remount and lose their expanded state.
    scheduleRedraw();
  }

  function destroy() {
    cancelAnimationFrame(animFrame);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("dblclick", onDblClick);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", onResize);
    // Remove any label input that might be open
    const inp = container.querySelector('input[type="text"]');
    if (inp) inp.parentNode?.removeChild(inp);
  }

  // ── Register events ────────────────────────────────────────────────────────

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("dblclick", onDblClick);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);

  // Initial draw — fit to 50m wide view
  fitToWidth(50);

  return {
    destroy,
    getLayout,
    setTool,
    undo,
    clear,
    resetView,
    setSnapToGrid,
    setAllowedAngles,
    setShowGrid,
    setScale,
    setMapOpacity,
    loadMapTile,
    updateGateWidth,
    setGateId,
    setPostPositions,
    setSegmentPanelWidths,
    setJobPanelWidth,
    loadLayout,
    fitToWidth,
    fitToContent,
  };
}
