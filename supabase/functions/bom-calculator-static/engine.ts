// engine.ts — BOM engine orchestrator: types, pricing, aggregation,
//             suggested accessories, gate hardware hints.
//
// Calculation logic moved to calculators/quickscreen.ts.
// Config types and canonical payload types moved to config/types.ts.
// Shared helpers moved to engine-utils.ts.
//
// DB-only: components + pricing come from the DB ctx built by index.ts.
// Public API:
//   calculateLocalBom(payload, tier, ctx?) — optional ctx; with no ctx the run
//     is UNPRICED (correct SKUs/quantities, $0 prices — offline/no-DB mode).
//   suggestAccessories(payload, bomLines, tier, ctx?)
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
import { normaliseVariables } from "./config/normalise.ts";
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

// ─── Context factories ────────────────────────────────────────────────────────
// The engine is DB-only: components + pricing come from the DB (via index.ts).
// With no ctx (offline/no-DB), quantities and SKUs are still correct but every
// line prices at $0 with a "no local price found" assumption — this is an
// online app, and the DB is the only price source. Tests that need prices build
// an explicit ctx from engine_test_fixtures.ts.

/** Builds an empty (unpriced) CalcContext. Used when no ctx is provided. */
function makeDefaultCalcContext(): CalcContext {
  return {
    components: [],
    pricingRules: [],
    configs: new Map(Object.entries(BASE_CONFIGS)),
    resolveInternalSku: makeInternalSkuResolver([]),
  };
}

/** Builds a CalcContext from DB-loaded data. */
export function makeCalcContext(opts: {
  dbComponents: SeedComponent[];
  dbPricingRules: LocalPricingRule[];
  configs: Map<string, import("./config/types.ts").CalculatorConfig>;
}): CalcContext {
  const components = [...opts.dbComponents];
  const pricingRules = [...opts.dbPricingRules];
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
  return (components ?? []).find((c) => c.sku === sku);
}

function matchesPriceRule(rule: string | null | undefined, qty: number): boolean {
  if (!rule) return true;
  const m = rule.replace(/\s+/g, " ").trim().toLowerCase().match(/^qty\s*(>=|>|<=|<|==|=)\s*(\d+(?:\.\d+)?)$/);
  if (!m) return false;
  const op = m[1], threshold = Number(m[2]);
  return op === ">=" ? qty >= threshold : op === ">" ? qty > threshold : op === "<=" ? qty <= threshold : op === "<" ? qty < threshold : qty === threshold;
}

export function priceForSku(sku: string, qty: number, tier: PricingTier, pricingRules?: LocalPricingRule[], components?: SeedComponent[]): number {
  const rules = pricingRules ?? [];
  const comps = components ?? [];
  // Qty-gated rules are TIER-AWARE with a tier1 base: seeds store the full
  // break schedule on tier1 and sparse tier2/tier3 rows only where a tier's
  // price differs. Overlay the requested tier's rows onto tier1 per
  // (rule, priority) break, then match by quantity.
  const gated = rules.filter((r) => r.sku === sku && r.rule != null);
  const byBreak = new Map<string, LocalPricingRule>();
  for (const r of gated) if (r.tier_code === "tier1") byBreak.set(`${r.rule}|${r.priority ?? 0}`, r);
  for (const r of gated) if (r.tier_code === tier) byBreak.set(`${r.rule}|${r.priority ?? 0}`, r);
  const explicitRules = [...byBreak.values()].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const exMatch = explicitRules.find((r) => matchesPriceRule(r.rule, qty))
    // Last-resort legacy path: gated rows exist but none on tier1/this tier
    // (shouldn't happen with seeded data) — match across all tiers rather
    // than silently pricing $0.
    ?? gated.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)).find((r) => matchesPriceRule(r.rule, qty));
  if (exMatch) return exMatch.price;
  const tierRules = rules.filter((r) => r.sku === sku && r.tier_code === tier && !r.rule).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (tierRules.length > 0) return tierRules[0].price;
  const t1 = rules.find((r) => r.sku === sku && r.tier_code === "tier1" && !r.rule);
  return t1?.price ?? getComponent(sku, comps)?.default_price ?? 0;
}

