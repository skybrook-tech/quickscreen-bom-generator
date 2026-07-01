import { HingePicker, LatchPicker } from "../gateHardwareControls";
import type { HingeHardware, LatchHardware, RankedHardware } from "../../../lib/gateHardware";
import type { FieldRenderer } from "./types";

/**
 * control_type: "hardware_ranked" — gate hinge_type / latch_type. Ranked
 * option lists are precomputed per-render by `GateSegmentDetails` (they
 * depend on white-finish + gate movement) and passed via `extra`. The actual
 * variable write (plus any kit/add-on clearing cascade) is handled by the
 * caller's `onChange`, not here.
 */
export const hardwareRankedRenderer: FieldRenderer = ({ field, variables, onChange, extra }) => {
  const value = String(variables[field.field_key] ?? field.default_value_json ?? "");
  if (field.field_key === "hinge_type") {
    const options = (extra.rankedHinges as RankedHardware<HingeHardware>[]) ?? [];
    return <HingePicker value={value} options={options} onChange={(next) => onChange(field.field_key, next)} />;
  }
  if (field.field_key === "latch_type") {
    const options = (extra.rankedLatches as RankedHardware<LatchHardware>[]) ?? [];
    return <LatchPicker value={value} options={options} onChange={(next) => onChange(field.field_key, next)} />;
  }
  return null;
};
