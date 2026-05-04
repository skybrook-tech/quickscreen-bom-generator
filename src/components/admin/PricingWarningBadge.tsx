interface PricingWarningBadgeProps {
  hasPricing: boolean;
  count?: number;
  className?: string;
}

export function PricingWarningBadge({ hasPricing, count, className = '' }: PricingWarningBadgeProps) {
  if (hasPricing) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-brand-success/10 text-brand-success border border-brand-success/20 ${className}`}>
        {count !== undefined ? `${count} rule${count !== 1 ? 's' : ''}` : 'priced'}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-brand-warning/10 text-brand-warning border border-brand-warning/20 ${className}`}>
      <span>⚠</span> no pricing
    </span>
  );
}
