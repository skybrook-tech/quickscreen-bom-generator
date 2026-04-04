interface FormFieldProps {
  label: string;
  note?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, note, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-brand-muted uppercase tracking-wide">
        {label}
      </label>
      {children}
      {note && !error && (
        <p className="text-xs text-brand-muted">{note}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
