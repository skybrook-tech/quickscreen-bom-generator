import { AppShell } from "../components/layout/AppShell";
import { AccordionSection } from "../components/shared/AccordionSection";
import {
  CalculatorProvider,
  useCalculator,
} from "../context/CalculatorContext";
import { FenceConfigProvider } from "../context/FenceConfigContext";
import { GateProvider } from "../context/GateContext";
import { ProductSelectV3 } from "../components/calculator-v3/ProductSelectV3";
import { DefaultSettings } from "../components/calculator-v3/DefaultSettings";
import { RunListV3 } from "../components/calculator-v3/RunListV3";
import { LayoutCanvasV3 } from "../components/calculator-v3/LayoutCanvasV3";
import { ExtraItemsPanel } from "../components/calculator-v3/ExtraItemsPanel";
import { SavedJobsPanel } from "../components/calculator-v3/SavedJobsPanel";
import { BOMResultTabs } from "../components/shared/BOMResultTabs";
import { BOMExportActions } from "../components/quote/BOMExportActions";
import { useBomCalculator } from "../hooks/useBomCalculator";
import { useJobs } from "../hooks/useJobs";
import {
  clearDraft,
  formatDraftAge,
  readDraft,
  writeDraft,
  type CalculatorDraft,
} from "../lib/draftStore";
import { Loader2, Save } from "lucide-react";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import type {
  CalculatorBOMResult,
  BOMLineItem,
  ExtraItem,
  SegmentDiagnostic,
} from "../types/bom.types";

