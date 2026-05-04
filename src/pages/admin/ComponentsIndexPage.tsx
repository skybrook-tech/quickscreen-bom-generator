import { useState, useMemo, Fragment } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { PricingWarningBadge } from '../../components/admin/PricingWarningBadge';
import { SharedByBadge } from '../../components/admin/SharedByBadge';
import { useProductComponents, type ComponentWithPricing } from '../../hooks/useProductComponents';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';

// ─── Pricing rows sub-table ───────────────────────────────────────────────────

interface PricingRowsProps {
  componentId: string;
  orgId: string;
  onRefresh: () => void;
}

function PricingRows({ componentId, orgId, onRefresh }: PricingRowsProps) {
  const [rows, setRows] = useState<Array<{
    id: string; tier_code: string; rule: string | null; price: number; priority: number;
  }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('pricing_rules')
      .select('id, tier_code, rule, price, priority')
      .eq('component_id', componentId)
      .order('tier_code')
      .order('priority');
    setLoading(false);
    setLoaded(true);
    if (err) { setError(err.message); return; }
    setRows(data ?? []);
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('pricing_rules').delete().eq('id', id);
    if (err) { alert(err.message); return; }
    setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
    onRefresh();
  };

  const handleAdd = async () => {
    const tier = prompt('Tier (tier1 / tier2 / tier3):', 'tier1');
    if (!tier) return;
    const priceStr = prompt('Price (ex-GST):');
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (isNaN(price)) { alert('Invalid price'); return; }
    const rule = prompt('Rule (math.js, leave blank for always):') ?? null;

    const { error: err } = await supabase.from('pricing_rules').insert({
      org_id: orgId,
      component_id: componentId,
      tier_code: tier,
      price,
      rule: rule || null,
      priority: 0,
      active: true,
    });
    if (err) { alert(err.message); return; }
    setLoaded(false);
    setRows(null);
    await load();
    onRefresh();
  };

  return (
    <div className="px-3 py-3 bg-brand-bg/50 border-t border-brand-border/50">
      {!loaded ? (
        <button
          onClick={load}
          className="text-xs text-brand-accent hover:underline"
        >
          {loading ? 'Loading…' : 'Load pricing rows'}
        </button>
      ) : (
        <>
          {error && <p className="text-xs text-brand-danger mb-2">{error}</p>}
          {rows && rows.length > 0 ? (
            <table className="w-full text-xs mb-2">
              <thead>
                <tr className="text-brand-muted">
                  <th className="text-left pr-3 py-1 font-medium">Tier</th>
                  <th className="text-left pr-3 py-1 font-medium">Price</th>
                  <th className="text-left pr-3 py-1 font-medium">Priority</th>
                  <th className="text-left py-1 font-medium">Rule</th>
                  <th className="py-1 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-brand-border/30">
                    <td className="pr-3 py-1 font-mono text-brand-text">{r.tier_code}</td>
                    <td className="pr-3 py-1 text-brand-success">${r.price.toFixed(2)}</td>
                    <td className="pr-3 py-1 text-brand-muted">{r.priority}</td>
                    <td className="py-1 text-brand-muted font-mono">{r.rule ?? '—'}</td>
                    <td className="py-1 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-brand-danger/60 hover:text-brand-danger text-xs px-1"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-brand-muted mb-2">No pricing rules</p>
          )}
          <button
            onClick={handleAdd}
            className="text-xs text-brand-accent hover:underline"
          >
            + Add pricing row
          </button>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ComponentsIndexPage() {
  const qc = useQueryClient();
  const { data: components, isLoading, error } = useProductComponents();
  const { orgId: orgId_ } = useProfile();
  const orgId = orgId_ ?? '';

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [systemTypeFilter, setSystemTypeFilter] = useState('');
  const [showUnpricedOnly, setShowUnpricedOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const categories = useMemo(
    () => Array.from(new Set(components?.map((c) => c.category) ?? [])).sort(),
    [components]
  );

  const systemTypes = useMemo(
    () =>
      Array.from(
        new Set(components?.flatMap((c) => c.system_types) ?? [])
      ).sort(),
    [components]
  );

  const filtered = useMemo(() => {
    if (!components) return [];
    return components.filter((c) => {
      if (search && !c.sku.toLowerCase().includes(search.toLowerCase()) && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (systemTypeFilter && !c.system_types.includes(systemTypeFilter)) return false;
      if (showUnpricedOnly && c.hasPricing) return false;
      return true;
    });
  }, [components, search, categoryFilter, systemTypeFilter, showUnpricedOnly]);

  const unpricedCount = components?.filter((c) => !c.hasPricing).length ?? 0;

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRefresh = (id: string) => {
    qc.invalidateQueries({ queryKey: ['admin-all-components'] });
    qc.invalidateQueries({ queryKey: ['admin-components-by-system-type'] });
    setExpanded((prev) => new Set([...prev, id]));
  };

  return (
    <AdminLayout
      title="Component Catalog"
      subtitle="All SKUs in the system. Components without pricing rules are highlighted."
    >
      {/* Warning banner */}
      {unpricedCount > 0 && (
        <div className="flex items-center gap-2 p-3 mb-5 bg-brand-warning/10 border border-brand-warning/20 rounded-lg text-sm text-brand-warning">
          <AlertCircle size={16} />
          <strong>{unpricedCount}</strong> component{unpricedCount !== 1 ? 's' : ''} without pricing rules
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search SKU or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-brand-card border border-brand-border rounded-lg text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-accent"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:border-brand-accent"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={systemTypeFilter}
          onChange={(e) => setSystemTypeFilter(e.target.value)}
          className="text-sm bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:border-brand-accent"
        >
          <option value="">All products</option>
          {systemTypes.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-brand-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showUnpricedOnly}
            onChange={(e) => setShowUnpricedOnly(e.target.checked)}
            className="accent-brand-accent"
          />
          Unpriced only
        </label>

        <span className="text-xs text-brand-muted ml-auto">
          {filtered.length} / {components?.length ?? 0} shown
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-brand-muted animate-pulse">Loading components…</div>
      ) : error ? (
        <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-sm text-brand-danger">
          {(error as Error).message}
        </div>
      ) : (
        <div className="rounded-lg border border-brand-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/50">
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted w-8" />
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">SKU</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Name</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Category</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Unit</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Products</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Pricing</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: ComponentWithPricing, i) => (
                <Fragment key={c.id}>
                  <tr
                    className={`border-b border-brand-border/50 hover:bg-brand-border/10 cursor-pointer ${
                      !c.hasPricing ? 'bg-brand-warning/5' : i % 2 === 0 ? '' : 'bg-brand-bg/30'
                    }`}
                    onClick={() => toggleExpanded(c.id)}
                  >
                    <td className="px-3 py-2 text-brand-muted">
                      {expanded.has(c.id) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-brand-text">{c.sku}</td>
                    <td className="px-3 py-2 text-brand-text">{c.name}</td>
                    <td className="px-3 py-2 text-brand-muted">{c.category}</td>
                    <td className="px-3 py-2 text-brand-muted">{c.unit}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.system_types.map((st) => (
                          <span
                            key={st}
                            className="text-xs px-1.5 py-0.5 rounded border text-brand-muted bg-brand-bg border-brand-border"
                          >
                            {st}
                          </span>
                        ))}
                        <SharedByBadge systemTypes={c.system_types} />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <PricingWarningBadge hasPricing={c.hasPricing} count={c.pricingCount} />
                    </td>
                  </tr>
                  {expanded.has(c.id) && (
                    <tr className="border-b border-brand-border/50">
                      <td colSpan={7} className="p-0">
                        <PricingRows
                          componentId={c.id}
                          orgId={orgId}
                          onRefresh={() => handleRefresh(c.id)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-brand-muted">No components match the current filters</div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
