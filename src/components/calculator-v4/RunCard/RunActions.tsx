import { DoorOpen, Plus, Trash2 } from "lucide-react";

interface Props {
  onAddSegment: () => void;
  onAddGate: () => void;
  onRemoveRun: () => void;
  canRemove: boolean;
}

/**
 * Bottom action row of the run card body. "Add segment" / "Add gate" / "Remove run".
 */
export function RunActions({
  onAddSegment,
  onAddGate,
  onRemoveRun,
  canRemove,
}: Props) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onAddSegment}
        className="flex-1 py-2 rounded-lg border border-dashed border-brand-border text-xs font-medium text-brand-muted hover:text-brand-accent hover:border-brand-accent hover:bg-brand-accent/5 transition flex items-center justify-center gap-1.5"
        data-testid="v4-add-segment"
      >
        <Plus size={16} /> Add segment
      </button>
      <button
        onClick={onAddGate}
        className="flex-1 py-2 rounded-lg border border-dashed border-brand-border text-xs font-medium text-brand-muted hover:text-brand-accent hover:border-brand-accent hover:bg-brand-accent/5 transition flex items-center justify-center gap-1.5"
        data-testid="v4-add-gate"
      >
        <DoorOpen size={16} /> Add gate
      </button>
      <button
        onClick={onRemoveRun}
        disabled={!canRemove}
        className="px-3 py-2 rounded-lg border border-dashed border-brand-border text-xs font-medium text-brand-danger hover:bg-brand-danger/10 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-remove-run"
      >
        <Trash2 size={16} /> Remove run
      </button>
    </div>
  );
}
