import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BOMDisplay } from '../components/bom/BOMDisplay';
import type { SavedQuote } from '../types/quote.types';

export function QuoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<SavedQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setQuote(data as SavedQuote);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <p className="text-brand-muted">Loading quote…</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error ?? 'Quote not found'}</p>
          <Link to="/" className="text-brand-accent hover:underline text-sm">← Back to generator</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-brand-border bg-brand-card print:hidden" data-print-hide>
        <Link to="/" className="flex items-center gap-2 text-sm text-brand-muted hover:text-brand-text">
          <ArrowLeft size={14} /> Back
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text"
        >
          <Printer size={14} /> Print
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-brand-text">{quote.customer_ref || 'Quote'}</h1>
            <p className="text-sm text-brand-muted mt-1">
              {new Date(quote.created_at).toLocaleDateString('en-AU')} · {quote.status}
            </p>
          </div>
          <div className="text-right text-sm text-brand-muted">
            <p className="font-semibold text-brand-text">${quote.bom.grandTotal.toFixed(2)}</p>
            <p>inc. GST</p>
          </div>
        </div>

        {/* Fence config summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-sm">
          {[
            ['System',   quote.fence_config.systemType],
            ['Length',   `${quote.fence_config.totalRunLength}m`],
            ['Height',   `${quote.fence_config.targetHeight}mm`],
            ['Slat',     `${quote.fence_config.slatSize}mm · ${quote.fence_config.slatGap}mm gap`],
            ['Colour',   quote.fence_config.colour],
            ['Mounting', quote.fence_config.postMounting],
            ['Gates',    String(quote.gates.length)],
          ].map(([l, v]) => (
            <div key={l} className="bg-brand-card border border-brand-border rounded p-3">
              <p className="text-xs text-brand-muted">{l}</p>
              <p className="text-brand-text font-medium mt-0.5">{v}</p>
            </div>
          ))}
        </div>

        {/* Contact info */}
        {quote.contact?.fullName && (
          <div className="mb-6 text-sm text-brand-muted">
            <span className="font-medium text-brand-text">{quote.contact.fullName}</span>
            {quote.contact.company && ` · ${quote.contact.company}`}
            {quote.contact.phone   && ` · ${quote.contact.phone}`}
            {quote.contact.email   && ` · ${quote.contact.email}`}
          </div>
        )}

        {/* BOM */}
        <BOMDisplay result={quote.bom} />

        {/* Notes */}
        {quote.notes && (
          <div className="mt-6 text-sm text-brand-muted">
            <p className="font-semibold text-brand-text mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
