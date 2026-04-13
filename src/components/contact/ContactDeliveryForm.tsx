import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import {
  ContactSchema,
  defaultContactInfo,
} from "../../schemas/contact.schema";
import type { ContactInfo } from "../../schemas/contact.schema";
import { FormField } from "../shared/FormField";

const inputCls =
  "w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text " +
  "focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors";

interface ContactDeliveryFormProps {
  onChange: (contact: ContactInfo) => void;
  initialValues?: Partial<ContactInfo>;
}

export function ContactDeliveryForm({
  onChange,
  initialValues,
}: ContactDeliveryFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContactInfo>({
    resolver: zodResolver(ContactSchema),
    defaultValues: { ...defaultContactInfo, ...initialValues },
  });

  const watchFulfilment = watch("fulfilment");

  useEffect(() => {
    const sub = watch((values) => onChange(values as ContactInfo));
    return () => sub.unsubscribe();
  }, [watch, onChange]);

  return (
    <div className="space-y-4">
      {/* Row 1: Name / Company */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Full Name" error={errors.fullName?.message}>
          <input
            {...register("fullName")}
            type="text"
            placeholder="e.g. Jane Smith"
            className={inputCls}
          />
        </FormField>
        <FormField label="Company">
          <input
            {...register("company")}
            type="text"
            placeholder="Optional"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* Row 2: Phone / Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Phone">
          <input
            {...register("phone")}
            type="tel"
            placeholder="e.g. 0412 345 678"
            className={inputCls}
          />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            placeholder="e.g. jane@example.com"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* Row 3: Fulfilment */}
      <FormField label="Fulfilment">
        <div className="flex gap-2">
          {(['pickup', 'delivery'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setValue('fulfilment', opt)}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md border transition-colors ${
                watchFulfilment === opt
                  ? 'border-brand-accent bg-brand-accent/20 text-brand-accent'
                  : 'border-brand-border text-brand-muted hover:text-brand-text'
              }`}
            >
              {opt === 'pickup' ? 'Pickup' : 'Delivery'}
            </button>
          ))}
        </div>
      </FormField>

      {/* Delivery address fields (shown when delivery selected) */}
      {watchFulfilment === "delivery" && (
        <div className="space-y-3">
          <FormField label="Delivery Address">
            <input
              {...register("deliveryAddress")}
              type="text"
              placeholder="Street address"
              className={inputCls}
            />
          </FormField>
          <FormField label="Suburb / State / Postcode">
            <input
              {...register("deliverySuburb")}
              type="text"
              placeholder="e.g. Thomastown VIC 3074"
              className={inputCls}
            />
          </FormField>
        </div>
      )}

      {/* Notes */}
      <FormField label="Notes / Special Instructions">
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Add any job notes, special requirements, site conditions, or instructions here…"
          className={inputCls}
        />
      </FormField>
    </div>
  );
}
