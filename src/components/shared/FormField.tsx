import type { ReactNode } from "react";

interface FormFieldProps {
  label: ReactNode;
  note?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, note, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-brand-muted block">
        {label}
      </label>
      {children}
      {note && !error && (
        <p className="text-xs text-brand-muted leading-snug">{note}</p>
      )}
      {error && (
        <p className="text-xs text-brand-danger leading-snug">{error}</p>
      )}
    </div>
  );
}
