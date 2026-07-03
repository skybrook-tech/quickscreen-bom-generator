// calculators/quickscreen.ts — QuickScreen fence + gate BOM calculator.
//
// This is the extracted, config-driven version of the calculation logic that
// previously lived in engine.ts. It:
//   • Reads numeric constants from CalculatorConfig instead of hardcoded literals.
//   • Emits INTERNAL SKUs (e.g. "SLAT.STD.65.B") via isku() template substitution.
//   • Receives components[] explicitly; no module globals.
//   • Returns QtyLine[] with internal SKUs; the orchestrator in engine.ts resolves
//     them to supplier SKUs before aggregation.

import type { CalculatorConfig, CalcContext, CanonicalRun, CanonicalPayload, CanonicalSegment, QtyLine } from "../config/types.ts";
import {
  toNumber, gapCode, isku,
  standardAccessoryColour, csrCapColour, colourSkuSuffix, ALUMAWOOD_CORE_COLOURS,
  gateLeafGeometry, gateMovementOrDefault, GateMovement,
  hingeGapForSku, latchGapForSku, isWhiteHardwareFinish, isTruCloseHardware,
  kitForHardwareSelection, baseHardwareSku, knownSelectedSku,
  effectiveLegacyBoundaryType, cornerDegreesFromVars, cornerTypeFromVars,
  GATE_SEGMENT_STUB_KEYS,
  selectedOptionalAddOns, optionalAccessoriesForParent,
  clampPostSpacing, designSlatWidthMm,
} from "../engine-utils.ts";

// QtyLine is now canonical — re-export so callers don't need a separate import.
export type { QtyLine } from "../config/types.ts";

type Sink = {
  warnings: string[];
  computed: Record<string, Record<string, Record<string, unknown>>>;
};

// ─── Emit helper ──────────────────────────────────────────────────────────────

function emit(lines: QtyLine[], line: QtyLine): void {
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) return;
  lines.push({ ...line, quantity: Math.ceil(line.quantity) });
}

function emitSelectedOptionalAddOns(
  lines: QtyLine[],
  base: { runId: string; segmentId: string },
  variables: Record<string, unknown>,
  parentSku: string,
  parentQty: number,
  components: CalcContext["components"],
) {
  const selected = selectedOptionalAddOns(variables)[parentSku] ?? [];
  if (!selected.length) return;
  const opts = optionalAccessoriesForParent(parentSku, components);
  for (const sk of selected) {
    const opt = opts.find((o) => o.sku === sk);
    if (!opt) continue;
    const comp = components.find((c) => c.sku === sk);
    emit(lines, { ...base, sku: sk, category: "hardware", quantity: Math.max(1, parentQty * opt.qtyPerParent), unit: (comp?.unit ?? "each") as QtyLine["unit"], notes: `Optional add-on selected for ${parentSku}` });
  }
}

// ─── Corner emission (uses config for internal SKU patterns) ──────────────────

function cornerTypeFromDegrees(deg: number | undefined): "right" | "obtuse" | "custom" | undefined {
  if (deg === undefined) return undefined;
  if (Math.abs(deg - 90) <= 2) return "right";
  if (Math.abs(deg - 135) <= 5) return "obtuse";
  return "custom";
}

function emitCornerLines(
  lines: QtyLine[], warnings: string[],
  base: { runId: string; segmentId: string },
  vars: Record<string, string | number | boolean> | undefined,
  side: "left" | "right",
  finishFamily: string, colour: string, runHeightMm: number,
  cfg: CalculatorConfig,
) {
  const explicitType = cornerTypeFromVars(vars, side), degrees = cornerDegreesFromVars(vars, side);
  const type = explicitType ?? cornerTypeFromDegrees(degrees);
  if (!type || type === "right") return;
  const label = `${side} corner on ${base.segmentId.slice(0, 8)}`;
  if (type === "custom") {
    const msg = `Custom angle (${Math.round(degrees ?? 0)} degrees) at ${label} - verify components with supplier before ordering.`;
    warnings.push(msg);
    emit(lines, { ...base, sku: cfg.internalSkus.customCorner, category: "accessory", quantity: 1, unit: "each", notes: msg });
    return;
  }
  const adapterTemplate = (finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(colour))
    ? cfg.internalSkus.angleAdapter.awood
    : cfg.internalSkus.angleAdapter.std;
  emit(lines, { ...base, sku: isku(adapterTemplate, { colour }), category: "accessory", quantity: 1, unit: "length", notes: `135 degree angle adapter at ${label}, cut to ${Math.round(runHeightMm)}mm` });
  emit(lines, { ...base, sku: isku(cfg.internalSkus.screws.xpFixing, { colour: standardAccessoryColour(colour) }), category: "screw", quantity: 1, unit: "pack", notes: `Extra screws for 135 degree angle adapter at ${label}` });
}

// ─── Post emission ────────────────────────────────────────────────────────────

function postInternalSku(
  cfg: CalculatorConfig,
  finishFamily: string, postSize: number, postHeight: number, postColour: string, mountingType: string,
  components: CalcContext["components"],
): string {
  const t = cfg.internalSkus.post;
  const isAW = finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(postColour);
  if (isAW) {
    const tall = postHeight > cfg.postRules.longPostThresholdMm;
    if (postSize === 65) return isku(tall ? t.awHd65Tall : t.awHd65Std, { colour: postColour });
    return isku(tall ? t.awFullTall : t.awFullStd, { colour: postColour });
  }
  // Short in-ground post: only where that stock colour exists
  if (mountingType === "in_ground" && postSize === 50 && postHeight <= cfg.postRules.inGroundShortPostMaxHeightMm) {
    if (cfg.postRules.shortPostColours.includes(postColour)) {
      // Verify via DB/synthetic that the short post exists (preserves existing behaviour)
      const shortSku = isku(t.fullShort, { colour: postColour });
      // We can't call resolveInternalSku here, so check if the short post is mapped
      // (it is in DEFAULT_MAP for W and MN). If not, fall through to standard.
      // The check using components is: does any component have internal_sku = shortSku?
      const hasDbRow = components.some((c) => c.internal_sku === shortSku);
      if (hasDbRow) return shortSku;
      // Also accept if it's in the known default set (W, MN as configured)
      return shortSku; // resolveInternalSku will return QS-1800 or fall through
    }
  }
  const tall = postHeight > cfg.postRules.longPostThresholdMm;
  if (postSize === 65) return isku(tall ? t.hd65Tall : t.hd65Std, { colour: postColour });
  return isku(tall ? t.fullTall : t.fullStd, { colour: postColour });
}

