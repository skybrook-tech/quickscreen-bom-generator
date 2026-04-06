import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { AppShell } from '../components/layout/AppShell';
import { BOMDisplay } from '../components/bom/BOMDisplay';
import { BOMSummary } from '../components/bom/BOMSummary';
import { QuoteActions } from '../components/quote/QuoteActions';
import { ConfigureStep } from '../components/wizard/ConfigureStep';
import { BOMStep } from '../components/wizard/BOMStep';
import { WizardStepIndicator } from '../components/wizard/WizardStepIndicator';
import { FenceConfigProvider, useFenceConfig } from '../context/FenceConfigContext';
import { GateProvider, useGates } from '../context/GateContext';
import { useQuotes } from '../hooks/useQuotes';
import { useBOM } from '../hooks/useBOM';
import { defaultContactInfo } from '../schemas/contact.schema';
import type { BOMOverrides } from '../utils/applyBomOverrides';
import type { BOMResult, PricingTier } from '../types/bom.types';
import type { ContactInfo } from '../schemas/contact.schema';
import type { SavedQuote, QuoteStatus } from '../types/quote.types';

// ─── Status UI ────────────────────────────────────────────────────────────────

const STATUS_COLOURS: Record<string, string> = {
  draft:    'text-brand-muted bg-brand-border/30',
  sent:     'text-blue-400 bg-blue-400/10',
  accepted: 'text-green-400 bg-green-400/10',
  expired:  'text-red-400 bg-red-400/10',
};

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'draft',    label: 'Draft' },
  { value: 'sent',     label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired',  label: 'Expired' },
];

const CONFIG_FIELDS = (quote: SavedQuote) => [
  ['System',   quote.fence_config.systemType],
  ['Length',   `${quote.fence_config.totalRunLength}m`],
  ['Height',   `${quote.fence_config.targetHeight}mm`],
  ['Slat',     `${quote.fence_config.slatSize}mm · ${quote.fence_config.slatGap}mm gap`],
  ['Colour',   quote.fence_config.colour],
  ['Mounting', quote.fence_config.postMounting],
  ['Gates',    String(quote.gates.length)],
] as const;

// ─── Edit mode (embedded wizard) ─────────────────────────────────────────────

type EditStep = 'configure' | 'bom';

interface DraftEditorProps {
  quote: SavedQuote;
  orgId: string;
  step: EditStep;
  setStep: (s: EditStep) => void;
  onSaved: (id: string) => void;
  onCancel: () => void;
}

function DraftEditorContent({ quote, orgId, step, setStep, onSaved, onCancel }: DraftEditorProps) {
  const { state: fenceConfig } = useFenceConfig();
  const { gates } = useGates();
  const bomMutation = useBOM();

  const [bomResult, setBomResult] = useState<BOMResult | null>(quote.bom);
  const [bomOverrides, setBomOverrides] = useState<BOMOverrides>(new Map());
  const [pricingTier, setPricingTier] = useState<PricingTier>(
    (quote.bom?.pricingTier as PricingTier) ?? 'tier1'
  );
  const [contact, setContact] = useState<ContactInfo>(quote.contact ?? defaultContactInfo);
  const [notes, setNotes] = useState(quote.notes ?? '');

  // Re-price when tier changes (after initial mount)
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (!bomResult) return;
    bomMutation.mutateAsync({ fenceConfig, gates, pricingTier })
      .then((r) => { setBomResult(r); setBomOverrides(new Map()); })
      .catch(() => {});
  }, [pricingTier]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    try {
      const result = await bomMutation.mutateAsync({ fenceConfig, gates, pricingTier });
      setBomResult(result);
      setBomOverrides(new Map());
      setStep('bom');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'BOM calculation failed';
      toast.error(msg);
    }
  };

  const errorMessage = bomMutation.error instanceof Error
    ? bomMutation.error.message
    : 'BOM calculation failed';

  return (
    <div className="space-y-6">
      {step === 'configure' && (
        <ConfigureStep
          onBack={onCancel}
          onGenerate={handleGenerate}
          isGenerating={bomMutation.isPending}
        />
      )}

      {step === 'bom' && (
        <BOMStep
          bomResult={bomResult}
          isPending={bomMutation.isPending}
          isError={bomMutation.isError}
          errorMessage={errorMessage}
          overrides={bomOverrides}
          onQtyChange={(key, qty) =>
            setBomOverrides((prev) => new Map(prev).set(key, qty))
          }
          pricingTier={pricingTier}
          onPricingTierChange={setPricingTier}
          fenceConfig={fenceConfig}
          gates={gates}
          contact={contact}
          onContactChange={setContact}
          notes={notes}
          onNotesChange={setNotes}
          orgId={orgId}
          editingQuoteId={quote.id}
          onSaved={onSaved}
          onShowSaved={() => {}}
          onBack={() => setStep('configure')}
        />
      )}
    </div>
  );
}

function DraftEditor(props: DraftEditorProps) {
  return (
    <FenceConfigProvider initialState={props.quote.fence_config}>
      <GateProvider initialGates={props.quote.gates}>
        <DraftEditorContent {...props} />
      </GateProvider>
    </FenceConfigProvider>
  );
}


// ─── View mode ────────────────────────────────────────────────────────────────

interface QuoteViewContentProps {
  quote: SavedQuote;
  orgId: string;
  status: QuoteStatus;
  statusSaving: boolean;
  onStatusChange: (s: QuoteStatus) => void;
  onEditDraft: () => void;
}

