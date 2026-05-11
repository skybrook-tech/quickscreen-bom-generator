// canvasEngine.ts — Pure TypeScript canvas engine (no React imports)
// All drawing, interaction, snap, undo logic lives here.

export interface CanvasSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  lengthMM: number; // real-world length in mm (user-editable)
  angleDeg: number; // angle from horizontal
  contextType?: "boundary" | "building";
}

export type GateAnchor = "start" | "center" | "end";

export interface CanvasGate {
  segmentIndex: number;
  positionOnSegment: number; // 0-1 fraction along segment
  anchor?: GateAnchor;
  widthMM: number;
  gateId?: string;
  useGatePostsAsFenceTermination?: boolean;
  gateType?: CanvasGateType;
  swingDirection?: CanvasGateSwingDirection;
  slidingSide?: CanvasGateSlidingSide;
}

export interface CanvasRunSummary {
  label: string;
  totalLengthM: number;
  cornerCount: number;
  gates: CanvasGate[];
  sections?: Array<{
    label: string;
    lengthM: number;
    panelCount: number;
    gateCount: number;
  }>;
}

export interface CanvasLayout {
  segments: CanvasSegment[];
  gates: CanvasGate[];
  totalLengthM: number;
  cornerCount: number; // count of ~90° angles between adjacent segments
  runs: CanvasRunSummary[];
  /** Non-product boundary lines (neighbouring fences, property lines, etc.). Ignored by canonicalAdapter. */
  boundaries: CanvasSegment[];
  /** Free text notes placed by the user on the map. Ignored by canonicalAdapter. */
  textNotes?: CanvasTextNote[];
  /** Existing posts and pillars placed as site context. Ignored by canonicalAdapter. */
  siteMarkers?: CanvasSiteMarker[];
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
    gateType?: CanvasGateType,
    slidingSide?: CanvasGateSlidingSide,
  ) => void;
  /** Called when the user clicks (not drags) an existing gate marker — open its editor */
  onGateEdit?: (
    flatSegIdx: number,
    gateIdx: number,
    gateId: string | undefined,
    currentWidthMM: number,
  ) => void;
}

export type CanvasGateType = "single-swing" | "double-swing" | "sliding";
export type CanvasGateSwingDirection = "in" | "out" | "left" | "right";
export type CanvasGateSlidingSide = "front" | "back";

export interface CanvasGateVisual {
  gateType: CanvasGateType;
  swingDirection?: CanvasGateSwingDirection;
  slidingSide?: CanvasGateSlidingSide;
}

export interface CanvasTextNote {
  x: number;
  y: number;
  text: string;
  width?: number;
  height?: number;
}

export interface CanvasSiteMarker {
  x: number;
  y: number;
  markerType: "post" | "pillar";
  label?: string;
}

// ── Internal state types ──────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

interface CanvasPointerLike {
  button: number;
  clientX: number;
  clientY: number;
  preventDefault: () => void;
}

interface Segment {
  p1: Point;
  p2: Point;
  lengthMM: number; // mm; defaults derived from pixel distance × scale
  gates: GateMarker[];
}

interface SegmentMapLabel {
  text: string;
  t: number;
  tStart: number;
  tEnd: number;
  kind: "panel" | "gate";
}

interface GateMarker {
  t: number; // 0-1 along segment
  anchor?: GateAnchor;
  widthMM: number;
  gateId?: string; // matches the GateConfig.id in GateContext once the gate is saved
  useGatePostsAsFenceTermination?: boolean;
  gateType?: CanvasGateType;
  swingDirection?: CanvasGateSwingDirection;
  slidingSide?: CanvasGateSlidingSide;
}

type Tool = "draw" | "gate" | "move" | "boundary" | "building" | "text" | "post" | "pillar";

type UndoAction =
  | { type: "ADD_POINT"; runIdx: number }
  | { type: "FINISH_RUN"; runIdx: number }
  | { type: "RESUME_RUN"; runIdx: number }
  | { type: "ADD_RUN" }
  | { type: "ADD_GATE"; segIdx: number; gateIdx: number }
  | { type: "CLEAR"; runs: Run[]; scale: number }
  | { type: "CHAIN_POINT"; prevRunIdx: number; newRunIdx: number };

interface CanvasSnapshot {
  runs: Run[];
  scale: number;
  activeRunIdx: number;
  textNotes: CanvasTextNote[];
  siteMarkers: CanvasSiteMarker[];
}

interface RedoEntry {
  action: UndoAction;
  snapshot: CanvasSnapshot;
}

