import type { SelectHTMLAttributes } from "react";
import { COLOURS } from "../../lib/constants";

export interface ColourOption {
  value: string;
  label: string;
  limited: boolean;
}

interface ColourSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Filtered options from useColourOptions(). When provided, overrides allowedValues + COLOURS fallback. */
  options?: ColourOption[];
  /** Legacy: restrict COLOURS by value list. Use options prop for v3. */
  allowedValues?: string[];
}

export function ColourSelect({ options, allowedValues, ...props }: ColourSelectProps) {
  let displayOptions: ColourOption[];
  if (options) {
    displayOptions = options;
  } else if (allowedValues?.length) {
    displayOptions = COLOURS.filter((c) => allowedValues.includes(c.value));
  } else {
    displayOptions = COLOURS as unknown as ColourOption[];
  }
  return (
    <select {...props}>
      {displayOptions.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
          {c.limited ? " ⚠ Limited" : ""}
        </option>
      ))}
    </select>
  );
}
