import { useMemo, useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { BomActions } from "./BomActions";
import { BomHeader } from "./BomHeader";
import { BomTable } from "./BomTable";
import { BomTabs } from "./BomTabs";
import { BomTotals } from "./BomTotals";
import { ExtraItemsPanel } from "./ExtraItemsPanel";
import { SuggestedAccessoriesPanel } from "./SuggestedAccessoriesPanel";
import { useBomViewModel } from "./useBomViewModel";

interface Props {
  isPending: boolean;
  onGenerate: () => void;
  canGenerate: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Right-column BOM panel. Layout (top to bottom):
 *   - BomHeader (gradient — fixed)
 *   - BomActions (Generate / CSV / PDF — fixed)
 *   - BomTabs (All / Run N / Gates — fixed)
 *   - Errors/warnings strip (when present — fixed)
 *   - Scroll area:
 *       - BomTable (grouped by category)
 *       - SuggestedAccessoriesPanel (above the fixed footers)
 *   - ExtraItemsPanel (fixed footer)
 *   - BomTotals (fixed footer)
 */
export function BomPanel({
  isPending,
  onGenerate,
  canGenerate,
  errors,
  warnings,
}: Props) {
  const { state } = useCalculatorV4();
  const view = useBomViewModel();
  const [activeTab, setActiveTab] = useState("all");

  const tabs = useMemo(() => {
    const list = [
      { id: "all", label: "All items", count: view.allLines.length },
    ];
    view.runResults.forEach((r, i) => {
      list.push({
        id: `run-${r.runId}`,
        label: `Run ${i + 1}`,
        count: r.items.length,
      });
    });
    if (view.gateItems.length > 0) {
      list.push({
        id: "gates",
        label: "Gates",
        count: view.gateItems.length,
      });
    }
    return list;
  }, [view.allLines.length, view.runResults, view.gateItems.length]);

  const visibleLines = useMemo(() => {
    if (activeTab === "all") return view.allLines;
    if (activeTab === "gates") return view.gateItems;
    if (activeTab.startsWith("run-")) {
      const runId = activeTab.slice(4);
      const run = view.runResults.find((r) => r.runId === runId);
      return run?.items ?? [];
    }
    return view.allLines;
  }, [activeTab, view]);

  return (
    <div className="rounded-xl border border-brand-border bg-brand-bg overflow-hidden flex flex-col h-full">
      <BomHeader
        pricingTier={view.pricingTier}
        grandTotal={view.grandTotal}
        isPending={isPending}
      />

      <BomActions
        view={view}
        isPending={isPending}
        onGenerate={onGenerate}
        canGenerate={canGenerate}
      />

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="px-4 py-2 border-b border-brand-border space-y-1 flex-shrink-0">
          {errors.map((e, i) => (
            <div
              key={`err-${i}`}
              className="text-[11px] px-2.5 py-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-500"
            >
              Error: {e}
            </div>
          ))}
          {warnings.map((w, i) => (
            <div
              key={`warn-${i}`}
              className="text-[11px] px-2.5 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400"
            >
              {w}
            </div>
          ))}
        </div>
      )}

      {state.bomResult && (
        <BomTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
      )}

      {/* Scrollable middle: table + suggestions */}
      <div className="flex-1 overflow-y-auto">
        <BomTable lines={visibleLines} />
        <SuggestedAccessoriesPanel />
      </div>

      {/* Fixed footers */}
      <ExtraItemsPanel />
      <BomTotals
        total={view.total}
        gst={view.gst}
        grandTotal={view.grandTotal}
      />
    </div>
  );
}