function postAccInternalSku(
  cfg: CalculatorConfig,
  finishFamily: string,
  kind: "top_plate" | "base_plate" | "domical_cover" | "dress_ring",
  postSize: number, postColour: string,
): string {
  const t = cfg.internalSkus.postAcc;
  const isAW = finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(postColour);
  if (isAW) {
    if (kind === "top_plate")     return postSize === 65 ? t.awTopPlate65 : t.awTopPlate50;
    if (kind === "base_plate")    return postSize === 65 ? t.awBasePlate65 : t.awBasePlate50;
    if (kind === "domical_cover") return postSize === 65 ? t.awDomical65 : t.awDomical50;
    return postSize === 65 ? t.awDressRing65 : t.awDressRing50;
  }
  if (kind === "top_plate")     return isku(postSize === 65 ? t.topPlate65 : t.topPlate50, { colour: postColour });
  if (kind === "base_plate")    return isku(postSize === 65 ? t.basePlate65 : t.basePlate50, { colour: postColour });
  if (kind === "domical_cover") return isku(postSize === 65 ? t.domical65 : t.domical50, { colour: postColour });
  return isku(postSize === 65 ? t.dressRing65 : t.dressRing50, { colour: postColour });
}

function emitPostLines(
  lines: QtyLine[], run: CanonicalRun, segmentId: string,
  postCount: number, finishFamily: string, postSize: number,
  postHeight: number, postColour: string, mountingType: string,
  cfg: CalculatorConfig, components: CalcContext["components"],
) {
  if (postCount <= 0) return;
  const sk = postInternalSku(cfg, finishFamily, postSize, postHeight, postColour, mountingType, components);
  emit(lines, { runId: run.runId, segmentId, sku: sk, category: "post", quantity: postCount, unit: "each", notes: `${postSize}mm posts from run boundaries/corners and internal panel joins` });
  if (postHeight > cfg.postRules.longPostThresholdMm) {
    emit(lines, { runId: run.runId, segmentId, sku: postAccInternalSku(cfg, finishFamily, "top_plate", postSize, postColour), category: "post_accessory", quantity: postCount, unit: "each", notes: "Top plates for long posts" });
  }
  if (mountingType === "base_plate") {
    emit(lines, { runId: run.runId, segmentId, sku: postAccInternalSku(cfg, finishFamily, "base_plate", postSize, postColour), category: "post_accessory", quantity: postCount, unit: "each", notes: "Base plate sets" });
    emit(lines, { runId: run.runId, segmentId, sku: postAccInternalSku(cfg, finishFamily, "domical_cover", postSize, postColour), category: "post_accessory", quantity: postCount, unit: "each", notes: "Domical covers" });
  }
  if (mountingType === "core_drill") {
    emit(lines, { runId: run.runId, segmentId, sku: postAccInternalSku(cfg, finishFamily, "dress_ring", postSize, postColour), category: "post_accessory", quantity: postCount, unit: "each", notes: "Dress rings" });
  }
}

function emitPostFixingLines(
  lines: QtyLine[], run: CanonicalRun, segmentId: string,
  postCount: number, vars: Record<string, unknown>, mountingType: string,
  cfg: CalculatorConfig,
) {
  if (postCount <= 0) return;
  if (mountingType === "in_ground") {
    emit(lines, {
      runId: run.runId, segmentId,
      sku: String(vars.post_fixing_material_sku ?? cfg.mountingRules.inGround.defaultGroutSku),
      category: "accessory", quantity: postCount * cfg.mountingRules.inGround.bagsPerPost,
      unit: "bag", notes: `Post-fixing material at ${cfg.mountingRules.inGround.bagsPerPost} bags per concreted-in post`,
    });
  }
  if (mountingType === "base_plate") {
    const isTimber = vars.base_plate_substrate === "timber";
    emit(lines, {
      runId: run.runId, segmentId,
      sku: isTimber ? cfg.mountingRules.basePlate.timberKitSku : cfg.mountingRules.basePlate.concreteKitSku,
      category: "accessory", quantity: postCount, unit: "pack",
      notes: isTimber ? "Timber fixing kit, one 4-pack per base-plated post" : "Concrete fixing kit, one 4-pack per base-plated post",
    });
  }
}

function runPostBoundaryCount(run: CanonicalRun): number {
  return (run.leftBoundary?.type === "product_post" ? 1 : 0)
    + (run.rightBoundary?.type === "product_post" ? 1 : 0)
    + (run.corners?.length ?? 0);
}

// ─── Slat internal SKU helpers ────────────────────────────────────────────────

function slatInternalSku(
  cfg: CalculatorConfig, finishFamily: string, economySlats: boolean, slatSize: number, colour: string,
): string {
  if (economySlats) return isku(cfg.internalSkus.slat.economy, { slatSize, colour });
  if (finishFamily === "alumawood") {
    return isku(slatSize === 90 ? cfg.internalSkus.slat.awood90 : cfg.internalSkus.slat.awood65, { colour });
  }
  return isku(cfg.internalSkus.slat.standard, { slatSize, colour });
}

function gateBladeSlatInternalSku(
  cfg: CalculatorConfig, finishFamily: string, economySlats: boolean, slatSize: number, colour: string, verticalBuild = false,
): string {
  if (verticalBuild) return slatInternalSku(cfg, finishFamily, economySlats, slatSize, colour);
  if (slatSize === 90) return slatInternalSku(cfg, finishFamily, economySlats, 90, colour);
  // Swing gate 65mm blades use gate colour suffix (fallback to MN for unsupported)
  return isku(cfg.internalSkus.slat.standard, { slatSize: 65, colour: colourSkuSuffix(colour) });
}

function stockLengthForSlidingTrack(sku: string): number {
  return sku.includes("3000") ? 3000 : 6000;
}

// ─── Gate frame emission helpers ──────────────────────────────────────────────

