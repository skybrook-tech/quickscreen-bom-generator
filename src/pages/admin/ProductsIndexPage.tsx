import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminProducts } from '../../hooks/useAdminProducts';

const TYPE_COLOURS: Record<string, string> = {
  fence: 'text-brand-accent bg-brand-accent/10 border-brand-accent/30',
  gate: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  other: 'text-brand-muted bg-brand-border/20 border-brand-border/40',
};

export function ProductsIndexPage() {
  const { data: products, isLoading, error } = useAdminProducts();

  const fences = products?.filter((p) => p.product_type === 'fence') ?? [];
  const gates = products?.filter((p) => p.product_type === 'gate') ?? [];
  const others = products?.filter((p) => p.product_type === 'other') ?? [];

  return (
    <AdminLayout
      title="Products"
      subtitle="All fences, gates, and other product types. Click a product to view its components."
    >
      {isLoading && (
        <div className="text-sm text-brand-muted animate-pulse">Loading products…</div>
      )}
      {error && (
        <div className="text-sm text-red-400 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          {error.message}
        </div>
      )}

      {[
        { label: 'Fences', items: fences },
        { label: 'Gates', items: gates },
        { label: 'Other', items: others },
      ].map(
        ({ label, items }) =>
          items.length > 0 && (
            <section key={label} className="mb-8">
              <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
                {label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((product) => {
                  return (
                    <Link
                      key={product.id}
                      to={`/admin/products/${product.id}`}
                      className="group block bg-brand-card border border-brand-border rounded-lg p-4 hover:border-brand-accent/40 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-brand-border/30">
                            <Package size={14} className="text-brand-muted" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-brand-text group-hover:text-brand-accent transition-colors">
                              {product.name}
                            </div>
                            <div className="text-xs text-brand-muted font-mono mt-0.5">
                              {product.system_type}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border ${
                              TYPE_COLOURS[product.product_type] ?? TYPE_COLOURS.other
                            }`}
                          >
                            {product.product_type}
                          </span>
                          {!product.active && (
                            <span className="text-xs px-1.5 py-0.5 rounded border text-red-400 bg-red-500/10 border-red-500/30">
                              inactive
                            </span>
                          )}
                        </div>
                      </div>

                      {product.description && (
                        <p className="text-xs text-brand-muted mb-3 line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {product.compatible_with_system_types?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {product.compatible_with_system_types.map((st) => (
                            <span
                              key={st}
                              className="text-xs px-1.5 py-0.5 rounded bg-brand-bg border border-brand-border text-brand-muted"
                            >
                              {st}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-end pt-2 border-t border-brand-border/50">
                        <ChevronRight
                          size={13}
                          className="text-brand-border group-hover:text-brand-accent transition-colors"
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )
      )}
    </AdminLayout>
  );
}
