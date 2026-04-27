import { AppShell } from "../components/layout/AppShell";
import { AccordionSection } from "../components/shared/AccordionSection";
import {
  CalculatorProvider,
  useCalculator,
} from "../context/CalculatorContext";
import { FenceConfigProvider } from "../context/FenceConfigContext";
import { GateProvider } from "../context/GateContext";
import { ProductSelectV3 } from "../components/calculator-v3/ProductSelectV3";
import { RunListV3 } from "../components/calculator-v3/RunListV3";
import { LayoutCanvasV3 } from "../components/calculator-v3/LayoutCanvasV3";
import { ExtraItemsPanel } from "../components/calculator-v3/ExtraItemsPanel";
import { SuggestedAccessoriesPanel } from "../components/calculator-v3/SuggestedAccessoriesPanel";
import { PricingTierSelect } from "../components/bom/PricingTierSelect";
import { BOMResultTabs } from "../components/shared/BOMResultTabs";
import { useBomCalculator } from "../hooks/useBomCalculator";
import { suggestAccessories } from "../lib/suggestedAccessories";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Download, FileX2, Loader2, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Papa from "papaparse";
import type {
  CalculatorBOMResult,
  BOMLineItem,
  ExtraItem,
  PricingTier,
} from "../types/bom.types";

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const lineKey = (line: BOMLineItem) =>
  `${line.sku}|${line.category}|${line.description}`;

