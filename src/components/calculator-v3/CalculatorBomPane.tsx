// Loader2 removed — loading state handled inline
import { BOMResultTabs } from "../shared/BOMResultTabs";
import { ExtraItemsPanel } from "./ExtraItemsPanel";
import { SuggestedAccessoriesPanel } from "./SuggestedAccessoriesPanel";
import { MobileBomTotals } from "../shared/MobileBomTotals";
import { GlassOutletLogo } from "../brand/GlassOutletLogo";
import { JobNameEditor } from "../calculator/JobNameEditor";
import { formatMoney, lineKey } from "../../lib/calculatorV3Helpers";
import { useCalculatorBomState } from "../../context/CalculatorBomStateContext";
import { useCalculatorJob } from "../../context/CalculatorJobContext";
import { Loader2 } from "lucide-react";

export function CalculatorBomPane() {
  const {
    bomResultForTabs,
    bomRunDetails,
    isCalculating,
    hasBlockingErrors,
    activeBomSummary,
    animatedGrandTotal,
    mobileBomTotals,
    extraItems,
    setExtraItems,
    setLineEdits,
    suggestedAccessories,
    handleSwitchEconomyToStandard: onSwitchEconomyToStandard,
    handleActiveBomSummaryChange: onActiveSummaryChange,
  } = useCalculatorBomState();
  const { jobName, onJobNameChange } = useCalculatorJob();

  return (
    <section
      data-print-bom-section
      className="rounded-2xl border border-brand-border/60 bg-brand-card p-3 sm:p-5"
    >
      <div className="mb-4 flex flex-col gap-4 border-b border-brand-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <GlassOutletLogo
              className="text-brand-primary"
              iconClassName="h-10 w-12"
              textClassName="text-2xl"
            />
            <div className="h-10 w-px bg-brand-border" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-muted">
              Bill of Materials
            </p>
          </div>
          {jobName.trim() && (
            <JobNameEditor
              value={jobName}
              onChange={onJobNameChange}
              className="mt-2"
              textClassName="px-0 text-4xl font-black leading-tight"
              inputClassName="max-w-xl"
            />
          )}
        </div>
        <div className="text-left sm:text-right" data-print-hide>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">
            {isCalculating ? (
              "Recalculating…"
            ) : (
              activeBomSummary?.label ??
              (bomResultForTabs ? "Auto quantity breaks" : "Estimated total")
            )}
          </p>
          <p className="font-mono text-4xl font-black tabular-nums text-brand-primary sm:text-5xl">
            {`$${formatMoney(animatedGrandTotal)}`}
          </p>
        </div>
      </div>

      {mobileBomTotals && (
        <MobileBomTotals
          subtotal={mobileBomTotals.subtotal}
          gst={mobileBomTotals.gst}
          grandTotal={mobileBomTotals.grandTotal}
        />
      )}

      {isCalculating && !bomResultForTabs ? (
        <div className="flex items-center justify-center min-h-[600px]" aria-label="Generating BOM">
          <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        </div>
      ) : bomResultForTabs && !hasBlockingErrors ? (
        <>
          {bomRunDetails.length > 0 && (
            <div className="mb-5 space-y-3 rounded-2xl border border-brand-border/70 bg-brand-bg/45 p-3 print:hidden">
              {bomRunDetails.map((runDetail) => (
                <section key={runDetail.hero} className="space-y-2">
                  <p className="text-sm font-black print:text-black">
                    {runDetail.hero}
                  </p>
                  <p className="text-xs font-semibold print:text-slate-700">
                    {runDetail.settings}
                  </p>
                  <div className="space-y-1 pl-3 text-xs font-semibold text-brand-muted print:text-slate-700">
                    {runDetail.sections.map((section) => (
                      <div key={section.label}>
                        <p className="font-bold text-brand-text print:text-black">
                          {section.label}
                        </p>
                        <p>{section.panelLine}</p>
                        {section.overrides.length > 0 && (
                          <p>overrides: {section.overrides.join(", ")}</p>
                        )}
                        {section.gates.map((gate) => (
                          <p
                            key={gate}
                            className="pl-3 text-brand-warning print:text-slate-700"
                          >
                            {gate}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <BOMResultTabs
            result={bomResultForTabs}
            editable
            onQuantityChange={(item, quantity) =>
              setLineEdits((prev) => ({
                ...prev,
                [lineKey(item)]: quantity <= 0 ? null : quantity,
              }))
            }
            onRemoveLine={(item) =>
              setLineEdits((prev) => ({
                ...prev,
                [lineKey(item)]: null,
              }))
            }
            onSwitchEconomyToStandard={onSwitchEconomyToStandard}
            onActiveSummaryChange={onActiveSummaryChange}
          />

          <div data-print-hide>
            <ExtraItemsPanel
              items={extraItems}
              onAdd={(item) => setExtraItems((prev) => [...prev, item])}
              onRemove={(id) =>
                setExtraItems((prev) => prev.filter((i) => i.id !== id))
              }
            />
          </div>

          <div data-print-hide>
            <SuggestedAccessoriesPanel
              suggestions={suggestedAccessories}
              addedItems={extraItems}
              onAdd={(item) =>
                setExtraItems((prev) =>
                  prev.some(
                    (existing) =>
                      (existing.sku ?? existing.id) === (item.sku ?? item.id),
                  )
                    ? prev
                    : [...prev, item],
                )
              }
              onRemove={(id) =>
                setExtraItems((prev) => prev.filter((item) => item.id !== id))
              }
            />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-brand-border bg-brand-bg/60 px-5 py-12 text-center">
          <p className="mx-auto max-w-xl text-base font-black italic text-brand-muted sm:text-lg">
            Choose fence type on left or click the map button above to draw
            your fence in plan view
          </p>
        </div>
      )}
    </section>
  );
}
