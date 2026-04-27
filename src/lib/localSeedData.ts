import qshsRaw from "../../supabase/seeds/glass-outlet/products/qshs.json?raw";
import baygRaw from "../../supabase/seeds/glass-outlet/products/bayg.json?raw";
import vsRaw from "../../supabase/seeds/glass-outlet/products/vs.json?raw";
import xplRaw from "../../supabase/seeds/glass-outlet/products/xpl.json?raw";
import qsGateRaw from "../../supabase/seeds/glass-outlet/products/qs_gate.json?raw";
import type { Product } from "../hooks/useProducts";
import type { SchemaField } from "../components/calculator-v3/SchemaDrivenForm";
import type { ProductSearchItem } from "../hooks/useProductSearch";

type SeedProduct = Product & { product_type?: string };

type SeedComponent = {
  sku: string;
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  default_price?: number;
  system_types?: string[];
  active?: boolean;
};

type SeedVariable = {
  product_system_type: string;
  name: string;
  label: string;
  data_type: string;
  unit?: string | null;
  required?: boolean;
  default_value_json?: unknown;
  options_json?: unknown[];
  scope: "job" | "run" | "segment";
  sort_order?: number;
  active?: boolean;
};

export type LocalPricingRule = {
  sku: string;
  tier_code: "tier1" | "tier2" | "tier3";
  rule?: string | null;
  price: number;
  priority?: number;
  active?: boolean;
};

type SeedFile = {
  products?: SeedProduct[];
  product_components?: SeedComponent[];
  product_variables?: SeedVariable[];
  pricing_rules?: LocalPricingRule[];
};

const seedFiles: SeedFile[] = [
  JSON.parse(qshsRaw) as SeedFile,
  JSON.parse(baygRaw) as SeedFile,
  JSON.parse(vsRaw) as SeedFile,
  JSON.parse(xplRaw) as SeedFile,
  JSON.parse(qsGateRaw) as SeedFile,
];

function component(
  sku: string,
  name: string,
  description: string,
  category: string,
  unit: string,
  defaultPrice: number,
  systemTypes: string[] = ["QSHS"],
): SeedComponent {
  return {
    sku,
    name,
    description,
    category,
    unit,
    default_price: defaultPrice,
    system_types: systemTypes,
    active: true,
  };
}

function pricing(
  sku: string,
  tier1: number,
  tier2: number,
  tier3: number,
): LocalPricingRule[] {
  return [
    { sku, tier_code: "tier1", rule: null, price: tier1, priority: 0, active: true },
    { sku, tier_code: "tier2", rule: null, price: tier2, priority: 0, active: true },
    { sku, tier_code: "tier3", rule: null, price: tier3, priority: 0, active: true },
  ];
}

