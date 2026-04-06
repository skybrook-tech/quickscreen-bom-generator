import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell";
import { SavedQuotesList } from "../components/quote/SavedQuotesList";
import { WizardStepIndicator } from "../components/wizard/WizardStepIndicator";
import { EntryStep } from "../components/wizard/EntryStep";
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

type WizardStep = "entry" | "configure" | "bom";

const STEP_ORDER: WizardStep[] = ["entry", "configure", "bom"];

interface AppContentProps {
  step: WizardStep;
  setStep: (s: WizardStep) => void;
}

function AppContent({ step, setStep }: AppContentProps) {
  const { state: fenceConfig, dispatch: fenceDispatch } = useFenceConfig();
  const { gates, dispatch: gateDispatch } = useGates();
  const { user } = useAuth();

  const [pricingTier, setPricingTier] = useState<PricingTier>("tier1");
  const [bomResult, setBomResult] = useState<BOMResult | null>(null);
  const [bomOverrides, setBomOverrides] = useState<BOMOverrides>(new Map());
  const [contact, setContact] = useState<ContactInfo>(defaultContactInfo);
  const [notes, setNotes] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [orgId, setOrgId] = useState("");

  const bomMutation = useBOM();

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
        fenceConfig,
        gates,
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

  return (
    <>
      <ErrorBoundary label="App">
        {step === "entry" && (
          <EntryStep
            onStartManual={() => setStep("configure")}
            onStartLayout={() => setStep("configure")}
            onStartDescribe={(description) => {
              if (description.trim()) setNotes(description);
              setStep("configure");
            }}
          />
        )}

        {step === "configure" && (
          <ConfigureStep
            onBack={() => setStep("entry")}
            onGenerate={handleGenerate}
            isGenerating={bomMutation.isPending}
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
            pricingTier={pricingTier}
            onPricingTierChange={setPricingTier}
            fenceConfig={fenceConfig}
            gates={gates}
            contact={contact}
            onContactChange={setContact}
            notes={notes}
            onNotesChange={setNotes}
            orgId={orgId}
            onShowSaved={() => setShowSaved(true)}
            onBack={() => setStep("configure")}
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
  const navigate = useNavigate();

  const handleStepClick = (s: WizardStep) => {
    if (STEP_ORDER.indexOf(s) < STEP_ORDER.indexOf(step)) {
      setStep(s);
    }
  };

  return (
    <FenceConfigProvider>
      <GateProvider>
        <AppShell
          topBar={
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-xs text-brand-muted hover:text-brand-text transition-colors shrink-0"
              >
                <ArrowLeft size={13} />
                Exit
              </button>
              <div className="flex-1">
                <WizardStepIndicator
                  currentStep={step}
                  onStepClick={handleStepClick}
                />
              </div>
            </div>
          }
        >
          <div className="p-4 sm:p-6 pb-12">
            <div className="max-w-7xl mx-auto">
              <AppContent step={step} setStep={setStep} />
            </div>
          </div>
        </AppShell>
      </GateProvider>
    </FenceConfigProvider>
  );
}
