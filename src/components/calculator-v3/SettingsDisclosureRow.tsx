import { type ReactNode, useEffect, useRef, useState } from "react";

const SETTINGS_ROW_OPEN_EVENT = "qsbom:settings-row-open";
const SETTINGS_ROW_AUTO_COLLAPSE_MS = 60000;

interface SettingsDisclosureRowProps {
  id: string;
  label: string;
  value?: ReactNode;
  placeholder?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function SettingsDisclosureRow({
  id,
  label,
  value,
  placeholder = "Choose",
  children,
  defaultOpen = false,
}: SettingsDisclosureRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const closeOtherRows = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    window.addEventListener(SETTINGS_ROW_OPEN_EVENT, closeOtherRows);
    return () => {
      window.removeEventListener(SETTINGS_ROW_OPEN_EVENT, closeOtherRows);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!open) return;
    timerRef.current = window.setTimeout(() => setOpen(false), SETTINGS_ROW_AUTO_COLLAPSE_MS);
  }, [open]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (next) {
        window.dispatchEvent(new CustomEvent(SETTINGS_ROW_OPEN_EVENT, { detail: id }));
      }
      return next;
    });
  }

  function resetTimer() {
    if (!open) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(false), SETTINGS_ROW_AUTO_COLLAPSE_MS);
  }

  return (
    <div className="rounded-2xl border border-brand-border/60 bg-brand-bg/60 transition-all duration-[220ms]">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-extrabold text-brand-text"
      >
        <span>{label}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-brand-primary">
          {!open && (
            <span className="max-w-[13rem] truncate rounded-full bg-brand-card px-2 py-0.5 font-extrabold text-brand-text">
              {value ?? <span className="font-semibold text-brand-muted">{placeholder}</span>}
            </span>
          )}
          <span className="text-brand-primary">{open ? "hide" : "show"}</span>
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-[220ms] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        onPointerDown={resetTimer}
        onKeyDown={resetTimer}
        onScroll={resetTimer}
        onInput={resetTimer}
        onChange={resetTimer}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-brand-border/50 p-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
