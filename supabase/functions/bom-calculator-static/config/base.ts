// config/base.ts — base CalculatorConfig for each supported product.
//
// These are the Glass Outlet defaults — every literal that was previously
// scattered through engine.ts now lives here. A supplier override is a
// sparse JSON patch deep-merged over one of these base configs.
//
// Changing calculation behaviour for Glass Outlet = edit these objects.
// Adding a new supplier = deep-merge a patch over one of these.

import type { CalculatorConfig, ColorbondConfig, SlatConfig, TimberPalingConfig, FormFieldDef } from "./types.ts";
import qshsFields from "./products/qshs/fields.json" with { type: "json" };
import vsFields from "./products/vs/fields.json" with { type: "json" };
import xplFields from "./products/xpl/fields.json" with { type: "json" };
import baygFields from "./products/bayg/fields.json" with { type: "json" };
import qsGateFields from "./products/qs_gate/fields.json" with { type: "json" };
import colorbondFields from "./products/colorbond/fields.json" with { type: "json" };
import cbGateFields from "./products/cb_gate/fields.json" with { type: "json" };
import timberPalingFields from "./products/timber_paling/fields.json" with { type: "json" };

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
  COLORBOND: colorbondFields as ProductFieldFile,
  CB_GATE: cbGateFields as ProductFieldFile,
  TIMBER_PALING: timberPalingFields as ProductFieldFile,
};

// ─── Shared colour palette ────────────────────────────────────────────────────
// Keeping colours here for now (Phase 5 will move them to DB).

const STANDARD_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"];
const ECONOMY_COLOURS = ["B", "MN", "SM"];
const ALUMAWOOD_COLOURS = ["KWI", "WRC"];
const GATE_COLOURS = ["B", "BS", "D", "G", "M", "MN", "P", "PB", "S", "SM", "W"];
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

