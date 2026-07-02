import type { PreferredGroutSku } from "./userPrefs";

export type PostFixingMaterial = { sku: string; label: string; description: string };

// Fallback catalogue used only if a CalculatorConfig.postFixingMaterials list
// isn't available yet (offline/error state) — see useCalculatorConfig's
// fallbackConfig. The real, editable catalogue lives server-side in
// supabase/functions/bom-calculator-static/config/base.ts, projected to the
// client via get-calculator-config.
export const FALLBACK_POST_FIXING_MATERIALS: PostFixingMaterial[] = [
  { sku: "GROUT-RSC", label: "Rapid set concrete", description: "20kg bag, common 30 minute post footing mix" },
  { sku: "GROUT-CONCRETE", label: "General concrete mix", description: "20kg bag, cheap slow-cure option" },
  { sku: "GROUT-POL-10KG", label: "Polaris non-shrink grout", description: "10kg high-strength expansion grout" },
  { sku: "GROUT-BOS", label: "Bostik HES grout", description: "20kg high early strength grout" },
  { sku: "GROUT-SIKA", label: "Sika HES grout", description: "20kg premium water-resistant HES grout" },
];

export function isPreferredGroutSku(
  value: unknown,
  materials: PostFixingMaterial[] = FALLBACK_POST_FIXING_MATERIALS,
): value is PreferredGroutSku {
  return materials.some((item) => item.sku === value);
}

export function groutLabel(sku: string, materials: PostFixingMaterial[] = FALLBACK_POST_FIXING_MATERIALS) {
  return materials.find((item) => item.sku === sku)?.label ?? "Rapid set concrete";
}

export function substrateFixingKitSku(substrate: unknown) {
  return substrate === "timber" ? "S-110LAG-4PK" : "S-120ROD-4PK";
}
