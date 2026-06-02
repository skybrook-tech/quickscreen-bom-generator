// engine.ts — static BOM calculator engine for bom-calculator-static edge function

// ─── Seed data loading ────────────────────────────────────────────────────────
// Uses Deno.readTextFileSync with import.meta.url-relative paths rather than
// JSON import assertions — more compatible with Supabase's local edge runtime.

function loadSeedJson(relativePath: string): SeedFile {
  try {
    const url = new URL(relativePath, import.meta.url);
    return JSON.parse(Deno.readTextFileSync(url)) as SeedFile;
  } catch (e) {
    console.warn(`[bom-calculator-static] Failed to load seed file ${relativePath}:`, e);
    return {};
  }
}

// Defer loading so type SeedFile is defined before use (see below).
let _seedFiles: SeedFile[] | null = null;
function getSeedFiles(): SeedFile[] {
  if (_seedFiles) return _seedFiles;
  _seedFiles = [
    loadSeedJson("../../seeds/glass-outlet/products/qshs.json"),
    loadSeedJson("../../seeds/glass-outlet/products/bayg.json"),
    loadSeedJson("../../seeds/glass-outlet/products/vs.json"),
    loadSeedJson("../../seeds/glass-outlet/products/xpl.json"),
    loadSeedJson("../../seeds/glass-outlet/products/qs_gate.json"),
    loadSeedJson("../../seeds/glass-outlet/products/price_catalogue.json"),
  ];
  return _seedFiles;
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface CanonicalBoundary {
  type: "product_post" | "brick_post" | "existing_post" | "wall" | "corner_90";
}

export interface CanonicalSegment {
  segmentId: string;
  segmentKind?: "panel" | "bay_group" | "gate_opening" | "corner";
  segmentWidthMm?: number;
  targetHeightMm?: number;
  variables?: Record<string, string | number | boolean>;
}

export interface CanonicalRun {
  runId: string;
  productCode: string;
  segments: CanonicalSegment[];
  corners?: unknown[];
  leftBoundary?: CanonicalBoundary;
  rightBoundary?: CanonicalBoundary;
  variables?: Record<string, unknown>;
}

export interface CanonicalPayload {
  runs: CanonicalRun[];
  variables: Record<string, unknown>;
}

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

// ─── Seed data types ──────────────────────────────────────────────────────────

type SeedComponent = {
  sku: string;
  name?: string;
  description?: string;
  category?: string;
  subCategory?: string;
  companionOf?: string;
  sortPriority?: number;
  isOptionalAccessory?: boolean;
  optionalChildOf?: string[];
  qtyPerParent?: number;
  unit?: string;
  default_price?: number;
  system_types?: string[];
  metadata?: Record<string, unknown>;
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
  product_components?: SeedComponent[];
  pricing_rules?: LocalPricingRule[];
};

// ─── Synthetic helpers ────────────────────────────────────────────────────────

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

const syntheticComponents: SeedComponent[] = [
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
  ...pricing("QS-LB-M", 3.4, 3.17, 2.9),
  ...pricing("QS-LB-PB", 4.26, 3.95, 3.53),
  ...pricing("QS-LB-W", 4.26, 3.95, 3.53),
  ...pricing("QS-SPACER-05MM-50PK", 1.42, 1.22, 1.05),
  ...pricing("QS-SPACER-09MM-50PK", 2.63, 2.26, 1.95),
  ...pricing("QS-SPACER-12MM-50PK", 3.47, 2.98, 2.57),
  ...pricing("QS-SPACER-15MM-50PK", 4.1, 3.53, 3.03),
  ...pricing("QS-SPACER-20MM-50PK", 5.2, 4.47, 3.85),
  ...pricing("QS-SPACER-30MM-50PK", 7.3, 6.28, 5.4),
  ...pricing("XP-1800-FP-MN", 26, 26, 26),
  ...pricing("XP-1800-FP-W", 26, 26, 26),
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

let _localComponents: SeedComponent[] | null = null;
let _localPricingRules: LocalPricingRule[] | null = null;

export function getLocalComponents(): SeedComponent[] {
  if (!_localComponents) {
    _localComponents = getSeedFiles().flatMap((s) => s.product_components ?? []).concat(syntheticComponents).filter((c) => c.active !== false);
  }
  return _localComponents;
}

export function getLocalPricingRules(): LocalPricingRule[] {
  if (!_localPricingRules) {
    _localPricingRules = getSeedFiles().flatMap((s) => s.pricing_rules ?? []).concat(syntheticPricingRules).filter((r) => r.active !== false);
  }
  return _localPricingRules;
}

export function getComponent(sku: string): SeedComponent | undefined { return getLocalComponents().find((c) => c.sku === sku); }


// ─── Gate hardware ────────────────────────────────────────────────────────────

export type GateHardwareStatus = "fit" | "tight" | "fail";

export type GateWeightInput = { widthMm: number; heightMm: number; slatSizeMm: number; slatGapMm: number; finishFamily?: string; build?: string; movement?: string; };
export type GateWeightEstimate = { totalKg: number; requiredRatingKg: number; slatCount: number; slatWeightKg: number; frameWeightKg: number; hardwareAllowanceKg: number; };
export type HingeHardware = { sku: string; skuW?: string; label: string; ratingKg: number; gapMinMm: number; gapMaxMm: number; selfClose: boolean; poolSafe: boolean; hasWhite: boolean; };
export type LatchHardware = { sku: string; skuW?: string; label: string; latchType: "magna" | "lokk" | "t" | "d" | "side_pull" | "accessory" | "none"; lockable: boolean; poolSafe: boolean; swingOnly: boolean; hasWhite: boolean; };
export type RankedHardware<T> = T & { effectiveSku: string; status: GateHardwareStatus; reasons: string[]; recommended?: boolean; };
export type GateHardwareHint = { weightEstimate: GateWeightEstimate; rankedHinges: RankedHardware<HingeHardware>[]; rankedLatches: RankedHardware<LatchHardware>[]; recommendedHingeSku?: string; recommendedLatchSku?: string; };

const KG_PER_M_BY_SLAT: Record<string, number> = { "65-standard": 0.6, "65-economy": 0.55, "65-alumawood": 0.62, "90-standard": 0.85, "90-economy": 0.85, "90-alumawood": 0.88 };
const SIDE_FRAME_KG_PER_M = 1.5, RAIL_65_KG_PER_M = 1, RAIL_90_KG_PER_M = 1.4, INFILL_KG_PER_M = 0.8, COVER_KG_PER_M = 0.5, HARDWARE_ALLOWANCE_KG = 5, HINGE_SAFETY_FACTOR = 1.3;

export const HINGE_HARDWARE: HingeHardware[] = [
  { sku: "TC-H-AT-B", label: "D&D TruClose adjustable hinge", ratingKg: 30, gapMinMm: 10, gapMaxMm: 35, selfClose: true, poolSafe: true, hasWhite: false },
  { sku: "TC-H-AT-2L-B", skuW: "TC-H-AT-2L-W", label: "D&D TruClose two-leg adjustable hinge", ratingKg: 30, gapMinMm: 10, gapMaxMm: 50, selfClose: true, poolSafe: true, hasWhite: true },
  { sku: "KF-H-FT", label: "D&D Kwik Fit fixed hinge pair", ratingKg: 30, gapMinMm: 10, gapMaxMm: 35, selfClose: true, poolSafe: true, hasWhite: false },
  { sku: "KF-H-NT", label: "D&D Kwik Fit no-tension hinge pair", ratingKg: 30, gapMinMm: 10, gapMaxMm: 35, selfClose: false, poolSafe: false, hasWhite: false },
  { sku: "SS-BH10075-B", label: "Six Star 100x75 butt hinge", ratingKg: 60, gapMinMm: 8, gapMaxMm: 25, selfClose: false, poolSafe: false, hasWhite: false },
  { sku: "TC-H-AT-HD-B", label: "D&D TruClose heavy duty hinge", ratingKg: 70, gapMinMm: 10, gapMaxMm: 35, selfClose: true, poolSafe: true, hasWhite: false },
  { sku: "TC-H-AT-HD-2L-B", skuW: "TC-H-AT-HD-2L-W", label: "D&D TruClose heavy duty two-leg hinge", ratingKg: 70, gapMinMm: 10, gapMaxMm: 50, selfClose: true, poolSafe: true, hasWhite: true },
  { sku: "ZF-BBH-L", label: "Zeus ball bearing hinge", ratingKg: 80, gapMinMm: 8, gapMaxMm: 25, selfClose: false, poolSafe: false, hasWhite: false },
  { sku: "KF-AH-AT", skuW: "KF-AH-AT-W", label: "D&D Kwik Fit aluminium adjustable hinge", ratingKg: 120, gapMinMm: 15, gapMaxMm: 60, selfClose: true, poolSafe: true, hasWhite: true },
  { sku: "SURECLOSE-HH", label: "D&D SureClose hydraulic closer hinge", ratingKg: 120, gapMinMm: 10, gapMaxMm: 55, selfClose: true, poolSafe: true, hasWhite: false },
  { sku: "SURECLOSE-NSC", label: "D&D SureClose non self-closing hinge", ratingKg: 120, gapMinMm: 10, gapMaxMm: 55, selfClose: false, poolSafe: false, hasWhite: false },
  { sku: "CB-HINGE-B-2PK", label: "Colourbond hinge pair", ratingKg: 25, gapMinMm: 8, gapMaxMm: 25, selfClose: false, poolSafe: false, hasWhite: false },
];

export const LATCH_HARDWARE: LatchHardware[] = [
  { sku: "LL-DL-KA", skuW: "LL-DL-W", label: "D&D Lokk Latch Deluxe keyed alike", latchType: "lokk", lockable: true, poolSafe: false, swingOnly: true, hasWhite: true },
  { sku: "LL-DL", skuW: "LL-DL-W", label: "D&D Lokk Latch Deluxe keyed different", latchType: "lokk", lockable: true, poolSafe: false, swingOnly: true, hasWhite: true },
  { sku: "ML-TL", skuW: "ML-TL-W", label: "D&D Magna Latch top pull", latchType: "magna", lockable: true, poolSafe: true, swingOnly: true, hasWhite: true },
  { sku: "LLAA", skuW: "LLAA-W", label: "D&D Lokk Latch general purpose lockable", latchType: "lokk", lockable: true, poolSafe: false, swingOnly: true, hasWhite: true },
  { sku: "T-L", label: "D&D T-Latch padlockable", latchType: "t", lockable: true, poolSafe: false, swingOnly: true, hasWhite: false },
  { sku: "SS-DL-B", label: "Six Star D latch and striker", latchType: "d", lockable: false, poolSafe: false, swingOnly: true, hasWhite: false },
  { sku: "MR-FMLSL", label: "D&D Magna Latch side-pull latch", latchType: "side_pull", lockable: true, poolSafe: true, swingOnly: true, hasWhite: false },
  { sku: "LLB", label: "External access kit for Lokk Latch", latchType: "accessory", lockable: false, poolSafe: false, swingOnly: true, hasWhite: false },
  { sku: "none", label: "No latch", latchType: "none", lockable: false, poolSafe: false, swingOnly: true, hasWhite: true },
];

export const HARDWARE_KITS = [
  { latchSku: "ML-TL", hingeSku: "KF-H-FT", kitSku: "ML-TL-KF-H-FT", label: "Magna Latch + Kwik Fit fixed hinge kit" },
  { latchSku: "ML-TL", hingeSku: "TC-H-AT-B", kitSku: "ML-TL-TC-H-AT", label: "Magna Latch + TruClose adjustable hinge kit" },
  { latchSku: "LL-DL-W", hingeSku: "TC-H-AT-HD-2L-W", kitSku: "LLDL-TCHD-W", label: "Lokk Latch Deluxe white + TruClose HD white kit" },
] as const;

function roundOne(v: number) { return Math.round(v * 10) / 10; }

export function estimateGateWeight(input: GateWeightInput): GateWeightEstimate {
  const widthM = Math.max(0.1, input.widthMm / 1000), heightM = Math.max(0.1, input.heightMm / 1000);
  const finish = input.finishFamily === "economy" || input.finishFamily === "alumawood" ? input.finishFamily : "standard";
  const slatSize = input.slatSizeMm === 90 ? 90 : 65;
  const slatKgM = KG_PER_M_BY_SLAT[`${slatSize}-${finish}`] ?? KG_PER_M_BY_SLAT[`${slatSize}-standard`];
  const gap = Math.max(0, input.slatGapMm), vertical = String(input.build ?? "").includes("vertical");
  const slatCount = Math.max(1, vertical ? Math.ceil((input.widthMm - 86 + gap) / (slatSize + gap)) : Math.ceil((input.heightMm - 133 + gap) / (slatSize + gap)));
  const slatLengthM = vertical ? heightM : widthM;
  const slatWeightKg = slatCount * slatLengthM * slatKgM;
  const railKgM = slatSize === 90 ? RAIL_90_KG_PER_M : RAIL_65_KG_PER_M;
  const frameWeightKg = heightM * 2 * SIDE_FRAME_KG_PER_M + widthM * 2 * railKgM + heightM * 2 * INFILL_KG_PER_M + heightM * 2 * COVER_KG_PER_M;
  const totalKg = slatWeightKg + frameWeightKg + HARDWARE_ALLOWANCE_KG;
  return { totalKg: roundOne(totalKg), requiredRatingKg: Math.ceil((totalKg * HINGE_SAFETY_FACTOR) / 10) * 10, slatCount, slatWeightKg: roundOne(slatWeightKg), frameWeightKg: roundOne(frameWeightKg), hardwareAllowanceKg: HARDWARE_ALLOWANCE_KG };
}

export function baseHardwareSku(value: unknown): string {
  const sku = String(value ?? "");
  return HINGE_HARDWARE.find((i) => i.sku === sku || i.skuW === sku)?.sku ?? LATCH_HARDWARE.find((i) => i.sku === sku || i.skuW === sku)?.sku ?? sku;
}

function effectiveHardwareSku<T extends { sku: string; skuW?: string; hasWhite: boolean }>(item: T, white: boolean): string {
  return white && item.hasWhite && item.skuW ? item.skuW : item.sku;
}

export function hingeGapForSku(value: unknown): number {
  const sku = baseHardwareSku(value);
  const h = HINGE_HARDWARE.find((i) => i.sku === sku || i.skuW === sku);
  return h ? Math.round((h.gapMinMm + h.gapMaxMm) / 2) : 20;
}

export function latchGapForSku(value: unknown): number {
  const sku = baseHardwareSku(value);
  return !sku || sku === "none" ? 0 : 10;
}

export function isWhiteHardwareFinish(colour: unknown): boolean {
  const v = String(colour ?? "").toLowerCase();
  return v === "w" || v.includes("white");
}

export function isTruCloseHardware(value: unknown): boolean {
  const sku = String(value ?? "");
  return sku.includes("TC-H-AT") || sku.includes("TCHD") || sku === "ML-TL-TC-H-AT";
}

export function kitForHardwareSelection(hingeValue: unknown, latchValue: unknown) {
  const hingeSku = baseHardwareSku(hingeValue);
  const latchSku = String(latchValue ?? ""), latchBase = baseHardwareSku(latchSku);
  return HARDWARE_KITS.find((kit) => {
    const hm = kit.hingeSku === hingeSku || kit.hingeSku === String(hingeValue ?? "");
    const lm = kit.latchSku === latchBase || kit.latchSku === latchSku || (kit.latchSku === "LL-DL-W" && latchSku === "LL-DL-W");
    return hm && lm;
  });
}

function hwStatusRank(s: GateHardwareStatus) { return s === "fit" ? 0 : s === "tight" ? 1 : 2; }
function preferredHingeOrder(sku: string): number {
  const o = ["TC-H-AT-B", "TC-H-AT-2L-B", "KF-H-FT", "KF-H-NT", "TC-H-AT-HD-B", "TC-H-AT-HD-2L-B", "KF-AH-AT", "SURECLOSE-HH", "SURECLOSE-NSC"];
  const i = o.indexOf(sku); return i === -1 ? 99 : i;
}

export function rankHinges({ requiredRatingKg, gateGapMm, whiteFinish, requireSelfClosing = true }: { requiredRatingKg: number; gateGapMm: number; whiteFinish: boolean; requireSelfClosing?: boolean }): RankedHardware<HingeHardware>[] {
  const ranked = HINGE_HARDWARE.map((h) => {
    const reasons: string[] = [];
    if (h.ratingKg < requiredRatingKg) reasons.push(`Rated ${h.ratingKg}kg, needs ${requiredRatingKg}kg`);
    if (gateGapMm < h.gapMinMm || gateGapMm > h.gapMaxMm) reasons.push(`Suits ${h.gapMinMm}-${h.gapMaxMm}mm hinge gap`);
    if (requireSelfClosing && !h.selfClose) reasons.push("Not self closing");
    if (whiteFinish && !h.hasWhite) reasons.push("No white finish");
    const status: GateHardwareStatus = reasons.length > 0 ? "fail" : h.ratingKg <= requiredRatingKg + 20 ? "tight" : "fit";
    return { ...h, effectiveSku: effectiveHardwareSku(h, whiteFinish), status, reasons };
  }).sort((a, b) => { const s = hwStatusRank(a.status) - hwStatusRank(b.status); if (s !== 0) return s; const ao = Math.max(0, a.ratingKg - requiredRatingKg), bo = Math.max(0, b.ratingKg - requiredRatingKg); return ao !== bo ? ao - bo : a.label.localeCompare(b.label); });
  const rec = [...ranked].filter((h) => h.status !== "fail").sort((a, b) => a.ratingKg - b.ratingKg || preferredHingeOrder(a.sku) - preferredHingeOrder(b.sku) || a.label.localeCompare(b.label))[0];
  if (rec) rec.recommended = true;
  return ranked;
}

export function rankLatches({ movement, whiteFinish, poolSafePreferred = false }: { movement: string; whiteFinish: boolean; poolSafePreferred?: boolean }): RankedHardware<LatchHardware>[] {
  const ranked = LATCH_HARDWARE.map((l) => {
    const reasons: string[] = [];
    if (movement === "sliding" && l.swingOnly && l.sku !== "none") reasons.push("Swing gates only");
    if (whiteFinish && !l.hasWhite && l.sku !== "none") reasons.push("No white finish");
    if (poolSafePreferred && !l.poolSafe && l.sku !== "none") reasons.push("Not pool-safe");
    const status: GateHardwareStatus = reasons.length > 0 ? "fail" : "fit";
    return { ...l, effectiveSku: effectiveHardwareSku(l, whiteFinish), status, reasons };
  }).sort((a, b) => hwStatusRank(a.status) - hwStatusRank(b.status) || a.label.localeCompare(b.label));
  const rec = ranked.find((l) => l.status !== "fail" && l.sku !== "none");
  if (rec) rec.recommended = true;
  return ranked;
}

// ─── Gate option helpers ──────────────────────────────────────────────────────

export type GateMovement = "single_swing" | "double_swing" | "sliding";

export function normalizeGateMovement(value: unknown): GateMovement | undefined {
  if (typeof value !== "string") return undefined;
  const n = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["single_swing", "single_gate", "single", "swing"].includes(n)) return "single_swing";
  if (["double_swing", "double_gate", "double", "double_swing_gate"].includes(n)) return "double_swing";
  if (["sliding", "slide", "sliding_gate", "slider"].includes(n)) return "sliding";
  return undefined;
}

export function gateMovementOrDefault(value: unknown): GateMovement { return normalizeGateMovement(value) ?? "single_swing"; }

function normaliseLeafPair(leaf1Mm: number, leaf2Mm: number, clearOpeningMm: number): number[] {
  const clear = Math.max(2, Math.round(clearOpeningMm));
  const first = Math.min(clear - 1, Math.max(1, Math.round(Number(leaf1Mm) || clear / 2)));
  const secondRaw = Math.round(Number(leaf2Mm) || clear - first);
  const second = Math.min(clear - 1, Math.max(1, secondRaw));
  const total = first + second;
  if (total === clear) return [first, second];
  const adj = Math.min(clear - 1, Math.max(1, first + (clear - total)));
  return [adj, clear - adj];
}

export function gateLeafGeometry({ movement, openingWidthMm, hingeGapMm, latchGapMm, leafWidthsMm }: { movement: unknown; openingWidthMm: number; hingeGapMm: number; latchGapMm: number; leafWidthsMm?: number[] }) {
  const m = gateMovementOrDefault(movement);
  if (m === "sliding") return { movement: m, leafCount: 1, leafWidthMm: Math.max(1, openingWidthMm), leafWidthsMm: [Math.max(1, openingWidthMm)], totalClearanceMm: 0, hingeClearanceMm: 0, latchClearanceMm: 0 };
  const leafCount = m === "double_swing" ? 2 : 1;
  const hingeClearanceMm = m === "double_swing" ? hingeGapMm * 2 : hingeGapMm;
  const latchClearanceMm = latchGapMm, totalClearanceMm = hingeClearanceMm + latchClearanceMm;
  const clearOpeningMm = Math.max(1, openingWidthMm - totalClearanceMm);
  const cleaned = (leafWidthsMm ?? []).map((v) => Math.round(Number(v))).filter((v) => Number.isFinite(v) && v > 0);
  const widths = leafCount === 2 && cleaned.length >= 2 ? normaliseLeafPair(cleaned[0], cleaned[1], clearOpeningMm) : [Math.max(1, clearOpeningMm / leafCount)];
  return { movement: m, leafCount, leafWidthMm: Math.max(...widths), leafWidthsMm: widths, totalClearanceMm, hingeClearanceMm, latchClearanceMm };
}

// ─── Product option helpers ───────────────────────────────────────────────────

const SYSTEM_MAX_PANEL_WIDTH: Record<string, number> = { QSHS: 2600, VS: 2600, XPL: 2600, BAYG: 3000 };
export const MIN_POST_SPACING_MM = 100, MAX_POST_SPACING_MM = 3000;

export function maxPanelWidthForSystem(productCode: string | null | undefined): number { return productCode ? (SYSTEM_MAX_PANEL_WIDTH[productCode] ?? 2600) : 2600; }
export function clampPostSpacing(value: unknown, fallback = 2600): number {
  const s = Number(value), r = Number.isFinite(s) ? s : fallback;
  return Math.min(MAX_POST_SPACING_MM, Math.max(MIN_POST_SPACING_MM, Math.round(r)));
}
export function substrateFixingKitSku(substrate: unknown): string { return substrate === "timber" ? "S-110LAG-4PK" : "S-120ROD-4PK"; }

// ─── Segment termination ──────────────────────────────────────────────────────

export type LegacyBoundaryType = "product_post" | "brick_post" | "existing_post" | "wall" | "corner_90";
export type CornerType = "right" | "obtuse" | "custom";

export const SEGMENT_TERMINATION_KEYS = {
  leftKind: "left_termination_kind", leftCornerDegrees: "left_corner_degrees", leftCornerType: "left_corner_type",
  rightKind: "right_termination_kind", rightCornerDegrees: "right_corner_degrees", rightCornerType: "right_corner_type",
} as const;

export const GATE_SEGMENT_STUB_KEYS = {
  gateMovement: "gate_movement", gateBuild: "gate_build", leafCount: "leaf_count",
  leaf1WidthMm: "leaf_1_width_mm", leaf2WidthMm: "leaf_2_width_mm",
  matchRunHeight: "match_run_height", gateHeightMm: "gate_height_mm",
  colourCode: "colour_code", slatSizeMm: "slat_size_mm", slatGapMm: "slat_gap_mm",
  hingeType: "hinge_type", latchType: "latch_type", dropBoltType: "drop_bolt_type",
  gateStopType: "gate_stop_type", hardwareKitSku: "hardware_kit_sku",
  includeExternalAccessKit: "include_external_access_kit", includeLockBox: "include_lock_box",
  lockBoxType: "lock_box_type", useGatePostsAsFenceTermination: "use_gate_posts_as_fence_termination",
  openingDirection: "opening_direction", slidingSide: "sliding_side", hingeSide: "hinge_side",
  slidingTrackType: "sliding_track_type", slidingGuideType: "sliding_guide_type",
  slidingCatchType: "sliding_catch_type", slidingMotorType: "sliding_motor_type",
  automationEnabled: "automation_enabled", automationPowerSource: "automation_power_source",
  automationCableDistanceM: "automation_cable_distance_m", automationBattery: "automation_battery",
  automationKeypad: "automation_keypad", automationExtraRemotes: "automation_extra_remotes",
  gatePostSizeMm: "gate_post_size_mm",
} as const;

function parseTerminationKind(raw: unknown): "corner" | "system_post" | "non_system_termination" | undefined {
  if (raw === "corner" || raw === "system_post" || raw === "non_system_termination") return raw;
  return undefined;
}

export function effectiveLegacyBoundaryType(runBoundaryType: LegacyBoundaryType, vars: Record<string, string | number | boolean> | undefined, side: "left" | "right"): LegacyBoundaryType {
  const key = side === "left" ? SEGMENT_TERMINATION_KEYS.leftKind : SEGMENT_TERMINATION_KEYS.rightKind;
  const kind = parseTerminationKind(vars?.[key]);
  if (!kind) return runBoundaryType;
  if (kind === "system_post") return "product_post";
  if (kind === "corner") return "corner_90";
  return "wall";
}

export function cornerDegreesFromVars(vars: Record<string, string | number | boolean> | undefined, side: "left" | "right"): number | undefined {
  const key = side === "left" ? SEGMENT_TERMINATION_KEYS.leftCornerDegrees : SEGMENT_TERMINATION_KEYS.rightCornerDegrees;
  const raw = vars?.[key];
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function classifyCorner(deg: number): CornerType { if (Math.abs(deg - 90) <= 2) return "right"; if (Math.abs(deg - 135) <= 5) return "obtuse"; return "custom"; }

export function cornerTypeFromVars(vars: Record<string, string | number | boolean> | undefined, side: "left" | "right"): CornerType | undefined {
  const key = side === "left" ? SEGMENT_TERMINATION_KEYS.leftCornerType : SEGMENT_TERMINATION_KEYS.rightCornerType;
  const rawType = vars?.[key];
  if (rawType === "right" || rawType === "obtuse" || rawType === "custom") return rawType;
  const degrees = cornerDegreesFromVars(vars, side);
  return degrees === undefined ? undefined : classifyCorner(degrees);
}

// ─── BOM metadata helpers ─────────────────────────────────────────────────────

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

export const OPTIONAL_ACCESSORY_KEY = "optional_add_ons";

function bomCategoryForSku(sku: string, fallbackCategory: string): string {
  const comp = getComponent(sku);
  const meta = comp?.metadata?.bomCategory;
  if (typeof meta === "string") return meta;
  const haystack = `${sku} ${comp?.name ?? ""} ${comp?.description ?? ""}`;
  const ov = CATEGORY_NAME_OVERRIDES.find(([p]) => p.test(haystack));
  if (ov) return ov[1];
  return LEGACY_CATEGORY_MAP[fallbackCategory] ?? "tools_and_consumables";
}

function bomSubCategoryForSku(sku: string, fallbackCategory: string): string {
  const comp = getComponent(sku);
  if (typeof comp?.subCategory === "string") return comp.subCategory;
  if (typeof comp?.metadata?.subCategory === "string") return comp.metadata.subCategory as string;
  const haystack = `${sku} ${comp?.name ?? ""} ${comp?.description ?? ""}`;
  const ov = SUBCATEGORY_NAME_OVERRIDES.find(([p]) => p.test(haystack));
  if (ov) return ov[1];
  return SUBCATEGORY_MAP[fallbackCategory] ?? fallbackCategory;
}

function bomSortPriorityForSku(sku: string, fallbackCategory: string): number {
  const comp = getComponent(sku);
  if (typeof comp?.sortPriority === "number") return comp.sortPriority;
  if (typeof comp?.metadata?.sortPriority === "number") return comp.metadata.sortPriority as number;
  return SORT_PRIORITY_BY_SUBCATEGORY[bomSubCategoryForSku(sku, fallbackCategory)] ?? 50;
}

function companionOfForSku(sku: string): string | undefined {
  const comp = getComponent(sku);
  if (typeof comp?.companionOf === "string") return comp.companionOf;
  if (typeof comp?.metadata?.companionOf === "string") return comp.metadata.companionOf as string;
  return COMPANION_OVERRIDES.find(([p]) => p.test(sku))?.[1];
}

export function selectedOptionalAddOns(variables: Record<string, unknown> | undefined): Record<string, string[]> {
  let raw = variables?.[OPTIONAL_ACCESSORY_KEY];
  if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { return {}; } }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const selected: Record<string, string[]> = {};
  for (const [parentSku, accessorySkus] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(accessorySkus)) continue;
    selected[parentSku] = accessorySkus.filter((s): s is string => typeof s === "string");
  }
  return selected;
}

