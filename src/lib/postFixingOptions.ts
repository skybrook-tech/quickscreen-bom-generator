import type { PreferredGroutSku } from "./userPrefs";

export const POST_FIXING_MATERIALS: Array<{
  sku: PreferredGroutSku;
  label: string;
  description: string;
}> = [
  {
    sku: "GROUT-RSC",
    label: "Rapid set concrete",
    description: "20kg bag, common 30 minute post footing mix",
  },
  {
    sku: "GROUT-CONCRETE",
    label: "General concrete mix",
    description: "20kg bag, cheap slow-cure option",
  },
  {
    sku: "GROUT-POL-10KG",
    label: "Polaris non-shrink grout",
    description: "10kg high-strength expansion grout",
  },
  {
    sku: "GROUT-BOS",
    label: "Bostik HES grout",
    description: "20kg high early strength grout",
  },
  {
    sku: "GROUT-SIKA",
    label: "Sika HES grout",
    description: "20kg premium water-resistant HES grout",
  },
];

export function isPreferredGroutSku(value: unknown): value is PreferredGroutSku {
  return POST_FIXING_MATERIALS.some((item) => item.sku === value);
}

export function groutLabel(sku: string) {
  return POST_FIXING_MATERIALS.find((item) => item.sku === sku)?.label ?? "Rapid set concrete";
}

export function substrateFixingKitSku(substrate: unknown) {
  return substrate === "timber" ? "S-110LAG-4PK" : "S-120ROD-4PK";
}
