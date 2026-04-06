import { Pencil, GitMerge, Move, Undo2, Trash2, RotateCcw } from "lucide-react";
import type { RefObject } from "react";
import type { initCanvasEngine } from "./canvasEngine";

type Engine = ReturnType<typeof initCanvasEngine>;

interface CanvasToolbarProps {
  engineRef: RefObject<Engine | null>;
  activeTool: "draw" | "gate" | "move";
  onToolChange: (t: "draw" | "gate" | "move") => void;
  snapEnabled: boolean;
  onSnapToggle: (v: boolean) => void;
}

export function CanvasToolbar({
  engineRef,
  activeTool,
  onToolChange,
  snapEnabled,
  onSnapToggle,
}: CanvasToolbarProps) {
  const handleTool = (t: "draw" | "gate" | "move") => {
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
    <div className="flex flex-wrap items-center gap-2 p-2 bg-brand-card border-b border-brand-border">
      {/* Tool selector */}
      <button
        type="button"
        className={btnCls(activeTool === "draw")}
        onClick={() => handleTool("draw")}
      >
        <Pencil size={13} /> Draw
      </button>
      <button
        type="button"
        className={btnCls(activeTool === "gate")}
        onClick={() => handleTool("gate")}
      >
        <GitMerge size={13} /> Gate
      </button>
      <button
        type="button"
        className={btnCls(activeTool === "move")}
        onClick={() => handleTool("move")}
      >
        <Move size={13} /> Edit
      </button>

      <div className="w-px h-4 bg-brand-border" />

      {/* Actions */}
      <button
        type="button"
        className={iconBtn}
        onClick={() => engineRef.current?.undo()}
      >
        <Undo2 size={13} /> Undo
      </button>
      <button
        type="button"
        className={iconBtn}
        onClick={() => engineRef.current?.clear()}
      >
        <Trash2 size={13} /> Clear
      </button>
      <button
        type="button"
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
    </div>
  );
}