function parentCandidates(value: unknown): string[] {
  const sku = baseHardwareSku(value);
  const candidates = new Set<string>([sku, String(value ?? "")].filter(Boolean));
  if (isTruCloseHardware(value)) candidates.add("TRUCLOSE_HINGE");
  return [...candidates];
}

export type OptionalAccessory = { sku: string; label: string; unitPrice: number; qtyPerParent: number; parentSkus: string[] };

export function optionalAccessoriesForParent(parentSku: unknown): OptionalAccessory[] {
  const parents = parentCandidates(parentSku);
  const accessories = getLocalComponents().filter((comp) => {
    const optionalParents = [...(Array.isArray(comp.optionalChildOf) ? comp.optionalChildOf : []), ...(Array.isArray(comp.metadata?.optionalChildOf) ? (comp.metadata!.optionalChildOf as unknown[]).filter((i): i is string => typeof i === "string") : [])];
    if (comp.isOptionalAccessory || comp.metadata?.isOptionalAccessory === true) return optionalParents.some((p) => parents.includes(p));
    return false;
  });
  if (parents.includes("TRUCLOSE_HINGE") && !accessories.some((i) => i.sku === "TC-CAPS3")) {
    const caps = getComponent("TC-CAPS3"); if (caps) accessories.push(caps);
  }
  return accessories.map((comp) => ({ sku: comp.sku, label: comp.description ?? comp.name ?? comp.sku, unitPrice: Number(comp.default_price ?? 0), qtyPerParent: typeof comp.qtyPerParent === "number" ? comp.qtyPerParent : typeof comp.metadata?.qtyPerParent === "number" ? comp.metadata.qtyPerParent as number : 1, parentSkus: parents }));
}

