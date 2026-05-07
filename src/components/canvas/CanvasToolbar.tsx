import {
  Pencil,
  Building2,
  CircleDot,
  Type,
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
  Crosshair,
  CircleHelp,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { initCanvasEngine } from "./canvasEngine";

type Engine = ReturnType<typeof initCanvasEngine>;
type CanvasTool = "draw" | "gate" | "move" | "boundary" | "building" | "text" | "post" | "pillar";

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
}: CanvasToolbarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const clearButtonRef = useRef<HTMLButtonElement | null>(null);
  const handleTool = (t: CanvasTool) => {
    engineRef.current?.setTool(t);
    onToolChange(t);
  };

  useEffect(() => {
    if (!confirmClear) return;
    const resetOnOutsideClick = (event: PointerEvent) => {
      if (clearButtonRef.current?.contains(event.target as Node)) return;
      setConfirmClear(false);
    };
    window.addEventListener("pointerdown", resetOnOutsideClick, true);
    return () => window.removeEventListener("pointerdown", resetOnOutsideClick, true);
  }, [confirmClear]);

  const btnCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
      active
        ? "border-brand-accent bg-brand-accent/20 text-brand-accent"
        : "border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent/50"
    }`;

  const iconBtn =
    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent/50 transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-3 p-2 bg-brand-card">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-border/70 bg-brand-bg/50 px-2 py-1.5">
        <span className="text-[10px] font-black uppercase tracking-wide text-brand-muted">Draw</span>
      <button
        type="button"
        title="Draw fence run"
        className={btnCls(activeTool === "draw")}
        onClick={() => handleTool("draw")}
      >
        <Pencil size={16} /> Draw
      </button>
      <button
        type="button"
        title="Place gate on section"
        className={btnCls(activeTool === "gate")}
        onClick={() => handleTool("gate")}
      >
        <GitMerge size={16} /> Gate
      </button>
      <button
        type="button"
        title="Move the drawing, drag nodes, or edit section lengths"
        className={btnCls(activeTool === "move")}
        onClick={() => handleTool("move")}
      >
        <Move size={16} /> Move / Edit
      </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-border/70 bg-brand-bg/50 px-2 py-1.5">
        <span className="text-[10px] font-black uppercase tracking-wide text-brand-muted">Site</span>
      <button
        type="button"
        title="Draw a non-product boundary line (existing fence, wall, property line)"
        className={btnCls(activeTool === "boundary")}
        onClick={() => handleTool("boundary")}
      >
        <Minus size={16} /> Boundary
      </button>
      <button
        type="button"
        title="Draw a building or fixed structure line"
        className={btnCls(activeTool === "building")}
        onClick={() => handleTool("building")}
      >
        <Building2 size={16} /> Building
      </button>
      <button
        type="button"
        title="Place an existing post marker"
        className={btnCls(activeTool === "post")}
        onClick={() => handleTool("post")}
      >
        <CircleDot size={16} /> Existing post
      </button>
      <button
        type="button"
        title="Place an existing pillar marker"
        className={btnCls(activeTool === "pillar")}
        onClick={() => handleTool("pillar")}
      >
        <Landmark size={16} /> Pillar
      </button>
      <button
        type="button"
        title="Place a text note on the map"
        className={btnCls(activeTool === "text")}
        onClick={() => handleTool("text")}
      >
        <Type size={16} /> Text
      </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-border/70 bg-brand-bg/50 px-2 py-1.5">
        <span className="text-[10px] font-black uppercase tracking-wide text-brand-muted">Actions</span>
      <button
        ref={clearButtonRef}
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
        title={confirmClear ? "Click again to clear map" : "Clear map"}
        className={`${iconBtn} ${confirmClear ? "border-brand-danger text-brand-danger" : ""}`}
        onClick={() => {
          if (!confirmClear) {
            setConfirmClear(true);
            return;
          }
          engineRef.current?.clear();
          setConfirmClear(false);
        }}
        onBlur={() => setConfirmClear(false)}
      >
        <Trash2 size={16} /> {confirmClear ? "Click again" : "Clear map"}
      </button>
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

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-border/70 bg-brand-bg/50 px-2 py-1.5">
        <span className="text-[10px] font-black uppercase tracking-wide text-brand-muted">View</span>
      <label className="flex items-center gap-1.5 text-xs text-brand-muted cursor-pointer">
        <input
          type="checkbox"
          checked={snapEnabled}
          onChange={(e) => {
            onSnapToggle(e.target.checked);
            engineRef.current?.setSnapToGrid(e.target.checked);
          }}
          className="accent-brand-accent"
        />
        Angle/grid snap
      </label>

      <label className="flex items-center gap-1.5 text-xs text-brand-muted cursor-pointer">
        <input
          type="checkbox"
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
      <label className="flex items-center gap-1.5 text-xs text-brand-muted cursor-pointer">
        <input
          type="checkbox"
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
        title="Layout map help"
        aria-label="Layout map help"
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-brand-primary/50 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors"
      >
        <CircleHelp size={16} /> Help
      </button>
    </div>
  );
}
