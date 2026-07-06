import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { PricingWarningBadge } from '../../components/admin/PricingWarningBadge';
import { SharedByBadge } from '../../components/admin/SharedByBadge';
import { useAdminProducts } from '../../hooks/useAdminProducts';
import { useProductComponentsBySystemType } from '../../hooks/useProductComponents';

function ComponentsTab({ systemType }: { systemType: string }) {
  const { data: components, isLoading } = useProductComponentsBySystemType(systemType);

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-brand-muted animate-pulse">Loading…</div>;
  }

  const unpricedCount = components?.filter((c) => !c.hasPricing).length ?? 0;

  return (
    <div>
      {unpricedCount > 0 && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
          <AlertCircle size={13} />
          {unpricedCount} component{unpricedCount !== 1 ? 's' : ''} without pricing rules
        </div>
      )}

      <div className="text-xs text-brand-muted mb-3">{components?.length ?? 0} components</div>

      {!components || components.length === 0 ? (
        <div className="py-10 text-center text-sm text-brand-muted border border-dashed border-brand-border rounded-lg">
          No components found for {systemType}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brand-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/50">
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">SKU</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Name</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Category</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Unit</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Used By</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Pricing</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-brand-border/50 hover:bg-brand-border/10 ${
                    !c.hasPricing ? 'bg-amber-500/5' : i % 2 === 0 ? '' : 'bg-brand-bg/30'
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-brand-text">{c.sku}</td>
                  <td className="px-3 py-2 text-brand-text">{c.name}</td>
                  <td className="px-3 py-2 text-brand-muted">{c.category}</td>
                  <td className="px-3 py-2 text-brand-muted">{c.unit}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.system_types.map((st) => (
                        <span
                          key={st}
                          className={`text-xs px-1.5 py-0.5 rounded border ${
                            st === systemType
                              ? 'text-brand-accent bg-brand-accent/10 border-brand-accent/30'
                              : 'text-brand-muted bg-brand-bg border-brand-border'
                          }`}
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                    <SharedByBadge systemTypes={c.system_types} className="mt-1" />
                  </td>
                  <td className="px-3 py-2">
                    <PricingWarningBadge hasPricing={c.hasPricing} count={c.pricingCount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ProductDetailPage() {
  const { id: productId } = useParams<{ id: string }>();
  const { data: products } = useAdminProducts();
  const product = products?.find((p) => p.id === productId);

  if (!product && products) {
    return (
      <AdminLayout title="Product not found">
        <Link to="/admin/products" className="text-sm text-brand-accent hover:underline flex items-center gap-1.5">
          <ArrowLeft size={13} />
          Back to products
        </Link>
      </AdminLayout>
    );
  }

  const productName = product?.name ?? 'Loading…';
  const systemType = product?.system_type ?? '';

  return (
    <AdminLayout
      title={productName}
      subtitle={`${product?.system_type ?? ''} · ${product?.product_type ?? ''}`}
    >
      <div className="mb-4">
        <Link
          to="/admin/products"
          className="text-xs text-brand-muted hover:text-brand-accent flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={12} />
          All products
        </Link>
      </div>

      {systemType && <ComponentsTab systemType={systemType} />}
    </AdminLayout>
  );
}