function withBomMetadata(item: BOMLineItem & { category: string }): BOMLineItem {
  return { ...item, category: bomCategoryForSku(item.sku, item.category), subCategory: item.subCategory ?? bomSubCategoryForSku(item.sku, item.category), companionOf: item.companionOf ?? companionOfForSku(item.sku), sortPriority: item.sortPriority ?? bomSortPriorityForSku(item.sku, item.category) };
}


// ─── BOM calculation ──────────────────────────────────────────────────────────

type QtyLine = { sku: string; category: string; quantity: number; unit?: string; notes?: string; runId: string; segmentId: string };
type ScopeInfo = { scopeKind: BOMSource["scopeKind"]; scopeId: string; scopeLabel: string; productCode?: string };

const SUPPORTED_PRODUCTS = new Set(["QSHS", "BAYG", "VS", "XPL"]);
const STANDARD_COLOURS = new Set(["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"]);
const ALUMAWOOD_CORE_COLOURS = new Set(["KWI", "WRC"]);
const CSR_CAP_COLOURS = new Set(["B", "G", "MN", "S", "SM", "W"]);
const COLOUR_NAMES: Record<string, string> = { B: "Black Satin", MN: "Monument Matt", G: "Woodland Grey Matt", SM: "Surfmist Matt", W: "Pearl White Gloss", BS: "Basalt Satin", D: "Dune Satin", M: "Mill", P: "Primrose", PB: "Paperbark", S: "Palladium Silver Pearl", KWI: "Kwila", WRC: "Western Red Cedar", IG: "Island Grey", TR: "Terrain" };

function toNumber(v: unknown, fallback: number): number { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function gapCode(mm: number): string { return `${String(mm).padStart(2, "0")}MM`; }
function roundMoney(v: number): number { return Math.round((v + Number.EPSILON) * 100) / 100; }
function designSlatWidthMm(productCode: string, slatSize: number): number { if (productCode === "QSHS" || productCode === "BAYG") return slatSize === 90 ? 90 : 65; return slatSize; }
function standardAccessoryColour(c: string): string { return STANDARD_COLOURS.has(c) ? c : "MN"; }
function csrCapColour(c: string): string { return CSR_CAP_COLOURS.has(c) ? c : "MN"; }
function colourSkuSuffix(c: string): string { return STANDARD_COLOURS.has(c) || c === "P" ? c : "MN"; }

function matchesPriceRule(rule: string | null | undefined, qty: number): boolean {
  if (!rule) return true;
  const m = rule.replace(/\s+/g, " ").trim().toLowerCase().match(/^qty\s*(>=|>|<=|<|==|=)\s*(\d+(?:\.\d+)?)$/);
  if (!m) return false;
  const op = m[1], threshold = Number(m[2]);
  return op === ">=" ? qty >= threshold : op === ">" ? qty > threshold : op === "<=" ? qty <= threshold : op === "<" ? qty < threshold : qty === threshold;
}

export function priceForSku(sku: string, qty: number, tier: PricingTier): number {
  const explicitRules = getLocalPricingRules().filter((r) => r.sku === sku && r.rule != null).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const exMatch = explicitRules.find((r) => matchesPriceRule(r.rule, qty));
  if (exMatch) return exMatch.price;
  const tierRules = getLocalPricingRules().filter((r) => r.sku === sku && r.tier_code === tier && !r.rule).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (tierRules.length > 0) return tierRules[0].price;
  const t1 = getLocalPricingRules().find((r) => r.sku === sku && r.tier_code === "tier1" && !r.rule);
  return t1?.price ?? 0;
}

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

function priceQtyLine(line: QtyLine, tier: PricingTier): number {
  if (isEconomySlatSku(line.sku) && line.unit === "pack") return roundMoney(priceForSku(line.sku, line.quantity * ECONOMY_SLAT_PACK_SIZE, tier) * ECONOMY_SLAT_PACK_SIZE);
  return priceForSku(line.sku, line.quantity, tier);
}

function mergeSources(sources: BOMSource[]): BOMSource[] {
  const merged = new Map<string, BOMSource>();
  for (const s of sources) { const key = `${s.scopeKind}|${s.scopeId}|${s.scopeLabel}`; const ex = merged.get(key); if (ex) ex.qty += s.qty; else merged.set(key, { ...s }); }
  return [...merged.values()];
}

function describeSku(sku: string, fallbackCategory: string): string {
  const comp = getComponent(sku);
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

function toBomLine(line: QtyLine, sources: BOMSource[], productCode: string | undefined, tier: PricingTier): BOMLineItem {
  const sourcedQty = sources.reduce((sum, s) => sum + s.qty, 0);
  const pricedLine = applyEconomySlatPackRule({ ...line, quantity: sourcedQty });
  const unitPrice = priceQtyLine(pricedLine, tier);
  return withBomMetadata({ category: line.category, sku: line.sku, description: describeSku(line.sku, line.category), quantity: pricedLine.quantity, totalQty: pricedLine.quantity, sources: mergeSources(sources), unit: (pricedLine.unit ?? getComponent(line.sku)?.unit ?? "each") as BOMUnit, unitPrice, lineTotal: roundMoney(unitPrice * pricedLine.quantity), notes: line.notes, runId: line.runId, segmentId: line.segmentId, productCode });
}

function aggregateBomLinesWithSources(lines: QtyLine[], scopeBySegmentId: Map<string, ScopeInfo>, keyForLine: (line: QtyLine) => string, tier: PricingTier): BOMLineItem[] {
  const agg = new Map<string, { line: QtyLine; sources: BOMSource[]; productCodes: Set<string>; notes: Set<string> }>();
  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) continue;
    const pl = applyEconomySlatPackRule(line), key = keyForLine(pl);
    const existing = agg.get(key);
    const source = sourceForLine(pl, scopeBySegmentId);
    const pc = scopeBySegmentId.get(line.segmentId)?.productCode;
    if (existing) { existing.sources.push(source); if (pc) existing.productCodes.add(pc); if (pl.notes) existing.notes.add(pl.notes); }
    else agg.set(key, { line: { ...pl }, sources: [source], productCodes: new Set(pc ? [pc] : []), notes: new Set(pl.notes ? [pl.notes] : []) });
  }
  return [...agg.values()].map(({ line, sources, productCodes, notes }) => toBomLine({ ...line, notes: notes.size ? [...notes].join("; ") : line.notes }, sources, productCodes.size === 1 ? [...productCodes][0] : undefined, tier));
}

