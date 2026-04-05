interface FormFieldProps {
  label: string;
  note?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, note, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
        {label}
      </label>
      {children}
      {note && !error && (
        <p className="text-xs text-brand-muted leading-snug">{note}</p>
      )}
      {error && (
        <p className="text-xs text-red-400 leading-snug">{error}</p>
      )}
    </div>
  );
}
