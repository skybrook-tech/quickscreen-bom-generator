import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const productDir = "supabase/seeds/glass-outlet/products";

const subCategoryOverrides = [
  [/spacer/i, "slat_spacers"],
  [/cap/i, "caps"],
  [/plug/i, "plugs"],
  [/grout|rapid|concrete/i, "concrete_and_grout"],
  [/silicone|threadlocker|epoxy|chemical|soud/i, "adhesives_and_chemicals"],
  [/wheel/i, "wheels"],
  [/track|anchor/i, "tracks_and_anchors"],
  [/catch|guide|roller|stop/i, "guides_catches_and_stops"],
  [/hinge/i, "hinges"],
  [/latch|lock/i, "latches_and_locks"],
  [/screw|wafer|tek|csk/i, "screws"],
];

const categoryMap = {
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

const bomCategoryMap = {
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
  mounting: "fixings",
  accessory: "tools_and_consumables",
};

const bomCategoryOverrides = [
  [/spacer/i, "spacers"],
  [/screw|anchor|wafer|tek|csk/i, "fasteners_and_screws"],
  [/cap|plug/i, "caps_and_plugs"],
  [/grout|rapid|concrete|silicone|threadlocker|epoxy|soud/i, "fixings"],
  [/wheel|track|catch|guide|roller|stop/i, "sliding_gate_running_gear"],
  [/motor|remote|keypad|solar|battery|rack/i, "automation"],
  [/hinge|latch|lock/i, "gate_hardware"],
];

const sortPriorities = {
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

function subCategoryFor(component) {
  if (component.category === "slat" || component.category === "gate") {
    return categoryMap[component.category];
  }
  const haystack = `${component.sku} ${component.name ?? ""} ${component.description ?? ""}`;
  return (
    subCategoryOverrides.find(([pattern]) => pattern.test(haystack))?.[1] ??
    categoryMap[component.category] ??
    component.category ??
    "misc"
  );
}

function bomCategoryFor(component) {
  if (component.category === "slat" || component.category === "gate") {
    return bomCategoryMap[component.category];
  }
  const haystack = `${component.sku} ${component.name ?? ""} ${component.description ?? ""}`;
  return (
    bomCategoryOverrides.find(([pattern]) => pattern.test(haystack))?.[1] ??
    component.metadata?.bomCategory ??
    bomCategoryMap[component.category] ??
    "tools_and_consumables"
  );
}

function companionOfFor(component) {
  const sku = component.sku;
  if (/^QS-5800-CFC-/.test(sku)) return "QS-5800-SF";
  if (/^AWQS-5800-CFC-/.test(sku)) return "AWQS-5800-SF";
  if (/^QS-SFC-/.test(sku)) return "QS-5800-SF";
  if (/^QSG-4200-GSF50-/.test(sku)) return "QSG-4800-RAIL";
  if (/^QSG-4800-(INF|CINF)-/.test(sku)) return "QSG-4800-RAIL";
  if (/^QSG-4200-COVER-/.test(sku)) return "QSG-4800-RAIL";
  if (/^QSG-JOINER(65|90)-/.test(sku)) return "QSG-4800-RAIL";
  if (/^XP-CSRC-/.test(sku)) return "XP-5800-CSR";
  if (/^XP-BTP-/.test(sku)) return "XP-5800-CSR";
  if (sku === "XPSG-ANCHOR") return "XPSG-TRACK";
  return component.companionOf;
}

function annotate(component) {
  const subCategory = subCategoryFor(component);
  const annotated = {
    ...component,
    metadata: {
      ...(component.metadata ?? {}),
      bomCategory: bomCategoryFor(component),
    },
    subCategory,
    sortPriority: sortPriorities[subCategory] ?? 50,
  };
  const companionOf = companionOfFor(annotated);
  if (companionOf) annotated.companionOf = companionOf;
  if (annotated.sku === "TC-CAPS3") {
    annotated.isOptionalAccessory = true;
    annotated.optionalChildOf = [
      "TRUCLOSE_HINGE",
      "TC-H-AT-B",
      "TC-H-AT-2L-B",
      "TC-H-AT-HD-B",
      "TC-H-AT-HD-2L-B",
      "TC-H-AT-2L-W",
      "TC-H-AT-HD-2L-W",
      "ML-TL-TC-H-AT",
    ];
    annotated.qtyPerParent = 1;
    annotated.qtyFormula = null;
  }
  return annotated;
}

for (const file of readdirSync(productDir)) {
  if (!file.endsWith(".json") || file.startsWith("_")) continue;
  const path = join(productDir, file);
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(raw.product_components)) continue;
  raw.product_components = raw.product_components.map(annotate);
  writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
  console.log(`annotated ${file}`);
}
