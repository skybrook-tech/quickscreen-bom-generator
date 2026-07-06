import { FormField } from "../../shared/FormField";
import { ColourPalette } from "../ColourPalette";
import type { UiCalculatorConfig } from "../../../types/calculatorConfig.types";
import type { FieldRenderer } from "./types";

/** control_type: "colour_palette" — swatch grid for any colour-code field. */
export const colourPaletteRenderer: FieldRenderer = ({ field, variables, onChange, extra }) => {
  const value = String(variables[field.field_key] ?? field.default_value_json ?? "B");
  const config = extra.config as UiCalculatorConfig | undefined;
  return (
    <FormField label={field.label}>
      <ColourPalette
        value={value}
        options={field.options_json.map(String)}
        onChange={(next) => onChange(field.field_key, next)}
        swatches={config?.colours.swatches}
        labels={config?.colours.names}
      />
    </FormField>
  );
};
