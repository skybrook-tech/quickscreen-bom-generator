// canvasEngine.ts — Pure TypeScript canvas engine (no React imports)
// All drawing, interaction, snap, undo logic lives here.

export interface CanvasSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  lengthMM: number;   // real-world length in mm (user-editable)
  angleDeg: number;   // angle from horizontal
}

export interface CanvasGate {
  segmentIndex: number;
  positionOnSegment: number; // 0–1 fraction along segment
  widthMM: number;
}

export interface CanvasLayout {
  segments: CanvasSegment[];
  gates: CanvasGate[];
  totalLengthM: number;
  cornerCount: number; // count of ~90° angles between adjacent segments
}

export interface CanvasEngineConfig {
  snapToGrid: boolean;
  gridSize: number; // px
  showGrid: boolean;
  onLayoutChange?: (layout: CanvasLayout) => void;
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
  t: number;    // 0–1 along segment
  widthMM: number;
}

type Tool = 'draw' | 'gate' | 'move';

type UndoAction =
  | { type: 'ADD_POINT'; runIdx: number }
  | { type: 'FINISH_RUN'; runIdx: number }
  | { type: 'ADD_RUN' }
  | { type: 'ADD_GATE'; segIdx: number; gateIdx: number }
  | { type: 'CLEAR'; runs: Run[]; scale: number };

interface Run {
  points: Point[];
  finished: boolean;
  segments: Segment[];
}

// ── Scale constant: pixels per metre ──────────────────────────────────────────
// Default: 100px = 1 metre. User can adjust with the scale input.
const DEFAULT_SCALE = 100; // px per metre

// ── Corner detection angle threshold ─────────────────────────────────────────
const CORNER_THRESHOLD_DEG = 30; // angle change ≥ 30° counts as a corner

// ── Gate default width ────────────────────────────────────────────────────────
const DEFAULT_GATE_WIDTH_MM = 900;

// ── Colours ───────────────────────────────────────────────────────────────────
const COLOR = {
  grid: 'rgba(255,255,255,0.06)',
  gridAxis: 'rgba(255,255,255,0.15)',
  segment: '#3b82f6',
  segmentHover: '#60a5fa',
  point: '#3b82f6',
  pointFill: '#1a1d2e',
  activePoint: '#60a5fa',
  preview: 'rgba(96,165,250,0.5)',
  gate: '#f59e0b',
  gateFill: 'rgba(245,158,11,0.2)',
  label: '#e5e7eb',
  labelBg: 'rgba(26,29,46,0.85)',
  snap: 'rgba(96,165,250,0.4)',
};

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

