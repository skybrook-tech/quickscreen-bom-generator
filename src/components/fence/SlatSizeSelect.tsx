import type { SelectHTMLAttributes } from 'react';
import { SLAT_SIZES } from '../../lib/constants';

type SlatSizeSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function SlatSizeSelect(props: SlatSizeSelectProps) {
  return (
    <select {...props}>
      {SLAT_SIZES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
