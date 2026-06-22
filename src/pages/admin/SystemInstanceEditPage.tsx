import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { SystemInstanceForm } from '../../components/admin/SystemInstanceForm';
import { getSystemInstanceById } from '../../lib/multiSupplier/queries';
import { upsertSystemInstance } from '../../lib/multiSupplier/mutations';
import { toast } from 'sonner';

export function SystemInstanceEditPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isEditMode = !!id;

  const { data: instance, isLoading, error } = useQuery({
    queryKey: ['admin', 'instance', id],
    queryFn: () => getSystemInstanceById(id!),
    enabled: isEditMode,
  });

  const saveMutation = useMutation({
    mutationFn: upsertSystemInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'instances'] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'instance', id] });
      }
      toast.success(isEditMode ? 'System instance updated successfully' : 'System instance created successfully');
      navigate('/admin/system-instances');
    },
    onError: (err: any) => {
      toast.error(`Failed to save system instance: ${err.message}`);
    },
  });

  const handleCancel = () => {
    navigate('/admin/system-instances');
  };

  const handleSubmit = async (data: any) => {
    await saveMutation.mutateAsync(data);
  };

  return (
    <AdminLayout
      title={isEditMode ? `Edit System Instance: ${instance?.name ?? ''}` : 'New System Instance'}
      subtitle={isEditMode ? 'Update variables and status mappings for this instance.' : 'Register a new system instance configuration.'}
    >
      {isEditMode && isLoading ? (
        <div className="text-sm text-brand-muted animate-pulse">Loading system instance details…</div>
      ) : isEditMode && error ? (
        <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-sm text-brand-danger">
          {(error as Error).message}
        </div>
      ) : (
        <SystemInstanceForm
          initialData={instance ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={saveMutation.isPending}
        />
      )}
    </AdminLayout>
  );
}