function emit(lines: QtyLine[], line: QtyLine): void { if (!Number.isFinite(line.quantity) || line.quantity <= 0) return; lines.push({ ...line, quantity: Math.ceil(line.quantity) }); }

function emitSelectedOptionalAddOns(lines: QtyLine[], base: { runId: string; segmentId: string }, variables: Record<string, unknown>, parentSku: string, parentQty: number) {
  const selected = selectedOptionalAddOns(variables)[parentSku] ?? [];
  if (!selected.length) return;
  const opts = optionalAccessoriesForParent(parentSku);
  for (const sk of selected) {
    const opt = opts.find((o) => o.sku === sk);
    if (!opt) continue;
    emit(lines, { ...base, sku: sk, category: "hardware", quantity: Math.max(1, parentQty * opt.qtyPerParent), unit: (getComponent(sk)?.unit ?? "each") as QtyLine["unit"], notes: `Optional add-on selected for ${parentSku}` });
  }
}

function cornerTypeFromDegrees(deg: number | undefined): CornerType | undefined { if (deg === undefined) return undefined; if (Math.abs(deg - 90) <= 2) return "right"; if (Math.abs(deg - 135) <= 5) return "obtuse"; return "custom"; }

function emitCornerLines(lines: QtyLine[], warnings: string[], base: { runId: string; segmentId: string }, vars: Record<string, string | number | boolean> | undefined, side: "left" | "right", finishFamily: string, colour: string, runHeightMm: number) {
  const explicitType = cornerTypeFromVars(vars, side), degrees = cornerDegreesFromVars(vars, side);
  const type = explicitType ?? cornerTypeFromDegrees(degrees);
  if (!type || type === "right") return;
  const label = `${side} corner on ${base.segmentId.slice(0, 8)}`;
  if (type === "custom") {
    const msg = `Custom angle (${Math.round(degrees ?? 0)} degrees) at ${label} - verify components with supplier before ordering.`;
    warnings.push(msg);
    emit(lines, { ...base, sku: "CUSTOM-ANGLE-CORNER", category: "accessory", quantity: 1, unit: "each", notes: msg });
    return;
  }
  const angleAdapterSku = (finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(colour)) ? `AW-5800-135-${colour}` : `XP-6000-135-${colour}`;
  emit(lines, { ...base, sku: angleAdapterSku, category: "accessory", quantity: 1, unit: "length", notes: `135 degree angle adapter at ${label}, cut to ${Math.round(runHeightMm)}mm` });
  emit(lines, { ...base, sku: `XP-SCREWS-${standardAccessoryColour(colour)}`, category: "screw", quantity: 1, unit: "pack", notes: `Extra screws for 135 degree angle adapter at ${label}` });
}

function runPostBoundaryCount(run: CanonicalRun): number {
  return (run.leftBoundary?.type === "product_post" ? 1 : 0) + (run.rightBoundary?.type === "product_post" ? 1 : 0) + (run.corners?.length ?? 0);
}

function postSkuFor(finishFamily: string, postSize: number, postHeight: number, postColour: string, mountingType: string): string {
  if (finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(postColour)) {
    if (postSize === 65) return postHeight > 2400 ? `AW-5800-65HD-${postColour}` : `AW-2400-65HD-${postColour}`;
    return postHeight > 2400 ? `AW-5800-FP-${postColour}` : `AW-2400-FP-${postColour}`;
  }
  if (mountingType === "in_ground" && postSize === 50 && postHeight <= 1200) { const s = `XP-1800-FP-${postColour}`; if (getComponent(s)) return s; }
  if (postSize === 65) return postHeight > 2400 ? `XP-6000-65HD-${postColour}` : `XP-2400-65HD-${postColour}`;
  return postHeight > 2400 ? `XP-6000-FP-${postColour}` : `XP-2400-FP-${postColour}`;
}

function postAccessorySkuFor(finishFamily: string, kind: "top_plate" | "base_plate" | "domical_cover" | "dress_ring", postSize: number, postColour: string): string {
  if (finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(postColour)) {
    const prefix = postSize === 65 ? "AW-65" : "AW-";
    if (kind === "top_plate") return postSize === 65 ? "AW-65TP-TR" : "AW-TP-TR";
    if (kind === "base_plate") return `${prefix}BP-SET-TR`;
    if (kind === "domical_cover") return `${prefix}DC-2P-TR`;
    return `${prefix}DR-TR`;
  }
  if (kind === "top_plate") return postSize === 65 ? `XP-65TP-${postColour}` : `XP-TP-${postColour}`;
  if (kind === "base_plate") return postSize === 65 ? `XP-65BP-SET-${postColour}` : `XP-BP-SET-${postColour}`;
  if (kind === "domical_cover") return postSize === 65 ? `XP-65DC-2P-${postColour}` : `XP-DC-2P-${postColour}`;
  return postSize === 65 ? `XP-65DR-${postColour}` : `XP-DR-${postColour}`;
}

function emitPostLines(lines: QtyLine[], run: CanonicalRun, segmentId: string, postCount: number, finishFamily: string, postSize: number, postHeight: number, postColour: string, mountingType: string) {
  if (postCount <= 0) return;
  const sk = postSkuFor(finishFamily, postSize, postHeight, postColour, mountingType);
  emit(lines, { runId: run.runId, segmentId, sku: sk, category: "post", quantity: postCount, unit: "each", notes: `${postSize}mm posts from run boundaries/corners and internal panel joins` });
  if (postHeight > 2400) emit(lines, { runId: run.runId, segmentId, sku: postAccessorySkuFor(finishFamily, "top_plate", postSize, postColour), category: "post_accessory", quantity: postCount, unit: "each", notes: "Top plates for long posts" });
  if (mountingType === "base_plate") {
    emit(lines, { runId: run.runId, segmentId, sku: postAccessorySkuFor(finishFamily, "base_plate", postSize, postColour), category: "post_accessory", quantity: postCount, unit: "each", notes: "Base plate sets" });
    emit(lines, { runId: run.runId, segmentId, sku: postAccessorySkuFor(finishFamily, "domical_cover", postSize, postColour), category: "post_accessory", quantity: postCount, unit: "each", notes: "Domical covers" });
  }
  if (mountingType === "core_drill") emit(lines, { runId: run.runId, segmentId, sku: postAccessorySkuFor(finishFamily, "dress_ring", postSize, postColour), category: "post_accessory", quantity: postCount, unit: "each", notes: "Dress rings" });
}

function emitPostFixingLines(lines: QtyLine[], run: CanonicalRun, segmentId: string, postCount: number, vars: Record<string, unknown>, mountingType: string) {
  if (postCount <= 0) return;
  if (mountingType === "in_ground") emit(lines, { runId: run.runId, segmentId, sku: String(vars.post_fixing_material_sku ?? "GROUT-RSC"), category: "accessory", quantity: postCount * 1.5, unit: "bag", notes: "Post-fixing material at 1.5 bags per concreted-in post" });
  if (mountingType === "base_plate") emit(lines, { runId: run.runId, segmentId, sku: substrateFixingKitSku(vars.base_plate_substrate ?? "concrete"), category: "accessory", quantity: postCount, unit: "pack", notes: vars.base_plate_substrate === "timber" ? "Timber fixing kit, one 4-pack per base-plated post" : "Concrete fixing kit, one 4-pack per base-plated post" });
}

function slatSkuFor(finishFamily: string, economySlats: boolean, slatSize: number, colour: string): string {
  if (economySlats) return `XP-6500-E65-${colour}`;
  if (finishFamily === "alumawood") return slatSize === 90 ? `AWQS-5800-S90-${colour}` : `AW-5800-S65-${colour}`;
  return slatSize === 90 ? `QS-6100-S90-${colour}` : `XP-6100-S65-${colour}`;
}

function quickscreenSkuFor(finishFamily: string, family: "SF" | "CFC" | "F", colour: string): string { return `${finishFamily === "alumawood" ? "AWQS" : "QS"}-5800-${family}-${colour}`; }
function csrSkuFor(finishFamily: string, colour: string): string { return finishFamily === "alumawood" ? `AW-5800-CSR-${colour}` : `XP-5800-CSR-${colour}`; }
function louvreBracketSkuFor(colour: string): string { const sk = `QS-LB-${colour}`; return getComponent(sk) ? sk : "QS-LB-MN"; }

function gateBladeSkuFor(finishFamily: string, economySlats: boolean, slatSize: number, colour: string, verticalBuild = false): string {
  if (verticalBuild) return slatSkuFor(finishFamily, economySlats, slatSize, colour);
  if (slatSize === 90) return slatSkuFor(finishFamily, economySlats, 90, colour);
  return `XP-6100-S65-${colourSkuSuffix(colour)}`;
}

function gateRailSkuFor(slatSize: number, colour: string): string { return `QSG-4800-RAIL${slatSize === 90 ? "90" : "65"}-${colourSkuSuffix(colour)}`; }
function slidingGateTopRailSkuFor(slatSize: number, colour: string, verticalBuild: boolean): string { return `QSG-S-6100-TR${verticalBuild ? 65 : slatSize === 90 ? 90 : 65}-${colourSkuSuffix(colour)}`; }
function slidingGateBottomRailSkuFor(colour: string): string { return `QSG-S-6100-BR-${colourSkuSuffix(colour)}`; }
function gateSideFrameSkuFor(colour: string): string { return `QSG-4200-GSF50-${colourSkuSuffix(colour)}`; }
function gateInfillSkuFor(verticalBuild: boolean, colour: string): string { return `${verticalBuild ? "QSG-4200-CINF" : "QSG-4800-INF"}-${colourSkuSuffix(colour)}`; }
function gateScrewCoverSkuFor(colour: string): string { return `QSG-4200-COVER-${colourSkuSuffix(colour)}`; }
function gateTopCapSkuFor(colour: string): string { return `QSG-GFC-50X50-${colourSkuSuffix(colour)}`; }
function gateSpacerSkuFor(slatGap: number): string { const g = Math.round(slatGap); const code = g <= 5 ? "05" : g <= 9 ? "09" : g <= 12 ? "12" : g <= 15 ? "15" : g <= 20 ? "20" : "30"; return `QS-SPACER-${code}MM-50PK`; }
function stockLengthForSlidingTrack(sku: string): number { return sku.includes("3000") ? 3000 : 6000; }

const DISCONTINUED_XP_GATE_PREFIXES = ["XP-4200-GSF", "XP-4200-GI", "XP-GFC", "XP-SCREWSGF", "XP-6100-GB65", "XP-GKIT", "XP-XBAT-4200-INF", "XP-6100-HD6545", "XP-4200-GSTOP", "XP-LBOX-", "XP-HDL-"];
function isDiscontinuedXpGateSku(sku: string): boolean { return DISCONTINUED_XP_GATE_PREFIXES.some((p) => sku.startsWith(p)); }
function knownSelectedSku(value: unknown): string | undefined { const sku = String(value ?? ""); if (!sku || sku === "none" || sku === "auto") return undefined; if (isDiscontinuedXpGateSku(sku)) return undefined; return sku; }