const syntheticComponents: SeedComponent[] = [
  {
    sku: "PAINT-B",
    name: "Touch Up Paint Black Satin",
    description: "Touch up paint spray can - Black Satin",
    category: "accessory",
    unit: "each",
    default_price: 11.35,
    system_types: ["QSHS", "VS", "XPL", "BAYG"],
    active: true,
  },
  {
    sku: "PAINT-MN",
    name: "Touch Up Paint Monument Matt",
    description: "Touch up paint spray can - Monument Matt",
    category: "accessory",
    unit: "each",
    default_price: 11.35,
    system_types: ["QSHS", "VS", "XPL", "BAYG"],
    active: true,
  },
  {
    sku: "XP-6500-E65-B",
    name: "65mm Economy Slat Black Satin",
    description: "65mm Economy slat, no centre web, 6500mm stock",
    category: "slat",
    unit: "length",
    default_price: 32.85,
    system_types: ["QSHS", "VS"],
    active: true,
  },
  {
    sku: "XP-6500-E65-MN",
    name: "65mm Economy Slat Monument Matt",
    description: "65mm Economy slat, no centre web, 6500mm stock",
    category: "slat",
    unit: "length",
    default_price: 32.85,
    system_types: ["QSHS", "VS"],
    active: true,
  },
  {
    sku: "XP-6500-E65-SM",
    name: "65mm Economy Slat Surfmist",
    description: "65mm Economy slat, no centre web, 6500mm stock",
    category: "slat",
    unit: "length",
    default_price: 31.05,
    system_types: ["QSHS", "VS"],
    active: true,
  },
  component(
    "QS-SCREWS-50PK",
    "QuickScreen 10gx16mm Screws 50 Pack",
    "QuickScreen 10gx16mm screws, 50 pack",
    "screw",
    "pack",
    1.42,
  ),
  ...["B", "BS", "D", "G", "M", "MN", "P", "S", "SM", "W"].map((colour) =>
    component(
      `XP-SCREWS-${colour}`,
      `XPRESS Screening Screws ${colour}`,
      `XPRESS Screening 10g x 16mm self drilling wafer head screws, bag of 100 - ${colour}`,
      "screw",
      "pack",
      6.36,
    ),
  ),
  ...[
    ["05MM", "5", 1.42],
    ["09MM", "9", 2.63],
    ["12MM", "12", 3.47],
    ["15MM", "15", 4.1],
    ["20MM", "20", 5.2],
    ["30MM", "30", 7.3],
  ].map(([gapCode, gapLabel, price]) =>
    component(
      `QS-SPACER-${gapCode}-50PK`,
      `QuickScreen ${gapLabel}mm Spacer 50 Pack`,
      `QuickScreen snap-in spacer for ${gapLabel}mm slat gap, 50 pack`,
      "accessory",
      "pack",
      Number(price),
    ),
  ),
  component(
    "AW-5800-S65-KWI",
    "Alumawood 65mm Slat Kwila",
    "Alumawood 65 x 16.5mm slat, 5800mm stock - Kwila",
    "slat",
    "length",
    50.49,
  ),
  component(
    "AW-5800-S65-WRC",
    "Alumawood 65mm Slat Western Red Cedar",
    "Alumawood 65 x 16.5mm slat, 5800mm stock - Western Red Cedar",
    "slat",
    "length",
    50.49,
  ),
  component(
    "AWQS-5800-S90-WRC",
    "Alumawood 90mm QuickScreen Slat Western Red Cedar",
    "Alumawood 90 x 16.5mm QuickScreen slat with centre web, 5800mm stock - Western Red Cedar",
    "slat",
    "length",
    64.72,
  ),
  component(
    "AWQS-5800-SF-KWI",
    "Alumawood QuickScreen Side Frame Kwila",
    "Alumawood QuickScreen 27 x 26mm side frame, 5800mm stock - Kwila",
    "side_frame",
    "length",
    35.21,
  ),
  component(
    "AWQS-5800-SF-WRC",
    "Alumawood QuickScreen Side Frame Western Red Cedar",
    "Alumawood QuickScreen 27 x 26mm side frame, 5800mm stock - Western Red Cedar",
    "side_frame",
    "length",
    35.21,
  ),
  component(
    "AWQS-5800-CFC-KWI",
    "Alumawood QuickScreen Concealed Fixing Cover Kwila",
    "Alumawood QuickScreen concealed fixing cover, 5800mm stock - Kwila",
    "cfc_cover",
    "length",
    19.82,
  ),
  component(
    "AWQS-5800-CFC-WRC",
    "Alumawood QuickScreen Concealed Fixing Cover Western Red Cedar",
    "Alumawood QuickScreen concealed fixing cover, 5800mm stock - Western Red Cedar",
    "cfc_cover",
    "length",
    19.82,
  ),
  component(
    "AWQS-5800-F-KWI",
    "Alumawood QuickScreen F Section Kwila",
    "Alumawood QuickScreen 50 x 35mm F section, 5800mm stock - Kwila",
    "f_section",
    "length",
    42.11,
  ),
  component(
    "AWQS-5800-F-WRC",
    "Alumawood QuickScreen F Section Western Red Cedar",
    "Alumawood QuickScreen 50 x 35mm F section, 5800mm stock - Western Red Cedar",
    "f_section",
    "length",
    42.11,
  ),
  component(
    "AW-5800-CSR-KWI",
    "Alumawood Centre Support Rail Kwila",
    "Alumawood 40 x 13mm centre support rail with snap-on CFC, 5800mm stock - Kwila",
    "centre_support_rail",
    "length",
    51.59,
  ),
  component(
    "AW-5800-CSR-WRC",
    "Alumawood Centre Support Rail Western Red Cedar",
    "Alumawood 40 x 13mm centre support rail with snap-on CFC, 5800mm stock - Western Red Cedar",
    "centre_support_rail",
    "length",
    51.59,
  ),
  component(
    "AW-2400-FP-KWI",
    "Alumawood 50mm Full Post Kwila",
    "Alumawood 50 x 50mm full post, 2400mm long - Kwila",
    "post",
    "each",
    50.91,
  ),
  component(
    "AW-2400-FP-WRC",
    "Alumawood 50mm Full Post Western Red Cedar",
    "Alumawood 50 x 50mm full post, 2400mm long - Western Red Cedar",
    "post",
    "each",
    50.91,
  ),
  component(
    "AW-2400-65HD-KWI",
    "Alumawood 65mm Heavy Duty Post Kwila",
    "Alumawood 65 x 65mm heavy duty post, 2400mm long - Kwila",
    "post",
    "each",
    84.24,
  ),
  component(
    "AW-2400-65HD-WRC",
    "Alumawood 65mm Heavy Duty Post Western Red Cedar",
    "Alumawood 65 x 65mm heavy duty post, 2400mm long - Western Red Cedar",
    "post",
    "each",
    84.24,
  ),
  component(
    "AW-5800-FP-KWI",
    "Alumawood 50mm Full Post Kwila 5800mm",
    "Alumawood 50 x 50mm full post, 5800mm long - Kwila",
    "post",
    "each",
    109.67,
  ),
  component(
    "AW-5800-FP-WRC",
    "Alumawood 50mm Full Post Western Red Cedar 5800mm",
    "Alumawood 50 x 50mm full post, 5800mm long - Western Red Cedar",
    "post",
    "each",
    109.67,
  ),
  component(
    "AW-5800-65HD-KWI",
    "Alumawood 65mm Heavy Duty Post Kwila 5800mm",
    "Alumawood 65 x 65mm heavy duty post, 5800mm long - Kwila",
    "post",
    "each",
    187.14,
  ),
  component(
    "AW-5800-65HD-WRC",
    "Alumawood 65mm Heavy Duty Post Western Red Cedar 5800mm",
    "Alumawood 65 x 65mm heavy duty post, 5800mm long - Western Red Cedar",
    "post",
    "each",
    187.14,
  ),
  component(
    "AW-TP-TR",
    "Alumawood 50mm Post Flat Top Plate Terrain",
    "Alumawood 50mm post flat top plate - Terrain Matt",
    "post_accessory",
    "each",
    1.82,
  ),
  component(
    "AW-BTP-TR",
    "Alumawood Centre Support Rail Top/Base Plate Terrain",
    "Alumawood centre support rail base/top plate - Terrain Matt",
    "accessory",
    "each",
    5.94,
  ),
  component(
    "AW-65TP-TR",
    "Alumawood 65mm Post Flat Top Plate Terrain",
    "Alumawood 65mm post flat top plate - Terrain Matt",
    "post_accessory",
    "each",
    3.52,
  ),
  component(
    "AW-BP-SET-TR",
    "Alumawood 50mm Post Base Plate Set Terrain",
    "Alumawood 50mm post base plate set - Terrain Matt",
    "post_accessory",
    "each",
    12.01,
  ),
  component(
    "AW-65BP-SET-TR",
    "Alumawood 65mm Post Base Plate Set Terrain",
    "Alumawood 65mm post base plate set - Terrain Matt",
    "post_accessory",
    "each",
    10.3,
  ),
  component(
    "AW-DC-2P-TR",
    "Alumawood 50mm Domical Cover Terrain",
    "Alumawood 50mm two-part domical cover - Terrain Matt",
    "post_accessory",
    "each",
    5.25,
  ),
  component(
    "AW-65DC-2P-TR",
    "Alumawood 65mm Domical Cover Terrain",
    "Alumawood 65mm two-part domical cover - Terrain Matt",
    "post_accessory",
    "each",
    5.51,
  ),
  component(
    "AW-DR-TR",
    "Alumawood 50mm Dress Ring Terrain",
    "Alumawood 50mm post dress ring - Terrain Matt",
    "post_accessory",
    "each",
    3.52,
  ),
  component(
    "AW-65DR-TR",
    "Alumawood 65mm Dress Ring Terrain",
    "Alumawood 65mm post dress ring - Terrain Matt",
    "post_accessory",
    "each",
    4.73,
  ),
];

