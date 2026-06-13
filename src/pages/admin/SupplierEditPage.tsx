import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { SupplierForm } from '../../components/admin/SupplierForm';
import { getSupplierBySlug } from '../../lib/multiSupplier/queries';
import { upsertSupplier } from '../../lib/multiSupplier/mutations';
import { toast } from 'sonner';

export function SupplierEditPage() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isEditMode = !!slug;

  const { data: supplier, isLoading, error } = useQuery({
    queryKey: ['admin', 'supplier', slug],
    queryFn: () => getSupplierBySlug(slug!),
    enabled: isEditMode,
  });

  const saveMutation = useMutation({
    mutationFn: upsertSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
      if (slug) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'supplier', slug] });
      }
      toast.success(isEditMode ? 'Supplier updated successfully' : 'Supplier created successfully');
      navigate('/admin/suppliers');
    },
    onError: (err: any) => {
      toast.error(`Failed to save supplier: ${err.message}`);
    },
  });

  const handleCancel = () => {
    navigate('/admin/suppliers');
  };

  const handleSubmit = async (data: any) => {
    await saveMutation.mutateAsync(data);
  };

  return (
    <AdminLayout
      title={isEditMode ? `Edit Supplier: ${supplier?.name ?? ''}` : 'New Supplier'}
      subtitle={isEditMode ? 'Update details for this supplier.' : 'Create a brand new supplier record.'}
    >
      {isEditMode && isLoading ? (
        <div className="text-sm text-brand-muted animate-pulse">Loading supplier details…</div>
      ) : isEditMode && error ? (
        <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-sm text-brand-danger">
          {(error as Error).message}
        </div>
      ) : (
        <SupplierForm
          initialData={supplier ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={saveMutation.isPending}
        />
      )}
    </AdminLayout>
  );
}
