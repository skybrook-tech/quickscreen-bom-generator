interface ClearJobConfirmDialogProps {
  onCancel: () => void;
  onClear: () => void;
}

export function ClearJobConfirmDialog({
  onCancel,
  onClear,
}: ClearJobConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Clear job confirmation"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-card p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-black text-brand-text">
          Are you sure?
        </h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-brand-muted">
          This will delete all runs, sections, and the current address. This cannot be undone.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-brand-border px-3 py-2 text-sm font-black text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-brand-danger/40 px-3 py-2 text-sm font-black text-brand-danger transition-colors hover:bg-brand-danger/10"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