function emitQsgGateFrameLines(
  lines: QtyLine[], base: { runId: string; segmentId: string },
  slatSize: number, colour: string, leafCount: number,
  frameCutMm: number, railCutMm: number, verticalBuild: boolean,
  numGateBlades: number, slatGap: number,
  cfg: CalculatorConfig,
) {
  const gf = cfg.internalSkus.gate;
  const gfStockMm = cfg.stockLengths.frame.gateFrame; // 4200
  const sfPerStock = Math.max(1, Math.floor(gfStockMm / frameCutMm));
  const sfPieces = 2 * leafCount;
  const railScrewPacks = Math.ceil((4 * leafCount) / cfg.packSizes.gateRailScrews);
  const infillStock = verticalBuild ? gfStockMm : cfg.stockLengths.rail.gateHoriz; // 4200 or 4800
  const infillCut = verticalBuild ? frameCutMm : railCutMm;
  const infillsPerStock = Math.max(1, Math.floor(infillStock / infillCut));
  const coverPieces = 2 * leafCount;
  const coversPerStock = Math.max(1, Math.floor(gfStockMm / frameCutMm));
  const spacerPacks = Math.ceil((Math.max(0, numGateBlades - 1) * 2 * leafCount) / cfg.packSizes.spacers);
  const waferScrewPacks = Math.ceil((numGateBlades * 2 * leafCount) / cfg.packSizes.slatScrews);
  const c = colourSkuSuffix(colour);

  emit(lines, { ...base, sku: isku(gf.sideFrame, { colour: c }), category: "gate_side_frame", quantity: Math.ceil(sfPieces / sfPerStock), unit: "length", notes: `${sfPieces} QSG side-frame pieces, ${Math.round(frameCutMm)}mm cuts from ${gfStockMm}mm stock` });
  emit(lines, { ...base, sku: slatSize === 90 ? "QSG-JOINER90-4PK" : "QSG-JOINER65-4PK", category: "hardware", quantity: leafCount, unit: "pack", notes: `${slatSize === 90 ? "90mm" : "65mm"} joiner blocks for QSG gate rails` });
  emit(lines, { ...base, sku: isku(gf.cover, { colour: c }), category: "hardware", quantity: Math.ceil(coverPieces / coversPerStock), unit: "length", notes: `Gate screw cover, ${Math.round(frameCutMm)}mm cuts from ${gfStockMm}mm stock` });
  emit(lines, { ...base, sku: cfg.internalSkus.screws.gateRail, category: "screw", quantity: railScrewPacks, unit: "pack", notes: "QSG rail screws for top and bottom rails" });
  emit(lines, { ...base, sku: isku(gf.cap, { colour: c }), category: "accessory", quantity: 4 * leafCount, unit: "each", notes: "Gate top caps for 50mm x 50mm side frame, 4 per leaf" });
  emit(lines, { ...base, sku: isku(verticalBuild ? gf.infillVert : gf.infillHoriz, { colour: c }), category: "accessory", quantity: Math.ceil((2 * leafCount) / infillsPerStock), unit: "length", notes: `${verticalBuild ? "Channel infill" : "Gate infill"} for gate frame void, ${Math.round(infillCut)}mm cuts from ${infillStock}mm stock` });
  emit(lines, { ...base, sku: isku(cfg.internalSkus.spacer, { gapCode: gapCode(slatGap) }), category: "spacer", quantity: spacerPacks, unit: "pack", notes: `${Math.max(0, numGateBlades - 1)} gaps/leaf, one spacer at each end of each gap` });
  emit(lines, { ...base, sku: cfg.internalSkus.screws.slatFixing, category: "screw", quantity: waferScrewPacks, unit: "pack", notes: "16mm wafer screws for fixing slats to gate rails/side frames" });
}

function emitQsgSlidingGateFrameLines(
  lines: QtyLine[], base: { runId: string; segmentId: string },
  slatSize: number, colour: string,
  frameCutMm: number, railCutMm: number, verticalBuild: boolean,
  numGateBlades: number, slatGap: number,
  cfg: CalculatorConfig,
) {
  const gf = cfg.internalSkus.gate;
  const gfStockMm = cfg.stockLengths.frame.gateFrame; // 4200
  const sfPerStock = Math.max(1, Math.floor(gfStockMm / frameCutMm));
  const infillStock = verticalBuild ? gfStockMm : cfg.stockLengths.rail.gateHoriz;
  const infillCut = verticalBuild ? frameCutMm : railCutMm;
  const infillsPerStock = Math.max(1, Math.floor(infillStock / infillCut));
  const coversPerStock = Math.max(1, Math.floor(gfStockMm / frameCutMm));
  const slidingRailStock = cfg.stockLengths.rail.gateSliding; // 6100
  const railsPerStock = Math.max(1, Math.floor(slidingRailStock / railCutMm));
  const spacerPacks = Math.ceil((Math.max(0, numGateBlades - 1) * 2) / cfg.packSizes.spacers);
  const waferScrewPacks = Math.ceil((numGateBlades * 2) / cfg.packSizes.slatScrews);
  const railSize = verticalBuild ? 65 : slatSize === 90 ? 90 : 65;
  const c = colourSkuSuffix(colour);
  const topRailTemplate = verticalBuild ? gf.slideTopRail65 : slatSize === 90 ? gf.slideTopRail90 : gf.slideTopRail65;

  emit(lines, { ...base, sku: isku(gf.sideFrame, { colour: c }), category: "gate_side_frame", quantity: Math.ceil(2 / sfPerStock), unit: "length", notes: `2 QSG sliding side-frame pieces, ${Math.round(frameCutMm)}mm cuts from ${gfStockMm}mm stock` });
  emit(lines, { ...base, sku: isku(topRailTemplate, { colour: c }), category: "gate_rail", quantity: Math.ceil(1 / railsPerStock), unit: "length", notes: `Sliding gate top rail, ${Math.round(railCutMm)}mm cut from ${slidingRailStock}mm stock` });
  emit(lines, { ...base, sku: isku(gf.slideBotRail, { colour: c }), category: "gate_rail", quantity: Math.ceil(1 / railsPerStock), unit: "length", notes: `Sliding gate bottom rail, ${Math.round(railCutMm)}mm cut from ${slidingRailStock}mm stock` });
  emit(lines, { ...base, sku: railSize === 90 ? "QSG-JOINER90-4PK" : "QSG-JOINER65-4PK", category: "hardware", quantity: 1, unit: "pack", notes: `${railSize}mm joiner blocks for sliding gate rails` });
  emit(lines, { ...base, sku: isku(gf.cover, { colour: c }), category: "hardware", quantity: Math.ceil(2 / coversPerStock), unit: "length", notes: `Gate screw cover, ${Math.round(frameCutMm)}mm cuts from ${gfStockMm}mm stock` });
  emit(lines, { ...base, sku: isku(verticalBuild ? gf.infillVert : gf.infillHoriz, { colour: c }), category: "accessory", quantity: Math.ceil(2 / infillsPerStock), unit: "length", notes: `${verticalBuild ? "Gate channel infill" : "Gate infill"} for side-frame void, ${Math.round(infillCut)}mm cuts from ${infillStock}mm stock` });
  emit(lines, { ...base, sku: cfg.internalSkus.screws.gateRail, category: "screw", quantity: 1, unit: "pack", notes: "QSG rail screws for sliding top and bottom rails" });
  emit(lines, { ...base, sku: isku(cfg.internalSkus.spacer, { gapCode: gapCode(slatGap) }), category: "spacer", quantity: spacerPacks, unit: "pack", notes: `${Math.max(0, numGateBlades - 1)} gaps, one spacer at each end of each gap` });
  emit(lines, { ...base, sku: cfg.internalSkus.screws.slatFixing, category: "screw", quantity: waferScrewPacks, unit: "pack", notes: "16mm wafer screws for fixing slats to sliding gate rails/side frames" });
  emit(lines, { ...base, sku: isku(gf.cap, { colour: c }), category: "accessory", quantity: 2, unit: "each", notes: "Gate top caps for the two sliding gate side frames" });
}

