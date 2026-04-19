import { ColourSelect } from '../fence/ColourSelect';
import { SlatSizeSelect } from '../fence/SlatSizeSelect';
import { SlatGapSelect } from '../fence/SlatGapSelect';
import { FormField } from '../shared/FormField';

export interface SchemaField {
  id: string;
  field_key: string;
  label: string;
  control_type: string;
  data_type: string;
  unit?: string;
  required: boolean;
  default_value_json?: unknown;
  options_json: unknown[];
  visible_when_json: Record<string, unknown>;
  sort_order: number;
}

interface SchemaDrivenFormProps {
  fields: SchemaField[];
  onChange: (key: string, value: string | number | boolean) => void;
  variables: Record<string, string | number | boolean>;
}

function isVisible(visibleWhen: Record<string, unknown>, variables: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(visibleWhen)) {
    if (Array.isArray(v)) {
      if (!v.includes(variables[k])) return false;
    } else {
      if (variables[k] !== v) return false;
    }
  }
  return true;
}

// Every field wraps in a 1/3-width flex item on desktop, full-width on mobile.
// Extendable later with per-field `width` hints; intentionally simple for now.
const FIELD_WRAPPER = 'w-full md:w-[calc(33.333%-0.6667rem)]';

export function SchemaDrivenForm({ fields, onChange, variables }: SchemaDrivenFormProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {fields.map(field => {
        if (!isVisible(field.visible_when_json ?? {}, variables)) return null;

        if (field.field_key === 'colour_code') {
          return (
            <div key={field.id} data-testid={field.field_key} className={FIELD_WRAPPER}>
              <FormField label={field.label}>
                <ColourSelect
                  value={String(variables[field.field_key] ?? '')}
                  onChange={e => onChange(field.field_key, e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text"
                />
              </FormField>
            </div>
          );
        }

        if (field.field_key === 'slat_size_mm') {
          return (
            <div key={field.id} data-testid={field.field_key} className={FIELD_WRAPPER}>
              <FormField label={field.label} note={field.unit ? `Units: ${field.unit}` : undefined}>
                <SlatSizeSelect
                  value={String(variables[field.field_key] ?? '65')}
                  onChange={e => onChange(field.field_key, Number(e.target.value))}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text"
                />
              </FormField>
            </div>
          );
        }

        if (field.field_key === 'slat_gap_mm') {
          return (
            <div key={field.id} data-testid={field.field_key} className={FIELD_WRAPPER}>
              <FormField label={field.label} note={field.unit ? `Units: ${field.unit}` : undefined}>
                <SlatGapSelect
                  value={String(variables[field.field_key] ?? '5')}
                  onChange={e => onChange(field.field_key, Number(e.target.value))}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text"
                />
              </FormField>
            </div>
          );
        }

        if (field.control_type === 'select' && Array.isArray(field.options_json) && field.options_json.length > 0) {
          return (
            <div key={field.id} data-testid={field.field_key} className={FIELD_WRAPPER}>
              <FormField label={field.label} note={field.unit ? `Units: ${field.unit}` : undefined}>
                <select
                  value={String(variables[field.field_key] ?? '')}
                  onChange={e => onChange(field.field_key, e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text"
                >
                  {field.options_json.map(opt => (
                    <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
                  ))}
                </select>
              </FormField>
            </div>
          );
        }

        if (field.control_type === 'number') {
          return (
            <div key={field.id} data-testid={field.field_key} className={FIELD_WRAPPER}>
              <FormField label={field.label} note={field.unit ? `Units: ${field.unit}` : undefined}>
                <input
                  type="number"
                  value={Number(variables[field.field_key] ?? field.default_value_json ?? 0)}
                  onChange={e => onChange(
                    field.field_key,
                    field.data_type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value)
                  )}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text"
                />
              </FormField>
            </div>
          );
        }

        if (field.control_type === 'toggle') {
          return (
            <div key={field.id} data-testid={field.field_key} className={`${FIELD_WRAPPER} flex items-center gap-3`}>
              <input
                type="checkbox"
                checked={Boolean(variables[field.field_key])}
                onChange={e => onChange(field.field_key, e.target.checked)}
                className="rounded"
              />
              <label className="text-sm font-medium text-brand-text">{field.label}</label>
            </div>
          );
        }

        return (
          <div key={field.id} data-testid={field.field_key} className={FIELD_WRAPPER}>
            <FormField label={field.label} note={field.unit ? `Units: ${field.unit}` : undefined}>
              <input
                type="text"
                value={String(variables[field.field_key] ?? '')}
                onChange={e => onChange(field.field_key, e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text"
              />
            </FormField>
          </div>
        );
      })}
    </div>
  );
}
