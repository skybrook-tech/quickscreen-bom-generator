// engine.ts — BOM engine orchestrator: types, synthetic data, pricing, aggregation,
//             suggested accessories, gate hardware hints.
//
// Calculation logic moved to calculators/quickscreen.ts.
// Config types and canonical payload types moved to config/types.ts.
// Shared helpers moved to engine-utils.ts.
//
// Public API is unchanged for the test and index.ts callers:
//   calculateLocalBom(payload, tier, ctx?) — optional ctx; defaults to synthetic data.
//   suggestAccessories(payload, bomLines, tier)
//   computeGateHardwareHints(payload)

// ─── Re-export canonical types so existing callers don't need to change imports ──

export type {
  CanonicalBoundary, CanonicalSegment, CanonicalRun, CanonicalPayload,
  QtyLine, ScopeInfo, BOMSourceKind,
  SeedComponent, LocalPricingRule, CalcContext,
} from "./config/types.ts";

export type {
  GateHardwareStatus, GateWeightInput, GateWeightEstimate,
  HingeHardware, LatchHardware, RankedHardware, GateHardwareHint,
  GateMovement, LegacyBoundaryType, CornerType, OptionalAccessory,
} from "./engine-utils.ts";

export {
  HINGE_HARDWARE, LATCH_HARDWARE, HARDWARE_KITS,
  estimateGateWeight, baseHardwareSku, hingeGapForSku, latchGapForSku,
  isWhiteHardwareFinish, isTruCloseHardware, kitForHardwareSelection,
  rankHinges, rankLatches,
  normalizeGateMovement, gateMovementOrDefault, gateLeafGeometry,
  clampPostSpacing, MIN_POST_SPACING_MM, MAX_POST_SPACING_MM,
  effectiveLegacyBoundaryType, cornerDegreesFromVars, cornerTypeFromVars,
  SEGMENT_TERMINATION_KEYS, GATE_SEGMENT_STUB_KEYS,
  selectedOptionalAddOns, optionalAccessoriesForParent, OPTIONAL_ACCESSORY_KEY,
  knownSelectedSku, COLOUR_NAMES, STANDARD_COLOURS, ALUMAWOOD_CORE_COLOURS,
  designSlatWidthMm,
} from "./engine-utils.ts";

import type {
  CanonicalPayload, CanonicalRun, SeedComponent, LocalPricingRule, CalcContext, QtyLine, ScopeInfo,
} from "./config/types.ts";
import { BASE_CONFIGS } from "./config/base.ts";
import { makeInternalSkuResolver } from "./resolve.ts";
import { calculatorFor } from "./calculators/registry.ts";
import { roundMoney, COLOUR_NAMES, clampPostSpacing, toNumber } from "./engine-utils.ts";
import { GATE_SEGMENT_STUB_KEYS, optionalAccessoriesForParent, selectedOptionalAddOns, ALUMAWOOD_CORE_COLOURS, STANDARD_COLOURS } from "./engine-utils.ts";
// ─── Public types unique to this module ───────────────────────────────────────

export type PricingTier = "tier1" | "tier2" | "tier3";
export type BOMUnit = "each" | "length" | "pack" | "box" | "bag";

export interface BOMSource {
  scopeKind: "fence_run" | "gate" | "enclosure" | "global";
  scopeId: string;
  scopeLabel: string;
  qty: number;
}

export interface BOMLineItem {
  category: string;
  subCategory?: string;
  companionOf?: string;
  sortPriority?: number;
  sku: string;
  description: string;
  quantity: number;
  totalQty?: number;
  sources?: BOMSource[];
  unit: BOMUnit;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
  runId?: string;
  segmentId?: string;
  productCode?: string;
}

export type SuggestedAccessory = {
  id: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  category: "fixing" | "finish" | "post_accessory" | "catalogue_gap";
  reason: string;
  priced: boolean;
};

export type LocalBomResult = {
  lines: BOMLineItem[];
  runResults: Array<{ runId: string; items: BOMLineItem[] }>;
  gateItems: BOMLineItem[];
  totals: { subtotal: number; gst: number; grandTotal: number };
  warnings: string[];
  errors: string[];
  assumptions: string[];
  computed: Record<string, Record<string, Record<string, unknown>>>;
  pricingTier: PricingTier;
  generatedAt: string;
};

// ─── Synthetic data helpers ────────────────────────────────────────────────────

function component(sku: string, name: string, description: string, category: string, unit: string, defaultPrice: number, systemTypes: string[] = ["QSHS"]): SeedComponent {
  return { sku, name, description, category, unit, default_price: defaultPrice, system_types: systemTypes, active: true };
}

function pricing(sku: string, tier1: number, tier2: number, tier3: number): LocalPricingRule[] {
  return [
    { sku, tier_code: "tier1", rule: null, price: tier1, priority: 0, active: true },
    { sku, tier_code: "tier2", rule: null, price: tier2, priority: 0, active: true },
    { sku, tier_code: "tier3", rule: null, price: tier3, priority: 0, active: true },
  ];
}

const QSG_GATE_COLOUR_CODES = ["B", "BS", "D", "G", "M", "MN", "P", "PB", "S", "SM", "W"] as const;

