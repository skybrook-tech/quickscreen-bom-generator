// config/base.ts — base CalculatorConfig for each supported product.
//
// These are the Glass Outlet defaults — every literal that was previously
// scattered through engine.ts now lives here. A supplier override is a
// sparse JSON patch deep-merged over one of these base configs.
//
// Changing calculation behaviour for Glass Outlet = edit these objects.
// Adding a new supplier = deep-merge a patch over one of these.

import type { CalculatorConfig, FormFieldDef } from "./types.ts";
import qshsFields from "./products/qshs/fields.json" with { type: "json" };
import vsFields from "./products/vs/fields.json" with { type: "json" };
import xplFields from "./products/xpl/fields.json" with { type: "json" };
import baygFields from "./products/bayg/fields.json" with { type: "json" };
import qsGateFields from "./products/qs_gate/fields.json" with { type: "json" };

type ProductFieldFile = {
  fields: FormFieldDef[];
  fieldGroups: CalculatorConfig["formGroups"];
};

const PRODUCT_FIELD_FILES: Record<string, ProductFieldFile> = {
  QSHS: qshsFields as ProductFieldFile,
  VS: vsFields as ProductFieldFile,
  XPL: xplFields as ProductFieldFile,
  BAYG: baygFields as ProductFieldFile,
  QS_GATE: qsGateFields as ProductFieldFile,
};

// ─── Shared colour palette ────────────────────────────────────────────────────
// Keeping colours here for now (Phase 5 will move them to DB).

const STANDARD_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"];
const ECONOMY_COLOURS = ["B", "MN", "SM"];
const ALUMAWOOD_COLOURS = ["KWI", "WRC"];
const GATE_COLOURS = ["B", "BS", "D", "G", "M", "MN", "P", "PB", "S", "SM", "W"];
const CSR_CAP_COLOURS = ["B", "G", "MN", "S", "SM", "W"];
const CSR_PLATE_COLOURS = ["B", "BS", "D", "G", "M", "MN", "S", "SM", "W"];

const COLOUR_NAMES: Record<string, string> = {
  B: "Black Satin", MN: "Monument Matt", G: "Woodland Grey Matt",
  SM: "Surfmist Matt", W: "Pearl White Gloss", BS: "Basalt Satin",
  D: "Dune Satin", M: "Mill", P: "Primrose", PB: "Paperbark",
  S: "Palladium Silver Pearl", KWI: "Kwila", WRC: "Western Red Cedar",
  IG: "Island Grey", TR: "Terrain",
};

const COLOUR_SWATCHES: Record<string, string> = {
  B: "#1a1a1a", MN: "#5a5c5e", G: "#6b7264", SM: "#d6d2c8",
  W: "#f5f3ea", BS: "#4a4d52", D: "#bca98a", M: "#c8c4bc",
  P: "#f5e8c0", PB: "#c0a882", S: "#b8bec6",
  KWI: "#7a5c3a", WRC: "#a07850", IG: "#9fa8a8", TR: "#8c7055",
};

// ─── Shared internal SKU templates ───────────────────────────────────────────
// These canonical names are PRODUCT-NEUTRAL — they identify WHAT a component
// is, not which supplier makes it. The resolution layer maps them to real SKUs.