function screenToCanvas(
  screen: Point,
  pan: Point,
  zoom: number,
): Point {
  return {
    x: (screen.x - pan.x) / zoom,
    y: (screen.y - pan.y) / zoom,
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

function countCorners(runs: Run[]): number {
  let count = 0;
  for (const run of runs) {
    const pts = run.points;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = angleDeg(pts[i - 1], pts[i]);
      const b = angleDeg(pts[i], pts[i + 1]);
      let diff = Math.abs(b - a);
      if (diff > 180) diff = 360 - diff;
      if (diff >= CORNER_THRESHOLD_DEG) count++;
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
  const t = Math.max(0, Math.min(1, ((p.x - s.p1.x) * dx + (p.y - s.p1.y) * dy) / len2));
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
  const inp = document.createElement('input');
  inp.type = 'text';
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
    inp.removeEventListener('keydown', onKey);
    inp.removeEventListener('blur', onBlur);
    if (inp.parentNode) inp.parentNode.removeChild(inp);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { commit(); cleanup(); }
    if (e.key === 'Escape') { cancel(); }
  };
  const onBlur = () => { commit(); cleanup(); };

  inp.addEventListener('keydown', onKey);
  inp.addEventListener('blur', onBlur);
  return inp;
}

// ── Main engine factory ───────────────────────────────────────────────────────

export function initCanvasEngine(
  canvas: HTMLCanvasElement,
  config: CanvasEngineConfig,
) {
  const ctx = canvas.getContext('2d')!;
  const container = canvas.parentElement as HTMLElement;

  // ── Mutable state ──────────────────────────────────────────────────────────
  let runs: Run[] = [];
  let activeRunIdx = -1; // index of the run currently being drawn
  let tool: Tool = 'draw';
  let zoom = 1;
  let pan: Point = { x: 0, y: 0 };
  let scale = DEFAULT_SCALE; // px per metre
  let snap = config.snapToGrid;
  let showGrid = config.showGrid;
  let gridSize = config.gridSize;
  let mouseCanvas: Point = { x: 0, y: 0 };
  let isPanning = false;
  let panStart: Point = { x: 0, y: 0 };
  let panOrigin: Point = { x: 0, y: 0 };
  let undoStack: UndoAction[] = [];
  let mapImage: HTMLImageElement | null = null;
  let mapOpacity = 0.5;
  let editingLabel = false;
  let hoveredSegIdx = -1; // flat index into all segments across all runs
  let animFrame = 0;

  // Resize canvas to fill its CSS size
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }

  // ── Layout helpers ─────────────────────────────────────────────────────────

  function allSegmentsFlat(): Array<{ seg: Segment; runIdx: number; segIdx: number; flatIdx: number }> {
    const result: Array<{ seg: Segment; runIdx: number; segIdx: number; flatIdx: number }> = [];
    let flat = 0;
    for (let r = 0; r < runs.length; r++) {
      for (let s = 0; s < runs[r].segments.length; s++) {
        result.push({ seg: runs[r].segments[s], runIdx: r, segIdx: s, flatIdx: flat++ });
      }
    }
    return result;
  }

  function getLayout(): CanvasLayout {
    const allSegs = allSegmentsFlat();
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
        gates.push({ segmentIndex: flatIdx, positionOnSegment: g.t, widthMM: g.widthMM });
      });
    });
    return {
      segments,
      gates,
      totalLengthM: totalLengthM(runs),
      cornerCount: countCorners(runs),
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

    // Map underlay
    if (mapImage) {
      ctx.save();
      ctx.globalAlpha = mapOpacity;
      ctx.drawImage(mapImage, pan.x, pan.y, mapImage.width * zoom, mapImage.height * zoom);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Grid
    if (showGrid) drawGrid(W, H);

    // All segments
    const allSegs = allSegmentsFlat();
    for (const { seg, flatIdx } of allSegs) {
      drawSegment(seg, flatIdx === hoveredSegIdx);
    }

    // Preview line (while drawing)
    if (tool === 'draw' && activeRunIdx >= 0) {
      const run = runs[activeRunIdx];
      if (run && run.points.length > 0 && !run.finished) {
        const lastPt = run.points[run.points.length - 1];
        const target = snap ? snapToGrid(mouseCanvas, gridSize) : mouseCanvas;
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = COLOR.preview;
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(lastPt.x, lastPt.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Gate preview (while in gate mode, hovering a segment)
    if (tool === 'gate' && hoveredSegIdx >= 0) {
      const info = allSegs[hoveredSegIdx];
      if (info) {
        const proj = closestPointOnSegment(mouseCanvas, info.seg);
        drawGatePreview(info.seg, proj.t);
      }
    }

    // Snap indicator
    if (snap && (tool === 'draw')) {
      const snapped = snapToGrid(mouseCanvas, gridSize);
      ctx.save();
      ctx.beginPath();
      ctx.arc(snapped.x, snapped.y, 4 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = COLOR.snap;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawGrid(W: number, H: number) {
    const tl = screenToCanvas({ x: 0, y: 0 }, pan, zoom);
    const br = screenToCanvas({ x: W, y: H }, pan, zoom);

    const startX = Math.floor(tl.x / gridSize) * gridSize;
    const startY = Math.floor(tl.y / gridSize) * gridSize;

    ctx.save();
    ctx.lineWidth = 0.5 / zoom;

    for (let x = startX; x <= br.x; x += gridSize) {
      ctx.strokeStyle = x === 0 ? COLOR.gridAxis : COLOR.grid;
      ctx.beginPath();
      ctx.moveTo(x, tl.y);
      ctx.lineTo(x, br.y);
      ctx.stroke();
    }
    for (let y = startY; y <= br.y; y += gridSize) {
      ctx.strokeStyle = y === 0 ? COLOR.gridAxis : COLOR.grid;
      ctx.beginPath();
      ctx.moveTo(tl.x, y);
      ctx.lineTo(br.x, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSegment(seg: Segment, hovered: boolean) {
    const lw = 3 / zoom;
    ctx.save();
    ctx.strokeStyle = hovered ? COLOR.segmentHover : COLOR.segment;
    ctx.lineWidth = hovered ? lw * 1.5 : lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(seg.p1.x, seg.p1.y);
    ctx.lineTo(seg.p2.x, seg.p2.y);
    ctx.stroke();

    // End-point dots
    for (const pt of [seg.p1, seg.p2]) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = COLOR.pointFill;
      ctx.fill();
      ctx.strokeStyle = COLOR.point;
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
    }

    // Gate markers
    for (const g of seg.gates) {
      const gp = lerp(seg.p1, seg.p2, g.t);
      drawGateMarker(seg, gp);
    }

    // Length label
    drawLabel(seg);

    ctx.restore();
  }

  function drawLabel(seg: Segment) {
    const mid = lerp(seg.p1, seg.p2, 0.5);
    const ang = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
    const labelText = seg.lengthMM >= 1000
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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, 0, 0);

    ctx.restore();
  }

  function drawGateMarker(seg: Segment, gp: Point) {
    const ang = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
    const perp = ang + Math.PI / 2;
    const size = 8 / zoom;

    ctx.save();
    ctx.translate(gp.x, gp.y);
    ctx.rotate(ang);

    // Gate arch symbol
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
    void perp; // suppress unused warning
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
    const worldPt = snap ? snapToGrid(canvasPt, gridSize) : canvasPt;

    if (tool === 'draw') {
      if (activeRunIdx === -1 || runs[activeRunIdx]?.finished) {
        // Start a new run
        const newRun: Run = { points: [worldPt], finished: false, segments: [] };
        undoStack.push({ type: 'ADD_RUN' });
        runs.push(newRun);
        activeRunIdx = runs.length - 1;
      } else {
        // Extend current run
        const run = runs[activeRunIdx];
        undoStack.push({ type: 'ADD_POINT', runIdx: activeRunIdx });
        run.points.push(worldPt);
        run.segments = buildSegmentsFromPoints(run.points, scale);
        notifyChange();
      }
      scheduleRedraw();
      return;
    }

    if (tool === 'gate') {
      const flatIdx = hitTestSegments(canvasPt, 12);
      if (flatIdx >= 0) {
        const allSegs = allSegmentsFlat();
        const info = allSegs[flatIdx];
        const proj = closestPointOnSegment(canvasPt, info.seg);
        undoStack.push({ type: 'ADD_GATE', segIdx: flatIdx, gateIdx: info.seg.gates.length });
        info.seg.gates.push({ t: proj.t, widthMM: DEFAULT_GATE_WIDTH_MM });
        notifyChange();
        scheduleRedraw();
      }
      return;
    }

    if (tool === 'move') {
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

    // Update hover state
    const prevHover = hoveredSegIdx;
    hoveredSegIdx = hitTestSegments(canvasPt, 10);

    if (hoveredSegIdx !== prevHover) {
      canvas.style.cursor = hoveredSegIdx >= 0
        ? (tool === 'gate' ? 'crosshair' : 'pointer')
        : (tool === 'draw' ? 'crosshair' : 'default');
    }

    scheduleRedraw();
  }

  function onMouseUp(e: MouseEvent) {
    if (e.button === 2) {
      isPanning = false;
    }
  }

  function onDblClick(e: MouseEvent) {
    if (tool === 'draw' && activeRunIdx >= 0 && !runs[activeRunIdx]?.finished) {
      const run = runs[activeRunIdx];
      // Remove the last point added by the second click of the double-click
      if (run.points.length > 1) {
        run.points.pop();
        run.segments = buildSegmentsFromPoints(run.points, scale);
      }
      if (run.points.length >= 2) {
        undoStack.push({ type: 'FINISH_RUN', runIdx: activeRunIdx });
        run.finished = true;
        notifyChange();
      } else {
        // Not enough points; cancel this run
        runs.splice(activeRunIdx, 1);
        undoStack.pop(); // remove ADD_RUN
      }
      activeRunIdx = -1;
      scheduleRedraw();
    }
    void e;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const screen = eventToScreen(e);
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.1, Math.min(20, zoom * zoomFactor));

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
    if (e.key === 'Enter' && tool === 'draw') {
      if (activeRunIdx >= 0 && !runs[activeRunIdx]?.finished) {
        const run = runs[activeRunIdx];
        if (run.points.length >= 2) {
          undoStack.push({ type: 'FINISH_RUN', runIdx: activeRunIdx });
          run.finished = true;
          notifyChange();
        } else {
          runs.splice(activeRunIdx, 1);
        }
        activeRunIdx = -1;
        scheduleRedraw();
      }
    }
    if (e.key === 'Escape' && tool === 'draw') {
      if (activeRunIdx >= 0 && !runs[activeRunIdx]?.finished) {
        const run = runs[activeRunIdx];
        if (run.points.length < 2) {
          runs.splice(activeRunIdx, 1);
          undoStack.pop();
        } else {
          run.finished = true;
        }
        activeRunIdx = -1;
        scheduleRedraw();
      }
    }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
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

    const current = info.seg.lengthMM >= 1000
      ? `${(info.seg.lengthMM / 1000).toFixed(2)}`
      : `${Math.round(info.seg.lengthMM)}`;

    createLabelInput(
      container,
      screenPos,
      current,
      (val) => {
        editingLabel = false;
        const num = parseFloat(val.replace(',', '.'));
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
      case 'ADD_RUN': {
        runs.pop();
        activeRunIdx = -1;
        break;
      }
      case 'ADD_POINT': {
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
      case 'FINISH_RUN': {
        const run = runs[action.runIdx];
        if (run) {
          run.finished = false;
          activeRunIdx = action.runIdx;
        }
        break;
      }
      case 'ADD_GATE': {
        const allSegs = allSegmentsFlat();
        const info = allSegs[action.segIdx];
        if (info) {
          info.seg.gates.splice(action.gateIdx, 1);
        }
        break;
      }
      case 'CLEAR': {
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
    if (t === 'draw') {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = 'default';
      // Finish any active drawing run
      if (activeRunIdx >= 0 && !runs[activeRunIdx]?.finished) {
        const run = runs[activeRunIdx];
        if (run.points.length >= 2) {
          run.finished = true;
          undoStack.push({ type: 'FINISH_RUN', runIdx: activeRunIdx });
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
    undoStack.push({ type: 'CLEAR', runs: JSON.parse(JSON.stringify(runs)), scale });
    runs = [];
    activeRunIdx = -1;
    notifyChange();
    scheduleRedraw();
  }

  function resetView() {
    zoom = 1;
    pan = { x: 0, y: 0 };
    scheduleRedraw();
  }

  function setSnapToGrid(s: boolean) {
    snap = s;
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

  function loadMapTile(imageUrl: string, opacity: number) {
    mapOpacity = opacity;
    if (!imageUrl) {
      mapImage = null;
      scheduleRedraw();
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      mapImage = img;
      scheduleRedraw();
    };
    img.onerror = () => {
      mapImage = null;
      scheduleRedraw();
    };
    img.src = imageUrl;
  }

  function setMapOpacity(opacity: number) {
    mapOpacity = opacity;
    scheduleRedraw();
  }

  function destroy() {
    cancelAnimationFrame(animFrame);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('dblclick', onDblClick);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
    // Remove any label input that might be open
    const inp = container.querySelector('input[type="text"]');
    if (inp) inp.parentNode?.removeChild(inp);
  }

  // ── Register events ────────────────────────────────────────────────────────

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('dblclick', onDblClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);

  // Initial draw
  scheduleRedraw();

  return {
    destroy,
    getLayout,
    setTool,
    undo,
    clear,
    resetView,
    setSnapToGrid,
    setShowGrid,
    setScale,
    setMapOpacity,
    loadMapTile,
  };
}
