import { X } from "lucide-react";
import { useEffect } from "react";

interface SlideOutPaneProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Tailwind width class for the pane on desktop. Default 640px. */
  widthClass?: string;
}

/**
 * Right-side slide-out overlay used by LayoutMapPane and GatePane.
 * - Backdrop blur, click-to-close.
 * - Locks body scroll while open.
 * - Full-width on mobile, fixed-width on desktop.
 */
export function SlideOutPane({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClass = "md:w-[640px]",
}: SlideOutPaneProps) {
  // Lock body scroll while pane is open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/10 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed top-0 right-0 z-50 h-screen w-full ${widthClass} bg-brand-card border-l border-brand-border shadow-2xl flex flex-col transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-brand-border flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-brand-text truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-brand-muted mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="flex-shrink-0 p-1.5 rounded-md text-brand-muted hover:text-brand-text hover:bg-brand-border/40 transition-colors"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}
