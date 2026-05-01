import { AppShell } from "../components/layout/AppShell";
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
import { BOMResultTabs } from "../components/shared/BOMResultTabs";
import { useBomCalculator } from "../hooks/useBomCalculator";
import { suggestAccessories } from "../lib/suggestedAccessories";
import { priceForSku } from "../lib/localBomCalculator";
import { GATE_SEGMENT_STUB_KEYS } from "../lib/segmentTermination";
import { GATE_MOVEMENTS, optionLabel as gateOptionLabel } from "../lib/gateOptionRules";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Download,
  FileX2,
  Loader2,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Printer,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Papa from "papaparse";
import type {
  CalculatorBOMResult,
  BOMLineItem,
  ExtraItem,
} from "../types/bom.types";

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const lineKey = (line: BOMLineItem) =>
  `${line.sku}|${line.category}|${line.description}`;

const bomGroupKey = (line: BOMLineItem) =>
  `${line.sku}|${line.category}|${line.description}|${line.unit}`;

function aggregateBomItems(items: BOMLineItem[]): BOMLineItem[] {
  const grouped = new Map<string, BOMLineItem>();
  for (const item of items) {
    const key = bomGroupKey(item);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...item });
      continue;
    }
    const quantity = existing.quantity + item.quantity;
    const lineTotalBeforeReprice = existing.lineTotal + item.lineTotal;
    const unitPrice = priceForSku(item.sku, quantity);
    const lineTotal =
      unitPrice > 0 ? roundMoney(unitPrice * quantity) : roundMoney(lineTotalBeforeReprice);
    grouped.set(key, {
      ...existing,
      quantity,
      unitPrice: unitPrice > 0 ? unitPrice : roundMoney(lineTotal / Math.max(1, quantity)),
      lineTotal,
      notes:
        existing.notes || item.notes
          ? Array.from(new Set([existing.notes, item.notes].filter(Boolean))).join("; ")
          : undefined,
    });
  }
  return [...grouped.values()];
}

function gateLabel(runIndex: number, gateIndex: number) {
  return `R${runIndex + 1} G${gateIndex + 1}`;
}

const COLOUR_NAMES: Record<string, string> = {
  B: "Black Satin",
  MN: "Monument Matt",
  G: "Woodland Grey Matt",
  SM: "Surfmist Matt",
  W: "Pearl White Gloss",
  BS: "Basalt Satin",
  D: "Dune Satin",
  M: "Mill",
  P: "Primrose",
  PB: "Paperbark",
  S: "Palladium Silver Pearl",
  KWI: "Kwila",
  WRC: "Western Red Cedar",
};

function colourName(code: unknown) {
  const value = String(code ?? "B");
  return COLOUR_NAMES[value] ? `${COLOUR_NAMES[value]} (${value})` : value;
}

function initialRunPaneWidth() {
  if (typeof window === "undefined") return 480;
  return Math.round(Math.min(680, Math.max(390, window.innerWidth / 3)));
}

