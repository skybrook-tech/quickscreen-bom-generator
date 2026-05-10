interface FormFieldProps {
  label: string;
  note?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, note, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-brand-muted">
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
