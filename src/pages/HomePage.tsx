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
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Products ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 items-center justify-center">
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-brand-text">Products</h1>
            <p className="text-sm text-brand-muted mt-1">
              Select a product to start a quote.
            </p>
          </div>
          <ProductGrid />
        </div>
      </div>
    </AppShell>
  );
}