function CalculatorV3Content() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const bomMutation = useBomCalculator();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [lineEdits, setLineEdits] = useState<Record<string, number | null>>({});
  const [pricingTier, setPricingTier] = useState<PricingTier>("tier1");
  const [saving, setSaving] = useState(false);

  async function handleGenerateBOM() {
    if (!payload) return;
    setExtraItems([]);
    setLineEdits({});
    try {
      const result = await bomMutation.mutateAsync({ payload, pricingTier });
      dispatch({ type: "SET_BOM_RESULT", result });
    } catch {
      // Error is available via bomMutation.error.
    }
  }

  const lastBom = state.bomResult;
  const baseBomLines = ((lastBom?.lines as BOMLineItem[]) ?? []);
  const suggestedAccessories = useMemo(
    () => (payload && lastBom ? suggestAccessories(payload, baseBomLines) : []),
    [payload, lastBom, baseBomLines],
  );
  const applyLineEdits = (items: BOMLineItem[]) =>
    items
      .map((line) => {
        const edit = lineEdits[lineKey(line)];
        if (edit === null) return null;
        if (typeof edit === "number") {
          return {
            ...line,
            quantity: edit,
            lineTotal: roundMoney(line.unitPrice * edit),
            notes: line.notes ? `${line.notes}; edited` : "edited",
          };
        }
        return line;
      })
      .filter(Boolean) as BOMLineItem[];

  const bomResultForTabs: CalculatorBOMResult | null = lastBom
    ? (() => {
        const baseAllItems = applyLineEdits((lastBom.lines as BOMLineItem[]) ?? []);
        const extraLineItems: BOMLineItem[] = extraItems.map((e) => ({
          category: "accessory",
          sku: e.sku ?? e.id,
          description: e.description,
          quantity: e.quantity,
          unit: "each",
          unitPrice: e.unitPrice,
          lineTotal: roundMoney(e.unitPrice * e.quantity),
          notes: "added manually",
        }));
        const runResults = (
          (lastBom.runResults as Array<{
            runId: string;
            items: BOMLineItem[];
          }>) ?? []
        ).map((r) => ({ runId: r.runId, items: applyLineEdits(r.items) }));
        const gateItems = applyLineEdits((lastBom.gateItems as BOMLineItem[]) ?? []);
        const baseTotal = roundMoney(
          baseAllItems.reduce((sum, line) => sum + line.lineTotal, 0),
        );
        const extrasSubtotal = roundMoney(extraLineItems.reduce(
          (sum, l) => sum + l.lineTotal,
          0,
        ));
        const total = roundMoney(baseTotal + extrasSubtotal);
        const gst = roundMoney(total * 0.1);
        const grandTotal = roundMoney(total + gst);
        return {
          runResults,
          gateItems,
          allItems: [...baseAllItems, ...extraLineItems],
          total,
          gst,
          grandTotal,
          pricingTier:
            (lastBom.pricingTier as CalculatorBOMResult["pricingTier"]) ??
            "tier1",
          generatedAt:
            (lastBom.generatedAt as string) ?? new Date().toISOString(),
        };
      })()
    : null;

  async function handleSaveQuote() {
    if (!payload || !bomResultForTabs) return;
    if (!isSupabaseConfigured) {
      localStorage.setItem(
        `glass-calc-draft-${Date.now()}`,
        JSON.stringify({ payload, bom: bomResultForTabs }),
      );
      toast.success("Quote saved locally for this browser");
      return;
    }

    setSaving(true);
    try {
      if (!user) throw new Error("You need to be signed in to save quotes.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      const orgId = profile?.org_id;
      if (!orgId) throw new Error("No organisation found for this user.");

      const quoteBom = {
        fenceItems: bomResultForTabs.allItems,
        gateItems: bomResultForTabs.gateItems,
        total: bomResultForTabs.total,
        gst: bomResultForTabs.gst,
        grandTotal: bomResultForTabs.grandTotal,
        pricingTier: bomResultForTabs.pricingTier,
        generatedAt: bomResultForTabs.generatedAt,
      };

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          org_id: orgId,
          user_id: user.id,
          customer_ref: `Calculator ${new Date().toLocaleDateString("en-AU")}`,
          fence_config: { calculator: "v3", payload },
          gates: [],
          bom: quoteBom,
          contact: {},
          notes: "Saved from v3 calculator",
          status: "draft",
        })
        .select("id")
        .single();
      if (quoteError) throw quoteError;

      const systems = [...new Set(payload.runs.map((run) => run.productCode))];
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, system_type")
        .in("system_type", systems);
      if (productsError) throw productsError;
      const productIdByCode = new Map(
        (products ?? []).map((product) => [product.system_type, product.id]),
      );

      for (const [runIndex, run] of payload.runs.entries()) {
        const productId = productIdByCode.get(run.productCode);
        if (!productId) continue;
        const { data: savedRun, error: runError } = await supabase
          .from("quote_runs")
          .insert({
            org_id: orgId,
            quote_id: quote.id,
            product_id: productId,
            sort_order: runIndex + 1,
            description: `Run ${runIndex + 1} - ${run.productCode}`,
            variables_json: {
              runId: run.runId,
              productCode: run.productCode,
              variables: run.variables ?? {},
              leftBoundary: run.leftBoundary,
              rightBoundary: run.rightBoundary,
              corners: run.corners,
              geometry: run.geometry,
            },
          })
          .select("id")
          .single();
        if (runError) throw runError;

        if (run.segments.length > 0) {
          const { error: segmentError } = await supabase
            .from("quote_run_segments")
            .insert(
              run.segments.map((segment) => ({
                org_id: orgId,
                quote_run_id: savedRun.id,
                sort_order: segment.sortOrder,
                segment_type: segment.segmentKind,
                segment_kind: segment.segmentKind,
                length_mm: segment.segmentWidthMm ?? null,
                panel_width_mm: segment.variables?.max_panel_width_mm ?? null,
                target_height_mm: segment.targetHeightMm ?? null,
                bay_count: segment.bayCount ?? null,
                variables_json: {
                  segmentId: segment.segmentId,
                  variables: segment.variables ?? {},
                  gateProductCode: segment.gateProductCode,
                },
              })),
            );
          if (segmentError) throw segmentError;
        }
      }

      toast.success("Quote saved");
      navigate(`/quote/${quote.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save quote");
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    if (!bomResultForTabs) return;
    type CsvRow = {
      SKU: string;
      Description: string;
      Category: string;
      Unit: string;
      Qty: string | number;
      "Unit Price": string;
      "Line Total": string;
    };
    const rows: CsvRow[] = bomResultForTabs.allItems.map((line) => ({
      SKU: line.sku,
      Description: line.description,
      Category: line.category,
      Unit: line.unit,
      Qty: line.quantity,
      "Unit Price": line.unitPrice.toFixed(2),
      "Line Total": line.lineTotal.toFixed(2),
    }));
    rows.push(
      {
        SKU: "",
        Description: "Subtotal (ex-GST)",
        Category: "",
        Unit: "",
        Qty: "",
        "Unit Price": "",
        "Line Total": bomResultForTabs.total.toFixed(2),
      },
      {
        SKU: "",
        Description: "GST (10%)",
        Category: "",
        Unit: "",
        Qty: "",
        "Unit Price": "",
        "Line Total": bomResultForTabs.gst.toFixed(2),
      },
      {
        SKU: "",
        Description: "TOTAL (inc. GST)",
        Category: "",
        Unit: "",
        Qty: "",
        "Unit Price": "",
        "Line Total": bomResultForTabs.grandTotal.toFixed(2),
      },
    );
    const blob = new Blob([Papa.unparse(rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `glass-outlet-bom-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const warnings = (lastBom?.warnings as string[]) ?? [];
  const errors = (lastBom?.errors as string[]) ?? [];
  const hasErrors = errors.length > 0;
  const noSegments =
    !payload || payload.runs.every((r) => r.segments.length === 0);

  const firstSegment = payload?.runs
    .flatMap((run) => run.segments)
    .find((segment) => segment.segmentKind !== "gate_opening");
  const summaryHeight = Number(
    firstSegment?.targetHeightMm ?? payload?.variables.target_height_mm ?? 1800,
  );
  const summaryWidth = Number(firstSegment?.segmentWidthMm ?? 0);
  const firstRunVariables = {
    ...(payload?.variables ?? {}),
    ...(payload?.runs[0]?.variables ?? {}),
  };
  const summaryText = payload
    ? `${payload.runs[0]?.productCode ?? payload.productCode} - ${summaryHeight}H${summaryWidth ? ` x ${summaryWidth}W` : ""} - ${firstRunVariables.colour_code ?? "B"} - ${firstRunVariables.slat_size_mm ?? 65}mm / ${firstRunVariables.slat_gap_mm ?? 5}mm`
    : "Select a system to begin";

  return (
    <AppShell>
      <div className="grid min-h-full grid-cols-1 overflow-hidden bg-slate-100 lg:grid-cols-[420px_1fr]">
        <aside className="border-r border-brand-border bg-white">
          <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
                Start quote
              </p>
              {!payload ? (
                <ProductSelectV3 />
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: "CLEAR_QUOTE" });
                      setExtraItems([]);
                      setLineEdits({});
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-red-500/30 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 size={15} />
                    Clear Quote
                  </button>
                </div>
              )}
            </section>

            {payload && (
              <>
                <hr className="border-brand-border/60" />
                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
                    Runs
                  </p>
                  <RunListV3 />
                </section>

                <hr className="border-brand-border/60" />
                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
                    Pricing
                  </p>
                  <PricingTierSelect value={pricingTier} onChange={setPricingTier} />
                </section>

                {(errors.length > 0 || warnings.length > 0) && (
                  <div className="space-y-2">
                    {errors.map((e, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500"
                      >
                        Error: {e}
                      </div>
                    ))}
                    {warnings.map((w, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-600"
                      >
                        Warning: {w}
                      </div>
                    ))}
                  </div>
                )}

                {bomMutation.isError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                    Error:{" "}
                    {bomMutation.error instanceof Error
                      ? bomMutation.error.message
                      : String(bomMutation.error)}
                  </div>
                )}

              </>
            )}
          </div>
        </aside>

        <main className="overflow-y-auto p-5 lg:p-8">
          <div className="mx-auto max-w-5xl space-y-5">
            <section className="rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-brand-border bg-slate-50 px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
                  Panel Preview
                </h2>
                <span className="text-xs text-brand-muted">{summaryText}</span>
              </div>
              <div className="p-6">
                <div className="flex min-h-36 items-center justify-center rounded-lg bg-slate-100 px-5 text-center text-sm text-brand-muted">
                  {payload
                    ? "Preview is ready for the next visual pass. Use the run controls on the left to define lengths and heights."
                    : "Select a system on the left to start configuring."}
                </div>
              </div>
            </section>

            {payload && (
              <AccordionSection
                title="Layout"
                badge="Draw runs, gates, and map underlay"
                defaultOpen={false}
              >
                <LayoutCanvasV3 />
              </AccordionSection>
            )}

            <section className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-lg bg-blue-800 p-5 text-white">
                <div>
                  <h2 className="text-lg font-bold">Bill of Materials</h2>
                  <p className="mt-1 text-sm opacity-80">{summaryText}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70">
                    {pricingTier.replace("tier", "Tier ")}
                  </p>
                  <p className="text-2xl font-bold">
                    ${bomResultForTabs?.grandTotal.toFixed(2) ?? "0.00"}
                  </p>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateBOM}
                  disabled={bomMutation.isPending || hasErrors || noSegments}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-800 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {bomMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Generate BOM
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "CLEAR_BOM_RESULT" })}
                  disabled={!bomResultForTabs}
                  className="inline-flex items-center gap-2 rounded-md border border-brand-border px-3 py-2 text-sm font-medium text-brand-muted transition-colors hover:border-red-500/50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileX2 size={15} />
                  Clear BOM
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuote}
                  disabled={!bomResultForTabs || saving}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-800 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Save Quote
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={!bomResultForTabs}
                  className="inline-flex items-center gap-2 rounded-md border border-brand-border px-3 py-2 text-sm font-medium text-brand-muted transition-colors hover:border-blue-800 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={15} />
                  Export CSV
                </button>
              </div>

              {bomResultForTabs && !hasErrors ? (
                <>
                  <BOMResultTabs
                    result={bomResultForTabs}
                    editable
                    onQuantityChange={(item, quantity) =>
                      setLineEdits((prev) => ({
                        ...prev,
                        [lineKey(item)]: quantity <= 0 ? null : quantity,
                      }))
                    }
                    onRemoveLine={(item) =>
                      setLineEdits((prev) => ({
                        ...prev,
                        [lineKey(item)]: null,
                      }))
                    }
                  />
                  <SuggestedAccessoriesPanel
                    suggestions={suggestedAccessories}
                    addedItems={extraItems}
                    onAdd={(item) =>
                      setExtraItems((prev) =>
                        prev.some((existing) => (existing.sku ?? existing.id) === (item.sku ?? item.id))
                          ? prev
                          : [...prev, item],
                      )
                    }
                  />
                  <ExtraItemsPanel
                    items={extraItems}
                    onAdd={(item) => setExtraItems((prev) => [...prev, item])}
                    onRemove={(id) =>
                      setExtraItems((prev) => prev.filter((i) => i.id !== id))
                    }
                  />
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-brand-border bg-slate-50 px-5 py-10 text-center text-sm text-brand-muted">
                  Configure a run on the left, then generate the BOM to see selected products, quantities, GST, and grand total.
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </AppShell>
  );
}

export function CalculatorV3Page() {
  return (
    <CalculatorProvider>
      <FenceConfigProvider>
        <GateProvider>
          <CalculatorV3Content />
        </GateProvider>
      </FenceConfigProvider>
    </CalculatorProvider>
  );
}
