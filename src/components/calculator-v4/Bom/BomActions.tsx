import { Loader2, Sparkles } from "lucide-react";
import { BOMExportActions } from "../../quote/BOMExportActions";
import type { BomViewModel } from "./useBomViewModel";
import { bomViewModelToCalculatorResult } from "./bomExportMapper";
import BomAlerts from "./BomAlerts";
import type { QuoteDetails } from "../../../context/CalculatorContextV4";

interface Props {
  view: BomViewModel;
  /** Used as PDF/CSV filename slug when non-empty. */
  jobName?: string;
  quoteDetails?: QuoteDetails;
  isPending: boolean;
  onGenerate: () => void;
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
  quoteDetails,
  isPending,
  onGenerate,
  canGenerate,
  errors,
  warnings,
}: Props) {
  const exportResult = view.hasResult
    ? bomViewModelToCalculatorResult(view)
    : null;

  return (
    <div className="px-4 py-1 border-b border-brand-border bg-brand-card flex items-center gap-2 flex-shrink-0">
      <button
        onClick={onGenerate}
        disabled={!canGenerate || isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--brand-radius-sm)] bg-brand-accent text-white text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-generate-bom"
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Sparkles size={13} />
        )}
        {isPending ? "Calculating…" : "Generate BOM"}
      </button>
      <BomAlerts errors={errors} warnings={warnings} />
      <div className="flex-1" />
      {exportResult ? (
        <BOMExportActions
          result={exportResult}
          removedSkus={new Set()}
          qtyOverrides={new Map()}
          customerRef={quoteDetails?.customer?.trim() || jobName?.trim() || undefined}
          customerEmail={quoteDetails?.email || undefined}
          siteAddress={quoteDetails?.siteAddress || undefined}
          validUntil={quoteDetails?.validUntil || undefined}
        />
      ) : null}
    </div>
  );
}