export const syntheticComponents: SeedComponent[] = [
  { sku: "PAINT-B", name: "Touch Up Paint Black Satin", description: "Touch up paint spray can - Black Satin", category: "accessory", unit: "each", default_price: 11.35, system_types: ["QSHS", "VS", "XPL", "BAYG"], active: true },
  { sku: "PAINT-MN", name: "Touch Up Paint Monument Matt", description: "Touch up paint spray can - Monument Matt", category: "accessory", unit: "each", default_price: 11.35, system_types: ["QSHS", "VS", "XPL", "BAYG"], active: true },
  { sku: "XP-6500-E65-B", name: "65mm Economy Slat Black Satin", description: "65mm Economy slat, no centre web, 6500mm stock", category: "slat", unit: "length", default_price: 32.85, system_types: ["QSHS", "VS"], active: true },
  { sku: "XP-6500-E65-MN", name: "65mm Economy Slat Monument Matt", description: "65mm Economy slat, no centre web, 6500mm stock", category: "slat", unit: "length", default_price: 32.85, system_types: ["QSHS", "VS"], active: true },
  { sku: "XP-6500-E65-SM", name: "65mm Economy Slat Surfmist", description: "65mm Economy slat, no centre web, 6500mm stock", category: "slat", unit: "length", default_price: 31.05, system_types: ["QSHS", "VS"], active: true },
  component("XP-1800-FP-MN", "XPRESS 50mm Full Post Monument 1800mm", "XPRESS Screening 50 x 50mm full post, 1800mm long - Monument Matt", "post", "each", 26, ["QSHS", "BAYG", "VS", "XPL"]),
  component("XP-1800-FP-W", "XPRESS 50mm Full Post Pearl White 1800mm", "XPRESS Screening 50 x 50mm full post, 1800mm long - Pearl White Gloss", "post", "each", 26, ["QSHS", "BAYG", "VS", "XPL"]),
  component("XP-FOOT-ADJ", "XPRESS 100mm Adjustable Support Foot", "XPRESS Screening 100mm support foot, height adjustable, SS316 polished", "post_accessory", "each", 12.24, ["VS"]),
  ...QSG_GATE_COLOUR_CODES.flatMap((colour) => [
    component(`QSG-4200-GSF50-${colour}`, `QSG 50x50 Gate Side Frame ${colour}`, `QuickScreen Gate System 50x50mm gate side frame, 4200mm stock - ${colour}`, "gate_side_frame", "length", colour === "M" ? 80.59 : 90.04, ["GATE"]),
    component(`QSG-4800-RAIL65-${colour}`, `QSG 65mm Horizontal Gate Rail ${colour}`, `QuickScreen Gate System 65x50mm horizontal gate rail, 4800mm stock - ${colour}`, "gate_rail", "length", 0, ["GATE"]),
    component(`QSG-4800-RAIL90-${colour}`, `QSG 90mm Horizontal Gate Rail ${colour}`, `QuickScreen Gate System 90x50mm horizontal gate rail, 4800mm stock - ${colour}`, "gate_rail", "length", 0, ["GATE"]),
    component(`QSG-S-6100-TR65-${colour}`, `QSG 65mm Sliding Gate Top Rail ${colour}`, `QuickScreen Gate System 65mm sliding gate top rail, 6100mm stock - ${colour}`, "gate_rail", "length", colour === "M" ? 134.78 : 147.48, ["GATE"]),
    component(`QSG-S-6100-TR90-${colour}`, `QSG 90mm Sliding Gate Top Rail ${colour}`, `QuickScreen Gate System 90mm sliding gate top rail, 6100mm stock - ${colour}`, "gate_rail", "length", colour === "M" ? 134.78 : 147.48, ["GATE"]),
    component(`QSG-S-6100-BR-${colour}`, `QSG Sliding Gate Bottom Rail ${colour}`, `QuickScreen Gate System sliding gate bottom rail, 6100mm stock - ${colour}`, "gate_rail", "length", colour === "M" ? 134.78 : 147.48, ["GATE"]),
    component(`QSG-4800-INF-${colour}`, `QSG Gate Infill ${colour}`, `QuickScreen Gate System gate infill, 4800mm stock - ${colour}`, "gate_infill", "length", colour === "M" ? 11.29 : 15.7, ["GATE"]),
    component(`QSG-4200-CINF-${colour}`, `QSG Channel Infill ${colour}`, `QuickScreen Gate System channel infill, 4200mm stock - ${colour}`, "gate_infill", "length", colour === "M" ? 28.96 : 39.65, ["GATE"]),
    component(`QSG-4200-COVER-${colour}`, `QSG Gate Screw Cover ${colour}`, `QuickScreen Gate System screw cover, 4200mm stock - ${colour}`, "gate_screw_cover", "length", colour === "M" ? 5.51 : 8.03, ["GATE"]),
    component(`QSG-GFC-50X50-${colour}`, `QSG 50x50 Gate Top Cap ${colour}`, `QuickScreen Gate System 50x50mm flat gate top cap - ${colour}`, "frame_top_cap", "each", colour === "M" ? 2.31 : 2.73, ["GATE"]),
  ]),
  ...[
    ["KF-AH-AT", "D&D Kwik Fit aluminium hinge adjustable tension", 45.45],
    ["KF-H-FT", "D&D Kwik Fit hinge set fixed tension pair", 14.5],
    ["KF-H-NT", "D&D Kwik Fit hinge set no tension pair", 12.5],
    ["TC-H-AT-B", "D&D TruClose hinge set adjustable tension - black", 25.52],
    ["TC-H-AT-2L-B", "D&D TruClose two-leg adjustable tension hinge - black", 25.52],
    ["TC-H-AT-HD-B", "D&D TruClose heavy duty hinge set adjustable tension - black", 39.75],
    ["TC-H-AT-HD-2L-B", "D&D TruClose heavy duty two-leg hinge - black", 40.49],
    ["TC-CAPS3", "D&D TruClose hinge safety caps", 1.39],
    ["SURECLOSE-HH", "D&D SureClose ReadyFit hydraulic hinge closer", 340.64],
    ["SURECLOSE-NSC", "D&D SureClose ReadyFit non self-closing hinge", 142.21],
    ["SS-BH10075-B", "Six Star 100x75 butt hinge - black", 5.1],
    ["ZF-BBH-L", "Zeus ball bearing hinge - left hand", 18.46],
    ["ZF-BBH-R", "Zeus ball bearing hinge - right hand", 18.46],
    ["CB-HINGE-B-2PK", "Colourbond hinge pair - black", 8.22],
    ["LL-DL", "D&D Lokk Latch Deluxe lockable keyed different", 65.12],
    ["LL-DL-KA", "D&D Lokk Latch Deluxe lockable keyed alike", 66.07],
    ["LL-DL-W", "D&D Lokk Latch Deluxe lockable - white", 73.89],
    ["LLAA", "D&D Lokk Latch general purpose lockable latch", 27.79],
    ["LLAA-W", "D&D Lokk Latch general purpose lockable latch - white", 33.27],
    ["LLB", "D&D Lokk Latch external access push-button kit", 19.36],
    ["T-L", "D&D T-Latch padlockable", 18.69],
    ["ML-TL-W", "D&D Magna Latch top pull - white", 51.87],
    ["QB124", "D&D Q-Bolt 610mm padlockable drop bolt", 45],
    ["LB-PL", "D&D Lokk Bolt 450mm lockable security drop bolt", 72.42],
    ["ZF-DB400-B", "Zeus Fencing 400mm drop bolt - black", 9.26],
    ["SS-0300DB-B", "300mm drop bolt - black powdercoated", 3.95],
    ["SS-0300DB-ZP", "300mm drop bolt - zinc plated", 5.1],
    ["SS-DL-B", "Six Star tubular D latch and striker - black", 8.62],
    ["MR-FMLSL", "D&D Magna Latch side-pull latch", 36.4],
    ["LL-GH", "D&D Lokk Latch gate handle", 5.9],
    ["SS-GS", "D&D gate stop", 7.02],
    ["SS-GS-SLIMLINE", "Slimline gate stop", 3.02],
    ["KF-AH-AT-W", "D&D Kwik Fit aluminium adjustable hinge - white", 49.4],
    ["TC-H-AT-2L-W", "D&D TruClose two-leg adjustable tension hinge - white", 31.78],
    ["TC-H-AT-HD-2L-W", "D&D TruClose heavy duty two-leg hinge - white", 54.05],
    ["XPSG-3000-TRACK-ST", "XPRESS sliding gate steel track 3000mm", 26.52],
    ["XPSG-6000-TRACK-ST", "XPRESS sliding gate steel track 6000mm", 50.44],
    ["XPSG-6000-TRACK-AL", "XPRESS sliding gate aluminium track 6000mm", 54.08],
    ["XPSG-ANCHOR", "XPRESS sliding gate galvanised steel track anchor pin", 0.72],
    ["XPSG-CATCH-F", "XPRESS sliding gate adjustable F catch", 27.37],
    ["XPSG-CATCH-U", "XPRESS sliding gate U catch", 13.88],
    ["XPSG-FILO-400", "XPRESS FILO 400 Pro sliding gate motor kit", 726.55],
    ["XPSG-FILO-400PRO-SP", "XPRESS FILO 400 Pro split-pack motor kit", 847.85],
    ["XPSG-FILO-BATTERY", "Backup battery for FILO sliding gate motor", 189.22],
    ["XPSG-FILO-RACK", "Rack for sliding gate motor, 1m section", 25.48],
    ["XPSG-FILO-REMOTE", "Remote control for FILO 400 motor", 59.03],
    ["XPSG-FILO-SOLAR", "Solar power kit for FILO 400 motor", 758.16],
    ["XPSG-FILO-WKP", "Wireless keypad for FILO 400 motor", 199.32],
    ["XPSG-GUIDE", "XPRESS sliding gate self-adjusting slide guide", 38.69],
    ["XPSG-STOP", "XPRESS sliding gate bolt down stop", 18.2],
    ["XPSG-TOPROLL-2PK", "XPRESS sliding gate nylon top roller 2 pack", 37.96],
    ["XPSG-WHEEL", "XPRESS sliding gate 80mm wheel", 21.53],
    ["XPSG-WHEEL-CS", "XPRESS sliding gate wheel clamping set 2 pack", 6],
    ["QSG-S-WHEEL", "QuickScreen sliding gate 80mm wheel", 21.53],
    ["QSG-S-WHEEL-CS-2PK", "QuickScreen sliding gate wheel clamping set 2 pack", 6],
  ].map(([sku, description, price]) => component(String(sku), String(description), String(description), "hardware", "each", Number(price), ["GATE", "QS_GATE", "XPL"])),
  ...["B", "BS", "D", "G", "MN", "P", "PB", "S", "SM", "W"].map((colour) => component(`XP-6000-135-${colour}`, `XPRESS/QuickScreen 135 Degree Adapter ${colour}`, `XPRESS/QuickScreen 44 x 22mm 135 degree adapter, 6000mm stock - ${colour}`, "accessory", "length", 42.63, ["QSHS", "BAYG", "VS"])),
  ...["B", "BS", "D", "G", "M", "MN", "PB", "S", "SM", "W"].map((colour) => component(`QS-LB-${colour}`, `QuickScreen/Xpress Louvre Bracket Pack ${colour}`, `Louvre bracket pack for 65 x 16.5mm slat - ${colour}`, "bracket", "pack", colour === "M" ? 3.4 : colour === "PB" || colour === "W" ? 4.26 : 4.43, ["QSHS"])),
  component("XP-6000-135-M", "XPRESS/QuickScreen 135 Degree Adapter Mill", "XPRESS/QuickScreen 44 x 22mm 135 degree adapter, 6000mm stock - Mill", "accessory", "length", 34.87, ["QSHS", "BAYG", "VS"]),
  component("AW-5800-135-KWI", "Alumawood 135 Degree Adapter Kwila", "Alumawood 44 x 22mm 135 degree adapter, 5800mm stock - Kwila", "accessory", "length", 65.73, ["QSHS", "BAYG", "VS"]),
  component("AW-5800-135-WRC", "Alumawood 135 Degree Adapter Western Red Cedar", "Alumawood 44 x 22mm 135 degree adapter, 5800mm stock - Western Red Cedar", "accessory", "length", 65.73, ["QSHS", "BAYG", "VS"]),
  component("QS-SCREWS-50PK", "QuickScreen 10gx16mm Screws 50 Pack", "QuickScreen 10gx16mm screws, 50 pack", "screw", "pack", 1.42),
  ...["B", "BS", "D", "G", "M", "MN", "P", "S", "SM", "W"].map((colour) => component(`XP-SCREWS-${colour}`, `XPRESS Screening Screws ${colour}`, `XPRESS Screening 10g x 16mm self drilling wafer head screws, bag of 100 - ${colour}`, "screw", "pack", 6.36)),
  ...[["05MM", "5", 1.42], ["09MM", "9", 2.63], ["12MM", "12", 3.47], ["15MM", "15", 4.1], ["20MM", "20", 5.2], ["30MM", "30", 7.3]].map(([gapCode, gapLabel, price]) => component(`QS-SPACER-${gapCode}-50PK`, `QuickScreen ${gapLabel}mm Spacer 50 Pack`, `QuickScreen snap-in spacer for ${gapLabel}mm slat gap, 50 pack`, "accessory", "pack", Number(price))),
  component("AW-5800-S65-KWI", "Alumawood 65mm Slat Kwila", "Alumawood 65 x 16.5mm slat, 5800mm stock - Kwila", "slat", "length", 50.49),
  component("AW-5800-S65-WRC", "Alumawood 65mm Slat Western Red Cedar", "Alumawood 65 x 16.5mm slat, 5800mm stock - Western Red Cedar", "slat", "length", 50.49),
  component("AWQS-5800-S90-WRC", "Alumawood 90mm QuickScreen Slat Western Red Cedar", "Alumawood 90 x 16.5mm QuickScreen slat with centre web, 5800mm stock - Western Red Cedar", "slat", "length", 64.72),
  component("AWQS-5800-SF-KWI", "Alumawood QuickScreen Side Frame Kwila", "Alumawood QuickScreen 27 x 26mm side frame, 5800mm stock - Kwila", "side_frame", "length", 35.21),
  component("AWQS-5800-SF-WRC", "Alumawood QuickScreen Side Frame Western Red Cedar", "Alumawood QuickScreen 27 x 26mm side frame, 5800mm stock - Western Red Cedar", "side_frame", "length", 35.21),
  component("AWQS-5800-CFC-KWI", "Alumawood QuickScreen Concealed Fixing Cover Kwila", "Alumawood QuickScreen concealed fixing cover, 5800mm stock - Kwila", "cfc_cover", "length", 19.82),
  component("AWQS-5800-CFC-WRC", "Alumawood QuickScreen Concealed Fixing Cover Western Red Cedar", "Alumawood QuickScreen concealed fixing cover, 5800mm stock - Western Red Cedar", "cfc_cover", "length", 19.82),
  component("AWQS-5800-F-KWI", "Alumawood QuickScreen F Section Kwila", "Alumawood QuickScreen 50 x 35mm F section, 5800mm stock - Kwila", "f_section", "length", 42.11),
  component("AWQS-5800-F-WRC", "Alumawood QuickScreen F Section Western Red Cedar", "Alumawood QuickScreen 50 x 35mm F section, 5800mm stock - Western Red Cedar", "f_section", "length", 42.11),
  component("AW-5800-CSR-KWI", "Alumawood Centre Support Rail Kwila", "Alumawood 40 x 13mm centre support rail with snap-on CFC, 5800mm stock - Kwila", "centre_support_rail", "length", 51.59),
  component("AW-5800-CSR-WRC", "Alumawood Centre Support Rail Western Red Cedar", "Alumawood 40 x 13mm centre support rail with snap-on CFC, 5800mm stock - Western Red Cedar", "centre_support_rail", "length", 51.59),
  component("AW-2400-FP-KWI", "Alumawood 50mm Full Post Kwila", "Alumawood 50 x 50mm full post, 2400mm long - Kwila", "post", "each", 50.91),
  component("AW-2400-FP-WRC", "Alumawood 50mm Full Post Western Red Cedar", "Alumawood 50 x 50mm full post, 2400mm long - Western Red Cedar", "post", "each", 50.91),
  component("AW-2400-65HD-KWI", "Alumawood 65mm Heavy Duty Post Kwila", "Alumawood 65 x 65mm heavy duty post, 2400mm long - Kwila", "post", "each", 84.24),
  component("AW-2400-65HD-WRC", "Alumawood 65mm Heavy Duty Post Western Red Cedar", "Alumawood 65 x 65mm heavy duty post, 2400mm long - Western Red Cedar", "post", "each", 84.24),
  component("AW-5800-FP-KWI", "Alumawood 50mm Full Post Kwila 5800mm", "Alumawood 50 x 50mm full post, 5800mm long - Kwila", "post", "each", 109.67),
  component("AW-5800-FP-WRC", "Alumawood 50mm Full Post Western Red Cedar 5800mm", "Alumawood 50 x 50mm full post, 5800mm long - Western Red Cedar", "post", "each", 109.67),
  component("AW-5800-65HD-KWI", "Alumawood 65mm Heavy Duty Post Kwila 5800mm", "Alumawood 65 x 65mm heavy duty post, 5800mm long - Kwila", "post", "each", 187.14),
  component("AW-5800-65HD-WRC", "Alumawood 65mm Heavy Duty Post Western Red Cedar 5800mm", "Alumawood 65 x 65mm heavy duty post, 5800mm long - Western Red Cedar", "post", "each", 187.14),
  component("AW-TP-TR", "Alumawood 50mm Post Flat Top Plate Terrain", "Alumawood 50mm post flat top plate - Terrain Matt", "post_accessory", "each", 1.82),
  component("AW-BTP-TR", "Alumawood Centre Support Rail Top/Base Plate Terrain", "Alumawood centre support rail base/top plate - Terrain Matt", "accessory", "each", 5.94),
  component("AW-65TP-TR", "Alumawood 65mm Post Flat Top Plate Terrain", "Alumawood 65mm post flat top plate - Terrain Matt", "post_accessory", "each", 3.52),
  component("AW-BP-SET-TR", "Alumawood 50mm Post Base Plate Set Terrain", "Alumawood 50mm post base plate set - Terrain Matt", "post_accessory", "each", 12.01),
  component("AW-65BP-SET-TR", "Alumawood 65mm Post Base Plate Set Terrain", "Alumawood 65mm post base plate set - Terrain Matt", "post_accessory", "each", 10.3),
  component("AW-DC-2P-TR", "Alumawood 50mm Domical Cover Terrain", "Alumawood 50mm two-part domical cover - Terrain Matt", "post_accessory", "each", 5.25),
  component("AW-65DC-2P-TR", "Alumawood 65mm Domical Cover Terrain", "Alumawood 65mm two-part domical cover - Terrain Matt", "post_accessory", "each", 5.51),
  component("AW-DR-TR", "Alumawood 50mm Dress Ring Terrain", "Alumawood 50mm post dress ring - Terrain Matt", "post_accessory", "each", 3.52),
  component("AW-65DR-TR", "Alumawood 65mm Dress Ring Terrain", "Alumawood 65mm post dress ring - Terrain Matt", "post_accessory", "each", 4.73),
  component("GROUT-RSC", "Rapid set concrete 20kg", "Rapid set concrete, 20kg bag, common 30 minute post footing mix", "fixing", "bag", 0, ["QSHS", "VS", "XPL", "BAYG"]),
  component("GROUT-CONCRETE", "General concrete mix 20kg", "General concrete mix, 20kg bag", "fixing", "bag", 0, ["QSHS", "VS", "XPL", "BAYG"]),
  component("GROUT-POL-10KG", "Polaris non-shrink grout 10kg", "Polaris high-strength non-shrink expansion grout, 10kg bag", "fixing", "bag", 0, ["QSHS", "VS", "XPL", "BAYG"]),
  component("GROUT-BOS", "Bostik HES grout 20kg", "Bostik high early strength grout, 20kg bag", "fixing", "bag", 0, ["QSHS", "VS", "XPL", "BAYG"]),
  component("GROUT-SIKA", "Sika HES grout 20kg", "Sika high early strength water-resistant grout, 20kg bag", "fixing", "bag", 0, ["QSHS", "VS", "XPL", "BAYG"]),
  component("S-110LAG-4PK", "Timber fixing kit 4 pack", "4x M10 x 110mm SS316 lag screws with nuts and washers for timber substrate", "fixing", "pack", 9.76, ["QSHS", "VS", "XPL", "BAYG"]),
  component("S-120ROD-4PK", "Concrete fixing kit 4 pack", "4x M10 x 120mm threaded rods with nuts and washers for concrete substrate", "fixing", "pack", 6.77, ["QSHS", "VS", "XPL", "BAYG"]),
  component("SOUD-CA1400", "Soudafix CA1400 chemical anchor", "280ml chemical anchor for damp or soft concrete and pressure-free anchor fixing", "fixing", "each", 19.61, ["QSHS", "VS", "XPL", "BAYG"]),
  component("SOUD-GUN", "Soudafix heavy-duty cartridge gun", "Heavy-duty 18:1 cartridge gun for SOUD-CA1400", "fixing", "each", 31.1, ["QSHS", "VS", "XPL", "BAYG"]),
  ...[
    ["DB-PH3", "Phillips #3 driver bit", "Phillips #3 driver bit for QuickScreen gate joiner screws", "fixing", "each", 1.56],
    ["DB-SQ3.4", "Square #3.4 driver bit", "Square #3.4 driver bit for gate rail screws", "fixing", "each", 1.5],
    ["SS-POSTPLUG-4PK", "Black post plug 4 pack", "32mm OD post plugs, black, 4 pack", "post_accessory", "pack", 1.56],
    ["SS-POSTPLUG-4PK-MN", "Monument post plug 4 pack", "32mm OD post plugs, Monument, 4 pack", "post_accessory", "pack", 1.56],
    ["SS-POSTPLUG-4PK-W", "White post plug 4 pack", "32mm OD post plugs, white, 4 pack", "post_accessory", "pack", 1.56],
    ["REV-CD-2S", "Diamond Revolution 1500W 2-speed drill", "Diamond Revolution 1500W 2-speed core drill", "tooling", "each", 239.2],
    ["REV-STAND", "Diamond Revolution drill stand", "Diamond Revolution core drill stand", "tooling", "each", 251.59],
    ["REV-TEMPLATE", "Diamond Revolution drilling template", "Diamond Revolution core-drilling template", "tooling", "each", 36.49],
    ["REV-LEVEL", "Diamond Revolution level", "Diamond Revolution core drill level", "tooling", "each", 11.2],
    ["REV-GUARD", "Diamond Revolution splash guard", "Diamond Revolution core drill splash guard", "tooling", "each", 31.45],
    ["REV-BASE", "Diamond Revolution base", "Diamond Revolution core drill base", "tooling", "each", 80.36],
    ["REV-BIT-08", "Diamond Revolution core bit 8mm", "Diamond Revolution 8mm core drill bit", "tooling", "each", 11.87],
    ["REV-BIT-10", "Diamond Revolution core bit 10mm", "Diamond Revolution 10mm core drill bit", "tooling", "each", 13.86],
    ["REV-BIT-12", "Diamond Revolution core bit 12mm", "Diamond Revolution 12mm core drill bit", "tooling", "each", 16.45],
    ["REV-BIT-14", "Diamond Revolution core bit 14mm", "Diamond Revolution 14mm core drill bit", "tooling", "each", 18.94],
    ["REV-BIT-20", "Diamond Revolution core bit 20mm", "Diamond Revolution 20mm core drill bit", "tooling", "each", 35.38],
    ["REV-BIT-42", "Diamond Revolution core bit 42mm", "Diamond Revolution 42mm core drill bit", "tooling", "each", 40.68],
    ["REV-BIT-53", "Diamond Revolution core bit 53mm", "Diamond Revolution 53mm core drill bit", "tooling", "each", 58.81],
    ["REV-BIT-63", "Diamond Revolution core bit 63mm", "Diamond Revolution 63mm core drill bit", "tooling", "each", 64.69],
    ["REV-BIT-76", "Diamond Revolution core bit 76mm", "Diamond Revolution 76mm core drill bit", "tooling", "each", 73.99],
    ["REV-BIT-83", "Diamond Revolution core bit 83mm", "Diamond Revolution 83mm core drill bit", "tooling", "each", 81.46],
    ["REV-BIT-89", "Diamond Revolution core bit 89mm", "Diamond Revolution 89mm core drill bit", "tooling", "each", 85.3],
    ["ULTRALOC-3242", "Ultraloc 3242 threadlocker", "Ultraloc 3242 threadlocker for base-plate fixings", "fixing", "each", 12.92],
    ["FB-V60", "Bostik V60 glazing silicone", "Bostik V60 glazing silicone", "fixing", "each", 12.24],
    ["SOUD-EPOFIX", "Soudal Epofix epoxy", "Soudal Epofix epoxy for core-drilled post fixing", "fixing", "each", 8.42],
  ].map(([sku, name, description, category, unit, price]) => component(String(sku), String(name), String(description), String(category), String(unit), Number(price), ["QSHS", "VS", "XPL", "BAYG", "GATE", "QS_GATE"])),
];

