import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GateSchema, defaultGateConfig } from '../../schemas/gate.schema';
import type { GateConfig } from '../../schemas/gate.schema';
import { FormField } from '../shared/FormField';
import { GateTypeSelect } from './GateTypeSelect';
import {
  COLOURS,
  SLAT_SIZES,
  SLAT_GAPS,
  GATE_POST_SIZES,
  HINGE_TYPES,
  LATCH_TYPES,
  VALIDATION,
} from '../../lib/constants';

const inputCls =
  'w-full px-2.5 py-2 bg-brand-bg border border-brand-border rounded text-sm text-brand-text ' +
  'focus:outline-none focus:border-brand-accent disabled:opacity-50 disabled:cursor-not-allowed';

interface GateFormProps {
  gateId: string;
  initialValues?: Partial<GateConfig>;
  onSave: (gate: GateConfig) => void;
  onCancel: () => void;
}

export function GateForm({ gateId, initialValues, onSave, onCancel }: GateFormProps) {
  // When true, height/colour/slat fields are locked to 'match-fence'
  const initialMatch =
    initialValues == null ||
    (initialValues.gateHeight === 'match-fence' &&
      initialValues.colour      === 'match-fence' &&
      initialValues.slatGap     === 'match-fence' &&
      initialValues.slatSize    === 'match-fence');
  const [matchFence, setMatchFence] = useState(initialMatch);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<GateConfig>({
    resolver: zodResolver(GateSchema),
    defaultValues: {
      ...defaultGateConfig,
      ...initialValues,
      id: gateId,
    },
  });

  const gateType = watch('gateType');
  const openingWidth = watch('openingWidth');
  const isSwing = gateType === 'single-swing' || gateType === 'double-swing';
  const isSliding = gateType === 'sliding';

  // Swing gates force 65mm slats — reset to match-fence when switching to sliding
  useEffect(() => {
    if (isSwing) {
      const current = watch('slatSize');
      if (current === '90') {
        setValue('slatSize', 'match-fence');
      }
    }
  }, [isSwing, setValue, watch]);

  const onSubmit = (data: GateConfig) => {
    onSave(data);
  };

  const swingWidthWarning = isSwing && openingWidth > VALIDATION.maxSwingGateWidth;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>

      {/* ── Gate type ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <FormField label="Gate Type" error={errors.gateType?.message}>
          <GateTypeSelect
            {...register('gateType')}
            data-testid="gate-type"
            className={inputCls}
          />
        </FormField>

        <FormField
          label="Opening Width (mm)"
          error={errors.openingWidth?.message}
          note={swingWidthWarning ? '⚠ Exceeds recommended 1200mm for swing gates' : undefined}
        >
          <input
            {...register('openingWidth', { valueAsNumber: true })}
            type="number"
            step="1"
            min="200"
            max="6000"
            data-testid="gate-opening-width"
            className={inputCls + (swingWidthWarning ? ' border-yellow-500' : '')}
          />
        </FormField>
      </div>

      {/* ── Match gate to fence toggle ─────────────────────────────── */}
      <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={matchFence}
          data-testid="match-gate-to-fence"
          onChange={(e) => {
            const checked = e.target.checked;
            setMatchFence(checked);
            if (checked) {
              setValue('gateHeight', 'match-fence');
              setValue('colour',     'match-fence');
              setValue('slatGap',    'match-fence');
              setValue('slatSize',   'match-fence');
            }
          }}
          className="w-4 h-4 accent-brand-accent"
        />
        <span className="text-sm text-brand-text">Match gate to fence (height, colour, slat size &amp; gap)</span>
      </label>

      {/* ── Height / Colour / Slat gap / Slat size ─────────────────── */}
      {!matchFence && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <FormField label="Gate Height" error={errors.gateHeight?.message}>
          <Controller
            name="gateHeight"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                value={String(field.value)}
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === 'match-fence' ? 'match-fence' : Number(v));
                }}
                data-testid="gate-height"
                className={inputCls}
              >
                <option value="match-fence">Match fence</option>
                {[900, 1050, 1200, 1500, 1800, 1950, 2100].map((h) => (
                  <option key={h} value={h}>{h}mm</option>
                ))}
              </select>
            )}
          />
        </FormField>

        <FormField label="Colour" error={errors.colour?.message}>
          <select
            {...register('colour')}
            data-testid="gate-colour"
            className={inputCls}
          >
            <option value="match-fence">Match fence</option>
            {COLOURS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}{c.limited ? ' ⚠' : ''}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Slat Gap" error={errors.slatGap?.message}>
          <select
            {...register('slatGap')}
            data-testid="gate-slat-gap"
            className={inputCls}
          >
            <option value="match-fence">Match fence</option>
            {SLAT_GAPS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Slat Size"
          error={errors.slatSize?.message}
          note={isSwing ? 'Swing gates use 65mm only' : undefined}
        >
          <select
            {...register('slatSize')}
            data-testid="gate-slat-size"
            className={inputCls}
            disabled={isSwing}
          >
            <option value="match-fence">Match fence</option>
            {SLAT_SIZES.map((s) => (
              // 90mm only available for sliding
              (!isSwing || s.value === '65') && (
                <option key={s.value} value={s.value}>{s.label}</option>
              )
            ))}
          </select>
        </FormField>
      </div>
      )}

      {/* ── Post size / Hinge type / Latch type ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <FormField label="Gate Post Size" error={errors.gatePostSize?.message}>
          <select
            {...register('gatePostSize')}
            data-testid="gate-post-size"
            className={inputCls}
          >
            {GATE_POST_SIZES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}{p.warning ? ` — ${p.warning}` : ''}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Hinge Type" error={errors.hingeType?.message}>
          <select
            {...register('hingeType')}
            data-testid="gate-hinge-type"
            className={inputCls}
          >
            {HINGE_TYPES.map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Latch Type" error={errors.latchType?.message}>
          <select
            {...register('latchType')}
            data-testid="gate-latch-type"
            className={inputCls}
          >
            {LATCH_TYPES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      {/* ── Sliding gate note ─────────────────────────────────────── */}
      {isSliding && (
        <p className="text-xs text-brand-muted mb-4">
          Sliding gate BOM includes: track, guide rollers, and drop bolt (auto-calculated).
        </p>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          type="submit"
          data-testid="gate-save-btn"
          className="flex-1 py-2 px-4 bg-brand-accent hover:bg-brand-accent-hover text-white font-semibold rounded-md transition-colors text-sm"
        >
          Save Gate
        </button>
        <button
          type="button"
          onClick={onCancel}
          data-testid="gate-cancel-btn"
          className="py-2 px-4 border border-brand-border text-brand-muted hover:text-brand-text rounded-md transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
