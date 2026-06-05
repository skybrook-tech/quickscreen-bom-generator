import { Crosshair, Printer, RotateCcw, Maximize2, Minimize2 } from "lucide-react";

interface MapActionsMenuProps {
  onCentre: () => void;
  onPrint: () => void;
  onReset: () => void;
  onToggleExpand: () => void;
  expanded: boolean;
}

export function MapActionsMenu({
  onCentre,
  onPrint,
  onReset,
  onToggleExpand,
  expanded,
}: MapActionsMenuProps) {
  return (
    <div className="absolute top-[14px] right-[14px] z-20 bg-white/95 border border-brand-border/60 rounded-lg flex items-center gap-[2px] p-[3px] shadow-lg backdrop-blur text-neutral-800">
      <button
        type="button"
        onClick={onCentre}
        title="Centre view on drawn fence (C)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
      >
        <Crosshair size={14} className="text-neutral-500" />
        <span>Centre</span>
        <span className="font-mono text-[9px] text-neutral-400 border border-neutral-200 px-1 rounded bg-white">
          C
        </span>
      </button>

      <button
        type="button"
        onClick={onPrint}
        title="Print map layout (P)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
      >
        <Printer size={14} className="text-neutral-500" />
        <span>Print Map</span>
        <span className="font-mono text-[9px] text-neutral-400 border border-neutral-200 px-1 rounded bg-white">
          P
        </span>
      </button>

      <button
        type="button"
        onClick={onReset}
        title="Reset zoom and pan"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
      >
        <RotateCcw size={14} className="text-neutral-500" />
        <span>Reset View</span>
      </button>

      <button
        type="button"
        onClick={onToggleExpand}
        title={expanded ? "Collapse drawing to screen (F)" : "Expand drawing to screen (F)"}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
      >
        {expanded ? (
          <Minimize2 size={14} className="text-neutral-500" />
        ) : (
          <Maximize2 size={14} className="text-neutral-500" />
        )}
        <span>{expanded ? "Collapse" : "Drawing to screen"}</span>
      </button>
    </div>
  );
}