const syntheticPricingRules: LocalPricingRule[] = [
  ...pricing("QS-SCREWS-50PK", 1.42, 1.42, 1.42),
  ...["B", "BS", "D", "G", "M", "MN", "P", "S", "SM", "W"].flatMap((colour) =>
    pricing(`XP-SCREWS-${colour}`, 6.36, 5.99, 5.16),
  ),
  ...pricing("QS-SPACER-05MM-50PK", 1.42, 1.22, 1.05),
  ...pricing("QS-SPACER-09MM-50PK", 2.63, 2.26, 1.95),
  ...pricing("QS-SPACER-12MM-50PK", 3.47, 2.98, 2.57),
  ...pricing("QS-SPACER-15MM-50PK", 4.1, 3.53, 3.03),
  ...pricing("QS-SPACER-20MM-50PK", 5.2, 4.47, 3.85),
  ...pricing("QS-SPACER-30MM-50PK", 7.3, 6.28, 5.4),
  ...pricing("AW-5800-S65-KWI", 50.49, 47.96, 45.96),
  ...pricing("AW-5800-S65-WRC", 50.49, 47.96, 45.96),
  ...pricing("AWQS-5800-S90-WRC", 64.72, 60.84, 56.95),
  ...pricing("AWQS-5800-SF-KWI", 35.21, 33.11, 30.99),
  ...pricing("AWQS-5800-SF-WRC", 35.21, 33.11, 30.99),
  ...pricing("AWQS-5800-CFC-KWI", 19.82, 18.65, 17.45),
  ...pricing("AWQS-5800-CFC-WRC", 19.82, 18.65, 17.45),
  ...pricing("AWQS-5800-F-KWI", 42.11, 40.02, 37.9),
  ...pricing("AWQS-5800-F-WRC", 42.11, 40.02, 37.9),
  ...pricing("AW-5800-CSR-KWI", 51.59, 48.5, 45.4),
  ...pricing("AW-5800-CSR-WRC", 51.59, 48.5, 45.4),
  ...pricing("AW-2400-FP-KWI", 50.91, 48.61, 45.53),
  ...pricing("AW-2400-FP-WRC", 50.91, 48.61, 45.53),
  ...pricing("AW-2400-65HD-KWI", 84.24, 78.11, 74.02),
  ...pricing("AW-2400-65HD-WRC", 84.24, 78.11, 74.02),
  ...pricing("AW-5800-FP-KWI", 109.67, 102.01, 95.41),
  ...pricing("AW-5800-FP-WRC", 109.67, 102.01, 95.41),
  ...pricing("AW-5800-65HD-KWI", 187.14, 175.37, 166.01),
  ...pricing("AW-5800-65HD-WRC", 187.14, 175.37, 166.01),
  ...pricing("AW-TP-TR", 1.82, 1.71, 1.52),
  ...pricing("AW-BTP-TR", 5.94, 5.53, 4.75),
  ...pricing("AW-65TP-TR", 3.52, 3.28, 2.82),
  ...pricing("AW-BP-SET-TR", 12.01, 11.17, 9.6),
  ...pricing("AW-65BP-SET-TR", 10.3, 9.59, 8.24),
  ...pricing("AW-DC-2P-TR", 5.25, 4.68, 4.2),
  ...pricing("AW-65DC-2P-TR", 5.51, 4.95, 4.41),
  ...pricing("AW-DR-TR", 3.52, 3.28, 2.82),
  ...pricing("AW-65DR-TR", 4.73, 4.41, 3.79),
];

