interface DerivationChipProps {
  label: string;
  value: string;
  tone?: "success" | "muted";
}

export function DerivationChip({ label, value, tone = "success" }: DerivationChipProps) {
  const success = tone === "success";
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
        success
          ? "border-brand-success/30 bg-brand-success/10 text-brand-success"
          : "border-brand-border bg-brand-card text-brand-muted"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${success ? "bg-brand-success" : "bg-brand-muted"}`}
        aria-hidden
      />
      <span>{label}</span>
      <code className="font-mono text-[11px] font-black">{value}</code>
    </div>
  );
}
