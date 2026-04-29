import { Edit2 } from "lucide-react";
import { useRef, useState } from "react";

interface InlineEditProps {
  value: number;
  suffix: string;
  onCommit: (value: number) => void;
  displayValue?: string;
  min?: number;
}

export function InlineEdit({
  value,
  suffix,
  onCommit,
  displayValue,
  min = 0,
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
          className="w-16 px-1.5 py-0 rounded-lg border border-brand-accent bg-neutral-900 text-sm font-mono tabular-nums text-brand-accent outline-none focus:ring-2 focus:ring-brand-accent/30"
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
      <span className="font-mono text-sm tabular-nums group-hover/inline:text-brand-accent transition-colors">
        {displayValue ?? value}
      </span>
      <span className="text-xs font-mono group-hover/inline:text-brand-accent transition-colors">
        {suffix}
      </span>
      <Edit2
        size={9}
        className="opacity-0 group-hover/inline:opacity-60 text-brand-accent transition-opacity absolute -top-1.5 -right-2"
      />
    </span>
  );
}