// ─── BOM metadata ─────────────────────────────────────────────────────────────
// LEGACY FALLBACKS ONLY. Component rows are the source of truth: seed
// `metadata.bomCategory` / `subCategory` / `companionOf` / `sortPriority`
// always win (see bomCategoryForSku etc. below). These tables fire only when a
// component row lacks the field — prefer fixing the seed over extending these.

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  slat: "screening", gate: "screening", rail: "frames_and_covers", rail_insert: "frames_and_covers",
  side_frame: "frames_and_covers", cfc_cover: "frames_and_covers", centre_support_rail: "frames_and_covers",
  f_section: "frames_and_covers", gate_side_frame: "gate_components", joiner_block: "gate_components",
  hardware: "gate_hardware", automation: "automation", post: "posts_and_mounting",
  post_accessory: "posts_and_mounting", bracket: "frames_and_covers", screw: "fasteners_and_screws",
  accessory: "tools_and_consumables", mounting: "fixings",
  // Colorbond bay-based categories
  sheet: "screening", cap: "caps_and_plugs", fixing: "fixings",
};
const SUBCATEGORY_MAP: Record<string, string> = {
  slat: "slats", gate: "gate_blades", rail: "rails", rail_insert: "rail_inserts",
  side_frame: "side_frames", cfc_cover: "cover_strips", centre_support_rail: "centre_support_rails",
  f_section: "f_sections", gate_side_frame: "gate_side_frames", joiner_block: "joiner_blocks",
  hardware: "hinges_latches_and_hardware", automation: "automation", post: "posts",
  post_accessory: "post_mounting_accessories", bracket: "brackets", screw: "screws",
  mounting: "grout_concrete_and_anchors", accessory: "tools_and_consumables",
  // Colorbond bay-based categories
  sheet: "sheets", cap: "caps", fixing: "fixings",
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

// ─── Economy slat pack rule (config-driven) ───────────────────────────────────
// Sourced from the slat strategy block: `slat.economySlatSkuPrefix` +
// `slat.packSizes.economySlat`. Products without a slat block have no pack rule.

type EconomyPackRule = { skuPrefix: string; packSize: number };

function economyPackRuleFromConfigs(configs?: Map<string, import("./config/types.ts").CalculatorConfig>): EconomyPackRule | undefined {
  if (!configs) return undefined;
  for (const cfg of configs.values()) {
    const slat = cfg.slat;
    if (slat?.economySlatSkuPrefix && slat.packSizes.economySlat > 0) {
      return { skuPrefix: slat.economySlatSkuPrefix, packSize: slat.packSizes.economySlat };
    }
  }
  return undefined;
}

function applyEconomySlatPackRule(line: QtyLine, pack?: EconomyPackRule): QtyLine {
  if (!pack || !line.sku.startsWith(pack.skuPrefix)) return line;
  const needed = Math.ceil(line.quantity);
  if (needed <= 0) return line;
  const packs = Math.ceil(needed / pack.packSize), ordered = packs * pack.packSize;
  const waste = (ordered - needed) / Math.max(1, needed);
  const switchNote = waste > 0.5 ? ` Buying ${ordered} economy slats but only need ${needed}. Switch to Standard slats?` : "";
  return { ...line, quantity: packs, unit: "pack", notes: `${line.notes ? `${line.notes}; ` : ""}Sold in packs of ${pack.packSize} only.${switchNote}` };
}

function priceQtyLine(line: QtyLine, tier: PricingTier, pricingRules: LocalPricingRule[], components: SeedComponent[], pack?: EconomyPackRule): number {
  if (pack && line.sku.startsWith(pack.skuPrefix) && line.unit === "pack") {
    return roundMoney(priceForSku(line.sku, line.quantity * pack.packSize, tier, pricingRules, components) * pack.packSize);
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

function toBomLine(line: QtyLine, sources: BOMSource[], productCode: string | undefined, tier: PricingTier, pricingRules: LocalPricingRule[], components: SeedComponent[], pack?: EconomyPackRule): BOMLineItem {
  const sourcedQty = sources.reduce((sum, s) => sum + s.qty, 0);
  const pricedLine = applyEconomySlatPackRule({ ...line, quantity: sourcedQty }, pack);
  const unitPrice = priceQtyLine(pricedLine, tier, pricingRules, components, pack);
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
  pack?: EconomyPackRule,
): BOMLineItem[] {
  const agg = new Map<string, { line: QtyLine; sources: BOMSource[]; productCodes: Set<string>; notes: Set<string> }>();
  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) continue;
    const pl = applyEconomySlatPackRule(line, pack), key = keyForLine(pl);
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
    toBomLine({ ...line, notes: notes.size ? [...notes].join("; ") : line.notes }, sources, productCodes.size === 1 ? [...productCodes][0] : undefined, tier, pricingRules, components, pack)
  );
}

// ─── Main entry point ─────────────────────────────────────────────────────────

// Snap a run's effective variables to its product config's valid options before
// calculation. Keys the reconciliation cascade may correct (colour, slat size,
// gap, panel width, …) are repaired here as a server-side safety net — the
// client run-level reconciliation applies the same normaliser, so for a valid
// run this is a no-op. Emits a warning when the colour is snapped so the change
// is visible in the BOM.
function normaliseRunVariables(
  run: CanonicalRun,
  payload: CanonicalPayload,
  ctx: CalcContext,
  warnings: string[],
): CanonicalRun {
  const cfg = ctx.configs?.get(run.productCode);
  if (!cfg) return run;
  const effective = { ...(payload.variables ?? {}), ...(run.variables ?? {}) };
  const normalised = normaliseVariables(
    cfg,
    effective as Record<string, string | number | boolean>,
  ) as CanonicalRun["variables"];
  const beforeColour = effective.colour_code;
  const afterColour = normalised?.colour_code;
  if (beforeColour !== undefined && afterColour !== undefined && String(beforeColour) !== String(afterColour)) {
    warnings.push(`Colour "${beforeColour}" is not available for ${run.productCode} — using "${afterColour}".`);
  }
  return { ...run, variables: normalised };
}

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
    // Gate segments are scoped under the fence product's configured gate UI
    // product code (QS_GATE for slat systems, CB_GATE for Colorbond, …).
    const gateProductCode =
      resolvedCtx.configs.get(run.productCode)?.gateRules.gateProductCode ?? "QS_GATE";
    run.segments.forEach((segment) => {
      if (segment.segmentKind === "gate_opening") {
        gateIndex += 1;
        scopeBySegmentId.set(segment.segmentId, { scopeKind: "gate", scopeId: segment.segmentId, scopeLabel: `R${runIndex + 1} G${gateIndex}`, productCode: gateProductCode });
        return;
      }
      scopeBySegmentId.set(segment.segmentId, { scopeKind: "fence_run", scopeId: run.runId, scopeLabel: `Run ${runIndex + 1}`, productCode: run.productCode });
    });
  });

  // Per-run: call the registered calculator, then resolve internal → supplier SKUs
  const runResults = payload.runs.map((run, index) => {
    const calc = calculatorFor(run.productCode);
    // Normalise the run's effective variables against its config before calc.
    // This snaps any invalid inherited value (e.g. a colour_code carried over
    // from a different product when a section switches product) to the target
    // product's valid option/default — otherwise the calculator would build
    // SKUs that don't exist in the catalogue and every affected line prices $0.
    const runForCalc = normaliseRunVariables(run, payload, resolvedCtx, warnings);
    const internalLines = calc(resolvedCtx, runForCalc, payload, sink);
    // Resolve internal SKUs → supplier SKUs before aggregation
    const resolvedLines = internalLines.map((line) => ({ ...line, sku: resolvedCtx.resolveInternalSku(line.sku) }));
    return { runId: run.runId, label: `Run ${index + 1} - ${run.productCode}`, productCode: run.productCode, items: resolvedLines };
  });

  const { pricingRules, components } = resolvedCtx;
  const economyPack = economyPackRuleFromConfigs(resolvedCtx.configs);
  const lines = aggregateBomLinesWithSources(
    runResults.flatMap((r) => r.items), scopeBySegmentId,
    (l) => `${l.sku}__${l.unit ?? getComponent(l.sku, components)?.unit ?? "each"}`,
    pricingTier, pricingRules, components, economyPack,
  );
  lines.forEach((l) => { if (l.unitPrice === 0) assumptions.push(`No local price found for SKU ${l.sku}.`); });
  const pricedRunResults = runResults.map((run) => ({
    runId: run.runId,
    items: aggregateBomLinesWithSources(run.items, scopeBySegmentId, (l) => `${l.sku}__${l.runId}`, pricingTier, pricingRules, components, economyPack),
  }));
  const subtotal = roundMoney(lines.reduce((s, l) => s + l.lineTotal, 0));
  const gst = roundMoney(subtotal * 0.1), grandTotal = roundMoney(subtotal + gst);
  const gateItems = lines.filter((l) => l.sources?.some((s) => s.scopeKind === "gate"));
  return { lines, runResults: pricedRunResults, gateItems, totals: { subtotal, gst, grandTotal }, warnings, errors, assumptions, computed, pricingTier, generatedAt: new Date().toISOString() };
}

