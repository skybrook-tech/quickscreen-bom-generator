import { GlassOutletLogo } from "../brand/GlassOutletLogo";
import { useFenceProducts } from "../../hooks/useProducts";
import { useAllCalculatorConfigs } from "../../hooks/useCalculatorConfig";
import { DescribeFenceBox } from "../calculator/DescribeFenceBox";
import type { ParseResult } from "../../lib/describeFenceParser";
import type { Product } from "../../hooks/useProducts";
import { ArrowRight, Loader2 } from "lucide-react";

interface ProductCatalogProps {
  /** Called with the chosen product's system_type to start the quote. */
  onPick: (productCode: string) => void;
  onDescribeApply?: (result: ParseResult) => void;
  initialDescription?: string;
}

function ProductCard({
  product,
  disabled,
  onPick,
}: {
  product: Product;
  disabled: boolean;
  onPick: (productCode: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(product.system_type)}
      data-testid={`catalog-product-${product.system_type}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
    >
      <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-primary/15 via-brand-primary/5 to-brand-accent/10">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-3xl font-black tracking-tight text-brand-primary/70">
            {product.system_type}
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-brand-bg/80 px-2 py-0.5 text-[11px] font-bold text-brand-muted backdrop-blur">
          {product.system_type}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-base font-black leading-tight text-brand-text">{product.name}</span>
        {product.description && (
          <span className="line-clamp-2 text-xs leading-snug text-brand-muted">
            {product.description}
          </span>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-bold text-brand-primary opacity-0 transition-opacity group-hover:opacity-100">
          Start with {product.system_type} <ArrowRight size={13} />
        </span>
      </div>
    </button>
  );
}

export function ProductCatalog({ onPick, onDescribeApply, initialDescription = "" }: ProductCatalogProps) {
  // Org-scoped via RLS; useFenceProducts never substitutes another org's
  // fixtures when a backend is configured (fail-empty, not fail-wrong-tenant).
  const fenceProductsQuery = useFenceProducts();
  const products = fenceProductsQuery.data;
  const allConfigs = useAllCalculatorConfigs();
  const configsLoading = !allConfigs;

  return (
    <div className="relative min-h-full overflow-hidden bg-brand-bg text-brand-text">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.35),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.28),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(245,158,11,0.18),transparent_30%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col items-center gap-8 px-5 py-12">
        <GlassOutletLogo
          className="justify-center text-brand-primary"
          iconClassName="h-14 w-16 sm:h-16 sm:w-20"
          textClassName="text-3xl sm:text-4xl"
        />

        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-brand-text sm:text-3xl">
            Start a new quote
          </h1>
          <p className="mt-1 text-sm font-semibold text-brand-muted">
            Pick a product to begin — you can mix and match systems once you're in the editor.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.system_type}
              product={product}
              disabled={configsLoading}
              onPick={onPick}
            />
          ))}
        </div>

        {(configsLoading || fenceProductsQuery.isLoading) && (
          <p className="flex items-center gap-2 text-xs font-semibold text-brand-muted">
            <Loader2 size={14} className="animate-spin" /> Loading product options…
          </p>
        )}

        {fenceProductsQuery.isError && (
          <p className="text-xs font-semibold text-red-500">
            Couldn't load your product catalogue — check your connection and refresh.
          </p>
        )}

        {!fenceProductsQuery.isLoading && !fenceProductsQuery.isError && products.length === 0 && (
          <p className="text-xs font-semibold text-brand-muted">
            No products are set up for your organisation yet.
          </p>
        )}

        {onDescribeApply && (
          <div className="w-full max-w-xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-muted">
              or describe your fence
            </p>
            <DescribeFenceBox
              title="Describe your fence"
              compact
              initialDescription={initialDescription}
              onApply={onDescribeApply}
            />
          </div>
        )}
      </div>
    </div>
  );
}