interface Run {
  points: Point[];
  finished: boolean;
  segments: Segment[];
  isBoundary?: boolean;
  boundaryType?: "boundary" | "building";
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

function snapBearingFrom(origin: Point, candidate: Point, stepDeg: number): Point {
  const d = dist(origin, candidate);
  if (d === 0 || stepDeg <= 0) return candidate;
  const bearing = angleDeg(origin, candidate);
  const snapped = Math.round(bearing / stepDeg) * stepDeg;
  const rad = (snapped * Math.PI) / 180;
  return {
    x: origin.x + d * Math.cos(rad),
    y: origin.y + d * Math.sin(rad),
  };
}

function fiveDegreeAngles(): number[] {
  const values: number[] = [];
  for (let a = 5; a <= 180; a += 5) values.push(a);
  return values;
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

function rebuildSegmentsPreservingGates(run: Run, scale: number) {
  const previousGates = run.segments.map((seg) =>
    seg.gates.map((gate) => ({ ...gate })),
  );
  run.segments = buildSegmentsFromPoints(run.points, scale);
  run.segments.forEach((seg, idx) => {
    seg.gates = previousGates[idx] ?? [];
  });
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

function gateAnchorForPlacement(seg: Segment, t: number, gateWidthMM: number): GateAnchor {
  if (seg.lengthMM <= 0) return "center";
  const halfGateT = Math.min(0.5, gateWidthMM / seg.lengthMM / 2);
  if (t <= halfGateT) return "start";
  if (t >= 1 - halfGateT) return "end";
  return "center";
}

function snapGatePositionTo100mm(seg: Segment, t: number, enabled: boolean): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (!enabled || seg.lengthMM <= 0) return clamped;
  const snappedMM = Math.round((clamped * seg.lengthMM) / 100) * 100;
  return Math.max(0, Math.min(1, snappedMM / seg.lengthMM));
}

function gateRange(seg: Segment, gate: Pick<GateMarker, "t" | "widthMM" | "anchor">) {
  if (seg.lengthMM <= 0) {
    return { tStart: gate.t, tEnd: gate.t, tMid: gate.t };
  }
  const gateT = Math.min(1, gate.widthMM / seg.lengthMM);
  if (gate.anchor === "start") {
    return { tStart: 0, tEnd: gateT, tMid: gateT / 2 };
  }
  if (gate.anchor === "end") {
    return { tStart: 1 - gateT, tEnd: 1, tMid: 1 - gateT / 2 };
  }
  const halfT = gateT / 2;
  const tStart = Math.max(0, gate.t - halfT);
  const tEnd = Math.min(1, gate.t + halfT);
  return { tStart, tEnd, tMid: (tStart + tEnd) / 2 };
}

function offsetPointFromSegment(seg: Segment, t: number, offset: number): Point {
  const base = lerp(seg.p1, seg.p2, t);
  const ang = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
  return {
    x: base.x - Math.sin(ang) * offset,
    y: base.y + Math.cos(ang) * offset,
  };
}

// ── Label editing overlay ─────────────────────────────────────────────────────

function createLabelInput(
  container: HTMLElement,
  screenPos: Point,
  initialValue: string,
  onCommit: (v: string) => void,
  onCancel: () => void,
  width = 80,
): HTMLInputElement {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.value = initialValue;
  inp.style.cssText = `
    position: absolute;
    left: ${screenPos.x - width / 2}px;
    top: ${screenPos.y - 13}px;
    width: ${width}px;
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
  let gateSnap100 = true;
  let showGrid = config.showGrid;
  let gridSize = config.gridSize;
  let allowedAngles: number[] = config.allowedAngles ?? [];
  let shiftDown = false;

  /**
   * Compute the effective snap angle set for the current context.
   * - Shift held: only 180° (straight continuation) — locks to straight line.
   * - Snap on: nearest 5° turn so the user can draw at any practical angle.
   * - Snap off: product metadata can still constrain angles where supplied.
   */
  function effectiveSnapAngles(shiftHeld: boolean): number[] {
    if (shiftHeld) return [180];
    if (snap) return fiveDegreeAngles();
    if (allowedAngles.length === 0) return [];
    return Array.from(new Set([...allowedAngles, 180]));
  }
  let mouseCanvas: Point = { x: 0, y: 0 };
  let isPanning = false;
  let panStart: Point = { x: 0, y: 0 };
  let panOrigin: Point = { x: 0, y: 0 };
  let undoStack: UndoAction[] = [];
  let redoStack: RedoEntry[] = [];
  let gateVisuals: Record<string, CanvasGateVisual> = {};
  let pendingGatePlacement: CanvasGateVisual & { widthMM: number } = {
    gateType: "single-swing",
    swingDirection: "out",
    slidingSide: "front",
    widthMM: DEFAULT_GATE_WIDTH_MM,
  };
  let highlightedMapLabel: string | null = null;
  let textNotes: CanvasTextNote[] = [];
  let siteMarkers: CanvasSiteMarker[] = [];
  let pendingTextNote: { start: Point; current: Point } | null = null;
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
  let lastTouchPointer: CanvasPointerLike | null = null;
  let lastTapTime = 0;
  let lastTapScreen: Point | null = null;
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
  // Pre-computed stats text pushed from the canonical payload (via LayoutCanvasV3 → FenceLayoutCanvas).
  // Using the canonical data ensures the overlay always matches the form's calcRunStats output.
  let pushedStatsGlobal = '';
  let pushedStatsPerRun: string[] = [];
  let cssCanvasWidth = 0;
  let cssCanvasHeight = 0;
  let devicePixelRatioScale = 1;

  // Resize canvas to fill its CSS size
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const nextDpr = Math.max(1, window.devicePixelRatio || 1);
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    const backingWidth = Math.round(nextWidth * nextDpr);
    const backingHeight = Math.round(nextHeight * nextDpr);
    if (
      canvas.width !== backingWidth ||
      canvas.height !== backingHeight ||
      cssCanvasWidth !== nextWidth ||
      cssCanvasHeight !== nextHeight ||
      devicePixelRatioScale !== nextDpr
    ) {
      cssCanvasWidth = nextWidth;
      cssCanvasHeight = nextHeight;
      devicePixelRatioScale = nextDpr;
      canvas.width = backingWidth;
      canvas.height = backingHeight;
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

  function cloneRuns(): Run[] {
    return JSON.parse(JSON.stringify(runs)) as Run[];
  }

  function snapshot(): CanvasSnapshot {
    return {
      runs: cloneRuns(),
      scale,
      activeRunIdx,
      textNotes: JSON.parse(JSON.stringify(textNotes)) as CanvasTextNote[],
      siteMarkers: JSON.parse(JSON.stringify(siteMarkers)) as CanvasSiteMarker[],
    };
  }

  function restoreSnapshot(next: CanvasSnapshot) {
    runs = JSON.parse(JSON.stringify(next.runs)) as Run[];
    scale = next.scale;
    activeRunIdx = next.activeRunIdx;
    textNotes = JSON.parse(JSON.stringify(next.textNotes ?? [])) as CanvasTextNote[];
    siteMarkers = JSON.parse(JSON.stringify(next.siteMarkers ?? [])) as CanvasSiteMarker[];
  }

  function pushUndo(action: UndoAction) {
    undoStack.push(action);
    redoStack = [];
  }

  function gateVisualFor(gate: GateMarker): CanvasGateVisual {
    return gate.gateId && gateVisuals[gate.gateId]
      ? {
          gateType: gateVisuals[gate.gateId].gateType,
          swingDirection: gateVisuals[gate.gateId].swingDirection,
          slidingSide: gateVisuals[gate.gateId].slidingSide ?? gate.slidingSide ?? "front",
        }
      : {
          gateType: gate.gateType ?? "single-swing",
          swingDirection: gate.swingDirection ?? "out",
          slidingSide: gate.slidingSide ?? "front",
        };
  }

  function drawHighlightedMapLabel(seg: Segment, label: SegmentMapLabel) {
    const start = lerp(seg.p1, seg.p2, label.tStart);
    const end = lerp(seg.p1, seg.p2, label.tEnd);
    ctx.save();
    ctx.strokeStyle = "rgba(245,158,11,0.88)";
    ctx.lineWidth = 9 / zoom;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3 / zoom;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }

  function setSegmentLength(flatIdx: number, lengthMM: number) {
    const info = allSegmentsFlat()[flatIdx];
    if (!info || lengthMM <= 0) return;

    const run = runs[info.runIdx];
    const start = run.points[info.segIdx];
    const end = run.points[info.segIdx + 1];
    if (!start || !end) return;

    const currentWorldLength = dist(start, end);
    if (currentWorldLength === 0) return;

    const targetWorldLength = (lengthMM / 1000) * scale;
    const unitX = (end.x - start.x) / currentWorldLength;
    const unitY = (end.y - start.y) / currentWorldLength;
    const nextEnd = {
      x: start.x + unitX * targetWorldLength,
      y: start.y + unitY * targetWorldLength,
    };
    const delta = {
      x: nextEnd.x - end.x,
      y: nextEnd.y - end.y,
    };

    // Move the edited endpoint and everything downstream so connected
    // segments keep their shape, similar to professional plan editors.
    for (let i = info.segIdx + 1; i < run.points.length; i++) {
      run.points[i] = {
        x: run.points[i].x + delta.x,
        y: run.points[i].y + delta.y,
      };
    }
    rebuildSegmentsPreservingGates(run, scale);
    info.seg.lengthMM = lengthMM;
    notifyChange();
    scheduleRedraw();
  }

  function snapDrawingPoint(candidate: Point): Point {
    if (activeRunIdx < 0 || !runs[activeRunIdx] || runs[activeRunIdx].finished) {
      return candidate;
    }
    const run = runs[activeRunIdx];
    if (run.points.length === 0) return candidate;
    const lastPt = run.points[run.points.length - 1];
    let snapped = snap ? snapToGrid(candidate, gridSize) : candidate;
    if (shiftDown && run.points.length >= 2) {
      const prev = run.points[run.points.length - 2];
      return snapToAllowedAngle(prev, lastPt, snapped, [180]);
    }
    if (snap) return snapBearingFrom(lastPt, snapped, 5);
    const angles = effectiveSnapAngles(false);
    if (run.points.length >= 2 && angles.length > 0) {
      const prev = run.points[run.points.length - 2];
      snapped = snapToAllowedAngle(prev, lastPt, snapped, angles);
    }
    return snapped;
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
          anchor: g.anchor,
          widthMM: g.widthMM,
          gateId: g.gateId,
          useGatePostsAsFenceTermination:
            g.useGatePostsAsFenceTermination ?? true,
          gateType: g.gateType,
          swingDirection: g.swingDirection,
          slidingSide: g.slidingSide,
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
          contextType: run.boundaryType ?? "boundary",
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
            anchor: g.anchor,
            widthMM: g.widthMM,
            gateId: g.gateId,
            useGatePostsAsFenceTermination:
              g.useGatePostsAsFenceTermination ?? true,
            gateType: g.gateType,
            swingDirection: g.swingDirection,
            slidingSide: g.slidingSide,
          });
        });
      });
      return {
        label: `Run ${ri + 1}`,
        totalLengthM: runLengthM,
        cornerCount: runCorners,
        gates: runGates,
        sections: run.segments.map((seg, si) => ({
          label: `Section ${si + 1}`,
          lengthM: seg.lengthMM / 1000,
          panelCount: Math.max(1, Math.ceil(seg.lengthMM / 2600)),
          gateCount: seg.gates.length,
        })),
      };
    });

    return {
      segments,
      gates,
      totalLengthM: totalLengthM(nonBoundaryRuns),
      cornerCount: countCorners(nonBoundaryRuns),
      runs: runSummaries,
      boundaries,
      textNotes: [...textNotes],
      siteMarkers: [...siteMarkers],
    };
  }

  function notifyChange() {
    config.onLayoutChange?.(getLayout());
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  function draw() {
    resizeCanvas();
    const W = cssCanvasWidth || canvas.getBoundingClientRect().width || 800;
    const H = cssCanvasHeight || canvas.getBoundingClientRect().height || 420;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(
      devicePixelRatioScale,
      0,
      0,
      devicePixelRatioScale,
      0,
      0,
    );

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
    const segmentCounters = new Map<number, { panel: number; gate: number }>();
    for (const { seg, flatIdx, runIdx } of allSegs) {
      const colorIdx = runColorIdx.get(runIdx) ?? 0;
      const runNumber = colorIdx + 1;
      const startNumbers = segmentCounters.get(runIdx) ?? { panel: 1, gate: 1 };
      const { labels, nextPanelNumber, nextGateNumber } = segmentLabelsForMap(
        seg,
        runNumber,
        startNumbers.panel,
        startNumbers.gate,
      );
      segmentCounters.set(runIdx, { panel: nextPanelNumber, gate: nextGateNumber });
      drawSegment(
        seg,
        flatIdx === hoveredSegIdx,
        getRunColor(colorIdx),
        getRunColorHover(colorIdx),
        labels,
      );
    }

    // Boundary runs — dashed gray lines (non-product context lines)
    {
      const hasActiveBoundary =
        (tool === "boundary" || tool === "building") &&
        activeRunIdx >= 0 &&
        runs[activeRunIdx]?.isBoundary &&
        !runs[activeRunIdx].finished;
      for (const run of runs) {
        if (!run.isBoundary) continue;
        if (run.segments.length === 0) continue;
        ctx.save();
        const isBuilding = run.boundaryType === "building";
        ctx.setLineDash(isBuilding ? [] : [8 / zoom, 4 / zoom]);
        ctx.strokeStyle = isBuilding ? "rgba(30,64,175,0.88)" : "#6b7280";
        ctx.lineWidth = isBuilding ? 3 / zoom : 2 / zoom;
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
        const isBuilding = run.boundaryType === "building";
        ctx.setLineDash(isBuilding ? [] : [6 / zoom, 4 / zoom]);
        ctx.strokeStyle = isBuilding ? "rgba(30,64,175,0.5)" : "rgba(107,114,128,0.5)";
        ctx.lineWidth = isBuilding ? 3 / zoom : 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(lastPt.x, lastPt.y);
        ctx.lineTo(mouseCanvas.x, mouseCanvas.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    drawTextNotes();
    drawSiteMarkers();
    drawPendingTextNote();

    // Preview line (while drawing)
    if ((tool === "draw" || tool === "building") && activeRunIdx >= 0) {
      const run = runs[activeRunIdx];
      if (run && run.points.length > 0 && !run.finished) {
        const lastPt = run.points[run.points.length - 1];
        const target = snapDrawingPoint(mouseCanvas);
        ctx.save();
        const isBuilding = run.boundaryType === "building";
        ctx.setLineDash(isBuilding ? [] : [6, 4]);
        ctx.strokeStyle = isBuilding ? "rgba(30,64,175,0.72)" : COLOR.preview;
        ctx.lineWidth = isBuilding ? 3 / zoom : 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(lastPt.x, lastPt.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.restore();

        drawActiveEndpoint(lastPt, "last point");
        drawActiveEndpoint(target, "next point", true);

        // Post position preview along the in-progress segment
        const segDist = dist(lastPt, target);
        if (!isBuilding && jobPanelWidthMm && jobPanelWidthMm > 0 && segDist > 0) {
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
    if (tool === "draw" && activeRunIdx >= 0) {
      const snapped = snapDrawingPoint(mouseCanvas);
      ctx.save();
      ctx.beginPath();
      ctx.arc(snapped.x, snapped.y, 4 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.restore();
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
    if (segmentPanelWidths.length > 0) {
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
    if (hoveredSegIdx < 0) return;

    let line: string;
    const detailLines: string[] = [];
    const spacingText = (seg: Segment, flatIdx: number, label: string) => {
      const maxW = segmentPanelWidths[flatIdx] ?? jobPanelWidthMm ?? 0;
      if (maxW <= 0 || seg.lengthMM <= 0) return `${label} section length: max post spacing not set`;
      const panels = Math.max(1, Math.ceil(Math.round(seg.lengthMM) / maxW));
      const actualSpacing = Math.round(seg.lengthMM / panels);
      return `${label} section length ${(seg.lengthMM / 1000).toFixed(2)}m: ${panels} panel${panels === 1 ? "" : "s"} @ ${actualSpacing}mm spacing`;
    };

    // Use pre-computed canonical stats if available (pushed from LayoutCanvasV3 via calcRunStats).
    // Falls back to self-computed values when the overlay hasn't been populated yet.
    if (hoveredSegIdx >= 0 && hoveredSegIdx < allSegs.length && pushedStatsPerRun.length > 0) {
      // Hover mode — identify the non-boundary run index containing the hovered segment
      const { runIdx } = allSegs[hoveredSegIdx];
      let nbIdx = 0;
      let flatStart = 0;
      for (let ri = 0; ri < runs.length; ri++) {
        if (runs[ri].isBoundary) continue;
        if (ri === runIdx) break;
        flatStart += runs[ri].segments.length;
        nbIdx++;
      }
      line = pushedStatsPerRun[nbIdx] ?? pushedStatsGlobal;
      const run = runs[runIdx];
      run.segments.forEach((seg, si) => {
        detailLines.push(spacingText(seg, flatStart + si, `S${si + 1}`));
      });
    } else if (hoveredSegIdx < 0 && pushedStatsGlobal) {
      line = pushedStatsGlobal;
      allSegs.slice(0, 3).forEach(({ seg }, i) => {
        detailLines.push(spacingText(seg, i, `S${i + 1}`));
      });
      if (allSegs.length > 3) {
        detailLines.push(`+ ${allSegs.length - 3} more section${allSegs.length - 3 === 1 ? "" : "s"}`);
      }
    } else if (hoveredSegIdx >= 0 && hoveredSegIdx < allSegs.length) {
      // Fallback: self-compute (no pushed stats yet)
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
        if (maxW > 0) panels += Math.ceil(Math.round(run.segments[si].lengthMM) / maxW);
        detailLines.push(spacingText(run.segments[si], flatStart + si, `S${si + 1}`));
      }
      line = `Run ${nbIdx + 1}  ·  ${segs} ${segs === 1 ? "seg" : "segs"}  ·  ${panels} ${panels === 1 ? "panel" : "panels"}  ·  ${corners} ${corners === 1 ? "corner" : "corners"}`;
    } else {
      // Fallback: self-compute global totals (no pushed stats yet)
      const totalSegs = allSegs.length;
      const totalCorners = countCorners(nbRuns);
      let totalPanels = 0;
      for (let i = 0; i < allSegs.length; i++) {
        const maxW = segmentPanelWidths[i] ?? 0;
        if (maxW > 0)
          totalPanels += Math.ceil(Math.round(allSegs[i].seg.lengthMM) / maxW);
        if (i < 3) detailLines.push(spacingText(allSegs[i].seg, i, `S${i + 1}`));
      }
      line = `${nbRuns.length} ${nbRuns.length === 1 ? "run" : "runs"}  ·  ${totalSegs} ${totalSegs === 1 ? "seg" : "segs"}  ·  ${totalPanels} ${totalPanels === 1 ? "panel" : "panels"}  ·  ${totalCorners} ${totalCorners === 1 ? "corner" : "corners"}`;
      if (allSegs.length > 3) {
        detailLines.push(`+ ${allSegs.length - 3} more section${allSegs.length - 3 === 1 ? "" : "s"}`);
      }
    }

    const lines = [line, ...detailLines];
    const pad = 8;
    const fs = 12;
    ctx.save();
    ctx.font = `${fs}px sans-serif`;
    const w = Math.max(...lines.map((text) => ctx.measureText(text).width)) + pad * 2;
    const h = lines.length * (fs + 3) + pad * 2;
    const anchor = canvasToScreen(mouseCanvas, pan, zoom);
    const screenW = cssCanvasWidth || canvas.getBoundingClientRect().width || 800;
    const screenH = cssCanvasHeight || canvas.getBoundingClientRect().height || 420;
    const x = Math.min(screenW - w - 10, Math.max(10, anchor.x + 18));
    const y = Math.min(screenH - h - 10, Math.max(10, anchor.y + 18));
    ctx.fillStyle = "rgba(15,23,42,0.78)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((text, idx) => {
      ctx.fillStyle = idx === 0 ? "#e5e7eb" : "#cbd5e1";
      ctx.fillText(text, x + pad, y + pad + idx * (fs + 3));
    });
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
    const drawPost = (px: number, py: number) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        px - half - borderWidth,
        py - half - borderWidth,
        squareSize + borderWidth * 2,
        squareSize + borderWidth * 2,
      );
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(px - half, py - half, squareSize, squareSize);
    };
    const drawPostRange = (seg: Segment, tStart: number, tEnd: number, maxW: number) => {
      const lengthMm = (tEnd - tStart) * seg.lengthMM;
      if (maxW <= 0 || lengthMm <= 0) return;
      const numPanels = Math.max(1, Math.ceil(lengthMm / maxW));
      for (let i = 0; i <= numPanels; i++) {
        const localT = i / numPanels;
        const t = tStart + (tEnd - tStart) * localT;
        const px = seg.p1.x + t * (seg.p2.x - seg.p1.x);
        const py = seg.p1.y + t * (seg.p2.y - seg.p1.y);
        drawPost(px, py);
      }
    };
    ctx.save();
    let flatIdx = 0;
    for (const run of runs) {
      if (run.isBoundary || !run.finished) continue;
      for (const seg of run.segments) {
        if (seg.gates.length === 0) {
          drawPostRange(seg, 0, 1, segmentPanelWidths[flatIdx] ?? 0);
          flatIdx++;
          continue;
        }
        let cursor = 0;
        const gates = seg.gates
          .map((g) => gateRange(seg, g))
          .sort((a, b) => a.tStart - b.tStart);
        for (const gate of gates) {
          if ((gate.tStart - cursor) * seg.lengthMM > 1) {
            drawPostRange(seg, cursor, gate.tStart, segmentPanelWidths[flatIdx] ?? 0);
            flatIdx++;
          }
          cursor = gate.tEnd;
        }
        if ((1 - cursor) * seg.lengthMM > 1) {
          drawPostRange(seg, cursor, 1, segmentPanelWidths[flatIdx] ?? 0);
          flatIdx++;
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

  function segmentLabelsForMap(
    seg: Segment,
    runNumber: number,
    startPanelNumber: number,
    startGateNumber: number,
  ): { labels: SegmentMapLabel[]; nextPanelNumber: number; nextGateNumber: number } {
    const labels: SegmentMapLabel[] = [];
    let panelNumber = startPanelNumber;
    let gateNumber = startGateNumber;
    const gates = seg.gates
      .map((g) => gateRange(seg, g))
      .sort((a, b) => a.tStart - b.tStart);

    if (gates.length === 0) {
      labels.push({ text: `R${runNumber}S${panelNumber++}`, t: 0.5, tStart: 0, tEnd: 1, kind: "panel" });
      return { labels, nextPanelNumber: panelNumber, nextGateNumber: gateNumber };
    }

    let cursor = 0;
    for (const gate of gates) {
      if ((gate.tStart - cursor) * seg.lengthMM > 1) {
        labels.push({
          text: `R${runNumber}S${panelNumber++}`,
          t: (cursor + gate.tStart) / 2,
          tStart: cursor,
          tEnd: gate.tStart,
          kind: "panel",
        });
      }
      labels.push({
        text: `R${runNumber}G${gateNumber++}`,
        t: gate.tMid,
        tStart: gate.tStart,
        tEnd: gate.tEnd,
        kind: "gate",
      });
      cursor = gate.tEnd;
    }
    if ((1 - cursor) * seg.lengthMM > 1) {
      labels.push({
        text: `R${runNumber}S${panelNumber++}`,
        t: (cursor + 1) / 2,
        tStart: cursor,
        tEnd: 1,
        kind: "panel",
      });
    }
    return { labels, nextPanelNumber: panelNumber, nextGateNumber: gateNumber };
  }

  function drawArrow(fromX: number, fromY: number, toX: number, toY: number) {
    const head = 5 / zoom;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(
      toX - Math.cos(angle - Math.PI / 6) * head,
      toY - Math.sin(angle - Math.PI / 6) * head,
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - Math.cos(angle + Math.PI / 6) * head,
      toY - Math.sin(angle + Math.PI / 6) * head,
    );
    ctx.stroke();
  }

  function drawPlacedGateVisual(seg: Segment, gate: GateMarker) {
    const range = gateRange(seg, gate);
    const pStart = lerp(seg.p1, seg.p2, range.tStart);
    const pEnd = lerp(seg.p1, seg.p2, range.tEnd);
    const mid = lerp(pStart, pEnd, 0.5);
    const visual = gateVisualFor(gate);
    const direction = visual.swingDirection ?? (visual.gateType === "sliding" ? "right" : "out");
    const angle = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
    const width = Math.max(14 / zoom, dist(pStart, pEnd));
    const side = direction === "in" || direction === "left" ? -1 : 1;
    const slideSide = visual.slidingSide === "back" ? -1 : 1;
    const slideOffset = (300 / scale) * slideSide;

    ctx.save();
    ctx.translate(mid.x, mid.y);
    ctx.rotate(angle);
    ctx.strokeStyle = COLOR.gate;
    ctx.fillStyle = COLOR.gate;
    ctx.lineWidth = 1.6 / zoom;
    ctx.setLineDash([]);

    if (visual.gateType === "sliding") {
      const arrow = direction === "left" ? -1 : 1;
      const pocket = Math.max(width * 0.35, 450 / scale);
      const slideLength = width + pocket;
      ctx.strokeRect(-width / 2, slideOffset - 5 / zoom, width, 10 / zoom);
      drawArrow(-slideLength * 0.25 * arrow, slideOffset, slideLength * 0.5 * arrow, slideOffset);
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.moveTo(-width / 2, 0);
      ctx.lineTo(-width / 2, slideOffset);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, slideOffset);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `bold ${Math.max(8, 10 / zoom)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(direction === "left" ? "SLIDE LEFT" : "SLIDE RIGHT", 0, slideOffset - 8 / zoom);
      ctx.restore();
      return;
    }

    if (visual.gateType === "double-swing") {
      const leafRadius = width / 2;
      const labelY = side > 0 ? -8 / zoom : 14 / zoom;
      ctx.beginPath();
      ctx.arc(-width / 2, 0, leafRadius, 0, side * Math.PI / 2, side < 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(width / 2, 0, leafRadius, Math.PI, side * Math.PI / 2, side > 0);
      ctx.stroke();
      drawArrow(-width / 2, 0, -width / 2 + leafRadius * 0.68, side * leafRadius * 0.68);
      drawArrow(width / 2, 0, width / 2 - leafRadius * 0.68, side * leafRadius * 0.68);
      ctx.font = `bold ${Math.max(8, 10 / zoom)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(direction === "in" ? "DBL IN" : "DBL OUT", 0, labelY);
      ctx.restore();
      return;
    }

    const hingeX = gate.anchor === "end" ? width / 2 : -width / 2;
    const radius = width;
    const closedAngle = gate.anchor === "end" ? Math.PI : 0;
    const openAngle = side * Math.PI / 2;
    const leafEndX = gate.anchor === "end" ? hingeX - radius * 0.7 : hingeX + radius * 0.7;
    ctx.beginPath();
    ctx.moveTo(hingeX, 0);
    ctx.lineTo(leafEndX, side * radius * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hingeX, 0, radius, closedAngle, openAngle, gate.anchor === "end" ? side > 0 : side < 0);
    ctx.stroke();
    drawArrow(hingeX, 0, leafEndX, side * radius * 0.7);
    ctx.font = `bold ${Math.max(8, 10 / zoom)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(direction === "in" ? "SG IN" : "SG OUT", 0, side > 0 ? -8 / zoom : 14 / zoom);
    ctx.restore();
  }

  function drawTextNotes() {
    if (textNotes.length === 0) return;
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (const note of textNotes) {
      const text = note.text.trim();
      if (!text) continue;
      const fs = Math.max(10, 13 / zoom);
      ctx.font = `bold ${fs}px sans-serif`;
      const padX = 7 / zoom;
      const padY = 5 / zoom;
      const textW = ctx.measureText(text).width;
      const boxW = Math.max(note.width ?? 0, textW + padX * 2);
      const h = Math.max(note.height ?? 0, fs + padY * 2);
      ctx.fillStyle = "rgba(26,29,46,0.9)";
      ctx.strokeStyle = "rgba(59,130,246,0.9)";
      ctx.lineWidth = 1.4 / zoom;
      ctx.beginPath();
      ctx.roundRect(note.x, note.y, boxW, h, 5 / zoom);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLOR.label;
      ctx.fillText(text, note.x + padX, note.y + h / 2);
    }
    ctx.restore();
  }

  function drawPendingTextNote() {
    if (!pendingTextNote) return;
    const x = Math.min(pendingTextNote.start.x, pendingTextNote.current.x);
    const y = Math.min(pendingTextNote.start.y, pendingTextNote.current.y);
    const width = Math.abs(pendingTextNote.current.x - pendingTextNote.start.x);
    const height = Math.abs(pendingTextNote.current.y - pendingTextNote.start.y);
    if (width < 2 || height < 2) return;
    ctx.save();
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    ctx.fillStyle = "rgba(59,130,246,0.12)";
    ctx.strokeStyle = "rgba(59,130,246,0.95)";
    ctx.lineWidth = 1.4 / zoom;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 5 / zoom);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSiteMarkers() {
    if (siteMarkers.length === 0) return;
    ctx.save();
    ctx.font = `900 ${13 / zoom}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const marker of siteMarkers) {
      const size = marker.markerType === "pillar" ? 18 / zoom : 14 / zoom;
      ctx.lineWidth = 2 / zoom;
      ctx.fillStyle =
        marker.markerType === "pillar"
          ? "rgba(245,158,11,0.22)"
          : "rgba(16,185,129,0.22)";
      ctx.strokeStyle = marker.markerType === "pillar" ? "#f59e0b" : "#10b981";
      if (marker.markerType === "pillar") {
        ctx.beginPath();
        ctx.roundRect(marker.x - size / 2, marker.y - size / 2, size, size, 3 / zoom);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = COLOR.label;
      ctx.fillText(marker.markerType === "pillar" ? "P" : "EP", marker.x, marker.y);
      if (marker.label) {
        ctx.font = `800 ${11 / zoom}px Inter, system-ui, sans-serif`;
        ctx.fillText(marker.label, marker.x, marker.y - size);
        ctx.font = `900 ${13 / zoom}px Inter, system-ui, sans-serif`;
      }
    }
    ctx.restore();
  }

  function drawSegment(
    seg: Segment,
    hovered: boolean,
    runColor = COLOR.segment,
    runColorHover = COLOR.segmentHover,
    mapLabels: SegmentMapLabel[] = [],
  ) {
    const lw = 3 / zoom;
    const segColor = hovered ? runColorHover : runColor;
    const segLw = hovered ? lw * 1.5 : lw;
    const highlightedLabel = mapLabels.find((label) => label.text === highlightedMapLabel);

    // Build sorted list of gate gaps as (tStart, tEnd) pairs
    type GateGap = { tStart: number; tEnd: number; widthMM: number; gate: GateMarker };
    const gaps: GateGap[] = seg.gates
      .map((g) => ({ ...gateRange(seg, g), widthMM: g.widthMM, gate: g }))
      .sort((a, b) => a.tStart - b.tStart);

    // Draw fence line as sections between/around gate gaps
    if (highlightedLabel) drawHighlightedMapLabel(seg, highlightedLabel);

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
      drawPlacedGateVisual(seg, gap.gate);

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
    drawMapSegmentLabels(seg, mapLabels);
  }

  function drawLabel(seg: Segment) {
    const ang = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
    const mid = offsetPointFromSegment(seg, 0.5, 18 / zoom);
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

  function drawMapSegmentLabels(seg: Segment, labels: SegmentMapLabel[]) {
    if (zoom <= 0.18 || labels.length === 0) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const label of labels) {
      const pt = offsetPointFromSegment(seg, label.t, -18 / zoom);
      const fs = Math.max(8, 10 / zoom);
      ctx.font = `bold ${fs}px sans-serif`;
      const tw = ctx.measureText(label.text).width;
      const padX = 4 / zoom;
      const padY = 3 / zoom;
      const bg = label.kind === "gate" ? "rgba(245,158,11,0.92)" : "rgba(15,23,42,0.9)";
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(
        pt.x - tw / 2 - padX,
        pt.y - fs / 2 - padY,
        tw + padX * 2,
        fs + padY * 2,
        4 / zoom,
      );
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label.text, pt.x, pt.y);
    }
    ctx.restore();
  }

  function drawActiveEndpoint(pt: Point, label: string, ghost = false) {
    const radius = ghost ? 8 / zoom : 10 / zoom;
    const ring = ghost ? "rgba(245,158,11,0.35)" : "rgba(15,23,42,0.18)";
    const stroke = ghost ? "#f59e0b" : "#0f172a";
    ctx.save();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = ring;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = ghost ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.92)";
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5 / zoom;
    ctx.stroke();
    ctx.font = `bold ${Math.max(10, 12 / zoom)}px sans-serif`;
    ctx.fillStyle = stroke;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, pt.x, pt.y - radius * 2.1);
    ctx.restore();
  }

  function drawGatePreview(seg: Segment, t: number) {
    const previewGate: GateMarker = {
      t,
      anchor: gateAnchorForPlacement(seg, t, pendingGatePlacement.widthMM),
      widthMM: pendingGatePlacement.widthMM,
      gateType: pendingGatePlacement.gateType,
      swingDirection: pendingGatePlacement.swingDirection,
      slidingSide: pendingGatePlacement.slidingSide,
    };
    const range = gateRange(seg, previewGate);
    const pStart = lerp(seg.p1, seg.p2, range.tStart);
    const pEnd = lerp(seg.p1, seg.p2, range.tEnd);
    const gp = lerp(pStart, pEnd, 0.5);
    const ang = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
    const width = Math.max(14 / zoom, dist(pStart, pEnd));

    ctx.save();
    ctx.translate(gp.x, gp.y);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.72;

    ctx.fillStyle = "rgba(245,158,11,0.14)";
    ctx.strokeStyle = COLOR.gate;
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(-width / 2, -7 / zoom, width, 14 / zoom);
    ctx.fillRect(-width / 2, -7 / zoom, width, 14 / zoom);

    if (pendingGatePlacement.gateType === "sliding") {
      const arrow = pendingGatePlacement.swingDirection === "left" ? -1 : 1;
      const slideOffset = (300 / scale) * (pendingGatePlacement.slidingSide === "back" ? -1 : 1);
      ctx.strokeRect(-width / 2, slideOffset - 5 / zoom, width, 10 / zoom);
      drawArrow(-width * 0.3 * arrow, slideOffset, width * 0.35 * arrow, slideOffset);
    } else {
      const side = pendingGatePlacement.swingDirection === "in" ? -1 : 1;
      const swing = Math.min(width * 0.55, 34 / zoom);
      if (pendingGatePlacement.gateType === "double-swing") {
        ctx.beginPath();
        ctx.arc(-width / 2, 0, swing, side > 0 ? 0 : -Math.PI / 2, side > 0 ? Math.PI / 2 : 0, side < 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(width / 2, 0, swing, side > 0 ? Math.PI / 2 : Math.PI, side > 0 ? Math.PI : Math.PI / 2, side < 0);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(-width / 2, 0, swing, side > 0 ? 0 : -Math.PI / 2, side > 0 ? Math.PI / 2 : 0, side < 0);
        ctx.stroke();
      }
    }

    ctx.font = `bold ${Math.max(9, 11 / zoom)}px sans-serif`;
    ctx.fillStyle = COLOR.gate;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${pendingGatePlacement.widthMM}mm`, 0, -10 / zoom);

    ctx.beginPath();
    ctx.moveTo(-width / 2, 0);
    ctx.lineTo(width / 2, 0);
    ctx.strokeStyle = COLOR.gate;
    ctx.stroke();

    ctx.restore();
  }

  function scheduleRedraw() {
    cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(() => draw());
  }

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  function eventToCanvas(e: Pick<MouseEvent, "clientX" | "clientY">): Point {
    const rect = canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return screenToCanvas(screen, pan, zoom);
  }

  function eventToScreen(e: Pick<MouseEvent, "clientX" | "clientY">): Point {
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
      const mid = offsetPointFromSegment(seg, 0.5, 18 / zoom);
      if (dist(pt, mid) < 30 / zoom) return flatIdx;
    }
    return -1;
  }

  function isNearActiveLastPoint(screenPt: Point, thresholdPx = 34): boolean {
    if (activeRunIdx < 0 || runs[activeRunIdx]?.finished) return false;
    const run = runs[activeRunIdx];
    if (!run || run.points.length < 2) return false;
    const last = run.points[run.points.length - 1];
    const lastScreen = canvasToScreen(last, pan, zoom);
    return dist(screenPt, lastScreen) <= thresholdPx;
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
          const midWorld = lerp(seg.p1, seg.p2, gateRange(seg, gate).tMid);
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
      rebuildSegmentsPreservingGates(run, scale);
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
      pushUndo({ type: "FINISH_RUN", runIdx: activeRunIdx });
      notifyChange();
    }

    activeRunIdx = -1;
    scheduleRedraw();
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  function onMouseDown(e: MouseEvent | CanvasPointerLike) {
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

    if (!editingLabel && (tool === "draw" || tool === "move")) {
      const labelIdx = hitTestLabel(canvasPt);
      if (labelIdx >= 0 && !(tool === "draw" && activeRunIdx >= 0)) {
        startLabelEdit(labelIdx, screenPtDown);
        return;
      }
    }

    if (tool === "text") {
      pendingTextNote = { start: canvasPt, current: canvasPt };
      scheduleRedraw();
      return;
    }

    if (tool === "post" || tool === "pillar") {
      const markerType = tool;
      createLabelInput(
        container,
        screenPtDown,
        markerType === "pillar" ? "Pillar" : "Existing post",
        (value) => {
          siteMarkers.push({
            x: canvasPt.x,
            y: canvasPt.y,
            markerType,
            label: value.trim() || (markerType === "pillar" ? "Pillar" : "Existing post"),
          });
          notifyChange();
          scheduleRedraw();
        },
        () => scheduleRedraw(),
        180,
      );
      return;
    }

    if (tool === "draw" || tool === "building") {
      if (isNearActiveLastPoint(screenPtDown)) {
        stopChain(false);
        return;
      }

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

        if (resumedIdx >= 0 && tool === "draw") {
          // Resume the existing run — un-finish it so new points can be appended
          runs[resumedIdx].finished = false;
          activeRunIdx = resumedIdx;
          pushUndo({ type: "RESUME_RUN", runIdx: resumedIdx }); // undo will re-finish it
        } else {
          // Start a new run with this as the first point
          const newRun: Run = {
            points: [worldPt],
            finished: false,
            segments: [],
            isBoundary: tool === "building",
            boundaryType: tool === "building" ? "building" : undefined,
          };
          pushUndo({ type: "ADD_RUN" });
          runs.push(newRun);
          activeRunIdx = runs.length - 1;
        }
      } else {
        // Append point to the current run (multi-point polyline)
        const run = runs[activeRunIdx];
        worldPt = snapDrawingPoint(canvasPt);
        run.points.push(worldPt);
        rebuildSegmentsPreservingGates(run, scale);
        notifyChange();
        pushUndo({ type: "ADD_POINT", runIdx: activeRunIdx });
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
        pushUndo({ type: "ADD_RUN" });
        runs.push(newRun);
        activeRunIdx = runs.length - 1;
      } else {
        const run = runs[activeRunIdx];
        const prevRunIdx = activeRunIdx;
        worldPt = snapDrawingPoint(canvasPt);
        run.points.push(worldPt);
        rebuildSegmentsPreservingGates(run, scale);
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
        pushUndo({ type: "CHAIN_POINT", prevRunIdx, newRunIdx });
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
        const snappedGateT = snapGatePositionTo100mm(
          info.seg,
          proj.t,
          gateSnap100,
        );
        const gateAnchor = gateAnchorForPlacement(
          info.seg,
          snappedGateT,
          pendingGatePlacement.widthMM,
        );
        const gateIdx = info.seg.gates.length;
        pushUndo({ type: "ADD_GATE", segIdx: flatIdx, gateIdx });
        info.seg.gates.push({
          t: snappedGateT,
          anchor: gateAnchor,
          widthMM: pendingGatePlacement.widthMM,
          useGatePostsAsFenceTermination: true,
          gateType: pendingGatePlacement.gateType,
          swingDirection: pendingGatePlacement.swingDirection,
          slidingSide: pendingGatePlacement.slidingSide,
        });
        notifyChange();
        scheduleRedraw();
        config.onGatePlaced?.(
          flatIdx,
          gateIdx,
          pendingGatePlacement.widthMM,
          pendingGatePlacement.gateType,
          pendingGatePlacement.slidingSide,
        );
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
          return;
        }
      }
      isPanning = true;
      panStart = screenPtDown;
      panOrigin = { ...pan };
      canvas.style.cursor = "grabbing";
      return;
    }
  }

