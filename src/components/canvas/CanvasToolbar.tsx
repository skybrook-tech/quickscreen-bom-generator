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
  Crosshair,
  CircleHelp,
} from "lucide-react";
import type { RefObject } from "react";
import type { initCanvasEngine } from "./canvasEngine";
import { ConfirmButton } from "../shared/ConfirmButton";
import { TOOL_HOTKEYS } from "../../lib/canvasShortcuts";

type Engine = ReturnType<typeof initCanvasEngine>;
type CanvasTool = "draw" | "gate" | "move" | "boundary" | "building" | "text" | "post" | "pillar" | "freehand";

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
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-brand-muted">
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

      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-brand-muted">
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
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-brand-muted">
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
        title="Layout map help (?)"
        aria-label="Layout map help"
        className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-primary/50 bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary/20"
      >
        <CircleHelp size={16} /> Help
      </button>
    </div>
  );
}
