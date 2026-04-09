import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Trash2, Plus, FileText, Search } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { useQuotes } from "../hooks/useQuotes";

const STATUS_COLOURS: Record<string, string> = {
  draft: "text-brand-muted bg-brand-border/30",
  sent: "text-blue-400 bg-blue-400/10",
  accepted: "text-green-400 bg-green-400/10",
  expired: "text-red-400 bg-red-400/10",
};

export function QuotesHistoryPage() {
  const { quotesQuery, deleteQuote } = useQuotes();
  const [search, setSearch] = useState("");

  const quotes = quotesQuery.data ?? [];
  const filtered = search.trim()
    ? quotes.filter((q) =>
        (q.customer_ref ?? "")
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      )
    : quotes;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-brand-text">Quotes</h1>
            <p className="text-sm text-brand-muted mt-0.5">
              {quotes.length > 0
                ? `${quotes.length} quote${quotes.length !== 1 ? "s" : ""} saved`
                : "No quotes yet"}
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

        {/* ── Search ───────────────────────────────────────────────── */}
        {quotes.length > 0 && (
          <div className="relative max-w-sm">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer ref…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-brand-card border border-brand-border rounded-lg text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
            />
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────── */}
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
          {quotesQuery.isLoading && (
            <p className="px-5 py-10 text-sm text-brand-muted text-center">
              Loading quotes…
            </p>
          )}

          {quotesQuery.isError && (
            <p className="px-5 py-10 text-sm text-red-400 text-center">
              Failed to load quotes.
            </p>
          )}

          {!quotesQuery.isLoading && quotes.length === 0 && (
            <div className="px-5 py-16 text-center space-y-3">
              <FileText size={32} className="mx-auto text-brand-border" />
              <p className="text-sm text-brand-muted">No quotes saved yet.</p>
              <Link
                to="/new"
                className="inline-flex items-center gap-1.5 text-sm text-brand-accent hover:underline"
              >
                <Plus size={13} /> Create your first quote
              </Link>
            </div>
          )}

          {!quotesQuery.isLoading && quotes.length > 0 && filtered.length === 0 && (
            <p className="px-5 py-10 text-sm text-brand-muted text-center">
              No quotes match "{search}".
            </p>
          )}

          {filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted">
                    Customer Ref
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted hidden sm:table-cell">
                    System
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted hidden md:table-cell">
                    Length
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted hidden lg:table-cell">
                    Height
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted hidden md:table-cell">
                    Date
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-brand-muted">
                    Total (inc. GST)
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted hidden sm:table-cell">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((quote, i) => (
                  <tr
                    key={quote.id}
                    className={`hover:bg-brand-bg/40 transition-colors ${
                      i < filtered.length - 1
                        ? "border-b border-brand-border/60"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-text">
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
                      {quote.fence_config?.totalRunLength != null
                        ? `${quote.fence_config.totalRunLength}m`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-brand-muted hidden lg:table-cell">
                      {quote.fence_config?.targetHeight != null
                        ? `${quote.fence_config.targetHeight}mm`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-brand-muted hidden md:table-cell">
                      {new Date(quote.created_at).toLocaleDateString("en-AU")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-text">
                      ${quote.bom?.grandTotal?.toFixed(2) ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[quote.status] ?? "text-brand-muted bg-brand-border/30"}`}
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
      </div>
    </AppShell>
  );
}