const syntheticPricingRules: LocalPricingRule[] = [
  ...pricing("QS-SCREWS-50PK", 1.42, 1.42, 1.42),
  ...["B", "BS", "D", "G", "M", "MN", "P", "S", "SM", "W"].flatMap((c) => pricing(`XP-SCREWS-${c}`, 6.36, 5.99, 5.16)),
  ...["B", "BS", "D", "G", "MN", "S", "SM"].flatMap((c) => pricing(`QS-LB-${c}`, 4.43, 4.11, 3.67)),
  ...pricing("QS-LB-M", 3.4, 3.17, 2.9), ...pricing("QS-LB-PB", 4.26, 3.95, 3.53), ...pricing("QS-LB-W", 4.26, 3.95, 3.53),
  ...pricing("QS-SPACER-05MM-50PK", 1.42, 1.22, 1.05), ...pricing("QS-SPACER-09MM-50PK", 2.63, 2.26, 1.95),
  ...pricing("QS-SPACER-12MM-50PK", 3.47, 2.98, 2.57), ...pricing("QS-SPACER-15MM-50PK", 4.1, 3.53, 3.03),
  ...pricing("QS-SPACER-20MM-50PK", 5.2, 4.47, 3.85), ...pricing("QS-SPACER-30MM-50PK", 7.3, 6.28, 5.4),
  ...pricing("XP-1800-FP-MN", 26, 26, 26), ...pricing("XP-1800-FP-W", 26, 26, 26),
  ...pricing("XP-FOOT-ADJ", 12.24, 11.4, 10.41),
  ...["B", "BS", "D", "G", "M", "MN", "P", "PB", "S", "SM", "W"].flatMap((c) => {
    const p = c === "M" ? [134.78, 128.04, 119.93] : [147.48, 140.1, 131.26];
    return [...pricing(`QSG-S-6100-TR65-${c}`, p[0], p[1], p[2]), ...pricing(`QSG-S-6100-TR90-${c}`, p[0], p[1], p[2]), ...pricing(`QSG-S-6100-BR-${c}`, p[0], p[1], p[2])];
  }),
  ...[
    ["KF-AH-AT", 45.45, 45.45, 45.45], ["KF-H-FT", 14.5, 14.5, 14.5], ["KF-H-NT", 12.5, 12.5, 12.5],
    ["TC-H-AT-B", 25.52, 25.52, 25.52], ["TC-H-AT-2L-B", 25.52, 25.52, 25.52], ["TC-H-AT-HD-B", 39.75, 39.75, 39.75], ["TC-H-AT-HD-2L-B", 40.49, 40.49, 40.49],
    ["TC-CAPS3", 1.39, 1.39, 1.39], ["SURECLOSE-HH", 340.64, 327.6, 327.6], ["SURECLOSE-NSC", 142.21, 134.16, 134.16],
    ["SS-BH10075-B", 5.1, 4.48, 4.48], ["ZF-BBH-L", 18.46, 15.69, 15.69], ["ZF-BBH-R", 18.46, 15.69, 15.69], ["CB-HINGE-B-2PK", 8.22, 7.56, 7.56],
    ["LL-DL", 65.12, 65.12, 65.12], ["LL-DL-KA", 66.07, 66.07, 66.07], ["LL-DL-W", 73.89, 73.89, 73.89],
    ["LLAA", 27.79, 27.79, 27.79], ["LLAA-W", 33.27, 33.27, 33.27], ["LLB", 19.36, 19.36, 19.36],
    ["T-L", 18.69, 18.69, 18.69], ["ML-TL-W", 51.87, 51.87, 51.87], ["QB124", 45, 45, 45], ["LB-PL", 72.42, 72.42, 72.42],
    ["ZF-DB400-B", 9.26, 8.42, 7.8], ["SS-0300DB-B", 3.95, 3.95, 3.95], ["SS-0300DB-ZP", 5.1, 4.08, 4.08],
    ["SS-DL-B", 8.62, 7.54, 6.45], ["MR-FMLSL", 36.4, 33.49, 30.94], ["LL-GH", 5.9, 5.9, 5.9],
    ["SS-GS", 7.02, 7.02, 7.02], ["SS-GS-SLIMLINE", 3.02, 2.74, 2.74], ["KF-AH-AT-W", 49.4, 49.4, 49.4],
    ["TC-H-AT-2L-W", 31.78, 31.78, 31.78], ["TC-H-AT-HD-2L-W", 54.05, 54.05, 54.05],
    ["XPSG-3000-TRACK-ST", 26.52, 24.29, 22.53], ["XPSG-6000-TRACK-ST", 50.44, 46.46, 44.52], ["XPSG-6000-TRACK-AL", 54.08, 51.91, 49.75],
    ["XPSG-ANCHOR", 0.72, 0.64, 0.58], ["XPSG-CATCH-F", 27.37, 24.65, 24.65], ["XPSG-CATCH-U", 13.88, 12.5, 12.5],
    ["XPSG-FILO-400", 726.55, 661.17, 661.17], ["XPSG-FILO-400PRO-SP", 847.85, 771.54, 771.54], ["XPSG-FILO-BATTERY", 189.22, 172.19, 172.19],
    ["XPSG-FILO-RACK", 25.48, 21.93, 21.93], ["XPSG-FILO-REMOTE", 59.03, 53.73, 53.73], ["XPSG-FILO-SOLAR", 758.16, 671.54, 671.54],
    ["XPSG-FILO-WKP", 199.32, 181.38, 181.38], ["XPSG-GUIDE", 38.69, 35.06, 35.06], ["XPSG-STOP", 18.2, 15.64, 15.64],
    ["XPSG-TOPROLL-2PK", 37.96, 34.15, 34.15], ["XPSG-WHEEL", 21.53, 19.38, 19.38], ["XPSG-WHEEL-CS", 6, 5.4, 5.4],
    ["QSG-S-WHEEL", 21.53, 19.38, 19.38], ["QSG-S-WHEEL-CS-2PK", 6, 5.4, 5.4],
    ["S-110LAG-4PK", 9.76, 8.96, 8.29], ["S-120ROD-4PK", 6.77, 6.23, 5.75], ["SOUD-CA1400", 19.61, 18.64, 18.64],
    ["SOUD-GUN", 31.1, 29.55, 29.55], ["SOUD-EPOFIX", 8.42, 8.01, 8.01], ["FB-V60", 12.24, 11.12, 11.12],
    ["ULTRALOC-3242", 12.92, 12.92, 12.92], ["DB-PH3", 1.56, 1.56, 1.56], ["DB-SQ3.4", 1.5, 1.5, 1.5],
    ["SS-POSTPLUG-4PK", 1.56, 1.34, 1.34], ["SS-POSTPLUG-4PK-MN", 1.56, 1.56, 1.56], ["SS-POSTPLUG-4PK-W", 1.56, 1.34, 1.34],
    ["REV-CD-2S", 239.2, 239.2, 239.2], ["REV-STAND", 251.59, 226.43, 226.43], ["REV-TEMPLATE", 36.49, 32.83, 32.83],
    ["REV-LEVEL", 11.2, 10.09, 10.09], ["REV-GUARD", 31.45, 28.3, 28.3], ["REV-BASE", 80.36, 72.33, 72.33],
    ["REV-BIT-08", 11.87, 10.4, 10.4], ["REV-BIT-10", 13.86, 11.44, 11.44], ["REV-BIT-12", 16.45, 13.52, 13.52],
    ["REV-BIT-14", 18.94, 15.6, 15.6], ["REV-BIT-20", 35.38, 31.2, 31.2], ["REV-BIT-42", 40.68, 36.4, 36.4],
    ["REV-BIT-53", 58.81, 50.96, 50.96], ["REV-BIT-63", 64.69, 58.24, 58.24], ["REV-BIT-76", 73.99, 67.6, 67.6],
    ["REV-BIT-83", 81.46, 71.76, 71.76], ["REV-BIT-89", 85.3, 76.96, 76.96],
  ].flatMap(([sku, t1, t2, t3]) => pricing(String(sku), Number(t1), Number(t2), Number(t3))),
  ...["B", "BS", "D", "G", "MN", "P", "PB", "S", "SM", "W"].flatMap((c) => pricing(`XP-6000-135-${c}`, 42.63, 42.63, 42.63)),
  ...pricing("XP-6000-135-M", 34.87, 34.87, 34.87),
  ...pricing("AW-5800-135-KWI", 65.73, 65.73, 65.73), ...pricing("AW-5800-135-WRC", 65.73, 65.73, 65.73),
  ...pricing("AW-5800-S65-KWI", 50.49, 47.96, 45.96), ...pricing("AW-5800-S65-WRC", 50.49, 47.96, 45.96),
  ...pricing("AWQS-5800-S90-WRC", 64.72, 60.84, 56.95),
  ...pricing("AWQS-5800-SF-KWI", 35.21, 33.11, 30.99), ...pricing("AWQS-5800-SF-WRC", 35.21, 33.11, 30.99),
  ...pricing("AWQS-5800-CFC-KWI", 19.82, 18.65, 17.45), ...pricing("AWQS-5800-CFC-WRC", 19.82, 18.65, 17.45),
  ...pricing("AWQS-5800-F-KWI", 42.11, 40.02, 37.9), ...pricing("AWQS-5800-F-WRC", 42.11, 40.02, 37.9),
  ...pricing("AW-5800-CSR-KWI", 51.59, 48.5, 45.4), ...pricing("AW-5800-CSR-WRC", 51.59, 48.5, 45.4),
  ...pricing("AW-2400-FP-KWI", 50.91, 48.61, 45.53), ...pricing("AW-2400-FP-WRC", 50.91, 48.61, 45.53),
  ...pricing("AW-2400-65HD-KWI", 84.24, 78.11, 74.02), ...pricing("AW-2400-65HD-WRC", 84.24, 78.11, 74.02),
  ...pricing("AW-5800-FP-KWI", 109.67, 102.01, 95.41), ...pricing("AW-5800-FP-WRC", 109.67, 102.01, 95.41),
  ...pricing("AW-5800-65HD-KWI", 187.14, 175.37, 166.01), ...pricing("AW-5800-65HD-WRC", 187.14, 175.37, 166.01),
  ...pricing("AW-TP-TR", 1.82, 1.71, 1.52), ...pricing("AW-BTP-TR", 5.94, 5.53, 4.75),
  ...pricing("AW-65TP-TR", 3.52, 3.28, 2.82), ...pricing("AW-BP-SET-TR", 12.01, 11.17, 9.6),
  ...pricing("AW-65BP-SET-TR", 10.3, 9.59, 8.24), ...pricing("AW-DC-2P-TR", 5.25, 4.68, 4.2),
  ...pricing("AW-65DC-2P-TR", 5.51, 4.95, 4.41), ...pricing("AW-DR-TR", 3.52, 3.28, 2.82),
  ...pricing("AW-65DR-TR", 4.73, 4.41, 3.79),
];

