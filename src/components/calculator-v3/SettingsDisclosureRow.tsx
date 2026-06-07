import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

const SETTINGS_ROW_OPEN_EVENT = "qsbom:settings-row-open";
const SETTINGS_ROW_AUTO_COLLAPSE_MS = 60000;

interface SettingsDisclosureRowProps {
  id: string;
  label: string;
  value?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function SettingsDisclosureRow({
  id,
  label,
  value,
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
    <div className={`rounded-lg border transition-all duration-[220ms] ${
      open ? "border-[#DD6E1B] bg-white shadow-sm" : "border-[#E9E5DD] bg-white"
    }`}>
      <button
        type="button"
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-semibold text-[#11161D] transition-colors ${
          open ? "bg-[#FCF1E6]/50" : "bg-white hover:bg-[#FCF1E6]/10"
        }`}
      >
        <span className="truncate">
          <span className="font-semibold text-[#11161D]">{label}</span>
          {!open && value && (
            <span className="text-[#6E7681] font-normal">
              {" · "}{value}
            </span>
          )}
        </span>
        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${open ? "text-[#DD6E1B]" : "text-[#6E7681]"}`} aria-hidden>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
          <div className="space-y-4 border-t border-[#E9E5DD] p-4 bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
