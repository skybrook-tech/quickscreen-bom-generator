import { forwardRef } from 'react';
import { GATE_TYPES } from '../../lib/constants';

interface GateTypeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const GateTypeSelect = forwardRef<HTMLSelectElement, GateTypeSelectProps>(
  function GateTypeSelect(props, ref) {
    return (
      <select ref={ref} {...props}>
        {GATE_TYPES.map((g) => (
          <option key={g.value} value={g.value}>{g.label}</option>
        ))}
      </select>
    );
  }
);