// ─── Context factories ────────────────────────────────────────────────────────

/** Builds a CalcContext from the synthetic fallback data. Used when no ctx is provided (e.g. offline tests). */
function makeDefaultCalcContext(): CalcContext {
  return {
    components: [...syntheticComponents],
    pricingRules: [...syntheticPricingRules],
    configs: new Map(Object.entries(BASE_CONFIGS)),
    resolveInternalSku: makeInternalSkuResolver([...syntheticComponents]),
  };
}

/** Builds a CalcContext from DB-loaded data merged with synthetic fallbacks. */
export function makeCalcContext(opts: {
  dbComponents: SeedComponent[];
  dbPricingRules: LocalPricingRule[];
  configs: Map<string, import("./config/types.ts").CalculatorConfig>;
}): CalcContext {
  const components = [...opts.dbComponents, ...syntheticComponents];
  const pricingRules = [...opts.dbPricingRules, ...syntheticPricingRules];
  return {
    components,
    pricingRules,
    configs: opts.configs,
    resolveInternalSku: makeInternalSkuResolver(components),
  };
}

// ─── initEngineData (deprecated compat shim) ──────────────────────────────────
// Previously used by index.ts to set module-level globals. Now index.ts should
// call makeCalcContext() and pass the result to calculateLocalBom(). Kept here
// so existing callers compile without changes.

