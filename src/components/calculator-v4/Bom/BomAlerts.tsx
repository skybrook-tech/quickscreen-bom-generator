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
            className={`w-full flex items-center gap-2 px-3 py-1 rounded-lg border text-left text-sm transition-colors ${
              errors.length > 0
                ? "bg-brand-danger/10 border-brand-danger/35 text-brand-danger hover:bg-brand-danger/15"
                : "bg-brand-warning/10 border-brand-warning/35 text-brand-warning hover:bg-brand-warning/15 dark:text-brand-warning"
            }`}
          >
            <AlertTriangle
              size={20}
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
              <div className="relative w-full max-w-lg bg-brand-card border border-brand-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[min(80vh,520px)]">
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
                    className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-border/60 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="px-4 py-3 overflow-y-auto space-y-2 flex-1 min-h-0">
                  {errors.map((e, i) => (
                    <div
                      key={`err-${i}`}
                      className="text-[11px] px-2.5 py-1.5 rounded bg-brand-danger/10 border border-brand-danger/30 text-brand-danger"
                    >
                      <span className="font-semibold">Error: </span>
                      {e}
                    </div>
                  ))}
                  {warnings.map((w, i) => (
                    <div
                      key={`warn-${i}`}
                      className="text-[11px] px-2.5 py-1.5 rounded bg-brand-warning/10 border border-brand-warning/30 text-brand-warning dark:text-brand-warning"
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