export const localProducts: Product[] = seedFiles
  .flatMap((seed) => seed.products ?? [])
  .filter((product) => product.active !== false)
  .map((product) => ({
    id: product.id ?? product.system_type,
    name: product.name,
    system_type: product.system_type,
    description: product.description ?? null,
    image_url: product.image_url ?? null,
    active: product.active !== false,
    sort_order: product.sort_order ?? 999,
    metadata: product.metadata,
  }))
  .sort((a, b) => a.sort_order - b.sort_order);

export const localFenceProducts = localProducts.filter((product) => {
  const seedProduct = seedFiles
    .flatMap((seed) => seed.products ?? [])
    .find((p) => p.system_type === product.system_type);
  return (
    seedProduct?.product_type !== "gate" &&
    ["QSHS", "VS", "XPL"].includes(product.system_type)
  );
});

export const localComponents: SeedComponent[] = seedFiles
  .flatMap((seed) => seed.product_components ?? [])
  .concat(syntheticComponents)
  .filter((component) => component.active !== false);

export const localPricingRules: LocalPricingRule[] = seedFiles
  .flatMap((seed) => seed.pricing_rules ?? [])
  .concat(syntheticPricingRules)
  .filter((rule) => rule.active !== false);

export function getLocalVariables(
  systemType: string,
  scope: "job" | "run" | "segment",
): SchemaField[] {
  return seedFiles
    .flatMap((seed) => seed.product_variables ?? [])
    .filter(
      (field) =>
        field.active !== false &&
        field.product_system_type === systemType &&
        field.scope === scope,
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((field) => ({
      id: `${field.product_system_type}-${field.name}-${field.scope}`,
      field_key: field.name,
      label: field.label,
      control_type:
        field.data_type === "enum"
          ? "select"
          : field.data_type === "number" || field.data_type === "integer"
            ? "number"
            : field.data_type === "boolean"
              ? "toggle"
              : "text",
      data_type: field.data_type,
      unit: field.unit ?? undefined,
      required: Boolean(field.required),
      default_value_json: field.default_value_json,
      options_json: Array.isArray(field.options_json) ? field.options_json : [],
      visible_when_json: {},
      sort_order: field.sort_order ?? 0,
    }));
}

export function searchLocalProducts(query: string, limit = 10): ProductSearchItem[] {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) return [];

  return localComponents
    .filter((component) => {
      const haystack = [
        component.sku,
        component.name,
        component.description,
        component.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .slice(0, limit)
    .map((component) => ({
      sku: component.sku,
      name: component.name ?? component.sku,
      description: component.description ?? component.name ?? component.sku,
      category: component.category ?? "accessory",
      unit: component.unit ?? "each",
      unitPrice:
        typeof component.default_price === "number"
          ? component.default_price
          : undefined,
    }));
}

export function getComponent(sku: string): SeedComponent | undefined {
  return localComponents.find((component) => component.sku === sku);
}