function QuoteViewContent({
  quote,
  orgId,
  status,
  statusSaving,
  onStatusChange,
  onEditDraft,
}: QuoteViewContentProps) {
  const quoteLabel = quote.customer_ref || `Quote #${quote.quote_number}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* ── Left: BOM card ─────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <div className="border border-brand-border rounded-xl bg-brand-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
            <h2 className="text-base font-semibold text-brand-text">
              Bill of Materials
            </h2>
            <span className="text-xs text-brand-muted">read-only</span>
          </div>
          <BOMDisplay result={quote.bom} />
        </div>
      </div>

      {/* ── Right: sticky sidebar ──────────────────────────────────── */}
      <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-4 print:hidden">
        {/* Identity + totals */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-4">
          <div className="pb-3 border-b border-brand-border">
            <p className="text-xs text-brand-muted mb-0.5">Quote #{quote.quote_number}</p>
            <h1 className="text-base font-semibold text-brand-text leading-snug">
              {quoteLabel}
            </h1>
            <p className="text-xs text-brand-muted mt-1.5">
              {new Date(quote.created_at).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>

          <BOMSummary result={quote.bom} />

          <div className="pt-1">
            <QuoteActions
              fenceConfig={quote.fence_config}
              gates={quote.gates}
              bom={quote.bom}
              contact={quote.contact}
              customerRef={quote.customer_ref ?? ''}
              notes={quote.notes ?? ''}
              orgId={orgId}
              quoteNumber={quote.quote_number}
              editingQuoteId={quote.id}
              onSaved={() => {}}
              onShowSaved={() => {}}
              onEdit={status === 'draft' ? onEditDraft : undefined}
              showSave={false}
            />
          </div>
        </div>

        {/* Status */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Status</p>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={statusSaving}
                onClick={() => onStatusChange(value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  status === value
                    ? `${STATUS_COLOURS[value]} border-current/30`
                    : 'text-brand-muted border-brand-border hover:border-brand-accent/40 hover:text-brand-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Config summary */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Configuration</p>
          <div className="grid grid-cols-2 gap-2">
            {CONFIG_FIELDS(quote).map(([label, value]) => (
              <div key={label} className="space-y-0.5">
                <p className="text-xs text-brand-muted">{label}</p>
                <p className="text-xs font-medium text-brand-text truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        {quote.contact?.fullName && (
          <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Contact</p>
            <div className="space-y-1 text-xs">
              <p className="font-medium text-brand-text">{quote.contact.fullName}</p>
              {quote.contact.company && <p className="text-brand-muted">{quote.contact.company}</p>}
              {quote.contact.phone   && <p className="text-brand-muted">{quote.contact.phone}</p>}
              {quote.contact.email   && <p className="text-brand-muted">{quote.contact.email}</p>}
            </div>
          </div>
        )}

        {/* Notes */}
        {quote.notes && (
          <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Notes</p>
            <p className="text-xs text-brand-muted whitespace-pre-wrap leading-relaxed">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function QuoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const { updateQuote } = useQuotes();

  const [quote, setQuote] = useState<SavedQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<QuoteStatus>('draft');
  const [statusSaving, setStatusSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editStep, setEditStep] = useState<EditStep>('configure');
  const [orgId, setOrgId] = useState('');

  const fetchQuote = useCallback(async (quoteId: string) => {
    const { data, error: err } = await supabase
      .from('quotes').select('*').eq('id', quoteId).single();
    if (err) { setError(err.message); }
    else {
      const q = data as SavedQuote;
      setQuote(q);
      setStatus(q.status);
      setOrgId(q.org_id);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (id) fetchQuote(id);
  }, [id, fetchQuote]);

  const handleStatusChange = async (next: QuoteStatus) => {
    if (!quote || next === status) return;
    setStatusSaving(true);
    try {
      await updateQuote.mutateAsync({ id: quote.id, updates: { status: next } });
      setStatus(next);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleSaved = useCallback((savedId: string) => {
    setIsEditing(false);
    setEditStep('configure');
    fetchQuote(savedId);
  }, [fetchQuote]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-brand-muted">Loading quote…</p>
        </div>
      </AppShell>
    );
  }

  if (error || !quote) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-red-400">{error ?? 'Quote not found'}</p>
          <Link to="/quotes" className="text-sm text-brand-accent hover:underline">← Back to quotes</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      topBar={isEditing ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => { setIsEditing(false); setEditStep('configure'); }}
            className="flex items-center gap-1 text-xs text-brand-muted hover:text-brand-text transition-colors shrink-0"
          >
            <ArrowLeft size={13} />
            Cancel
          </button>
          <div className="flex-1">
            <WizardStepIndicator
              currentStep={editStep}
              onStepClick={(s) => { if (s !== 'bom') setEditStep('configure'); }}
            />
          </div>
        </div>
      ) : undefined}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {!isEditing && (
          <Link
            to="/quotes"
            className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors print:hidden"
          >
            <ArrowLeft size={14} />
            All Quotes
          </Link>
        )}

        {isEditing ? (
          <DraftEditor
            quote={quote}
            orgId={orgId}
            step={editStep}
            setStep={setEditStep}
            onSaved={handleSaved}
            onCancel={() => { setIsEditing(false); setEditStep('configure'); }}
          />
        ) : (
          <QuoteViewContent
            quote={quote}
            orgId={orgId}
            status={status}
            statusSaving={statusSaving}
            onStatusChange={handleStatusChange}
            onEditDraft={() => setIsEditing(true)}
          />
        )}
      </div>
    </AppShell>
  );
}