const INTERNAL_SKUS: SlatConfig["internalSkus"] = {
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

const GEOMETRY: SlatConfig["geometry"] = {
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

const PACK_SIZES: SlatConfig["packSizes"] = {
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
};

const CSR_THRESHOLDS: SlatConfig["csrThresholds"] = [
  { underMm: 2000, count: 0 },
  { underMm: 4000, count: 1 },
  { underMm: 6000, count: 2 },
  { underMm: Infinity, count: 3 },
];

const POST_RULES: SlatConfig["postRules"] = {
  longPostThresholdMm:          2400,
  inGroundShortPostMaxHeightMm: 1200,
  shortPostColours:             ["W", "MN"],
};

const MOUNTING_RULES: SlatConfig["mountingRules"] = {
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
  supported: true,
  defaultInfill: "horizontal",
  gateProductCode: "QS_GATE",
};

const GAP_RULES_SPACER_ONLY: SlatConfig["gapRules"] = {
  allowCustom: false,
  customMinMm: 1,
  customMaxMm: 50,
};
const GAP_RULES_CUSTOM: SlatConfig["gapRules"] = {
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
const HEIGHT_UI_COLORBOND: CalculatorConfig["heightUi"] = {
  mode: "options",
  heightOptions: [1500, 1800, 2100],
};

// ─── Colorbond steel fencing (bay-based, non-slat) ───────────────────────────
// The 6 Colorbond steel colours available on infill sheets. Night Sky ("B") is
// rails/posts-only and Black/Mill are powder-coat hardware finishes — excluded
// from the MVP fence colour picker (see plan assumptions).
const COLORBOND_COLOURS = ["MN", "G", "SM", "BS", "PB", "P"];

const DISPLAY_COLORBOND: CalculatorConfig["display"] = {
  name: "Colorbond Steel Fence",
  shortName: "Colorbond",
  description: "Colorbond steel sheet fencing",
};

const COLORBOND_DATA: ColorbondConfig = {
  bayWidths: [2365, 3125],
  sheetsPerBay: { "2365": 3, "3125": 4 },
  railsPerBay: 2,
  channelPostsPerBay: 2,
  tekPacksPerBay: 1,
  bagsPerInGroundPost: 1,
  sheetHeightOffsetMm: 10, // sheetHeight = finishedHeight - 10
  postSpacingExtraMm: 10,  // post centres = bayWidth + 10
  profiles: [
    { code: "GO-LINE", skuToken: "GLINE", heights: [1500, 1800, 2100] },
    { code: "GO-ZAG", skuToken: "GZAG", heights: [1500, 1800, 2100] },
    { code: "GO-TRIM", skuToken: "GTRIM", heights: [1800, 2100] },
  ],
  postHeightByFinished: {
    "1500": { in_ground: 2400, sharkfin_baseplate: 1800 },
    "1800": { in_ground: 2400 },
    "2100": { in_ground: 3000 },
  },
  // Kit-fabricated gates (catalogue p7 recipe + p17 gate parts): per leaf, one
  // stile 2-pack (left + right, 1520/1820/2120mm), 2 gate rails, 1 infill
  // sheet, 1 tek pack; hinges/latch/drop bolt come from the CB_GATE fields.
  // Assembled single gates are 900mm edge-to-edge (p17 trade tip).
  gates: {
    mode: "kit",
    kit: {
      nominalLeafWidthMm: 900,
      leafWidthToleranceMm: 100,
      stileHeights: [1500, 1800, 2100],
      railsPerLeaf: 2,
      sheetsPerLeaf: 1,
      tekPacksPerLeaf: 1,
      skus: {
        stilePack: "CB-{stileHeight}GS-{colour}-2PK",
        gateRail: "CB-GATE-R-830-{colour}",
        infillSheet: "CB-{profile}-{sheetHeight}-{colour}",
        tekScrewPack: "CB-TS-{colour}-15PK",
      },
    },
  },
  skus: {
    sheet: "CB-{profile}-{sheetHeight}-{colour}",
    rail: "CB-RAIL-{bayWidth}-{colour}",
    channelPost: "CB-CPOST-{postHeight}-{colour}",
    terminalPost: "XPSG-2700-ST65-{colour}",
    capSingle: "CB-POSTCAP-SGL",
    capDouble: "CB-POSTCAP-DBL",
    tekScrewPack: "CB-TS-{colour}-15PK",
    sharkfin: "CB-SHARKFIN-{colour}",
    concrete: "GROUT-CONCRETE",
  },
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

// ─── Shared slat-strategy block ──────────────────────────────────────────────
// Everything only the QuickScreen calculator (incl. its gate path) reads.
// Products that are not slat systems (Colorbond) omit `slat` entirely.

const SLAT_STD: SlatConfig = {
  colours: { csrPlate: CSR_PLATE_COLOURS, louvreBracketFallback: "MN" },
  gapRules: GAP_RULES_CUSTOM,
  internalSkus: INTERNAL_SKUS,
  stockLengths: {
    slat:  { standard: 6100, economy: 6500, awood: 5800 },
    rail:  { fence: 5800, gateHoriz: 4800, gateSliding: 6100 },
    frame: { sideFrame: 5800, gateFrame: 4200, vsRail: 5000, vsRailInsert: 5800, vsFSection: 5800 },
    track: 6000,
  },
  geometry: GEOMETRY,
  packSizes: PACK_SIZES,
  csrThresholds: CSR_THRESHOLDS,
  economySlatSkuPrefix: "XP-6500-E65",
  postRules: POST_RULES,
  mountingRules: MOUNTING_RULES,
  slatHeightDeductionMm: GEOMETRY.slatHeightDeduction,
};

// ─── Per-product base configs ─────────────────────────────────────────────────

export const BASE_QSHS_CONFIG: CalculatorConfig = {
  productCode: "QSHS",
  configVersion: "1.0.0",
  strategy: { fence: "horizontal_slat" },
  colours: {
    standard: STANDARD_COLOURS,
    economy: ECONOMY_COLOURS,
    alumawood: ALUMAWOOD_COLOURS,
    gate: GATE_COLOURS,
    fallback: "MN",
    names: COLOUR_NAMES,
    swatches: COLOUR_SWATCHES,
  },
  display: DISPLAY_QSHS,
  finishFamilies: ["standard", "economy", "alumawood"],
  heightUi: HEIGHT_UI_LADDER,
  panelRules: PANEL_RULES_STD,
  postFixingMaterials: POST_FIXING_MATERIALS,
  gateRules: GATE_RULES,
  defaults: { targetHeightMm: 1800, colour: "B", mountingType: "in_ground" },
  slat: SLAT_STD,
  fields: PRODUCT_FIELD_FILES.QSHS.fields,
  formGroups: PRODUCT_FIELD_FILES.QSHS.fieldGroups,
};

export const BASE_BAYG_CONFIG: CalculatorConfig = {
  ...BASE_QSHS_CONFIG,
  productCode: "BAYG",
  strategy: { fence: "panel" },
  panelRules: { ...PANEL_RULES_STD, maxPanelWidthMm: 3000 },
  display: DISPLAY_BAYG,
  finishFamilies: ["standard"],
  slat: { ...SLAT_STD, gapRules: GAP_RULES_SPACER_ONLY },
  gateRules: { ...GATE_RULES, supported: false },
  fields: PRODUCT_FIELD_FILES.BAYG.fields,
  formGroups: PRODUCT_FIELD_FILES.BAYG.fieldGroups,
};

export const BASE_VS_CONFIG: CalculatorConfig = {
  ...BASE_QSHS_CONFIG,
  productCode: "VS",
  strategy: { fence: "vertical_slat" },
  display: DISPLAY_VS,
  heightUi: HEIGHT_UI_VS_FREEFORM,
  gateRules: { ...GATE_RULES, defaultInfill: "vertical" },
  fields: PRODUCT_FIELD_FILES.VS.fields,
  formGroups: PRODUCT_FIELD_FILES.VS.fieldGroups,
};

export const BASE_XPL_CONFIG: CalculatorConfig = {
  ...BASE_QSHS_CONFIG,
  productCode: "XPL",
  strategy: { fence: "horizontal_slat" },
  display: DISPLAY_XPL,
  finishFamilies: ["standard", "alumawood"],
  slat: { ...SLAT_STD, gapRules: GAP_RULES_SPACER_ONLY },
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

// Colorbond steel fencing. Bay-based, non-slat — its own registered calculator
// (calculators/colorbond.ts) reads `colorbond`. Built standalone: it carries NO
// slat block (the god-type split's payoff).
export const BASE_COLORBOND_CONFIG: CalculatorConfig = {
  productCode: "COLORBOND",
  configVersion: "1.0.0",
  strategy: { fence: "colorbond_sheet" },
  colours: {
    standard: COLORBOND_COLOURS,
    economy: [],
    alumawood: [],
    gate: COLORBOND_COLOURS,
    fallback: "MN",
    names: COLOUR_NAMES,
    swatches: COLOUR_SWATCHES,
  },
  display: DISPLAY_COLORBOND,
  finishFamilies: ["standard"],
  heightUi: HEIGHT_UI_COLORBOND,
  // Bay widths go up to 3125mm; keep spacing headroom above that.
  panelRules: { ...PANEL_RULES_STD, maxPanelWidthMm: 3125, maxPostSpacingMm: 3200 },
  postFixingMaterials: POST_FIXING_MATERIALS,
  // Swing gates only (kit-fabricated, ~900mm leaves) — no Colorbond sliding gates.
  gateRules: {
    ...GATE_RULES,
    supported: true,
    gateProductCode: "CB_GATE",
    maxWidthMm: {
      pedestrianHorizontal: 2100,
      pedestrianVertical: 2100,
      slidingHorizontal: 2100,
      slidingVertical: 2100,
    },
    doubleSwingMaxLeafWidthMm: 1100,
  },
  defaults: { targetHeightMm: 1800, colour: "MN", mountingType: "in_ground" },
  colorbond: COLORBOND_DATA,
  // Depot availability from the catalogue (p10-11): GO-Line = Brisbane & Gold
  // Coast; GO-Trim = Newcastle only; GO-Zag = all three (no warning).
  extraRules: [
    {
      id: "colorbond-goline-depots",
      type: "variable_warning",
      when: { variable: "profile", in: ["GO-LINE"] },
      message: "GO-Line infill sheets are stocked at the Brisbane & Gold Coast depots only — confirm availability for other regions.",
    },
    {
      id: "colorbond-gotrim-depots",
      type: "variable_warning",
      when: { variable: "profile", in: ["GO-TRIM"] },
      message: "GO-Trim infill sheets are stocked at the Newcastle depot only — confirm availability for other regions.",
    },
  ],
  fields: PRODUCT_FIELD_FILES.COLORBOND.fields,
  formGroups: PRODUCT_FIELD_FILES.COLORBOND.fieldGroups,
};

// ─── Timber paling fencing (posts + rails + palings, non-slat) ────────────────
// Base values are Amazing Fencing's build rules + SKUs (the first timber
// supplier — no Glass Outlet timber catalogue exists). A future second timber
// vendor varies facts via a supplier_product_calculator_configs overlay.
// Source: catalogues/amazing-fencing/amazing_fencing_bom_breakdown_by_height.md

const DISPLAY_TIMBER_PALING: CalculatorConfig["display"] = {
  name: "Timber Paling Fence",
  shortName: "Timber Paling",
  description: "Butted or lapped-and-capped timber paling fencing, treated pine or hardwood",
};

const TIMBER_PALING_DATA: TimberPalingConfig = {
  bayWidthMm: 2400,
  railStockLengthMm: 4800,
  railSpanBays: 2,
  railsByHeight: [
    { maxHeightMm: 1200, rails: 2 },
    { maxHeightMm: 2100, rails: 3 },
    { maxHeightMm: 2400, rails: 4 },
  ],
  extraWastageFactor: 1.0, // supplier's published paling counts already include wastage
  styles: {
    butted: {
      layers: [{ palingsPerBay: 27, nailsPerPalingPerRail: 2, nailSkuKey: "nails45Pack" }],
    },
    lapped_capped: {
      layers: [
        { palingsPerBay: 19, nailsPerPalingPerRail: 1, nailSkuKey: "nails45Pack" }, // back layer
        { palingsPerBay: 19, nailsPerPalingPerRail: 2, nailSkuKey: "nails57Pack" }, // front (overlapping) layer
      ],
      capping: { stockLengthMm: 4800, lengthsPerBay: 0.5 },
    },
  },
  battenScrewsPerRailPiece: 2,
  packSizes: { nails45: 250, nails57: 250, battenScrews: 500 },
  postStockByFenceHeight: {
    "1200": { pine: 1800, hardwood: 1800 },
    "1500": { pine: 2400, hardwood: 2100 },
    "1800": { pine: 2400, hardwood: 2400 },
    "2100": { pine: 3000, hardwood: 2700 },
    "2400": { pine: 3000, hardwood: 3000 },
  },
  postCutDownNotes: {
    "1500": { pine: "2400mm pine post cut down to 2100mm on site" },
    "2100": { pine: "3000mm pine post cut down to 2700mm on site" },
  },
  palingLengthByFenceHeight: {
    "2100": 2400, // no 2100 paling stock — 2400 palings cut down
  },
  palingCutDownNotes: {
    "2100": "2400mm palings cut down to 2100mm on site",
  },
  concrete: {
    pineSku: "AF-CON-RAPID-30",
    hardwoodSku: "AF-CON-POSTMIX-30",
    bagsPerPost: 1,
  },
  skus: {
    paling: "AF-PAL-100x16-{palingLength}",
    post: "AF-POST-{species}-100x75-{postLength}",
    rail: "AF-RAIL-{species}-75x38-{railLength}",
    cappingRail: "AF-CAP-75x50-{cappingLength}",
    nails45Pack: "AF-NAIL-COIL-45-250",
    nails57Pack: "AF-NAIL-COIL-57-250",
    battenScrewPack: "AF-SCR-BB-14g-100-500",
  },
};

export const BASE_TIMBER_PALING_CONFIG: CalculatorConfig = {
  productCode: "TIMBER_PALING",
  configVersion: "1.0.0",
  strategy: { fence: "timber_paling" },
  // Timber has no colour choice — a single "NA" pseudo-colour satisfies the
  // required colours shape (normaliseVariables snaps any inherited colour to
  // it; no timber SKU template carries {colour}).
  colours: {
    standard: ["NA"],
    economy: [],
    alumawood: [],
    gate: [],
    fallback: "NA",
    names: { ...COLOUR_NAMES, NA: "Natural timber" },
    swatches: { ...COLOUR_SWATCHES, NA: "#a07850" },
  },
  display: DISPLAY_TIMBER_PALING,
  finishFamilies: ["standard"],
  heightUi: { mode: "options", heightOptions: [1200, 1500, 1800, 2100, 2400] },
  panelRules: { maxPanelWidthMm: 2400, minPostSpacingMm: 100, maxPostSpacingMm: 2400 },
  postFixingMaterials: POST_FIXING_MATERIALS,
  gateRules: { ...GATE_RULES, supported: false }, // timber gates = v2
  defaults: { targetHeightMm: 1800, colour: "NA", mountingType: "in_ground" },
  timberPaling: TIMBER_PALING_DATA,
  fields: PRODUCT_FIELD_FILES.TIMBER_PALING.fields,
  formGroups: PRODUCT_FIELD_FILES.TIMBER_PALING.fieldGroups,
};

// CB_GATE mirrors the QS_GATE pattern: no fence strategy of its own — Colorbond
// gates are calculated inline by calculators/colorbond.ts (kit/bundle modes).
// This entry exists purely so get-calculator-config can serve the gate-segment
// fields under a stable productCode, and so per-org overlays can replace the
// gate fields (e.g. Amazing Fencing's pre-built bundle options).
export const BASE_CB_GATE_CONFIG: CalculatorConfig = {
  ...BASE_COLORBOND_CONFIG,
  productCode: "CB_GATE",
  fields: PRODUCT_FIELD_FILES.CB_GATE.fields,
  formGroups: PRODUCT_FIELD_FILES.CB_GATE.fieldGroups,
};

export const BASE_CONFIGS: Record<string, CalculatorConfig> = {
  QSHS: BASE_QSHS_CONFIG,
  BAYG: BASE_BAYG_CONFIG,
  VS:   BASE_VS_CONFIG,
  XPL:  BASE_XPL_CONFIG,
  QS_GATE: BASE_QS_GATE_CONFIG,
  COLORBOND: BASE_COLORBOND_CONFIG,
  CB_GATE: BASE_CB_GATE_CONFIG,
  TIMBER_PALING: BASE_TIMBER_PALING_CONFIG,
};
