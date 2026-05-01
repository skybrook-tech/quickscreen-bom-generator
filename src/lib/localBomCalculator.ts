import type { CanonicalPayload, CanonicalRun } from "../types/canonical.types";
import type { BOMLineItem, PricingTier } from "../types/bom.types";
import {
  getComponent,
  localPricingRules,
  type LocalPricingRule,
} from "./localSeedData";
import { tierForSkuQuantity } from "./localPriceBreaks";
import {
  GATE_SEGMENT_STUB_KEYS,
  cornerDegreesFromVars,
  effectiveLegacyBoundaryType,
  type LegacyBoundaryType,
} from "./segmentTermination";
import { maxPanelWidthForSystem } from "./productOptionRules";

type LocalBomResult = {
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

type QtyLine = {
  sku: string;
  category: string;
  quantity: number;
  unit?: string;
  notes?: string;
  runId: string;
  segmentId: string;
};

const SUPPORTED_PRODUCTS = new Set(["QSHS", "BAYG", "VS", "XPL"]);
const STANDARD_COLOURS = new Set(["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"]);
const ALUMAWOOD_CORE_COLOURS = new Set(["KWI", "WRC"]);
const CSR_CAP_COLOURS = new Set(["B", "G", "MN", "S", "SM", "W"]);
const COLOUR_NAMES: Record<string, string> = {
  B: "Black Satin",
  MN: "Monument Matt",
  G: "Woodland Grey Matt",
  SM: "Surfmist Matt",
  W: "Pearl White Gloss",
  BS: "Basalt Satin",
  D: "Dune Satin",
  M: "Mill",
  P: "Primrose",
  PB: "Paperbark",
  S: "Palladium Silver Pearl",
  KWI: "Kwila",
  WRC: "Western Red Cedar",
  IG: "Island Grey",
  TR: "Terrain",
};

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function gapCode(gapMm: number): string {
  return `${String(gapMm).padStart(2, "0")}MM`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function designSlatWidthMm(productCode: string, slatSize: number): number {
  if (productCode === "QSHS" || productCode === "BAYG") {
    return slatSize === 90 ? 90.3 : 65.3;
  }
  return slatSize;
}

function standardAccessoryColour(colour: string): string {
  return STANDARD_COLOURS.has(colour) ? colour : "MN";
}

function csrCapColour(colour: string): string {
  return CSR_CAP_COLOURS.has(colour) ? colour : "MN";
}

function slatSkuFor(finishFamily: string, economySlats: boolean, slatSize: number, colour: string): string {
  if (economySlats) return `XP-6500-E65-${colour}`;
  if (finishFamily === "alumawood") {
    return slatSize === 90 ? `AWQS-5800-S90-${colour}` : `AW-5800-S65-${colour}`;
  }
  return slatSize === 90 ? `QS-6100-S90-${colour}` : `XP-6100-S65-${colour}`;
}

function quickscreenSkuFor(finishFamily: string, family: "SF" | "CFC" | "F", colour: string): string {
  const prefix = finishFamily === "alumawood" ? "AWQS" : "QS";
  return `${prefix}-5800-${family}-${colour}`;
}

function verticalRailSkuFor(colour: string): string {
  return `QS-5000-HORIZ-${colour}`;
}

function csrSkuFor(finishFamily: string, colour: string): string {
  return finishFamily === "alumawood" ? `AW-5800-CSR-${colour}` : `XP-5800-CSR-${colour}`;
}

function angleAdapterSkuFor(finishFamily: string, colour: string): string {
  if (finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(colour)) {
    return `AW-5800-135-${colour}`;
  }
  return `XP-6000-135-${colour}`;
}

function nearestNamedCorner(degrees: number | undefined): 90 | 135 | undefined {
  if (!degrees) return undefined;
  return Math.abs(degrees - 135) < Math.min(Math.abs(degrees - 90), Math.abs(degrees - 180))
    ? 135
    : 90;
}

function postSkuFor(
  finishFamily: string,
  postSize: number,
  postHeight: number,
  postColour: string,
  mountingType: string,
): string {
  if (finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(postColour)) {
    if (postSize === 65) return postHeight > 2400 ? `AW-5800-65HD-${postColour}` : `AW-2400-65HD-${postColour}`;
    return postHeight > 2400 ? `AW-5800-FP-${postColour}` : `AW-2400-FP-${postColour}`;
  }
  if (mountingType === "in_ground" && postSize === 50 && postHeight <= 1200) {
    const shortPostSku = `XP-1800-FP-${postColour}`;
    if (getComponent(shortPostSku)) return shortPostSku;
  }
  if (postSize === 65) return postHeight > 2400 ? `XP-6000-65HD-${postColour}` : `XP-2400-65HD-${postColour}`;
  return postHeight > 2400 ? `XP-6000-FP-${postColour}` : `XP-2400-FP-${postColour}`;
}

function postAccessorySkuFor(
  finishFamily: string,
  kind: "top_plate" | "base_plate" | "domical_cover" | "dress_ring",
  postSize: number,
  postColour: string,
): string {
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

function matchesPriceRule(rule: string | null | undefined, qty: number): boolean {
  if (!rule) return true;
  const normalized = rule.replace(/\s+/g, " ").trim().toLowerCase();
  const match = normalized.match(/^qty\s*(>=|>|<=|<|==|=)\s*(\d+(?:\.\d+)?)$/);
  if (!match) return false;
  const operator = match[1];
  const threshold = Number(match[2]);
  switch (operator) {
    case ">=":
      return qty >= threshold;
    case ">":
      return qty > threshold;
    case "<=":
      return qty <= threshold;
    case "<":
      return qty < threshold;
    case "==":
    case "=":
      return qty === threshold;
    default:
      return false;
  }
}

export function priceForSku(sku: string, qty: number): number {
  const explicitRules = localPricingRules
    .filter((rule) => rule.sku === sku && Boolean(rule.rule))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const explicitMatch = explicitRules.find((rule) => matchesPriceRule(rule.rule, qty));
  if (explicitMatch) return explicitMatch.price;

  const tier = tierForSkuQuantity(sku, qty);
  const rules = localPricingRules
    .filter((rule) => rule.sku === sku && rule.tier_code === tier && !rule.rule)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const matched = rules.find((rule) => matchesPriceRule(rule.rule, qty));
  if (matched) return matched.price;

  const tier1 = localPricingRules.find(
    (rule: LocalPricingRule) =>
      rule.sku === sku &&
      rule.tier_code === "tier1" &&
      matchesPriceRule(rule.rule, qty),
  );
  if (tier1) return tier1.price;

  return getComponent(sku)?.default_price ?? 0;
}

function describeSku(sku: string, fallbackCategory: string): string {
  const component = getComponent(sku);
  const skuParts = sku.split("-");
  const colourCode = skuParts[skuParts.length - 1] ?? "";
  const colourSuffix = COLOUR_NAMES[colourCode] ? ` - ${COLOUR_NAMES[colourCode]}` : "";
  if (sku.startsWith("XP-6500-E65-")) {
    return `65mm Economy slat, no centre web, 6500mm stock${colourSuffix}`;
  }
  const description = component?.description ?? component?.name ?? `${fallbackCategory} - ${sku}`;
  return colourSuffix && !description.toLowerCase().includes(COLOUR_NAMES[colourCode].toLowerCase())
    ? `${description}${colourSuffix}`
    : description;
}

function emit(
  lines: QtyLine[],
  line: QtyLine,
): void {
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) return;
  lines.push({ ...line, quantity: Math.ceil(line.quantity) });
}

function runPostBoundaryCount(run: CanonicalRun): number {
  return (
    (run.leftBoundary.type === "product_post" ? 1 : 0) +
    (run.rightBoundary.type === "product_post" ? 1 : 0) +
    run.corners.length
  );
}

function emitPostLines(
  lines: QtyLine[],
  run: CanonicalRun,
  segmentId: string,
  postCount: number,
  finishFamily: string,
  postSize: number,
  postHeight: number,
  postColour: string,
  mountingType: string,
): void {
  if (postCount <= 0) return;

  const postSku = postSkuFor(finishFamily, postSize, postHeight, postColour, mountingType);
  emit(lines, {
    runId: run.runId,
    segmentId,
    sku: postSku,
    category: "post",
    quantity: postCount,
    unit: "each",
    notes: `${postSize}mm posts from run boundaries/corners and internal panel joins`,
  });
  if (postHeight > 2400) {
    emit(lines, {
      runId: run.runId,
      segmentId,
      sku: postAccessorySkuFor(finishFamily, "top_plate", postSize, postColour),
      category: "post_accessory",
      quantity: postCount,
      unit: "each",
      notes: "Top plates for long posts",
    });
  }
  if (mountingType === "base_plate") {
    emit(lines, {
      runId: run.runId,
      segmentId,
      sku: postAccessorySkuFor(finishFamily, "base_plate", postSize, postColour),
      category: "post_accessory",
      quantity: postCount,
      unit: "each",
      notes: "Base plate sets",
    });
    emit(lines, {
      runId: run.runId,
      segmentId,
      sku: postAccessorySkuFor(finishFamily, "domical_cover", postSize, postColour),
      category: "post_accessory",
      quantity: postCount,
      unit: "each",
      notes: "Domical covers",
    });
  }
  if (mountingType === "core_drill") {
    emit(lines, {
      runId: run.runId,
      segmentId,
      sku: postAccessorySkuFor(finishFamily, "dress_ring", postSize, postColour),
      category: "post_accessory",
      quantity: postCount,
      unit: "each",
      notes: "Dress rings",
    });
  }
}

function colourSkuSuffix(colour: string): string {
  return STANDARD_COLOURS.has(colour) || colour === "P" ? colour : "MN";
}

function gateBladeSkuFor(
  finishFamily: string,
  economySlats: boolean,
  slatSize: number,
  colour: string,
  verticalBuild = false,
): string {
  if (verticalBuild) return slatSkuFor(finishFamily, economySlats, slatSize, colour);
  if (slatSize === 90) return slatSkuFor(finishFamily, economySlats, 90, colour);
  return `XP-6100-S65-${colourSkuSuffix(colour)}`;
}

function gateRailSkuFor(slatSize: number, colour: string): string {
  return `QSG-4800-RAIL${slatSize === 90 ? "90" : "65"}-${colourSkuSuffix(colour)}`;
}

function slidingGateTopRailSkuFor(slatSize: number, colour: string, verticalBuild: boolean): string {
  const railSize = verticalBuild ? 65 : slatSize === 90 ? 90 : 65;
  return `QSG-S-6100-TR${railSize}-${colourSkuSuffix(colour)}`;
}

function slidingGateBottomRailSkuFor(colour: string): string {
  return `QSG-S-6100-BR-${colourSkuSuffix(colour)}`;
}

function gateSideFrameSkuFor(colour: string): string {
  return `QSG-4200-GSF50-${colourSkuSuffix(colour)}`;
}

function gateInfillSkuFor(verticalBuild: boolean, colour: string): string {
  return `${verticalBuild ? "QSG-4200-CINF" : "QSG-4800-INF"}-${colourSkuSuffix(colour)}`;
}

function gateScrewCoverSkuFor(colour: string): string {
  return `QSG-4200-COVER-${colourSkuSuffix(colour)}`;
}

function gateTopCapSkuFor(colour: string): string {
  return `QSG-GFC-50X50-${colourSkuSuffix(colour)}`;
}

function gateSpacerSkuFor(slatGap: number): string {
  const roundedGap = Math.round(slatGap);
  const gap =
    roundedGap <= 5 ? "05" :
    roundedGap <= 9 ? "09" :
    roundedGap <= 12 ? "12" :
    roundedGap <= 15 ? "15" :
    roundedGap <= 20 ? "20" :
    "30";
  return `QS-SPACER-${gap}MM-50PK`;
}

function stockLengthForSlidingTrack(sku: string): number {
  return sku.includes("3000") ? 3000 : 6000;
}

const DISCONTINUED_XP_GATE_PREFIXES = [
  "XP-4200-GSF",
  "XP-4200-GI",
  "XP-GFC",
  "XP-SCREWSGF",
  "XP-6100-GB65",
  "XP-GKIT",
  "XP-XBAT-4200-INF",
  "XP-6100-HD6545",
  "XP-4200-GSTOP",
  "XP-LBOX-",
  "XP-HDL-",
];

function isDiscontinuedXpGateSku(sku: string): boolean {
  return DISCONTINUED_XP_GATE_PREFIXES.some((prefix) => sku.startsWith(prefix));
}

function knownSelectedSku(value: unknown): string | undefined {
  const sku = String(value ?? "");
  if (!sku || sku === "none" || sku === "auto") return undefined;
  if (isDiscontinuedXpGateSku(sku)) return undefined;
  return sku;
}

function emitQsgGateFrameLines(
  lines: QtyLine[],
  base: { runId: string; segmentId: string },
  slatSize: number,
  colour: string,
  leafCount: number,
  frameCutMm: number,
  railCutMm: number,
  verticalBuild: boolean,
  numGateBlades: number,
  slatGap: number,
): void {
  const sideFramesPerStock = Math.max(1, Math.floor(4200 / frameCutMm));
  const sideFramePieces = 2 * leafCount;
  const railScrewPacks = Math.ceil((4 * leafCount) / 50);
  const infillStockLength = verticalBuild ? 4200 : 4800;
  const infillCutMm = verticalBuild ? frameCutMm : railCutMm;
  const infillsPerStock = Math.max(1, Math.floor(infillStockLength / infillCutMm));
  const coverPieces = 2 * leafCount;
  const coversPerStock = Math.max(1, Math.floor(4200 / frameCutMm));
  const spacerPacks = Math.ceil((Math.max(0, numGateBlades - 1) * 2 * leafCount) / 50);
  const waferScrewPacks = Math.ceil((numGateBlades * 2 * leafCount) / 50);
  emit(lines, {
    ...base,
    sku: gateSideFrameSkuFor(colour),
    category: "gate_side_frame",
    quantity: Math.ceil(sideFramePieces / sideFramesPerStock),
    unit: "length",
    notes: `${sideFramePieces} QSG side-frame pieces, ${Math.round(frameCutMm)}mm cuts from 4200mm stock`,
  });
  emit(lines, {
    ...base,
    sku: slatSize === 90 ? "QSG-JOINER90-4PK" : "QSG-JOINER65-4PK",
    category: "hardware",
    quantity: leafCount,
    unit: "pack",
    notes: `${slatSize === 90 ? "90mm" : "65mm"} joiner blocks for QSG gate rails`,
  });
  emit(lines, {
    ...base,
    sku: gateScrewCoverSkuFor(colour),
    category: "hardware",
    quantity: Math.ceil(coverPieces / coversPerStock),
    unit: "length",
    notes: `Gate screw cover, ${Math.round(frameCutMm)}mm cuts from 4200mm stock`,
  });
  emit(lines, {
    ...base,
    sku: "AR-SCR-BR-50PK",
    category: "screw",
    quantity: railScrewPacks,
    unit: "pack",
    notes: "QSG rail screws for top and bottom rails",
  });
  emit(lines, {
    ...base,
    sku: gateTopCapSkuFor(colour),
    category: "accessory",
    quantity: 4 * leafCount,
    unit: "each",
    notes: "Gate top caps for 50mm x 50mm side frame, 4 per leaf",
  });
  emit(lines, {
    ...base,
    sku: gateInfillSkuFor(verticalBuild, colour),
    category: "accessory",
    quantity: Math.ceil((2 * leafCount) / infillsPerStock),
    unit: "length",
    notes: `${verticalBuild ? "Channel infill" : "Gate infill"} for gate frame void, ${Math.round(infillCutMm)}mm cuts from ${infillStockLength}mm stock`,
  });
  emit(lines, {
    ...base,
    sku: gateSpacerSkuFor(slatGap),
    category: "spacer",
    quantity: spacerPacks,
    unit: "pack",
    notes: `${Math.max(0, numGateBlades - 1)} gaps/leaf, one spacer at each end of each gap`,
  });
  emit(lines, {
    ...base,
    sku: "QS-SCREWS-50PK",
    category: "screw",
    quantity: waferScrewPacks,
    unit: "pack",
    notes: "16mm wafer screws for fixing slats to gate rails/side frames",
  });
}

function emitQsgSlidingGateFrameLines(
  lines: QtyLine[],
  base: { runId: string; segmentId: string },
  slatSize: number,
  colour: string,
  frameCutMm: number,
  railCutMm: number,
  verticalBuild: boolean,
  numGateBlades: number,
  slatGap: number,
): void {
  const sideFramesPerStock = Math.max(1, Math.floor(4200 / frameCutMm));
  const sideFramePieces = 2;
  const coverPieces = 2;
  const coversPerStock = Math.max(1, Math.floor(4200 / frameCutMm));
  const infillStockLength = verticalBuild ? 4200 : 4800;
  const infillPieces = 2;
  const infillsPerStock = Math.max(1, Math.floor(infillStockLength / frameCutMm));
  const railsPerStock = Math.max(1, Math.floor(6100 / railCutMm));
  const railSize = verticalBuild ? 65 : slatSize === 90 ? 90 : 65;
  const spacerPacks = Math.ceil((Math.max(0, numGateBlades - 1) * 2) / 50);
  const waferScrewPacks = Math.ceil((numGateBlades * 2) / 50);

  emit(lines, {
    ...base,
    sku: gateSideFrameSkuFor(colour),
    category: "gate_side_frame",
    quantity: Math.ceil(sideFramePieces / sideFramesPerStock),
    unit: "length",
    notes: `${sideFramePieces} QSG sliding side-frame pieces, ${Math.round(frameCutMm)}mm cuts from 4200mm stock`,
  });
  emit(lines, {
    ...base,
    sku: slidingGateTopRailSkuFor(slatSize, colour, verticalBuild),
    category: "gate_rail",
    quantity: Math.ceil(1 / railsPerStock),
    unit: "length",
    notes: `${railSize}mm sliding gate top rail, ${Math.round(railCutMm)}mm cut from 6100mm stock`,
  });
  emit(lines, {
    ...base,
    sku: slidingGateBottomRailSkuFor(colour),
    category: "gate_rail",
    quantity: Math.ceil(1 / railsPerStock),
    unit: "length",
    notes: `Sliding gate bottom rail, ${Math.round(railCutMm)}mm cut from 6100mm stock`,
  });
  emit(lines, {
    ...base,
    sku: railSize === 90 ? "QSG-JOINER90-4PK" : "QSG-JOINER65-4PK",
    category: "hardware",
    quantity: 1,
    unit: "pack",
    notes: `${railSize}mm joiner blocks for sliding gate rails`,
  });
  emit(lines, {
    ...base,
    sku: gateScrewCoverSkuFor(colour),
    category: "hardware",
    quantity: Math.ceil(coverPieces / coversPerStock),
    unit: "length",
    notes: `Gate screw cover, ${Math.round(frameCutMm)}mm cuts from 4200mm stock`,
  });
  emit(lines, {
    ...base,
    sku: gateInfillSkuFor(verticalBuild, colour),
    category: "accessory",
    quantity: Math.ceil(infillPieces / infillsPerStock),
    unit: "length",
    notes: `${verticalBuild ? "Gate channel infill" : "Gate infill"} for side-frame void, ${Math.round(frameCutMm)}mm cuts from ${infillStockLength}mm stock`,
  });
  emit(lines, {
    ...base,
    sku: "AR-SCR-BR-50PK",
    category: "screw",
    quantity: 1,
    unit: "pack",
    notes: "QSG rail screws for sliding top and bottom rails",
  });
  emit(lines, {
    ...base,
    sku: gateSpacerSkuFor(slatGap),
    category: "spacer",
    quantity: spacerPacks,
    unit: "pack",
    notes: `${Math.max(0, numGateBlades - 1)} gaps, one spacer at each end of each gap`,
  });
  emit(lines, {
    ...base,
    sku: "QS-SCREWS-50PK",
    category: "screw",
    quantity: waferScrewPacks,
    unit: "pack",
    notes: "16mm wafer screws for fixing slats to sliding gate rails/side frames",
  });
  emit(lines, {
    ...base,
    sku: gateTopCapSkuFor(colour),
    category: "accessory",
    quantity: 2,
    unit: "each",
    notes: "Gate top caps for the two sliding gate side frames",
  });
}

function calculateGateSegment(
  run: CanonicalRun,
  segment: CanonicalRun["segments"][number],
  mergedRunVars: Record<string, unknown>,
  warnings: string[],
  computed: LocalBomResult["computed"],
): QtyLine[] {
  const lines: QtyLine[] = [];
  const vars = { ...mergedRunVars, ...(segment.variables ?? {}) };
  const movement = String(vars[GATE_SEGMENT_STUB_KEYS.gateMovement] ?? "single_swing");
  const build = String(
    vars[GATE_SEGMENT_STUB_KEYS.gateBuild] ??
      (run.productCode === "VS" ? "qsg_hinged_vertical" : "qsg_hinged_horizontal"),
  );
  const colour = String(vars[GATE_SEGMENT_STUB_KEYS.colourCode] ?? vars.colour_code ?? "B");
  const slatGap = toNumber(vars[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? vars.slat_gap_mm, 9);
  const slatSize = toNumber(vars[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? vars.slat_size_mm, 65);
  const finishFamily = String(vars.finish_family ?? "standard");
  const economySlats = finishFamily === "economy";
  const openingWidthMm = toNumber(segment.segmentWidthMm, 900);
  const gateHeightMm = toNumber(
    segment.targetHeightMm ?? vars[GATE_SEGMENT_STUB_KEYS.gateHeightMm],
    toNumber(mergedRunVars.target_height_mm, 1800),
  );
  const leafCount = movement === "double_swing" ? 2 : 1;
  const leafWidthMm = Math.max(1, openingWidthMm / leafCount);
  const base = { runId: run.runId, segmentId: segment.segmentId };
  const verticalBuild = build.includes("vertical");

  computed[run.runId] = computed[run.runId] ?? {};
  computed[run.runId][segment.segmentId] = {
    ...(computed[run.runId][segment.segmentId] ?? {}),
    gate_movement: movement,
    gate_build: build,
    gate_leaf_count: leafCount,
    gate_leaf_width_mm: Math.round(leafWidthMm),
    gate_height_mm: Math.round(gateHeightMm),
  };

  if (movement === "sliding") {
    const bladeCutMm = verticalBuild ? Math.max(1, gateHeightMm - 224) : Math.max(1, openingWidthMm - 86);
    const railCutMm = Math.max(1, openingWidthMm - 80);
    const frameCutMm = Math.max(1, gateHeightMm - 31);
    const designSlatSize = slatSize === 90 ? 90 : 65;
    const numGateBlades = Math.max(
      1,
      verticalBuild
        ? Math.floor((openingWidthMm - 89 + slatGap) / (designSlatSize + slatGap))
        : Math.floor((gateHeightMm - slatGap - 216) / (designSlatSize + slatGap)),
    );
    const bladesPerStock = Math.max(1, Math.floor(6100 / bladeCutMm));
    const csrCount = verticalBuild ? 0 : Math.max(0, Math.floor(railCutMm / 2000));
    const csrCutMm = Math.max(1, frameCutMm - 206);
    const csrsPerStock = Math.max(1, Math.floor(5800 / csrCutMm));

    computed[run.runId][segment.segmentId] = {
      ...(computed[run.runId][segment.segmentId] ?? {}),
      gate_blade_count: numGateBlades,
      gate_blade_cut_mm: Math.round(bladeCutMm),
      gate_rail_cut_mm: Math.round(railCutMm),
      gate_side_frame_cut_mm: Math.round(frameCutMm),
      gate_csr_count: csrCount,
      gate_csr_cut_mm: Math.round(csrCutMm),
    };

    emit(lines, {
      ...base,
      sku: gateBladeSkuFor(finishFamily, economySlats, slatSize, colour, verticalBuild),
      category: "gate",
      quantity: Math.ceil(numGateBlades / bladesPerStock),
      unit: "length",
      notes: `${numGateBlades} ${verticalBuild ? "vertical" : "horizontal"} gate blades, ${Math.round(bladeCutMm)}mm cuts from 6100mm stock`,
    });
    emitQsgSlidingGateFrameLines(lines, base, slatSize, colour, frameCutMm, railCutMm, verticalBuild, numGateBlades, slatGap);
    if (csrCount > 0) {
      const csrColour = colourSkuSuffix(colour);
      const csrPlateSku = getComponent(`XP-BTP-${csrColour}`) ? `XP-BTP-${csrColour}` : "XP-BTP-MN";
      emit(lines, {
        ...base,
        sku: `XP-5800-CSR-${csrColour}`,
        category: "centre_support_rail",
        quantity: Math.ceil(csrCount / csrsPerStock),
        unit: "length",
        notes: `${csrCount} centre support rail(s), ${Math.round(csrCutMm)}mm cuts from 5800mm stock`,
      });
      emit(lines, {
        ...base,
        sku: csrPlateSku,
        category: "accessory",
        quantity: csrCount * 2,
        unit: "each",
        notes: "Top and bottom plates for sliding gate centre support rails",
      });
    }
    const trackSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.slidingTrackType]) ?? "XPSG-6000-TRACK-ST";
    const trackQty = Math.ceil((openingWidthMm * 2) / stockLengthForSlidingTrack(trackSku));
    emit(lines, {
      ...base,
      sku: trackSku,
      category: "hardware",
      quantity: trackQty,
      unit: "length",
      notes: `Sliding track for approx. ${Math.round(openingWidthMm * 2)}mm travel length`,
    });
    if (trackSku.includes("TRACK-ST")) {
      emit(lines, {
        ...base,
        sku: "XPSG-ANCHOR",
        category: "hardware",
        quantity: trackSku.includes("3000") ? trackQty * 22 : trackQty * 42,
        unit: "each",
        notes: "Track anchor pins for steel track",
      });
    }
    emit(lines, { ...base, sku: "QSG-S-WHEEL", category: "hardware", quantity: 2, unit: "each", notes: "Sliding gate wheels" });
    emit(lines, { ...base, sku: "QSG-S-WHEEL-CS-2PK", category: "hardware", quantity: 1, unit: "pack", notes: "Sliding gate wheel clamping set, 2 pack" });
    emit(lines, { ...base, sku: "XPSG-GUIDE", category: "hardware", quantity: 1, unit: "each", notes: "Self-adjusting slide guide" });
    emit(lines, { ...base, sku: "XPSG-STOP", category: "hardware", quantity: 1, unit: "each", notes: "Bolt down sliding gate stop" });
    emit(lines, {
      ...base,
      sku: knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.slidingCatchType]) ?? "XPSG-CATCH-U",
      category: "hardware",
      quantity: 1,
      unit: "each",
      notes: "Sliding gate catch",
    });
    const motorSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.slidingMotorType]);
    if (motorSku) {
      emit(lines, { ...base, sku: motorSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected sliding motor kit" });
      emit(lines, {
        ...base,
        sku: "XPSG-FILO-RACK",
        category: "hardware",
        quantity: Math.ceil(openingWidthMm / 1000),
        unit: "each",
        notes: "Motor rack, 1m sections",
      });
    }
    return lines;
  }

  if (!build.startsWith("qsg_hinged_")) {
    warnings.push(
      `${build} gate build is selectable for workflow testing, but full frame kit rules still need QSG workbook verification.`,
    );
  }
  const bladeCutMm = verticalBuild ? Math.max(1, gateHeightMm - 133) : Math.max(1, leafWidthMm - 86);
  const railCutMm = Math.max(1, leafWidthMm - 80);
  const numGateBlades = Math.max(
    1,
    verticalBuild
      ? Math.floor((leafWidthMm - 86 + slatGap) / (slatSize + slatGap))
      : Math.floor((gateHeightMm - 133 + slatGap) / (slatSize + slatGap)),
  );
  const bladesPerStock = Math.max(1, Math.floor(6100 / bladeCutMm));
  const railsPerStock = Math.max(1, Math.floor(4800 / railCutMm));

  emit(lines, {
    ...base,
    sku: gateBladeSkuFor(finishFamily, economySlats, slatSize, colour, verticalBuild),
    category: "gate",
    quantity: Math.ceil((numGateBlades * leafCount) / bladesPerStock),
    unit: "length",
    notes: `${numGateBlades} ${verticalBuild ? "vertical" : "horizontal"} gate blades/leaf, ${Math.round(bladeCutMm)}mm cuts from 6100mm stock`,
  });
  emit(lines, {
    ...base,
    sku: gateRailSkuFor(slatSize, colour),
    category: "gate",
    quantity: Math.ceil((2 * leafCount) / railsPerStock),
    unit: "length",
    notes: `Top/bottom ${slatSize === 90 ? "90mm" : "65mm"} QSG gate rails, ${Math.round(railCutMm)}mm cuts from 4800mm stock`,
  });
  emitQsgGateFrameLines(lines, base, slatSize, colour, leafCount, Math.max(1, gateHeightMm), railCutMm, verticalBuild, numGateBlades, slatGap);

  const stopSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.gateStopType]);
  if (stopSku) emit(lines, { ...base, sku: stopSku, category: "hardware", quantity: leafCount, unit: "each", notes: "Selected gate stop" });

  const hingeSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B");
  if (hingeSku) emit(lines, { ...base, sku: hingeSku, category: "hardware", quantity: leafCount, unit: "each", notes: "Selected hinge / latch hardware" });
  const latchSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA");
  if (latchSku) emit(lines, { ...base, sku: latchSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected latch / lock hardware" });
  const dropBoltSku = knownSelectedSku(
    vars[GATE_SEGMENT_STUB_KEYS.dropBoltType] ?? (movement === "double_swing" ? "SS-0300DB-B" : "none"),
  );
  if (dropBoltSku) emit(lines, { ...base, sku: dropBoltSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected drop bolt" });
  if (vars[GATE_SEGMENT_STUB_KEYS.includeLockBox] === true) {
    warnings.push(
      "A legacy XP lock-box option was present on this gate, but XP gate frame hardware is discontinued and is no longer added to QuickScreen gates.",
    );
  }

  return lines;
}

function calculateVerticalSlatRun(
  payload: CanonicalPayload,
  run: CanonicalRun,
  warnings: string[],
  computed: LocalBomResult["computed"],
): QtyLine[] {
  const lines: QtyLine[] = [];
  const firstFenceSegment = run.segments.find((s) => s.segmentKind !== "gate_opening");
  const mergedRunVars = {
    ...payload.variables,
    ...(run.variables ?? {}),
    ...(firstFenceSegment?.variables ?? {}),
  };
  const colour = String(
    mergedRunVars.colour_code ?? mergedRunVars.colour ?? "B",
  );
  const postColour = String(mergedRunVars.post_colour_code ?? colour);
  const slatSize = toNumber(mergedRunVars.slat_size_mm, 65);
  const slatGap = toNumber(mergedRunVars.slat_gap_mm, 5);
  const finishFamily = String(mergedRunVars.finish_family ?? "standard");
  const economySlats = finishFamily === "economy";
  const slatStockLengthMm = economySlats ? 6500 : finishFamily === "alumawood" ? 5800 : 6100;
  const maxPanelWidth = Math.min(
    maxPanelWidthForSystem(run.productCode),
    Math.max(
      300,
      toNumber(
        mergedRunVars.max_panel_width_mm,
        maxPanelWidthForSystem(run.productCode),
      ),
    ),
  );
  const mountingType = String(
    mergedRunVars.mounting_type ?? mergedRunVars.mounting_method ?? "in_ground",
  );
  const postSize = toNumber(mergedRunVars.post_size, 50);
  let internalPanelPosts = 0;

  for (const segment of run.segments) {
    if (segment.segmentKind === "gate_opening") {
      lines.push(...calculateGateSegment(run, segment, mergedRunVars, warnings, computed));
      continue;
    }

    const vars = { ...mergedRunVars, ...(segment.variables ?? {}) };
    const segmentWidthMm = toNumber(segment.segmentWidthMm, 0);
    const targetHeightMm = toNumber(
      segment.targetHeightMm ?? vars.target_height_mm,
      1800,
    );
    if (segmentWidthMm <= 0) continue;

    const segmentMaxPanelWidth = Math.min(
      maxPanelWidthForSystem(run.productCode),
      Math.max(300, toNumber(vars.max_panel_width_mm, maxPanelWidth)),
    );
    const numPanels = Math.max(1, Math.ceil(segmentWidthMm / segmentMaxPanelWidth));
    const panelWidthMm = segmentWidthMm / numPanels;
    internalPanelPosts += Math.max(0, numPanels - 1);

    const numVerticalSlats = Math.max(
      1,
      Math.floor((panelWidthMm - 8 + slatGap) / (slatGap + slatSize)),
    );
    const slatCutMm = Math.max(1, targetHeightMm);
    const railCutMm = Math.max(1, panelWidthMm);
    const fSectionCutMm = Math.max(1, targetHeightMm);
    const slatsPerStock = Math.max(1, Math.floor(slatStockLengthMm / slatCutMm));
    const railsPerStock = Math.max(1, Math.floor(5000 / railCutMm));
    const railInsertsPerStock = Math.max(1, Math.floor(5800 / railCutMm));
    const fSectionsPerStock = Math.max(1, Math.floor(5800 / fSectionCutMm));
    const slatStocks = Math.ceil((numVerticalSlats * numPanels) / slatsPerStock);
    const railStocks = Math.ceil((2 * numPanels) / railsPerStock);
    const railInsertStocks = Math.ceil((2 * numPanels) / railInsertsPerStock);
    const fSectionStocks = Math.ceil((2 * numPanels) / fSectionsPerStock);
    const leftCornerDeg = cornerDegreesFromVars(segment.variables, "left");
    const rightCornerDeg = cornerDegreesFromVars(segment.variables, "right");
    const screwPacks = Math.ceil(
      (Math.ceil((numVerticalSlats * numPanels * 1.01) / 10) * 10) / 50,
    );

    computed[run.runId] = computed[run.runId] ?? {};
    computed[run.runId][segment.segmentId] = {
      num_vertical_slats: numVerticalSlats,
      num_panels: numPanels,
      panel_width_mm: Math.round(panelWidthMm),
      slat_cut_mm: Math.round(slatCutMm),
      rail_cut_mm: Math.round(railCutMm),
      f_section_cut_mm: Math.round(fSectionCutMm),
      left_corner_degrees: leftCornerDeg,
      right_corner_degrees: rightCornerDeg,
    };

    const base = { runId: run.runId, segmentId: segment.segmentId };
    emit(lines, {
      ...base,
      sku: slatSkuFor(finishFamily, economySlats, slatSize, colour),
      category: "slat",
      quantity: slatStocks,
      unit: "length",
      notes: `${numVerticalSlats} vertical slats/panel, ${Math.round(slatCutMm)}mm cuts from ${slatStockLengthMm}mm stock`,
    });
    emit(lines, {
      ...base,
      sku: verticalRailSkuFor(colour),
      category: "rail",
      quantity: railStocks,
      unit: "length",
      notes: `Top/bottom U-channel rails, ${Math.round(railCutMm)}mm cuts from 5000mm stock`,
    });
    emit(lines, {
      ...base,
      sku: quickscreenSkuFor(finishFamily, "SF", colour),
      category: "rail_insert",
      quantity: railInsertStocks,
      unit: "length",
      notes: `QS-5800-SF inserts inside top/bottom rails, ${Math.round(railCutMm)}mm cuts from 5800mm stock`,
    });
    emit(lines, {
      ...base,
      sku: quickscreenSkuFor(finishFamily, "F", colour),
      category: "f_section",
      quantity: fSectionStocks,
      unit: "length",
      notes: `2 vertical side F-sections/panel, ${Math.round(fSectionCutMm)}mm cuts from 5800mm stock`,
    });
    emit(lines, {
      ...base,
      sku: "QS-SCREWS-50PK",
      category: "screw",
      quantity: screwPacks,
      unit: "pack",
      notes: "Vertical slat fixing screws",
    });
    const angleAdapterCount =
      (nearestNamedCorner(leftCornerDeg) === 135 ? 1 : 0) +
      (nearestNamedCorner(rightCornerDeg) === 135 ? 1 : 0);
    emit(lines, {
      ...base,
      sku: angleAdapterSkuFor(finishFamily, colour),
      category: "accessory",
      quantity: angleAdapterCount,
      unit: "length",
      notes: "135 degree angle adapter for drawn corner",
    });

    if (panelWidthMm > 2600) {
      warnings.push(
        `VS panel width ${Math.round(panelWidthMm)}mm exceeds recommended 2600mm; split into more panels.`,
      );
    }
  }

  const postCount = runPostBoundaryCount(run) + internalPanelPosts;
  const postHeight = toNumber(
    firstFenceSegment?.targetHeightMm ?? mergedRunVars.target_height_mm,
    1800,
  );

  emitPostLines(
    lines,
    run,
    firstFenceSegment?.segmentId ?? run.runId,
    postCount,
    finishFamily,
    postSize,
    postHeight,
    postColour,
    mountingType,
  );

  return lines;
}

function calculateScreenRun(
  payload: CanonicalPayload,
  run: CanonicalRun,
  warnings: string[],
  computed: LocalBomResult["computed"],
): QtyLine[] {
  const lines: QtyLine[] = [];
  const firstFenceSegment = run.segments.find((s) => s.segmentKind !== "gate_opening");
  const mergedRunVars = {
    ...payload.variables,
    ...(run.variables ?? {}),
    ...(firstFenceSegment?.variables ?? {}),
  };
  const colour = String(
    mergedRunVars.colour_code ?? mergedRunVars.colour ?? "B",
  );
  const postColour = String(mergedRunVars.post_colour_code ?? colour);
  const slatSize = toNumber(mergedRunVars.slat_size_mm, 65);
  const slatGap = toNumber(mergedRunVars.slat_gap_mm, 5);
  const finishFamily = String(mergedRunVars.finish_family ?? "standard");
  const economySlats = finishFamily === "economy";
  const slatStockLengthMm = economySlats ? 6500 : finishFamily === "alumawood" ? 5800 : 6100;
  const maxPanelWidth = Math.min(
    maxPanelWidthForSystem(run.productCode),
    Math.max(
      300,
      toNumber(
        mergedRunVars.max_panel_width_mm,
        maxPanelWidthForSystem(run.productCode),
      ),
    ),
  );
  const mountingType = String(
    mergedRunVars.mounting_type ?? mergedRunVars.mounting_method ?? "in_ground",
  );
  const postSize = toNumber(mergedRunVars.post_size, 50);
  const isBayg = run.productCode === "BAYG";
  let internalPanelPosts = 0;

  if (run.productCode === "VS") {
    return calculateVerticalSlatRun(payload, run, warnings, computed);
  }

  if (!SUPPORTED_PRODUCTS.has(run.productCode)) {
    warnings.push(
      `${run.productCode} is available in product search but the local fallback BOM engine currently calculates QSHS, BAYG, and VS only.`,
    );
    return lines;
  }

  for (const segment of run.segments) {
    if (segment.segmentKind === "gate_opening") {
      lines.push(...calculateGateSegment(run, segment, mergedRunVars, warnings, computed));
      continue;
    }

    const vars = { ...mergedRunVars, ...(segment.variables ?? {}) };
    const segmentWidthMm = toNumber(segment.segmentWidthMm, 0);
    const targetHeightMm = toNumber(
      segment.targetHeightMm ?? vars.target_height_mm,
      1800,
    );
    if (segmentWidthMm <= 0) continue;

    const slatDesignWidth = designSlatWidthMm(run.productCode, slatSize);
    const numSlats = Math.max(
      1,
      Math.floor((targetHeightMm + slatGap - 3) / (slatDesignWidth + slatGap)),
    );
    const actualHeightMm = Math.round(
      numSlats * (slatDesignWidth + slatGap) - slatGap + 3,
    );
    const segmentMaxPanelWidth = Math.min(
      maxPanelWidthForSystem(run.productCode),
      Math.max(
        300,
        toNumber(vars.max_panel_width_mm, maxPanelWidth),
      ),
    );
    const numPanels = Math.max(1, Math.ceil(segmentWidthMm / segmentMaxPanelWidth));
    const panelWidthMm = segmentWidthMm / numPanels;
    internalPanelPosts += Math.max(0, numPanels - 1);
    const slatCutMm = Math.max(1, panelWidthMm - 15);
    const sideFrameCutMm = Math.max(1, actualHeightMm - 3);
    const csrCutMm = Math.max(1, actualHeightMm - 6);
    const numCsrPerPanel =
      panelWidthMm < 2000 ? 0 : panelWidthMm < 4000 ? 1 : panelWidthMm < 6000 ? 2 : 3;

    const runLeftT = run.leftBoundary.type as LegacyBoundaryType;
    const runRightT = run.rightBoundary.type as LegacyBoundaryType;
    const leftEff = effectiveLegacyBoundaryType(runLeftT, segment.variables, "left");
    const rightEff = effectiveLegacyBoundaryType(runRightT, segment.variables, "right");
    const leftCornerDeg = cornerDegreesFromVars(segment.variables, "left");
    const rightCornerDeg = cornerDegreesFromVars(segment.variables, "right");
    const leftSideFrames = leftEff === "product_post" ? 1 : 0;
    const rightSideFrames = rightEff === "product_post" ? 1 : 0;
    const wallFixings = (leftEff === "wall" ? 1 : 0) + (rightEff === "wall" ? 1 : 0);
    const sideFramePieces = (leftSideFrames + rightSideFrames) * numPanels;
    const fSectionPieces = wallFixings * numPanels;
    const slatsPerStock = Math.max(1, Math.floor(slatStockLengthMm / slatCutMm));
    const sideFramesPerStock = Math.max(1, Math.floor(5800 / sideFrameCutMm));
    const csrPerStock = Math.max(1, Math.floor(5800 / csrCutMm));
    const slatStocks = Math.ceil((numSlats * numPanels) / slatsPerStock);
    const sideFrameStocks = Math.ceil(sideFramePieces / sideFramesPerStock);
    const fSectionStocks = Math.ceil(fSectionPieces / sideFramesPerStock);
    const csrStocks = Math.ceil((numCsrPerPanel * numPanels) / csrPerStock);
    const usesPresetSpacers = String(vars.slat_gap_mode ?? "spacer") !== "custom";
    const spacerEachQty = 2 * Math.max(0, numSlats - 1) * numPanels;
    const spacerPacks = isBayg || !usesPresetSpacers
      ? 0
      : Math.ceil(spacerEachQty / 50);
    const baygSpacers = isBayg ? spacerEachQty : 0;
    const screwPacks = Math.ceil(
      (numSlats * 2 * numPanels * 1.01 + numCsrPerPanel * numPanels * 4) / 50,
    );
    const fSectionScrewQty =
      fSectionPieces > 0
        ? Math.max(3, Math.ceil((sideFrameCutMm - 30) / 900) + 1) *
          2 *
          fSectionPieces
        : 0;

    computed[run.runId] = computed[run.runId] ?? {};
    computed[run.runId][segment.segmentId] = {
      actual_height_mm: actualHeightMm,
      num_slats: numSlats,
      num_panels: numPanels,
      panel_width_mm: Math.round(panelWidthMm),
      slat_cut_mm: Math.round(slatCutMm),
      left_corner_degrees: leftCornerDeg,
      right_corner_degrees: rightCornerDeg,
    };

    const base = { runId: run.runId, segmentId: segment.segmentId };
    emit(lines, {
      ...base,
      sku: slatSkuFor(finishFamily, economySlats, slatSize, colour),
      category: "slat",
      quantity: slatStocks,
      unit: "length",
      notes: `${numSlats} slats/panel, ${Math.round(slatCutMm)}mm cuts from ${slatStockLengthMm}mm stock`,
    });
    emit(lines, {
      ...base,
      sku: quickscreenSkuFor(finishFamily, "SF", colour),
      category: "side_frame",
      quantity: sideFrameStocks,
      unit: "length",
      notes: `${sideFramePieces} pieces at ${Math.round(sideFrameCutMm)}mm`,
    });
    emit(lines, {
      ...base,
      sku: quickscreenSkuFor(finishFamily, "CFC", colour),
      category: "cfc_cover",
      quantity: sideFrameStocks,
      unit: "length",
      notes: "Auto-added 1:1 with side frame stock",
    });
    emit(lines, {
      ...base,
      sku: "QS-SFC-B",
      category: "accessory",
      quantity: sideFramePieces,
      unit: "each",
      notes: "Side frame caps, one per cut side-frame piece",
    });
    emit(lines, {
      ...base,
      sku: csrSkuFor(finishFamily, colour),
      category: "centre_support_rail",
      quantity: csrStocks,
      unit: "length",
      notes:
        numCsrPerPanel > 0
          ? `${numCsrPerPanel} CSR/panel at ${Math.round(csrCutMm)}mm`
          : undefined,
    });
    emit(lines, {
      ...base,
      sku: `XP-CSRC-${csrCapColour(postColour)}`,
      category: "accessory",
      quantity: numCsrPerPanel * numPanels,
      unit: "each",
      notes: "CSR caps",
    });
    emit(lines, {
      ...base,
      sku: quickscreenSkuFor(finishFamily, "F", colour),
      category: "f_section",
      quantity: fSectionStocks,
      unit: "length",
      notes: `${fSectionPieces} wall termination pieces`,
    });
    emit(lines, {
      ...base,
      sku: `XP-SCREWS-${standardAccessoryColour(postColour)}`,
      category: "screw",
      quantity: Math.ceil(fSectionScrewQty / 100),
      unit: "pack",
      notes: "F-section fixing screws",
    });
    emit(lines, {
      ...base,
      sku: `QS-SPACER-${gapCode(slatGap)}-50PK`,
      category: "accessory",
      quantity: spacerPacks,
      unit: "pack",
      notes: `${spacerEachQty} spacers total: ${Math.max(0, numSlats - 1)} gaps x 2 ends x ${numPanels} panel(s)`,
    });
    emit(lines, {
      ...base,
      sku: `QS-SPACER-${gapCode(slatGap)}`,
      category: "accessory",
      quantity: baygSpacers,
      unit: "each",
      notes: `${Math.max(0, numSlats - 1)} gaps x 2 ends x ${numPanels} panel(s)`,
    });
    emit(lines, {
      ...base,
      sku: "QS-SCREWS-50PK",
      category: "screw",
      quantity: screwPacks,
      unit: "pack",
      notes: "Screening screws",
    });
    const angleAdapterCount =
      (nearestNamedCorner(leftCornerDeg) === 135 ? 1 : 0) +
      (nearestNamedCorner(rightCornerDeg) === 135 ? 1 : 0);
    emit(lines, {
      ...base,
      sku: angleAdapterSkuFor(finishFamily, colour),
      category: "accessory",
      quantity: angleAdapterCount,
      unit: "length",
      notes: "135 degree angle adapter for drawn corner",
    });

    if (panelWidthMm > 2600) {
      warnings.push(
        `Panel width ${Math.round(panelWidthMm)}mm exceeds recommended 2600mm; split into more panels.`,
      );
    }
  }

  const postCount = runPostBoundaryCount(run) + internalPanelPosts;
  const postHeight = toNumber(
    firstFenceSegment?.targetHeightMm ?? mergedRunVars.target_height_mm,
    1800,
  );

  emitPostLines(
    lines,
    run,
    firstFenceSegment?.segmentId ?? run.runId,
    postCount,
    finishFamily,
    postSize,
    postHeight,
    postColour,
    mountingType,
  );

  return lines;
}

export function calculateLocalBom(
  payload: CanonicalPayload,
  pricingTier: PricingTier = "tier1",
): LocalBomResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const assumptions: string[] = [];
  const computed: LocalBomResult["computed"] = {};

  const runResults = payload.runs.map((run, index) => {
    const items = calculateScreenRun(payload, run, warnings, computed);
    return {
      runId: run.runId,
      label: `Run ${index + 1} - ${run.productCode}`,
      productCode: run.productCode,
      items,
    };
  });

  const aggregated = new Map<string, QtyLine>();
  for (const line of runResults.flatMap((run) => run.items)) {
    const key = `${line.sku}__${line.runId}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      aggregated.set(key, { ...line });
    }
  }

  const lines: BOMLineItem[] = [...aggregated.values()].map((line) => {
    const unitPrice = priceForSku(line.sku, line.quantity);
    if (unitPrice === 0) {
      assumptions.push(`No local price found for SKU ${line.sku}.`);
    }
    return {
      category: line.category as BOMLineItem["category"],
      sku: line.sku,
      description: describeSku(line.sku, line.category),
      quantity: line.quantity,
      unit: (line.unit ?? getComponent(line.sku)?.unit ?? "each") as BOMLineItem["unit"],
      unitPrice,
      lineTotal: roundMoney(unitPrice * line.quantity),
      notes: line.notes,
      runId: line.runId,
      segmentId: line.segmentId,
    };
  });

  const pricedRunResults = runResults.map((run) => ({
    runId: run.runId,
    items: run.items.map((line) => {
      const unitPrice = priceForSku(line.sku, line.quantity);
      return {
        category: line.category as BOMLineItem["category"],
        sku: line.sku,
        description: describeSku(line.sku, line.category),
        quantity: line.quantity,
        unit: (line.unit ?? getComponent(line.sku)?.unit ?? "each") as BOMLineItem["unit"],
        unitPrice,
        lineTotal: roundMoney(unitPrice * line.quantity),
        notes: line.notes,
        runId: line.runId,
        segmentId: line.segmentId,
        productCode: run.productCode,
      };
    }),
  }));

  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const gst = roundMoney(subtotal * 0.1);
  const grandTotal = roundMoney(subtotal + gst);
  const gateItems = lines.filter(
    (line) =>
      line.category === "gate" ||
      line.category === "hardware" ||
      line.sku.startsWith("QSG-"),
  );

  return {
    lines,
    runResults: pricedRunResults,
    gateItems,
    totals: { subtotal, gst, grandTotal },
    warnings,
    errors,
    assumptions,
    computed,
    pricingTier,
    generatedAt: new Date().toISOString(),
  };
}
