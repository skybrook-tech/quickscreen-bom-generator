import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { FenceConfigForm } from '../components/fence/FenceConfigForm';
import { GateConfigPanel } from '../components/gate/GateConfigPanel';
import { BOMDisplay } from '../components/bom/BOMDisplay';
import { PricingTierSelect } from '../components/bom/PricingTierSelect';
import { FenceConfigProvider, useFenceConfig } from '../context/FenceConfigContext';
import { GateProvider, useGates } from '../context/GateContext';
import { AccordionSection } from '../components/shared/AccordionSection';
import { useBOM } from '../hooks/useBOM';
import type { BOMResult, PricingTier } from '../types/bom.types';

// Inner component — rendered inside both providers, so hooks can access context
function AppContent() {
  const { state: fenceConfig } = useFenceConfig();
  const { gates } = useGates();
  const [pricingTier, setPricingTier] = useState<PricingTier>('tier1');
  const [bomResult, setBomResult] = useState<BOMResult | null>(null);
  const bomMutation = useBOM();

  const handleGenerate = async () => {
    try {
      const result = await bomMutation.mutateAsync({ fenceConfig, gates, pricingTier });
      setBomResult(result);
    } catch {
      // error shown below
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Fence Configuration ─────────────────────────────────── */}
      <AccordionSection title="Fence Configuration">
        <div className="pt-4">
          <FenceConfigForm
            onGenerate={handleGenerate}
            generating={bomMutation.isPending}
          />
        </div>
      </AccordionSection>

      {/* ── Gate Configuration ──────────────────────────────────── */}
      <AccordionSection title="Gate Configuration">
        <div className="pt-4">
          <GateConfigPanel />
        </div>
      </AccordionSection>

      {/* ── Bill of Materials ───────────────────────────────────── */}
      {(bomResult || bomMutation.isPending || bomMutation.isError) && (
        <AccordionSection title="Bill of Materials" defaultOpen>
          <div className="pt-4">
            {bomMutation.isPending && (
              <p className="text-sm text-brand-muted py-4 text-center">Calculating BOM…</p>
            )}
            {bomMutation.isError && (
              <p className="text-sm text-red-400 py-4">
                {bomMutation.error instanceof Error ? bomMutation.error.message : 'BOM calculation failed. Is Supabase running?'}
              </p>
            )}
            {bomResult && !bomMutation.isPending && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-brand-muted">Pricing tier:</span>
                  <PricingTierSelect value={pricingTier} onChange={setPricingTier} />
                </div>
                <BOMDisplay result={bomResult} />
              </>
            )}
          </div>
        </AccordionSection>
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
