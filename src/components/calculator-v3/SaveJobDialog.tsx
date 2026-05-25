import { Loader2, X } from "lucide-react";
import { useState, type FormEvent } from "react";

interface SaveJobDialogProps {
  initialName: string;
  saving?: boolean;
  onCancel: () => void;
  onSave: (name: string) => Promise<boolean> | boolean;
}

export function SaveJobDialog({
  initialName,
  saving = false,
  onCancel,
  onSave,
}: SaveJobDialogProps) {
  const [name, setName] = useState(initialName);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(name);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Save Job"
      onClick={saving ? undefined : onCancel}
    >
      <form
        className="w-full max-w-sm rounded-2xl border border-brand-border bg-brand-card p-5 text-brand-text shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Save Job</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg p-1 text-brand-muted transition-colors hover:bg-brand-border/40 hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close save job dialog"
          >
            <X size={16} />
          </button>
        </div>

        <label className="block text-sm font-bold text-brand-muted">
          Job name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-base font-semibold text-brand-text outline-none transition-colors placeholder:text-brand-muted/60 focus:border-brand-primary"
            autoFocus
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted transition-colors hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-black text-white transition-colors hover:bg-brand-primary/90 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
