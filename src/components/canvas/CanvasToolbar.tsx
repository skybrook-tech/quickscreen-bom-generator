import {
  Pencil,
  Building2,
  GitMerge,
  Move,
  Undo2,
  Redo2,
  Trash2,
  RotateCcw,
  Maximize2,
  Minimize2,
  Minus,
  Crosshair,
  CircleHelp,
} from "lucide-react";
import { useState, type RefObject } from "react";
import type { initCanvasEngine } from "./canvasEngine";

type Engine = ReturnType<typeof initCanvasEngine>;
type CanvasTool = "draw" | "gate" | "move" | "boundary" | "building";

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
}: CanvasToolbarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const handleTool = (t: CanvasTool) => {
    engineRef.current?.setTool(t);
    onToolChange(t);
  };

  const btnCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
      active
        ? "border-brand-accent bg-brand-accent/20 text-brand-accent"
        : "border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent/50"
    }`;

  const iconBtn =
    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent/50 transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-brand-card">
      {/* Tool selector */}
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
        title="Place gate on segment"
        className={btnCls(activeTool === "gate")}
        onClick={() => handleTool("gate")}
      >
        <GitMerge size={16} /> Gate
      </button>
      <button
        type="button"
        title="Move the drawing, drag nodes, or edit segment lengths"
        className={btnCls(activeTool === "move")}
        onClick={() => handleTool("move")}
      >
        <Move size={16} /> Move / Edit
      </button>
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

      <div className="w-px h-4 bg-brand-border" />

      {/* Actions */}
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
        title={confirmClear ? "Click again to clear all" : "Clear all"}
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
        <Trash2 size={16} /> {confirmClear ? "Click again" : "Clear"}
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
        title="Reset zoom and pan"
        className={iconBtn}
        onClick={() => engineRef.current?.resetView()}
      >
        <RotateCcw size={16} /> Reset View
      </button>

      <div className="w-px h-4 bg-brand-border" />

      {/* Snap toggle */}
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
