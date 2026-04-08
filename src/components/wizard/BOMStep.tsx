import { ArrowLeft, Loader2 } from "lucide-react";
import { BOMDisplay } from "../bom/BOMDisplay";
import { PricingTierSelect } from "../bom/PricingTierSelect";
import { QuoteActions } from "../quote/QuoteActions";
import { ContactDeliveryForm } from "../contact/ContactDeliveryForm";
import { AccordionSection } from "../shared/AccordionSection";
import { ErrorBoundary } from "../shared/ErrorBoundary";
import { applyBomOverrides } from "../../utils/applyBomOverrides";
import type { BOMResult, PricingTier } from "../../types/bom.types";
import type { BOMOverrides } from "../../utils/applyBomOverrides";
import type { FenceConfig } from "../../schemas/fence.schema";
import type { GateConfig } from "../../schemas/gate.schema";
import type { ContactInfo } from "../../schemas/contact.schema";
import { BOMSummary } from "../bom/BOMSummary";
import { LayoutMinimap } from "../canvas/LayoutMinimap";
import type { CanvasLayout } from "../canvas/canvasEngine";

interface BOMStepProps {
  bomResult: BOMResult | null;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  overrides: BOMOverrides;
  onQtyChange: (key: string, qty: number) => void;
  pricingTier: PricingTier;
  onPricingTierChange: (tier: PricingTier) => void;
  fenceConfig: FenceConfig;
  gates: GateConfig[];
  contact: ContactInfo;
  onContactChange: (contact: ContactInfo) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  orgId: string;
  editingQuoteId?: string;
  onSaved?: (id: string) => void;
  onShowSaved: () => void;
  onBack: () => void;
  layoutData?: CanvasLayout | null;
}

export function BOMStep({
  bomResult,
  isPending,
  isError,
  errorMessage,
  overrides,
  onQtyChange,
  pricingTier,
  onPricingTierChange,
  fenceConfig,
  gates,
  contact,
  onContactChange,
  notes,
  onNotesChange,
  orgId,
  editingQuoteId,
  onSaved,
  onShowSaved,
  onBack,
  layoutData,
}: BOMStepProps) {
  const effectiveBom = bomResult
    ? applyBomOverrides(bomResult, overrides)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors"
      >
        <ArrowLeft size={14} />
        Edit Configuration
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Left: BOM content ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6 animate-fade-in-up">
          {/* Loading state */}
          {!effectiveBom && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-brand-muted">
              <Loader2 size={16} className="animate-spin" />
              Calculating BOM…
            </div>
          )}

          {/* Error state */}
          {isError && !isPending && (
            <div className="bg-brand-card border border-red-900/40 rounded-xl p-5">
              <p className="text-sm text-red-400">
                {errorMessage ?? "BOM calculation failed. Is Supabase running?"}
              </p>
            </div>
          )}

          {/* BOM result */}
          {effectiveBom && (
            <ErrorBoundary label="Bill of Materials">
              <div className="space-y-4 border border-brand-border rounded-xl bg-brand-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <h2 className="text-lg font-semibold text-brand-text">
                    Bill of Materials
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* BOM table with inline editing */}
                  <BOMDisplay
                    result={bomResult!}
                    overrides={overrides}
                    onQtyChange={onQtyChange}
                  />
                </div>
              </div>
            </ErrorBoundary>
          )}
        </div>

        {/* ── Right: sticky sidebar ─────────────────────────────── */}
        <div className="lg:col-span-1 sticky top-6 space-y-4">
          <div className="space-y-4 bg-brand-card rounded-xl border border-brand-border p-4">
            {effectiveBom && <BOMSummary result={effectiveBom} />}
            <QuoteActions
              fenceConfig={fenceConfig}
              gates={gates}
              bom={effectiveBom}
              contact={contact}
              customerRef={fenceConfig.customerRef ?? ""}
              notes={notes}
              orgId={orgId}
              editingQuoteId={editingQuoteId}
              onSaved={onSaved}
              onShowSaved={onShowSaved}
            />
          </div>

          <AccordionSection
            title="Contact & Delivery"
            badge="optional"
            defaultOpen={false}
          >
            <div className="space-y-4">
              <ContactDeliveryForm
                onChange={onContactChange}
                initialValues={contact}
              />
            </div>
          </AccordionSection>

          {layoutData && <LayoutMinimap layout={layoutData} />}

          <AccordionSection title="Quote Notes (Internal)" defaultOpen={false}>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              placeholder="Internal notes for this quote…"
              className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
            />
          </AccordionSection>
        </div>
      </div>
    </div>
  );
}
