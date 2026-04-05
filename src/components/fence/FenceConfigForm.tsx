import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SubmitHandler } from 'react-hook-form';
import { FenceConfigSchema, defaultFenceConfig } from '../../schemas/fence.schema';
import type { FenceConfig } from '../../schemas/fence.schema';
import { useFenceConfig } from '../../context/FenceConfigContext';
import { FormField } from '../shared/FormField';
import { ColourSelect } from './ColourSelect';
import { SlatSizeSelect } from './SlatSizeSelect';
import { SlatGapSelect } from './SlatGapSelect';
import { ButtonGroup } from '../shared/ButtonGroup';
import {
  SYSTEM_TYPES,
  PANEL_WIDTHS,
  POST_MOUNTINGS,
  TERMINATIONS,
} from '../../lib/constants';

// Shared class for all form inputs/selects
const inputCls =
  'w-full px-2.5 py-2 bg-brand-bg border border-brand-border rounded text-sm text-brand-text ' +
  'focus:outline-none focus:border-brand-accent disabled:opacity-50 disabled:cursor-not-allowed';

interface FenceConfigFormProps {
  /** Called after form validates successfully. MainApp reads config from context. */
  onGenerate?: () => void;
}

export function FenceConfigForm({ onGenerate }: FenceConfigFormProps) {
  const { dispatch } = useFenceConfig();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FenceConfig>({
    resolver: zodResolver(FenceConfigSchema),
    defaultValues: defaultFenceConfig,
  });

  const systemType = watch('systemType');
  const isXpl = systemType === 'XPL';

  // Enforce XPL → 65mm in the form as well as context
  useEffect(() => {
    if (isXpl) {
      setValue('slatSize', '65');
    }
  }, [isXpl, setValue]);

  // Sync every change back to the context so downstream components always have the latest values
  useEffect(() => {
    const subscription = watch((values) => {
      dispatch({ type: 'SET_CONFIG', config: values as Partial<FenceConfig> });
    });
    return () => subscription.unsubscribe();
  }, [watch, dispatch]);

  const onSubmit: SubmitHandler<FenceConfig> = (_data) => {
    onGenerate?.();
  };

  return (
    <form id="fence-config-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ── Row 1: System type ────────────────────────────────────── */}
      <div className="mb-6">
        <FormField label="System Type" error={errors.systemType?.message}>
          <Controller
            name="systemType"
            control={control}
            render={({ field }) => (
              <ButtonGroup
                options={SYSTEM_TYPES}
                value={field.value}
                onChange={field.onChange}
                variant="system-type"
                data-testid="system-type"
              />
            )}
          />
        </FormField>
      </div>

      {/* ── Row 2: Customer ref / Run length / Target height ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <FormField label="Customer / Job Reference">
          <input
            {...register('customerRef')}
            type="text"
            placeholder="e.g. Smith Residence – Side Fence"
            className={inputCls}
          />
        </FormField>

        <FormField
          label="Total Run Length (m)"
          error={errors.totalRunLength?.message}
        >
          <input
            {...register('totalRunLength', { valueAsNumber: true })}
            type="number"
            step="0.5"
            min="0.5"
            data-testid="run-length"
            data-unit="m"
            className={inputCls}
          />
        </FormField>

        <FormField
          label="Target Height (mm)"
          error={errors.targetHeight?.message}
          note="300 – 2400mm"
        >
          <input
            {...register('targetHeight', { valueAsNumber: true })}
            type="number"
            step="1"
            min="300"
            max="2400"
            data-testid="target-height"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* ── Row 3: Slat size / Slat gap / Colour / Max panel width ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <FormField label="Slat Size" error={errors.slatSize?.message}>
          <SlatSizeSelect
            {...register('slatSize')}
            data-testid="slat-size"
            disabled={isXpl}
            className={inputCls}
          />
          {isXpl && (
            <p className="text-xs text-brand-muted mt-1">XPL uses 65mm only</p>
          )}
        </FormField>

        <FormField label="Slat Gap" error={errors.slatGap?.message}>
          <SlatGapSelect
            {...register('slatGap')}
            data-testid="slat-gap"
            className={inputCls}
          />
        </FormField>

        <FormField label="Colour" error={errors.colour?.message}>
          <ColourSelect
            {...register('colour')}
            data-testid="colour"
            className={inputCls}
          />
        </FormField>

        <FormField
          label="Max Panel Width"
          note="Use 2000mm for windy/exposed sites"
          error={errors.maxPanelWidth?.message}
        >
          <select
            {...register('maxPanelWidth')}
            data-testid="max-panel-width"
            className={inputCls}
          >
            {PANEL_WIDTHS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      {/* ── Row 4: Terminations / Post mounting / Corners ────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <FormField label="Left Termination" error={errors.leftTermination?.message}>
          <select
            {...register('leftTermination')}
            data-testid="left-termination"
            className={inputCls}
          >
            {TERMINATIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Right Termination" error={errors.rightTermination?.message}>
          <select
            {...register('rightTermination')}
            data-testid="right-termination"
            className={inputCls}
          >
            {TERMINATIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Post Mounting" error={errors.postMounting?.message}>
          <select
            {...register('postMounting')}
            data-testid="post-mounting"
            className={inputCls}
          >
            {POST_MOUNTINGS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </FormField>

        <FormField
          label="90° Corners in Run"
          note="Each corner adds 1 post"
          error={errors.corners?.message}
        >
          <input
            {...register('corners', { valueAsNumber: true })}
            type="number"
            min="0"
            max="10"
            step="1"
            data-testid="corners"
            className={inputCls}
          />
        </FormField>
      </div>

    </form>
  );
}
