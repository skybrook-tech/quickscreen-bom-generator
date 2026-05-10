import type { BOMCategory, BOMLineItem } from "../types/bom.types";
import { getComponent, localComponents } from "./localSeedData";
import { baseHardwareSku, isTruCloseHardware } from "./gateHardware";

export const BOM_CATEGORY_ORDER = [
  "screening",
  "frames_and_covers",
  "posts_and_mounting",
  "gate_components",
  "gate_hardware",
  "sliding_gate_running_gear",
  "caps_and_plugs",
  "fasteners_and_screws",
  "spacers",
  "fixings",
  "tools_and_consumables",
  "automation",
] as const;

const LEGACY_CATEGORY_MAP: Record<string, BOMCategory> = {
  slat: "screening",
  gate: "screening",
  rail: "frames_and_covers",
  rail_insert: "frames_and_covers",
  side_frame: "frames_and_covers",
  cfc_cover: "frames_and_covers",
  centre_support_rail: "frames_and_covers",
  f_section: "frames_and_covers",
  gate_side_frame: "gate_components",
  joiner_block: "gate_components",
  hardware: "gate_hardware",
  automation: "automation",
  post: "posts_and_mounting",
  post_accessory: "posts_and_mounting",
  bracket: "frames_and_covers",
  screw: "fasteners_and_screws",
  accessory: "tools_and_consumables",
  mounting: "fixings",
};

const SUBCATEGORY_MAP: Record<string, string> = {
  slat: "slats",
  gate: "gate_blades",
  rail: "rails",
  rail_insert: "rail_inserts",
  side_frame: "side_frames",
  cfc_cover: "cover_strips",
  centre_support_rail: "centre_support_rails",
  f_section: "f_sections",
  gate_side_frame: "gate_side_frames",
  joiner_block: "joiner_blocks",
  hardware: "hinges_latches_and_hardware",
  automation: "automation",
  post: "posts",
  post_accessory: "post_mounting_accessories",
  bracket: "brackets",
  screw: "screws",
  mounting: "grout_concrete_and_anchors",
  accessory: "tools_and_consumables",
};

const CATEGORY_NAME_OVERRIDES: Array<[RegExp, BOMCategory]> = [
  [/spacer/i, "spacers"],
  [/screw|anchor|wafer|tek|csk/i, "fasteners_and_screws"],
  [/cap|plug/i, "caps_and_plugs"],
  [/grout|rapid|concrete|silicone|threadlocker|epoxy|soud/i, "fixings"],
  [/wheel|track|catch|guide|roller|stop/i, "sliding_gate_running_gear"],
  [/motor|remote|keypad|solar|battery|rack/i, "automation"],
  [/hinge|latch|lock/i, "gate_hardware"],
];

const SUBCATEGORY_NAME_OVERRIDES: Array<[RegExp, string]> = [
  [/spacer/i, "slat_spacers"],
  [/cap/i, "caps"],
  [/plug/i, "plugs"],
  [/grout|rapid|concrete/i, "concrete_and_grout"],
  [/silicone|threadlocker|epoxy|chemical/i, "adhesives_and_chemicals"],
  [/wheel/i, "wheels"],
  [/track|anchor/i, "tracks_and_anchors"],
  [/catch|guide|roller|stop/i, "guides_catches_and_stops"],
  [/hinge/i, "hinges"],
  [/latch|lock/i, "latches_and_locks"],
  [/screw|wafer|tek|csk/i, "screws"],
];

const SORT_PRIORITY_BY_SUBCATEGORY: Record<string, number> = {
  slats: 10,
  gate_blades: 12,
  side_frames: 10,
  gate_side_frames: 12,
  rails: 20,
  rail_inserts: 25,
  cover_strips: 30,
  f_sections: 35,
  centre_support_rails: 40,
  joiner_blocks: 10,
  hinges: 10,
  latches_and_locks: 20,
  slat_spacers: 10,
  screws: 20,
  caps: 10,
  plugs: 20,
  concrete_and_grout: 10,
  adhesives_and_chemicals: 20,
};

const COMPANION_OVERRIDES: Array<[RegExp, string]> = [
  [/^QS-5800-CFC-/, "QS-5800-SF"],
  [/^AWQS-5800-CFC-/, "AWQS-5800-SF"],
  [/^QS-SFC-/, "QS-5800-SF"],
  [/^QSG-4200-GSF50-/, "QSG-4800-RAIL"],
  [/^QSG-4800-(INF|CINF)-/, "QSG-4800-RAIL"],
  [/^QSG-4200-COVER-/, "QSG-4800-RAIL"],
  [/^QSG-JOINER(65|90)-/, "QSG-4800-RAIL"],
  [/^XP-CSRC-/, "XP-5800-CSR"],
  [/^XP-BTP-/, "XP-5800-CSR"],
  [/^XPSG-ANCHOR$/, "XPSG-TRACK"],
];