// ─── Suggested accessories ────────────────────────────────────────────────────
// Max panel width comes from the run's config (`panelRules.maxPanelWidthMm`) —
// the old per-product hardcoded map is gone; 2600 is only a last-resort default.

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

function postCountForRun(run: CanonicalRun, defaultMaxPanelMm?: number): number {
  const runVars = run.variables ?? {};
  const baseMaxPanel = clampPostSpacing(runVars.max_panel_width_mm, defaultMaxPanelMm ?? 2600);
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
  const components = ctx?.components ?? [];
  const pricingRules = ctx?.pricingRules ?? [];
  const suggestions: SuggestedAccessory[] = [];
  const bomSkus = new Set(bomLines.map((l) => l.sku));
  const suggest = (sku: string, qty: number, cat: SuggestedAccessory["category"], reason: string, desc: string) =>
    componentSuggestion(sku, qty, cat, reason, desc, components);

  for (const run of payload.runs) {
    const runCfg = ctx?.configs.get(run.productCode);
    // These suggestions (XP posts/plugs/CSR plates, touch-up paint, core-drill
    // kits) are slat-system accessories. Runs without a slat block (Colorbond)
    // get none — their own suggestions can arrive via config later.
    if (!runCfg?.slat) continue;
    const vars: Record<string, unknown> = { ...payload.variables, ...(run.variables ?? {}) };
    const postCount = postCountForRun(run, runCfg?.panelRules.maxPanelWidthMm);
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

    const baseMaxPanel = clampPostSpacing(vars.max_panel_width_mm, runCfg?.panelRules.maxPanelWidthMm ?? 2600);
    const panelCounts = run.segments.filter((s) => s.segmentKind !== "gate_opening").map((seg) => {
      const maxP = clampPostSpacing(seg.variables?.max_panel_width_mm, baseMaxPanel);
      const w = Number(seg.segmentWidthMm ?? 0), panels = w > 0 ? Math.max(1, Math.ceil(w / maxP)) : 0;
      return { panels, panelWidthMm: panels > 0 ? w / panels : 0 };
    });

    if (runCfg?.strategy.fence === "vertical_slat") {
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

  // Accessory touch-up paint colours are collected from every run's own
  // variables (v3 no longer carries job-level payload.variables). Each run
  // contributes its slat colour + resolved post colour; gate segments
  // contribute their gate colour. Falls back to "B" if nothing is set.
  const finishColours = new Set<string>();
  for (const run of payload.runs) {
    const runVars = run.variables ?? {};
    finishColours.add(String(runVars.colour_code ?? "B"));
    finishColours.add(postColourFromVars(runVars));
    for (const seg of run.segments) {
      if (seg.segmentKind !== "gate_opening") continue;
      const gc = String(seg.variables?.[GATE_SEGMENT_STUB_KEYS.colourCode] ?? "");
      if (gc) finishColours.add(gc);
    }
  }
  if (finishColours.size === 0) finishColours.add("B");
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
