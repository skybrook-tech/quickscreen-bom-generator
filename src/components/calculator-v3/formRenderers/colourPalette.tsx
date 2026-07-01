import { FormField } from "../../shared/FormField";
import { ColourPalette } from "../ColourPalette";
import type { FieldRenderer } from "./types";

/** control_type: "colour_palette" — swatch grid for any colour-code field. */
export const colourPaletteRenderer: FieldRenderer = ({ field, variables, onChange }) => {
  const value = String(variables[field.field_key] ?? field.default_value_json ?? "B");
  return (
    <FormField label={field.label}>
      <ColourPalette
        value={value}
        options={field.options_json.map(String)}
        onChange={(next) => onChange(field.field_key, next)}
      />
    </FormField>
  );
};