/** @deprecated Use makeCalcContext() and pass ctx to calculateLocalBom() instead. */
export function initEngineData(
  _dbComponents: SeedComponent[],
  _dbPricingRules: LocalPricingRule[],
): void {
  // No-op: the module-level globals have been removed. Callers should use the ctx pattern.
}

// ─── Component and pricing lookups (ctx-based) ────────────────────────────────

export function getComponent(sku: string, components?: SeedComponent[]): SeedComponent | undefined {
  return (components ?? syntheticComponents).find((c) => c.sku === sku);
}

function matchesPriceRule(rule: string | null | undefined, qty: number): boolean {
  if (!rule) return true;
  const m = rule.replace(/\s+/g, " ").trim().toLowerCase().match(/^qty\s*(>=|>|<=|<|==|=)\s*(\d+(?:\.\d+)?)$/);
  if (!m) return false;
  const op = m[1], threshold = Number(m[2]);
  return op === ">=" ? qty >= threshold : op === ">" ? qty > threshold : op === "<=" ? qty <= threshold : op === "<" ? qty < threshold : qty === threshold;
}

export function priceForSku(sku: string, qty: number, tier: PricingTier, pricingRules?: LocalPricingRule[], components?: SeedComponent[]): number {
  const rules = pricingRules ?? syntheticPricingRules;
  const comps = components ?? syntheticComponents;
  const explicitRules = rules.filter((r) => r.sku === sku && r.rule != null).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const exMatch = explicitRules.find((r) => matchesPriceRule(r.rule, qty));
  if (exMatch) return exMatch.price;
  const tierRules = rules.filter((r) => r.sku === sku && r.tier_code === tier && !r.rule).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (tierRules.length > 0) return tierRules[0].price;
  const t1 = rules.find((r) => r.sku === sku && r.tier_code === "tier1" && !r.rule);
  return t1?.price ?? getComponent(sku, comps)?.default_price ?? 0;
}

// ─── BOM metadata ─────────────────────────────────────────────────────────────

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  slat: "screening", gate: "screening", rail: "frames_and_covers", rail_insert: "frames_and_covers",
  side_frame: "frames_and_covers", cfc_cover: "frames_and_covers", centre_support_rail: "frames_and_covers",
  f_section: "frames_and_covers", gate_side_frame: "gate_components", joiner_block: "gate_components",
  hardware: "gate_hardware", automation: "automation", post: "posts_and_mounting",
  post_accessory: "posts_and_mounting", bracket: "frames_and_covers", screw: "fasteners_and_screws",
  accessory: "tools_and_consumables", mounting: "fixings",
};
const SUBCATEGORY_MAP: Record<string, string> = {
  slat: "slats", gate: "gate_blades", rail: "rails", rail_insert: "rail_inserts",
  side_frame: "side_frames", cfc_cover: "cover_strips", centre_support_rail: "centre_support_rails",
  f_section: "f_sections", gate_side_frame: "gate_side_frames", joiner_block: "joiner_blocks",
  hardware: "hinges_latches_and_hardware", automation: "automation", post: "posts",
  post_accessory: "post_mounting_accessories", bracket: "brackets", screw: "screws",
  mounting: "grout_concrete_and_anchors", accessory: "tools_and_consumables",
};
const CATEGORY_NAME_OVERRIDES: Array<[RegExp, string]> = [
  [/spacer/i, "spacers"], [/screw|anchor|wafer|tek|csk/i, "fasteners_and_screws"], [/cap|plug/i, "caps_and_plugs"],
  [/grout|rapid|concrete|silicone|threadlocker|epoxy|soud/i, "fixings"],
  [/wheel|track|catch|guide|roller|stop/i, "sliding_gate_running_gear"], [/motor|remote|keypad|solar|battery|rack/i, "automation"],
  [/hinge|latch|lock/i, "gate_hardware"],
];
const SUBCATEGORY_NAME_OVERRIDES: Array<[RegExp, string]> = [
  [/spacer/i, "slat_spacers"], [/cap/i, "caps"], [/plug/i, "plugs"], [/grout|rapid|concrete/i, "concrete_and_grout"],
  [/silicone|threadlocker|epoxy|chemical/i, "adhesives_and_chemicals"], [/wheel/i, "wheels"],
  [/track|anchor/i, "tracks_and_anchors"], [/catch|guide|roller|stop/i, "guides_catches_and_stops"],
  [/hinge/i, "hinges"], [/latch|lock/i, "latches_and_locks"], [/screw|wafer|tek|csk/i, "screws"],
];
const SORT_PRIORITY_BY_SUBCATEGORY: Record<string, number> = {
  slats: 10, gate_blades: 12, side_frames: 10, gate_side_frames: 12, rails: 20, rail_inserts: 25,
  cover_strips: 30, f_sections: 35, centre_support_rails: 40, joiner_blocks: 10, hinges: 10,
  latches_and_locks: 20, slat_spacers: 10, screws: 20, caps: 10, plugs: 20,
  concrete_and_grout: 10, adhesives_and_chemicals: 20,
};
const COMPANION_OVERRIDES: Array<[RegExp, string]> = [
  [/^QS-5800-CFC-/, "QS-5800-SF"], [/^AWQS-5800-CFC-/, "AWQS-5800-SF"], [/^QS-SFC-/, "QS-5800-SF"],
  [/^QSG-4200-GSF50-/, "QSG-4800-RAIL"], [/^QSG-4800-(INF|CINF)-/, "QSG-4800-RAIL"],
  [/^QSG-4200-COVER-/, "QSG-4800-RAIL"], [/^QSG-JOINER(65|90)-/, "QSG-4800-RAIL"],
  [/^XP-CSRC-/, "XP-5800-CSR"], [/^XP-BTP-/, "XP-5800-CSR"], [/^XPSG-ANCHOR$/, "XPSG-TRACK"],
];

