import { DoorOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  onAddSegment: () => void;
  onBulkAdd?: (count: number, widthMm: number, heightMm: number) => void;
  onMatchPanels?: () => void;
  onAddGate: () => void;
  onRemoveRun: () => void;
  canRemove: boolean;
  isBayg?: boolean;
}

/**
 * Bottom action row of the run card body. "Add segment" / "Add gate" / "Remove run".
 */
export function RunActions({
  onAddSegment,
  onBulkAdd,
  onMatchPanels,
  onAddGate,
  onRemoveRun,
  canRemove,
  isBayg = false,
}: Props) {
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkWidth, setBulkWidth] = useState(1000);
  const [bulkHeight, setBulkHeight] = useState(1800);

  return (
    <div className="space-y-2 pt-1">
      {isBayg && (
        <div className="rounded-lg border border-brand-border/70 bg-brand-bg/40 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-brand-text">
                Bulk add panels
              </div>
              <p className="text-[11px] text-brand-muted">
                Add identical infill panels, then edit any odd sizes below.
              </p>
            </div>
            <button
              type="button"
              onClick={onMatchPanels}
              className="rounded-md border border-brand-border px-2 py-1 text-xs font-medium text-brand-text hover:border-brand-accent hover:text-brand-accent"
            >
              Match all panels
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-brand-muted">
                Count
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={bulkCount}
                onChange={(e) => setBulkCount(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-white px-2 py-1.5 text-xs text-brand-text"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-brand-muted">
                Width mm
              </span>
              <input
                type="number"
                min={300}
                max={2600}
                step={1}
                value={bulkWidth}
                onChange={(e) => setBulkWidth(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-white px-2 py-1.5 text-xs text-brand-text"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-brand-muted">
                Height mm
              </span>
              <input
                type="number"
                min={300}
                max={2700}
                step={1}
                value={bulkHeight}
                onChange={(e) => setBulkHeight(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-white px-2 py-1.5 text-xs text-brand-text"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() =>
              onBulkAdd?.(
                Math.max(1, Math.min(100, Math.round(bulkCount))),
                Math.max(300, Math.min(2600, Math.round(bulkWidth))),
                Math.max(300, Math.min(2700, Math.round(bulkHeight))),
              )
            }
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-brand-border py-2 text-xs font-medium text-brand-muted transition hover:border-brand-accent hover:bg-brand-accent/5 hover:text-brand-accent"
            data-testid="v4-bayg-bulk-add"
          >
            <Plus size={13} /> Bulk add
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onAddSegment}
          className="flex-1 py-2 rounded-md border border-dashed border-brand-border text-xs font-medium text-brand-muted hover:text-brand-accent hover:border-brand-accent hover:bg-brand-accent/5 transition flex items-center justify-center gap-1.5"
          data-testid="v4-add-segment"
        >
          <Plus size={13} /> {isBayg ? "Add panel" : "Add segment"}
        </button>
        {!isBayg && (
          <button
            onClick={onAddGate}
            className="flex-1 py-2 rounded-md border border-dashed border-brand-border text-xs font-medium text-brand-muted hover:text-brand-accent hover:border-brand-accent hover:bg-brand-accent/5 transition flex items-center justify-center gap-1.5"
            data-testid="v4-add-gate"
          >
            <DoorOpen size={13} /> Add gate
          </button>
        )}
        <button
          onClick={onRemoveRun}
          disabled={!canRemove}
          className="px-3 py-2 rounded-md border border-dashed border-brand-border text-xs font-medium text-brand-danger hover:bg-brand-danger/10 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="v4-remove-run"
        >
          <Trash2 size={13} /> Remove run
        </button>
      </div>
    </div>
  );
}
