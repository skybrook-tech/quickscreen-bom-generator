import {
  ChevronDown,
  ChevronRight,
  Copy,
  DoorOpen,
  GripVertical,
  Trash2,
} from "lucide-react";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { InlineEdit } from "./InlineEdit";

interface Props {
  seg: CanonicalSegment;
  /** 1-based display index */
  index: number;
  open: boolean;
  onToggle: () => void;
  onLengthChange: (lengthMm: number) => void;
  onHeightChange: (heightMm: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

/**
 * Collapsed segment row: chevron, drag handle, #, inline-editable length & height,
 * panel count, gate badge if applicable, duplicate / remove icons.
 */
export function SegmentHeader({
  seg,
  index,
  open,
  onToggle,
  onLengthChange,
  onHeightChange,
  onDuplicate,
  onRemove,
}: Props) {
  const lengthM = (seg.segmentWidthMm ?? 0) / 1000;
  const isGate = seg.kind === "gate";

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-brand-border/20">
      <button
        onClick={onToggle}
        className="text-brand-muted hover:text-brand-text"
        aria-label={open ? "Collapse segment" : "Expand segment"}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      <GripVertical
        size={14}
        className="text-brand-border/80 cursor-grab"
        aria-hidden="true"
      />
      <span
        className="font-mono text-xs font-semibold text-brand-muted w-6 cursor-pointer"
        onClick={onToggle}
      >
        #{index}
      </span>

      <InlineEdit
        value={lengthM}
        suffix="m"
        displayValue={lengthM.toFixed(2)}
        onCommit={(v) => onLengthChange(v * 1000)}
      />
      <span className="text-brand-border">·</span>
      <InlineEdit
        value={seg.targetHeightMm ?? 0}
        suffix="mm"
        onCommit={onHeightChange}
      />

      {isGate && (
        <>
          <span className="text-brand-border">·</span>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
            <DoorOpen size={10} /> Gate
          </span>
        </>
      )}

      <div className="flex-1" onClick={onToggle} />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        title="Duplicate segment"
        className="p-1.5 text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded"
      >
        <Copy size={13} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove segment"
        className="p-1.5 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