// ─── Gate segment calculator ──────────────────────────────────────────────────

function calculateGateSegment(
  run: CanonicalRun, segment: CanonicalSegment,
  mergedRunVars: Record<string, unknown>,
  sink: Sink, cfg: CalculatorConfig,
  components: CalcContext["components"],
  resolveInternalSku: CalcContext["resolveInternalSku"],
): QtyLine[] {
  const lines: QtyLine[] = [];
  const vars = { ...mergedRunVars, ...(segment.variables ?? {}) };
  const movement = gateMovementOrDefault(vars[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  const build = String(vars[GATE_SEGMENT_STUB_KEYS.gateBuild] ?? (cfg.gateRules.defaultInfill === "vertical" ? "qsg_hinged_vertical" : "qsg_hinged_horizontal"));
  const colour = String(vars[GATE_SEGMENT_STUB_KEYS.colourCode] ?? vars.colour_code ?? "B");
  const slatGap = toNumber(vars[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? vars.slat_gap_mm, 9);
  const slatSize = toNumber(vars[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? vars.slat_size_mm, 65);
  const finishFamily = String(vars.finish_family ?? "standard"), economySlats = finishFamily === "economy";
  const openingWidthMm = toNumber(segment.segmentWidthMm, 900);
  const whiteHardware = isWhiteHardwareFinish(colour);
  const hingeValue = String(vars[GATE_SEGMENT_STUB_KEYS.hingeType] ?? (whiteHardware ? "TC-H-AT-HD-2L-W" : "TC-H-AT-HD-B"));
  const latchValue = String(vars[GATE_SEGMENT_STUB_KEYS.latchType] ?? (whiteHardware ? "LL-DL-W" : "LL-DL-KA"));
  const gateHeightMm = toNumber(segment.targetHeightMm ?? vars[GATE_SEGMENT_STUB_KEYS.gateHeightMm], toNumber(mergedRunVars.target_height_mm, 1800));
  const hingeGapMm = movement === "sliding" ? 0 : hingeGapForSku(hingeValue);
  const latchGapMm = movement === "sliding" ? 0 : latchGapForSku(latchValue);
  const gateGeometry = gateLeafGeometry({ movement, openingWidthMm, hingeGapMm, latchGapMm });
  const { leafCount, leafWidthMm } = gateGeometry;
  const totalLeafClearanceMm = gateGeometry.totalClearanceMm;
  const base = { runId: run.runId, segmentId: segment.segmentId };
  const verticalBuild = build.includes("vertical");
  const g = cfg.geometry;

  sink.computed[run.runId] = sink.computed[run.runId] ?? {};
  sink.computed[run.runId][segment.segmentId] = {
    ...(sink.computed[run.runId][segment.segmentId] ?? {}),
    gate_movement: movement, gate_build: build, gate_leaf_count: leafCount,
    gate_leaf_width_mm: Math.round(leafWidthMm), gate_clearance_mm: Math.round(totalLeafClearanceMm),
    gate_opening_width_mm: Math.round(openingWidthMm), gate_height_mm: Math.round(gateHeightMm),
  };

  if (movement === "sliding") {
    const bladeCutMm = verticalBuild
      ? Math.max(1, gateHeightMm - g.slidingBladeCutVertDeduction)
      : Math.max(1, openingWidthMm - g.slidingBladeCutHorizDeduction);
    const railCutMm = Math.max(1, openingWidthMm - g.slidingRailCutDeduction);
    const frameCutMm = Math.max(1, gateHeightMm - g.slidingFrameCutDeduction);
    const numGateBlades = Math.max(1, verticalBuild
      ? Math.floor((openingWidthMm - g.slidingBladeVertWidthDeduction + slatGap) / (slatSize + slatGap))
      : Math.floor((gateHeightMm - slatGap - 216) / (slatSize + slatGap)));
    const bladesPerStock = Math.max(1, Math.floor(cfg.stockLengths.rail.gateSliding / bladeCutMm));
    const csrRequired = openingWidthMm > g.slidingCsrAboveMm;
    const csrCutMm = Math.max(1, frameCutMm - g.slidingCsrCutDeduction);
    const csrsPerStock = Math.max(1, Math.floor(cfg.stockLengths.frame.sideFrame / csrCutMm));
    const csrColour = colourSkuSuffix(colour);

    emit(lines, { ...base, sku: gateBladeSlatInternalSku(cfg, finishFamily, economySlats, slatSize, colour, verticalBuild), category: "gate", quantity: Math.ceil(numGateBlades / bladesPerStock), unit: "length", notes: `${numGateBlades} gate blades, ${Math.round(bladeCutMm)}mm cuts from ${cfg.stockLengths.rail.gateSliding}mm stock` });
    emitQsgSlidingGateFrameLines(lines, base, slatSize, colour, frameCutMm, railCutMm, verticalBuild, numGateBlades, slatGap, cfg);

    if (csrRequired) {
      const csrInternal = ALUMAWOOD_CORE_COLOURS.has(colour)
        ? isku(cfg.internalSkus.frame.csrAW, { colour })
        : isku(cfg.internalSkus.frame.csr, { colour: csrColour });
      const csrCapInternal = isku(cfg.internalSkus.frame.csrCap, { colour: csrCapColour(csrColour) });
      // CSR plate: resolve then check component exists — fallback to MN if the colour SKU isn't stocked.
      const csrPlateCandidateInternal = isku(cfg.internalSkus.frame.csrPlate, { colour: csrColour });
      const csrPlateCandidateSku = resolveInternalSku(csrPlateCandidateInternal);
      const csrPlateInternal = components.some((c) => c.sku === csrPlateCandidateSku)
        ? csrPlateCandidateInternal
        : isku(cfg.internalSkus.frame.csrPlate, { colour: "MN" });
      emit(lines, { ...base, sku: csrInternal, category: "centre_support_rail", quantity: Math.ceil(1 / csrsPerStock), unit: "length", notes: `1 centre support rail(s) for sliding gate over ${g.slidingCsrAboveMm}mm` });
      emit(lines, { ...base, sku: csrCapInternal, category: "accessory", quantity: 1, unit: "each", notes: "Centre support rail cap" });
      emit(lines, { ...base, sku: csrPlateInternal, category: "accessory", quantity: 2, unit: "each", notes: "Top and bottom plates for sliding gate centre support rails" });
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
    const motorSku = autoEnabled
      ? (autoPower === "mains" && cableDist > 30 ? "XPSG-FILO-400PRO-SP" : "XPSG-FILO-400")
      : knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.slidingMotorType]);
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

  // ── Swing gate ──────────────────────────────────────────────────────────────
  if (!build.startsWith("qsg_hinged_")) {
    sink.warnings.push(`${build} gate build is selectable for workflow testing, but full frame kit rules still need QSG workbook verification.`);
  }
  const bladeCutMm = verticalBuild
    ? Math.max(1, gateHeightMm - g.swingBladeCutVertDeduction)
    : Math.max(1, leafWidthMm - g.swingBladeCutHorizDeduction);
  const railCutMm = Math.max(1, leafWidthMm - g.swingRailCutDeduction);
  const numGateBlades = Math.max(1, verticalBuild
    ? Math.floor((leafWidthMm - g.swingBladeCutHorizDeduction + slatGap) / (slatSize + slatGap))
    : Math.floor((gateHeightMm - g.swingBladeCutVertDeduction + slatGap) / (slatSize + slatGap)));
  const bladesPerStock = Math.max(1, Math.floor(cfg.stockLengths.rail.gateSliding / bladeCutMm));
  const railsPerStock = Math.max(1, Math.floor(cfg.stockLengths.rail.gateHoriz / railCutMm));
  const c = colourSkuSuffix(colour);

  emit(lines, { ...base, sku: gateBladeSlatInternalSku(cfg, finishFamily, economySlats, slatSize, colour, verticalBuild), category: "gate", quantity: Math.ceil((numGateBlades * leafCount) / bladesPerStock), unit: "length", notes: `${numGateBlades} gate blades/leaf, ${Math.round(bladeCutMm)}mm cuts from ${cfg.stockLengths.rail.gateSliding}mm stock` });
  emit(lines, { ...base, sku: isku(slatSize === 90 ? cfg.internalSkus.gate.rail90 : cfg.internalSkus.gate.rail65, { colour: c }), category: "gate", quantity: Math.ceil((2 * leafCount) / railsPerStock), unit: "length", notes: `Top/bottom QSG gate rails, ${Math.round(railCutMm)}mm cuts from ${cfg.stockLengths.rail.gateHoriz}mm stock` });
  emitQsgGateFrameLines(lines, base, slatSize, colour, leafCount, Math.max(1, gateHeightMm), railCutMm, verticalBuild, numGateBlades, slatGap, cfg);

  const stopSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.gateStopType]);
  if (stopSku) emit(lines, { ...base, sku: stopSku, category: "hardware", quantity: leafCount, unit: "each", notes: "Selected gate stop" });

  const selectedKitSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.hardwareKitSku]);
  const matchingKit = kitForHardwareSelection(hingeValue, latchValue);
  const kitSku = leafCount === 1 && selectedKitSku && matchingKit?.kitSku === selectedKitSku ? selectedKitSku : undefined;
  const hingeSku = knownSelectedSku(hingeValue), latchSku = knownSelectedSku(latchValue);

  if (kitSku) {
    emit(lines, { ...base, sku: kitSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected hinge and latch kit" });
    emitSelectedOptionalAddOns(lines, base, vars, kitSku, 1, components);
  } else {
    if (hingeSku) { emit(lines, { ...base, sku: hingeSku, category: "hardware", quantity: leafCount, unit: "each", notes: "Selected hinge hardware" }); emitSelectedOptionalAddOns(lines, base, vars, hingeSku, leafCount, components); }
    if (latchSku) { emit(lines, { ...base, sku: latchSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected latch / lock hardware" }); emitSelectedOptionalAddOns(lines, base, vars, latchSku, 1, components); }
  }
  const hardwareForCaps = kitSku ?? hingeSku ?? baseHardwareSku(hingeValue);
  if (isTruCloseHardware(hardwareForCaps)) emitSelectedOptionalAddOns(lines, base, vars, "TRUCLOSE_HINGE", leafCount, components);
  if (vars[GATE_SEGMENT_STUB_KEYS.includeExternalAccessKit] === true) emit(lines, { ...base, sku: "LLB", category: "hardware", quantity: 1, unit: "each", notes: "Optional external access kit for selected Lokk Latch" });
  const dropBoltSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.dropBoltType] ?? (movement === "double_swing" ? "SS-0300DB-B" : "none"));
  if (dropBoltSku) emit(lines, { ...base, sku: dropBoltSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected drop bolt" });
  if (vars[GATE_SEGMENT_STUB_KEYS.includeLockBox] === true) {
    sink.warnings.push("A legacy XP lock-box option was present on this gate, but XP gate frame hardware is discontinued and is no longer added to QuickScreen gates.");
  }

  return lines;
}

// ─── Vertical slat run calculator (VS system) ─────────────────────────────────

function calculateVerticalSlatRun(
  payload: CanonicalPayload, run: CanonicalRun,
  sink: Sink, cfg: CalculatorConfig,
  components: CalcContext["components"],
  resolveInternalSku: CalcContext["resolveInternalSku"],
): QtyLine[] {
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
    if (segment.segmentKind === "gate_opening") {
      lines.push(...calculateGateSegment(run, segment, mergedRunVars, sink, cfg, components, resolveInternalSku));
      continue;
    }
    const vars = { ...mergedRunVars, ...(segment.variables ?? {}) };
    const colour = String(vars.colour_code ?? vars.colour ?? runColour);
    const slatSize = toNumber(vars.slat_size_mm, 65), slatGap = toNumber(vars.slat_gap_mm, 5);
    const finishFamily = String(vars.finish_family ?? runFinishFamily), economySlats = finishFamily === "economy";
    // VS uses the same stock lengths as horizontal slats
    const slatStockLengthMm = economySlats ? cfg.stockLengths.slat.economy : finishFamily === "alumawood" ? cfg.stockLengths.slat.awood : cfg.stockLengths.slat.standard;
    const segmentWidthMm = toNumber(segment.segmentWidthMm, 0);
    const targetHeightMm = toNumber(segment.targetHeightMm ?? vars.target_height_mm, 1800);
    if (segmentWidthMm <= 0) continue;
    const segMaxPanel = clampPostSpacing(vars.max_panel_width_mm, cfg.panelRules.maxPanelWidthMm);
    const numPanels = Math.max(1, Math.ceil(segmentWidthMm / segMaxPanel));
    const panelWidthMm = segmentWidthMm / numPanels;
    internalPanelPosts += Math.max(0, numPanels - 1);
    // VS: numVertSlats fitted across the panel width
    const numVertSlats = Math.max(1, Math.floor((panelWidthMm - 8 + slatGap) / (slatGap + slatSize)));
    const slatCutMm = Math.max(1, targetHeightMm);           // full height
    const railCutMm = Math.max(1, panelWidthMm);             // no deduction on VS rails
    const fSectionCutMm = Math.max(1, targetHeightMm);
    const slatsPerStock = Math.max(1, Math.floor(slatStockLengthMm / slatCutMm));
    const railsPerStock = Math.max(1, Math.floor(cfg.stockLengths.frame.vsRail / railCutMm));
    const railInsertsPSt = Math.max(1, Math.floor(cfg.stockLengths.frame.vsRailInsert / railCutMm));
    const fSectPSt = Math.max(1, Math.floor(cfg.stockLengths.frame.vsFSection / fSectionCutMm));
    const slatStocks = Math.ceil((numVertSlats * numPanels) / slatsPerStock);
    const railStocks = Math.ceil((2 * numPanels) / railsPerStock);
    const railInsertStocks = Math.ceil((2 * numPanels) / railInsertsPSt);
    const fSectionStocks = Math.ceil((2 * numPanels) / fSectPSt);
    const screwPacks = Math.ceil((Math.ceil((numVertSlats * numPanels * cfg.packSizes.screwWasteFactor) / 10) * 10) / cfg.packSizes.slatScrews);

    sink.computed[run.runId] = sink.computed[run.runId] ?? {};
    sink.computed[run.runId][segment.segmentId] = {
      num_vertical_slats: numVertSlats, num_panels: numPanels,
      panel_width_mm: Math.round(panelWidthMm), slat_cut_mm: Math.round(slatCutMm), rail_cut_mm: Math.round(railCutMm),
    };

    const base = { runId: run.runId, segmentId: segment.segmentId };
    const isAW = finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(colour);
    emit(lines, { ...base, sku: slatInternalSku(cfg, finishFamily, economySlats, slatSize, colour), category: "slat", quantity: slatStocks, unit: "length", notes: `${numVertSlats} vertical slats/panel, ${Math.round(slatCutMm)}mm cuts from ${slatStockLengthMm}mm stock` });
    emit(lines, { ...base, sku: isku(cfg.internalSkus.frame.vertRail, { colour }), category: "rail", quantity: railStocks, unit: "length", notes: `Top/bottom U-channel rails, ${Math.round(railCutMm)}mm cuts from ${cfg.stockLengths.frame.vsRail}mm stock` });
    emit(lines, { ...base, sku: isku(isAW ? cfg.internalSkus.frame.sideFrameAW : cfg.internalSkus.frame.sideFrame, { colour }), category: "rail_insert", quantity: railInsertStocks, unit: "length", notes: `QS-SF inserts inside top/bottom rails, ${Math.round(railCutMm)}mm cuts from ${cfg.stockLengths.frame.vsRailInsert}mm stock` });
    emit(lines, { ...base, sku: isku(isAW ? cfg.internalSkus.frame.fSectionAW : cfg.internalSkus.frame.fSection, { colour }), category: "f_section", quantity: fSectionStocks, unit: "length", notes: `2 vertical side F-sections/panel, ${Math.round(fSectionCutMm)}mm cuts from ${cfg.stockLengths.frame.vsFSection}mm stock` });
    emit(lines, { ...base, sku: cfg.internalSkus.screws.slatFixing, category: "screw", quantity: screwPacks, unit: "pack", notes: "Vertical slat fixing screws" });
    emitCornerLines(lines, sink.warnings, base, segment.variables, "left", finishFamily, colour, targetHeightMm, cfg);
    emitCornerLines(lines, sink.warnings, base, segment.variables, "right", finishFamily, colour, targetHeightMm, cfg);
    if (panelWidthMm > cfg.panelRules.maxPanelWidthMm) sink.warnings.push(`VS panel width ${Math.round(panelWidthMm)}mm exceeds recommended ${cfg.panelRules.maxPanelWidthMm}mm; split into more panels.`);
  }

  const postCount = runPostBoundaryCount(run) + internalPanelPosts;
  const postHeight = toNumber(firstFenceSeg?.targetHeightMm ?? mergedRunVars.target_height_mm, 1800);
  emitPostLines(lines, run, firstFenceSeg?.segmentId ?? run.runId, postCount, runFinishFamily, postSize, postHeight, runPostColour, mountingType, cfg, components);
  emitPostFixingLines(lines, run, firstFenceSeg?.segmentId ?? run.runId, postCount, mergedRunVars, mountingType, cfg);
  return lines;
}

// ─── Horizontal slat run calculator (QSHS / BAYG / XPL) ──────────────────────

const SUPPORTED_PRODUCTS = new Set(["QSHS", "BAYG", "VS", "XPL"]);

function csrCountForPanel(panelWidthMm: number, thresholds: CalculatorConfig["panelRules"]["csrThresholds"]): number {
  return thresholds.find((t) => panelWidthMm < t.underMm)?.count ?? 0;
}

function calculateHorizontalSlatRun(
  payload: CanonicalPayload, run: CanonicalRun,
  sink: Sink, cfg: CalculatorConfig,
  components: CalcContext["components"],
  resolveInternalSku: CalcContext["resolveInternalSku"],
): QtyLine[] {
  const lines: QtyLine[] = [];
  if (!SUPPORTED_PRODUCTS.has(run.productCode)) {
    sink.warnings.push(`${run.productCode} is available in product search but the local fallback BOM engine currently calculates QSHS, BAYG, and VS only.`);
    return lines;
  }
  const firstFenceSeg = run.segments.find((s) => s.segmentKind !== "gate_opening");
  const mergedRunVars = { ...payload.variables, ...(run.variables ?? {}), ...(firstFenceSeg?.variables ?? {}) };
  const runColour = String(mergedRunVars.colour_code ?? mergedRunVars.colour ?? "B");
  const runPostColour = String(mergedRunVars.post_colour_code ?? runColour);
  const runFinishFamily = String(mergedRunVars.finish_family ?? "standard");
  const mountingType = String(mergedRunVars.mounting_type ?? mergedRunVars.mounting_method ?? "in_ground");
  const postSize = toNumber(mergedRunVars.post_size, 50);
  const isBayg = cfg.strategy.fence === "panel";
  let internalPanelPosts = 0;

  for (const segment of run.segments) {
    if (segment.segmentKind === "gate_opening") {
      lines.push(...calculateGateSegment(run, segment, mergedRunVars, sink, cfg, components, resolveInternalSku));
      continue;
    }
    const vars = { ...mergedRunVars, ...(segment.variables ?? {}) };
    const colour = String(vars.colour_code ?? vars.colour ?? runColour);
    const postColour = String(vars.post_colour_code ?? colour);
    const slatSize = toNumber(vars.slat_size_mm, 65), slatGap = toNumber(vars.slat_gap_mm, 5);
    const finishFamily = String(vars.finish_family ?? runFinishFamily), economySlats = finishFamily === "economy";
    const slatStockLengthMm = economySlats ? cfg.stockLengths.slat.economy
      : finishFamily === "alumawood" ? cfg.stockLengths.slat.awood
      : cfg.stockLengths.slat.standard;
    const segmentWidthMm = toNumber(segment.segmentWidthMm, 0);
    const targetHeightMm = toNumber(segment.targetHeightMm ?? vars.target_height_mm, 1800);
    if (segmentWidthMm <= 0) continue;

    const slatDesignWidth = designSlatWidthMm(cfg, slatSize);
    const numSlats = Math.max(1, Math.floor((targetHeightMm + slatGap - cfg.geometry.slatHeightDeduction) / (slatDesignWidth + slatGap)));
    const actualHeightMm = Math.round(numSlats * (slatDesignWidth + slatGap) - slatGap + cfg.geometry.slatHeightDeduction);
    const baygPanelQty = isBayg ? Math.max(1, Math.round(toNumber(vars.panel_quantity, 1))) : 1;
    const segMaxPanel = clampPostSpacing(vars.max_panel_width_mm, cfg.panelRules.maxPanelWidthMm);
    const numPanels = isBayg ? baygPanelQty : Math.max(1, Math.ceil(segmentWidthMm / segMaxPanel));
    const panelWidthMm = isBayg ? segmentWidthMm : segmentWidthMm / numPanels;
    if (!isBayg) internalPanelPosts += Math.max(0, numPanels - 1);

    const slatCutMm = Math.max(1, panelWidthMm - cfg.geometry.slatCutDeduction);
    const sideFrameCutMm = Math.max(1, actualHeightMm - cfg.geometry.sideFrameCutDeduction);
    const csrCutMm = Math.max(1, actualHeightMm - cfg.geometry.csrCutDeduction);
    const numCsrPerPanel = csrCountForPanel(panelWidthMm, cfg.panelRules.csrThresholds);

    const runLeftT = run.leftBoundary?.type ?? "product_post";
    const runRightT = run.rightBoundary?.type ?? "product_post";
    const leftEff = effectiveLegacyBoundaryType(runLeftT as "product_post", segment.variables, "left");
    const rightEff = effectiveLegacyBoundaryType(runRightT as "product_post", segment.variables, "right");
    const leftSideFrames = leftEff === "product_post" ? 1 : 0;
    const rightSideFrames = rightEff === "product_post" ? 1 : 0;
    const wallFixings = (leftEff === "wall" ? 1 : 0) + (rightEff === "wall" ? 1 : 0);
    const sideFramePieces = (leftSideFrames + rightSideFrames) * numPanels;
    const fSectionPieces = wallFixings * numPanels;
    const slatsPerStock = Math.max(1, Math.floor(slatStockLengthMm / slatCutMm));
    const sideFramesPerStock = Math.max(1, Math.floor(cfg.stockLengths.frame.sideFrame / sideFrameCutMm));
    const csrPerStock = Math.max(1, Math.floor(cfg.stockLengths.frame.sideFrame / csrCutMm));
    const slatStocks = Math.ceil((numSlats * numPanels) / slatsPerStock);
    const sideFrameStocks = Math.ceil(sideFramePieces / sideFramesPerStock);
    const fSectionStocks = Math.ceil(fSectionPieces / sideFramesPerStock);
    const csrStocks = Math.ceil((numCsrPerPanel * numPanels) / csrPerStock);
    const usesPresetSpacers = String(vars.slat_gap_mode ?? "spacer") !== "custom";
    const spacerEachQty = 2 * Math.max(0, numSlats - 1) * numPanels;
    const spacerPacks = isBayg || !usesPresetSpacers ? 0 : Math.ceil(spacerEachQty / cfg.packSizes.spacers);
    const baygSpacers = isBayg ? spacerEachQty : 0;
    const hasLouvreField = cfg.fields.some((f) => f.field_key === "louvre_treatment");
    const louvreTreatment = hasLouvreField && slatSize === 65
      && (vars.louvre_treatment === true || vars.louvre_treatment === "true");
    if ((vars.louvre_treatment === true || vars.louvre_treatment === "true") && !louvreTreatment) {
      sink.warnings.push("Louvre treatment is only available for horizontal slat systems with 65mm slats.");
    }
    const slatFixingScrews = louvreTreatment ? 0 : numSlats * 2 * numPanels * cfg.packSizes.screwWasteFactor;
    const screwPacks = Math.ceil((slatFixingScrews + numCsrPerPanel * numPanels * 4) / cfg.packSizes.slatScrews);
    const g = cfg.geometry;
    const fSectionScrewQty = fSectionPieces > 0
      ? Math.max(g.fSectionScrewMinPerPiece, Math.ceil((sideFrameCutMm - g.fSectionScrewStartOffset) / g.fSectionScrewSpacing) + 1) * 2 * fSectionPieces
      : 0;

    sink.computed[run.runId] = sink.computed[run.runId] ?? {};
    sink.computed[run.runId][segment.segmentId] = {
      actual_height_mm: actualHeightMm, num_slats: numSlats, num_panels: numPanels,
      panel_width_mm: Math.round(panelWidthMm), slat_cut_mm: Math.round(slatCutMm),
    };

    const base = { runId: run.runId, segmentId: segment.segmentId };
    const isAW = finishFamily === "alumawood" && ALUMAWOOD_CORE_COLOURS.has(colour);
    const louvreBracketColour = cfg.colours.standard.includes(colour) ? colour : cfg.colours.louvreBracketFallback;
    const csrCapCol = csrCapColour(postColour);
    const csrPlateColour = cfg.colours.csrPlate.includes(colourSkuSuffix(postColour)) ? colourSkuSuffix(postColour) : "MN";

    emit(lines, { ...base, sku: slatInternalSku(cfg, finishFamily, economySlats, slatSize, colour), category: "slat", quantity: slatStocks, unit: "length", notes: `${numSlats} slats/panel, ${Math.round(slatCutMm)}mm cuts from ${slatStockLengthMm}mm stock` });
    emit(lines, { ...base, sku: isku(cfg.internalSkus.louvreBracket, { colour: louvreBracketColour }), category: "bracket", quantity: louvreTreatment ? numSlats * numPanels : 0, unit: "pack", notes: "Louvre installation brackets" });
    emit(lines, { ...base, sku: isku(isAW ? cfg.internalSkus.frame.sideFrameAW : cfg.internalSkus.frame.sideFrame, { colour }), category: "side_frame", quantity: sideFrameStocks, unit: "length", notes: `${sideFramePieces} pieces at ${Math.round(sideFrameCutMm)}mm` });
    emit(lines, { ...base, sku: isku(isAW ? cfg.internalSkus.frame.cfcAW : cfg.internalSkus.frame.cfc, { colour }), category: "cfc_cover", quantity: sideFrameStocks, unit: "length", notes: "Auto-added 1:1 with side frame stock" });
    emit(lines, { ...base, sku: cfg.internalSkus.sideFameCap, category: "accessory", quantity: sideFramePieces, unit: "each", notes: "Side frame caps" });
    emit(lines, { ...base, sku: isku(isAW ? cfg.internalSkus.frame.csrAW : cfg.internalSkus.frame.csr, { colour }), category: "centre_support_rail", quantity: csrStocks, unit: "length", notes: numCsrPerPanel > 0 ? `${numCsrPerPanel} CSR/panel at ${Math.round(csrCutMm)}mm` : undefined });
    emit(lines, { ...base, sku: isku(cfg.internalSkus.frame.csrCap, { colour: csrCapCol }), category: "accessory", quantity: numCsrPerPanel * numPanels, unit: "each", notes: "CSR caps" });
    emit(lines, { ...base, sku: isku(isAW ? cfg.internalSkus.frame.fSectionAW : cfg.internalSkus.frame.fSection, { colour }), category: "f_section", quantity: fSectionStocks, unit: "length", notes: `${fSectionPieces} wall termination pieces` });
    emit(lines, { ...base, sku: isku(cfg.internalSkus.screws.xpFixing, { colour: standardAccessoryColour(postColour) }), category: "screw", quantity: Math.ceil(fSectionScrewQty / cfg.packSizes.xpScrews), unit: "pack", notes: "F-section fixing screws" });
    emit(lines, { ...base, sku: isku(cfg.internalSkus.spacer, { gapCode: gapCode(slatGap) }), category: "accessory", quantity: spacerPacks, unit: "pack", notes: `${spacerEachQty} spacers total` });
    emit(lines, { ...base, sku: isku(cfg.internalSkus.spacerEach, { gapCode: gapCode(slatGap) }), category: "accessory", quantity: baygSpacers, unit: "each", notes: `${Math.max(0, numSlats - 1)} gaps x 2 ends x ${numPanels} panel(s)` });
    emit(lines, { ...base, sku: cfg.internalSkus.screws.slatFixing, category: "screw", quantity: screwPacks, unit: "pack", notes: "Screening screws" });
    emitCornerLines(lines, sink.warnings, base, segment.variables, "left", finishFamily, colour, actualHeightMm, cfg);
    emitCornerLines(lines, sink.warnings, base, segment.variables, "right", finishFamily, colour, actualHeightMm, cfg);
    if (panelWidthMm > cfg.panelRules.maxPanelWidthMm) sink.warnings.push(`Panel width ${Math.round(panelWidthMm)}mm exceeds recommended ${cfg.panelRules.maxPanelWidthMm}mm; split into more panels.`);

    // Extra rules (discriminated union — new rule types added in code, suppliers supply params)
    for (const rule of cfg.extraRules ?? []) {
      if (rule.type === "extra_component_above_height" && actualHeightMm > rule.aboveHeightMm) {
        emit(lines, { ...base, sku: rule.internalSku, category: "accessory", quantity: rule.qtyPerPanel * numPanels, unit: "each", notes: rule.notes ?? `Extra component above ${rule.aboveHeightMm}mm height` });
      }
    }
  }

  const postCount = isBayg ? 0 : runPostBoundaryCount(run) + internalPanelPosts;
  const postHeight = toNumber(firstFenceSeg?.targetHeightMm ?? mergedRunVars.target_height_mm, 1800);
  emitPostLines(lines, run, firstFenceSeg?.segmentId ?? run.runId, postCount, runFinishFamily, postSize, postHeight, runPostColour, mountingType, cfg, components);
  emitPostFixingLines(lines, run, firstFenceSeg?.segmentId ?? run.runId, postCount, mergedRunVars, mountingType, cfg);
  return lines;
}

// ─── Public Calculator entry point ────────────────────────────────────────────

/**
 * QuickScreen calculator — handles QSHS horizontal slats, BAYG panels, VS vertical
 * slats, and QS_GATE gate segments. Dispatches internally based on config.strategy.fence.
 *
 * Emits QtyLine[] with INTERNAL SKUs. The orchestrator (calculateLocalBom) resolves
 * them to supplier SKUs via ctx.resolveInternalSku before aggregation.
 */
export function quickScreenCalculator(
  ctx: CalcContext,
  run: CanonicalRun,
  payload: CanonicalPayload,
  sink: Sink,
): QtyLine[] {
  const cfg = ctx.configs.get(run.productCode) ?? ctx.configs.get("QSHS");
  if (!cfg) return [];
  if (cfg.strategy.fence === "vertical_slat") {
    return calculateVerticalSlatRun(payload, run, sink, cfg, ctx.components, ctx.resolveInternalSku);
  }
  return calculateHorizontalSlatRun(payload, run, sink, cfg, ctx.components, ctx.resolveInternalSku);
}
