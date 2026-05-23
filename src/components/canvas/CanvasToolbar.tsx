import {
  Pencil,
  Building2,
  CircleDot,
  Type,
  PenLine,
  GitMerge,
  Landmark,
  Move,
  Undo2,
  Redo2,
  Trash2,
  Printer,
  RotateCcw,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Crosshair,
  CircleHelp,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useRef, type RefObject } from "react";
import type { initCanvasEngine } from "./canvasEngine";
import { ConfirmButton } from "../shared/ConfirmButton";
import { TOOL_HOTKEYS } from "../../lib/canvasShortcuts";
import type {
  CanonicalMapLayerId,
  CanonicalMapSnapshotLayer,
} from "../../types/canonical.types";

type Engine = ReturnType<typeof initCanvasEngine>;
type CanvasTool = "draw" | "gate" | "move" | "boundary" | "building" | "text" | "post" | "pillar" | "freehand" | "arrow";
type FreehandStyle = {
  color: string;
  width: number;
  lineStyle: "solid" | "dashed" | "dotted";
  opacity: number;
  arrow: boolean;
};

type CachedMapLayerState = Partial<
  Record<
    CanonicalMapLayerId,
    Pick<CanonicalMapSnapshotLayer, "visible" | "opacity">
  >
>;

interface CanvasToolbarProps {
  engineRef: RefObject<Engine | null>;
  activeTool: CanvasTool;
  onToolChange: (t: CanvasTool) => void;
  snapEnabled: boolean;
  onSnapToggle: (v: boolean) => void;
  gateSnap100: boolean;
  onGateSnap100Toggle: (v: boolean) => void;
  showGrid: boolean;
  onToggleGrid: (v: boolean) => void;
  expanded: boolean;
  onToggleExpand: (v: boolean) => void;
  onHelpOpen: () => void;
  onPrintMap: () => void;
  freehandStyle: FreehandStyle;
  onFreehandStyleChange: (style: Partial<FreehandStyle>) => void;
  mapLayers?: Partial<Record<CanonicalMapLayerId, CanonicalMapSnapshotLayer>> | null;
  onMapLayerChange?: (
    layerId: CanonicalMapLayerId,
    updates: Partial<Pick<CanonicalMapSnapshotLayer, "visible" | "opacity">>,
  ) => void;
}