function bomCategoryForSku(sku: string, fallbackCategory: string, components: SeedComponent[]): string {
  const comp = getComponent(sku, components);
  const meta = comp?.metadata?.bomCategory;
  if (typeof meta === "string") return meta;
  const haystack = `${sku} ${comp?.name ?? ""} ${comp?.description ?? ""}`;
  const ov = CATEGORY_NAME_OVERRIDES.find(([p]) => p.test(haystack));
  if (ov) return ov[1];
  return LEGACY_CATEGORY_MAP[fallbackCategory] ?? "tools_and_consumables";
}

function bomSubCategoryForSku(sku: string, fallbackCategory: string, components: SeedComponent[]): string {
  const comp = getComponent(sku, components);
  if (typeof comp?.subCategory === "string") return comp.subCategory;
  if (typeof comp?.metadata?.subCategory === "string") return comp.metadata.subCategory as string;
  const haystack = `${sku} ${comp?.name ?? ""} ${comp?.description ?? ""}`;
  const ov = SUBCATEGORY_NAME_OVERRIDES.find(([p]) => p.test(haystack));
  if (ov) return ov[1];
  return SUBCATEGORY_MAP[fallbackCategory] ?? fallbackCategory;
}

function bomSortPriorityForSku(sku: string, fallbackCategory: string, components: SeedComponent[]): number {
  const comp = getComponent(sku, components);
  if (typeof comp?.sortPriority === "number") return comp.sortPriority;
  if (typeof comp?.metadata?.sortPriority === "number") return comp.metadata.sortPriority as number;
  return SORT_PRIORITY_BY_SUBCATEGORY[bomSubCategoryForSku(sku, fallbackCategory, components)] ?? 50;
}

function companionOfForSku(sku: string, components: SeedComponent[]): string | undefined {
  const comp = getComponent(sku, components);
  if (typeof comp?.companionOf === "string") return comp.companionOf;
  if (typeof comp?.metadata?.companionOf === "string") return comp.metadata.companionOf as string;
  return COMPANION_OVERRIDES.find(([p]) => p.test(sku))?.[1];
}

function withBomMetadata(item: BOMLineItem & { category: string }, components: SeedComponent[]): BOMLineItem {
  return {
    ...item,
    category: bomCategoryForSku(item.sku, item.category, components),
    subCategory: item.subCategory ?? bomSubCategoryForSku(item.sku, item.category, components),
    companionOf: item.companionOf ?? companionOfForSku(item.sku, components),
    sortPriority: item.sortPriority ?? bomSortPriorityForSku(item.sku, item.category, components),
  };
}

// ─── Economy slat pack rule ───────────────────────────────────────────────────

const ECONOMY_SLAT_PACK_SIZE = 96;
function isEconomySlatSku(sku: string): boolean { return sku.startsWith("XP-6500-E65"); }

function applyEconomySlatPackRule(line: QtyLine): QtyLine {
  if (!isEconomySlatSku(line.sku)) return line;
  const needed = Math.ceil(line.quantity);
  if (needed <= 0) return line;
  const packs = Math.ceil(needed / ECONOMY_SLAT_PACK_SIZE), ordered = packs * ECONOMY_SLAT_PACK_SIZE;
  const waste = (ordered - needed) / Math.max(1, needed);
  const switchNote = waste > 0.5 ? ` Buying ${ordered} economy slats but only need ${needed}. Switch to Standard slats?` : "";
  return { ...line, quantity: packs, unit: "pack", notes: `${line.notes ? `${line.notes}; ` : ""}Sold in packs of 96 only.${switchNote}` };
}

function priceQtyLine(line: QtyLine, tier: PricingTier, pricingRules: LocalPricingRule[], components: SeedComponent[]): number {
  if (isEconomySlatSku(line.sku) && line.unit === "pack") {
    return roundMoney(priceForSku(line.sku, line.quantity * ECONOMY_SLAT_PACK_SIZE, tier, pricingRules, components) * ECONOMY_SLAT_PACK_SIZE);
  }
  return priceForSku(line.sku, line.quantity, tier, pricingRules, components);
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

function mergeSources(sources: BOMSource[]): BOMSource[] {
  const merged = new Map<string, BOMSource>();
  for (const s of sources) {
    const key = `${s.scopeKind}|${s.scopeId}|${s.scopeLabel}`;
    const ex = merged.get(key);
    if (ex) ex.qty += s.qty; else merged.set(key, { ...s });
  }
  return [...merged.values()];
}

function describeSku(sku: string, fallbackCategory: string, components: SeedComponent[]): string {
  const comp = getComponent(sku, components);
  const parts = sku.split("-"), colourCode = parts[parts.length - 1] ?? "";
  const colourSuffix = COLOUR_NAMES[colourCode] ? ` - ${COLOUR_NAMES[colourCode]}` : "";
  if (sku.startsWith("XP-6500-E65-")) return `65mm Economy slat, no centre web, 6500mm stock${colourSuffix}`;
  if (sku === "CUSTOM-ANGLE-CORNER") return "Custom angle corner - supplier verification required";
  const desc = comp?.description ?? comp?.name ?? `${fallbackCategory} - ${sku}`;
  return colourSuffix && COLOUR_NAMES[colourCode] && !desc.toLowerCase().includes(COLOUR_NAMES[colourCode].toLowerCase()) ? `${desc}${colourSuffix}` : desc;
}

function sourceForLine(line: QtyLine, scopeBySegmentId: Map<string, ScopeInfo>): BOMSource {
  const scope = scopeBySegmentId.get(line.segmentId) ?? { scopeKind: "fence_run" as const, scopeId: line.runId, scopeLabel: "Fence run" };
  return { scopeKind: scope.scopeKind, scopeId: scope.scopeId, scopeLabel: scope.scopeLabel, qty: line.quantity };
}

function toBomLine(line: QtyLine, sources: BOMSource[], productCode: string | undefined, tier: PricingTier, pricingRules: LocalPricingRule[], components: SeedComponent[]): BOMLineItem {
  const sourcedQty = sources.reduce((sum, s) => sum + s.qty, 0);
  const pricedLine = applyEconomySlatPackRule({ ...line, quantity: sourcedQty });
  const unitPrice = priceQtyLine(pricedLine, tier, pricingRules, components);
  const comp = getComponent(line.sku, components);
  return withBomMetadata({
    category: line.category, sku: line.sku,
    description: describeSku(line.sku, line.category, components),
    quantity: pricedLine.quantity, totalQty: pricedLine.quantity, sources: mergeSources(sources),
    unit: (pricedLine.unit ?? comp?.unit ?? "each") as BOMUnit,
    unitPrice, lineTotal: roundMoney(unitPrice * pricedLine.quantity),
    notes: line.notes, runId: line.runId, segmentId: line.segmentId, productCode,
  }, components);
}

function aggregateBomLinesWithSources(
  lines: QtyLine[], scopeBySegmentId: Map<string, ScopeInfo>,
  keyForLine: (line: QtyLine) => string,
  tier: PricingTier, pricingRules: LocalPricingRule[], components: SeedComponent[],
): BOMLineItem[] {
  const agg = new Map<string, { line: QtyLine; sources: BOMSource[]; productCodes: Set<string>; notes: Set<string> }>();
  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) continue;
    const pl = applyEconomySlatPackRule(line), key = keyForLine(pl);
    const existing = agg.get(key);
    const source = sourceForLine(pl, scopeBySegmentId);
    const pc = scopeBySegmentId.get(line.segmentId)?.productCode;
    if (existing) {
      existing.sources.push(source); if (pc) existing.productCodes.add(pc); if (pl.notes) existing.notes.add(pl.notes);
    } else {
      agg.set(key, { line: { ...pl }, sources: [source], productCodes: new Set(pc ? [pc] : []), notes: new Set(pl.notes ? [pl.notes] : []) });
    }
  }
  return [...agg.values()].map(({ line, sources, productCodes, notes }) =>
    toBomLine({ ...line, notes: notes.size ? [...notes].join("; ") : line.notes }, sources, productCodes.size === 1 ? [...productCodes][0] : undefined, tier, pricingRules, components)
  );
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function calculateLocalBom(
  payload: CanonicalPayload,
  pricingTier: PricingTier = "tier1",
  ctx?: CalcContext,
): LocalBomResult {
  const resolvedCtx = ctx ?? makeDefaultCalcContext();
  const warnings: string[] = [], errors: string[] = [], assumptions: string[] = [], computed: LocalBomResult["computed"] = {};
  const scopeBySegmentId = new Map<string, ScopeInfo>();
  const sink = { warnings, computed };

  payload.runs.forEach((run, runIndex) => {
    let gateIndex = 0;
    run.segments.forEach((segment) => {
      if (segment.segmentKind === "gate_opening") {
        gateIndex += 1;
        scopeBySegmentId.set(segment.segmentId, { scopeKind: "gate", scopeId: segment.segmentId, scopeLabel: `R${runIndex + 1} G${gateIndex}`, productCode: "QS_GATE" });
        return;
      }
      scopeBySegmentId.set(segment.segmentId, { scopeKind: "fence_run", scopeId: run.runId, scopeLabel: `Run ${runIndex + 1}`, productCode: run.productCode });
    });
  });

  // Per-run: call the registered calculator, then resolve internal → supplier SKUs
  const runResults = payload.runs.map((run, index) => {
    const calc = calculatorFor(run.productCode);
    const internalLines = calc(resolvedCtx, run, payload, sink);
    // Resolve internal SKUs → supplier SKUs before aggregation
    const resolvedLines = internalLines.map((line) => ({ ...line, sku: resolvedCtx.resolveInternalSku(line.sku) }));
    return { runId: run.runId, label: `Run ${index + 1} - ${run.productCode}`, productCode: run.productCode, items: resolvedLines };
  });

  const { pricingRules, components } = resolvedCtx;
  const lines = aggregateBomLinesWithSources(
    runResults.flatMap((r) => r.items), scopeBySegmentId,
    (l) => `${l.sku}__${l.unit ?? getComponent(l.sku, components)?.unit ?? "each"}`,
    pricingTier, pricingRules, components,
  );
  lines.forEach((l) => { if (l.unitPrice === 0) assumptions.push(`No local price found for SKU ${l.sku}.`); });
  const pricedRunResults = runResults.map((run) => ({
    runId: run.runId,
    items: aggregateBomLinesWithSources(run.items, scopeBySegmentId, (l) => `${l.sku}__${l.runId}`, pricingTier, pricingRules, components),
  }));
  const subtotal = roundMoney(lines.reduce((s, l) => s + l.lineTotal, 0));
  const gst = roundMoney(subtotal * 0.1), grandTotal = roundMoney(subtotal + gst);
  const gateItems = lines.filter((l) => l.sources?.some((s) => s.scopeKind === "gate"));
  return { lines, runResults: pricedRunResults, gateItems, totals: { subtotal, gst, grandTotal }, warnings, errors, assumptions, computed, pricingTier, generatedAt: new Date().toISOString() };
}

