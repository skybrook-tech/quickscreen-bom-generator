interface PricingWarningBadgeProps {
  hasPricing: boolean;
  count?: number;
  className?: string;
}

export function PricingWarningBadge({ hasPricing, count, className = '' }: PricingWarningBadgeProps) {
  if (hasPricing) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
        {count !== undefined ? `${count} rule${count !== 1 ? 's' : ''}` : 'priced'}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
      <span>⚠</span> no pricing
    </span>
  );
}
