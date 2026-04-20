import {
  Pencil,
  GitMerge,
  Move,
  Undo2,
  Trash2,
  RotateCcw,
  Maximize2,
  Minimize2,
  Minus,
  Crosshair,
} from "lucide-react";
import type { RefObject } from "react";
import type { initCanvasEngine } from "./canvasEngine";

type Engine = ReturnType<typeof initCanvasEngine>;

interface CanvasToolbarProps {
  engineRef: RefObject<Engine | null>;
  activeTool: "draw" | "gate" | "move" | "boundary";
  onToolChange: (t: "draw" | "gate" | "move" | "boundary") => void;
  snapEnabled: boolean;
  onSnapToggle: (v: boolean) => void;
  showGrid: boolean;
  onToggleGrid: (v: boolean) => void;
  expanded: boolean;
  onToggleExpand: (v: boolean) => void;
}

export function CanvasToolbar({
  engineRef,
  activeTool,
  onToolChange,
  snapEnabled,
  onSnapToggle,
  showGrid,
  onToggleGrid,
  expanded,
  onToggleExpand,
}: CanvasToolbarProps) {
  const handleTool = (t: "draw" | "gate" | "move" | "boundary") => {
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
        <Pencil size={13} /> Draw
      </button>
      <button
        type="button"
        title="Place gate on segment"
        className={btnCls(activeTool === "gate")}
        onClick={() => handleTool("gate")}
      >
        <GitMerge size={13} /> Gate
      </button>
      <button
        type="button"
        title="Drag nodes to reposition"
        className={btnCls(activeTool === "move")}
        onClick={() => handleTool("move")}
      >
        <Move size={13} /> Edit
      </button>
      <button
        type="button"
        title="Draw a non-product boundary line (existing fence, wall, property line)"
        className={btnCls(activeTool === "boundary")}
        onClick={() => handleTool("boundary")}
      >
        <Minus size={13} /> Boundary
      </button>

      <div className="w-px h-4 bg-brand-border" />

      {/* Actions */}
      <button
        type="button"
        title="Undo (Ctrl+Z)"
        className={iconBtn}
        onClick={() => engineRef.current?.undo()}
      >
        <Undo2 size={13} /> Undo
      </button>
      <button
        type="button"
        title="Clear all"
        className={iconBtn}
        onClick={() => engineRef.current?.clear()}
      >
        <Trash2 size={13} /> Clear
      </button>
      <button
        type="button"
        title="Centre view on drawn fence"
        className={iconBtn}
        onClick={() => engineRef.current?.fitToContent()}
      >
        <Crosshair size={13} /> Centre
      </button>
      <button
        type="button"
        title="Reset zoom and pan"
        className={iconBtn}
        onClick={() => engineRef.current?.resetView()}
      >
        <RotateCcw size={13} /> Reset View
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
        Snap to grid
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
        {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        {expanded ? "Collapse" : "Expand"}
      </button>
    </div>
  );
}
