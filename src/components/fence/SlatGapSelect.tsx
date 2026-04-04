import type { SelectHTMLAttributes } from 'react';
import { SLAT_GAPS } from '../../lib/constants';

type SlatGapSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function SlatGapSelect(props: SlatGapSelectProps) {
  return (
    <select {...props}>
      {SLAT_GAPS.map((g) => (
        <option key={g.value} value={g.value}>
          {g.label}
        </option>
      ))}
    </select>
  );
}
