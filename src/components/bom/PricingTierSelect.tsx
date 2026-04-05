import { ButtonGroup } from '../shared/ButtonGroup';
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
    <ButtonGroup
      options={TIERS}
      value={value}
      onChange={onChange}
      data-testid="pricing-tier"
    />
  );
}
