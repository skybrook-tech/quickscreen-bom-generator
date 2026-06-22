import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";
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
import { LayoutSegmentHighlightProvider } from "../components/calculator-v4/LayoutMap/LayoutSegmentHighlightContext";
import { useLayoutSegmentHighlight } from "../components/calculator-v4/LayoutMap/LayoutSegmentHighlightContext";
import { BomPanel } from "../components/calculator-v4/Bom/BomPanel";
import { toast } from "sonner";
import { useBomCalculator } from "../hooks/useBomCalculator";
import { useEmbedBridge } from "../hooks/useEmbedBridge";
import { useEmbedQuote } from "../hooks/useEmbedQuote";
import { PoweredBySkybrook } from "../components/embed/PoweredBySkybrook";
import { ProductSelectV4 } from "../components/calculator-v4/JobShell/ProductSelectV4";
import { CalculatorLogicModal } from "../components/calculator-v4/RunCard/CalculatorLogicModal";
import { supabase } from "../lib/supabase";
import { useQuote } from "../hooks/useQuote";
import {
  createInitialMasterFenceSegment,
  syncRunVariablesFromMaster,
} from "../lib/masterFenceSegment";
import type { TenantTheme } from "../lib/tenantThemes";
import type { CanonicalPayload, CanonicalSegment } from "../types/canonical.types";

/**
 * Embed render config — present only when CalculatorV4Page is mounted on the
 * anonymous `/embed/:orgSlug` route. When set, the page renders chromeless
 * (no AppShell header/nav), themes from the resolved org instead of the
 * signed-in profile, calculates the BOM anonymously, and posts lifecycle
 * events to the parent window.
 */
export interface EmbedRenderConfig {
  orgSlug: string;
  theme: TenantTheme | null;
}

/**
 * v4 calculator. Two-column layout: job/runs on the left, BOM on the right.
 * Layout map and gate forms surface as right-side slide-out panes.
 *
 * Routing: /fence-calculator-v4 (authenticated) and /embed/:orgSlug (anon embed).
 */