function emitQsgGateFrameLines(lines: QtyLine[], base: { runId: string; segmentId: string }, slatSize: number, colour: string, leafCount: number, frameCutMm: number, railCutMm: number, verticalBuild: boolean, numGateBlades: number, slatGap: number) {
  const sfPerStock = Math.max(1, Math.floor(4200 / frameCutMm)), sfPieces = 2 * leafCount;
  const railScrewPacks = Math.ceil((4 * leafCount) / 50);
  const infillStock = verticalBuild ? 4200 : 4800, infillCut = verticalBuild ? frameCutMm : railCutMm;
  const infillsPerStock = Math.max(1, Math.floor(infillStock / infillCut));
  const coverPieces = 2 * leafCount, coversPerStock = Math.max(1, Math.floor(4200 / frameCutMm));
  const spacerPacks = Math.ceil((Math.max(0, numGateBlades - 1) * 2 * leafCount) / 50);
  const waferScrewPacks = Math.ceil((numGateBlades * 2 * leafCount) / 50);
  emit(lines, { ...base, sku: gateSideFrameSkuFor(colour), category: "gate_side_frame", quantity: Math.ceil(sfPieces / sfPerStock), unit: "length", notes: `${sfPieces} QSG side-frame pieces, ${Math.round(frameCutMm)}mm cuts from 4200mm stock` });
  emit(lines, { ...base, sku: slatSize === 90 ? "QSG-JOINER90-4PK" : "QSG-JOINER65-4PK", category: "hardware", quantity: leafCount, unit: "pack", notes: `${slatSize === 90 ? "90mm" : "65mm"} joiner blocks for QSG gate rails` });
  emit(lines, { ...base, sku: gateScrewCoverSkuFor(colour), category: "hardware", quantity: Math.ceil(coverPieces / coversPerStock), unit: "length", notes: `Gate screw cover, ${Math.round(frameCutMm)}mm cuts from 4200mm stock` });
  emit(lines, { ...base, sku: "AR-SCR-BR-50PK", category: "screw", quantity: railScrewPacks, unit: "pack", notes: "QSG rail screws for top and bottom rails" });
  emit(lines, { ...base, sku: gateTopCapSkuFor(colour), category: "accessory", quantity: 4 * leafCount, unit: "each", notes: "Gate top caps for 50mm x 50mm side frame, 4 per leaf" });
  emit(lines, { ...base, sku: gateInfillSkuFor(verticalBuild, colour), category: "accessory", quantity: Math.ceil((2 * leafCount) / infillsPerStock), unit: "length", notes: `${verticalBuild ? "Channel infill" : "Gate infill"} for gate frame void, ${Math.round(infillCut)}mm cuts from ${infillStock}mm stock` });
  emit(lines, { ...base, sku: gateSpacerSkuFor(slatGap), category: "spacer", quantity: spacerPacks, unit: "pack", notes: `${Math.max(0, numGateBlades - 1)} gaps/leaf, one spacer at each end of each gap` });
  emit(lines, { ...base, sku: "QS-SCREWS-50PK", category: "screw", quantity: waferScrewPacks, unit: "pack", notes: "16mm wafer screws for fixing slats to gate rails/side frames" });
}

function emitQsgSlidingGateFrameLines(lines: QtyLine[], base: { runId: string; segmentId: string }, slatSize: number, colour: string, frameCutMm: number, railCutMm: number, verticalBuild: boolean, numGateBlades: number, slatGap: number) {
  const sfPerStock = Math.max(1, Math.floor(4200 / frameCutMm));
  const infillStock = verticalBuild ? 4200 : 4800, infillCut = verticalBuild ? frameCutMm : railCutMm;
  const infillsPerStock = Math.max(1, Math.floor(infillStock / infillCut));
  const coversPerStock = Math.max(1, Math.floor(4200 / frameCutMm));
  const railsPerStock = Math.max(1, Math.floor(6100 / railCutMm));
  const spacerPacks = Math.ceil((Math.max(0, numGateBlades - 1) * 2) / 50);
  const waferScrewPacks = Math.ceil((numGateBlades * 2) / 50);
  emit(lines, { ...base, sku: gateSideFrameSkuFor(colour), category: "gate_side_frame", quantity: Math.ceil(2 / sfPerStock), unit: "length", notes: `2 QSG sliding side-frame pieces, ${Math.round(frameCutMm)}mm cuts from 4200mm stock` });
  emit(lines, { ...base, sku: slidingGateTopRailSkuFor(slatSize, colour, verticalBuild), category: "gate_rail", quantity: Math.ceil(1 / railsPerStock), unit: "length", notes: `Sliding gate top rail, ${Math.round(railCutMm)}mm cut from 6100mm stock` });
  emit(lines, { ...base, sku: slidingGateBottomRailSkuFor(colour), category: "gate_rail", quantity: Math.ceil(1 / railsPerStock), unit: "length", notes: `Sliding gate bottom rail, ${Math.round(railCutMm)}mm cut from 6100mm stock` });
  const railSize = verticalBuild ? 65 : slatSize === 90 ? 90 : 65;
  emit(lines, { ...base, sku: railSize === 90 ? "QSG-JOINER90-4PK" : "QSG-JOINER65-4PK", category: "hardware", quantity: 1, unit: "pack", notes: `${railSize}mm joiner blocks for sliding gate rails` });
  emit(lines, { ...base, sku: gateScrewCoverSkuFor(colour), category: "hardware", quantity: Math.ceil(2 / coversPerStock), unit: "length", notes: `Gate screw cover, ${Math.round(frameCutMm)}mm cuts from 4200mm stock` });
  emit(lines, { ...base, sku: gateInfillSkuFor(verticalBuild, colour), category: "accessory", quantity: Math.ceil(2 / infillsPerStock), unit: "length", notes: `${verticalBuild ? "Gate channel infill" : "Gate infill"} for side-frame void, ${Math.round(infillCut)}mm cuts from ${infillStock}mm stock` });
  emit(lines, { ...base, sku: "AR-SCR-BR-50PK", category: "screw", quantity: 1, unit: "pack", notes: "QSG rail screws for sliding top and bottom rails" });
  emit(lines, { ...base, sku: gateSpacerSkuFor(slatGap), category: "spacer", quantity: spacerPacks, unit: "pack", notes: `${Math.max(0, numGateBlades - 1)} gaps, one spacer at each end of each gap` });
  emit(lines, { ...base, sku: "QS-SCREWS-50PK", category: "screw", quantity: waferScrewPacks, unit: "pack", notes: "16mm wafer screws for fixing slats to sliding gate rails/side frames" });
  emit(lines, { ...base, sku: gateTopCapSkuFor(colour), category: "accessory", quantity: 2, unit: "each", notes: "Gate top caps for the two sliding gate side frames" });
}

