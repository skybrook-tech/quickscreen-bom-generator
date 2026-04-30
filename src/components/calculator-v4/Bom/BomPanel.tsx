import { useCallback, useMemo, useRef, useState } from "react";
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
 *   - Errors/warnings alert (when present — opens dialog — fixed)
 *   - Scroll area: BomTable (grouped by category)
 *   - SuggestedAccessoriesPanel (fixed footer — scroll BOM table on Add)
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
  const bomTableScrollRef = useRef<HTMLDivElement>(null);

  const scrollBomTableToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = bomTableScrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    });
  }, []);

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
    <div className="rounded-xl border border-brand-border bg-brand-card overflow-hidden flex flex-col h-full shadow-sm">
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
        errors={errors}
        warnings={warnings}
      />

      {state.bomResult && (
        <BomTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
      )}

      {/* Scrollable middle: table */}
      <div ref={bomTableScrollRef} className="flex-1 overflow-y-auto min-h-0">
        <BomTable lines={visibleLines} />
      </div>

      {/* Fixed footers */}
      <SuggestedAccessoriesPanel onAddedSuggestion={scrollBomTableToBottom} />
      <ExtraItemsPanel />
      <BomTotals
        total={view.total}
        gst={view.gst}
        grandTotal={view.grandTotal}
      />
    </div>
  );
}
