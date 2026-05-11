import { useEffect, useRef, useState } from "react";

interface JobNameEditorProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  textClassName?: string;
  onCommit?: (value: string) => void;
}

export function JobNameEditor({
  value,
  onChange,
  autoFocus = false,
  className = "",
  inputClassName = "",
  textClassName = "",
  onCommit,
}: JobNameEditorProps) {
  const [editing, setEditing] = useState(() => !value.trim());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const committedName = value.trim();

  useEffect(() => {
    if (!committedName) setEditing(true);
  }, [committedName]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    const length = inputRef.current?.value.length ?? 0;
    inputRef.current?.setSelectionRange(length, length);
  }, [editing]);

  function commit() {
    if (!committedName) return;
    setEditing(false);
    onCommit?.(committedName);
  }

  if (!editing && committedName) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`${className} block max-w-full truncate rounded-lg px-1 text-left text-lg font-semibold text-brand-text hover:text-brand-primary ${textClassName}`}
        title="Click to edit job name"
      >
        {committedName}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          commit();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onChange("");
        }
      }}
      placeholder="Enter Job Name Here"
      className={`${className} w-full rounded-xl border border-brand-border bg-brand-card px-3 py-2 text-lg font-semibold text-brand-text shadow-sm outline-none transition-colors placeholder:text-brand-muted/70 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 ${inputClassName}`}
    />
  );
}
