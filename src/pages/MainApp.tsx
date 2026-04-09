import { useState, useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import { toast } from "sonner";
import type { CanvasLayout } from "../components/canvas/canvasEngine";
import { AppShell } from "../components/layout/AppShell";
import { SavedQuotesList } from "../components/quote/SavedQuotesList";
import { WizardStepIndicator } from "../components/wizard/WizardStepIndicator";
import { EntryStep } from "../components/wizard/EntryStep";
import { LayoutStep } from "../components/wizard/LayoutStep";
import { ParseStep } from "../components/wizard/ParseStep";
import { ConfigureStep } from "../components/wizard/ConfigureStep";
import { BOMStep } from "../components/wizard/BOMStep";
import {
  FenceConfigProvider,
  useFenceConfig,
} from "../context/FenceConfigContext";
import { GateProvider, useGates } from "../context/GateContext";
import { ErrorBoundary } from "../components/shared/ErrorBoundary";
import { useBOM } from "../hooks/useBOM";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { defaultContactInfo } from "../schemas/contact.schema";
import type { BOMOverrides } from "../utils/applyBomOverrides";
import type { BOMResult, PricingTier } from "../types/bom.types";
import type { ContactInfo } from "../schemas/contact.schema";
import type { SavedQuote } from "../types/quote.types";

type WizardStep = "entry" | "layout" | "parse" | "configure" | "bom";

const DEFAULT_STEP_ORDER: WizardStep[] = ["entry", "configure", "bom"];
const LAYOUT_STEP_ORDER: WizardStep[] = ["entry", "layout", "configure", "bom"];
const PARSE_STEP_ORDER: WizardStep[] = ["entry", "parse", "configure", "bom"];

interface AppContentProps {
  step: WizardStep;
  stepOrder: WizardStep[];
  setStep: (s: WizardStep) => void;
  setStepOrder: (order: WizardStep[]) => void;
}

function AppContent({ step, stepOrder, setStep, setStepOrder }: AppContentProps) {
  const { state: fenceConfig, dispatch: fenceDispatch } = useFenceConfig();
  const { gates, dispatch: gateDispatch } = useGates();
  const { user } = useAuth();

  const [pricingTier] = useState<PricingTier>("tier1");
  const [bomResult, setBomResult] = useState<BOMResult | null>(null);
  const [bomOverrides, setBomOverrides] = useState<BOMOverrides>(new Map());
  const [contact, setContact] = useState<ContactInfo>(defaultContactInfo);
  const [notes, setNotes] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [layoutData, setLayoutData] = useState<CanvasLayout | null>(null);

  const bomMutation = useBOM();

  // Keep refs to always-current config/gates so handleGenerate reads the
  // latest values regardless of closure capture timing.
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
    try {
      const result = await bomMutation.mutateAsync({
        fenceConfig: fenceConfigRef.current,
        gates: gatesRef.current,
        pricingTier,
      });
      setBomResult(result);
      setBomOverrides(new Map());
      setStep("bom");
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

  const handleLoadQuote = (quote: SavedQuote) => {
    fenceDispatch({ type: "LOAD_FROM_QUOTE", config: quote.fence_config });
    gateDispatch({ type: "SET_GATES", gates: quote.gates });
    setBomResult(quote.bom);
    setBomOverrides(new Map());
    setContact(quote.contact ?? defaultContactInfo);
    setNotes(quote.notes ?? "");
    setOrgId(quote.org_id);
    setShowSaved(false);
    setStep("bom");
  };

  const errorMessage =
    bomMutation.error instanceof Error
      ? bomMutation.error.message
      : "BOM calculation failed. Is Supabase running?";

  const handleBackToEntry = () => {
    setStepOrder(DEFAULT_STEP_ORDER);
    setStep("entry");
  };

  return (
    <>
      <ErrorBoundary label="App">
        {step === "entry" && (
          <EntryStep
            onStartManual={() => {
              setStepOrder(DEFAULT_STEP_ORDER);
              setStep("configure");
            }}
            onStartLayout={() => {
              setStepOrder(LAYOUT_STEP_ORDER);
              setStep("layout");
            }}
            onStartDescribe={() => {
              setStepOrder(PARSE_STEP_ORDER);
              setStep("parse");
            }}
          />
        )}

        {/* Keep mounted once chosen so canvas/text state survives going back */}
        {stepOrder.includes("layout") && (
          <div className={step === "layout" ? "" : "hidden"}>
            <LayoutStep
              onBack={handleBackToEntry}
              onApplied={(layout) => {
                setLayoutData(layout);
                setStep("configure");
              }}
            />
          </div>
        )}

        {stepOrder.includes("parse") && (
          <div className={step === "parse" ? "" : "hidden"}>
            <ParseStep
              onBack={handleBackToEntry}
              onContinue={(desc) => {
                if (desc.trim()) setNotes(desc);
                setStep("configure");
              }}
            />
          </div>
        )}

        {step === "configure" && (
          <ConfigureStep
            onBack={() => {
              const idx = stepOrder.indexOf("configure");
              setStep(stepOrder[idx - 1] ?? "entry");
            }}
            onGenerate={handleGenerate}
            isGenerating={bomMutation.isPending}
            layoutData={layoutData ?? undefined}
          />
        )}

        {step === "bom" && (
          <BOMStep
            bomResult={bomResult}
            isPending={bomMutation.isPending}
            isError={bomMutation.isError}
            errorMessage={errorMessage}
            overrides={bomOverrides}
            onQtyChange={handleQtyChange}

            fenceConfig={fenceConfig}
            gates={gates}
            contact={contact}
            onContactChange={setContact}
            notes={notes}
            onNotesChange={setNotes}
            orgId={orgId}
            onShowSaved={() => setShowSaved(true)}
            onBack={() => setStep("configure")}
            layoutData={layoutData ?? undefined}
          />
        )}
      </ErrorBoundary>

      {showSaved && (
        <SavedQuotesList
          onLoad={handleLoadQuote}
          onClose={() => setShowSaved(false)}
        />
      )}
    </>
  );
}

export function MainApp() {
  const [step, setStep] = useState<WizardStep>("entry");
  const [stepOrder, setStepOrder] = useState<WizardStep[]>(DEFAULT_STEP_ORDER);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      step !== "entry" && currentLocation.pathname !== nextLocation.pathname
  );

  const handleStepClick = (s: string) => {
    if (stepOrder.indexOf(s as WizardStep) < stepOrder.indexOf(step)) {
      setStep(s as WizardStep);
    }
  };

  return (
    <FenceConfigProvider>
      <GateProvider>
        <AppShell
          topBar={
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
              <div className="flex-1">
                <WizardStepIndicator
                  currentStep={step}
                  steps={stepOrder}
                  onStepClick={handleStepClick}
                />
              </div>
            </div>
          }
        >
          <div className="p-4 sm:p-6 pb-12">
            <div className="max-w-7xl mx-auto">
              <AppContent step={step} stepOrder={stepOrder} setStep={setStep} setStepOrder={setStepOrder} />
            </div>
          </div>
        </AppShell>

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
      </GateProvider>
    </FenceConfigProvider>
  );
}
