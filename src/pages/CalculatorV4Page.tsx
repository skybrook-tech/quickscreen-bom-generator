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

  const noSegments =
    !payload || payload.runs.every((r) => r.segments.length === 0);
  const canGenerate = !!payload && !noSegments;

  return (
    <AppShell>
      <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr,2fr] gap-4 p-4 max-w-[1600px] mx-auto">
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
            <div className="rounded-xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
              Pick a fence product to begin.
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
