import { Loader2, Sparkles } from "lucide-react";
import { BOMExportActions } from "../../quote/BOMExportActions";
import type { BomViewModel } from "./useBomViewModel";
import { bomViewModelToCalculatorResult } from "./bomExportMapper";
import BomAlerts from "./BomAlerts";

interface Props {
  view: BomViewModel;
  /** Used as PDF/CSV filename slug when non-empty. */
  jobName?: string;
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-accent text-white text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-generate-bom"
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Sparkles size={16} />
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
          customerRef={jobName?.trim() || undefined}
        />
      ) : null}
    </div>
  );
}
