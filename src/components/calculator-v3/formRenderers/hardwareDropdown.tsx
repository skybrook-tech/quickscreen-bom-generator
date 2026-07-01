import { HardwareDropdown } from "../gateHardwareControls";
import {
  DROP_BOLT_OPTIONS,
  GATE_STOP_OPTIONS,
  SLIDING_CATCH_OPTIONS,
  SLIDING_GUIDE_OPTIONS,
  SLIDING_TRACK_OPTIONS,
  type GateOption,
} from "../../../lib/gateOptionRules";
import type { FieldRenderer } from "./types";

const OPTION_SETS: Record<string, GateOption[]> = {
  drop_bolt_type: DROP_BOLT_OPTIONS,
  gate_stop_type: GATE_STOP_OPTIONS,
  sliding_track_type: SLIDING_TRACK_OPTIONS,
  sliding_guide_type: SLIDING_GUIDE_OPTIONS,
  sliding_catch_type: SLIDING_CATCH_OPTIONS,
};

/** control_type: "hardware_dropdown" — searchable inventory dropdown for gate hardware fields. */
export const hardwareDropdownRenderer: FieldRenderer = ({ field, variables, onChange }) => {
  const options = OPTION_SETS[field.field_key] ?? [];
  const value = String(variables[field.field_key] ?? field.default_value_json ?? "none");
  return (
    <HardwareDropdown
      label={field.label}
      value={value}
      options={options}
      onChange={(next) => onChange(field.field_key, next)}
    />
  );
};
