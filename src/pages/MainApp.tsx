import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { FenceConfigForm } from '../components/fence/FenceConfigForm';
import { GateConfigPanel } from '../components/gate/GateConfigPanel';
import { BOMDisplay } from '../components/bom/BOMDisplay';
import { PricingTierSelect } from '../components/bom/PricingTierSelect';
import { QuoteActions } from '../components/quote/QuoteActions';
import { SavedQuotesList } from '../components/quote/SavedQuotesList';
import { ContactDeliveryForm } from '../components/contact/ContactDeliveryForm';
import { JobSummary } from '../components/contact/JobSummary';
import { FenceLayoutCanvas } from '../components/canvas/FenceLayoutCanvas';
import { JobDescriptionParser } from '../components/fence/JobDescriptionParser';
import { FenceConfigProvider, useFenceConfig } from '../context/FenceConfigContext';
import { GateProvider, useGates } from '../context/GateContext';
import { AccordionSection } from '../components/shared/AccordionSection';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { useBOM } from '../hooks/useBOM';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { defaultContactInfo } from '../schemas/contact.schema';
import type { BOMResult, PricingTier } from '../types/bom.types';
import type { ContactInfo } from '../schemas/contact.schema';
import type { SavedQuote } from '../types/quote.types';

function AppContent() {
  const { state: fenceConfig, dispatch: fenceDispatch } = useFenceConfig();
  const { gates, dispatch: gateDispatch } = useGates();
  const { user } = useAuth();

  const [pricingTier,  setPricingTier]  = useState<PricingTier>('tier1');
  const [bomResult,    setBomResult]    = useState<BOMResult | null>(null);
  const [contact,      setContact]      = useState<ContactInfo>(defaultContactInfo);
  const [notes,        setNotes]        = useState('');
  const [showSaved,    setShowSaved]    = useState(false);
  const [orgId,        setOrgId]        = useState('');

  const bomMutation = useBOM();

  // Fetch org_id once so QuoteActions can include it on insert
  const ensureOrgId = useCallback(async () => {
    if (orgId) return orgId;
    const { data } = await supabase.from('profiles').select('org_id').eq('id', user?.id ?? '').single();
    const id = data?.org_id ?? '';
    setOrgId(id);
    return id;
  }, [orgId, user?.id]);

  const handleGenerate = async () => {
    await ensureOrgId();
    try {
      const result = await bomMutation.mutateAsync({ fenceConfig, gates, pricingTier });
      setBomResult(result);
    } catch (err) {
      console.error('[BOM] calculation failed:', err);
      const msg = err instanceof Error ? err.message : 'BOM calculation failed. Is Supabase running?';
      toast.error(msg);
    }
  };

  // Re-price existing BOM when tier changes (skip the initial mount)
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (!bomResult) return;
    bomMutation.mutateAsync({ fenceConfig, gates, pricingTier })
      .then(setBomResult)
      .catch(() => {});
  }, [pricingTier]);

  // Load a saved quote back into all form state
  const handleLoadQuote = (quote: SavedQuote) => {
    fenceDispatch({ type: 'LOAD_FROM_QUOTE', config: quote.fence_config });
    gateDispatch({ type: 'SET_GATES', gates: quote.gates });
    setBomResult(quote.bom);
    setContact(quote.contact ?? defaultContactInfo);
    setNotes(quote.notes ?? '');
    setOrgId(quote.org_id);
  };

  return (
    <div className="space-y-4">

      {/* ── Describe the Job ────────────────────────────────────── */}
      <AccordionSection title="Describe the Job (optional)">
        <div className="pt-4">
          <JobDescriptionParser />
        </div>
      </AccordionSection>

      {/* ── Canvas Layout Tool ──────────────────────────────────── */}
      <div className="hidden sm:block">
        <AccordionSection title="Layout Tool (optional)">
          <div className="pt-4">
            <ErrorBoundary label="Layout Tool">
              <FenceLayoutCanvas />
            </ErrorBoundary>
          </div>
        </AccordionSection>
      </div>

      {/* ── Fence Configuration ─────────────────────────────────── */}
      <AccordionSection title="Fence Configuration">
        <div className="pt-4">
          <FenceConfigForm onGenerate={handleGenerate} generating={bomMutation.isPending} />
        </div>
      </AccordionSection>

      {/* ── Gate Configuration ──────────────────────────────────── */}
      <AccordionSection title="Gate Configuration">
        <div className="pt-4">
          <GateConfigPanel />
        </div>
      </AccordionSection>

      {/* ── Contact & Delivery ──────────────────────────────────── */}
      <AccordionSection title="Contact & Delivery">
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ContactDeliveryForm onChange={setContact} initialValues={contact} />
            </div>
            <div>
              <JobSummary fenceConfig={fenceConfig} gates={gates} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-brand-muted mb-1">Quote Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes for this quote…"
              className="w-full px-2.5 py-2 bg-brand-bg border border-brand-border rounded text-sm text-brand-text focus:outline-none focus:border-brand-accent resize-none"
            />
          </div>
        </div>
      </AccordionSection>

      {/* ── Bill of Materials ───────────────────────────────────── */}
      {(bomResult || bomMutation.isPending || bomMutation.isError) && (
        <AccordionSection title="Bill of Materials" defaultOpen>
          <div className="pt-4">
            {bomMutation.isPending && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-brand-muted">
                <Loader2 size={16} className="animate-spin" />
                Calculating BOM…
              </div>
            )}
            {bomMutation.isError && (
              <p className="text-sm text-red-400 py-4">
                {bomMutation.error instanceof Error
                  ? bomMutation.error.message
                  : 'BOM calculation failed. Is Supabase running?'}
              </p>
            )}
            {bomResult && !bomMutation.isPending && (
              <ErrorBoundary label="Bill of Materials">
              <div className="space-y-4">
                {/* Tier selector + export actions */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-brand-muted">Tier:</span>
                    <PricingTierSelect value={pricingTier} onChange={setPricingTier} />
                  </div>
                  <QuoteActions
                    fenceConfig={fenceConfig}
                    gates={gates}
                    bom={bomResult}
                    contact={contact}
                    customerRef={fenceConfig.customerRef ?? ''}
                    notes={notes}
                    orgId={orgId}
                    onShowSaved={() => setShowSaved(true)}
                  />
                </div>

                <BOMDisplay result={bomResult} />
              </div>
              </ErrorBoundary>
            )}
          </div>
        </AccordionSection>
      )}

      {/* ── Saved quotes panel ──────────────────────────────────── */}
      {showSaved && (
        <SavedQuotesList
          onLoad={handleLoadQuote}
          onClose={() => setShowSaved(false)}
        />
      )}

    </div>
  );
}

export function MainApp() {
  return (
    <FenceConfigProvider>
      <GateProvider>
        <AppShell>
          <div className="p-4 sm:p-6">
            <div className="max-w-5xl mx-auto">
              <AppContent />
            </div>
          </div>
        </AppShell>
      </GateProvider>
    </FenceConfigProvider>
  );
}