const INTERNAL_SKUS: CalculatorConfig["internalSkus"] = {
  slat: {
    standard:  "SLAT.STD.{slatSize}.{colour}",
    economy:   "SLAT.ECO.{slatSize}.{colour}",
    awood65:   "SLAT.AW.65.{colour}",
    awood90:   "SLAT.AW.90.{colour}",
  },
  frame: {
    sideFrame:   "FRAME.SF.STD.{colour}",
    sideFrameAW: "FRAME.SF.AW.{colour}",
    cfc:         "FRAME.CFC.STD.{colour}",
    cfcAW:       "FRAME.CFC.AW.{colour}",
    fSection:    "FRAME.F.STD.{colour}",
    fSectionAW:  "FRAME.F.AW.{colour}",
    csr:         "FRAME.CSR.STD.{colour}",
    csrAW:       "FRAME.CSR.AW.{colour}",
    csrCap:      "FRAME.CSRCAP.{colour}",
    csrPlate:    "FRAME.CSRPLATE.{colour}",
    vertRail:    "FRAME.RAIL.VERT.STD.{colour}",
  },
  post: {
    fullShort:  "POST.FULL.SHORT.{colour}",
    fullStd:    "POST.FULL.STD.{colour}",
    fullTall:   "POST.FULL.TALL.{colour}",
    hd65Std:    "POST.HD65.STD.{colour}",
    hd65Tall:   "POST.HD65.TALL.{colour}",
    awFullStd:  "POST.AW.FULL.STD.{colour}",
    awFullTall: "POST.AW.FULL.TALL.{colour}",
    awHd65Std:  "POST.AW.HD65.STD.{colour}",
    awHd65Tall: "POST.AW.HD65.TALL.{colour}",
  },
  postAcc: {
    topPlate50:   "POST.ACC.TP.50.{colour}",
    topPlate65:   "POST.ACC.TP.65.{colour}",
    basePlate50:  "POST.ACC.BP.50.{colour}",
    basePlate65:  "POST.ACC.BP.65.{colour}",
    domical50:    "POST.ACC.DC.50.{colour}",
    domical65:    "POST.ACC.DC.65.{colour}",
    dressRing50:  "POST.ACC.DR.50.{colour}",
    dressRing65:  "POST.ACC.DR.65.{colour}",
    awTopPlate50:  "POST.AW.ACC.TP.50",
    awTopPlate65:  "POST.AW.ACC.TP.65",
    awBasePlate50: "POST.AW.ACC.BP.50",
    awBasePlate65: "POST.AW.ACC.BP.65",
    awDomical50:   "POST.AW.ACC.DC.50",
    awDomical65:   "POST.AW.ACC.DC.65",
    awDressRing50: "POST.AW.ACC.DR.50",
    awDressRing65: "POST.AW.ACC.DR.65",
  },
  gate: {
    rail65:          "GATE.RAIL.65.{colour}",
    rail90:          "GATE.RAIL.90.{colour}",
    slideTopRail65:  "GATE.RAIL.SLIDE-TOP.65.{colour}",
    slideTopRail90:  "GATE.RAIL.SLIDE-TOP.90.{colour}",
    slideBotRail:    "GATE.RAIL.SLIDE-BOT.{colour}",
    sideFrame:       "GATE.SF.{colour}",
    infillHoriz:     "GATE.INFILL.HORIZ.{colour}",
    infillVert:      "GATE.INFILL.VERT.{colour}",
    cover:           "GATE.COVER.{colour}",
    cap:             "GATE.CAP.{colour}",
  },
  angleAdapter: {
    std:   "ADAPTER.135.STD.{colour}",
    awood: "ADAPTER.135.AW.{colour}",
  },
  screws: {
    slatFixing: "SCREW.SLAT",
    xpFixing:   "SCREW.XP.{colour}",
    gateRail:   "SCREW.GATE-RAIL",
  },
  spacer:       "SPACER.{gapCode}",
  spacerEach:   "SPACER.EACH.{gapCode}",
  louvreBracket: "LOUVRE.BRACKET.{colour}",
  customCorner:  "CORNER.CUSTOM",
  sideFameCap:   "QS-SFC-B",  // single colour in Glass Outlet catalogue
};

// ─── Shared geometry & pack constants ────────────────────────────────────────

const GEOMETRY: CalculatorConfig["geometry"] = {
  slatHeightDeduction:  3,  // (targetH + gap - 3) / (slatDesign + gap)
  slatCutDeduction:     15, // panelWidth - 15
  sideFrameCutDeduction: 3, // actualHeight - 3
  csrCutDeduction:       6, // actualHeight - 6

  swingBladeCutHorizDeduction: 86,
  swingBladeCutVertDeduction:  133,
  swingRailCutDeduction:       80,

  slidingBladeCutHorizDeduction:  86,
  slidingBladeCutVertDeduction:   224,
  slidingRailCutDeduction:        80,
  slidingFrameCutDeduction:       31,
  slidingBladeVertWidthDeduction: 89,
  slidingCsrAboveMm:              3000,
  slidingCsrCutDeduction:         206,

  fSectionScrewMinPerPiece:  3,
  fSectionScrewSpacing:      900,
  fSectionScrewStartOffset:  30,
};

const PACK_SIZES: CalculatorConfig["packSizes"] = {
  slatScrews:      50,
  xpScrews:        100,
  spacers:         50,
  economySlat:     96,
  gateRailScrews:  50,
  gateSlatScrews:  50,
  screwWasteFactor: 1.01,
};

