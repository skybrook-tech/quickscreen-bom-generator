// engine-utils.ts — pure helpers shared between engine.ts and calculators/.
//
// Nothing here depends on module-level mutable state. Functions that need
// component/pricing data take it as explicit parameters.

import type { SeedComponent } from "./config/types.ts";

// ─── Basic math helpers ───────────────────────────────────────────────────────

export function toNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function gapCode(mm: number): string {
  const g = Math.round(mm);
  return g <= 5 ? "05" : g <= 9 ? "09" : g <= 12 ? "12" : g <= 15 ? "15" : g <= 20 ? "20" : "30";
}

export function roundMoney(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Substitutes {key} placeholders in a template string. */
export function isku(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

export const STANDARD_COLOURS = new Set(["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"]);
export const ALUMAWOOD_CORE_COLOURS = new Set(["KWI", "WRC"]);
export const CSR_CAP_COLOURS = new Set(["B", "G", "MN", "S", "SM", "W"]);
export const COLOUR_NAMES: Record<string, string> = {
  B: "Black Satin", MN: "Monument Matt", G: "Woodland Grey Matt",
  SM: "Surfmist Matt", W: "Pearl White Gloss", BS: "Basalt Satin",
  D: "Dune Satin", M: "Mill", P: "Primrose", PB: "Paperbark",
  S: "Palladium Silver Pearl", KWI: "Kwila", WRC: "Western Red Cedar",
  IG: "Island Grey", TR: "Terrain",
};

/** Falls back non-standard colour codes to "MN" for accessory SKUs. */
export function standardAccessoryColour(c: string): string {
  return STANDARD_COLOURS.has(c) ? c : "MN";
}

/** Falls back to "MN" for CSR cap colour codes not in the available set. */
export function csrCapColour(c: string): string {
  return CSR_CAP_COLOURS.has(c) ? c : "MN";
}

/** Falls back colour to "MN" for gate components — not all gate SKUs exist for every colour. */
export function colourSkuSuffix(c: string): string {
  return STANDARD_COLOURS.has(c) || c === "P" ? c : "MN";
}

// ─── Gate hardware types & tables ─────────────────────────────────────────────

export type GateHardwareStatus = "fit" | "tight" | "fail";
export type GateWeightInput = {
  widthMm: number; heightMm: number; slatSizeMm: number; slatGapMm: number;
  finishFamily?: string; build?: string; movement?: string;
};
export type GateWeightEstimate = {
  totalKg: number; requiredRatingKg: number; slatCount: number;
  slatWeightKg: number; frameWeightKg: number; hardwareAllowanceKg: number;
};
export type HingeHardware = {
  sku: string; skuW?: string; label: string; ratingKg: number;
  gapMinMm: number; gapMaxMm: number; selfClose: boolean; poolSafe: boolean; hasWhite: boolean;
};
export type LatchHardware = {
  sku: string; skuW?: string; label: string;
  latchType: "magna" | "lokk" | "t" | "d" | "side_pull" | "accessory" | "none";
  lockable: boolean; poolSafe: boolean; swingOnly: boolean; hasWhite: boolean;
};
export type RankedHardware<T> = T & {
  effectiveSku: string; status: GateHardwareStatus; reasons: string[]; recommended?: boolean;
};
export type GateHardwareHint = {
  weightEstimate: GateWeightEstimate;
  rankedHinges: RankedHardware<HingeHardware>[];
  rankedLatches: RankedHardware<LatchHardware>[];
  recommendedHingeSku?: string;
  recommendedLatchSku?: string;
};

const KG_PER_M_BY_SLAT: Record<string, number> = {
  "65-standard": 0.6, "65-economy": 0.55, "65-alumawood": 0.62,
  "90-standard": 0.85, "90-economy": 0.85, "90-alumawood": 0.88,
};
const SIDE_FRAME_KG_PER_M = 1.5, RAIL_65_KG_PER_M = 1, RAIL_90_KG_PER_M = 1.4;
const INFILL_KG_PER_M = 0.8, COVER_KG_PER_M = 0.5, HARDWARE_ALLOWANCE_KG = 5, HINGE_SAFETY_FACTOR = 1.3;

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
  const slatCount = Math.max(1, vertical
    ? Math.ceil((input.widthMm - 86 + gap) / (slatSize + gap))
    : Math.ceil((input.heightMm - 133 + gap) / (slatSize + gap)));
  const slatLengthM = vertical ? heightM : widthM;
  const slatWeightKg = slatCount * slatLengthM * slatKgM;
  const railKgM = slatSize === 90 ? RAIL_90_KG_PER_M : RAIL_65_KG_PER_M;
  const frameWeightKg = heightM * 2 * SIDE_FRAME_KG_PER_M + widthM * 2 * railKgM + heightM * 2 * INFILL_KG_PER_M + heightM * 2 * COVER_KG_PER_M;
  const totalKg = slatWeightKg + frameWeightKg + HARDWARE_ALLOWANCE_KG;
  return {
    totalKg: roundOne(totalKg),
    requiredRatingKg: Math.ceil((totalKg * HINGE_SAFETY_FACTOR) / 10) * 10,
    slatCount, slatWeightKg: roundOne(slatWeightKg),
    frameWeightKg: roundOne(frameWeightKg), hardwareAllowanceKg: HARDWARE_ALLOWANCE_KG,
  };
}

export function baseHardwareSku(value: unknown): string {
  const sku = String(value ?? "");
  return HINGE_HARDWARE.find((i) => i.sku === sku || i.skuW === sku)?.sku
    ?? LATCH_HARDWARE.find((i) => i.sku === sku || i.skuW === sku)?.sku
    ?? sku;
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

export function rankHinges({ requiredRatingKg, gateGapMm, whiteFinish, requireSelfClosing = true }: {
  requiredRatingKg: number; gateGapMm: number; whiteFinish: boolean; requireSelfClosing?: boolean;
}): RankedHardware<HingeHardware>[] {
  const ranked = HINGE_HARDWARE.map((h) => {
    const reasons: string[] = [];
    if (h.ratingKg < requiredRatingKg) reasons.push(`Rated ${h.ratingKg}kg, needs ${requiredRatingKg}kg`);
    if (gateGapMm < h.gapMinMm || gateGapMm > h.gapMaxMm) reasons.push(`Suits ${h.gapMinMm}-${h.gapMaxMm}mm hinge gap`);
    if (requireSelfClosing && !h.selfClose) reasons.push("Not self closing");
    if (whiteFinish && !h.hasWhite) reasons.push("No white finish");
    const status: GateHardwareStatus = reasons.length > 0 ? "fail" : h.ratingKg <= requiredRatingKg + 20 ? "tight" : "fit";
    return { ...h, effectiveSku: effectiveHardwareSku(h, whiteFinish), status, reasons };
  }).sort((a, b) => {
    const s = hwStatusRank(a.status) - hwStatusRank(b.status); if (s !== 0) return s;
    const ao = Math.max(0, a.ratingKg - requiredRatingKg), bo = Math.max(0, b.ratingKg - requiredRatingKg);
    return ao !== bo ? ao - bo : a.label.localeCompare(b.label);
  });
  const rec = [...ranked].filter((h) => h.status !== "fail")
    .sort((a, b) => a.ratingKg - b.ratingKg || preferredHingeOrder(a.sku) - preferredHingeOrder(b.sku) || a.label.localeCompare(b.label))[0];
  if (rec) rec.recommended = true;
  return ranked;
}

export function rankLatches({ movement, whiteFinish, poolSafePreferred = false }: {
  movement: string; whiteFinish: boolean; poolSafePreferred?: boolean;
}): RankedHardware<LatchHardware>[] {
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

// ─── Gate movement types and geometry ────────────────────────────────────────

export type GateMovement = "single_swing" | "double_swing" | "sliding";

export function normalizeGateMovement(value: unknown): GateMovement | undefined {
  if (typeof value !== "string") return undefined;
  const n = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["single_swing", "single_gate", "single", "swing"].includes(n)) return "single_swing";
  if (["double_swing", "double_gate", "double", "double_swing_gate"].includes(n)) return "double_swing";
  if (["sliding", "slide", "sliding_gate", "slider"].includes(n)) return "sliding";
  return undefined;
}

export function gateMovementOrDefault(value: unknown): GateMovement {
  return normalizeGateMovement(value) ?? "single_swing";
}

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

export function gateLeafGeometry({ movement, openingWidthMm, hingeGapMm, latchGapMm, leafWidthsMm }: {
  movement: unknown; openingWidthMm: number; hingeGapMm: number; latchGapMm: number; leafWidthsMm?: number[];
}) {
  const m = gateMovementOrDefault(movement);
  if (m === "sliding") return { movement: m, leafCount: 1, leafWidthMm: Math.max(1, openingWidthMm), leafWidthsMm: [Math.max(1, openingWidthMm)], totalClearanceMm: 0, hingeClearanceMm: 0, latchClearanceMm: 0 };
  const leafCount = m === "double_swing" ? 2 : 1;
  const hingeClearanceMm = m === "double_swing" ? hingeGapMm * 2 : hingeGapMm;
  const latchClearanceMm = latchGapMm, totalClearanceMm = hingeClearanceMm + latchClearanceMm;
  const clearOpeningMm = Math.max(1, openingWidthMm - totalClearanceMm);
  const cleaned = (leafWidthsMm ?? []).map((v) => Math.round(Number(v))).filter((v) => Number.isFinite(v) && v > 0);
  const widths = leafCount === 2 && cleaned.length >= 2
    ? normaliseLeafPair(cleaned[0], cleaned[1], clearOpeningMm)
    : [Math.max(1, clearOpeningMm / leafCount)];
  return { movement: m, leafCount, leafWidthMm: Math.max(...widths), leafWidthsMm: widths, totalClearanceMm, hingeClearanceMm, latchClearanceMm };
}

// ─── Product / panel helpers ──────────────────────────────────────────────────

export const MIN_POST_SPACING_MM = 100, MAX_POST_SPACING_MM = 3000;

export function clampPostSpacing(value: unknown, fallback = 2600): number {
  const s = Number(value), r = Number.isFinite(s) ? s : fallback;
  return Math.min(MAX_POST_SPACING_MM, Math.max(MIN_POST_SPACING_MM, Math.round(r)));
}

// ─── Segment termination helpers ──────────────────────────────────────────────

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

export function effectiveLegacyBoundaryType(
  runBoundaryType: LegacyBoundaryType,
  vars: Record<string, string | number | boolean> | undefined,
  side: "left" | "right",
): LegacyBoundaryType {
  const key = side === "left" ? SEGMENT_TERMINATION_KEYS.leftKind : SEGMENT_TERMINATION_KEYS.rightKind;
  const kind = parseTerminationKind(vars?.[key]);
  if (!kind) return runBoundaryType;
  if (kind === "system_post") return "product_post";
  if (kind === "corner") return "corner_90";
  return "wall";
}

export function cornerDegreesFromVars(
  vars: Record<string, string | number | boolean> | undefined,
  side: "left" | "right",
): number | undefined {
  const key = side === "left" ? SEGMENT_TERMINATION_KEYS.leftCornerDegrees : SEGMENT_TERMINATION_KEYS.rightCornerDegrees;
  const raw = vars?.[key];
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function classifyCorner(deg: number): CornerType {
  if (Math.abs(deg - 90) <= 2) return "right";
  if (Math.abs(deg - 135) <= 5) return "obtuse";
  return "custom";
}

export function cornerTypeFromVars(
  vars: Record<string, string | number | boolean> | undefined,
  side: "left" | "right",
): CornerType | undefined {
  const key = side === "left" ? SEGMENT_TERMINATION_KEYS.leftCornerType : SEGMENT_TERMINATION_KEYS.rightCornerType;
  const rawType = vars?.[key];
  if (rawType === "right" || rawType === "obtuse" || rawType === "custom") return rawType;
  const degrees = cornerDegreesFromVars(vars, side);
  return degrees === undefined ? undefined : classifyCorner(degrees);
}

// ─── Optional add-on helpers ──────────────────────────────────────────────────

export const OPTIONAL_ACCESSORY_KEY = "optional_add_ons";

export type OptionalAccessory = {
  sku: string; label: string; unitPrice: number; qtyPerParent: number; parentSkus: string[];
};

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

export function optionalAccessoriesForParent(
  parentSku: unknown,
  components: SeedComponent[],
): OptionalAccessory[] {
  const parents = parentCandidates(parentSku);
  const accessories = components.filter((comp) => {
    const optionalParents = [
      ...(Array.isArray(comp.optionalChildOf) ? comp.optionalChildOf : []),
      ...(Array.isArray(comp.metadata?.optionalChildOf)
        ? (comp.metadata!.optionalChildOf as unknown[]).filter((i): i is string => typeof i === "string")
        : []),
    ];
    if (comp.isOptionalAccessory || comp.metadata?.isOptionalAccessory === true) {
      return optionalParents.some((p) => parents.includes(p));
    }
    return false;
  });
  if (parents.includes("TRUCLOSE_HINGE") && !accessories.some((i) => i.sku === "TC-CAPS3")) {
    const caps = components.find((c) => c.sku === "TC-CAPS3");
    if (caps) accessories.push(caps);
  }
  return accessories.map((comp) => ({
    sku: comp.sku,
    label: comp.description ?? comp.name ?? comp.sku,
    unitPrice: Number(comp.default_price ?? 0),
    qtyPerParent: typeof comp.qtyPerParent === "number" ? comp.qtyPerParent
      : typeof comp.metadata?.qtyPerParent === "number" ? comp.metadata.qtyPerParent as number : 1,
    parentSkus: parents,
  }));
}

// ─── Discontinued gate SKU helpers ───────────────────────────────────────────

const DISCONTINUED_XP_GATE_PREFIXES = [
  "XP-4200-GSF", "XP-4200-GI", "XP-GFC", "XP-SCREWSGF", "XP-6100-GB65",
  "XP-GKIT", "XP-XBAT-4200-INF", "XP-6100-HD6545", "XP-4200-GSTOP", "XP-LBOX-", "XP-HDL-",
];

function isDiscontinuedXpGateSku(sku: string): boolean {
  return DISCONTINUED_XP_GATE_PREFIXES.some((p) => sku.startsWith(p));
}

export function knownSelectedSku(value: unknown): string | undefined {
  const sku = String(value ?? "");
  if (!sku || sku === "none" || sku === "auto") return undefined;
  if (isDiscontinuedXpGateSku(sku)) return undefined;
  return sku;
}

// ─── designSlatWidthMm (product-specific slat design dimension) ───────────────

export function designSlatWidthMm(productCode: string, slatSize: number): number {
  if (productCode === "QSHS" || productCode === "BAYG") return slatSize === 90 ? 90 : 65;
  return slatSize;
}
