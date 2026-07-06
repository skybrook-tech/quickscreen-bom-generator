import { type FormEvent } from "react";
import { Printer, X } from "lucide-react";
import { SaveJobDialog } from "./SaveJobDialog";
import { ClearJobConfirmDialog } from "./ClearJobConfirmDialog";
import { GatePositionModal } from "../calculator/GatePositionModal";
import type { PendingParsedGate } from "../../lib/calculatorV3Helpers";

// ─── Print BOM options ────────────────────────────────────────────────────────

interface PrintBomOptionsDialogProps {
  includeMap: boolean;
  onIncludeMapChange: (includeMap: boolean) => void;
  onCancel: () => void;
  onPrint: () => void;
}

export function PrintBomOptionsDialog({
  includeMap,
  onIncludeMapChange,
  onCancel,
  onPrint,
}: PrintBomOptionsDialogProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPrint();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-bom-options-title"
      onClick={onCancel}
    >
      <form
        className="w-full max-w-sm rounded-2xl border border-brand-border bg-brand-card p-5 text-brand-text shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="print-bom-options-title" className="text-base font-extrabold">
            Print BOM
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-brand-muted transition-colors hover:bg-brand-border/40 hover:text-brand-text"
            aria-label="Close print options"
          >
            <X size={16} />
          </button>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-bg/60 px-3 py-3 text-sm font-bold text-brand-text">
          <input
            type="checkbox"
            checked={includeMap}
            onChange={(event) => onIncludeMapChange(event.target.checked)}
            className="h-4 w-4 accent-brand-primary"
          />
          Include layout map
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted transition-colors hover:text-brand-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-black text-white transition-colors hover:bg-brand-primary/90 hover:shadow-sm"
          >
            <Printer size={16} />
            Print BOM
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

interface ShortcutsDialogProps {
  onClose: () => void;
}

export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-card p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-brand-text">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-brand-muted hover:bg-brand-border/40 hover:text-brand-text"
            aria-label="Close shortcuts"
          >
            <X size={16} />
          </button>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-brand-muted">Export CSV</dt>
            <dd className="rounded-lg bg-brand-bg px-2 py-1 font-mono text-brand-text">
              Ctrl + E
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-brand-muted">Open this panel</dt>
            <dd className="rounded-lg bg-brand-bg px-2 py-1 font-mono text-brand-text">
              ?
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-brand-muted">Canvas undo</dt>
            <dd className="rounded-lg bg-brand-bg px-2 py-1 font-mono text-brand-text">
              Ctrl + Z
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

// ─── Composite dialogs shell ──────────────────────────────────────────────────

interface CalculatorDialogsProps {
  // Save dialog
  saveJobDialogOpen: boolean;
  saveDialogInitialName: string;
  saving: boolean;
  onSaveDialogCancel: () => void;
  onSaveDialogConfirm: (name: string) => Promise<boolean>;

  // Clear dialog
  clearJobDialogOpen: boolean;
  onClearCancel: () => void;
  onClearConfirm: () => void;

  // Print dialog
  printBomDialogOpen: boolean;
  printBomIncludeMap: boolean;
  onPrintBomIncludeMapChange: (value: boolean) => void;
  onPrintBomCancel: () => void;
  onPrintBomConfirm: () => void;

  // Shortcuts
  shortcutsOpen: boolean;
  onShortcutsClose: () => void;

  // Gate position modal
  gatePositionTarget: PendingParsedGate | null;
  gateTargetRunLength: number;
  onGatePositionClose: () => void;
  onGatePositionConfirm: (gate: PendingParsedGate, distanceFromStartMm: number) => void;
}

export function CalculatorDialogs({
  saveJobDialogOpen,
  saveDialogInitialName,
  saving,
  onSaveDialogCancel,
  onSaveDialogConfirm,
  clearJobDialogOpen,
  onClearCancel,
  onClearConfirm,
  printBomDialogOpen,
  printBomIncludeMap,
  onPrintBomIncludeMapChange,
  onPrintBomCancel,
  onPrintBomConfirm,
  shortcutsOpen,
  onShortcutsClose,
  gatePositionTarget,
  gateTargetRunLength,
  onGatePositionClose,
  onGatePositionConfirm,
}: CalculatorDialogsProps) {
  return (
    <>
      {gatePositionTarget && gateTargetRunLength > 0 && (
        <GatePositionModal
          gateLabel={gatePositionTarget.kind.replace("_", " ")}
          runLengthMm={gateTargetRunLength}
          widthMm={gatePositionTarget.widthMm ?? 1000}
          onClose={onGatePositionClose}
          onConfirm={(distance) => onGatePositionConfirm(gatePositionTarget, distance)}
        />
      )}
      {saveJobDialogOpen && (
        <SaveJobDialog
          initialName={saveDialogInitialName}
          saving={saving}
          onCancel={onSaveDialogCancel}
          onSave={onSaveDialogConfirm}
        />
      )}
      {clearJobDialogOpen && (
        <ClearJobConfirmDialog
          onCancel={onClearCancel}
          onClear={onClearConfirm}
        />
      )}
      {printBomDialogOpen && (
        <PrintBomOptionsDialog
          includeMap={printBomIncludeMap}
          onIncludeMapChange={onPrintBomIncludeMapChange}
          onCancel={onPrintBomCancel}
          onPrint={onPrintBomConfirm}
        />
      )}
      {shortcutsOpen && <ShortcutsDialog onClose={onShortcutsClose} />}
    </>
  );
}