const PANEL_RULES_STD: CalculatorConfig["panelRules"] = {
  maxPanelWidthMm:  2600,
  minPostSpacingMm: 100,
  maxPostSpacingMm: 3000,
  csrThresholds: [
    { underMm: 2000, count: 0 },
    { underMm: 4000, count: 1 },
    { underMm: 6000, count: 2 },
    { underMm: Infinity, count: 3 },
  ],
};

const POST_RULES: CalculatorConfig["postRules"] = {
  longPostThresholdMm:          2400,
  inGroundShortPostMaxHeightMm: 1200,
  shortPostColours:             ["W", "MN"],
};

const MOUNTING_RULES: CalculatorConfig["mountingRules"] = {
  inGround: {
    defaultGroutSku: "GROUT-RSC",
    bagsPerPost: 1.5,
  },
  basePlate: {
    timberKitSku:   "S-110LAG-4PK",
    concreteKitSku: "S-120ROD-4PK",
  },
};

const GATE_RULES: CalculatorConfig["gateRules"] = {
  maxWidthMm: {
    pedestrianHorizontal: 2100,
    pedestrianVertical: 2100,
    slidingHorizontal: 6150,
    slidingVertical: 6166,
  },
  doubleSwingMaxLeafWidthMm: 2100,
  heightMinMm: 600,
  heightMaxMm: 2100,
  supported: true,
  defaultInfill: "horizontal",
  gateProductCode: "QS_GATE",
};

const GAP_RULES_SPACER_ONLY: CalculatorConfig["gapRules"] = {
  allowCustom: false,
  customMinMm: 1,
  customMaxMm: 50,
};
const GAP_RULES_CUSTOM: CalculatorConfig["gapRules"] = {
  allowCustom: true,
  customMinMm: 1,
  customMaxMm: 50,
};

const HEIGHT_UI_LADDER: CalculatorConfig["heightUi"] = { mode: "ladder" };
const HEIGHT_UI_VS_FREEFORM: CalculatorConfig["heightUi"] = {
  mode: "freeform",
  freeformMinMm: 300,
  freeformMaxMm: 2400,
  freeformStepMm: 50,
};

const DISPLAY_QSHS: CalculatorConfig["display"] = {
  name: "QuickScreen Horizontal Slat",
  shortName: "Horizontal Slats",
  description: "Quick Screen Horizontal Slats",
};
const DISPLAY_VS: CalculatorConfig["display"] = {
  name: "Vertical Slat",
  shortName: "Vertical Slats",
  description: "Vertical Slats",
};
const DISPLAY_XPL: CalculatorConfig["display"] = {
  name: "XPress Plus Premium",
  shortName: "XPress Plus",
  description: "Xpress Plus",
};
const DISPLAY_BAYG: CalculatorConfig["display"] = {
  name: "Buy As You Go",
  shortName: "BAY-G Infill",
  description: "Build As You Go",
};

const POST_FIXING_MATERIALS: CalculatorConfig["postFixingMaterials"] = [
  { sku: "GROUT-RSC", label: "Rapid set concrete", description: "20kg bag, common 30 minute post footing mix" },
  { sku: "GROUT-CONCRETE", label: "General concrete mix", description: "20kg bag, cheap slow-cure option" },
  { sku: "GROUT-POL-10KG", label: "Polaris non-shrink grout", description: "10kg high-strength expansion grout" },
  { sku: "GROUT-BOS", label: "Bostik HES grout", description: "20kg high early strength grout" },
  { sku: "GROUT-SIKA", label: "Sika HES grout", description: "20kg premium water-resistant HES grout" },
];

// ─── Per-product base configs ─────────────────────────────────────────────────