// ─── Suggested accessories ────────────────────────────────────────────────────

export function maxPanelWidthForSystem(productCode: string | null | undefined): number {
  const map: Record<string, number> = { QSHS: 2600, VS: 2600, XPL: 2600, BAYG: 3000 };
  return productCode ? (map[productCode] ?? 2600) : 2600;
}

const POST_COLOURS = new Set(["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"]);
const CSR_PLATE_COLOURS = new Set(["B", "BS", "D", "G", "M", "MN", "S", "SM", "W"]);
const LIGHT_POST_PLUG_COLOURS = new Set(["W", "SM", "P", "PB", "S"]);
const MONUMENT_POST_PLUG_COLOURS = new Set(["MN", "BS", "D", "G", "M"]);
const DIAMOND_REVOLUTION_KIT_SKUS = ["REV-CD-2S", "REV-STAND", "REV-TEMPLATE", "REV-LEVEL", "REV-GUARD", "REV-BASE", "REV-BIT-08", "REV-BIT-10", "REV-BIT-12", "REV-BIT-14", "REV-BIT-20", "REV-BIT-42", "REV-BIT-53", "REV-BIT-63", "REV-BIT-76", "REV-BIT-83", "REV-BIT-89"] as const;

function postColourFromVars(vars: Record<string, unknown>): string {
  const explicit = String(vars.post_colour_code ?? "");
  if (POST_COLOURS.has(explicit)) return explicit;
  const fence = String(vars.colour_code ?? vars.colour ?? "B");
  return POST_COLOURS.has(fence) ? fence : "MN";
}

function csrPlateSku(vars: Record<string, unknown>, components: SeedComponent[]): string {
  const ff = String(vars.finish_family ?? "standard"), fc = String(vars.colour_code ?? vars.colour ?? "B"), pc = postColourFromVars(vars);
  if (ff === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(fc)) return "AW-BTP-TR";
  return `XP-BTP-${CSR_PLATE_COLOURS.has(pc) ? pc : "MN"}`;
}

function accCsrSku(vars: Record<string, unknown>): string {
  const ff = String(vars.finish_family ?? "standard"), fc = String(vars.colour_code ?? vars.colour ?? "B"), pc = postColourFromVars(vars);
  if (ff === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(fc)) return `AW-5800-CSR-${fc}`;
  return `XP-5800-CSR-${pc}`;
}

function accCsrCapSku(vars: Record<string, unknown>): string {
  const pc = postColourFromVars(vars);
  return `XP-CSRC-${CSR_PLATE_COLOURS.has(pc) ? pc : "MN"}`;
}

function postPlugSku(vars: Record<string, unknown>): string {
  const c = postColourFromVars(vars);
  if (c === "B") return "SS-POSTPLUG-4PK";
  if (c === "W") return "SS-POSTPLUG-4PK-W";
  if (c === "MN") return "SS-POSTPLUG-4PK-MN";
  if (LIGHT_POST_PLUG_COLOURS.has(c)) return "SS-POSTPLUG-4PK-W";
  if (MONUMENT_POST_PLUG_COLOURS.has(c)) return "SS-POSTPLUG-4PK-MN";
  return "SS-POSTPLUG-4PK";
}

function postCountForRun(run: CanonicalRun): number {
  const runVars = run.variables ?? {};
  const baseMaxPanel = clampPostSpacing(runVars.max_panel_width_mm, maxPanelWidthForSystem(run.productCode));
  const internal = run.segments.filter((s) => s.segmentKind !== "gate_opening").reduce((sum, seg) => {
    const maxP = clampPostSpacing(seg.variables?.max_panel_width_mm, baseMaxPanel);
    return sum + Math.max(0, Math.max(1, Math.ceil(Number(seg.segmentWidthMm ?? 0) / maxP)) - 1);
  }, 0);
  return internal + (run.leftBoundary?.type === "product_post" ? 1 : 0) + (run.rightBoundary?.type === "product_post" ? 1 : 0) + (run.corners?.length ?? 0);
}

function componentSuggestion(sku: string, quantity: number, category: SuggestedAccessory["category"], reason: string, fallbackDesc: string, components: SeedComponent[]): SuggestedAccessory {
  const comp = getComponent(sku, components);
  return { id: `suggested-${sku}`, sku, description: comp?.description ?? comp?.name ?? fallbackDesc, quantity: Math.max(1, Math.ceil(quantity)), unitPrice: comp?.default_price ?? 0, category, reason, priced: typeof comp?.default_price === "number" && comp.default_price > 0 };
}

