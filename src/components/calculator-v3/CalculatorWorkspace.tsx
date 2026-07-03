import { LayoutCanvasV3 } from "./LayoutCanvasV3";
import { MobileCalculatorTabs } from "./MobileCalculatorTabs";
import { CalculatorJobPane } from "./CalculatorJobPane";
import { CalculatorBomPane } from "./CalculatorBomPane";
import { calculatorPaneVisibility, type MobileCalculatorTab } from "../../lib/mobileShell";
import type { RightPaneView } from "./RightPaneTabs";
import type { CanonicalPayload } from "../../types/canonical.types";
import type { CalculatorBOMResult, ExtraItem, BOMLineItem, SuggestedAccessory } from "../../types/bom.types";
import type { ActiveBomSummary, GateWidthValidation } from "../../hooks/useCalculatorBom";
import type { BomRunDetail, PendingParsedGate } from "../../lib/calculatorV3Helpers";
import type { ParseResult } from "../../lib/describeFenceParser";

interface CalculatorWorkspaceProps {
  payload: CanonicalPayload | null;
  jobName: string;
  onJobNameChange: (name: string) => void;
  autoOpenFirstSectionRunId: string | null;
  onAutoOpenConsumed: () => void;
  hasLegacyConfiguredPayload: boolean;
  propertyAnchorConfirmed: boolean;
  onAnchorConfirmed: (anchor: {
    anchorLat: number;
    anchorLng: number;
    formattedAddress: string;
    snapshot: NonNullable<CanonicalPayload["snapshot"]>;
  }) => void;
  onDescribeApply: (result: ParseResult) => void;
  onGatePositionRequest: (gate: PendingParsedGate) => void;
  errors: string[];
  warnings: string[];
  economySlatErrors: string[];
  gateWidthErrors: GateWidthValidation[];
  gateWidthWarnings: GateWidthValidation[];
  isCalcError: boolean;
  calcError: Error | null;
  saving: boolean;
  saveJobLabel: string;
  onSaveJob: () => void;
  keyboardOffset: number;
  mobileLayout: boolean;
  runPaneWidth: number;
  onResizeStart: () => void;
  rightPaneView: RightPaneView;
  mapExpanded: boolean;
  onMapExpandedChange: (v: boolean) => void;
  mobileTab: MobileCalculatorTab;
  onMobileTabChange: (tab: MobileCalculatorTab) => void;
  onSaveDialogOpen: () => void;
  bomResultForTabs: CalculatorBOMResult | null;
  bomRunDetails: BomRunDetail[];
  isCalculating: boolean;
  hasBlockingErrors: boolean;
  activeBomSummary: ActiveBomSummary | null;
  animatedGrandTotal: number;
  mobileBomTotals: { subtotal: number; gst: number; grandTotal: number } | null;
  extraItems: ExtraItem[];
  setExtraItems: React.Dispatch<React.SetStateAction<ExtraItem[]>>;
  setLineEdits: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
  suggestedAccessories: SuggestedAccessory[];
  onSwitchEconomyToStandard: (item: BOMLineItem) => void;
  onActiveSummaryChange: (summary: ActiveBomSummary) => void;
  onMapSnapshotChange: (snapshot: NonNullable<CanonicalPayload["snapshot"]>) => void;
}

