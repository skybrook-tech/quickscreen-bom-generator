import type { SelectHTMLAttributes } from "react";
import { COLOURS } from "../../lib/constants";

type ColourSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function ColourSelect(props: ColourSelectProps) {
  return (
    <select {...props}>
      {COLOURS.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
          {c.limited ? " ⚠ Limited" : ""}
        </option>
      ))}
    </select>
  );
}
