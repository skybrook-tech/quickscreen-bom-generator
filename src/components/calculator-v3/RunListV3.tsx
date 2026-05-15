import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalPayload, CanonicalRun } from "../../types/canonical.types";
import { initialVariablesForSystem } from "../../lib/productOptionRules";
import { localFenceProducts } from "../../lib/localSeedData";
import { RunCard } from "./RunCard";

export function RunListV3({
  autoOpenFirstRunId,
  onAutoOpenConsumed,
}: {
  autoOpenFirstRunId?: string | null;
  onAutoOpenConsumed?: () => void;
}) {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const hasRuns = Boolean(payload?.runs.length);

  if (!payload) return null;

  function createPayloadForSystem(productCode: string): CanonicalPayload {
    const variables = initialVariablesForSystem(productCode);
    const runId = crypto.randomUUID();
    const targetHeight = Number(variables.target_height_mm ?? 1800);
    return {
      productCode,
      schemaVersion: "v1",
      variables,
      runs: [
        {
          runId,
          productCode,
          variables,
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "product_post" },
          segments: [
            {
              segmentId: crypto.randomUUID(),
              sortOrder: 1,
              segmentKind: "panel",
              segmentWidthMm: 0,
              targetHeightMm: targetHeight,
              variables: productCode === "BAYG" ? { panel_quantity: 1 } : undefined,
            },
          ],
          corners: [],
        },
      ],
    };
  }

  function startFirstRun(productCode: string) {
    const nextPayload = createPayloadForSystem(productCode);
    dispatch({ type: "SET_PAYLOAD", payload: nextPayload });
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("qsbom:open-run", { detail: nextPayload.runs[0].runId }));
    }, 80);
  }

  function addRun() {
    const firstRun = payload!.runs[0];
    const productCode = firstRun?.productCode ?? payload!.productCode;
    const variables = {
      ...(payload!.variables ?? {}),
      ...(firstRun?.variables ?? {}),
    };
    const initialHeight = Number(variables.target_height_mm ?? 1800);
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
          targetHeightMm: initialHeight,
          variables: productCode === "BAYG" ? { panel_quantity: 1 } : undefined,
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
            {localFenceProducts.map((product) => (
              <button
                key={product.system_type}
                type="button"
                onClick={() => startFirstRun(product.system_type)}
                className="flex items-center justify-between gap-3 rounded-lg border border-brand-primary bg-brand-primary px-3 py-3 text-left text-sm font-black text-white shadow-sm transition hover:bg-brand-primary/90 hover:shadow-md"
                data-testid={`landing-system-${product.system_type}`}
              >
                <span>
                  {product.system_type === "QSHS"
                    ? "Quick Screen Horizontal Slats"
                    : product.system_type === "VS"
                      ? "Vertical Slats"
                      : product.system_type === "XPL"
                        ? "Xpress Plus"
                        : "Build As You Go"}{" "}
                  ({product.system_type})
                </span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{product.system_type}</span>
              </button>
            ))}
          </div>
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
      <button
        type="button"
        onClick={addRun}
        className={`w-full rounded-lg py-3 text-sm font-black transition-all ${
          hasRuns
            ? "border border-brand-primary/50 bg-brand-primary px-4 text-white shadow-sm hover:bg-brand-primary/90 hover:shadow-md"
            : "border border-brand-primary bg-brand-primary px-4 text-white shadow-md ring-2 ring-brand-primary ring-offset-2 ring-offset-brand-card hover:bg-brand-primary/90 hover:shadow-lg"
        }`}
      >
        + Add run
      </button>
    </div>
  );
}
