import { Trash2, FolderOpen, X } from 'lucide-react';
import { useQuotes } from '../../hooks/useQuotes';
import type { SavedQuote } from '../../types/quote.types';

interface SavedQuotesListProps {
  onLoad: (quote: SavedQuote) => void;
  onClose: () => void;
}

const STATUS_COLOURS: Record<string, string> = {
  draft:    'text-brand-muted',
  sent:     'text-blue-400',
  accepted: 'text-green-400',
  expired:  'text-red-400',
};

export function SavedQuotesList({ onLoad, onClose }: SavedQuotesListProps) {
  const { quotesQuery, deleteQuote } = useQuotes();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm h-full bg-brand-card border-l border-brand-border flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
          <h2 className="text-sm font-semibold text-brand-text">Saved Quotes</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-brand-muted hover:text-brand-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {quotesQuery.isLoading && (
            <p className="p-4 text-sm text-brand-muted">Loading quotes…</p>
          )}
          {quotesQuery.isError && (
            <p className="p-4 text-sm text-red-400">Failed to load quotes</p>
          )}
          {quotesQuery.data?.length === 0 && (
            <p className="p-4 text-sm text-brand-muted">No saved quotes yet.</p>
          )}
          {quotesQuery.data?.map((quote) => (
            <div
              key={quote.id}
              className="flex items-start justify-between px-4 py-3 border-b border-brand-border hover:bg-brand-bg/50 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium text-brand-text truncate">
                  {quote.customer_ref || `Quote #${quote.quote_number}`}
                </p>
                {quote.customer_ref && (
                  <p className="text-xs text-brand-muted/70">#{quote.quote_number}</p>
                )}
                <p className="text-xs text-brand-muted mt-0.5">
                  {new Date(quote.created_at).toLocaleDateString('en-AU')}
                  {' · '}
                  <span className={STATUS_COLOURS[quote.status] ?? 'text-brand-muted'}>
                    {quote.status}
                  </span>
                  {' · '}
                  ${quote.bom?.grandTotal?.toFixed(2) ?? '—'}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => { onLoad(quote); onClose(); }}
                  title="Load quote"
                  className="p-1.5 text-brand-muted hover:text-brand-accent transition-colors"
                >
                  <FolderOpen size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteQuote.mutate(quote.id)}
                  title="Delete quote"
                  className="p-1.5 text-brand-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
