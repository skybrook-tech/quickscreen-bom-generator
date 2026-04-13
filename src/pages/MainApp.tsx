import { useState, useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2,
  Wand2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { CanvasLayout } from "../components/canvas/canvasEngine";
import { AppShell } from "../components/layout/AppShell";
import { SavedQuotesList } from "../components/quote/SavedQuotesList";
import { FenceConfigForm } from "../components/fence/FenceConfigForm";
import { GateConfigPanel } from "../components/gate/GateConfigPanel";
import { BOMDisplay } from "../components/bom/BOMDisplay";
import { BOMSummary } from "../components/bom/BOMSummary";
import { QuoteActions } from "../components/quote/QuoteActions";
import { ContactDeliveryForm } from "../components/contact/ContactDeliveryForm";
import { AccordionSection } from "../components/shared/AccordionSection";
import { FenceLayoutCanvas } from "../components/canvas/FenceLayoutCanvas";
import { LayoutMinimap } from "../components/canvas/LayoutMinimap";
import { ErrorBoundary } from "../components/shared/ErrorBoundary";
import {
  FenceConfigProvider,
  useFenceConfig,
} from "../context/FenceConfigContext";
import { GateProvider, useGates } from "../context/GateContext";
import { useBOM } from "../hooks/useBOM";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { parseJobDescription } from "../utils/parseJobDescription";
import { applyBomOverrides } from "../utils/applyBomOverrides";
import { defaultContactInfo } from "../schemas/contact.schema";
import type { BOMOverrides } from "../utils/applyBomOverrides";
import type {
  BOMResult,
  PricingTier,
  ExtraItem,
  PostPosition,
} from "../types/bom.types";
import type { ContactInfo } from "../schemas/contact.schema";
import type { SavedQuote } from "../types/quote.types";

type ParseStatus =
  | { type: "success"; detected: string[] }
  | { type: "error"; message: string }
  | null;

function AppContent() {
  const { state: fenceConfig, dispatch: fenceDispatch } = useFenceConfig();
  const { gates, dispatch: gateDispatch } = useGates();
  const { user } = useAuth();

  const [pricingTier] = useState<PricingTier>("tier1");
  const [bomResult, setBomResult] = useState<BOMResult | null>(null);
  const [bomOverrides, setBomOverrides] = useState<BOMOverrides>(new Map());
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [postPositions, setPostPositions] = useState<PostPosition[] | null>(
    null,
  );
  const [contact, setContact] = useState<ContactInfo>(defaultContactInfo);
  const [notes, setNotes] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [layoutData, setLayoutData] = useState<CanvasLayout | null>(null);
  const [descText, setDescText] = useState("");
  const [parseStatus, setParseStatus] = useState<ParseStatus>(null);

  const bomMutation = useBOM();

  const fenceConfigRef = useRef(fenceConfig);
  fenceConfigRef.current = fenceConfig;
  const gatesRef = useRef(gates);
  gatesRef.current = gates;

  const ensureOrgId = useCallback(async () => {
    if (orgId) return orgId;
    const { data } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user?.id ?? "")
      .single();
    const id = data?.org_id ?? "";
    setOrgId(id);
    return id;
  }, [orgId, user?.id]);

  const handleGenerate = async () => {
    await ensureOrgId();
    setPostPositions(null);
    try {
      const result = await bomMutation.mutateAsync({
        fenceConfig: fenceConfigRef.current,
        gates: gatesRef.current,
        pricingTier,
      });
      setBomResult(result);
      setBomOverrides(new Map());
      // Forward post positions to the canvas if the edge function returned them
      if (result.postPositions && result.postPositions.length > 0) {
        setPostPositions(result.postPositions);
      }
      // extra items intentionally preserved across re-generate
    } catch (err) {
      console.error("[BOM] calculation failed:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "BOM calculation failed. Is Supabase running?";
      toast.error(msg);
    }
  };

  // Re-price existing BOM when tier changes (skip initial mount)
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (!bomResult) return;
    bomMutation
      .mutateAsync({ fenceConfig, gates, pricingTier })
      .then((result) => {
        setBomResult(result);
        setBomOverrides(new Map());
      })
      .catch(() => {});
  }, [pricingTier]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQtyChange = useCallback((key: string, qty: number) => {
    setBomOverrides((prev) => new Map(prev).set(key, qty));
  }, []);

  const handleAddExtraItem = useCallback((item: ExtraItem) => {
    setExtraItems((prev) => [...prev, item]);
  }, []);

  const handleRemoveExtraItem = useCallback((id: string) => {
    setExtraItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleUpdateExtraItem = useCallback(
    (id: string, updates: Partial<ExtraItem>) => {
      setExtraItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      );
    },
    [],
  );

  const handleLoadQuote = (quote: SavedQuote) => {
    fenceDispatch({ type: "LOAD_FROM_QUOTE", config: quote.fence_config });
    gateDispatch({ type: "SET_GATES", gates: quote.gates });
    setBomResult(quote.bom);
    setBomOverrides(new Map());
    setExtraItems([]);
    setContact(quote.contact ?? defaultContactInfo);
    setNotes(quote.notes ?? "");
    setOrgId(quote.org_id);
    setShowSaved(false);
  };

  const handleParse = () => {
    if (!descText.trim()) return;
    const { config, detected } = parseJobDescription(descText);
    if (detected.length === 0) {
      setParseStatus({
        type: "error",
        message: "Nothing detected — try describing the job differently.",
      });
    } else {
      fenceDispatch({ type: "SET_CONFIG", config });
      setParseStatus({ type: "success", detected });
    }
  };

  const effectiveBom = bomResult
    ? applyBomOverrides(bomResult, bomOverrides, extraItems)
    : null;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      bomResult !== null && currentLocation.pathname !== nextLocation.pathname,
  );

  const errorMessage =
    bomMutation.error instanceof Error
      ? bomMutation.error.message
      : "BOM calculation failed. Is Supabase running?";

  return (
    <>
      <ErrorBoundary label="App">
        <div className="space-y-4">
          {/* ── Top row: Canvas + Parser ──────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <AccordionSection
              title="Fence Layout"
              badge="draw"
              defaultOpen={false}
            >
              <ErrorBoundary label="Layout Tool">
                <FenceLayoutCanvas
                  onApplied={(layout) => {
                    setLayoutData(layout);
                    // Generate a layout summary note and inject it into the
                    // job description textarea, mirroring the original HTML behaviour.
                    const runSummary = layout.runs
                      .map(
                        (r) =>
                          `${r.label}: ${r.totalLengthM.toFixed(2)}m, ${r.cornerCount} corner${r.cornerCount !== 1 ? "s" : ""}, ${r.gates.length} gate${r.gates.length !== 1 ? "s" : ""}`,
                      )
                      .join("; ");
                    const note = `[Layout: ${layout.runs.length} run${layout.runs.length !== 1 ? "s" : ""} — ${runSummary}]`;
                    setDescText((prev) => {
                      // Replace an existing layout note if present, otherwise prepend
                      if (prev.startsWith("[Layout:")) {
                        return (
                          note +
                          prev
                            .replace(/^\[Layout:[^\]]*\]\n?/, "\n")
                            .trimStart()
                        );
                      }
                      return note + (prev ? "\n" + prev : "");
                    });
                  }}
                  postPositions={postPositions}
                />
              </ErrorBoundary>
            </AccordionSection>

            <AccordionSection
              title="Describe the Job"
              badge="parse"
              defaultOpen={true}
            >
              <div className="space-y-3">
                <textarea
                  value={descText}
                  onChange={(e) => {
                    setDescText(e.target.value);
                    setParseStatus(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                      handleParse();
                  }}
                  rows={6}
                  placeholder='e.g. "20m run of QSHS horizontal slat fence, 1800mm high, surfmist matt, concreted in ground, post-to-post, 2 corners, one single swing gate 900mm wide"'
                  className="w-full px-3 py-2.5 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none leading-relaxed"
                />
                <p className="text-xs text-brand-muted">
                  Include run length, height, colour, system type, post
                  mounting, terminations, corners, and gate info.
                </p>
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={!descText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                >
                  <Wand2 size={14} />
                  Parse Description
                </button>
                {parseStatus?.type === "success" && (
                  <div className="flex items-start gap-1.5 text-sm text-green-400 animate-fade-in">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    <span>Detected: {parseStatus.detected.join(", ")}</span>
                  </div>
                )}
                {parseStatus?.type === "error" && (
                  <div className="flex items-center gap-1.5 text-sm text-amber-400 animate-fade-in">
                    <AlertCircle size={14} />
                    <span>{parseStatus.message}</span>
                  </div>
                )}
              </div>
            </AccordionSection>
          </div>

          {/* ── Bottom row: Config + BOM ──────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Left: Fence config + Gates */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                <div className="p-5 space-y-5">
                  <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                    Fence Configuration
                  </h3>
                  <FenceConfigForm onGenerate={handleGenerate} />
                </div>

                <div className="border-t border-brand-border p-5 space-y-4">
                  <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                    Gates
                    {gates.length > 0 && (
                      <span className="ml-2 text-brand-accent normal-case font-medium tracking-normal text-[10px] bg-brand-accent/10 px-1.5 py-0.5 rounded-full">
                        {gates.length} added
                      </span>
                    )}
                  </h3>
                  <GateConfigPanel />
                </div>

                <div className="border-t border-brand-border p-5 space-y-4">
                  <button
                    type="submit"
                    form="fence-config-form"
                    disabled={bomMutation.isPending}
                    data-testid="generate-bom-btn"
                    className="w-full py-3.5 px-6 bg-brand-accent hover:bg-brand-accent-hover active:bg-brand-accent-hover disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-150 text-sm tracking-wide shadow-sm hover:shadow-md hover:shadow-brand-accent/20 flex items-center justify-center gap-2"
                  >
                    {bomMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Generating BOM…
                      </>
                    ) : (
                      "Generate BOM →"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: BOM results (sticky) */}
            <div className="lg:col-span-1 sticky top-6 space-y-4">
              {/* BOM error */}
              {bomMutation.isError && !bomMutation.isPending && (
                <div className="bg-brand-card border border-red-900/40 rounded-xl p-4">
                  <p className="text-sm text-red-400">{errorMessage}</p>
                </div>
              )}

              {/* BOM loading */}
              {bomMutation.isPending && (
                <div className="bg-brand-card border border-brand-border rounded-xl p-6 flex items-center justify-center gap-2 text-sm text-brand-muted">
                  <Loader2 size={16} className="animate-spin" />
                  Calculating BOM…
                </div>
              )}

              {/* BOM empty state */}
              {!effectiveBom &&
                !bomMutation.isPending &&
                !bomMutation.isError && (
                  <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-center space-y-2">
                    <FileText
                      size={28}
                      className="mx-auto text-brand-muted/40"
                    />
                    <p className="text-sm font-medium text-brand-muted">
                      No BOM yet
                    </p>
                    <p className="text-xs text-brand-muted/60">
                      Configure your fence and click Generate BOM
                    </p>
                  </div>
                )}

              {layoutData && <LayoutMinimap layout={layoutData} />}

              {/* BOM result */}
              {effectiveBom && (
                <ErrorBoundary label="Bill of Materials">
                  <div className="border border-brand-border rounded-xl bg-brand-card">
                    <div className="px-4 py-3 border-b border-brand-border rounded-t-xl overflow-hidden">
                      <h2 className="text-sm font-semibold text-brand-text">
                        Bill of Materials
                      </h2>
                    </div>
                    <BOMDisplay
                      result={bomResult!}
                      overrides={bomOverrides}
                      onQtyChange={handleQtyChange}
                      extraItems={extraItems}
                      onAddExtraItem={handleAddExtraItem}
                      onRemoveExtraItem={handleRemoveExtraItem}
                      onUpdateExtraItem={handleUpdateExtraItem}
                    />
                  </div>
                </ErrorBoundary>
              )}

              {/* Summary + Quote Actions */}
              <div className="space-y-4 bg-brand-card rounded-xl border border-brand-border p-4">
                {effectiveBom && <BOMSummary result={effectiveBom} />}
                <QuoteActions
                  fenceConfig={fenceConfig}
                  gates={gates}
                  bom={effectiveBom ?? undefined}
                  contact={contact}
                  customerRef={fenceConfig.customerRef ?? ""}
                  notes={notes}
                  orgId={orgId}
                  onShowSaved={() => setShowSaved(true)}
                />
              </div>

              <AccordionSection
                title="Contact & Delivery"
                badge="optional"
                defaultOpen={false}
              >
                <ContactDeliveryForm
                  onChange={setContact}
                  initialValues={contact}
                />
              </AccordionSection>

              <AccordionSection
                title="Quote Notes (Internal)"
                defaultOpen={false}
              >
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Internal notes for this quote…"
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
                />
              </AccordionSection>
            </div>
          </div>
        </div>
      </ErrorBoundary>

      {showSaved && (
        <SavedQuotesList
          onLoad={handleLoadQuote}
          onClose={() => setShowSaved(false)}
        />
      )}

      {blocker.state === "blocked" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-base font-semibold text-brand-text">
              Leave this page?
            </h2>
            <p className="text-sm text-brand-muted">
              Your progress will be lost. Are you sure you want to leave?
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => blocker.reset()}
                className="px-4 py-2 text-sm font-medium text-brand-muted hover:text-brand-text border border-brand-border rounded-lg transition-colors"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => blocker.proceed()}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MainApp() {
  return (
    <FenceConfigProvider>
      <GateProvider>
        <AppShell>
          <div className="p-4 sm:p-6 pb-12">
            <div className="max-w-7xl mx-auto">
              <AppContent />
            </div>
          </div>
        </AppShell>
      </GateProvider>
    </FenceConfigProvider>
  );
}
