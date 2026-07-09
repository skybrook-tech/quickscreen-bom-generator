import type { LucideIcon } from "lucide-react";
import { Edit2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../../lib/index";

interface BoundedInputConfig {
  min: number;
  max: number;
  step?: number;
}

interface InlineEditProps {
  label: string;
  /** When set, shown instead of the text label (keep `label` for accessibility). */
  icon?: LucideIcon;
  extraIconClassName?: string;
  value: number;
  suffix: string;
  onCommit: (value: number) => void;
  displayValue?: string;
  min?: number;
  className?: string;
  /** When true, row is display-only (segment confirmed). */
  disabled?: boolean;
  /** White-on-accent styling for confirmed segment header row. */
  onAccentSurface?: boolean;
  /**
   * When provided (non-empty), edit mode uses a dropdown instead of a text field
   * (e.g. pitch-ladder heights in mm). Accepts plain numbers (labelled with the
   * number itself) or `{ value, label }` pairs for richer labels like
   * "1800mm - 12 slats".
   */
  selectOptions?: number[] | { value: number; label: string }[];
  /**
   * When set, edit mode uses a bounded number input (e.g. freeform height mm).
   * Ignored if `selectOptions` is non-empty.
   */
  boundedInput?: BoundedInputConfig;
}

export function InlineEdit({
  label,
  icon: Icon,
  extraIconClassName,
  value,
  suffix,
  onCommit,
  displayValue,
  min = 0,
  className,
  disabled = false,
  onAccentSurface = false,
  selectOptions,
  boundedInput,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  const opts = selectOptions?.map((o) =>
    typeof o === "number" ? { value: o, label: String(o) } : o,
  );
  const useSelect = Boolean(opts && opts.length > 0);
  const useBounded = Boolean(boundedInput) && !useSelect;

  const optionsKey = opts?.map((o) => o.value).join(",") ?? "";
  const boundedKey = boundedInput
    ? `${boundedInput.min}-${boundedInput.max}-${boundedInput.step ?? ""}`
    : "";

  useEffect(() => {
    setEditing(false);
  }, [optionsKey, boundedKey, useSelect, useBounded]);

  const start = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => {
      if (useSelect) {
        selectRef.current?.focus();
      } else {
        inputRef.current?.select();
      }
    }, 0);
  };

  const commitText = () => {
    const n = parseFloat(draft);
    if (!isNaN(n) && n > min) onCommit(n);
    setEditing(false);
  };

  const commitBounded = () => {
    if (!boundedInput) return;
    const n = parseFloat(draft);
    if (isNaN(n)) {
      setEditing(false);
      return;
    }
    const clamped = Math.min(
      boundedInput.max,
      Math.max(boundedInput.min, n),
    );
    onCommit(clamped);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  /** Inherit parent `color` (segment header uses fence/gate border accent). */
  // `group-hover/segrow:` variants mirror the local hover state so hovering
  // anywhere on the parent SegmentRow lights up the edit affordance too.
  const ink = onAccentSurface ? "text-white" : "text-current";
  const inkHover = onAccentSurface
    ? "group-hover/inline:text-white group-hover/segrow:text-white"
    : "opacity-95 group-hover/inline:opacity-100 group-hover/segrow:opacity-100";
  const rowHoverBg = onAccentSurface
    ? "hover:bg-white/15 group-hover/segrow:bg-white/15"
    : "hover:bg-black/5 group-hover/segrow:bg-black/5";
  const pencil = onAccentSurface
    ? "text-white/70 group-hover/inline:text-white group-hover/segrow:text-white"
    : "text-current";

  const labelEl = Icon ? (
    <Icon
      size={12}
      className={cn(
        "shrink-0 mr-0.5",
        ink,
        extraIconClassName,
        className,
      )}
      aria-hidden
    />
  ) : (
    <span className={cn("text-xs font-medium mr-1", ink, className)}>
      {label}
    </span>
  );

  const sharedInputClass = cn(
    "font-mono text-sm tabular-nums rounded-[var(--brand-radius-sm)] border px-1 py-0.5 max-w-[12.5rem] outline-none focus:ring-2",
    onAccentSurface
      ? "border-white/40 bg-white/10 text-white focus:ring-white/35"
      : "border-brand-border bg-brand-card text-brand-text focus:ring-brand-accent/30",
  );

  if (disabled) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 pointer-events-none",
          onAccentSurface ? "text-white/90" : "opacity-60",
          className,
        )}
        aria-label={label}
      >
        {labelEl}
        <span className={cn("font-mono text-sm tabular-nums", className)}>
          {displayValue ?? value}
        </span>
        <span className={cn("text-xs font-mono", className)}>{suffix}</span>
      </span>
    );
  }

  if (editing && useSelect && opts) {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
        aria-label={label}
      >
        {labelEl}
        <select
          ref={selectRef}
          value={String(
            opts.some((o) => o.value === value) ? value : opts[0].value,
          )}
          onChange={(e) => {
            onCommit(Number(e.target.value));
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className={sharedInputClass}
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className={cn("text-xs font-medium", ink)}>{suffix}</span>
      </span>
    );
  }

  if (editing && useBounded && boundedInput) {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
        aria-label={label}
      >
        {labelEl}
        <input
          ref={inputRef}
          type="number"
          min={boundedInput.min}
          max={boundedInput.max}
          step={boundedInput.step ?? 1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitBounded}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitBounded();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className={cn(sharedInputClass, "w-[5rem]")}
        />
        <span className={cn("text-xs font-medium", ink)}>{suffix}</span>
      </span>
    );
  }

  if (editing) {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
        aria-label={label}
      >
        {labelEl}
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className={cn(
            "w-16 px-1.5 py-0 rounded-[var(--brand-radius-sm)] border text-sm font-mono tabular-nums outline-none focus:ring-2",
            onAccentSurface
              ? "border-white/40 bg-white/10 text-white focus:ring-white/35"
              : "border-brand-border bg-brand-card text-brand-text focus:ring-brand-accent/30",
            className,
          )}
        />
        <span className={cn("text-xs font-medium", ink)}>{suffix}</span>
      </span>
    );
  }

  return (
    <span
      onClick={start}
      title={`Click to edit ${label}`}
      aria-label={label}
      className={cn(
        "group/inline relative inline-flex items-center gap-0.5 cursor-text rounded-[var(--brand-radius-sm)] px-1 -mx-1 transition-colors",
        rowHoverBg,
      )}
    >
      {labelEl}
      <span
        className={cn(
          "font-mono text-sm tabular-nums transition-colors",
          onAccentSurface ? "text-white" : "text-current",
          inkHover,
          className,
        )}
      >
        {displayValue ?? value}
      </span>
      <span
        className={cn(
          "text-xs font-mono transition-colors",
          onAccentSurface ? "text-white" : "text-current",
          inkHover,
          className,
        )}
      >
        {suffix}
      </span>
      <Edit2
        size={9}
        className={cn(
          "opacity-0 group-hover/inline:opacity-70 group-hover/segrow:opacity-70 transition-opacity absolute -top-1.5 -right-2",
          pencil,
          className,
        )}
      />
    </span>
  );
}
