import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import type { CanonicalSegment } from "../../../types/canonical.types";

interface Props {
  /** Screen-space anchor coordinates (viewport pixels). */
  x: number;
  y: number;
  segment: CanonicalSegment;
  onCommitLengthMm: (mm: number) => void;
  onDelete: () => void;
  onClose: () => void;
}

const MIN_LEN_M = 0.1;

export function SegmentContextMenu({
  x,
  y,
  segment,
  onCommitLengthMm,
  onDelete,
  onClose,
}: Props) {
  const initialM = (segment.segmentWidthMm ?? 0) / 1000;
  const [value, setValue] = useState(initialM.toFixed(2));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (e.target instanceof Node && !rootRef.current.contains(e.target)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Defer so the click that opened the menu isn't immediately treated as outside
    const t = window.setTimeout(() => {
      document.addEventListener("click", onDoc);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function commit() {
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n) || n < MIN_LEN_M) {
      onClose();
      return;
    }
    const mm = Math.round(n * 1000);
    if (mm === segment.segmentWidthMm) {
      onClose();
      return;
    }
    onCommitLengthMm(mm);
    onClose();
  }

  const kindLabel = segment.kind === "gate" ? "Gate" : "Segment";

  // Portal to body so position:fixed uses the viewport; ancestors of the layout
  // pane use transform (slide animation), which breaks fixed + clientX/Y.
  const menu = (
    <div
      ref={rootRef}
      role="menu"
      className="fixed z-[1000] min-w-[220px] rounded-lg border border-brand-border bg-brand-card shadow-xl overflow-hidden"
      style={{ left: x, top: y }}
      data-testid="v4-segment-context-menu"
    >
      <div className="px-3 py-2 border-b border-brand-border text-[11px] uppercase tracking-wider text-brand-muted">
        {kindLabel}
      </div>
      <form
        className="px-3 py-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        <label className="text-xs text-brand-muted" htmlFor="v4-ctx-len">
          Length
        </label>
        <input
          id="v4-ctx-len"
          ref={inputRef}
          type="number"
          step="0.01"
          min={MIN_LEN_M}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          className="flex-1 font-mono text-sm rounded border border-brand-border bg-brand-bg px-2 py-1 text-brand-text"
          data-testid="v4-segment-context-length"
        />
        <span className="text-xs font-mono text-brand-muted">m</span>
      </form>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-danger hover:bg-brand-danger/10 border-t border-brand-border"
        data-testid="v4-segment-context-delete"
      >
        <Trash2 size={16} />
        Delete {kindLabel.toLowerCase()}
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}
