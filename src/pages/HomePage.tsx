import { Link } from "react-router-dom";
import { Plus, Eye, Trash2, ArrowRight, FileText } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { useQuotes } from "../hooks/useQuotes";

const STATUS_COLOURS: Record<string, string> = {
  draft: "text-brand-muted",
  sent: "text-blue-400",
  accepted: "text-green-400",
  expired: "text-red-400",
};

export function HomePage() {
  const { quotesQuery, deleteQuote } = useQuotes();
  const recent = quotesQuery.data?.slice(0, 5) ?? [];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-text">
              BOM Generator
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              Create and manage QuickScreen fencing quotes.
            </p>
          </div>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
          >
            <Plus size={15} />
            New Quote
          </Link>
        </div>

        {/* ── Recent Quotes ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-brand-text">
              Recent Quotes
            </h2>
            {(quotesQuery.data?.length ?? 0) > 5 && (
              <Link
                to="/quotes"
                className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
              >
                View all <ArrowRight size={11} />
              </Link>
            )}
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
            {quotesQuery.isLoading && (
              <p className="px-5 py-8 text-sm text-brand-muted text-center">
                Loading quotes…
              </p>
            )}

            {quotesQuery.isError && (
              <p className="px-5 py-8 text-sm text-red-400 text-center">
                Failed to load quotes.
              </p>
            )}

            {!quotesQuery.isLoading && recent.length === 0 && (
              <div className="px-5 py-12 text-center space-y-3">
                <FileText size={28} className="mx-auto text-brand-border" />
                <p className="text-sm text-brand-muted">No quotes yet.</p>
                <Link
                  to="/new"
                  className="inline-flex items-center gap-1.5 text-sm text-brand-accent hover:underline"
                >
                  <Plus size={13} /> Create your first quote
                </Link>
              </div>
            )}

            {recent.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-brand-muted">
                      Customer Ref
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-brand-muted hidden sm:table-cell">
                      System
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-brand-muted hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-brand-muted">
                      Total
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-brand-muted hidden sm:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((quote, i) => (
                    <tr
                      key={quote.id}
                      className={
                        i < recent.length - 1
                          ? "border-b border-brand-border/60"
                          : ""
                      }
                    >
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="font-medium text-brand-text truncate">
                          {quote.customer_ref || `Quote #${quote.quote_number}`}
                        </p>
                        {quote.customer_ref && (
                          <p className="text-xs text-brand-muted">#{quote.quote_number}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-muted hidden sm:table-cell">
                        {quote.fence_config?.systemType ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-brand-muted hidden md:table-cell">
                        {new Date(quote.created_at).toLocaleDateString(
                          "en-AU"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-brand-text">
                        ${quote.bom?.grandTotal?.toFixed(2) ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={`text-xs ${STATUS_COLOURS[quote.status] ?? "text-brand-muted"}`}
                        >
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/quote/${quote.id}`}
                            title="View quote"
                            className="p-1.5 text-brand-muted hover:text-brand-accent transition-colors"
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => deleteQuote.mutate(quote.id)}
                            title="Delete quote"
                            className="p-1.5 text-brand-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {(quotesQuery.data?.length ?? 0) > 0 && (
            <div className="mt-3 text-right">
              <Link
                to="/quotes"
                className="text-xs text-brand-muted hover:text-brand-accent transition-colors"
              >
                View all quotes →
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
