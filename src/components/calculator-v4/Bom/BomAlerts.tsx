import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

const BomAlerts = ({
  errors,
  warnings,
}: {
  errors: string[];
  warnings: string[];
}) => {
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  return (
    (errors.length > 0 || warnings.length > 0) && (
      <>
        <div className="px-4 py-2 border-brand-border flex-shrink-0">
          <button
            type="button"
            onClick={() => setAlertDialogOpen(true)}
            className={`w-full flex items-center gap-2 px-3 py-1 rounded-[var(--brand-radius-sm)] border text-left text-sm transition-colors ${
              errors.length > 0
                ? "bg-red-500/10 border-red-500/35 text-red-600 hover:bg-red-500/15"
                : "bg-amber-500/10 border-amber-500/35 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
            }`}
          >
            <AlertTriangle
              size={18}
              className="flex-shrink-0 opacity-90"
              aria-hidden
            />
            <span className="font-medium tabular-nums">
              {errors.length > 0 && (
                <>
                  {errors.length} error{errors.length !== 1 ? "s" : ""}
                </>
              )}
              {errors.length > 0 && warnings.length > 0 && (
                <span className="font-normal text-brand-muted mx-1">·</span>
              )}
              {warnings.length > 0 && (
                <>
                  {warnings.length} warning
                  {warnings.length !== 1 ? "s" : ""}
                </>
              )}
            </span>
            <span className="ml-auto text-[11px] font-normal text-brand-muted">
              View details
            </span>
          </button>
        </div>

        {alertDialogOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="bom-alert-dialog-title"
            >
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setAlertDialogOpen(false)}
                aria-hidden
              />
              <div className="relative w-full max-w-lg bg-brand-card border border-brand-border rounded-[var(--brand-radius)] shadow-2xl overflow-hidden flex flex-col max-h-[min(80vh,520px)]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border flex-shrink-0">
                  <h2
                    id="bom-alert-dialog-title"
                    className="text-base font-semibold text-brand-text"
                  >
                    BOM messages
                  </h2>
                  <button
                    type="button"
                    onClick={() => setAlertDialogOpen(false)}
                    aria-label="Close"
                    className="p-1.5 rounded-[var(--brand-radius-sm)] text-brand-muted hover:text-brand-text hover:bg-brand-border/60 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="px-4 py-3 overflow-y-auto space-y-2 flex-1 min-h-0">
                  {errors.map((e, i) => (
                    <div
                      key={`err-${i}`}
                      className="text-[11px] px-2.5 py-1.5 rounded-[var(--brand-radius-sm)] bg-red-500/10 border border-red-500/30 text-red-600"
                    >
                      <span className="font-semibold">Error: </span>
                      {e}
                    </div>
                  ))}
                  {warnings.map((w, i) => (
                    <div
                      key={`warn-${i}`}
                      className="text-[11px] px-2.5 py-1.5 rounded-[var(--brand-radius-sm)] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400"
                    >
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )}
      </>
    )
  );
};

export default BomAlerts;
