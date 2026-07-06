import { useState } from "react";
import { FormField } from "../../shared/FormField";
import { ColourPalette } from "../ColourPalette";
import type { UiCalculatorConfig } from "../../../types/calculatorConfig.types";
import type { FieldRenderer } from "./types";

/**
 * control_type: "colour_palette_optional" — a colour palette hidden behind an
 * "Alternate post colour" toggle. Renders a button that reveals the swatch
 * grid; the palette starts revealed when the current value already diverges
 * from the matching fence colour (variables.colour_code).
 */
export const colourPaletteOptionalRenderer: FieldRenderer = ({ field, variables, onChange, extra }) => {
  const config = extra.config as UiCalculatorConfig | undefined;
  const fenceColour = String(variables["colour_code"] ?? "");
  const currentValue = String(variables[field.field_key] ?? field.default_value_json ?? fenceColour);
  const [open, setOpen] = useState(
    Boolean(variables[field.field_key]) && currentValue !== fenceColour,
  );

  return (
    <div data-testid={field.field_key}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-brand-border px-3 py-2 text-sm font-extrabold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
      >
        {open ? "Hide alternate post colour" : "Alternate post colour"}
      </button>
      {open && (
        <div className="mt-3">
          <FormField label={field.label}>
            <ColourPalette
              value={currentValue}
              options={field.options_json.map(String)}
              onChange={(next) => onChange(field.field_key, next)}
              swatches={config?.colours.swatches}
              labels={config?.colours.names}
            />
          </FormField>
        </div>
      )}
    </div>
  );
};