export function CanvasToolbar({
  engineRef,
  activeTool,
  onToolChange,
  snapEnabled,
  onSnapToggle,
  gateSnap100,
  onGateSnap100Toggle,
  showGrid,
  onToggleGrid,
  expanded,
  onToggleExpand,
  onHelpOpen,
  onPrintMap,
  freehandStyle,
  onFreehandStyleChange,
  mapLayers,
  onMapLayerChange,
}: CanvasToolbarProps) {
  const handleTool = (t: CanvasTool) => {
    engineRef.current?.setTool(t);
    onToolChange(t);
  };

  const btnCls = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "border-brand-accent bg-brand-accent/20 text-brand-accent"
        : "border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent/50"
    }`;

  const iconBtn =
    "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-muted transition-colors hover:text-brand-text hover:border-brand-accent/50";

  const keyBadge = (key: string) => (
    <span className="rounded border border-current/30 px-1 font-mono text-[10px] opacity-75">
      {key}
    </span>
  );

  const layerRows = (["satellite", "roadmap"] as const)
    .map((layerId) => ({ layerId, layer: mapLayers?.[layerId] }))
    .filter(
      (
        row,
      ): row is {
        layerId: CanonicalMapLayerId;
        layer: CanonicalMapSnapshotLayer;
      } => Boolean(row.layer),
    );
  const availableLayerRows = layerRows.filter(({ layer }) => Boolean(layer.url));
  const mapVisible = availableLayerRows.some(({ layer }) => layer.visible);
  const previousMapLayerStateRef = useRef<CachedMapLayerState | null>(null);
  const handleMapVisibilityToggle = () => {
    if (!onMapLayerChange) return;
    if (mapVisible) {
      previousMapLayerStateRef.current = Object.fromEntries(
        availableLayerRows.map(({ layerId, layer }) => [
          layerId,
          { visible: layer.visible, opacity: layer.opacity },
        ]),
      ) as CachedMapLayerState;
      availableLayerRows.forEach(({ layerId }) => {
        onMapLayerChange(layerId, { visible: false });
      });
      return;
    }

    const fallback: Required<CachedMapLayerState> = {
      satellite: { visible: true, opacity: 1 },
      roadmap: { visible: true, opacity: 0.5 },
    };
    availableLayerRows.forEach(({ layerId }) => {
      onMapLayerChange(layerId, previousMapLayerStateRef.current?.[layerId] ?? fallback[layerId]);
    });
  };

  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-brand-border/60 bg-brand-card p-2 [scrollbar-width:thin] md:flex-wrap md:gap-3 md:border-b-0">
      <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-border/70 bg-brand-bg/50 px-2 py-1.5">
        <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-brand-muted">Draw</span>
      <button
        type="button"
        title={`Draw fence run (${TOOL_HOTKEYS.draw})`}
        className={btnCls(activeTool === "draw")}
        onClick={() => handleTool("draw")}
      >
        <Pencil size={16} /> Draw Fence {keyBadge(TOOL_HOTKEYS.draw)}
      </button>
      <button
        type="button"
        title={`Place gate on section (${TOOL_HOTKEYS.gate})`}
        className={btnCls(activeTool === "gate")}
        onClick={() => handleTool("gate")}
      >
        <GitMerge size={16} /> Gate {keyBadge(TOOL_HOTKEYS.gate)}
      </button>
      <button
        type="button"
        title={`Move the drawing, drag nodes, or edit section lengths (${TOOL_HOTKEYS.move})`}
        className={btnCls(activeTool === "move")}
        onClick={() => handleTool("move")}
      >
        <Move size={16} /> Move / Edit {keyBadge(TOOL_HOTKEYS.move)}
      </button>
      </div>

      <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-border/70 bg-brand-bg/50 px-2 py-1.5">
        <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-brand-muted">Site</span>
      <button
        type="button"
        title={`Draw a dotted context line (${TOOL_HOTKEYS.boundary})`}
        className={btnCls(activeTool === "boundary")}
        onClick={() => handleTool("boundary")}
      >
        <Minus size={16} /> Dotted line {keyBadge(TOOL_HOTKEYS.boundary)}
      </button>
      <button
        type="button"
        title={`Draw a straight arrow annotation (${TOOL_HOTKEYS.arrow})`}
        className={btnCls(activeTool === "arrow")}
        onClick={() => handleTool("arrow")}
      >
        <ArrowRight size={16} /> Arrow {keyBadge(TOOL_HOTKEYS.arrow)}
      </button>
      <button
        type="button"
        title={`Draw a building or fixed structure line (${TOOL_HOTKEYS.building})`}
        className={btnCls(activeTool === "building")}
        onClick={() => handleTool("building")}
      >
        <Building2 size={16} /> Building {keyBadge(TOOL_HOTKEYS.building)}
      </button>
      <button
        type="button"
        title={`Free draw site notes (${TOOL_HOTKEYS.freehand})`}
        className={btnCls(activeTool === "freehand")}
        onClick={() => handleTool("freehand")}
      >
        <PenLine size={16} /> Free Draw {keyBadge(TOOL_HOTKEYS.freehand)}
      </button>
      {activeTool === "freehand" && (
        <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-border/70 bg-brand-card px-2 py-1 text-xs text-brand-muted">
          <input
            type="color"
            value={freehandStyle.color}
            title="Free draw colour"
            onChange={(event) => onFreehandStyleChange({ color: event.target.value })}
            className="h-6 w-7 rounded border border-brand-border bg-transparent"
          />
          <select
            value={freehandStyle.width}
            title="Free draw line width"
            onChange={(event) => onFreehandStyleChange({ width: Number(event.target.value) })}
            className="rounded border border-brand-border bg-brand-bg px-1 py-1"
          >
            <option value={1}>1px</option>
            <option value={2}>2px</option>
            <option value={4}>4px</option>
            <option value={8}>8px</option>
          </select>
          <select
            value={freehandStyle.lineStyle}
            title="Free draw line style"
            onChange={(event) => onFreehandStyleChange({ lineStyle: event.target.value as "solid" | "dashed" | "dotted" })}
            className="rounded border border-brand-border bg-brand-bg px-1 py-1"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
          <select
            value={freehandStyle.opacity}
            title="Free draw opacity"
            onChange={(event) => onFreehandStyleChange({ opacity: Number(event.target.value) })}
            className="rounded border border-brand-border bg-brand-bg px-1 py-1"
          >
            <option value={0.25}>25%</option>
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={1}>100%</option>
          </select>
        </div>
      )}
      <button
        type="button"
        title={`Place an existing post marker (${TOOL_HOTKEYS.post})`}
        className={btnCls(activeTool === "post")}
        onClick={() => handleTool("post")}
      >
        <CircleDot size={16} /> Existing post {keyBadge(TOOL_HOTKEYS.post)}
      </button>
      <button
        type="button"
        title={`Place an existing pillar marker (${TOOL_HOTKEYS.pillar})`}
        className={btnCls(activeTool === "pillar")}
        onClick={() => handleTool("pillar")}
      >
        <Landmark size={16} /> Pillar {keyBadge(TOOL_HOTKEYS.pillar)}
      </button>
      <button
        type="button"
        title={`Place a text note on the map (${TOOL_HOTKEYS.text})`}
        className={btnCls(activeTool === "text")}
        onClick={() => handleTool("text")}
      >
        <Type size={16} /> Text {keyBadge(TOOL_HOTKEYS.text)}
      </button>
      </div>

      <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-border/70 bg-brand-bg/50 px-2 py-1.5">
        <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-brand-muted">Actions</span>
      <button
        type="button"
        title="Undo (Ctrl+Z)"
        className={iconBtn}
        onClick={() => engineRef.current?.undo()}
      >
        <Undo2 size={16} /> Undo
      </button>
      <button
        type="button"
        title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
        className={iconBtn}
        onClick={() => engineRef.current?.redo()}
      >
        <Redo2 size={16} /> Redo
      </button>
      <button
        type="button"
        title="Zoom in (+)"
        aria-label="Zoom in canvas"
        className={iconBtn}
        onClick={() => engineRef.current?.zoomIn()}
      >
        <Plus size={16} /> Zoom in
      </button>
      <button
        type="button"
        title="Zoom out (-)"
        aria-label="Zoom out canvas"
        className={iconBtn}
        onClick={() => engineRef.current?.zoomOut()}
      >
        <Minus size={16} /> Zoom out
      </button>
      <ConfirmButton
        title="Clear map"
        className={iconBtn}
        confirmLabel={<><Trash2 size={16} /> Click again to confirm</>}
        onConfirm={() => {
          engineRef.current?.clear();
          handleTool("draw");
        }}
      >
        <Trash2 size={16} /> Clear map
      </ConfirmButton>
      <button
        type="button"
        title="Centre view on drawn fence"
        className={iconBtn}
        onClick={() => engineRef.current?.fitToContent()}
      >
        <Crosshair size={16} /> Centre
      </button>
      <button
        type="button"
        title="Print installer-ready layout map"
        className={iconBtn}
        onClick={onPrintMap}
      >
        <Printer size={16} /> Print Map
      </button>
      <button
        type="button"
        title="Reset zoom and pan"
        className={iconBtn}
        onClick={() => engineRef.current?.resetView()}
      >
        <RotateCcw size={16} /> Reset View
      </button>
      </div>

      <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-border/70 bg-brand-bg/50 px-2 py-1.5">
        <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-brand-muted">View</span>
      {layerRows.length > 0 && onMapLayerChange ? (
        <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-brand-border/70 bg-brand-card/80 px-2 py-1 text-xs text-brand-muted">
          <span className="font-bold uppercase tracking-wide text-brand-text">Layers</span>
          <button
            type="button"
            aria-label={mapVisible ? "Hide map underlay" : "Show map underlay"}
            title={mapVisible ? "Hide map underlay" : "Show map underlay"}
            className={btnCls(mapVisible)}
            onClick={handleMapVisibilityToggle}
          >
            {mapVisible ? "Map off" : "Map on"}
          </button>
          {layerRows.map(({ layerId, layer }) => {
            const label = layerId === "satellite" ? "Satellite" : "Roadmap";
            const layerAvailable = Boolean(layer.url);
            return (
              <div key={layerId} className="inline-flex items-center gap-1.5">
                <span
                  className={!layerAvailable || !mapVisible ? "opacity-50" : undefined}
                  title={
                    layerAvailable
                      ? `${label} layer opacity`
                      : `${label} layer was not captured`
                  }
                >
                  {label}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layer.opacity * 100)}
                  aria-label={`${label} layer opacity`}
                  title={`${label} opacity`}
                  disabled={!mapVisible || !layerAvailable}
                  onInput={(event) =>
                    onMapLayerChange(layerId, {
                      opacity: Number(event.currentTarget.value) / 100,
                    })
                  }
                  className="h-1.5 w-20 accent-brand-accent disabled:cursor-not-allowed disabled:opacity-40"
                />
                <span className="w-8 text-right tabular-nums">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-brand-muted">
        <input
          type="checkbox"
          aria-label="Angle snap"
          checked={snapEnabled}
          onChange={(e) => {
            onSnapToggle(e.target.checked);
            engineRef.current?.setSnapToGrid(e.target.checked);
          }}
          className="accent-brand-accent"
        />
        Angle snap
      </label>

      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-brand-muted">
        <input
          type="checkbox"
          aria-label="Gate snap 100mm"
          checked={gateSnap100}
          onChange={(e) => {
            onGateSnap100Toggle(e.target.checked);
            engineRef.current?.setGateSnapTo100mm(e.target.checked);
          }}
          className="accent-brand-accent"
        />
        Gate snap 100mm
      </label>

      {/* Grid toggle */}
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-brand-muted">
        <input
          type="checkbox"
          aria-label="Show grid"
          checked={showGrid}
          onChange={(e) => onToggleGrid(e.target.checked)}
          className="accent-brand-accent"
        />
        Grid
      </label>

      <div className="w-px h-4 bg-brand-border" />

      {/* Expand/Collapse */}
      <button
        type="button"
        onClick={() => onToggleExpand(!expanded)}
        title={
          expanded ? "Collapse canvas" : "Expand canvas for complex layouts"
        }
        className={iconBtn}
      >
        {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        {expanded ? "Collapse" : "Expand"}
      </button>
      </div>
      <button
        type="button"
        onClick={onHelpOpen}
        title="Layout map help (?)"
        aria-label="Layout map help"
        className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-primary/50 bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary/20"
      >
        <CircleHelp size={16} /> Help
      </button>
    </div>
  );
}