function CalculatorV3Content() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const bomMutation = useBomCalculator();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [lineEdits, setLineEdits] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);
  const [jobName, setJobName] = useState("");
  const [activeBomSummary, setActiveBomSummary] = useState<{
    label: string;
    grandTotal: number;
  } | null>(null);
  const [runPaneWidth, setRunPaneWidth] = useState(initialRunPaneWidth);
  const [mobileLayout, setMobileLayout] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [layoutFullscreen, setLayoutFullscreen] = useState(false);
  const handleActiveBomSummaryChange = useCallback(
    (summary: { label: string; grandTotal: number }) => {
      setActiveBomSummary({
        label: summary.label === "All Items" ? "All items" : summary.label,
        grandTotal: summary.grandTotal,
      });
    },
    [],
  );

  useEffect(() => {
    const updateLayout = () => setMobileLayout(window.innerWidth < 768);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  function handleResizeStart() {
    const onMove = (event: MouseEvent) => {
      const maxWidth = Math.min(760, window.innerWidth * 0.58);
      const minWidth = Math.min(390, Math.max(320, window.innerWidth - 360));
      setRunPaneWidth(Math.round(Math.min(maxWidth, Math.max(minWidth, event.clientX))));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const layoutMapButton = (onBeforeOpen?: () => void) => (
    <button
      type="button"
      onClick={() => {
        if (!layoutOpen) onBeforeOpen?.();
        setLayoutOpen((open) => !open);
      }}
      className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-3 text-sm font-extrabold shadow-sm transition-colors ${
        layoutOpen
          ? "border-blue-800 bg-blue-800 text-white hover:bg-blue-900"
          : "border-blue-800/40 bg-blue-800/10 text-blue-800 hover:bg-blue-800 hover:text-white"
      }`}
      title={layoutOpen ? "Minimize layout map" : "Open layout map"}
    >
      <MapIcon size={22} strokeWidth={2.5} />
      {layoutOpen ? "Minimize layout map" : "Open layout map"}
    </button>
  );

  async function handleGenerateBOM() {
    if (!payload) return;
    setExtraItems([]);
    setLineEdits({});
    setActiveBomSummary(null);
    dispatch({ type: "CLEAR_BOM_RESULT" });
    try {
      const result = await bomMutation.mutateAsync({ payload });
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
          const unitPrice = priceForSku(line.sku, edit);
          return {
            ...line,
            quantity: edit,
            unitPrice,
            lineTotal: roundMoney(unitPrice * edit),
            notes: line.notes ? `${line.notes}; edited` : "edited",
          };
        }
        return line;
      })
      .filter(Boolean) as BOMLineItem[];

  const bomResultForTabs: CalculatorBOMResult | null = lastBom
    ? (() => {
        const baseAllItems = applyLineEdits(
          aggregateBomItems((lastBom.lines as BOMLineItem[]) ?? []),
        );
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
        ).map((r) => ({
          runId: r.runId,
          items: applyLineEdits(aggregateBomItems(r.items)),
        }));
        const rawRunResults =
          (lastBom.runResults as Array<{
            runId: string;
            items: BOMLineItem[];
          }>) ?? [];
        const gateResults =
          payload?.runs.flatMap((run, runIndex) => {
            let gateIndex = 0;
            return run.segments.flatMap((segment) => {
              if (segment.segmentKind !== "gate_opening") return [];
              const label = gateLabel(runIndex, gateIndex++);
              const runItems =
                rawRunResults.find((result) => result.runId === run.runId)?.items ?? [];
              return [
                {
                  id: segment.segmentId,
                  label,
                  items: applyLineEdits(
                    aggregateBomItems(
                      runItems.filter((item) => item.segmentId === segment.segmentId),
                    ),
                  ),
                },
              ];
            });
          }) ?? [];
        const gateSegments =
          payload?.runs.flatMap((run) =>
            run.segments.filter((segment) => segment.segmentKind === "gate_opening"),
          ) ?? [];
        const runScopedGateItems = rawRunResults.flatMap((runResult) =>
          runResult.items.filter(
            (item) =>
              item.productCode === "QS_GATE" ||
              gateSegments.some((segment) => segment.segmentId === item.segmentId),
          ),
        );
        const rawGateItems =
          runScopedGateItems.length > 0
            ? runScopedGateItems
            : ((lastBom.gateItems as BOMLineItem[]) ?? []);
        const gateItems = applyLineEdits(aggregateBomItems(rawGateItems));
        const allItems = aggregateBomItems([...baseAllItems, ...extraLineItems]);
        const baseTotal = roundMoney(
          allItems.reduce((sum, line) => sum + line.lineTotal, 0),
        );
        const total = baseTotal;
        const gst = roundMoney(total * 0.1);
        const grandTotal = roundMoney(total + gst);
        return {
          runResults,
          gateResults,
          gateItems,
          allItems,
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

  async function handleSaveJob() {
    if (!payload) return;
    const cleanJobName = jobName.trim();
    const customerRef =
      cleanJobName || `Glass Outlet Job ${new Date().toLocaleDateString("en-AU")}`;
    const emptyBom = {
      fenceItems: [],
      gateItems: [],
      total: 0,
      gst: 0,
      grandTotal: 0,
      pricingTier: "tier1" as const,
      generatedAt: null,
    };
    const quoteBom = bomResultForTabs
      ? {
          fenceItems: bomResultForTabs.allItems,
          gateItems: bomResultForTabs.gateItems,
          total: bomResultForTabs.total,
          gst: bomResultForTabs.gst,
          grandTotal: bomResultForTabs.grandTotal,
          pricingTier: bomResultForTabs.pricingTier,
          generatedAt: bomResultForTabs.generatedAt,
        }
      : emptyBom;

    if (!isSupabaseConfigured) {
      localStorage.setItem(
        `glass-calc-job-${Date.now()}`,
        JSON.stringify({
          jobName: customerRef,
          payload,
          bom: quoteBom,
          savedAt: new Date().toISOString(),
        }),
      );
      toast.success("Job saved locally for this browser");
      return;
    }

    setSaving(true);
    try {
      if (!user) {
        localStorage.setItem(
          `glass-calc-job-${Date.now()}`,
          JSON.stringify({
            jobName: customerRef,
            payload,
            bom: quoteBom,
            savedAt: new Date().toISOString(),
          }),
        );
        toast.success("Job saved locally for this browser");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      const orgId = profile?.org_id;
      if (!orgId) throw new Error("No organisation found for this user.");

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          org_id: orgId,
          user_id: user.id,
          customer_ref: customerRef,
          fence_config: {
            calculator: "v3",
            jobName: customerRef,
            payload,
            layoutGeometry: payload.runs.map((run) => ({
              runId: run.runId,
              geometry: run.geometry,
              segments: run.segments.map((segment) => ({
                segmentId: segment.segmentId,
                widthMm: segment.segmentWidthMm,
                targetHeightMm: segment.targetHeightMm,
                variables: segment.variables ?? {},
              })),
            })),
          },
          gates: [],
          bom: quoteBom,
          contact: {},
          notes: "Saved from v3 job calculator",
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
      const productIdByCode = new globalThis.Map(
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

      toast.success("Job saved");
      navigate(`/quote/${quote.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  function handlePrintBom() {
    window.print();
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

  const fenceSegments = payload?.runs
    .flatMap((run) => run.segments)
    .filter((segment) => segment.segmentKind !== "gate_opening") ?? [];
  const gateSegments = payload?.runs
    .flatMap((run) => run.segments)
    .filter((segment) => segment.segmentKind === "gate_opening") ?? [];
  const firstSegment = fenceSegments[0];
  const summaryHeight = Number(
    firstSegment?.targetHeightMm ?? payload?.variables.target_height_mm ?? 1800,
  );
  const summaryLength = payload
    ? payload.runs.reduce(
        (total, run) =>
          total + run.segments.reduce((sum, segment) => sum + Number(segment.segmentWidthMm ?? 0), 0),
        0,
      )
    : 0;
  const firstRunVariables = {
    ...(payload?.variables ?? {}),
    ...(payload?.runs[0]?.variables ?? {}),
  };
  const cleanJobName = jobName.trim();
  const systemSummary = payload
    ? [...new Set(payload.runs.map((run) => run.productCode))].join(" + ")
    : "";
  const gateTypes = [
    ...new Set(
      gateSegments.map((segment) =>
        gateOptionLabel(
          GATE_MOVEMENTS,
          segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement] ?? "single_swing",
        ),
      ),
    ),
  ].filter(Boolean);
  const gateSummary =
    gateSegments.length === 0
      ? "No gates"
      : `${gateSegments.length} ${gateSegments.length === 1 ? "gate" : "gates"} - ${gateTypes.join(", ")}`;
  const summaryText = payload
    ? `${systemSummary} - ${(summaryLength / 1000).toFixed(2)}m total - ${summaryHeight}mm high - ${colourName(firstRunVariables.colour_code)} - ${gateSummary}`
    : cleanJobName;
  const saveJobLabel = jobName.trim() ? `Save ${jobName.trim()}` : "Save Job";

  return (
    <AppShell>
      <div
        className="relative flex h-full min-h-0 flex-col overflow-hidden bg-brand-bg md:flex-row"
      >
        <aside
          className={`relative flex w-full overflow-hidden border-b border-brand-border bg-brand-card md:min-h-0 md:max-h-none md:shrink-0 md:border-b-0 md:border-r ${
            bomResultForTabs ? "max-h-[32vh]" : "min-h-[46vh]"
          }`}
          style={mobileLayout ? undefined : { width: runPaneWidth }}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-5">
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
                Job Name
              </p>
              <input
                type="text"
                value={jobName}
                onChange={(event) => setJobName(event.target.value)}
                placeholder="Enter job name"
                className="mb-4 w-full rounded-xl border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              />
              {!payload ? (
                <ProductSelectV3
                  mapAction={(selectDefaultProduct) =>
                    layoutMapButton(selectDefaultProduct)
                  }
                />
              ) : (
                <div className="flex flex-wrap justify-end gap-2">
                  {layoutMapButton()}
                </div>
              )}
            </section>

            {payload && (
              <>
                <hr className="border-brand-border/60" />
                <section>
                  <RunListV3 />
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
            <div className="border-t border-brand-border bg-brand-card p-3 sm:p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveJob}
                  disabled={!payload || saving}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-800 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saveJobLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "CLEAR_QUOTE" });
                    setExtraItems([]);
                    setLineEdits({});
                    setActiveBomSummary(null);
                    setJobName("");
                  }}
                  disabled={!payload && !jobName}
                  className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={15} />
                  Clear Job
                </button>
              </div>
            </div>
          </div>
        </aside>

        <button
          type="button"
          aria-label="Resize panels"
          onMouseDown={handleResizeStart}
          className="hidden w-1.5 shrink-0 cursor-col-resize bg-brand-border/60 transition-colors hover:bg-blue-800/40 md:block"
        />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
            <section className="rounded-2xl border border-brand-border/60 bg-brand-card p-3 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-lg bg-blue-800 p-4 text-white sm:p-5">
                <div>
                  <h2 className="text-lg font-bold">Bill of Materials</h2>
                  {summaryText && <p className="mt-1 text-sm opacity-80">{summaryText}</p>}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs opacity-70">
                    {activeBomSummary?.label ?? "Auto quantity breaks"}
                  </p>
                  <p className="text-2xl font-bold">
                    ${formatMoney(activeBomSummary?.grandTotal ?? bomResultForTabs?.grandTotal ?? 0)}
                  </p>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateBOM}
                  disabled={bomMutation.isPending || hasErrors || noSegments}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-800 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {bomMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Generate BOM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveBomSummary(null);
                    dispatch({ type: "CLEAR_BOM_RESULT" });
                  }}
                  disabled={!bomResultForTabs}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted transition-colors hover:border-red-500/50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileX2 size={15} />
                  Clear BOM
                </button>
                <button
                  type="button"
                  onClick={handlePrintBom}
                  disabled={!bomResultForTabs}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted transition-colors hover:border-blue-800 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Printer size={15} />
                  Print BOM
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={!bomResultForTabs}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted transition-colors hover:border-blue-800 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
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
                    onActiveSummaryChange={handleActiveBomSummaryChange}
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
                <div className="rounded-2xl border border-dashed border-brand-border bg-brand-bg/60 px-5 py-10 text-center text-sm font-semibold text-brand-muted">
                  Configure a run on the left, then generate the BOM to see selected products, quantities, GST, and grand total.
                </div>
              )}
            </section>
          </div>
        </main>

        {layoutOpen && payload && (
          <div
            className={`absolute bottom-0 top-0 z-20 border-l border-brand-border bg-brand-card shadow-2xl ${
              layoutFullscreen || mobileLayout ? "left-0 right-0" : "left-[min(560px,45vw)] right-0"
            }`}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-brand-text">Layout map</p>
                  <p className="text-xs text-brand-muted">
                    Draw runs, gates, and map underlay
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLayoutOpen(false)}
                    className="rounded-full border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted hover:border-blue-800 hover:text-blue-800"
                    title="Minimize map"
                  >
                    Minimize
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutFullscreen((value) => !value)}
                    className="rounded-full border border-brand-border p-2 text-brand-muted hover:border-blue-800 hover:text-blue-800"
                    title={layoutFullscreen ? "Restore map" : "Expand map"}
                  >
                    {layoutFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutOpen(false)}
                    className="rounded-full border border-brand-border p-2 text-brand-muted hover:border-red-500 hover:text-red-600"
                    title="Close map"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <LayoutCanvasV3 />
              </div>
            </div>
          </div>
        )}
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
