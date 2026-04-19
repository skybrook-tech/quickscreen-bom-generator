import { AppShell } from "../components/layout/AppShell";
import { AccordionSection } from "../components/shared/AccordionSection";
import {
  CalculatorProvider,
  useCalculator,
} from "../context/CalculatorContext";
import { FenceConfigProvider } from "../context/FenceConfigContext";
import { GateProvider } from "../context/GateContext";
import { ProductSelectV3 } from "../components/calculator-v3/ProductSelectV3";
import { SchemaDrivenForm } from "../components/calculator-v3/SchemaDrivenForm";
import { RunListV3 } from "../components/calculator-v3/RunListV3";
import { GateListV3 } from "../components/calculator-v3/GateListV3";
import { LayoutCanvasV3 } from "../components/calculator-v3/LayoutCanvasV3";
import { ExtraItemsPanel } from "../components/calculator-v3/ExtraItemsPanel";
import { BOMResultTabs } from "../components/shared/BOMResultTabs";
import { useBomCalculator } from "../hooks/useBomCalculator";
import { useProductVariables } from "../hooks/useProductVariables";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type {
  CalculatorBOMResult,
  BOMLineItem,
  ExtraItem,
} from "../types/bom.types";

function CalculatorV3Content() {
  const { state, dispatch } = useCalculator();
  const payload = state.canonicalPayload;
  const bomMutation = useBomCalculator();
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);

  const { data: jobFields = [] } = useProductVariables(
    payload?.productCode ?? null,
    "job",
  );

  function handleFieldChange(key: string, value: string | number | boolean) {
    if (!payload) return;
    dispatch({
      type: "SET_CANONICAL_PAYLOAD",
      payload: {
        ...payload,
        variables: { ...payload.variables, [key]: value },
      },
    });
  }

  async function handleGenerateBOM() {
    if (!payload) return;
    setExtraItems([]); // reset extras on new BOM
    try {
      const result = await bomMutation.mutateAsync({ payload });
      dispatch({ type: "SET_V3_BOM_RESULT", result });
    } catch {
      // Error is available via bomMutation.error
    }
  }

  // Convert v3 result into the shape BOMResultTabs expects.
  // Extra items merge into allItems and contribute to totals.
  const v3Result = state.v3BomResult;

  const bomResultForTabs: CalculatorBOMResult | null = v3Result
    ? (() => {
        const baseAllItems = (v3Result.lines as BOMLineItem[]) ?? [];
        const baseTotal =
          (v3Result.totals as { subtotal?: number })?.subtotal ?? 0;
        const extraLineItems: BOMLineItem[] = extraItems.map((e) => ({
          category: "accessory",
          sku: e.sku ?? e.id,
          description: e.description,
          quantity: e.quantity,
          unit: "each",
          unitPrice: e.unitPrice,
          lineTotal: e.unitPrice * e.quantity,
          notes: "added manually",
        }));
        const extrasSubtotal = extraLineItems.reduce(
          (sum, l) => sum + l.lineTotal,
          0,
        );
        const total = baseTotal + extrasSubtotal;
        const gst = total * 0.1;
        return {
          runResults: (
            (v3Result.runResults as Array<{
              runId: string;
              items: BOMLineItem[];
            }>) ?? []
          ).map((r) => ({ runId: r.runId, items: r.items })),
          gateItems: (v3Result.gateItems as BOMLineItem[]) ?? [],
          allItems: [...baseAllItems, ...extraLineItems],
          total,
          gst,
          grandTotal: total + gst,
          pricingTier:
            (v3Result.pricingTier as CalculatorBOMResult["pricingTier"]) ??
            "tier1",
          generatedAt:
            (v3Result.generatedAt as string) ?? new Date().toISOString(),
        };
      })()
    : null;

  const warnings = (v3Result?.warnings as string[]) ?? [];
  const errors = (v3Result?.errors as string[]) ?? [];
  const hasErrors = errors.length > 0;
  const noSegments =
    !payload || payload.runs.every((r) => r.segments.length === 0);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Product Selection */}
        <AccordionSection title="Product" defaultOpen>
          <ProductSelectV3 />
        </AccordionSection>

        {payload && (
          <>
            {/* Job Settings — data-driven from product_variables */}
            <AccordionSection title="Job Settings" defaultOpen>
              {jobFields.length > 0 ? (
                <SchemaDrivenForm
                  fields={jobFields}
                  variables={payload.variables}
                  onChange={handleFieldChange}
                />
              ) : (
                <p className="text-sm text-brand-muted">
                  Loading job settings for {payload.productCode}…
                </p>
              )}
            </AccordionSection>

            {/* Canvas — hidden on mobile */}
            <div className="hidden md:block">
              <AccordionSection
                title="Layout"
                badge="Draw your fence with the layout tool"
                defaultOpen={false}
              >
                <LayoutCanvasV3 />
              </AccordionSection>
            </div>

            {/* Runs & Segments */}
            <AccordionSection title="Runs & Segments" defaultOpen>
              <RunListV3 />
            </AccordionSection>

            {/* Gates */}
            <AccordionSection title="Gates" defaultOpen>
              <GateListV3 />
            </AccordionSection>

            {/* Validation messages from last BOM run */}
            {(errors.length > 0 || warnings.length > 0) && (
              <div className="space-y-2">
                {errors.map((e, i) => (
                  <div
                    key={i}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-400"
                  >
                    Error: {e}
                  </div>
                ))}
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 text-sm text-amber-400"
                  >
                    Warning: {w}
                  </div>
                ))}
              </div>
            )}

            {/* Generate BOM button */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerateBOM}
                disabled={bomMutation.isPending || hasErrors || noSegments}
                className="px-8 py-3 bg-brand-accent text-white rounded-lg font-medium hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {bomMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Generate BOM
              </button>
            </div>

            {/* Mutation error */}
            {bomMutation.isError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                Error:{" "}
                {bomMutation.error instanceof Error
                  ? bomMutation.error.message
                  : String(bomMutation.error)}
              </div>
            )}

            {/* BOM results + extra items panel */}
            {bomResultForTabs && !hasErrors && (
              <AccordionSection title="Bill of Materials" defaultOpen>
                <BOMResultTabs result={bomResultForTabs} />
                <ExtraItemsPanel
                  items={extraItems}
                  onAdd={(item) => setExtraItems((prev) => [...prev, item])}
                  onRemove={(id) =>
                    setExtraItems((prev) => prev.filter((i) => i.id !== id))
                  }
                />
              </AccordionSection>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

export function CalculatorV3Page() {
  return (
    <CalculatorProvider>
      {/* FenceConfigProvider and GateProvider are required by FenceLayoutCanvas */}
      <FenceConfigProvider>
        <GateProvider>
          <CalculatorV3Content />
        </GateProvider>
      </FenceConfigProvider>
    </CalculatorProvider>
  );
}