function CalculatorV4Content({ embed }: { embed?: EmbedRenderConfig }) {
  const embedMode = !!embed;
  const { state, dispatch } = useCalculatorV4();
  const payload = state.payload;
  const bomMutation = useBomCalculator(embed?.orgSlug);
  const location = useLocation();
  const { tenantTheme } = useProfile();
  const theme = embed ? embed.theme : tenantTheme;

  const embedRootRef = useRef<HTMLDivElement>(null);
  const { postQuoteCreated } = useEmbedBridge(embedRootRef, embedMode);
  const embedQuote = useEmbedQuote(embed?.orgSlug ?? "");

  // Load from query parameters if present
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const paramJobId = queryParams.get("jobId") || queryParams.get("job_id");
  const paramQuoteId = queryParams.get("quoteId") || queryParams.get("quote_id");
  
  const [resolvedQuoteId, setResolvedQuoteId] = useState<string | null>(paramQuoteId);
  const [loadingQuoteId, setLoadingQuoteId] = useState(false);
  const [checkedQuote, setCheckedQuote] = useState(false);

  // Fetch quote ID from jobId if no quoteId was explicitly passed
  useEffect(() => {
    if (!paramJobId || resolvedQuoteId || loadingQuoteId || checkedQuote) return;
    
    async function fetchQuoteId() {
      setLoadingQuoteId(true);
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("id")
          .eq("job_id", paramJobId)
          .maybeSingle();
        if (error) throw error;
        if (data?.id) {
          setResolvedQuoteId(data.id);
        }
      } catch (err) {
        console.error("Failed to fetch quote for job:", err);
      } finally {
        setLoadingQuoteId(false);
        setCheckedQuote(true);
      }
    }
    
    fetchQuoteId();
  }, [paramJobId, resolvedQuoteId, loadingQuoteId, checkedQuote]);

  // Use the useQuote hook to load the resolved quote data
  const { data: quoteData, isLoading: quoteLoading } = useQuote(resolvedQuoteId || undefined);

  useEffect(() => {
    if (!quoteData) return;
    if (quoteData.payload) {
      dispatch({ type: "INIT_PAYLOAD", payload: quoteData.payload });
    }
    dispatch({ type: "SET_SAVED_QUOTE_ID", id: quoteData.quote.id });
  }, [quoteData, dispatch]);

  // Embed save path: anon can't write `quotes` directly, so persist via the
  // service-role edge function, then notify the host page (totals only).
  async function handleEmbedSave() {
    if (!embed) return;
    if (!state.payload) {
      toast.warning("Add a fence run before requesting a quote.");
      return;
    }
    try {
      const result = await embedQuote.mutateAsync({
        jobName: state.jobName,
        quoteDetails: state.quoteDetails,
        payload: state.payload,
        bomResult: state.bomResult,
      });
      dispatch({ type: "SET_SAVED_QUOTE_ID", id: result.quoteId });
      postQuoteCreated(result.quoteId, result.totalIncGst, result.productCount);
      toast.success("Your enquiry has been sent.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send your enquiry.",
      );
    }
  }

  // Load a job that was navigated in from the Quotes history page
  useEffect(() => {
    const incoming = (location.state as { v4Payload?: unknown; savedQuoteId?: string } | null);
    if (!incoming?.v4Payload) return;
    dispatch({ type: "INIT_PAYLOAD", payload: incoming.v4Payload as import("../types/canonical.types").CanonicalPayload });
    if (incoming.savedQuoteId) {
      dispatch({ type: "SET_SAVED_QUOTE_ID", id: incoming.savedQuoteId });
    }
    // Clear router state so a page refresh doesn't re-apply
    window.history.replaceState({}, "", location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layoutHl = useLayoutSegmentHighlight();
  const [layoutOpen, setLayoutOpen] = useState(false);

  const showLoader = quoteLoading || (paramJobId && !resolvedQuoteId && loadingQuoteId);

  if (showLoader) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-brand-bg text-brand-text">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8.5 h-8.5 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-brand-muted">Loading Visual Calculator...</span>
        </div>
      </div>
    );
  }

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
    const jobVariables = {
      finish_type: "standard" as const,
      finish_family: "standard" as const,
    };
    const master = createInitialMasterFenceSegment({
      segmentId: crypto.randomUUID(),
      productCode,
      jobVariables,
    });
    const initialPayload: CanonicalPayload = {
      productCode: productCode,
      schemaVersion: "v2",
      // Job-level variables intentionally minimal in v4 — finish_type kept
      // because some product_variables `visible_when_json` rules depend on it.
      // Master fence segment + mirrored run.variables are seeded by MasterFenceVariableSeeds.
      variables: jobVariables,
      runs: [
        syncRunVariablesFromMaster({
          runId,
          productCode,
          variables: {},
          segments: [master],
        }),
      ],
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

  function handleAddGate(runId: string) {
    const newSegmentId = crypto.randomUUID();
    const run = state.payload?.runs.find((r) => r.runId === runId);
    const newSegment: CanonicalSegment = {
      segmentId: newSegmentId,
      sortOrder: run?.segments.length ?? 0,
      kind: "gate",
      productCode: "QS_GATE",
      segmentWidthMm: 900,
      targetHeightMm: 1800,
      leftTermination: { kind: "system" },
      rightTermination: { kind: "system" },
      variables: {
        gate_movement: "single_swing",
        gate_build: "qsg_hinged_horizontal",
        gate_post_size_mm: "50",
        opening_direction: "out",
        hinge_type: "ML-TL-TC-H-AT",
        latch_sku: "none",
        drop_bolt_sku: "none",
        gate_stop_sku: "none",
      },
    };
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: newSegment });
    layoutHl?.requestOpenSegment(runId, newSegmentId);
  }

  // In embed mode the calculator must flow to its natural height so the iframe
  // auto-resizes (no viewport-height caps / inner scroll). The authenticated app
  // keeps the fixed-viewport, inner-scrolling shell.
  const gridClass = embedMode
    ? "grid grid-cols-1 lg:grid-cols-[40%,60%] gap-4 p-4 max-w-[1600px] mx-auto"
    : "h-full min-h-0 grid grid-cols-1 lg:grid-cols-[40%,60%] lg:grid-rows-1 gap-4 p-4 max-w-[1600px] mx-auto";
  const leftColClass = embedMode
    ? "flex flex-col"
    : "flex h-full max-h-[calc(100dvh-5.5rem)] min-h-0 flex-col";
  const runsRegionClass = embedMode
    ? "pr-1 py-3 space-y-4"
    : "min-h-0 flex-1 overflow-y-auto pr-1 py-3 space-y-4";
  const rightColClass = embedMode
    ? "min-h-[640px]"
    : "lg:sticky lg:top-0 lg:h-full min-h-[640px]";

  const calculatorBody = (
    <>
      <div className={gridClass}>
        {/* Left column — JobShell + JobActions pin; runs list scrolls.
          Cap height so inner scroll works even when the BOM column is shorter than the runs list. */}
        <div className={leftColClass}>
          <div className="shrink-0">
            <JobShell
              onOpenLayoutMap={() => setLayoutOpen(true)}
              hasPayload={!!payload}
            />
          </div>
          {payload ? (
            <>
              <div className={runsRegionClass}>
                <RunList onAddGate={handleAddGate} />
                {bomMutation.isError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-500">
                    Error:{" "}
                    {bomMutation.error instanceof Error
                      ? bomMutation.error.message
                      : String(bomMutation.error)}
                  </div>
                )}
              </div>
              <div className="shrink-0 border-t border-brand-border/50 bg-brand-bg pt-3 pb-1">
                <JobActions onSave={embedMode ? handleEmbedSave : undefined} jobId={paramJobId} />
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
              <p className="text-brand-text">Pick a fence product to begin.</p>
              <ProductSelectV4
                value={state.payload?.productCode ?? ""}
                onChange={handleProductChange}
                separated={true}
              />
            </div>
          )}
        </div>

        {/* Right column — BOM panel */}
        <div className={rightColClass}>
          <BomPanel
            isPending={bomMutation.isPending}
            onGenerate={handleGenerate}
            canGenerate={canGenerate}
            errors={errors}
            warnings={warnings}
          />
        </div>
      </div>

      <LayoutMapPane
        open={layoutOpen}
        onClose={() => setLayoutOpen(false)}
        onAddGate={handleAddGate}
      />
    </>
  );

  if (embedMode) {
    return (
      <div
        ref={embedRootRef}
        style={theme?.cssVars as React.CSSProperties | undefined}
        className="min-h-[480px] bg-brand-bg text-brand-text"
      >
        {calculatorBody}
        <PoweredBySkybrook />
        {state.openLogicEditorProductCode && (
          <CalculatorLogicModal
            productCode={state.openLogicEditorProductCode}
            onClose={() => dispatch({ type: "CLOSE_LOGIC_EDITOR" })}
          />
        )}
      </div>
    );
  }

  return (
    <div style={theme?.cssVars as React.CSSProperties | undefined}>
      <AppShell branding={theme?.branding}>{calculatorBody}</AppShell>
      {state.openLogicEditorProductCode && (
        <CalculatorLogicModal
          productCode={state.openLogicEditorProductCode}
          onClose={() => dispatch({ type: "CLOSE_LOGIC_EDITOR" })}
        />
      )}
    </div>
  );
}

export function CalculatorV4Page({ embed }: { embed?: EmbedRenderConfig } = {}) {
  return (
    <CalculatorV4Provider>
      {/* FenceConfigProvider + GateProvider required by the shared canvas
          component (FenceLayoutCanvas) reused inside LayoutMapPane. They are
          unused by v4 reducers — the v4 source of truth is CalculatorContextV4. */}
      <FenceConfigProvider>
        <GateProvider>
          <LayoutSegmentHighlightProvider>
            <CalculatorV4Content embed={embed} />
          </LayoutSegmentHighlightProvider>
        </GateProvider>
      </FenceConfigProvider>
    </CalculatorV4Provider>
  );
}
