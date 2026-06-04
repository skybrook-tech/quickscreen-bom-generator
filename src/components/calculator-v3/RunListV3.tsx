import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { getSupplierBySlug } from "../../lib/multiSupplier/queries";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalPayload, CanonicalRun } from "../../types/canonical.types";
import { initialVariablesForSystem } from "../../lib/productOptionRules";
import { localFenceProducts } from "../../lib/localSeedData";
import type { ParseResult } from "../../lib/describeFenceParser";
import { DescribeFenceBox } from "../calculator/DescribeFenceBox";
import { RunCard } from "./RunCard";

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
  const { supplierSlug } = useParams<{ supplierSlug?: string }>();
  const payload = state.payload;
  const hasRuns = Boolean(payload?.runs.length);

  // Fetch active supplier if on a branded page
  const { data: supplier } = useQuery({
    queryKey: ["runListSupplier", supplierSlug],
    queryFn: () => supplierSlug ? getSupplierBySlug(supplierSlug) : Promise.resolve(null),
    enabled: !!supplierSlug,
  });

  // Query products filtered by active supplier or active system instance
  const { data: dbProducts = [] } = useQuery({
    queryKey: ["runListProducts", supplier?.id, payload?.variables?.system_instance_id],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      let q = supabase
        .from("products")
        .select("id, name, system_type, description")
        .eq("product_type", "fence")
        .eq("active", true);

      const systemInstanceId = payload?.variables?.system_instance_id;
      if (systemInstanceId) {
        q = q.eq("system_instance_id", systemInstanceId);
      } else if (supplier?.id) {
        q = q.eq("supplier_id", supplier.id);
      }

      const { data } = await q.order("sort_order", { ascending: true });
      return data ?? [];
    },
    enabled: true,
  });

  const productsToRender = dbProducts.length > 0 
    ? dbProducts.map(p => ({
        system_type: p.system_type,
        name: p.name,
        description: p.description
      }))
    : localFenceProducts;

  if (!payload) return null;
  const currentPayload = payload;

  function createPayloadForSystem(productCode: string): CanonicalPayload {
    const variables = initialVariablesForSystem(productCode);
    const runId = crypto.randomUUID();
    return {
      productCode,
      schemaVersion: "v1",
      variables,
      ...(currentPayload.propertyAnchor
        ? { propertyAnchor: currentPayload.propertyAnchor }
        : {}),
      ...(currentPayload.snapshot ? { snapshot: currentPayload.snapshot } : {}),
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
              targetHeightMm: 1800,
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
    const firstRun = nextPayload.runs[0];
    dispatch({ type: "SET_PAYLOAD", payload: nextPayload });
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("qsbom:open-run", { detail: firstRun.runId }));
    }, 80);
  }

  function addRun() {
    const firstRun = payload!.runs[0];
    const productCode = firstRun?.productCode ?? payload!.productCode;
    const variables = {
      ...(payload!.variables ?? {}),
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
            {productsToRender.map((product) => (
              <button
                key={product.system_type}
                type="button"
                onClick={() => startFirstRun(product.system_type)}
                className="flex min-h-[88px] items-center justify-between gap-3 rounded-lg border border-brand-primary bg-brand-primary px-4 py-4 text-left text-white shadow-sm transition hover:bg-brand-primary/90 hover:shadow-md"
                data-testid={`landing-system-${product.system_type}`}
              >
                <span className="grid gap-1">
                  <span className="text-2xl font-black">{product.system_type}</span>
                  <span className="text-sm font-extrabold leading-tight">
                    {product.system_type === "QSHS"
                      ? "Quick Screen Horizontal Slats"
                      : product.system_type === "VS"
                        ? "Vertical Slats"
                        : product.system_type === "XPL"
                          ? "Xpress Plus"
                          : product.system_type === "BAYG"
                            ? "Build As You Go"
                            : product.name}
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
