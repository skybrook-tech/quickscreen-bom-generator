# Phase 6 — Canvas Layout Tool (Vanilla JS Port)

## Goal

Port the existing vanilla JS fence drawing canvas into a TypeScript module and wrap it in a thin React component. Do NOT rewrite the canvas logic — extract and adapt the working code from the existing HTML app.

## Steps

1. Port existing canvas JS into `canvasEngine.ts`
2. Build `FenceLayoutCanvas.tsx` React wrapper with `useRef` + `useEffect`
3. Build `CanvasToolbar.tsx` (React buttons calling engine methods)
4. Port Google Maps underlay logic into the engine
5. Build `MapControls.tsx` (load map, opacity, map type)
6. Wire "Use This Layout →" to dispatch to `FenceConfigContext` + `GateContext`

## Components to Build

| Component | Description |
|-----------|-------------|
| `FenceLayoutCanvas.tsx` | React wrapper: `useRef`+`useEffect` hosting vanilla JS canvas |
| `canvasEngine.ts` | Ported vanilla JS: all drawing, interaction, snap, undo logic |
| `CanvasToolbar.tsx` | Draw, Gate, Move, Undo, Clear tool buttons (React) |
| `MapControls.tsx` | Google Maps load/opacity/type controls (React) |

## Architecture: Port, Don't Rewrite

The existing HTML app has a fully working canvas drawing tool. **Do NOT rewrite this in react-konva or any React canvas library.** Extract the vanilla JS canvas code from the existing HTML file's `<script>` tags and put it in `canvasEngine.ts`.

### `canvasEngine.ts` — The Black Box

This file is a **pure TypeScript module** with no React imports:

```typescript
export function initCanvasEngine(
  canvas: HTMLCanvasElement,
  config: CanvasEngineConfig
): {
  destroy: () => void;
  getLayout: () => CanvasLayout;
  setTool: (tool: 'draw' | 'gate' | 'move') => void;
  undo: () => void;
  clear: () => void;
  resetView: () => void;
  setSnapToGrid: (snap: boolean) => void;
  setShowGrid: (show: boolean) => void;
  loadMapTile: (imageUrl: string, opacity: number) => void;
}
```

It manages internally:
- All mouse/touch event listeners (`mousedown`, `mousemove`, `mouseup`, `wheel`, `contextmenu`, `dblclick`, `keydown`)
- Internal state: segments, points, gates, undo stack, zoom, pan offset
- Drawing, snapping, grid rendering, label rendering
- Google Maps tile loading and underlay rendering

### `FenceLayoutCanvas.tsx` — The Thin Wrapper

React only manages:
- Mounting/unmounting the `<canvas>` element
- Calling engine methods from toolbar button clicks
- The "Use This Layout →" callback that reads `getLayout()` and dispatches to context

```typescript
export function FenceLayoutCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    engineRef.current = initCanvasEngine(canvasRef.current, {
      snapToGrid: true,
      gridSize: 20,
      showGrid: true,
    });
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  // ...
}
```

## Canvas Features (from existing app)

| Feature | Description |
|---------|-------------|
| Draw fence runs | Click to place start, click again to extend, double-click or Enter to finish |
| Segment editing | Click a segment label to edit real-world length |
| Place gates | Click on a segment to place a gate marker |
| Snap to grid | Toggleable grid snapping |
| Pan & zoom | Scroll = zoom, right-drag = pan |
| Undo | Undo last action |
| Google Maps underlay | Satellite imagery with opacity control |

## Layout Data Types

```typescript
export interface CanvasSegment {
  startX: number; startY: number;
  endX: number; endY: number;
  lengthMM: number;       // real-world length in mm
  angleDeg: number;       // angle from horizontal
}

export interface CanvasGate {
  segmentIndex: number;
  positionOnSegment: number;  // 0–1 fraction along segment
  widthMM: number;
}

export interface CanvasLayout {
  segments: CanvasSegment[];
  gates: CanvasGate[];
  totalLengthM: number;
  cornerCount: number;    // count of ~90° angles between adjacent segments
}
```

## "Use This Layout →" Data Flow

1. `getLayout()` returns `CanvasLayout` with segments, gates, total length, corner count
2. Sum all segment lengths → `FenceConfigContext` dispatch `SET_CONFIG { totalRunLength, corners }`
3. Gate markers → create `GateConfig` entries via `GateContext` dispatch `SET_GATES`

## Google Maps Integration

- Google Maps JS API is loaded via a `<script>` tag in `index.html` (or dynamically in the engine)
- The engine geocodes an address or uses browser geolocation
- Fetches a static map tile at the correct zoom level
- Draws it as a background image on the canvas with configurable opacity
- Matches the existing app approach — no React wrapper needed

## Responsive Behaviour

- Canvas tool is not practical on mobile phones
- Hide the canvas section on mobile, show form-only mode
- Canvas is full-featured on desktop and tablets

## Completion Criteria

- Fence runs can be drawn, edited, and cleared on the canvas
- Grid snapping works and can be toggled
- Pan and zoom work correctly
- Undo removes the last placed point/segment
- Google Maps satellite imagery loads as a canvas underlay
- "Use This Layout →" correctly populates total run length, corners, and gate count in the form
- Canvas cleans up event listeners on unmount (no memory leaks)
