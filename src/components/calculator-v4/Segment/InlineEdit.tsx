import { Edit2 } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../../../lib";

interface InlineEditProps {
  value: number;
  suffix: string;
  onCommit: (value: number) => void;
  displayValue?: string;
  min?: number;
  className?: string;
}

export function InlineEdit({
  value,
  suffix,
  onCommit,
  displayValue,
  min = 0,
  className,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const start = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n) && n > min) onCommit(n);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className={cn(
            "w-16 px-1.5 py-0 rounded-lg border border-brand-border bg-brand-card text-sm font-mono tabular-nums text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/30",
            className,
          )}
        />
        <span className="text-xs text-brand-accent font-medium">{suffix}</span>
      </span>
    );
  }

  return (
    <span
      onClick={start}
      title="Click to edit"
      className="group/inline relative inline-flex items-center gap-0.5 cursor-text rounded-lg px-1 -mx-1 hover:bg-brand-accent/10 transition-colors"
    >
      <span
        className={cn(
          "font-mono text-sm tabular-nums group-hover/inline:text-brand-accent transition-colors",
          className,
        )}
      >
        {displayValue ?? value}
      </span>
      <span
        className={cn(
          "text-xs font-mono group-hover/inline:text-brand-accent transition-colors",
          className,
        )}
      >
        {suffix}
      </span>
      <Edit2
        size={9}
        className={cn(
          "opacity-0 group-hover/inline:opacity-60 text-brand-accent transition-opacity absolute -top-1.5 -right-2",
          className,
        )}
      />
    </span>
  );
}
