import { Loader2, Save } from "lucide-react";
import { RunListV3 } from "./RunListV3";
import { JobNameEditor } from "../calculator/JobNameEditor";
import { PropertyAnchorFormGate, PropertyMap } from "../calculator/PropertyMap";
import { gateTypeLabel, type GateConstraintType } from "../../lib/gateConstraints";
import { runLengthMm } from "../../lib/calculatorV3Helpers";
import { useCalculator } from "../../context/CalculatorContext";
import { useCalculatorJob } from "../../context/CalculatorJobContext";
import { useCalculatorBomState } from "../../context/CalculatorBomStateContext";
import { useCalculatorLayoutContext } from "../../context/CalculatorLayoutContext";

export function CalculatorJobPane() {
  const { state } = useCalculator();
  const payload = state.payload;
  const {
    jobName,
    onJobNameChange,
    autoOpenFirstSectionRunId,
    onAutoOpenConsumed,
    hasLegacyConfiguredPayload,
    propertyAnchorConfirmed,
    onAnchorConfirmed,
    onDescribeApply,
    onGatePositionRequest,
    saving,
    saveJobLabel,
    onSaveJob,
  } = useCalculatorJob();
  const {
    errors,
    warnings,
    economySlatErrors,
    gateWidthErrors,
    gateWidthWarnings,
    isCalcError,
    calcError,
  } = useCalculatorBomState();
  const { keyboardOffset, mobileLayout } = useCalculatorLayoutContext();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-5">
        <section className="-mx-3 border-b border-brand-border/70 bg-brand-card/95 px-3 pb-3 pt-3 shadow-sm sm:-mx-5 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <JobNameEditor
                value={jobName}
                onChange={onJobNameChange}
                inputClassName="mb-1"
                textClassName="mb-1"
              />
            </div>
          </div>
        </section>

        {payload && (
          <>
            {!hasLegacyConfiguredPayload ? (
              <PropertyMap
                initialAnchor={payload.propertyAnchor ?? null}
                initialSnapshot={payload.snapshot ?? null}
                onAnchorConfirmed={onAnchorConfirmed}
              />
            ) : null}
            <PropertyAnchorFormGate anchorConfirmed={propertyAnchorConfirmed}>
              <section>
                <RunListV3
                  autoOpenFirstRunId={autoOpenFirstSectionRunId}
                  onAutoOpenConsumed={onAutoOpenConsumed}
                  initialDescription={payload?.job?.description ?? ""}
                  onDescribeApply={onDescribeApply}
                />
              </section>

              {payload.job?.pendingGates?.length ? (
                <section className="space-y-2 rounded-2xl border border-brand-warning/35 bg-brand-warning/10 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-brand-warning">
                    Parsed gates need positions
                  </p>
                  {payload.job.pendingGates.map((gate, index) => {
                    const run = payload.runs.find((item) => item.runId === gate.runId);
                    const length = run ? runLengthMm(run) : 0;
                    return (
                      <button
                        key={gate.id}
                        type="button"
                        onClick={() => onGatePositionRequest(gate)}
                        disabled={length <= 0}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-brand-warning/40 bg-brand-card px-3 py-2 text-left text-xs font-bold text-brand-warning transition-colors hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
                        title={
                          length <= 0
                            ? "Add a run length before positioning this gate."
                            : "Position this parsed gate in the run"
                        }
                      >
                        <span>Position not set - drag in run</span>
                        <span>
                          Gate {index + 1}: {gate.kind.replace("_", " ")}
                          {gate.widthMm ? `, ${gate.widthMm}mm` : ""}
                        </span>
                      </button>
                    );
                  })}
                </section>
              ) : null}

              {(errors.length > 0 || warnings.length > 0) && (
                <div className="space-y-2">
                  {errors.map((e, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-brand-danger/30 bg-brand-danger/10 px-4 py-2 text-sm text-brand-danger"
                    >
                      Error: {e}
                    </div>
                  ))}
                  {warnings.map((w, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-brand-warning/30 bg-brand-warning/10 px-4 py-2 text-sm text-brand-warning"
                    >
                      Warning: {w}
                    </div>
                  ))}
                </div>
              )}

              {economySlatErrors.length > 0 && (
                <div className="space-y-2">
                  {economySlatErrors.map((message) => (
                    <div
                      key={message}
                      className="rounded-lg border border-brand-danger/30 bg-brand-danger/10 px-4 py-2 text-sm font-bold text-brand-danger"
                    >
                      {message}
                    </div>
                  ))}
                </div>
              )}

              {(gateWidthErrors.length > 0 || gateWidthWarnings.length > 0) && (
                <div className="space-y-2">
                  {gateWidthErrors.map((item) => (
                    <div
                      key={`${item.runId}-${item.segmentId}`}
                      className="rounded-lg border border-brand-danger/30 bg-brand-danger/10 px-4 py-2 text-sm font-bold text-brand-danger"
                    >
                      {item.message}
                    </div>
                  ))}
                  {gateWidthWarnings.map((item) => (
                    <div
                      key={`${item.runId}-${item.segmentId}`}
                      className="rounded-lg border border-brand-warning/30 bg-brand-warning/10 px-4 py-2 text-sm font-bold text-brand-warning"
                    >
                      {item.message ??
                        `Gate width is over the ${gateTypeLabel((item.gateType ?? "pedestrian-horizontal") as GateConstraintType)} maximum.`}
                    </div>
                  ))}
                </div>
              )}

              {isCalcError && (
                <div className="rounded-lg border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
                  Error:{" "}
                  {calcError instanceof Error
                    ? calcError.message
                    : String(calcError)}
                </div>
              )}
            </PropertyAnchorFormGate>
          </>
        )}
      </div>

      <div
        className="sticky z-30 hidden border-t border-brand-border bg-brand-card p-3 pb-[calc(var(--safe-bottom)+1rem)] shadow-2xl sm:p-5 md:block md:pb-5"
        style={{
          bottom: mobileLayout
            ? `calc(56px + var(--safe-bottom) + ${keyboardOffset}px)`
            : 0,
        }}
        data-testid="mobile-job-action-bar"
      >
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={onSaveJob}
            disabled={!payload || saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary/90 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saveJobLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
