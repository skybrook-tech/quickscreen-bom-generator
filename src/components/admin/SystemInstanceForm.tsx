import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { listAllSuppliers, listArchetypes } from '../../lib/multiSupplier/queries';
import type { SystemInstance } from '../../types/multiSupplier';
import { Button } from '../ui/Button';

const systemInstanceFormSchema = z.object({
  supplierId: z.string().uuid('Please select a supplier'),
  archetypeId: z.string().uuid('Please select a system archetype'),
  name: z.string().min(1, 'Name is required'),
  slug: z.string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase alphanumeric characters and hyphens'),
  description: z.string().optional(),
  status: z.enum(['active', 'hidden', 'draft', 'discontinued']),
  readinessStatus: z.enum(['draft', 'imported', 'calculator_ready', 'price_checked', 'spreadsheet_tested', 'approved']),
  trustTier: z.enum(['platform', 'verified', 'community', 'user']),
  visibility: z.enum(['private', 'org_shared', 'public']),
  readinessNotes: z.string().optional(),
  metadataString: z.string().refine((val) => {
    if (!val.trim()) return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, 'Must be valid JSON'),
});

type SystemInstanceFormData = z.infer<typeof systemInstanceFormSchema>;

interface SystemInstanceFormProps {
  initialData?: Partial<SystemInstance>;
  onSubmit: (data: Omit<SystemInstance, 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function SystemInstanceForm({ initialData, onSubmit, onCancel, isLoading }: SystemInstanceFormProps) {
  const { isAdmin } = useProfile();
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSlugManuallyEdited = useRef(false);

  const isEditMode = !!initialData?.id;

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['admin', 'suppliers'],
    queryFn: listAllSuppliers,
  });

  const { data: archetypes = [], isLoading: loadingArchetypes } = useQuery({
    queryKey: ['admin', 'archetypes'],
    queryFn: listArchetypes,
  });

  const defaultValues: SystemInstanceFormData = {
    supplierId: initialData?.supplierId ?? '',
    archetypeId: initialData?.archetypeId ?? '',
    name: initialData?.name ?? '',
    slug: initialData?.slug ?? '',
    description: initialData?.description ?? '',
    status: initialData?.status ?? 'draft',
    readinessStatus: initialData?.readinessStatus ?? 'draft',
    trustTier: initialData?.trustTier ?? 'user',
    visibility: initialData?.visibility ?? 'private',
    readinessNotes: initialData?.readinessNotes ?? '',
    metadataString: initialData?.metadata ? JSON.stringify(initialData.metadata, null, 2) : '',
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SystemInstanceFormData>({
    resolver: zodResolver(systemInstanceFormSchema),
    defaultValues,
  });

  const nameValue = watch('name');

  // Auto-slugify name when creating a new instance
  useEffect(() => {
    if (!isEditMode && !isSlugManuallyEdited.current) {
      const generatedSlug = (nameValue || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setValue('slug', generatedSlug, { shouldValidate: true });
    }
  }, [nameValue, isEditMode, setValue]);

  const onFormSubmit = async (data: SystemInstanceFormData) => {
    try {
      setSubmitError(null);
      let parsedMetadata: Record<string, unknown> | undefined;
      if (data.metadataString.trim()) {
        parsedMetadata = JSON.parse(data.metadataString);
      }

      await onSubmit({
        id: initialData?.id || crypto.randomUUID(),
        supplierId: data.supplierId,
        archetypeId: data.archetypeId,
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
        status: data.status,
        readinessStatus: data.readinessStatus,
        trustTier: data.trustTier,
        visibility: data.visibility,
        readinessNotes: data.readinessNotes || undefined,
        metadata: parsedMetadata,
        authoredBy: initialData?.authoredBy,
        orgId: initialData?.orgId,
        approvedBy: initialData?.approvedBy,
        approvedAt: initialData?.approvedAt,
      });
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred while saving the system instance.');
    }
  };

  const trustTiers = isAdmin
    ? [
        { value: 'platform', label: 'Platform' },
        { value: 'verified', label: 'Verified' },
        { value: 'community', label: 'Community' },
        { value: 'user', label: 'User' },
      ]
    : [
        { value: 'community', label: 'Community' },
        { value: 'user', label: 'User' },
      ];

  const statuses = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'hidden', label: 'Hidden' },
    { value: 'discontinued', label: 'Discontinued' },
  ];

  const readinessStatuses = [
    { value: 'draft', label: 'Draft' },
    { value: 'imported', label: 'Imported' },
    { value: 'calculator_ready', label: 'Calculator Ready' },
    { value: 'price_checked', label: 'Price Checked' },
    { value: 'spreadsheet_tested', label: 'Spreadsheet Tested' },
    { value: 'approved', label: 'Approved' },
  ];

  const visibilities = [
    { value: 'private', label: 'Private (Org Only)' },
    { value: 'org_shared', label: 'Organization Shared' },
    { value: 'public', label: 'Public' },
  ];

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 max-w-2xl bg-brand-card border border-brand-border p-6 rounded-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            Supplier <span className="text-brand-danger">*</span>
          </label>
          <select
            {...register('supplierId')}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text focus:outline-none focus:border-brand-accent text-sm"
            disabled={loadingSuppliers || isEditMode}
            data-testid="instance-supplier-id"
          >
            <option value="">{loadingSuppliers ? 'Loading suppliers…' : 'Select a Supplier'}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id} className="bg-brand-card">
                {supplier.name} ({supplier.slug})
              </option>
            ))}
          </select>
          {errors.supplierId && (
            <p className="mt-1 text-xs text-brand-danger">{errors.supplierId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            System Archetype <span className="text-brand-danger">*</span>
          </label>
          <select
            {...register('archetypeId')}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text focus:outline-none focus:border-brand-accent text-sm"
            disabled={loadingArchetypes || isEditMode}
            data-testid="instance-archetype-id"
          >
            <option value="">{loadingArchetypes ? 'Loading archetypes…' : 'Select an Archetype'}</option>
            {archetypes.map((archetype) => (
              <option key={archetype.id} value={archetype.id} className="bg-brand-card">
                {archetype.name} ({archetype.family})
              </option>
            ))}
          </select>
          {errors.archetypeId && (
            <p className="mt-1 text-xs text-brand-danger">{errors.archetypeId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            Instance Name <span className="text-brand-danger">*</span>
          </label>
          <input
            {...register('name')}
            type="text"
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent text-sm"
            placeholder="e.g. QSHS Slat Screening"
            data-testid="instance-name"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-brand-danger">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            Slug <span className="text-brand-danger">*</span>
          </label>
          <input
            {...register('slug', {
              onChange: () => {
                isSlugManuallyEdited.current = true;
              },
            })}
            type="text"
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent text-sm disabled:opacity-60"
            placeholder="e.g. qshs-slat-screening"
            disabled={isEditMode}
            data-testid="instance-slug"
          />
          {errors.slug && (
            <p className="mt-1 text-xs text-brand-danger">{errors.slug.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-brand-text mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent text-sm h-20"
            placeholder="Detailed description of the instance, dimensions, standard spacing, etc."
            data-testid="instance-description"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-brand-danger">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            Status <span className="text-brand-danger">*</span>
          </label>
          <select
            {...register('status')}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text focus:outline-none focus:border-brand-accent text-sm"
            data-testid="instance-status"
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value} className="bg-brand-card">
                {status.label}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="mt-1 text-xs text-brand-danger">{errors.status.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            Readiness Status <span className="text-brand-danger">*</span>
          </label>
          <select
            {...register('readinessStatus')}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text focus:outline-none focus:border-brand-accent text-sm"
            data-testid="instance-readiness-status"
          >
            {readinessStatuses.map((status) => (
              <option key={status.value} value={status.value} className="bg-brand-card">
                {status.label}
              </option>
            ))}
          </select>
          {errors.readinessStatus && (
            <p className="mt-1 text-xs text-brand-danger">{errors.readinessStatus.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            Trust Tier <span className="text-brand-danger">*</span>
          </label>
          <select
            {...register('trustTier')}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text focus:outline-none focus:border-brand-accent text-sm"
            data-testid="instance-trust-tier"
          >
            {trustTiers.map((tier) => (
              <option key={tier.value} value={tier.value} className="bg-brand-card">
                {tier.label}
              </option>
            ))}
          </select>
          {errors.trustTier && (
            <p className="mt-1 text-xs text-brand-danger">{errors.trustTier.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            Visibility <span className="text-brand-danger">*</span>
          </label>
          <select
            {...register('visibility')}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text focus:outline-none focus:border-brand-accent text-sm"
            data-testid="instance-visibility"
          >
            {visibilities.map((vis) => (
              <option key={vis.value} value={vis.value} className="bg-brand-card">
                {vis.label}
              </option>
            ))}
          </select>
          {errors.visibility && (
            <p className="mt-1 text-xs text-brand-danger">{errors.visibility.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-brand-text mb-1">
            Readiness Notes
          </label>
          <textarea
            {...register('readinessNotes')}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent text-sm h-20"
            placeholder="e.g. Awaiting final pricing validation against spreadsheet. Handrail accessory triggers missing."
            data-testid="instance-readiness-notes"
          />
          {errors.readinessNotes && (
            <p className="mt-1 text-xs text-brand-danger">{errors.readinessNotes.message}</p>
          )}
        </div>
      </div>

      {/* Collapsible Metadata JSON Box */}
      <div className="border border-brand-border rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-brand-bg hover:bg-brand-border/10 transition-colors text-sm text-brand-text font-medium"
        >
          <span>Metadata Configuration (JSON)</span>
          {isMetadataExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isMetadataExpanded && (
          <div className="p-4 bg-brand-card border-t border-brand-border">
            <p className="text-xs text-brand-muted mb-2">
              Provide optional metadata configurations for this system instance in structured JSON format.
            </p>
            <textarea
              {...register('metadataString')}
              className="w-full h-32 px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text font-mono text-xs placeholder-brand-muted focus:outline-none focus:border-brand-accent"
              placeholder='{\n  "stockCheck": true,\n  "supportedRegions": ["QLD", "NSW"]\n}'
              data-testid="instance-metadata"
            />
            {errors.metadataString && (
              <p className="mt-1 text-xs text-brand-danger">{errors.metadataString.message}</p>
            )}
          </div>
        )}
      </div>

      {submitError && (
        <div className="p-3 bg-brand-danger/10 border border-brand-danger/30 text-brand-danger rounded-md text-sm">
          {submitError}
        </div>
      )}

      <div className="flex items-center gap-3 justify-end">
        {onCancel && (
          <Button onClick={onCancel} variant="secondary" disabled={isLoading} data-testid="cancel-btn">
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isLoading} data-testid="submit-btn">
          {isLoading ? 'Saving…' : isEditMode ? 'Update Instance' : 'Create Instance'}
        </Button>
      </div>
    </form>
  );
}