export function suggestAccessories(payload: CanonicalPayload, bomLines: BOMLineItem[], tier: PricingTier, ctx?: CalcContext): SuggestedAccessory[] {
  const components = ctx?.components ?? syntheticComponents;
  const pricingRules = ctx?.pricingRules ?? syntheticPricingRules;
  const suggestions: SuggestedAccessory[] = [];
  const bomSkus = new Set(bomLines.map((l) => l.sku));
  const suggest = (sku: string, qty: number, cat: SuggestedAccessory["category"], reason: string, desc: string) =>
    componentSuggestion(sku, qty, cat, reason, desc, components);

  for (const run of payload.runs) {
    const vars: Record<string, unknown> = { ...payload.variables, ...(run.variables ?? {}) };
    const postCount = postCountForRun(run);
    const mountingType = String(vars.mounting_type ?? vars.mounting_method ?? "in_ground");
    const postSize = Number(vars.post_size ?? 50), postColour = postColourFromVars(vars);
    const finishFamily = String(vars.finish_family ?? "standard");
    const firstFenceSeg = run.segments.find((s) => s.segmentKind !== "gate_opening");
    const postHeight = Number(firstFenceSeg?.targetHeightMm ?? vars.target_height_mm ?? 1800);
    const gateCount = run.segments.filter((s) => s.segmentKind === "gate_opening").length;

    if (gateCount > 0) suggestions.push(suggest("LL-GH", gateCount, "catalogue_gap", "Optional D&D black polymer side-fixing gate handle, suggested once per gate.", "D&D black polymer side-fixing gate handle"));
    if (postCount <= 0) continue;

    if (mountingType === "core_drill") {
      const dressRingSku = postSize === 65 ? `XP-65DR-${postColour}` : `XP-DR-${postColour}`;
      if (!bomSkus.has(dressRingSku)) suggestions.push(suggest(dressRingSku, postCount, "post_accessory", "Dress rings suit core-drilled posts.", "Core-drill dress ring"));
      suggestions.push(suggest(postPlugSku(vars), Math.ceil(postCount / 4), "post_accessory", "Post plugs cap fixing-hole posts.", "32mm OD post plug 4 pack"));
      suggestions.push(suggest("SOUD-EPOFIX", 1, "fixing", "Epoxy option for core-drilled post fixing.", "Soudal Epofix epoxy"));
      if (postCount > 5) {
        const kitTotal = DIAMOND_REVOLUTION_KIT_SKUS.reduce((sum, sku) => sum + priceForSku(sku, 1, tier, pricingRules, components), 0);
        const kitReason = kitTotal > 0 ? `Need a core drill? Full Diamond Revolution kit totals about $${kitTotal.toFixed(2)} ex-GST.` : "Need a core drill? We sell a full Diamond Revolution kit for larger core-drilled jobs.";
        for (const sku of DIAMOND_REVOLUTION_KIT_SKUS) suggestions.push(suggest(sku, 1, "catalogue_gap", kitReason, "Diamond Revolution core drilling kit item"));
      }
    }

    if (mountingType === "base_plate") {
      const bpSku = postSize === 65 ? `XP-65BP-SET-${postColour}` : `XP-BP-SET-${postColour}`;
      const coverSku = postSize === 65 ? `XP-65DC-2P-${postColour}` : `XP-DC-2P-${postColour}`;
      if (!bomSkus.has(bpSku)) suggestions.push(suggest(bpSku, postCount, "post_accessory", "Base plate sets suit base-plate-mounted posts.", "Base plate set"));
      if (!bomSkus.has(coverSku)) suggestions.push(suggest(coverSku, postCount, "post_accessory", "Cover rings tidy up base-plate-mounted posts.", "Base plate cover ring"));
      suggestions.push(suggest(postPlugSku(vars), Math.ceil(postCount / 4), "post_accessory", "Post plugs cap fixing-hole posts.", "32mm OD post plug 4 pack"));
      suggestions.push(suggest("ULTRALOC-3242", 1, "fixing", "Threadlocker for base-plate mounting fixings.", "Ultraloc 3242 threadlocker"));
      if (String(vars.base_plate_substrate ?? "concrete") === "concrete") suggestions.push(suggest("SOUD-CA1400", postCount, "fixing", "For damp or soft concrete; provides pressure-free anchor fixing.", "Soudafix chemical anchor"));
    }

    if (finishFamily !== "alumawood") {
      const longPostSku = postSize === 65 ? `XP-6000-65HD-${postColour}` : `XP-6000-FP-${postColour}`;
      const cutLengthMm = mountingType === "in_ground" && postHeight <= 1200 ? 1800 : Math.min(6000, Math.max(1, postHeight));
      suggestions.push(suggest(longPostSku, Math.ceil((postCount * cutLengthMm) / 6000), "catalogue_gap", "Optional: full-length post stock if the installer wants to cut posts on site.", "Full-length post stock"));
    }

    const baseMaxPanel = clampPostSpacing(vars.max_panel_width_mm, maxPanelWidthForSystem(run.productCode));
    const panelCounts = run.segments.filter((s) => s.segmentKind !== "gate_opening").map((seg) => {
      const maxP = clampPostSpacing(seg.variables?.max_panel_width_mm, baseMaxPanel);
      const w = Number(seg.segmentWidthMm ?? 0), panels = w > 0 ? Math.max(1, Math.ceil(w / maxP)) : 0;
      return { panels, panelWidthMm: panels > 0 ? w / panels : 0 };
    });

    if (run.productCode === "VS") {
      const vertPanelCount = panelCounts.reduce((s, i) => s + i.panels, 0);
      suggestions.push(suggest("XP-FOOT-ADJ", vertPanelCount, "post_accessory", "Suggested for vertical slat panels as a 100mm adjustable support foot.", "100mm adjustable support foot"));
    } else {
      const csrPlateCount = panelCounts.reduce((s, i) => {
        const n = i.panelWidthMm < 2000 ? 0 : i.panelWidthMm < 4000 ? 1 : i.panelWidthMm < 6000 ? 2 : 3;
        return s + n * i.panels * 2;
      }, 0);
      if (csrPlateCount > 0) suggestions.push(suggest(csrPlateSku(vars, components), csrPlateCount, "post_accessory", "Optional: centre support rail top/base plates.", "Centre support rail top/base plate"));
    }

    const shortSlidingGates = run.segments.filter((s) => s.segmentKind === "gate_opening" && String(s.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement] ?? "") === "sliding" && Number(s.segmentWidthMm ?? 0) <= 3000);
    if (shortSlidingGates.length > 0) {
      suggestions.push(suggest(accCsrSku(vars), shortSlidingGates.length, "catalogue_gap", "Optional: centre support rail for sliding gates at or under 3000mm.", "Optional sliding gate centre support rail"));
      suggestions.push(suggest(accCsrCapSku(vars), shortSlidingGates.length, "catalogue_gap", "Optional: cap to finish the sliding gate centre support rail.", "Optional centre support rail cap"));
      suggestions.push(suggest(csrPlateSku(vars, components), shortSlidingGates.length * 2, "catalogue_gap", "Optional: top and bottom plates if adding a sliding gate centre support rail.", "Optional centre support rail top/base plate"));
    }
  }

  const finishColours = new Set<string>([String(payload.variables.colour_code ?? "B"), postColourFromVars(payload.variables)]);
  for (const run of payload.runs) {
    for (const seg of run.segments) {
      if (seg.segmentKind !== "gate_opening") continue;
      const gc = String(seg.variables?.[GATE_SEGMENT_STUB_KEYS.colourCode] ?? "");
      if (gc) finishColours.add(gc);
    }
  }
  for (const colour of finishColours) suggestions.push(suggest(`PAINT-${colour}`, 1, "finish", "Suggested for colour-matched touch-ups after cutting and installation.", `Touch up paint - ${colour}`));

  if (bomSkus.has("SOUD-CA1400")) suggestions.push(suggest("SOUD-GUN", 1, "fixing", "Heavy duty cartridge gun for SOUD-CA1400.", "Soudafix cartridge gun"));
  if (bomSkus.has("QSG-JOINER65-4PK") || bomSkus.has("QSG-JOINER90-4PK")) suggestions.push(suggest("DB-PH3", 1, "fixing", "Phillips #3 driver bit suits QuickScreen gate joiner block screws.", "Phillips #3 driver bit"));
  if (bomSkus.has("AR-SCR-BR-50PK")) suggestions.push(suggest("DB-SQ3.4", 1, "fixing", "Square #3.4 driver bit suits gate rail screws.", "Square #3.4 driver bit"));
  if (payload.runs.length > 0) suggestions.push(suggest("FB-V60", 1, "fixing", "General-purpose glazing silicone for finishing and sealing on site.", "Bostik V60 glazing silicone"));

  const deduped = new Map<string, SuggestedAccessory>();
  for (const s of suggestions) {
    const key = s.sku ?? s.id; const ex = deduped.get(key);
    if (ex) deduped.set(key, { ...ex, quantity: ex.quantity + s.quantity }); else deduped.set(key, s);
  }
  return [...deduped.values()];
}

// ─── Gate hardware hints ──────────────────────────────────────────────────────

import { estimateGateWeight, rankHinges, rankLatches, gateMovementOrDefault as _gateMovementOrDefault, isWhiteHardwareFinish as _isWhiteHardwareFinish } from "./engine-utils.ts";
import type { GateHardwareHint } from "./engine-utils.ts";

export function computeGateHardwareHints(payload: CanonicalPayload): Record<string, GateHardwareHint> {
  const hints: Record<string, GateHardwareHint> = {};
  for (const run of payload.runs) {
    const mergedVars: Record<string, unknown> = { ...payload.variables, ...(run.variables ?? {}) };
    for (const segment of run.segments) {
      if (segment.segmentKind !== "gate_opening") continue;
      const vars = { ...mergedVars, ...(segment.variables ?? {}) };
      const movement = _gateMovementOrDefault(vars[GATE_SEGMENT_STUB_KEYS.gateMovement]);
      if (movement === "sliding") continue;
      const slatSize = Number(vars[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? vars.slat_size_mm ?? 65);
      const slatGap = Number(vars[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? vars.slat_gap_mm ?? 9);
      const gateHeightMm = Number(segment.targetHeightMm ?? vars[GATE_SEGMENT_STUB_KEYS.gateHeightMm] ?? mergedVars.target_height_mm ?? 1800);
      const openingWidthMm = Number(segment.segmentWidthMm ?? 900);
      const colour = String(vars[GATE_SEGMENT_STUB_KEYS.colourCode] ?? vars.colour_code ?? "B");
      const whiteFinish = _isWhiteHardwareFinish(colour);
      const finishFamily = String(vars.finish_family ?? "standard");
      const build = String(vars[GATE_SEGMENT_STUB_KEYS.gateBuild] ?? "qsg_hinged_horizontal");
      const leafCount = movement === "double_swing" ? 2 : 1;
      const leafWidthMm = Math.max(1, (openingWidthMm - 30) / leafCount);
      const weightEstimate = estimateGateWeight({ widthMm: leafWidthMm, heightMm: gateHeightMm, slatSizeMm: slatSize, slatGapMm: slatGap, finishFamily, build, movement });
      const rankedHinges = rankHinges({ requiredRatingKg: weightEstimate.requiredRatingKg, gateGapMm: 20, whiteFinish });
      const rankedLatches = rankLatches({ movement, whiteFinish });
      const recHinge = rankedHinges.find((h) => h.recommended), recLatch = rankedLatches.find((l) => l.recommended);
      hints[segment.segmentId] = { weightEstimate, rankedHinges, rankedLatches, recommendedHingeSku: recHinge?.effectiveSku, recommendedLatchSku: recLatch?.effectiveSku };
    }
  }
  return hints;
}