function CalculatorV3Content() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const bomMutation = useBomCalculator();
  const { jobs, saveJob, deleteJob } = useJobs();
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [removedSkus, setRemovedSkus] = useState<Set<string>>(new Set());
  const [qtyOverrides, setQtyOverrides] = useState<Map<string, number>>(new Map());
  const [jobName, setJobName] = useState("");
  const [jobNameError, setJobNameError] = useState("");
  const [draftPrompt, setDraftPrompt] = useState<CalculatorDraft | null>(null);
  const lastDraftSnapshotRef = useRef("");
  const draftDataRef = useRef<CalculatorDraft & { snapshot: string }>({
    jobName: "",
    payload: null,
    bomResult: null,
    extraItems: [],
    savedAt: "",
    snapshot: "",
  });

  const handleRemoveSku = useCallback((sku: string) => {
    setRemovedSkus((prev) => new Set([...prev, sku]));
  }, []);

  const handleRestoreAll = useCallback(() => {
    setRemovedSkus(new Set());
  }, []);

  const handleQtyChange = useCallback((sku: string, qty: number) => {
    setQtyOverrides((prev) => {
      const next = new Map(prev);
      next.set(sku, qty);
      return next;
    });
  }, []);

  const draftSnapshot = useMemo(
    () =>
      JSON.stringify({
        jobName,
        payload,
        bomResult: state.bomResult,
        extraItems,
      }),
    [extraItems, jobName, payload, state.bomResult],
  );

  async function handleGenerateBOM() {
    if (!payload) return;
    setExtraItems([]);
    setRemovedSkus(new Set());
    setQtyOverrides(new Map());
    try {
      const result = await bomMutation.mutateAsync({ payload });
      dispatch({ type: "SET_BOM_RESULT", result });
    } catch {
      // Error is available via bomMutation.error
    }
  }

  // Convert v3 result into the shape BOMResultTabs expects.
  // Extra items merge into allItems and contribute to totals.
  const lastBom = state.bomResult;

  const bomResultForTabs: CalculatorBOMResult | null = lastBom
    ? (() => {
        const baseAllItems = (lastBom.lines as BOMLineItem[]) ?? [];
        const baseTotal =
          (lastBom.totals as { subtotal?: number })?.subtotal ?? 0;
        const extraLineItems: BOMLineItem[] = extraItems.map((e) => ({
          category: "accessory",
          sku: e.sku ?? e.id,
          name: e.description,
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
            (lastBom.runResults as Array<{
              runId: string;
              items: BOMLineItem[];
            }>) ?? []
          ).map((r) => ({ runId: r.runId, items: r.items })),
          gateItems: (lastBom.gateItems as BOMLineItem[]) ?? [],
          allItems: [...baseAllItems, ...extraLineItems],
          total,
          gst,
          grandTotal: total + gst,
          pricingTier:
            (lastBom.pricingTier as CalculatorBOMResult["pricingTier"]) ??
            "tier1",
          generatedAt:
            (lastBom.generatedAt as string) ?? new Date().toISOString(),
          segmentDiagnostics:
            (lastBom.segmentDiagnostics as SegmentDiagnostic[]) ?? [],
        };
      })()
    : null;

  useEffect(() => {
    const draft = readDraft();
    if (draft && (draft.payload || draft.jobName.trim())) {
      setDraftPrompt(draft);
    }
  }, []);

  useEffect(() => {
    draftDataRef.current = {
      jobName,
      payload,
      bomResult: state.bomResult,
      extraItems,
      savedAt: "",
      snapshot: draftSnapshot,
    };
  }, [draftSnapshot, extraItems, jobName, payload, state.bomResult]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = draftDataRef.current;
      if (!current.payload && !current.jobName.trim()) return;
      if (current.snapshot === lastDraftSnapshotRef.current) return;
      writeDraft({
        jobName: current.jobName,
        payload: current.payload,
        bomResult: current.bomResult,
        extraItems: current.extraItems,
        savedAt: new Date().toISOString(),
      });
      lastDraftSnapshotRef.current = current.snapshot;
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  function handleResumeDraft() {
    if (!draftPrompt) return;
    if (draftPrompt.payload) {
      dispatch({ type: "SET_PAYLOAD", payload: draftPrompt.payload });
    }
    dispatch({ type: "SET_BOM_RESULT", result: draftPrompt.bomResult });
    setExtraItems(draftPrompt.extraItems ?? []);
    setRemovedSkus(new Set());
    setQtyOverrides(new Map());
    setJobName(draftPrompt.jobName);
    setJobNameError("");
    setDraftPrompt(null);
    lastDraftSnapshotRef.current = JSON.stringify({
      jobName: draftPrompt.jobName,
      payload: draftPrompt.payload,
      bomResult: draftPrompt.bomResult,
      extraItems: draftPrompt.extraItems ?? [],
    });
    toast.success("Draft restored");
  }

  function handleDiscardDraft() {
    clearDraft();
    setDraftPrompt(null);
    toast.info("Draft discarded");
  }

  function handleSaveJob() {
    const cleanName = jobName.trim();
    if (!cleanName) {
      const message = "Enter a job name before saving.";
      setJobNameError(message);
      toast.error(message);
      return;
    }
    if (!payload) {
      toast.error("Select a product before saving a job.");
      return;
    }

    const savedJob = saveJob({
      name: cleanName,
      payload,
      bomResult: state.bomResult,
      extraItems,
      totalCost: bomResultForTabs?.grandTotal ?? 0,
    });
    clearDraft();
    lastDraftSnapshotRef.current = draftSnapshot;
    toast.success(`Saved as "${savedJob.name}" · Just now`);
  }

  function handleLoadJob(jobId: string) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) return;
    dispatch({ type: "SET_PAYLOAD", payload: job.payload });
    dispatch({ type: "SET_BOM_RESULT", result: job.bomResult });
    setExtraItems(job.extraItems ?? []);
    setRemovedSkus(new Set());
    setQtyOverrides(new Map());
    setJobName(job.name);
    setJobNameError("");
    toast.success(`Loaded "${job.name}"`);
  }

  const warnings = (lastBom?.warnings as string[]) ?? [];
  const errors = (lastBom?.errors as string[]) ?? [];
  const hasErrors = errors.length > 0;
  const noSegments =
    !payload || payload.runs.every((r) => r.segments.length === 0);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {draftPrompt && (
          <div className="rounded-lg border border-brand-accent/40 bg-brand-accent/10 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-text">
                  Resume unsaved draft from {formatDraftAge(draftPrompt.savedAt)}?
                </p>
                <p className="mt-1 text-xs text-brand-muted">
                  {draftPrompt.jobName || "Untitled job"} ·{" "}
                  {draftPrompt.payload?.runs.length ?? 0}{" "}
                  {(draftPrompt.payload?.runs.length ?? 0) === 1 ? "run" : "runs"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResumeDraft}
                  className="rounded-lg bg-brand-accent px-3 py-2 text-sm font-medium text-white hover:bg-brand-accent/90"
                >
                  Resume draft
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="rounded-lg border border-brand-border px-3 py-2 text-sm font-medium text-brand-muted hover:bg-brand-border/20"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        <AccordionSection title="Job" defaultOpen>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-brand-muted">
                  Job name
                </span>
                <input
                  type="text"
                  value={jobName}
                  onChange={(event) => {
                    setJobName(event.target.value);
                    if (jobNameError) setJobNameError("");
                  }}
                  placeholder="e.g. Smith Street front fence"
                  className="rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-medium text-brand-text outline-none transition-colors focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50"
                />
                {jobNameError && (
                  <span className="text-xs font-medium text-brand-muted">
                    {jobNameError}
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={handleSaveJob}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent/90 md:mt-5"
              >
                <Save size={16} />
                Save Job
              </button>
            </div>

            <SavedJobsPanel
              jobs={jobs}
              onLoad={(job) => handleLoadJob(job.id)}
              onDelete={(id) => {
                deleteJob(id);
                toast.success("Saved job removed");
              }}
            />
          </div>
        </AccordionSection>

        {/* Product Selection */}
        <AccordionSection title="Product" defaultOpen>
          <ProductSelectV3 />
        </AccordionSection>

        {payload && (
          <>
            {/* Job Settings — data-driven from product_variables + hardcoded universal fields */}
            <AccordionSection
              title="Default Settings"
              badge="Defaults applied to each new segment"
              defaultOpen
            >
              <DefaultSettings />
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

            {/* Runs & Segments (includes gates via Add gate) */}
            <AccordionSection title="Runs & Segments" defaultOpen>
              <RunListV3 />
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
                className="w-full flex items-center justify-center px-8 py-3 bg-brand-accent text-white rounded-lg font-medium hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <BOMResultTabs
                  result={bomResultForTabs}
                  removedSkus={removedSkus}
                  onRemove={handleRemoveSku}
                  onRestoreAll={handleRestoreAll}
                  qtyOverrides={qtyOverrides}
                  onQtyChange={handleQtyChange}
                />
                <div className="mt-4 border-t border-brand-border pt-4">
                  <BOMExportActions
                    result={bomResultForTabs}
                    removedSkus={removedSkus}
                    qtyOverrides={qtyOverrides}
                  />
                </div>
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
