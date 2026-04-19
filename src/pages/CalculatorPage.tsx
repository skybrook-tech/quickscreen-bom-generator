import { Loader2 } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import {
  CalculatorProvider,
  useCalculator,
} from "../context/CalculatorContext";
import { GateProvider, useGates } from "../context/GateContext";
import { ProductSelector } from "../components/calculator/ProductSelector";
import { DefaultSettings } from "../components/calculator/DefaultSettings";
import { RunList } from "../components/calculator/RunList";
import { GateConfigPanel } from "../components/gate/GateConfigPanel";
import { BOMResultTabs } from "../components/calculator/BOMResultTabs";
import { useCalculatorBOM } from "../hooks/useCalculatorBOM";

function CalculatorContent() {
  const { state, dispatch } = useCalculator();
  const { gates } = useGates();
  const bomMutation = useCalculatorBOM();

  const canCalculate =
    state.productId !== null &&
    state.systemType !== null &&
    state.runs.length > 0;

  const handleCalculate = async () => {
    if (!canCalculate) return;

    try {
      const result = await bomMutation.mutateAsync({
        productId: state.productId!,
        systemType: state.systemType!,
        defaults: state.defaults,
        runs: state.runs,
        gates,
      });
      dispatch({ type: "SET_BOM_RESULT", result });
    } catch {
      // Error is available via bomMutation.error
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Product Selection */}
        <section className="bg-brand-card border border-brand-border rounded-xl p-5">
          <ProductSelector />
          {state.productId && (
            <div className="pt-4">
              <h2 className="text-sm font-semibold text-brand-text mb-3">
                Default Settings
              </h2>
              <DefaultSettings />
            </div>
          )}
        </section>

        {state.productId && (
          <>
            {/* Runs */}
            <section className="bg-brand-card border border-brand-border rounded-xl p-5">
              <RunList />

              {/* Gates */}

              <div className="pt-4">
                <h2 className="text-sm font-semibold text-brand-text mb-3">
                  {" "}
                  Gates{" "}
                </h2>
                <GateConfigPanel />
              </div>
            </section>

            {/* Calculate Button */}
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={handleCalculate}
                disabled={!canCalculate || bomMutation.isPending}
                className="flex w-full items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-accent rounded-lg hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bomMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Calculate BOM
              </button>
            </div>

            {/* Error */}
            {bomMutation.isError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
                {bomMutation.error instanceof Error
                  ? bomMutation.error.message
                  : "BOM calculation failed"}
              </div>
            )}

            {/* BOM Results */}
            {state.bomResult && (
              <section className="bg-brand-card border border-brand-border rounded-xl p-5">
                <BOMResultTabs result={state.bomResult} />
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

export function CalculatorPage() {
  return (
    <CalculatorProvider>
      <GateProvider>
        <CalculatorContent />
      </GateProvider>
    </CalculatorProvider>
  );
}
