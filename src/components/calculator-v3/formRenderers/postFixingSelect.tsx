import { FormField } from "../../shared/FormField";
import { isPreferredGroutSku, type PostFixingMaterial } from "../../../lib/postFixingOptions";
import { getPreferredGroutSku, setPreferredGroutSku } from "../../../lib/userPrefs";
import type { FieldRenderer } from "./types";

/** control_type: "post_fixing_select" — post-fixing material dropdown with a remembered default. Materials come from CalculatorConfig.postFixingMaterials (extra.postFixingMaterials), not a hardcoded client list. */
export const postFixingSelectRenderer: FieldRenderer = ({ field, variables, onChange, extra }) => {
  const materials = (extra.postFixingMaterials as PostFixingMaterial[] | undefined) ?? [];
  const raw = variables[field.field_key];
  const value = isPreferredGroutSku(raw, materials) ? raw : getPreferredGroutSku();
  return (
    <FormField label={field.label} note="Defaults apply automatically per mounting method unless changed here.">
      <select
        value={value}
        onChange={(event) => {
          onChange(field.field_key, event.target.value);
          if (isPreferredGroutSku(event.target.value, materials)) setPreferredGroutSku(event.target.value);
        }}
        className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
      >
        {materials.map((item) => (
          <option key={item.sku} value={item.sku}>
            {item.label}
          </option>
        ))}
      </select>
    </FormField>
  );
};
