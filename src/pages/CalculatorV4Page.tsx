import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import {
  CalculatorV4Provider,
  useCalculatorV4,
} from "../context/CalculatorContextV4";
import { FenceConfigProvider } from "../context/FenceConfigContext";
import { GateProvider } from "../context/GateContext";
import { JobActions } from "../components/calculator-v4/JobShell/JobActions";
import { JobShell } from "../components/calculator-v4/JobShell/JobShell";
import { RunList } from "../components/calculator-v4/RunCard/RunList";
import { LayoutMapPane } from "../components/calculator-v4/LayoutMap/LayoutMapPane";
import { GatePane } from "../components/calculator-v4/Gate/GatePane";
import { BomPanel } from "../components/calculator-v4/Bom/BomPanel";
import { useBomCalculator } from "../hooks/useBomCalculator";
import { ProductSelectV4 } from "../components/calculator-v4/JobShell/ProductSelectV4";
import { CanonicalPayload } from "../types/canonical.types";

/**
 * v4 calculator. Two-column layout: job/runs on the left, BOM on the right.
 * Layout map and gate forms surface as right-side slide-out panes.
 *
 * Routing: /fence-calculator-v4 (v3 stays at /fence-calculator).
 */
function CalculatorV4Content() {
  const { state, dispatch } = useCalculatorV4();
  const payload = state.payload;
  const bomMutation = useBomCalculator();

  const [layoutOpen, setLayoutOpen] = useState(false);
  const [gateRunId, setGateRunId] = useState<string | null>(null);
  const [gateEditingId, setGateEditingId] = useState<string | null>(null);
  const gateOpen = gateRunId !== null;

  const errors = (state.bomResult?.errors as string[]) ?? [];
  const warnings = (state.bomResult?.warnings as string[]) ?? [];

  async function handleGenerate() {
    if (!payload) return;
    try {
      const result = await bomMutation.mutateAsync({ payload });
      dispatch({ type: "SET_BOM_RESULT", result });
    } catch {
      // mutation error surfaces via bomMutation.error
    }
  }

  function handleProductChange(productCode: string) {
    const runId = crypto.randomUUID();

    const initialPayload: CanonicalPayload = {
      productCode: productCode,
      schemaVersion: "v2",
      // Job-level variables intentionally minimal in v4 — finish_type kept
      // because some product_variables `visible_when_json` rules depend on it.
      // The reducer will populate run-level variables on first edit.
      variables: {
        finish_type: "standard",
        finish_family: "standard",
      },
      runs: [{ runId, productCode, variables: {}, segments: [] }],
    };
    dispatch({
      type: "SET_PAYLOAD",
      payload: initialPayload,
      openRunConfigRunId: runId,
    });
  }

  const noSegments =
    !payload || payload.runs.every((r) => r.segments.length === 0);
  const hasBlockingErrors = errors.length > 0;
  const canGenerate = !!payload && !noSegments && !hasBlockingErrors;

  return (
    <AppShell>
      <div className="h-full grid grid-cols-1 lg:grid-cols-[40%,60%] gap-4 p-4 max-w-[1600px] mx-auto">
        {/* Left column — job + runs (scrolls naturally) */}
        <div className="space-y-4 overflow-y-auto pb-8 pr-1">
          <JobShell
            onOpenLayoutMap={() => setLayoutOpen(true)}
            hasPayload={!!payload}
          />
          {payload ? (
            <>
              <RunList
                onAddGate={(runId) => {
                  setGateRunId(runId);
                  setGateEditingId(null);
                }}
              />
              <JobActions />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
              <p className="text-brand-text">Pick a fence product to begin.</p>
              <ProductSelectV4
                value={state.payload?.productCode ?? ""}
                onChange={handleProductChange}
                separated={true}
              />
            </div>
          )}

          {bomMutation.isError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-500">
              Error:{" "}
              {bomMutation.error instanceof Error
                ? bomMutation.error.message
                : String(bomMutation.error)}
            </div>
          )}
        </div>

        {/* Right column — BOM panel */}
        <div className="lg:sticky lg:top-0 lg:h-full min-h-[640px]">
          <BomPanel
            isPending={bomMutation.isPending}
            onGenerate={handleGenerate}
            canGenerate={canGenerate}
            errors={errors}
            warnings={warnings}
          />
        </div>
      </div>

      <LayoutMapPane open={layoutOpen} onClose={() => setLayoutOpen(false)} />
      <GatePane
        open={gateOpen}
        onClose={() => {
          setGateRunId(null);
          setGateEditingId(null);
        }}
        runId={gateRunId}
        editingSegmentId={gateEditingId}
      />
    </AppShell>
  );
}

export function CalculatorV4Page() {
  return (
    <CalculatorV4Provider>
      {/* FenceConfigProvider + GateProvider required by the shared canvas
          component (FenceLayoutCanvas) reused inside LayoutMapPane. They are
          unused by v4 reducers — the v4 source of truth is CalculatorContextV4. */}
      <FenceConfigProvider>
        <GateProvider>
          <CalculatorV4Content />
        </GateProvider>
      </FenceConfigProvider>
    </CalculatorV4Provider>
  );
}
