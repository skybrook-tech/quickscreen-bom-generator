import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { BOMExportActions } from "../../quote/BOMExportActions";
import type { BomViewModel } from "./useBomViewModel";
import { bomViewModelToCalculatorResult } from "./bomExportMapper";
import BomAlerts from "./BomAlerts";
import { ConfirmDialog } from "../../ui/ConfirmDialog";

interface Props {
  view: BomViewModel;
  /** Used as PDF/CSV filename slug when non-empty. */
  jobName?: string;
  isPending: boolean;
  onGenerate: () => void;
  onClearBom: () => void;
  canGenerate: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Generate / Export row above the BOM table. CSV/PDF/Copy reuse v3 BOMExportActions.
 */
export function BomActions({
  view,
  jobName,
  isPending,
  onGenerate,
  onClearBom,
  canGenerate,
  errors,
  warnings,
}: Props) {
  const exportResult = view.hasResult
    ? bomViewModelToCalculatorResult(view)
    : null;
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  return (
    <div className="px-4 py-1 border-b border-brand-border bg-brand-card flex items-center gap-2 flex-shrink-0">
      {view.hasResult ? (
        <span
          className="text-[10px] text-brand-muted capitalize shrink-0"
          title="Pricing tier"
        >
          {view.pricingTier.replace("tier", "T")}
        </span>
      ) : null}
      <button
        onClick={onGenerate}
        disabled={!canGenerate || isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-accent text-white text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-generate-bom"
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Sparkles size={13} />
        )}
        {isPending ? "Calculating…" : "Generate BOM"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmClearOpen(true)}
        disabled={!view.hasResult || isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand-border text-brand-danger text-xs font-medium hover:bg-brand-danger/10 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-clear-bom"
      >
        <Trash2 size={13} />
        Clear BOM
      </button>
      <BomAlerts errors={errors} warnings={warnings} />
      <div className="flex-1" />
      {exportResult ? (
        <BOMExportActions
          result={exportResult}
          removedSkus={new Set()}
          qtyOverrides={new Map()}
          customerRef={jobName?.trim() || undefined}
        />
      ) : null}
      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear generated BOM?"
        description="This will remove generated BOM lines, suggested accessories, manual extra items, hidden-line choices, and quantity edits. Runs and segments will stay unchanged."
        confirmLabel="Clear BOM"
        onConfirm={() => {
          onClearBom();
          setConfirmClearOpen(false);
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