export type OptionalAccessory = {
  sku: string;
  label: string;
  unitPrice: number;
  qtyPerParent: number;
  parentSkus: string[];
};

export const OPTIONAL_ACCESSORY_KEY = "optional_add_ons";

export function bomCategoryForSku(sku: string, fallbackCategory: string): BOMCategory {
  const component = getComponent(sku);
  const metadataCategory = component?.metadata?.bomCategory;
  if (typeof metadataCategory === "string") return metadataCategory as BOMCategory;
  const haystack = `${sku} ${component?.name ?? ""} ${component?.description ?? ""}`;
  const override = CATEGORY_NAME_OVERRIDES.find(([pattern]) => pattern.test(haystack));
  if (override) return override[1];
  return LEGACY_CATEGORY_MAP[fallbackCategory] ?? "tools_and_consumables";
}

export function bomSubCategoryForSku(sku: string, fallbackCategory: string): string {
  const component = getComponent(sku);
  if (typeof component?.subCategory === "string") return component.subCategory;
  if (typeof component?.metadata?.subCategory === "string") return component.metadata.subCategory;
  const haystack = `${sku} ${component?.name ?? ""} ${component?.description ?? ""}`;
  const override = SUBCATEGORY_NAME_OVERRIDES.find(([pattern]) => pattern.test(haystack));
  if (override) return override[1];
  return SUBCATEGORY_MAP[fallbackCategory] ?? fallbackCategory;
}

export function bomSortPriorityForSku(sku: string, fallbackCategory: string): number {
  const component = getComponent(sku);
  if (typeof component?.sortPriority === "number") return component.sortPriority;
  if (typeof component?.metadata?.sortPriority === "number") return component.metadata.sortPriority;
  const subCategory = bomSubCategoryForSku(sku, fallbackCategory);
  return SORT_PRIORITY_BY_SUBCATEGORY[subCategory] ?? 50;
}

export function companionOfForSku(sku: string): string | undefined {
  const component = getComponent(sku);
  if (typeof component?.companionOf === "string") return component.companionOf;
  if (typeof component?.metadata?.companionOf === "string") return component.metadata.companionOf;
  return COMPANION_OVERRIDES.find(([pattern]) => pattern.test(sku))?.[1];
}

export function selectedOptionalAddOns(
  variables: Record<string, unknown> | undefined,
): Record<string, string[]> {
  let raw = variables?.[OPTIONAL_ACCESSORY_KEY];
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const selected: Record<string, string[]> = {};
  for (const [parentSku, accessorySkus] of Object.entries(raw)) {
    if (!Array.isArray(accessorySkus)) continue;
    selected[parentSku] = accessorySkus.filter((sku): sku is string => typeof sku === "string");
  }
  return selected;
}

function parentCandidates(value: unknown): string[] {
  const sku = baseHardwareSku(value);
  const candidates = new Set<string>([sku, String(value ?? "")].filter(Boolean));
  if (isTruCloseHardware(value)) {
    candidates.add("TRUCLOSE_HINGE");
  }
  return [...candidates];
}

export function optionalAccessoriesForParent(parentSku: unknown): OptionalAccessory[] {
  const parents = parentCandidates(parentSku);
  const accessories = localComponents.filter((component) => {
    const optionalParents = [
      ...(Array.isArray(component.optionalChildOf) ? component.optionalChildOf : []),
      ...(Array.isArray(component.metadata?.optionalChildOf)
        ? component.metadata.optionalChildOf.filter((item): item is string => typeof item === "string")
        : []),
    ];
    if (component.isOptionalAccessory || component.metadata?.isOptionalAccessory === true) {
      return optionalParents.some((parent) => parents.includes(parent));
    }
    return false;
  });

  if (parents.includes("TRUCLOSE_HINGE") && !accessories.some((item) => item.sku === "TC-CAPS3")) {
    const safetyCaps = getComponent("TC-CAPS3");
    if (safetyCaps) accessories.push(safetyCaps);
  }

  return accessories.map((component) => ({
    sku: component.sku,
    label: component.description ?? component.name ?? component.sku,
    unitPrice: Number(component.default_price ?? 0),
    qtyPerParent:
      typeof component.qtyPerParent === "number"
        ? component.qtyPerParent
        : typeof component.metadata?.qtyPerParent === "number"
          ? component.metadata.qtyPerParent
          : 1,
    parentSkus: parents,
  }));
}

export function withBomMetadata(
  item: Omit<BOMLineItem, "category"> & { category: string },
): BOMLineItem {
  return {
    ...item,
    category: bomCategoryForSku(item.sku, item.category),
    subCategory: item.subCategory ?? bomSubCategoryForSku(item.sku, item.category),
    companionOf: item.companionOf ?? companionOfForSku(item.sku),
    sortPriority: item.sortPriority ?? bomSortPriorityForSku(item.sku, item.category),
  };
}
