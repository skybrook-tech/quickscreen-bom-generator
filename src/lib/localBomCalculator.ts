import type { CanonicalPayload, CanonicalRun } from "../types/canonical.types";
import type { BOMLineItem, PricingTier } from "../types/bom.types";
import {
  getComponent,
  localPricingRules,
  type LocalPricingRule,
} from "./localSeedData";
import {
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

const SUPPORTED_PRODUCTS = new Set(["QSHS", "BAYG", "VS"]);
const STANDARD_COLOURS = new Set(["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"]);
const ALUMAWOOD_CORE_COLOURS = new Set(["KWI", "WRC"]);
const CSR_CAP_COLOURS = new Set(["B", "G", "MN", "S", "SM", "W"]);
const CSR_PLATE_COLOURS = new Set(["B", "BS", "D", "G", "M", "MN", "S", "SM", "W"]);
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

function csrPlateColour(colour: string): string {
  return CSR_PLATE_COLOURS.has(colour) ? colour : "MN";
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

function postSkuFor(finishFamily: string, postSize: number, postHeight: number, postColour: string): string {
  if (finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(postColour)) {
    if (postSize === 65) return postHeight > 2400 ? `AW-5800-65HD-${postColour}` : `AW-2400-65HD-${postColour}`;
    return postHeight > 2400 ? `AW-5800-FP-${postColour}` : `AW-2400-FP-${postColour}`;
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

function priceForSku(sku: string, qty: number, tier: PricingTier): number {
  const rules = localPricingRules
    .filter((rule) => rule.sku === sku && rule.tier_code === tier)
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

  const postSku = postSkuFor(finishFamily, postSize, postHeight, postColour);
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

function calculateVerticalSlatRun(
  payload: CanonicalPayload,
  run: CanonicalRun,
  warnings: string[],
  computed: LocalBomResult["computed"],
): QtyLine[] {
  const lines: QtyLine[] = [];
  const mergedRunVars = { ...payload.variables, ...(run.variables ?? {}) };
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
      warnings.push(
        "Gate openings are carried through the mapper, but QS_GATE BOM generation still needs the next implementation pass.",
      );
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
    const slatsPerStock = Math.max(1, Math.floor(slatStockLengthMm / slatCutMm));
    const railsPerStock = Math.max(1, Math.floor(5000 / railCutMm));
    const edgeFramesPerStock = Math.max(1, Math.floor(5800 / slatCutMm));
    const slatStocks = Math.ceil((numVerticalSlats * numPanels) / slatsPerStock);
    const railStocks = Math.ceil((2 * numPanels) / railsPerStock);
    const edgeFramePieces = 2 * numPanels;
    const edgeFrameStocks = Math.ceil(edgeFramePieces / edgeFramesPerStock);

    const runLeftT = run.leftBoundary.type as LegacyBoundaryType;
    const runRightT = run.rightBoundary.type as LegacyBoundaryType;
    const leftEff = effectiveLegacyBoundaryType(runLeftT, segment.variables, "left");
    const rightEff = effectiveLegacyBoundaryType(runRightT, segment.variables, "right");
    const leftCornerDeg = cornerDegreesFromVars(segment.variables, "left");
    const rightCornerDeg = cornerDegreesFromVars(segment.variables, "right");
    const sideFramePieces =
      (leftEff === "product_post" ? 1 : 0) +
      (rightEff === "product_post" ? 1 : 0);
    const sideFramesPerStock = Math.max(1, Math.floor(5800 / slatCutMm));
    const sideFrameStocks = Math.ceil(sideFramePieces / sideFramesPerStock);
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
      sku: quickscreenSkuFor(finishFamily, "F", colour),
      category: "f_section",
      quantity: edgeFrameStocks,
      unit: "length",
      notes: `${edgeFramePieces} vertical edge frames at ${Math.round(slatCutMm)}mm`,
    });
    emit(lines, {
      ...base,
      sku: quickscreenSkuFor(finishFamily, "SF", colour),
      category: "side_frame",
      quantity: sideFrameStocks,
      unit: "length",
      notes: `${sideFramePieces} side frame pieces for product-post panel ends`,
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
      quantity: sideFramePieces * 2,
      unit: "each",
      notes: "Side frame caps",
    });
    emit(lines, {
      ...base,
      sku: "QS-SCREWS-50PK",
      category: "screw",
      quantity: screwPacks,
      unit: "pack",
      notes: "Vertical slat fixing screws",
    });

    if (panelWidthMm > 2600) {
      warnings.push(
        `VS panel width ${Math.round(panelWidthMm)}mm exceeds recommended 2600mm; split into more panels.`,
      );
    }
  }

  const postCount = runPostBoundaryCount(run) + internalPanelPosts;
  const firstFenceSegment = run.segments.find((s) => s.segmentKind !== "gate_opening");
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
  const mergedRunVars = { ...payload.variables, ...(run.variables ?? {}) };
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
      warnings.push(
        "Gate openings are carried through the mapper, but QS_GATE BOM generation still needs the next implementation pass.",
      );
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
    const spacerPacks = isBayg
      ? 0
      : Math.ceil((2 * (numSlats + 1) * numPanels) / 50);
    const baygSpacers = isBayg ? 2 * (numSlats + 1) * numPanels : 0;
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
      quantity: sideFramePieces * 2,
      unit: "each",
      notes: "Side frame caps",
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
      sku:
        finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(colour)
          ? "AW-BTP-TR"
          : `XP-BTP-${csrPlateColour(postColour)}`,
      category: "accessory",
      quantity: numCsrPerPanel * numPanels * 2,
      unit: "each",
      notes: "CSR top/base plates",
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
      notes: `${slatGap}mm gap spacer packs`,
    });
    emit(lines, {
      ...base,
      sku: `QS-SPACER-${gapCode(slatGap)}`,
      category: "accessory",
      quantity: baygSpacers,
      unit: "each",
      notes: "BAYG individual spacers",
    });
    emit(lines, {
      ...base,
      sku: "QS-SCREWS-50PK",
      category: "screw",
      quantity: screwPacks,
      unit: "pack",
      notes: "Screening screws",
    });

    if (panelWidthMm > 2600) {
      warnings.push(
        `Panel width ${Math.round(panelWidthMm)}mm exceeds recommended 2600mm; split into more panels.`,
      );
    }
  }

  const postCount = runPostBoundaryCount(run) + internalPanelPosts;
  const firstFenceSegment = run.segments.find((s) => s.segmentKind !== "gate_opening");
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
    const unitPrice = priceForSku(line.sku, line.quantity, pricingTier);
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
    };
  });

  const pricedRunResults = runResults.map((run) => ({
    runId: run.runId,
    items: run.items.map((line) => {
      const unitPrice = priceForSku(line.sku, line.quantity, pricingTier);
      return {
        category: line.category as BOMLineItem["category"],
        sku: line.sku,
        description: describeSku(line.sku, line.category),
        quantity: line.quantity,
        unit: (line.unit ?? getComponent(line.sku)?.unit ?? "each") as BOMLineItem["unit"],
        unitPrice,
        lineTotal: roundMoney(unitPrice * line.quantity),
        notes: line.notes,
      };
    }),
  }));

  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const gst = roundMoney(subtotal * 0.1);
  const grandTotal = roundMoney(subtotal + gst);

  return {
    lines,
    runResults: pricedRunResults,
    gateItems: [],
    totals: { subtotal, gst, grandTotal },
    warnings,
    errors,
    assumptions,
    computed,
    pricingTier,
    generatedAt: new Date().toISOString(),
  };
}