export function CalculatorWorkspace({
  payload,
  jobName,
  onJobNameChange,
  autoOpenFirstSectionRunId,
  onAutoOpenConsumed,
  hasLegacyConfiguredPayload,
  propertyAnchorConfirmed,
  onAnchorConfirmed,
  onDescribeApply,
  onGatePositionRequest,
  errors,
  warnings,
  economySlatErrors,
  gateWidthErrors,
  gateWidthWarnings,
  isCalcError,
  calcError,
  saving,
  saveJobLabel,
  onSaveJob,
  keyboardOffset,
  mobileLayout,
  runPaneWidth,
  onResizeStart,
  rightPaneView,
  mapExpanded,
  onMapExpandedChange,
  mobileTab,
  onMobileTabChange,
  onSaveDialogOpen,
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
  onSwitchEconomyToStandard,
  onActiveSummaryChange,
  onMapSnapshotChange,
}: CalculatorWorkspaceProps) {
  const paneVisibility = calculatorPaneVisibility(mobileLayout, mobileTab);

  return (
    <>
      <div
        className={`${mapExpanded ? "fixed inset-0 z-50" : "relative"} flex h-full min-h-0 flex-col overflow-hidden bg-brand-bg md:flex-row`}
      >
        <aside
          className={`relative w-full overflow-hidden border-b border-brand-border bg-brand-card md:min-h-0 md:max-h-none md:shrink-0 md:border-b-0 md:border-r ${mapExpanded || !paneVisibility.job ? "hidden" : "flex"
            } ${mobileLayout
              ? "h-full min-h-0 max-h-none"
              : bomResultForTabs
                ? "max-h-[32vh]"
                : "min-h-[46vh]"
            }`}
          style={mobileLayout ? undefined : { width: runPaneWidth }}
        >
          <CalculatorJobPane
            payload={payload}
            jobName={jobName}
            onJobNameChange={onJobNameChange}
            autoOpenFirstSectionRunId={autoOpenFirstSectionRunId}
            onAutoOpenConsumed={onAutoOpenConsumed}
            hasLegacyConfiguredPayload={hasLegacyConfiguredPayload}
            propertyAnchorConfirmed={propertyAnchorConfirmed}
            onAnchorConfirmed={onAnchorConfirmed}
            onDescribeApply={onDescribeApply}
            onGatePositionRequest={onGatePositionRequest}
            errors={errors}
            warnings={warnings}
            economySlatErrors={economySlatErrors}
            gateWidthErrors={gateWidthErrors}
            gateWidthWarnings={gateWidthWarnings}
            isCalcError={isCalcError}
            calcError={calcError}
            saving={saving}
            saveJobLabel={saveJobLabel}
            onSaveJob={onSaveJob}
            keyboardOffset={keyboardOffset}
            mobileLayout={mobileLayout}
          />
        </aside>

        <button
          type="button"
          aria-label="Resize panels"
          onMouseDown={onResizeStart}
          className="hidden w-1.5 shrink-0 cursor-col-resize bg-brand-border/60 transition-colors hover:bg-brand-primary/40 md:block"
        />

        <main
          data-print-bom-main
          className={`min-h-0 min-w-0 flex-1 overflow-y-auto ${mapExpanded
              ? "p-0"
              : "p-3 pb-[calc(var(--safe-bottom)+6rem)] sm:p-5 lg:p-8"
            } ${mobileLayout && paneVisibility.job ? "hidden" : ""}`}
        >
          <div
            data-print-right-pane
            className={`${mapExpanded ? "mx-0 max-w-none" : "w-full"}`}
          >
            <section
              data-print-map-section
              className={`${mobileLayout
                  ? paneVisibility.map
                    ? "block"
                    : "hidden"
                  : rightPaneView === "map"
                    ? "block"
                    : "hidden"
                } overflow-hidden border border-brand-border/60 bg-brand-card ${mapExpanded ? "rounded-xl" : "rounded-2xl"
                }`}
            >
              <div className={`${mapExpanded ? "p-2" : "p-3 sm:p-4"}`}>
                <div data-print-map-panel className="block">
                  {payload ? (
                    <LayoutCanvasV3
                      mapExpanded={mapExpanded}
                      onMapExpandedChange={onMapExpandedChange}
                      showRunDetails={!mapExpanded}
                      propertyAnchor={payload.propertyAnchor ?? null}
                      mapSnapshot={payload.snapshot ?? null}
                      onMapSnapshotChange={onMapSnapshotChange}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-brand-border bg-brand-bg/50 p-6 text-center text-sm font-bold text-brand-muted">
                      Start from the sidebar, then draw the layout here.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div
              className={`${mobileLayout
                  ? paneVisibility.bom && !mapExpanded
                    ? "block"
                    : "hidden"
                  : rightPaneView === "bom" && !mapExpanded
                    ? "block"
                    : "hidden"
                }`}
            >
              <CalculatorBomPane
                bomResultForTabs={bomResultForTabs}
                bomRunDetails={bomRunDetails}
                isCalculating={isCalculating}
                hasBlockingErrors={hasBlockingErrors}
                activeBomSummary={activeBomSummary}
                animatedGrandTotal={animatedGrandTotal}
                mobileBomTotals={mobileBomTotals}
                jobName={jobName}
                onJobNameChange={onJobNameChange}
                extraItems={extraItems}
                setExtraItems={setExtraItems}
                setLineEdits={setLineEdits}
                suggestedAccessories={suggestedAccessories}
                onSwitchEconomyToStandard={onSwitchEconomyToStandard}
                onActiveSummaryChange={onActiveSummaryChange}
              />
            </div>
          </div>
        </main>
      </div>

      {mobileLayout && !mapExpanded && (
        <MobileCalculatorTabs
          activeTab={mobileTab}
          onChange={onMobileTabChange}
          onSave={onSaveDialogOpen}
          saveDisabled={!payload || saving}
        />
      )}
    </>
  );
}