function calculateGateSegment(run: CanonicalRun, segment: CanonicalSegment, mergedRunVars: Record<string, unknown>, warnings: string[], computed: LocalBomResult["computed"]): QtyLine[] {
  const lines: QtyLine[] = [];
  const vars = { ...mergedRunVars, ...(segment.variables ?? {}) };
  const movement = gateMovementOrDefault(vars[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  const build = String(vars[GATE_SEGMENT_STUB_KEYS.gateBuild] ?? (run.productCode === "VS" ? "qsg_hinged_vertical" : "qsg_hinged_horizontal"));
  const colour = String(vars[GATE_SEGMENT_STUB_KEYS.colourCode] ?? vars.colour_code ?? "B");
  const slatGap = toNumber(vars[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? vars.slat_gap_mm, 9);
  const slatSize = toNumber(vars[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? vars.slat_size_mm, 65);
  const finishFamily = String(vars.finish_family ?? "standard"), economySlats = finishFamily === "economy";
  const openingWidthMm = toNumber(segment.segmentWidthMm, 900), whiteHardware = isWhiteHardwareFinish(colour);
  const hingeValue = String(vars[GATE_SEGMENT_STUB_KEYS.hingeType] ?? (whiteHardware ? "TC-H-AT-HD-2L-W" : "TC-H-AT-HD-B"));
  const latchValue = String(vars[GATE_SEGMENT_STUB_KEYS.latchType] ?? (whiteHardware ? "LL-DL-W" : "LL-DL-KA"));
  const gateHeightMm = toNumber(segment.targetHeightMm ?? vars[GATE_SEGMENT_STUB_KEYS.gateHeightMm], toNumber(mergedRunVars.target_height_mm, 1800));
  const hingeGapMm = movement === "sliding" ? 0 : hingeGapForSku(hingeValue), latchGapMm = movement === "sliding" ? 0 : latchGapForSku(latchValue);
  const gateGeometry = gateLeafGeometry({ movement, openingWidthMm, hingeGapMm, latchGapMm });
  const { leafCount, leafWidthMm } = gateGeometry, totalLeafClearanceMm = gateGeometry.totalClearanceMm;
  const base = { runId: run.runId, segmentId: segment.segmentId }, verticalBuild = build.includes("vertical");

  computed[run.runId] = computed[run.runId] ?? {};
  computed[run.runId][segment.segmentId] = { ...(computed[run.runId][segment.segmentId] ?? {}), gate_movement: movement, gate_build: build, gate_leaf_count: leafCount, gate_leaf_width_mm: Math.round(leafWidthMm), gate_clearance_mm: Math.round(totalLeafClearanceMm), gate_opening_width_mm: Math.round(openingWidthMm), gate_height_mm: Math.round(gateHeightMm) };

  if (movement === "sliding") {
    const bladeCutMm = verticalBuild ? Math.max(1, gateHeightMm - 224) : Math.max(1, openingWidthMm - 86);
    const railCutMm = Math.max(1, openingWidthMm - 80), frameCutMm = Math.max(1, gateHeightMm - 31);
    const numGateBlades = Math.max(1, verticalBuild ? Math.floor((openingWidthMm - 89 + slatGap) / (slatSize + slatGap)) : Math.floor((gateHeightMm - slatGap - 216) / (slatSize + slatGap)));
    const bladesPerStock = Math.max(1, Math.floor(6100 / bladeCutMm));
    const csrRequired = openingWidthMm > 3000, csrCount = csrRequired ? 1 : 0;
    const csrCutMm = Math.max(1, frameCutMm - 206), csrsPerStock = Math.max(1, Math.floor(5800 / csrCutMm));

    emit(lines, { ...base, sku: gateBladeSkuFor(finishFamily, economySlats, slatSize, colour, verticalBuild), category: "gate", quantity: Math.ceil(numGateBlades / bladesPerStock), unit: "length", notes: `${numGateBlades} gate blades, ${Math.round(bladeCutMm)}mm cuts from 6100mm stock` });
    emitQsgSlidingGateFrameLines(lines, base, slatSize, colour, frameCutMm, railCutMm, verticalBuild, numGateBlades, slatGap);
    if (csrCount > 0) {
      const csrColour = colourSkuSuffix(colour), csrPlateSku = getComponent(`XP-BTP-${csrColour}`) ? `XP-BTP-${csrColour}` : "XP-BTP-MN";
      emit(lines, { ...base, sku: csrSkuFor(finishFamily, csrColour), category: "centre_support_rail", quantity: Math.ceil(csrCount / csrsPerStock), unit: "length", notes: `${csrCount} centre support rail(s) for sliding gate over 3000mm` });
      emit(lines, { ...base, sku: `XP-CSRC-${csrCapColour(csrColour)}`, category: "accessory", quantity: csrCount, unit: "each", notes: "Centre support rail cap" });
      emit(lines, { ...base, sku: csrPlateSku, category: "accessory", quantity: csrCount * 2, unit: "each", notes: "Top and bottom plates for sliding gate centre support rails" });
    }
    const trackSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.slidingTrackType]) ?? "XPSG-6000-TRACK-ST";
    const trackQty = Math.ceil((openingWidthMm * 2) / stockLengthForSlidingTrack(trackSku));
    emit(lines, { ...base, sku: trackSku, category: "hardware", quantity: trackQty, unit: "length", notes: `Sliding track for approx. ${Math.round(openingWidthMm * 2)}mm travel length` });
    if (trackSku.includes("TRACK-ST")) emit(lines, { ...base, sku: "XPSG-ANCHOR", category: "hardware", quantity: trackSku.includes("3000") ? trackQty * 22 : trackQty * 42, unit: "each", notes: "Track anchor pins" });
    emit(lines, { ...base, sku: "QSG-S-WHEEL", category: "hardware", quantity: 2, unit: "each", notes: "Sliding gate wheels" });
    emit(lines, { ...base, sku: "QSG-S-WHEEL-CS-2PK", category: "hardware", quantity: 1, unit: "pack", notes: "Sliding gate wheel clamping set" });
    emit(lines, { ...base, sku: knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.slidingGuideType]) ?? "XPSG-GUIDE", category: "hardware", quantity: 1, unit: "each", notes: "Sliding gate guide" });
    emit(lines, { ...base, sku: "XPSG-STOP", category: "hardware", quantity: 1, unit: "each", notes: "Bolt down sliding gate stop" });
    emit(lines, { ...base, sku: knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.slidingCatchType]) ?? "XPSG-CATCH-U", category: "hardware", quantity: 1, unit: "each", notes: "Sliding gate catch" });
    const autoEnabled = vars[GATE_SEGMENT_STUB_KEYS.automationEnabled] === true;
    const cableDist = toNumber(vars[GATE_SEGMENT_STUB_KEYS.automationCableDistanceM], 0);
    const autoPower = String(vars[GATE_SEGMENT_STUB_KEYS.automationPowerSource] ?? "mains");
    const motorSku = autoEnabled ? (autoPower === "mains" && cableDist > 30 ? "XPSG-FILO-400PRO-SP" : "XPSG-FILO-400") : knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.slidingMotorType]);
    if (motorSku) {
      emit(lines, { ...base, sku: motorSku, category: "automation", quantity: 1, unit: "each", notes: "Sliding gate motor" });
      if (autoEnabled && autoPower === "solar") emit(lines, { ...base, sku: "XPSG-FILO-SOLAR", category: "automation", quantity: 1, unit: "each", notes: "Solar power kit" });
      if (autoEnabled && vars[GATE_SEGMENT_STUB_KEYS.automationBattery] === true) emit(lines, { ...base, sku: "XPSG-FILO-BATTERY", category: "automation", quantity: 1, unit: "each", notes: "Backup battery" });
      if (autoEnabled && vars[GATE_SEGMENT_STUB_KEYS.automationKeypad] === true) emit(lines, { ...base, sku: "XPSG-FILO-WKP", category: "automation", quantity: 1, unit: "each", notes: "Wireless keypad" });
      const extraRemotes = autoEnabled ? Math.min(10, Math.max(0, toNumber(vars[GATE_SEGMENT_STUB_KEYS.automationExtraRemotes], 0))) : 0;
      if (extraRemotes > 0) emit(lines, { ...base, sku: "XPSG-FILO-REMOTE", category: "automation", quantity: extraRemotes, unit: "each", notes: "Extra remotes" });
      emit(lines, { ...base, sku: "XPSG-FILO-RACK", category: "automation", quantity: Math.ceil(openingWidthMm / 1000), unit: "each", notes: `Motor rack, ${Math.ceil(openingWidthMm / 1000)} x 1m sections` });
    }
    return lines;
  }

  if (!build.startsWith("qsg_hinged_")) warnings.push(`${build} gate build is selectable for workflow testing, but full frame kit rules still need QSG workbook verification.`);
  const bladeCutMm = verticalBuild ? Math.max(1, gateHeightMm - 133) : Math.max(1, leafWidthMm - 86);
  const railCutMm = Math.max(1, leafWidthMm - 80);
  const numGateBlades = Math.max(1, verticalBuild ? Math.floor((leafWidthMm - 86 + slatGap) / (slatSize + slatGap)) : Math.floor((gateHeightMm - 133 + slatGap) / (slatSize + slatGap)));
  const bladesPerStock = Math.max(1, Math.floor(6100 / bladeCutMm)), railsPerStock = Math.max(1, Math.floor(4800 / railCutMm));

  emit(lines, { ...base, sku: gateBladeSkuFor(finishFamily, economySlats, slatSize, colour, verticalBuild), category: "gate", quantity: Math.ceil((numGateBlades * leafCount) / bladesPerStock), unit: "length", notes: `${numGateBlades} gate blades/leaf, ${Math.round(bladeCutMm)}mm cuts from 6100mm stock` });
  emit(lines, { ...base, sku: gateRailSkuFor(slatSize, colour), category: "gate", quantity: Math.ceil((2 * leafCount) / railsPerStock), unit: "length", notes: `Top/bottom QSG gate rails, ${Math.round(railCutMm)}mm cuts from 4800mm stock` });
  emitQsgGateFrameLines(lines, base, slatSize, colour, leafCount, Math.max(1, gateHeightMm), railCutMm, verticalBuild, numGateBlades, slatGap);

  const stopSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.gateStopType]);
  if (stopSku) emit(lines, { ...base, sku: stopSku, category: "hardware", quantity: leafCount, unit: "each", notes: "Selected gate stop" });

  const selectedKitSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.hardwareKitSku]);
  const matchingKit = kitForHardwareSelection(hingeValue, latchValue);
  const kitSku = leafCount === 1 && selectedKitSku && matchingKit?.kitSku === selectedKitSku ? selectedKitSku : undefined;
  const hingeSku = knownSelectedSku(hingeValue), latchSku = knownSelectedSku(latchValue);

  if (kitSku) {
    emit(lines, { ...base, sku: kitSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected hinge and latch kit" });
    emitSelectedOptionalAddOns(lines, base, vars, kitSku, 1);
  } else {
    if (hingeSku) { emit(lines, { ...base, sku: hingeSku, category: "hardware", quantity: leafCount, unit: "each", notes: "Selected hinge hardware" }); emitSelectedOptionalAddOns(lines, base, vars, hingeSku, leafCount); }
    if (latchSku) { emit(lines, { ...base, sku: latchSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected latch / lock hardware" }); emitSelectedOptionalAddOns(lines, base, vars, latchSku, 1); }
  }
  const hardwareForCaps = kitSku ?? hingeSku ?? baseHardwareSku(hingeValue);
  if (isTruCloseHardware(hardwareForCaps)) emitSelectedOptionalAddOns(lines, base, vars, "TRUCLOSE_HINGE", leafCount);
  if (vars[GATE_SEGMENT_STUB_KEYS.includeExternalAccessKit] === true) emit(lines, { ...base, sku: "LLB", category: "hardware", quantity: 1, unit: "each", notes: "Optional external access kit for selected Lokk Latch" });
  const dropBoltSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.dropBoltType] ?? (movement === "double_swing" ? "SS-0300DB-B" : "none"));
  if (dropBoltSku) emit(lines, { ...base, sku: dropBoltSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected drop bolt" });
  if (vars[GATE_SEGMENT_STUB_KEYS.includeLockBox] === true) warnings.push("A legacy XP lock-box option was present on this gate, but XP gate frame hardware is discontinued and is no longer added to QuickScreen gates.");

  return lines;
}

function calculateVerticalSlatRun(payload: CanonicalPayload, run: CanonicalRun, warnings: string[], computed: LocalBomResult["computed"]): QtyLine[] {
  const lines: QtyLine[] = [];
  const firstFenceSeg = run.segments.find((s) => s.segmentKind !== "gate_opening");
  const mergedRunVars = { ...payload.variables, ...(run.variables ?? {}), ...(firstFenceSeg?.variables ?? {}) };
  const runColour = String(mergedRunVars.colour_code ?? mergedRunVars.colour ?? "B");
  const runPostColour = String(mergedRunVars.post_colour_code ?? runColour);
  const runFinishFamily = String(mergedRunVars.finish_family ?? "standard");
  const mountingType = String(mergedRunVars.mounting_type ?? mergedRunVars.mounting_method ?? "in_ground");
  const postSize = toNumber(mergedRunVars.post_size, 50);
  let internalPanelPosts = 0;

  for (const segment of run.segments) {
    if (segment.segmentKind === "gate_opening") { lines.push(...calculateGateSegment(run, segment, mergedRunVars, warnings, computed)); continue; }
    const vars = { ...mergedRunVars, ...(segment.variables ?? {}) };
    const colour = String(vars.colour_code ?? vars.colour ?? runColour);
    const slatSize = toNumber(vars.slat_size_mm, 65), slatGap = toNumber(vars.slat_gap_mm, 5);
    const finishFamily = String(vars.finish_family ?? runFinishFamily), economySlats = finishFamily === "economy";
    const slatStockLengthMm = economySlats ? 6500 : finishFamily === "alumawood" ? 5800 : 6100;
    const segmentWidthMm = toNumber(segment.segmentWidthMm, 0), targetHeightMm = toNumber(segment.targetHeightMm ?? vars.target_height_mm, 1800);
    if (segmentWidthMm <= 0) continue;
    const segMaxPanel = clampPostSpacing(vars.max_panel_width_mm, maxPanelWidthForSystem(run.productCode));
    const numPanels = Math.max(1, Math.ceil(segmentWidthMm / segMaxPanel)), panelWidthMm = segmentWidthMm / numPanels;
    internalPanelPosts += Math.max(0, numPanels - 1);
    const numVertSlats = Math.max(1, Math.floor((panelWidthMm - 8 + slatGap) / (slatGap + slatSize)));
    const slatCutMm = Math.max(1, targetHeightMm), railCutMm = Math.max(1, panelWidthMm), fSectionCutMm = Math.max(1, targetHeightMm);
    const slatsPerStock = Math.max(1, Math.floor(slatStockLengthMm / slatCutMm));
    const railsPerStock = Math.max(1, Math.floor(5000 / railCutMm)), railInsertsPSt = Math.max(1, Math.floor(5800 / railCutMm)), fSectPSt = Math.max(1, Math.floor(5800 / fSectionCutMm));
    const slatStocks = Math.ceil((numVertSlats * numPanels) / slatsPerStock);
    const railStocks = Math.ceil((2 * numPanels) / railsPerStock), railInsertStocks = Math.ceil((2 * numPanels) / railInsertsPSt), fSectionStocks = Math.ceil((2 * numPanels) / fSectPSt);
    const screwPacks = Math.ceil((Math.ceil((numVertSlats * numPanels * 1.01) / 10) * 10) / 50);

    computed[run.runId] = computed[run.runId] ?? {};
    computed[run.runId][segment.segmentId] = { num_vertical_slats: numVertSlats, num_panels: numPanels, panel_width_mm: Math.round(panelWidthMm), slat_cut_mm: Math.round(slatCutMm), rail_cut_mm: Math.round(railCutMm) };

    const base = { runId: run.runId, segmentId: segment.segmentId };
    emit(lines, { ...base, sku: slatSkuFor(finishFamily, economySlats, slatSize, colour), category: "slat", quantity: slatStocks, unit: "length", notes: `${numVertSlats} vertical slats/panel, ${Math.round(slatCutMm)}mm cuts from ${slatStockLengthMm}mm stock` });
    emit(lines, { ...base, sku: `QS-5000-HORIZ-${colour}`, category: "rail", quantity: railStocks, unit: "length", notes: `Top/bottom U-channel rails, ${Math.round(railCutMm)}mm cuts from 5000mm stock` });
    emit(lines, { ...base, sku: quickscreenSkuFor(finishFamily, "SF", colour), category: "rail_insert", quantity: railInsertStocks, unit: "length", notes: `QS-SF inserts inside top/bottom rails, ${Math.round(railCutMm)}mm cuts from 5800mm stock` });
    emit(lines, { ...base, sku: quickscreenSkuFor(finishFamily, "F", colour), category: "f_section", quantity: fSectionStocks, unit: "length", notes: `2 vertical side F-sections/panel, ${Math.round(fSectionCutMm)}mm cuts from 5800mm stock` });
    emit(lines, { ...base, sku: "QS-SCREWS-50PK", category: "screw", quantity: screwPacks, unit: "pack", notes: "Vertical slat fixing screws" });
    emitCornerLines(lines, warnings, base, segment.variables, "left", finishFamily, colour, targetHeightMm);
    emitCornerLines(lines, warnings, base, segment.variables, "right", finishFamily, colour, targetHeightMm);
    if (panelWidthMm > 2600) warnings.push(`VS panel width ${Math.round(panelWidthMm)}mm exceeds recommended 2600mm; split into more panels.`);
  }

  const postCount = runPostBoundaryCount(run) + internalPanelPosts;
  const postHeight = toNumber(firstFenceSeg?.targetHeightMm ?? mergedRunVars.target_height_mm, 1800);
  emitPostLines(lines, run, firstFenceSeg?.segmentId ?? run.runId, postCount, runFinishFamily, postSize, postHeight, runPostColour, mountingType);
  emitPostFixingLines(lines, run, firstFenceSeg?.segmentId ?? run.runId, postCount, mergedRunVars, mountingType);
  return lines;
}

function calculateScreenRun(payload: CanonicalPayload, run: CanonicalRun, warnings: string[], computed: LocalBomResult["computed"]): QtyLine[] {
  if (run.productCode === "VS") return calculateVerticalSlatRun(payload, run, warnings, computed);
  const lines: QtyLine[] = [];
  const firstFenceSeg = run.segments.find((s) => s.segmentKind !== "gate_opening");
  const mergedRunVars = { ...payload.variables, ...(run.variables ?? {}), ...(firstFenceSeg?.variables ?? {}) };
  const runColour = String(mergedRunVars.colour_code ?? mergedRunVars.colour ?? "B");
  const runPostColour = String(mergedRunVars.post_colour_code ?? runColour);
  const runFinishFamily = String(mergedRunVars.finish_family ?? "standard");
  const mountingType = String(mergedRunVars.mounting_type ?? mergedRunVars.mounting_method ?? "in_ground");
  const postSize = toNumber(mergedRunVars.post_size, 50), isBayg = run.productCode === "BAYG";
  let internalPanelPosts = 0;

  if (!SUPPORTED_PRODUCTS.has(run.productCode)) { warnings.push(`${run.productCode} is available in product search but the local fallback BOM engine currently calculates QSHS, BAYG, and VS only.`); return lines; }

  for (const segment of run.segments) {
    if (segment.segmentKind === "gate_opening") { lines.push(...calculateGateSegment(run, segment, mergedRunVars, warnings, computed)); continue; }
    const vars = { ...mergedRunVars, ...(segment.variables ?? {}) };
    const colour = String(vars.colour_code ?? vars.colour ?? runColour), postColour = String(vars.post_colour_code ?? colour);
    const slatSize = toNumber(vars.slat_size_mm, 65), slatGap = toNumber(vars.slat_gap_mm, 5);
    const finishFamily = String(vars.finish_family ?? runFinishFamily), economySlats = finishFamily === "economy";
    const slatStockLengthMm = economySlats ? 6500 : finishFamily === "alumawood" ? 5800 : 6100;
    const segmentWidthMm = toNumber(segment.segmentWidthMm, 0), targetHeightMm = toNumber(segment.targetHeightMm ?? vars.target_height_mm, 1800);
    if (segmentWidthMm <= 0) continue;

    const slatDesignWidth = designSlatWidthMm(run.productCode, slatSize);
    const numSlats = Math.max(1, Math.floor((targetHeightMm + slatGap - 3) / (slatDesignWidth + slatGap)));
    const actualHeightMm = Math.round(numSlats * (slatDesignWidth + slatGap) - slatGap + 3);
    const baygPanelQty = isBayg ? Math.max(1, Math.round(toNumber(vars.panel_quantity, 1))) : 1;
    const segMaxPanel = clampPostSpacing(vars.max_panel_width_mm, maxPanelWidthForSystem(run.productCode));
    const numPanels = isBayg ? baygPanelQty : Math.max(1, Math.ceil(segmentWidthMm / segMaxPanel));
    const panelWidthMm = isBayg ? segmentWidthMm : segmentWidthMm / numPanels;
    if (!isBayg) internalPanelPosts += Math.max(0, numPanels - 1);

    const slatCutMm = Math.max(1, panelWidthMm - 15), sideFrameCutMm = Math.max(1, actualHeightMm - 3), csrCutMm = Math.max(1, actualHeightMm - 6);
    const numCsrPerPanel = panelWidthMm < 2000 ? 0 : panelWidthMm < 4000 ? 1 : panelWidthMm < 6000 ? 2 : 3;
    const runLeftT = run.leftBoundary?.type as LegacyBoundaryType ?? "product_post", runRightT = run.rightBoundary?.type as LegacyBoundaryType ?? "product_post";
    const leftEff = effectiveLegacyBoundaryType(runLeftT, segment.variables, "left"), rightEff = effectiveLegacyBoundaryType(runRightT, segment.variables, "right");
    const leftSideFrames = leftEff === "product_post" ? 1 : 0, rightSideFrames = rightEff === "product_post" ? 1 : 0;
    const wallFixings = (leftEff === "wall" ? 1 : 0) + (rightEff === "wall" ? 1 : 0);
    const sideFramePieces = (leftSideFrames + rightSideFrames) * numPanels, fSectionPieces = wallFixings * numPanels;
    const slatsPerStock = Math.max(1, Math.floor(slatStockLengthMm / slatCutMm));
    const sideFramesPerStock = Math.max(1, Math.floor(5800 / sideFrameCutMm)), csrPerStock = Math.max(1, Math.floor(5800 / csrCutMm));
    const slatStocks = Math.ceil((numSlats * numPanels) / slatsPerStock);
    const sideFrameStocks = Math.ceil(sideFramePieces / sideFramesPerStock), fSectionStocks = Math.ceil(fSectionPieces / sideFramesPerStock), csrStocks = Math.ceil((numCsrPerPanel * numPanels) / csrPerStock);
    const usesPresetSpacers = String(vars.slat_gap_mode ?? "spacer") !== "custom";
    const spacerEachQty = 2 * Math.max(0, numSlats - 1) * numPanels;
    const spacerPacks = isBayg || !usesPresetSpacers ? 0 : Math.ceil(spacerEachQty / 50);
    const baygSpacers = isBayg ? spacerEachQty : 0;
    const louvreTreatment = run.productCode === "QSHS" && slatSize === 65 && (vars.louvre_treatment === true || vars.louvre_treatment === "true");
    if ((vars.louvre_treatment === true || vars.louvre_treatment === "true") && !louvreTreatment) warnings.push("Louvre treatment is only available for QSHS with 65mm horizontal slats.");
    const slatFixingScrews = louvreTreatment ? 0 : numSlats * 2 * numPanels * 1.01;
    const screwPacks = Math.ceil((slatFixingScrews + numCsrPerPanel * numPanels * 4) / 50);
    const fSectionScrewQty = fSectionPieces > 0 ? Math.max(3, Math.ceil((sideFrameCutMm - 30) / 900) + 1) * 2 * fSectionPieces : 0;

    computed[run.runId] = computed[run.runId] ?? {};
    computed[run.runId][segment.segmentId] = { actual_height_mm: actualHeightMm, num_slats: numSlats, num_panels: numPanels, panel_width_mm: Math.round(panelWidthMm), slat_cut_mm: Math.round(slatCutMm) };

    const base = { runId: run.runId, segmentId: segment.segmentId };
    emit(lines, { ...base, sku: slatSkuFor(finishFamily, economySlats, slatSize, colour), category: "slat", quantity: slatStocks, unit: "length", notes: `${numSlats} slats/panel, ${Math.round(slatCutMm)}mm cuts from ${slatStockLengthMm}mm stock` });
    emit(lines, { ...base, sku: louvreBracketSkuFor(colour), category: "bracket", quantity: louvreTreatment ? numSlats * numPanels : 0, unit: "pack", notes: "Louvre installation brackets" });
    emit(lines, { ...base, sku: quickscreenSkuFor(finishFamily, "SF", colour), category: "side_frame", quantity: sideFrameStocks, unit: "length", notes: `${sideFramePieces} pieces at ${Math.round(sideFrameCutMm)}mm` });
    emit(lines, { ...base, sku: quickscreenSkuFor(finishFamily, "CFC", colour), category: "cfc_cover", quantity: sideFrameStocks, unit: "length", notes: "Auto-added 1:1 with side frame stock" });
    emit(lines, { ...base, sku: "QS-SFC-B", category: "accessory", quantity: sideFramePieces, unit: "each", notes: "Side frame caps" });
    emit(lines, { ...base, sku: csrSkuFor(finishFamily, colour), category: "centre_support_rail", quantity: csrStocks, unit: "length", notes: numCsrPerPanel > 0 ? `${numCsrPerPanel} CSR/panel at ${Math.round(csrCutMm)}mm` : undefined });
    emit(lines, { ...base, sku: `XP-CSRC-${csrCapColour(postColour)}`, category: "accessory", quantity: numCsrPerPanel * numPanels, unit: "each", notes: "CSR caps" });
    emit(lines, { ...base, sku: quickscreenSkuFor(finishFamily, "F", colour), category: "f_section", quantity: fSectionStocks, unit: "length", notes: `${fSectionPieces} wall termination pieces` });
    emit(lines, { ...base, sku: `XP-SCREWS-${standardAccessoryColour(postColour)}`, category: "screw", quantity: Math.ceil(fSectionScrewQty / 100), unit: "pack", notes: "F-section fixing screws" });
    emit(lines, { ...base, sku: `QS-SPACER-${gapCode(slatGap)}-50PK`, category: "accessory", quantity: spacerPacks, unit: "pack", notes: `${spacerEachQty} spacers total` });
    emit(lines, { ...base, sku: `QS-SPACER-${gapCode(slatGap)}`, category: "accessory", quantity: baygSpacers, unit: "each", notes: `${Math.max(0, numSlats - 1)} gaps x 2 ends x ${numPanels} panel(s)` });
    emit(lines, { ...base, sku: "QS-SCREWS-50PK", category: "screw", quantity: screwPacks, unit: "pack", notes: "Screening screws" });
    emitCornerLines(lines, warnings, base, segment.variables, "left", finishFamily, colour, actualHeightMm);
    emitCornerLines(lines, warnings, base, segment.variables, "right", finishFamily, colour, actualHeightMm);
    if (panelWidthMm > 2600) warnings.push(`Panel width ${Math.round(panelWidthMm)}mm exceeds recommended 2600mm; split into more panels.`);
  }

  const postCount = isBayg ? 0 : runPostBoundaryCount(run) + internalPanelPosts;
  const postHeight = toNumber(firstFenceSeg?.targetHeightMm ?? mergedRunVars.target_height_mm, 1800);
  emitPostLines(lines, run, firstFenceSeg?.segmentId ?? run.runId, postCount, runFinishFamily, postSize, postHeight, runPostColour, mountingType);
  emitPostFixingLines(lines, run, firstFenceSeg?.segmentId ?? run.runId, postCount, mergedRunVars, mountingType);
  return lines;
}

export function calculateLocalBom(payload: CanonicalPayload, pricingTier: PricingTier = "tier1"): LocalBomResult {
  const warnings: string[] = [], errors: string[] = [], assumptions: string[] = [], computed: LocalBomResult["computed"] = {};
  const scopeBySegmentId = new Map<string, ScopeInfo>();

  payload.runs.forEach((run, runIndex) => {
    let gateIndex = 0;
    run.segments.forEach((segment) => {
      if (segment.segmentKind === "gate_opening") { gateIndex += 1; scopeBySegmentId.set(segment.segmentId, { scopeKind: "gate", scopeId: segment.segmentId, scopeLabel: `R${runIndex + 1} G${gateIndex}`, productCode: "QS_GATE" }); return; }
      scopeBySegmentId.set(segment.segmentId, { scopeKind: "fence_run", scopeId: run.runId, scopeLabel: `Run ${runIndex + 1}`, productCode: run.productCode });
    });
  });

  const runResults = payload.runs.map((run, index) => ({ runId: run.runId, label: `Run ${index + 1} - ${run.productCode}`, productCode: run.productCode, items: calculateScreenRun(payload, run, warnings, computed) }));
  const lines = aggregateBomLinesWithSources(runResults.flatMap((r) => r.items), scopeBySegmentId, (l) => `${l.sku}__${l.unit ?? getComponent(l.sku)?.unit ?? "each"}`, pricingTier);
  lines.forEach((l) => { if (l.unitPrice === 0) assumptions.push(`No local price found for SKU ${l.sku}.`); });
  const pricedRunResults = runResults.map((run) => ({ runId: run.runId, items: aggregateBomLinesWithSources(run.items, scopeBySegmentId, (l) => `${l.sku}__${l.runId}`, pricingTier) }));
  const subtotal = roundMoney(lines.reduce((s, l) => s + l.lineTotal, 0)), gst = roundMoney(subtotal * 0.1), grandTotal = roundMoney(subtotal + gst);
  const gateItems = lines.filter((l) => l.sources?.some((s) => s.scopeKind === "gate"));
  return { lines, runResults: pricedRunResults, gateItems, totals: { subtotal, gst, grandTotal }, warnings, errors, assumptions, computed, pricingTier, generatedAt: new Date().toISOString() };
}

// ─── Suggested accessories ────────────────────────────────────────────────────

const POST_COLOURS = new Set(["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"]);
const CSR_PLATE_COLOURS = new Set(["B", "BS", "D", "G", "M", "MN", "S", "SM", "W"]);
const LIGHT_POST_PLUG_COLOURS = new Set(["W", "SM", "P", "PB", "S"]);
const MONUMENT_POST_PLUG_COLOURS = new Set(["MN", "BS", "D", "G", "M"]);
const DIAMOND_REVOLUTION_KIT_SKUS = ["REV-CD-2S", "REV-STAND", "REV-TEMPLATE", "REV-LEVEL", "REV-GUARD", "REV-BASE", "REV-BIT-08", "REV-BIT-10", "REV-BIT-12", "REV-BIT-14", "REV-BIT-20", "REV-BIT-42", "REV-BIT-53", "REV-BIT-63", "REV-BIT-76", "REV-BIT-83", "REV-BIT-89"] as const;

function diamondRevolutionKitTotal(tier: PricingTier): number { return DIAMOND_REVOLUTION_KIT_SKUS.reduce((sum, sku) => sum + priceForSku(sku, 1, tier), 0); }

function postColourFromVars(vars: Record<string, unknown>): string {
  const explicit = String(vars.post_colour_code ?? "");
  if (POST_COLOURS.has(explicit)) return explicit;
  const fence = String(vars.colour_code ?? vars.colour ?? "B");
  return POST_COLOURS.has(fence) ? fence : "MN";
}

function csrPlateSku(vars: Record<string, unknown>): string {
  const ff = String(vars.finish_family ?? "standard"), fc = String(vars.colour_code ?? vars.colour ?? "B"), pc = postColourFromVars(vars);
  if (ff === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(fc)) return "AW-BTP-TR";
  return `XP-BTP-${CSR_PLATE_COLOURS.has(pc) ? pc : "MN"}`;
}

function accCsrSku(vars: Record<string, unknown>): string {
  const ff = String(vars.finish_family ?? "standard"), fc = String(vars.colour_code ?? vars.colour ?? "B"), pc = postColourFromVars(vars);
  if (ff === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(fc)) return `AW-5800-CSR-${fc}`;
  return `XP-5800-CSR-${pc}`;
}

function accCsrCapSku(vars: Record<string, unknown>): string { return `XP-CSRC-${CSR_PLATE_COLOURS.has(postColourFromVars(vars)) ? postColourFromVars(vars) : "MN"}`; }

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

function componentSuggestion(sku: string, quantity: number, category: SuggestedAccessory["category"], reason: string, fallbackDesc: string): SuggestedAccessory {
  const comp = getComponent(sku);
  return { id: `suggested-${sku}`, sku, description: comp?.description ?? comp?.name ?? fallbackDesc, quantity: Math.max(1, Math.ceil(quantity)), unitPrice: comp?.default_price ?? 0, category, reason, priced: typeof comp?.default_price === "number" && comp.default_price > 0 };
}

export function suggestAccessories(payload: CanonicalPayload, bomLines: BOMLineItem[], tier: PricingTier): SuggestedAccessory[] {
  const suggestions: SuggestedAccessory[] = [];
  const bomSkus = new Set(bomLines.map((l) => l.sku));

  for (const run of payload.runs) {
    const vars: Record<string, unknown> = { ...payload.variables, ...(run.variables ?? {}) };
    const postCount = postCountForRun(run);
    const mountingType = String(vars.mounting_type ?? vars.mounting_method ?? "in_ground");
    const postSize = Number(vars.post_size ?? 50), postColour = postColourFromVars(vars);
    const finishFamily = String(vars.finish_family ?? "standard");
    const firstFenceSeg = run.segments.find((s) => s.segmentKind !== "gate_opening");
    const postHeight = Number(firstFenceSeg?.targetHeightMm ?? vars.target_height_mm ?? 1800);
    const gateCount = run.segments.filter((s) => s.segmentKind === "gate_opening").length;

    if (gateCount > 0) suggestions.push(componentSuggestion("LL-GH", gateCount, "catalogue_gap", "Optional D&D black polymer side-fixing gate handle, suggested once per gate.", "D&D black polymer side-fixing gate handle"));
    if (postCount <= 0) continue;

    if (mountingType === "core_drill") {
      const dressRingSku = postSize === 65 ? `XP-65DR-${postColour}` : `XP-DR-${postColour}`;
      if (!bomSkus.has(dressRingSku)) suggestions.push(componentSuggestion(dressRingSku, postCount, "post_accessory", "Dress rings suit core-drilled posts.", "Core-drill dress ring"));
      suggestions.push(componentSuggestion(postPlugSku(vars), Math.ceil(postCount / 4), "post_accessory", "Post plugs cap fixing-hole posts.", "32mm OD post plug 4 pack"));
      suggestions.push(componentSuggestion("SOUD-EPOFIX", 1, "fixing", "Epoxy option for core-drilled post fixing.", "Soudal Epofix epoxy"));
      if (postCount > 5) {
        const kitTotal = diamondRevolutionKitTotal(tier);
        const kitReason = kitTotal > 0 ? `Need a core drill? Full Diamond Revolution kit totals about $${kitTotal.toFixed(2)} ex-GST.` : "Need a core drill? We sell a full Diamond Revolution kit for larger core-drilled jobs.";
        for (const sku of DIAMOND_REVOLUTION_KIT_SKUS) suggestions.push(componentSuggestion(sku, 1, "catalogue_gap", kitReason, "Diamond Revolution core drilling kit item"));
      }
    }

    if (mountingType === "base_plate") {
      const bpSku = postSize === 65 ? `XP-65BP-SET-${postColour}` : `XP-BP-SET-${postColour}`;
      const coverSku = postSize === 65 ? `XP-65DC-2P-${postColour}` : `XP-DC-2P-${postColour}`;
      if (!bomSkus.has(bpSku)) suggestions.push(componentSuggestion(bpSku, postCount, "post_accessory", "Base plate sets suit base-plate-mounted posts.", "Base plate set"));
      if (!bomSkus.has(coverSku)) suggestions.push(componentSuggestion(coverSku, postCount, "post_accessory", "Cover rings tidy up base-plate-mounted posts.", "Base plate cover ring"));
      suggestions.push(componentSuggestion(postPlugSku(vars), Math.ceil(postCount / 4), "post_accessory", "Post plugs cap fixing-hole posts.", "32mm OD post plug 4 pack"));
      suggestions.push(componentSuggestion("ULTRALOC-3242", 1, "fixing", "Threadlocker for base-plate mounting fixings.", "Ultraloc 3242 threadlocker"));
      if (String(vars.base_plate_substrate ?? "concrete") === "concrete") suggestions.push(componentSuggestion("SOUD-CA1400", postCount, "fixing", "For damp or soft concrete; provides pressure-free anchor fixing.", "Soudafix chemical anchor"));
    }

    if (finishFamily !== "alumawood") {
      const longPostSku = postSize === 65 ? `XP-6000-65HD-${postColour}` : `XP-6000-FP-${postColour}`;
      const cutLengthMm = mountingType === "in_ground" && postHeight <= 1200 ? 1800 : Math.min(6000, Math.max(1, postHeight));
      suggestions.push(componentSuggestion(longPostSku, Math.ceil((postCount * cutLengthMm) / 6000), "catalogue_gap", "Optional: full-length post stock if the installer wants to cut posts on site.", "Full-length post stock"));
    }

    const baseMaxPanel = clampPostSpacing(vars.max_panel_width_mm, maxPanelWidthForSystem(run.productCode));
    const panelCounts = run.segments.filter((s) => s.segmentKind !== "gate_opening").map((seg) => {
      const maxP = clampPostSpacing(seg.variables?.max_panel_width_mm, baseMaxPanel);
      const w = Number(seg.segmentWidthMm ?? 0), panels = w > 0 ? Math.max(1, Math.ceil(w / maxP)) : 0;
      return { panels, panelWidthMm: panels > 0 ? w / panels : 0 };
    });

    if (run.productCode === "VS") {
      const vertPanelCount = panelCounts.reduce((s, i) => s + i.panels, 0);
      suggestions.push(componentSuggestion("XP-FOOT-ADJ", vertPanelCount, "post_accessory", "Suggested for vertical slat panels as a 100mm adjustable support foot.", "100mm adjustable support foot"));
    } else {
      const csrPlateCount = panelCounts.reduce((s, i) => { const n = i.panelWidthMm < 2000 ? 0 : i.panelWidthMm < 4000 ? 1 : i.panelWidthMm < 6000 ? 2 : 3; return s + n * i.panels * 2; }, 0);
      if (csrPlateCount > 0) suggestions.push(componentSuggestion(csrPlateSku(vars), csrPlateCount, "post_accessory", "Optional: centre support rail top/base plates.", "Centre support rail top/base plate"));
    }

    const shortSlidingGates = run.segments.filter((s) => s.segmentKind === "gate_opening" && String(s.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement] ?? "") === "sliding" && Number(s.segmentWidthMm ?? 0) <= 3000);
    if (shortSlidingGates.length > 0) {
      suggestions.push(componentSuggestion(accCsrSku(vars), shortSlidingGates.length, "catalogue_gap", "Optional: centre support rail for sliding gates at or under 3000mm.", "Optional sliding gate centre support rail"));
      suggestions.push(componentSuggestion(accCsrCapSku(vars), shortSlidingGates.length, "catalogue_gap", "Optional: cap to finish the sliding gate centre support rail.", "Optional centre support rail cap"));
      suggestions.push(componentSuggestion(csrPlateSku(vars), shortSlidingGates.length * 2, "catalogue_gap", "Optional: top and bottom plates if adding a sliding gate centre support rail.", "Optional centre support rail top/base plate"));
    }
  }

  const finishColours = new Set<string>([String(payload.variables.colour_code ?? "B"), postColourFromVars(payload.variables)]);
  for (const run of payload.runs) { for (const seg of run.segments) { if (seg.segmentKind !== "gate_opening") continue; const gc = String(seg.variables?.[GATE_SEGMENT_STUB_KEYS.colourCode] ?? ""); if (gc) finishColours.add(gc); } }
  for (const colour of finishColours) suggestions.push(componentSuggestion(`PAINT-${colour}`, 1, "finish", "Suggested for colour-matched touch-ups after cutting and installation.", `Touch up paint - ${colour}`));

  if (bomSkus.has("SOUD-CA1400")) suggestions.push(componentSuggestion("SOUD-GUN", 1, "fixing", "Heavy duty cartridge gun for SOUD-CA1400.", "Soudafix cartridge gun"));
  if (bomSkus.has("QSG-JOINER65-4PK") || bomSkus.has("QSG-JOINER90-4PK")) suggestions.push(componentSuggestion("DB-PH3", 1, "fixing", "Phillips #3 driver bit suits QuickScreen gate joiner block screws.", "Phillips #3 driver bit"));
  if (bomSkus.has("AR-SCR-BR-50PK")) suggestions.push(componentSuggestion("DB-SQ3.4", 1, "fixing", "Square #3.4 driver bit suits gate rail screws.", "Square #3.4 driver bit"));
  if (payload.runs.length > 0) suggestions.push(componentSuggestion("FB-V60", 1, "fixing", "General-purpose glazing silicone for finishing and sealing on site.", "Bostik V60 glazing silicone"));

  const deduped = new Map<string, SuggestedAccessory>();
  for (const s of suggestions) { const key = s.sku ?? s.id; const ex = deduped.get(key); if (ex) deduped.set(key, { ...ex, quantity: ex.quantity + s.quantity }); else deduped.set(key, s); }
  return [...deduped.values()];
}

// ─── Gate hardware hints ──────────────────────────────────────────────────────

export function computeGateHardwareHints(payload: CanonicalPayload): Record<string, GateHardwareHint> {
  const hints: Record<string, GateHardwareHint> = {};
  for (const run of payload.runs) {
    const mergedVars: Record<string, unknown> = { ...payload.variables, ...(run.variables ?? {}) };
    for (const segment of run.segments) {
      if (segment.segmentKind !== "gate_opening") continue;
      const vars = { ...mergedVars, ...(segment.variables ?? {}) };
      const movement = gateMovementOrDefault(vars[GATE_SEGMENT_STUB_KEYS.gateMovement]);
      if (movement === "sliding") continue;
      const slatSize = Number(vars[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? vars.slat_size_mm ?? 65);
      const slatGap = Number(vars[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? vars.slat_gap_mm ?? 9);
      const gateHeightMm = Number(segment.targetHeightMm ?? vars[GATE_SEGMENT_STUB_KEYS.gateHeightMm] ?? mergedVars.target_height_mm ?? 1800);
      const openingWidthMm = Number(segment.segmentWidthMm ?? 900);
      const colour = String(vars[GATE_SEGMENT_STUB_KEYS.colourCode] ?? vars.colour_code ?? "B");
      const whiteFinish = isWhiteHardwareFinish(colour), finishFamily = String(vars.finish_family ?? "standard");
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
