import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "../../lib";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onMouseDown={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-brand-border bg-brand-card p-5 shadow-md"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 rounded-lg p-2",
              tone === "danger"
                ? "bg-brand-danger/10 text-brand-danger"
                : "bg-brand-warning/10 text-brand-warning",
            )}
          >
            <AlertTriangle size={20} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-brand-text"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm leading-5 text-brand-muted">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-brand-muted hover:bg-brand-border/40 hover:text-brand-text"
            aria-label="Close confirmation dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-brand-border px-3 py-2 text-sm font-medium text-brand-text hover:bg-brand-border/30"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90",
              tone === "danger" ? "bg-brand-danger" : "bg-brand-warning",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
