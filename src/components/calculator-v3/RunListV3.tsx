import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalRun } from "../../types/canonical.types";
import { useFenceProducts } from "../../hooks/useProducts";
import { useAllCalculatorConfigs, configForProduct } from "../../hooks/useCalculatorConfig";
import { buildInitialFencePayload } from "../../lib/newQuotePayload";
import type { ParseResult } from "../../lib/describeFenceParser";
import { DescribeFenceBox } from "../calculator/DescribeFenceBox";
import { RunCard } from "./RunCard/RunCard";

export function RunListV3({
  autoOpenFirstRunId,
  onAutoOpenConsumed,
  onDescribeApply,
  initialDescription = "",
}: {
  autoOpenFirstRunId?: string | null;
  onAutoOpenConsumed?: () => void;
  onDescribeApply?: (result: ParseResult) => void;
  initialDescription?: string;
}) {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const hasRuns = Boolean(payload?.runs.length);
  const fenceProducts = useFenceProducts().data;

  // Resolved config for every product; used to seed a fresh run's variables
  // from the target product's normalised defaults.
  const allConfigs = useAllCalculatorConfigs();

  if (!payload) return null;
  const currentPayload = payload;

  function startFirstRun(productCode: string) {
    const nextPayload = buildInitialFencePayload(
      productCode,
      configForProduct(allConfigs, productCode),
      currentPayload,
    );
    const firstRun = nextPayload.runs[0];
    dispatch({ type: "SET_PAYLOAD", payload: nextPayload });
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("qsbom:open-run", { detail: firstRun.runId }));
    }, 80);
  }

  function addRun() {
    const firstRun = payload!.runs[0];
    const productCode = firstRun?.productCode ?? payload!.productCode;
    // Copy defaults from the first run only (v3: runs are the sole source of
    // truth; payload.variables is empty).
    const variables = {
      ...(firstRun?.variables ?? {}),
    };
    const newRun: CanonicalRun = {
      runId: crypto.randomUUID(),
      productCode,
      variables,
      leftBoundary: firstRun?.leftBoundary ?? { type: "product_post" },
      rightBoundary: firstRun?.rightBoundary ?? { type: "product_post" },
      segments: [
        {
          segmentId: crypto.randomUUID(),
          sortOrder: 1,
          segmentKind: "panel",
          segmentWidthMm: 0,
          targetHeightMm: 1800,
          variables:
            configForProduct(allConfigs, productCode)?.strategy.fence === "panel"
              ? { panel_quantity: 1 }
              : undefined,
        },
      ],
      corners: [],
    };
    dispatch({ type: "UPSERT_RUN", run: newRun });
  }

  return (
    <div className="space-y-5">
      {!hasRuns && (
        <section className="space-y-3 rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-3">
          <p className="text-sm font-black text-brand-text">Choose a fence system</p>
          <div className="grid gap-2">
            {fenceProducts.map((product) => (
              <button
                key={product.system_type}
                type="button"
                onClick={() => startFirstRun(product.system_type)}
                disabled={!allConfigs}
                className="flex min-h-[88px] items-center justify-between gap-3 rounded-lg border border-brand-primary bg-brand-primary px-4 py-4 text-left text-white shadow-sm transition hover:bg-brand-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                data-testid={`landing-system-${product.system_type}`}
              >
                <span className="grid gap-1">
                  <span className="text-2xl font-black">{product.system_type}</span>
                  <span className="text-sm font-extrabold leading-tight">
                    {product.name}
                  </span>
                </span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{product.system_type}</span>
              </button>
            ))}
          </div>
          {onDescribeApply && (
            <div className="pt-2 text-center">
              <DescribeFenceBox
                title="Describe your fence"
                compact
                initialDescription={initialDescription}
                onApply={onDescribeApply}
              />
              <p className="mt-1 text-xs font-semibold text-brand-muted">
                (Click to describe)
              </p>
            </div>
          )}
        </section>
      )}
      {payload.runs.map((run, runIdx) => (
        <RunCard
          key={run.runId}
          run={run}
          runIdx={runIdx}
          autoOpenFirstSection={autoOpenFirstRunId === run.runId}
          onAutoOpenConsumed={onAutoOpenConsumed}
        />
      ))}
      {hasRuns && (
        <button
          type="button"
          onClick={addRun}
          className="min-h-11 w-full rounded-lg border border-brand-primary/50 bg-brand-primary px-4 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-brand-primary/90 hover:shadow-md"
        >
          + Add run
        </button>
      )}
    </div>
  );
}