  function onMouseMove(e: MouseEvent | CanvasPointerLike) {
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
      rebuildSegmentsPreservingGates(run, scale);
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
          const gate = seg.gates[draggingGate.gateIdx];
          gate.t = snapGatePositionTo100mm(seg, t, gateSnap100);
          gate.anchor = gateAnchorForPlacement(seg, gate.t, gate.widthMM);
        }
        scheduleRedraw();
      }
      return;
    }

    if (pendingTextNote) {
      pendingTextNote.current = canvasPt;
      canvas.style.cursor = "crosshair";
      scheduleRedraw();
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
          : "grab";
    } else if (hoveredSegIdx !== prevHover) {
      canvas.style.cursor =
        hoveredSegIdx >= 0
          ? tool === "gate"
            ? "crosshair"
            : "pointer"
          : tool === "draw" || tool === "building" || tool === "text"
            ? "crosshair"
            : "default";
    }

    scheduleRedraw();
  }

  function onMouseUp(e: MouseEvent | CanvasPointerLike) {
    if (pendingTextNote && e.button === 0) {
      pendingTextNote.current = eventToCanvas(e);
      const x = Math.min(pendingTextNote.start.x, pendingTextNote.current.x);
      const y = Math.min(pendingTextNote.start.y, pendingTextNote.current.y);
      const width = Math.max(90 / zoom, Math.abs(pendingTextNote.current.x - pendingTextNote.start.x));
      const height = Math.max(34 / zoom, Math.abs(pendingTextNote.current.y - pendingTextNote.start.y));
      const screenCenter = canvasToScreen(
        { x: x + width / 2, y: y + height / 2 },
        pan,
        zoom,
      );
      const inputWidth = Math.max(160, Math.min(420, width * zoom));
      pendingTextNote = null;
      createLabelInput(
        container,
        screenCenter,
        "",
        (value) => {
          const text = value.trim();
          if (!text) {
            scheduleRedraw();
            return;
          }
          textNotes.push({ x, y, width, height, text });
          notifyChange();
          scheduleRedraw();
        },
        () => scheduleRedraw(),
        inputWidth,
      );
      scheduleRedraw();
      return;
    }

    if (e.button === 2 || (e.button === 0 && isPanning)) {
      isPanning = false;
      canvas.style.cursor = tool === "move" ? "grab" : "default";
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
      canvas.style.cursor = tool === "draw" || tool === "building" || tool === "text" ? "crosshair" : "default";
      return;
    }
  }

  function touchToPointer(touch: Touch, source: TouchEvent): CanvasPointerLike {
    return {
      button: 0,
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => source.preventDefault(),
    };
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1 || editingLabel) return;
    const pointer = touchToPointer(e.touches[0], e);
    lastTouchPointer = pointer;
    pointer.preventDefault();
    onMouseDown(pointer);
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    const pointer = touchToPointer(e.touches[0], e);
    lastTouchPointer = pointer;
    pointer.preventDefault();
    onMouseMove(pointer);
  }

  function onTouchEnd(e: TouchEvent) {
    const touch = e.changedTouches[0];
    const pointer = touch ? touchToPointer(touch, e) : lastTouchPointer;
    if (!pointer) return;

    pointer.preventDefault();
    onMouseUp(pointer);

    const screenPt = eventToScreen(pointer);
    const now = Date.now();
    const isDoubleTap =
      lastTapScreen !== null &&
      now - lastTapTime < 350 &&
      dist(screenPt, lastTapScreen) < 34;

    lastTapTime = now;
    lastTapScreen = screenPt;
    lastTouchPointer = null;

    if (
      isDoubleTap &&
      (tool === "draw" || tool === "building" || tool === "boundary") &&
      activeRunIdx >= 0 &&
      !runs[activeRunIdx]?.finished
    ) {
      stopChain(!isNearActiveLastPoint(screenPt));
      scheduleRedraw();
    }
  }

  function onDblClick(e: MouseEvent) {
    if (editingLabel) return;

    if ((tool === "draw" || tool === "building" || tool === "boundary") && activeRunIdx >= 0 && !runs[activeRunIdx]?.finished) {
      const screenPt = eventToScreen(e);
      stopChain(!isNearActiveLastPoint(screenPt));
      scheduleRedraw();
      return;
    }

    const canvasPt = eventToCanvas(e);
    const labelIdx = hitTestLabel(canvasPt);
    if (labelIdx >= 0) {
      startLabelEdit(labelIdx, eventToScreen(e));
      return;
    }

    // Scale calibration is intentionally behind Alt+double-click so normal
    // double-clicking a length label can never resize the whole drawing scale.
    if (!e.altKey) return;

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
        "Enter real-world length for this section (e.g. 2500 for 2500mm or 2.5 for 2.5m):",
      );
      if (response === null) return;
      const parsed = parseFloat(response.replace(",", "."));
      if (isNaN(parsed) || parsed <= 0) return;
      const enteredMM = parsed < 30 ? parsed * 1000 : parsed;
      // Update scale: mm per world unit
      scale = enteredMM / segLengthWorld;
      // Recalculate all segment lengths with new scale
      for (const r of runs) {
        rebuildSegmentsPreservingGates(r, scale);
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
    if (e.key === 'Shift') { shiftDown = true; scheduleRedraw(); }
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
    if (
      ((e.key === "y" || e.key === "Y") && (e.ctrlKey || e.metaKey)) ||
      ((e.key === "z" || e.key === "Z") && e.shiftKey && (e.ctrlKey || e.metaKey))
    ) {
      e.preventDefault();
      redoLast();
      return;
    }
    if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undoLast();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === 'Shift') { shiftDown = false; scheduleRedraw(); }
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
          setSegmentLength(flatIdx, num < 30 ? num * 1000 : num);
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
    redoStack.push({ action, snapshot: snapshot() });

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
          rebuildSegmentsPreservingGates(run, scale);
        } else if (run) {
          runs.splice(action.runIdx, 1);
          undoStack.pop(); // also remove the ADD_RUN
          activeRunIdx = -1;
        }
        if (run) rebuildSegmentsPreservingGates(run, scale);
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
            rebuildSegmentsPreservingGates(prevRun, scale);
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

  function redoLast() {
    const entry = redoStack.pop();
    if (!entry) return;
    restoreSnapshot(entry.snapshot);
    undoStack.push(entry.action);
    notifyChange();
    scheduleRedraw();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function setTool(t: Tool) {
    tool = t;
    if (t !== "text") pendingTextNote = null;
    if (t === "draw" || t === "boundary" || t === "building" || t === "text" || t === "post" || t === "pillar") {
      canvas.style.cursor = "crosshair";
    } else if (t === "move") {
      canvas.style.cursor = "grab";
    } else {
      canvas.style.cursor = "default";
    }
    if (t !== "draw" && t !== "boundary" && t !== "building") {
      // Finish any active drawing run
      if (activeRunIdx >= 0 && !runs[activeRunIdx]?.finished) {
        const run = runs[activeRunIdx];
        if (run.points.length >= 2) {
          run.finished = true;
          pushUndo({ type: "FINISH_RUN", runIdx: activeRunIdx });
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

  function redo() {
    redoLast();
  }

  function clear() {
    pushUndo({
      type: "CLEAR",
      runs: JSON.parse(JSON.stringify(runs)),
      scale,
    });
    runs = [];
    textNotes = [];
    siteMarkers = [];
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

  function setGateSnapTo100mm(enabled: boolean) {
    gateSnap100 = enabled;
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
      rebuildSegmentsPreservingGates(run, scale);
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
      const cw = cssCanvasWidth || canvas.getBoundingClientRect().width || 800;
      const ch = cssCanvasHeight || canvas.getBoundingClientRect().height || 400;
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
      info.seg.gates[gateIdx].anchor = gateAnchorForPlacement(
        info.seg,
        info.seg.gates[gateIdx].t,
        widthMM,
      );
      notifyChange();
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

  function setGateTerminationPosts(
    flatSegIdx: number,
    gateIdx: number,
    useTerminationPosts: boolean,
  ) {
    const allSegs = allSegmentsFlat();
    const info = allSegs[flatSegIdx];
    if (info && info.seg.gates[gateIdx] !== undefined) {
      info.seg.gates[gateIdx].useGatePostsAsFenceTermination =
        useTerminationPosts;
      notifyChange();
      scheduleRedraw();
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
   * Push pre-computed stats text from the canonical payload.
   * `global` is shown when no segment is hovered. `perRun[i]` is shown when the
   * user hovers over a segment in run i (non-boundary run index).
   */
  function setRunStatsTexts(global: string, perRun: string[]) {
    pushedStatsGlobal = global;
    pushedStatsPerRun = perRun;
    scheduleRedraw();
  }

  function updateGateVisual(
    segIdx: number,
    gateIdx: number,
    visual: Partial<CanvasGateVisual>,
  ) {
    const allSegs = allSegmentsFlat();
    const info = allSegs[segIdx];
    const gate = info?.seg.gates[gateIdx];
    if (!gate) return;
    gate.gateType = visual.gateType ?? gate.gateType;
    gate.swingDirection = visual.swingDirection ?? gate.swingDirection;
    gate.slidingSide = visual.slidingSide ?? gate.slidingSide ?? "front";
    if (gate.gateId) {
      gateVisuals = {
        ...gateVisuals,
        [gate.gateId]: {
          gateType: gate.gateType ?? "single-swing",
          swingDirection: gate.swingDirection,
          slidingSide: gate.slidingSide,
        },
      };
    }
    notifyChange();
    scheduleRedraw();
  }

  function setGateVisuals(visuals: Record<string, CanvasGateVisual>) {
    gateVisuals = visuals;
    scheduleRedraw();
  }

  function setPendingGatePlacement(config: Partial<CanvasGateVisual & { widthMM: number }>) {
    pendingGatePlacement = {
      ...pendingGatePlacement,
      ...config,
      widthMM: Math.max(100, Number(config.widthMM ?? pendingGatePlacement.widthMM)),
    };
    scheduleRedraw();
  }

  function hasSatelliteUnderlay() {
    return mapImage !== null;
  }

  function printMap(options: { includeSatellite?: boolean } = {}) {
    const originalOpacity = mapOpacity;
    if (!options.includeSatellite) mapOpacity = 0;
    draw();
    const dataUrl = canvas.toDataURL("image/png");
    const layout = getLayout();
    const summaryHtml = layout.runs
      .map((run) => {
        const gatePart = run.gates.length ? ` · ${run.gates.length} gate${run.gates.length === 1 ? "" : "s"}` : "";
        const sectionRows = (run.sections ?? [])
          .map((section) => {
            const sectionGatePart = section.gateCount
              ? `${section.gateCount} gate${section.gateCount === 1 ? "" : "s"}`
              : "—";
            return `<li>${section.label} · ${section.lengthM.toFixed(2)}m · ${section.panelCount} panel${section.panelCount === 1 ? "" : "s"} · ${sectionGatePart}</li>`;
          })
          .join("");
        return `<div class="run-summary"><strong>${run.label} · ${run.totalLengthM.toFixed(2)}m${gatePart}</strong><ul>${sectionRows}</ul></div>`;
      })
      .join("");
    mapOpacity = originalOpacity;
    draw();

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Fence Layout Map</title>
          <style>
            body { margin: 0; padding: 18px; font-family: Arial, sans-serif; color: #111827; }
            h1 { margin: 0 0 10px; font-size: 18px; }
            p { margin: 0 0 12px; font-size: 12px; color: #4b5563; }
            img { width: 100%; height: auto; border: 1px solid #d1d5db; }
            .run-summary { margin-top: 10px; font-size: 12px; }
            ul { margin: 4px 0 0 18px; padding: 0; color: #374151; }
            li { margin: 2px 0; }
            @media print { body { padding: 10mm; } }
          </style>
        </head>
        <body>
          <h1>Fence Layout Map</h1>
          <p>Installer guide showing section lengths, gate openings, run measurements, notes, and drawn context lines.</p>
          <img src="${dataUrl}" alt="Fence layout map" />
          ${summaryHtml}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function setHighlightedMapLabel(label: string | null) {
    highlightedMapLabel = label;
    scheduleRedraw();
  }

  /**
   * Replace the current canvas state with the runs described by `layout`.
   * Used for form-driven geometry changes (bidirectional sync).
   * Boundary runs in `layout.boundaries` are also restored.
   */
  function loadLayout(layout: CanvasLayout) {
    const newRuns: Run[] = [];
    const preservedBoundaries: CanvasSegment[] = [];
    for (const run of runs) {
      if (!run.isBoundary) continue;
      for (const seg of run.segments) {
        preservedBoundaries.push({
          startX: seg.p1.x,
          startY: seg.p1.y,
          endX: seg.p2.x,
          endY: seg.p2.y,
          lengthMM: seg.lengthMM,
          angleDeg: angleDeg(seg.p1, seg.p2),
          contextType: run.boundaryType ?? "boundary",
        });
      }
    }
    const nextBoundaries =
      layout.boundaries && layout.boundaries.length > 0
        ? layout.boundaries
        : preservedBoundaries;
    const nextTextNotes =
      layout.textNotes && layout.textNotes.length > 0 ? layout.textNotes : textNotes;
    const nextSiteMarkers =
      layout.siteMarkers && layout.siteMarkers.length > 0 ? layout.siteMarkers : siteMarkers;

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
    for (const cseg of nextBoundaries) {
      const p1 = { x: cseg.startX, y: cseg.startY };
      const p2 = { x: cseg.endX, y: cseg.endY };
      newRuns.push({
        points: [p1, p2],
        segments: [{ p1, p2, lengthMM: cseg.lengthMM, gates: [] }],
        finished: true,
        isBoundary: true,
        boundaryType: cseg.contextType ?? "boundary",
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
          anchor: g.anchor,
          widthMM: g.widthMM,
          gateId: g.gateId,
          useGatePostsAsFenceTermination:
            g.useGatePostsAsFenceTermination ?? true,
          gateType: g.gateType,
          swingDirection: g.swingDirection,
          slidingSide: g.slidingSide,
        }));
        flatIdx++;
      }
    }

    runs = newRuns;
    textNotes = [...nextTextNotes];
    siteMarkers = [...nextSiteMarkers];
    activeRunIdx = -1;
    undoStack = [];
    redoStack = [];
    // Do NOT call notifyChange() here — this is a form→canvas push.
    // The caller already has the latest data in context; firing onLayoutChange
    // would trigger handleLiveSync which dispatches SET_PAYLOAD with fresh IDs,
    // causing all RunCard components to remount and lose their expanded state.
    fitToContent();
  }

  function destroy() {
    cancelAnimationFrame(animFrame);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
    canvas.removeEventListener("touchcancel", onTouchEnd);
    canvas.removeEventListener("dblclick", onDblClick);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", onResize);
    // Remove any label input that might be open
    const inp = container.querySelector('input[type="text"]');
    if (inp) inp.parentNode?.removeChild(inp);
  }

  // ── Register events ────────────────────────────────────────────────────────

  canvas.style.touchAction = "none";
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
  canvas.addEventListener("dblclick", onDblClick);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", onResize);

  // Initial draw — fit to 50m wide view
  fitToWidth(50);

  return {
    destroy,
    getLayout,
    setTool,
    undo,
    redo,
    clear,
    resetView,
    setSnapToGrid,
    setGateSnapTo100mm,
    setAllowedAngles,
    setShowGrid,
    setScale,
    setMapOpacity,
    loadMapTile,
    updateGateWidth,
    updateGateVisual,
    setGateId,
    setGateTerminationPosts,
    setPostPositions,
    setSegmentPanelWidths,
    setJobPanelWidth,
    setRunStatsTexts,
    setGateVisuals,
    setPendingGatePlacement,
    hasSatelliteUnderlay,
    printMap,
    setHighlightedMapLabel,
    loadLayout,
    fitToWidth,
    fitToContent,
    setUiHighlightFlatSeg: (_idx: number | null) => { /* no-op in V3 canvas */ },
  };
}
