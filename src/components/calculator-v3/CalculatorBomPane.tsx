import { useEffect, useState } from "react";
import { BOMResultTabs } from "../shared/BOMResultTabs";
import { ExtraItemsPanel } from "./ExtraItemsPanel";
import { SuggestedAccessoriesPanel } from "./SuggestedAccessoriesPanel";
import { MobileBomTotals } from "../shared/MobileBomTotals";
import { BrandLogo } from "../brand/BrandLogo";
import { JobNameEditor } from "../calculator/JobNameEditor";
import { formatMoney, lineKey } from "../../lib/calculatorV3Helpers";
import { useCalculatorBomState } from "../../context/CalculatorBomStateContext";
import { useCalculatorJob } from "../../context/CalculatorJobContext";
import { Loader2 } from "lucide-react";

const RECALC_MESSAGES = [
  "Counting posts…",
  "Cutting slats to length…",
  "Tallying screws & brackets…",
  "Pricing components…",
] as const;

const SHIMMER =
  "bg-gradient-to-r from-brand-border/25 via-brand-border/60 to-brand-border/25 bg-[length:200%_100%] animate-shimmer motion-reduce:animate-pulse";

const SKELETON_DESC_WIDTHS = [
  "w-3/4",
  "w-1/2",
  "w-2/3",
  "w-5/6",
  "w-2/5",
  "w-3/5",
  "w-4/5",
  "w-1/2",
];

/** Floating status pill that cycles through fence-flavoured progress messages. */
function RecalculatingPill() {
  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setMessageIndex((prev) => (prev + 1) % RECALC_MESSAGES.length),
      1600,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-10 z-10 flex justify-center"
      role="status"
    >
      <div className="flex animate-fade-in-up items-center gap-2.5 rounded-full border border-brand-border bg-brand-card/95 px-4 py-2 shadow-lg shadow-black/10 backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin text-brand-primary motion-reduce:animate-none" />
        <span
          key={messageIndex}
          className="min-w-[11rem] animate-fade-in text-xs font-bold text-brand-text"
        >
          {RECALC_MESSAGES[messageIndex]}
        </span>
      </div>
    </div>
  );
}

/** Ghost BOM table shown while the very first calculation is in flight. */
function BomSkeleton() {
  return (
    <div className="min-h-[600px] space-y-5 pt-1" aria-hidden="true">
      <div className="flex gap-2">
        {["w-28", "w-24", "w-20"].map((width, i) => (
          <div
            key={width}
            className={`h-8 rounded-full ${width} ${SHIMMER}`}
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-brand-border/60">
        <div className="flex items-center gap-4 border-b border-brand-border/60 bg-brand-bg/50 px-4 py-3">
          <div className={`h-3 w-16 shrink-0 rounded-md ${SHIMMER}`} />
          <div className="flex-1">
            <div className={`h-3 w-32 rounded-md ${SHIMMER}`} />
          </div>
          <div className={`h-3 w-8 shrink-0 rounded-md ${SHIMMER}`} />
          <div className={`h-3 w-14 shrink-0 rounded-md ${SHIMMER}`} />
        </div>
        {SKELETON_DESC_WIDTHS.map((width, i) => (
          <div
            key={`${width}-${i}`}
            className="flex items-center gap-4 border-b border-brand-border/40 px-4 py-3.5 last:border-b-0"
          >
            <div
              className={`h-3.5 w-20 shrink-0 rounded-md ${SHIMMER}`}
              style={{ animationDelay: `${i * 90}ms` }}
            />
            <div className="flex-1">
              <div
                className={`h-3.5 ${width} rounded-md ${SHIMMER}`}
                style={{ animationDelay: `${i * 90 + 45}ms` }}
              />
            </div>
            <div
              className={`h-3.5 w-8 shrink-0 rounded-md ${SHIMMER}`}
              style={{ animationDelay: `${i * 90 + 90}ms` }}
            />
            <div
              className={`h-3.5 w-14 shrink-0 rounded-md ${SHIMMER}`}
              style={{ animationDelay: `${i * 90 + 135}ms` }}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col items-end gap-2 pr-1">
        <div className={`h-3.5 w-36 rounded-md ${SHIMMER}`} />
        <div className={`h-3.5 w-28 rounded-md ${SHIMMER}`} />
        <div className={`h-6 w-44 rounded-md ${SHIMMER}`} />
      </div>
    </div>
  );
}

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
      <div className="relative mb-4 flex flex-col gap-4 border-b border-brand-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <BrandLogo size="sm" />
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
          <p
            className="text-xs font-bold uppercase tracking-wider text-brand-muted"
            aria-live="polite"
          >
            {isCalculating ? (
              <span className="inline-flex items-center gap-1.5 text-brand-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                Recalculating
              </span>
            ) : (
              activeBomSummary?.label ??
              (bomResultForTabs ? "Auto quantity breaks" : "Estimated total")
            )}
          </p>
          <p
            className={`font-mono text-4xl font-black tabular-nums text-brand-primary transition-opacity duration-300 sm:text-5xl ${
              isCalculating ? "opacity-40" : "opacity-100"
            }`}
          >
            {`$${formatMoney(animatedGrandTotal)}`}
          </p>
        </div>
        {isCalculating && (
          <div
            className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden"
            data-print-hide
            aria-hidden="true"
          >
            <div className="h-full w-1/3 rounded-full bg-brand-primary/80 animate-progress-slide motion-reduce:animate-pulse" />
          </div>
        )}
      </div>

      {mobileBomTotals && (
        <MobileBomTotals
          subtotal={mobileBomTotals.subtotal}
          gst={mobileBomTotals.gst}
          grandTotal={mobileBomTotals.grandTotal}
        />
      )}

      {isCalculating && !bomResultForTabs ? (
        <div className="relative" role="status" aria-label="Generating BOM">
          <RecalculatingPill />
          <BomSkeleton />
        </div>
      ) : bomResultForTabs && !hasBlockingErrors ? (
        <div className="relative" aria-busy={isCalculating}>
          {isCalculating && <RecalculatingPill />}
          <div
            className={`transition-[opacity,filter] duration-300 ${
              isCalculating
                ? "pointer-events-none select-none opacity-50 saturate-[.65]"
                : ""
            }`}
          >
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
                  setExtraItems((prev) =>
                    prev.filter((item) => item.id !== id),
                  )
                }
              />
            </div>
          </div>
        </div>
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
