interface SharedByBadgeProps {
  systemTypes: string[];
  className?: string;
}

export function SharedByBadge({ systemTypes, className = '' }: SharedByBadgeProps) {
  if (!systemTypes || systemTypes.length <= 1) return null;
  return (
    <span
      title={`Used by: ${systemTypes.join(', ')}`}
      className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-brand-accent/10 text-brand-accent border border-brand-accent/20 ${className}`}
    >
      shared ×{systemTypes.length}
    </span>
  );
}
