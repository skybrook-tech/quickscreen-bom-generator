import { LayoutCanvasV3 } from "./LayoutCanvasV3";
import { MobileCalculatorTabs } from "./MobileCalculatorTabs";
import { CalculatorJobPane } from "./CalculatorJobPane";
import { CalculatorBomPane } from "./CalculatorBomPane";
import { calculatorPaneVisibility } from "../../lib/mobileShell";
import { useCalculator } from "../../context/CalculatorContext";
import { useCalculatorLayoutContext } from "../../context/CalculatorLayoutContext";
import { useCalculatorBomState } from "../../context/CalculatorBomStateContext";
import { useCalculatorJob } from "../../context/CalculatorJobContext";

interface CalculatorWorkspaceProps {
  /** Opens the save-job dialog (page-owned dialog state, out of context scope). */
  onSaveDialogOpen: () => void;
}

export function CalculatorWorkspace({ onSaveDialogOpen }: CalculatorWorkspaceProps) {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const {
    mobileLayout,
    mobileTab,
    mapExpanded,
    setMapExpanded,
    runPaneWidth,
    handleResizeStart,
    rightPaneView,
    handleMobileTabChange,
  } = useCalculatorLayoutContext();
  const { bomResultForTabs } = useCalculatorBomState();
  const { saving } = useCalculatorJob();

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
          <CalculatorJobPane />
        </aside>

        <button
          type="button"
          aria-label="Resize panels"
          onMouseDown={handleResizeStart}
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
                      onMapExpandedChange={setMapExpanded}
                      showRunDetails={!mapExpanded}
                      propertyAnchor={payload.propertyAnchor ?? null}
                      mapSnapshot={payload.snapshot ?? null}
                      onMapSnapshotChange={(snapshot) =>
                        dispatch({ type: "SET_MAP_SNAPSHOT", snapshot })
                      }
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
              <CalculatorBomPane />
            </div>
          </div>
        </main>
      </div>

      {mobileLayout && !mapExpanded && (
        <MobileCalculatorTabs
          activeTab={mobileTab}
          onChange={handleMobileTabChange}
          onSave={onSaveDialogOpen}
          saveDisabled={!payload || saving}
        />
      )}
    </>
  );
}
