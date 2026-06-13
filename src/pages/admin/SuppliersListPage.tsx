import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { listAllSuppliers } from '../../lib/multiSupplier/queries';
import { deleteSupplier } from '../../lib/multiSupplier/mutations';
import { Button } from '../../components/ui/Button';
import { toast } from 'sonner';

const TIER_BADGES: Record<string, string> = {
  platform: 'text-brand-accent bg-brand-accent/10 border-brand-accent/30',
  verified: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  community: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  user: 'text-brand-muted bg-brand-border/20 border-brand-border/40',
};

const STATUS_BADGES: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  hidden: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  draft: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  discontinued: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export function SuppliersListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: suppliers = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'suppliers', 'all'],
    queryFn: listAllSuppliers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
      toast.success('Supplier deleted successfully');
    },
    onError: (err: any) => {
      toast.error(`Failed to delete supplier: ${err.message}`);
    },
  });

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const term = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        s.slug.toLowerCase().includes(term) ||
        (s.contactEmail && s.contactEmail.toLowerCase().includes(term))
      );
    });
  }, [suppliers, search]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete supplier "${name}"? This action cannot be undone.`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <AdminLayout
      title="Suppliers"
      subtitle="Manage all system product suppliers, contact emails, brand guidelines, trust levels, and active status."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search suppliers by name, slug or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-brand-card border border-brand-border rounded-lg text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-accent"
            data-testid="supplier-search-input"
          />
        </div>

        <Button
          onClick={() => navigate('/admin/suppliers/new')}
          variant="primary"
          icon={Plus}
          data-testid="create-supplier-btn"
        >
          New Supplier
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-brand-muted animate-pulse">Loading suppliers…</div>
      ) : error ? (
        <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-sm text-brand-danger">
          {(error as Error).message}
        </div>
      ) : (
        <div className="rounded-lg border border-brand-border overflow-hidden bg-brand-card">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-brand-border bg-brand-bg/50">
                  <th className="px-4 py-3 font-medium text-brand-muted">Logo</th>
                  <th className="px-4 py-3 font-medium text-brand-muted">Name</th>
                  <th className="px-4 py-3 font-medium text-brand-muted">Slug</th>
                  <th className="px-4 py-3 font-medium text-brand-muted">Contact Email</th>
                  <th className="px-4 py-3 font-medium text-brand-muted">Trust Tier</th>
                  <th className="px-4 py-3 font-medium text-brand-muted">Status</th>
                  <th className="px-4 py-3 font-medium text-brand-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-brand-border/10 transition-colors" data-testid="supplier-row">
                    <td className="px-4 py-3">
                      {supplier.logoUrl ? (
                        <img
                          src={supplier.logoUrl}
                          alt={`${supplier.name} logo`}
                          className="w-6 h-6 object-contain rounded bg-white p-0.5 border border-brand-border"
                        />
                      ) : (
                        <div
                          className="w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold text-white uppercase border border-brand-border/50"
                          style={{ backgroundColor: supplier.brandColour || '#4B5563' }}
                        >
                          {supplier.name.slice(0, 2)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-brand-text">
                      <Link to={`/admin/suppliers/${supplier.slug}/edit`} className="hover:text-brand-accent transition-colors">
                        {supplier.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-brand-muted">{supplier.slug}</td>
                    <td className="px-4 py-3 text-brand-muted">{supplier.contactEmail || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold ${TIER_BADGES[supplier.trustTier]}`}>
                        {supplier.trustTier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold ${STATUS_BADGES[supplier.status]}`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/suppliers/${supplier.slug}/edit`}
                          className="p-1 text-brand-muted hover:text-brand-accent transition-colors"
                          title="Edit Supplier"
                          data-testid="edit-supplier-link"
                        >
                          <Edit2 size={13} />
                        </Link>
                        <button
                          onClick={() => handleDelete(supplier.id, supplier.name)}
                          className="p-1 text-brand-muted hover:text-brand-danger transition-colors disabled:opacity-40"
                          title="Delete Supplier"
                          disabled={deleteMutation.isPending}
                          data-testid="delete-supplier-btn"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-brand-muted">
                      No suppliers found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
