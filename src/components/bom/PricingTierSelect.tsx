import type { PricingTier } from '../../types/bom.types';

interface PricingTierSelectProps {
  value: PricingTier;
  onChange: (tier: PricingTier) => void;
}

const TIERS: { value: PricingTier; label: string }[] = [
  { value: 'tier1', label: 'Tier 1' },
  { value: 'tier2', label: 'Tier 2' },
  { value: 'tier3', label: 'Tier 3' },
];

export function PricingTierSelect({ value, onChange }: PricingTierSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PricingTier)}
      data-testid="pricing-tier"
      className="px-2.5 py-1.5 bg-brand-bg border border-brand-border rounded text-sm text-brand-text focus:outline-none focus:border-brand-accent"
    >
      {TIERS.map((t) => (
        <option key={t.value} value={t.value}>{t.label}</option>
      ))}
    </select>
  );
}
