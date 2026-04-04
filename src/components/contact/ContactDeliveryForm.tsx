import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { ContactSchema, defaultContactInfo } from '../../schemas/contact.schema';
import type { ContactInfo } from '../../schemas/contact.schema';
import { FormField } from '../shared/FormField';

const inputCls =
  'w-full px-2.5 py-2 bg-brand-bg border border-brand-border rounded text-sm text-brand-text ' +
  'focus:outline-none focus:border-brand-accent';

interface ContactDeliveryFormProps {
  onChange: (contact: ContactInfo) => void;
  initialValues?: Partial<ContactInfo>;
}

export function ContactDeliveryForm({ onChange, initialValues }: ContactDeliveryFormProps) {
  const { register, watch, formState: { errors } } = useForm<ContactInfo>({
    resolver: zodResolver(ContactSchema),
    defaultValues: { ...defaultContactInfo, ...initialValues },
  });

  const fulfilment = watch('fulfilment');

  useEffect(() => {
    const sub = watch((values) => onChange(values as ContactInfo));
    return () => sub.unsubscribe();
  }, [watch, onChange]);

  return (
    <div className="space-y-4">
      {/* Row 1: Name / Company */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Full Name" error={errors.fullName?.message}>
          <input {...register('fullName')} type="text" placeholder="e.g. Jane Smith" className={inputCls} />
        </FormField>
        <FormField label="Company">
          <input {...register('company')} type="text" placeholder="Optional" className={inputCls} />
        </FormField>
      </div>

      {/* Row 2: Phone / Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Phone">
          <input {...register('phone')} type="tel" placeholder="e.g. 0412 345 678" className={inputCls} />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <input {...register('email')} type="email" placeholder="e.g. jane@example.com" className={inputCls} />
        </FormField>
      </div>

      {/* Row 3: Fulfilment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Fulfilment">
          <select {...register('fulfilment')} className={inputCls}>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </FormField>
        {fulfilment === 'delivery' && (
          <FormField label="Delivery Address">
            <input {...register('deliveryAddress')} type="text" placeholder="Street, suburb, state, postcode" className={inputCls} />
          </FormField>
        )}
      </div>

      {/* Notes */}
      <FormField label="Notes / Special Instructions">
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Any special instructions or site notes…"
          className={inputCls + ' resize-none'}
        />
      </FormField>
    </div>
  );
}