export const BASE_QSHS_CONFIG: CalculatorConfig = {
  productCode: "QSHS",
  configVersion: "1.0.0",
  strategy: { fence: "horizontal_slat", gate: "qsg_swing_sliding" },
  colours: {
    standard: STANDARD_COLOURS,
    economy: ECONOMY_COLOURS,
    alumawood: ALUMAWOOD_COLOURS,
    gate: GATE_COLOURS,
    csrCap: CSR_CAP_COLOURS,
    csrPlate: CSR_PLATE_COLOURS,
    post: STANDARD_COLOURS,
    fallback: "MN",
    names: COLOUR_NAMES,
    swatches: COLOUR_SWATCHES,
    louvreBracketFallback: "MN",
  },
  display: DISPLAY_QSHS,
  finishFamilies: ["standard", "economy", "alumawood"],
  gapRules: GAP_RULES_CUSTOM,
  heightUi: HEIGHT_UI_LADDER,
  internalSkus: INTERNAL_SKUS,
  stockLengths: {
    slat:  { standard: 6100, economy: 6500, awood: 5800 },
    rail:  { fence: 5800, gateHoriz: 4800, gateSliding: 6100 },
    frame: { sideFrame: 5800, gateFrame: 4200, vsRail: 5000, vsRailInsert: 5800, vsFSection: 5800 },
    track: 6000,
  },
  geometry: GEOMETRY,
  packSizes: PACK_SIZES,
  panelRules: PANEL_RULES_STD,
  postRules: POST_RULES,
  mountingRules: MOUNTING_RULES,
  postFixingMaterials: POST_FIXING_MATERIALS,
  heightLadder: { slatHeightDeductionMm: GEOMETRY.slatHeightDeduction },
  gateRules: GATE_RULES,
  defaults: {
    slatSizeMm: 65, slatGapMm: 9, targetHeightMm: 1800,
    postSizeMm: 50, finishFamily: "standard", colour: "B", mountingType: "in_ground",
  },
  fields: PRODUCT_FIELD_FILES.QSHS.fields,
  formGroups: PRODUCT_FIELD_FILES.QSHS.fieldGroups,
};

export const BASE_BAYG_CONFIG: CalculatorConfig = {
  ...BASE_QSHS_CONFIG,
  productCode: "BAYG",
  strategy: { fence: "panel", gate: "qsg_swing_sliding" },
  panelRules: { ...PANEL_RULES_STD, maxPanelWidthMm: 3000 },
  defaults: { ...BASE_QSHS_CONFIG.defaults, colour: "B" },
  display: DISPLAY_BAYG,
  finishFamilies: ["standard"],
  gapRules: GAP_RULES_SPACER_ONLY,
  gateRules: { ...GATE_RULES, supported: false },
  fields: PRODUCT_FIELD_FILES.BAYG.fields,
  formGroups: PRODUCT_FIELD_FILES.BAYG.fieldGroups,
};

export const BASE_VS_CONFIG: CalculatorConfig = {
  ...BASE_QSHS_CONFIG,
  productCode: "VS",
  strategy: { fence: "vertical_slat", gate: "qsg_swing_sliding" },
  defaults: { ...BASE_QSHS_CONFIG.defaults, slatGapMm: 20 },
  display: DISPLAY_VS,
  heightUi: HEIGHT_UI_VS_FREEFORM,
  gateRules: { ...GATE_RULES, defaultInfill: "vertical" },
  fields: PRODUCT_FIELD_FILES.VS.fields,
  formGroups: PRODUCT_FIELD_FILES.VS.fieldGroups,
};

export const BASE_XPL_CONFIG: CalculatorConfig = {
  ...BASE_QSHS_CONFIG,
  productCode: "XPL",
  strategy: { fence: "horizontal_slat", gate: "qsg_swing_sliding" },
  defaults: { ...BASE_QSHS_CONFIG.defaults, slatSizeMm: 65 },
  display: DISPLAY_XPL,
  finishFamilies: ["standard", "alumawood"],
  gapRules: GAP_RULES_SPACER_ONLY,
  fields: PRODUCT_FIELD_FILES.XPL.fields,
  formGroups: PRODUCT_FIELD_FILES.XPL.fieldGroups,
};

// QS_GATE has no fence calculation strategy of its own — gates are calculated
// inline by the fence run's calculator (see calculators/quickscreen.ts). This
// entry exists purely so get-calculator-config can serve the segment-visible
// fields for the shared gate UI under a stable productCode.
export const BASE_QS_GATE_CONFIG: CalculatorConfig = {
  ...BASE_QSHS_CONFIG,
  productCode: "QS_GATE",
  fields: PRODUCT_FIELD_FILES.QS_GATE.fields,
  formGroups: PRODUCT_FIELD_FILES.QS_GATE.fieldGroups,
};

export const BASE_CONFIGS: Record<string, CalculatorConfig> = {
  QSHS: BASE_QSHS_CONFIG,
  BAYG: BASE_BAYG_CONFIG,
  VS:   BASE_VS_CONFIG,
  XPL:  BASE_XPL_CONFIG,
  QS_GATE: BASE_QS_GATE_CONFIG,
};
