import { useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  DoorOpen,
  Pen,
  PenOff,
  Trash2,
} from "lucide-react";
import type { CanonicalSegment } from "../../../types/canonical.types";
import type { SegmentDiagnostic } from "../../../types/bom.types";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useSegmentHeightOptions } from "../../../hooks/useSegmentHeightOptions";
import { InlineEdit } from "./InlineEdit";
import { cn } from "../../../lib";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  /** 1-based display index */
  index: number;
  open: boolean;
  onToggle: () => void;
  onLengthChange: (lengthMm: number) => void;
  onHeightChange: (heightMm: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  mergedVars: Record<string, string | number | boolean>;
  productCode: string | null;
}

export function SegmentHeader({
  runId,
  seg,
  index,
  open,
  onToggle,
  onLengthChange,
  onHeightChange,
  onDuplicate,
  onRemove,
  mergedVars,
  productCode,
}: Props) {
  const { state, dispatch } = useCalculatorV4();
  const lengthM = (seg.segmentWidthMm ?? 0) / 1000;
  const isGate = seg.kind === "gate";
  const locked = seg.confirmed === true;

  const { freeform, freeformBounds, optionsMm: heightOptionsMm, clampFreeform } =
    useSegmentHeightOptions(productCode, mergedVars, seg.targetHeightMm);

  const heightSelectValue = String(
    seg.targetHeightMm ??
      heightOptionsMm[0] ??
      freeformBounds?.minMm ??
      1800,
  );

  const freeformValue =
    seg.targetHeightMm ??
    freeformBounds?.minMm ??
    300;

  const diagnostics = useMemo(
    () =>
      (
        (state.bomResult?.segmentDiagnostics as
          | SegmentDiagnostic[]
          | undefined) ?? []
      ).filter((d) => d.segmentId === seg.segmentId),
    [state.bomResult, seg.segmentId],
  );

  const hasDiagError = diagnostics.some((d) => d.severity === "error");
  const hasDiagWarn =
    !hasDiagError && diagnostics.some((d) => d.severity === "warning");

  const textStyle = cn("text-blue-500 hover:text-blue-600", {
    "text-blue-500": seg.kind === "fence",
    "text-amber-500": seg.kind === "gate",
  });

  function setConfirmed(checked: boolean) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: { ...seg, confirmed: checked },
    });
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
      onClick={() => onToggle()}
    >
      <button
        className={textStyle}
        aria-label={open ? "Collapse segment" : "Expand segment"}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      <span
        className={cn(
          "font-mono text-xs font-semibold w-6 cursor-pointer",
          textStyle,
        )}
      >
        S{index}
      </span>

      <label
        className="flex items-center gap-1.5 shrink-0 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={locked}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="rounded border-brand-border"
          aria-label="Segment confirmed"
          data-testid={`v4-seg-confirmed-${seg.segmentId}`}
        />

        <span className="text-[10px] text-brand-muted whitespace-nowrap">
          {locked ? <PenOff size={10} /> : <Pen size={10} />}
        </span>
      </label>

      <InlineEdit
        label="Length"
        value={lengthM}
        suffix="m"
        displayValue={lengthM.toFixed(2)}
        onCommit={(v) => onLengthChange(v * 1000)}
        className={textStyle}
        disabled={locked}
      />
      <span className={cn("text-brand-border", textStyle)}>·</span>
      <span
        className="inline-flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={cn("text-xs text-brand-accent font-medium", textStyle)}
        >
          Height
        </span>
        {freeform && freeformBounds ? (
          <input
            type="number"
            min={freeformBounds.minMm}
            max={freeformBounds.maxMm}
            step={1}
            value={freeformValue}
            onChange={(e) =>
              onHeightChange(clampFreeform(Number(e.target.value)))
            }
            disabled={locked}
            className={cn(
              "font-mono text-sm tabular-nums rounded border border-brand-border bg-brand-card px-1 py-0.5 max-w-[5.5rem] w-[5rem]",
              textStyle,
            )}
          />
        ) : (
          <select
            value={heightSelectValue}
            onChange={(e) => onHeightChange(Number(e.target.value))}
            disabled={locked}
            className={cn(
              "font-mono text-sm tabular-nums rounded border border-brand-border bg-brand-card px-1 py-0.5 max-w-[5.5rem]",
              textStyle,
            )}
          >
            {heightOptionsMm.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        )}
        <span className={cn("text-xs font-mono", textStyle)}>mm</span>
      </span>

      {isGate && (
        <>
          <span className={cn("text-brand-border", textStyle)}>·</span>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-400 font-medium">
            <DoorOpen size={10} /> Gate
          </span>
        </>
      )}

      <div
        className="flex items-center gap-0.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {hasDiagError && (
          <button
            type="button"
            title={diagnostics
              .filter((d) => d.severity === "error")
              .map((d) => d.message)
              .join(" | ")}
            onClick={onToggle}
            className="text-red-500 hover:text-red-400 p-1"
            aria-label="Segment has BOM errors"
          >
            <AlertCircle size={15} />
          </button>
        )}
        {hasDiagWarn && (
          <button
            type="button"
            title={diagnostics
              .filter((d) => d.severity === "warning")
              .map((d) => d.message)
              .join(" | ")}
            onClick={onToggle}
            className="text-amber-500 hover:text-amber-400 p-1"
            aria-label="Segment has BOM warnings"
          >
            <AlertTriangle size={15} />
          </button>
        )}
      </div>

      <div className="flex-1" />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        title="Duplicate segment"
        disabled={locked}
        className={cn(
          "p-1.5 text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded disabled:opacity-40 disabled:pointer-events-none",
          textStyle,
        )}
      >
        <Copy size={13} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove segment"
        className={cn(
          textStyle,
          "p-1.5 hover:text-red-500 hover:bg-red-500/20 rounded",
        )}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
