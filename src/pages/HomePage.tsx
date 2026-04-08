import { Link } from "react-router-dom";
import { Eye, Trash2, ArrowRight, FileText } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { useQuotes } from "../hooks/useQuotes";
import { useProducts, type Product } from "../hooks/useProducts";

const STATUS_COLOURS: Record<string, string> = {
  draft: "text-brand-muted",
  sent: "text-blue-400",
  accepted: "text-green-400",
  expired: "text-red-400",
};

const PRODUCT_ROUTES: Record<string, string> = {
  QUICKSCREEN: "/new",
};

function getProductRoute(systemType: string): string {
  return PRODUCT_ROUTES[systemType] ?? "/new";
}

function ProductCard({ product }: { product: Product }) {
  const inner = (
    <>
      <div className="relative flex flex-col items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover w-40 h-40"
          />
        ) : (
          <div className="h-full w-full" />
        )}
        {!product.active && (
          <span className="absolute top-0 right-[50%] text-[10px] bg-brand-bg text-brand-muted px-1.5 py-0.5 rounded-full border border-brand-border">
            Coming soon
          </span>
        )}
        <p className="text-sm font-semibold text-brand-text">{product.name}</p>
      </div>
    </>
  );

  const cardClass = `${
    product.active
      ? "border-brand-border hover:border-brand-accent cursor-pointer"
      : "border-brand-border opacity-50 cursor-not-allowed"
  }`;

  if (product.active) {
    return (
      <Link to={getProductRoute(product.system_type)} className={cardClass}>
        {inner}
      </Link>
    );
  }

  return <div className={cardClass}>{inner}</div>;
}

function ProductGrid() {
  const productsQuery = useProducts();

  if (productsQuery.isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-brand-card border border-brand-border rounded-xl overflow-hidden animate-pulse"
          >
            <div className="h-36 bg-brand-border" />
            <div className="p-3 space-y-1.5">
              <div className="h-3 bg-brand-border rounded w-2/3" />
              <div className="h-2.5 bg-brand-border rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (productsQuery.isError) {
    return <p className="text-sm text-red-400">Failed to load products.</p>;
  }

  const products = productsQuery.data ?? [];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function HomePage() {
  const { quotesQuery, deleteQuote } = useQuotes();
  const recent = quotesQuery.data?.slice(0, 5) ?? [];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Products ──────────────────────────────────────────────── */}
        <div>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-brand-text">Products</h1>
            <p className="text-sm text-brand-muted mt-1">
              Select a product to start a quote.
            </p>
          </div>
          <ProductGrid />
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
                  Create your first quote
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
                          <p className="text-xs text-brand-muted">
                            #{quote.quote_number}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-muted hidden sm:table-cell">
                        {quote.fence_config?.systemType ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-brand-muted hidden md:table-cell">
                        {new Date(quote.created_at).toLocaleDateString("en-AU")}
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
