export type GateMovementForHardware = "single_swing" | "double_swing" | "sliding";
export type GateBuildForHardware =
  | "qsg_hinged_horizontal"
  | "qsg_hinged_vertical"
  | "qsg_sliding_horizontal"
  | "qsg_sliding_vertical";

export type GateHardwareStatus = "fit" | "tight" | "fail";

export type GateWeightInput = {
  widthMm: number;
  heightMm: number;
  slatSizeMm: number;
  slatGapMm: number;
  finishFamily?: string;
  build?: string;
  movement?: string;
};

export type GateWeightEstimate = {
  totalKg: number;
  requiredRatingKg: number;
  slatCount: number;
  slatWeightKg: number;
  frameWeightKg: number;
  hardwareAllowanceKg: number;
};

export type HingeHardware = {
  sku: string;
  skuW?: string;
  label: string;
  ratingKg: number;
  gapMinMm: number;
  gapMaxMm: number;
  selfClose: boolean;
  poolSafe: boolean;
  hasWhite: boolean;
};

export type LatchHardware = {
  sku: string;
  skuW?: string;
  label: string;
  latchType: "magna" | "lokk" | "t" | "d" | "side_pull" | "accessory" | "none";
  lockable: boolean;
  poolSafe: boolean;
  swingOnly: boolean;
  hasWhite: boolean;
};

export type RankedHardware<T> = T & {
  effectiveSku: string;
  status: GateHardwareStatus;
  reasons: string[];
  recommended?: boolean;
};

const KG_PER_M_BY_SLAT: Record<string, number> = {
  "65-standard": 0.6,
  "65-economy": 0.55,
  "65-alumawood": 0.62,
  "90-standard": 0.85,
  "90-economy": 0.85,
  "90-alumawood": 0.88,
};

const SIDE_FRAME_KG_PER_M = 1.5;
const RAIL_65_KG_PER_M = 1;
const RAIL_90_KG_PER_M = 1.4;
const INFILL_KG_PER_M = 0.8;
const COVER_KG_PER_M = 0.5;
const HARDWARE_ALLOWANCE_KG = 5;
const HINGE_SAFETY_FACTOR = 1.3;

export const HINGE_HARDWARE: HingeHardware[] = [
  {
    sku: "TC-H-AT-B",
    label: "D&D TruClose adjustable hinge",
    ratingKg: 30,
    gapMinMm: 10,
    gapMaxMm: 35,
    selfClose: true,
    poolSafe: true,
    hasWhite: false,
  },
  {
    sku: "TC-H-AT-2L-B",
    skuW: "TC-H-AT-2L-W",
    label: "D&D TruClose two-leg adjustable hinge",
    ratingKg: 30,
    gapMinMm: 10,
    gapMaxMm: 50,
    selfClose: true,
    poolSafe: true,
    hasWhite: true,
  },
  {
    sku: "KF-H-FT",
    label: "D&D Kwik Fit fixed hinge pair",
    ratingKg: 30,
    gapMinMm: 10,
    gapMaxMm: 35,
    selfClose: true,
    poolSafe: true,
    hasWhite: false,
  },
  {
    sku: "KF-H-NT",
    label: "D&D Kwik Fit no-tension hinge pair",
    ratingKg: 30,
    gapMinMm: 10,
    gapMaxMm: 35,
    selfClose: false,
    poolSafe: false,
    hasWhite: false,
  },
  {
    sku: "SS-BH10075-B",
    label: "Six Star 100x75 butt hinge",
    ratingKg: 60,
    gapMinMm: 8,
    gapMaxMm: 25,
    selfClose: false,
    poolSafe: false,
    hasWhite: false,
  },
  {
    sku: "TC-H-AT-HD-B",
    label: "D&D TruClose heavy duty hinge",
    ratingKg: 70,
    gapMinMm: 10,
    gapMaxMm: 35,
    selfClose: true,
    poolSafe: true,
    hasWhite: false,
  },
  {
    sku: "TC-H-AT-HD-2L-B",
    skuW: "TC-H-AT-HD-2L-W",
    label: "D&D TruClose heavy duty two-leg hinge",
    ratingKg: 70,
    gapMinMm: 10,
    gapMaxMm: 50,
    selfClose: true,
    poolSafe: true,
    hasWhite: true,
  },
  {
    sku: "ZF-BBH-L",
    label: "Zeus ball bearing hinge",
    ratingKg: 80,
    gapMinMm: 8,
    gapMaxMm: 25,
    selfClose: false,
    poolSafe: false,
    hasWhite: false,
  },
  {
    sku: "KF-AH-AT",
    skuW: "KF-AH-AT-W",
    label: "D&D Kwik Fit aluminium adjustable hinge",
    ratingKg: 120,
    gapMinMm: 15,
    gapMaxMm: 60,
    selfClose: true,
    poolSafe: true,
    hasWhite: true,
  },
  {
    sku: "SURECLOSE-HH",
    label: "D&D SureClose hydraulic closer hinge",
    ratingKg: 120,
    gapMinMm: 10,
    gapMaxMm: 55,
    selfClose: true,
    poolSafe: true,
    hasWhite: false,
  },
  {
    sku: "SURECLOSE-NSC",
    label: "D&D SureClose non self-closing hinge",
    ratingKg: 120,
    gapMinMm: 10,
    gapMaxMm: 55,
    selfClose: false,
    poolSafe: false,
    hasWhite: false,
  },
  {
    sku: "CB-HINGE-B-2PK",
    label: "Colourbond hinge pair",
    ratingKg: 25,
    gapMinMm: 8,
    gapMaxMm: 25,
    selfClose: false,
    poolSafe: false,
    hasWhite: false,
  },
];

export const LATCH_HARDWARE: LatchHardware[] = [
  {
    sku: "LL-DL-KA",
    skuW: "LL-DL-W",
    label: "D&D Lokk Latch Deluxe keyed alike",
    latchType: "lokk",
    lockable: true,
    poolSafe: false,
    swingOnly: true,
    hasWhite: true,
  },
  {
    sku: "LL-DL",
    skuW: "LL-DL-W",
    label: "D&D Lokk Latch Deluxe keyed different",
    latchType: "lokk",
    lockable: true,
    poolSafe: false,
    swingOnly: true,
    hasWhite: true,
  },
  {
    sku: "ML-TL",
    skuW: "ML-TL-W",
    label: "D&D Magna Latch top pull",
    latchType: "magna",
    lockable: true,
    poolSafe: true,
    swingOnly: true,
    hasWhite: true,
  },
  {
    sku: "LLAA",
    skuW: "LLAA-W",
    label: "D&D Lokk Latch general purpose lockable",
    latchType: "lokk",
    lockable: true,
    poolSafe: false,
    swingOnly: true,
    hasWhite: true,
  },
  {
    sku: "T-L",
    label: "D&D T-Latch padlockable",
    latchType: "t",
    lockable: true,
    poolSafe: false,
    swingOnly: true,
    hasWhite: false,
  },
  {
    sku: "SS-DL-B",
    label: "Six Star D latch and striker",
    latchType: "d",
    lockable: false,
    poolSafe: false,
    swingOnly: true,
    hasWhite: false,
  },
  {
    sku: "MR-FMLSL",
    label: "D&D Magna Latch side-pull latch",
    latchType: "side_pull",
    lockable: true,
    poolSafe: true,
    swingOnly: true,
    hasWhite: false,
  },
  {
    sku: "LLB",
    label: "External access kit for Lokk Latch",
    latchType: "accessory",
    lockable: false,
    poolSafe: false,
    swingOnly: true,
    hasWhite: false,
  },
  {
    sku: "none",
    label: "No latch",
    latchType: "none",
    lockable: false,
    poolSafe: false,
    swingOnly: true,
    hasWhite: true,
  },
];

export const HARDWARE_KITS = [
  {
    latchSku: "ML-TL",
    hingeSku: "KF-H-FT",
    kitSku: "ML-TL-KF-H-FT",
    label: "Magna Latch + Kwik Fit fixed hinge kit",
  },
  {
    latchSku: "ML-TL",
    hingeSku: "TC-H-AT-B",
    kitSku: "ML-TL-TC-H-AT",
    label: "Magna Latch + TruClose adjustable hinge kit",
  },
  {
    latchSku: "LL-DL-W",
    hingeSku: "TC-H-AT-HD-2L-W",
    kitSku: "LLDL-TCHD-W",
    label: "Lokk Latch Deluxe white + TruClose HD white kit",
  },
] as const;

export function estimateGateWeight(input: GateWeightInput): GateWeightEstimate {
  const widthM = Math.max(0.1, input.widthMm / 1000);
  const heightM = Math.max(0.1, input.heightMm / 1000);
  const finish =
    input.finishFamily === "economy" || input.finishFamily === "alumawood"
      ? input.finishFamily
      : "standard";
  const slatSize = input.slatSizeMm === 90 ? 90 : 65;
  const slatKgM =
    KG_PER_M_BY_SLAT[`${slatSize}-${finish}`] ??
    KG_PER_M_BY_SLAT[`${slatSize}-standard`];
  const gap = Math.max(0, input.slatGapMm);
  const vertical = String(input.build ?? "").includes("vertical");
  const slatCount = Math.max(
    1,
    vertical
      ? Math.ceil((input.widthMm - 86 + gap) / (slatSize + gap))
      : Math.ceil((input.heightMm - 133 + gap) / (slatSize + gap)),
  );
  const slatLengthM = vertical ? heightM : widthM;
  const slatWeightKg = slatCount * slatLengthM * slatKgM;
  const railKgM = slatSize === 90 ? RAIL_90_KG_PER_M : RAIL_65_KG_PER_M;
  const frameWeightKg =
    heightM * 2 * SIDE_FRAME_KG_PER_M +
    widthM * 2 * railKgM +
    heightM * 2 * INFILL_KG_PER_M +
    heightM * 2 * COVER_KG_PER_M;
  const totalKg = slatWeightKg + frameWeightKg + HARDWARE_ALLOWANCE_KG;
  return {
    totalKg: roundOne(totalKg),
    requiredRatingKg: Math.ceil((totalKg * HINGE_SAFETY_FACTOR) / 10) * 10,
    slatCount,
    slatWeightKg: roundOne(slatWeightKg),
    frameWeightKg: roundOne(frameWeightKg),
    hardwareAllowanceKg: HARDWARE_ALLOWANCE_KG,
  };
}

export function isWhiteHardwareFinish(colour: unknown): boolean {
  const value = String(colour ?? "").toLowerCase();
  return value === "w" || value.includes("white");
}

export function baseHardwareSku(value: unknown): string {
  const sku = String(value ?? "");
  return (
    HINGE_HARDWARE.find((item) => item.sku === sku || item.skuW === sku)?.sku ??
    LATCH_HARDWARE.find((item) => item.sku === sku || item.skuW === sku)?.sku ??
    sku
  );
}

export function effectiveHardwareSku<
  T extends { sku: string; skuW?: string; hasWhite: boolean },
>(item: T, whiteFinish: boolean): string {
  return whiteFinish && item.hasWhite && item.skuW ? item.skuW : item.sku;
}

export function rankHinges({
  requiredRatingKg,
  gateGapMm,
  whiteFinish,
  requireSelfClosing = true,
}: {
  requiredRatingKg: number;
  gateGapMm: number;
  whiteFinish: boolean;
  requireSelfClosing?: boolean;
}): RankedHardware<HingeHardware>[] {
  const ranked: RankedHardware<HingeHardware>[] = HINGE_HARDWARE.map((hinge) => {
    const reasons: string[] = [];
    if (hinge.ratingKg < requiredRatingKg)
      reasons.push(`Rated ${hinge.ratingKg}kg, needs ${requiredRatingKg}kg`);
    if (gateGapMm < hinge.gapMinMm || gateGapMm > hinge.gapMaxMm) {
      reasons.push(`Suits ${hinge.gapMinMm}-${hinge.gapMaxMm}mm hinge gap`);
    }
    if (requireSelfClosing && !hinge.selfClose) reasons.push("Not self closing");
    if (whiteFinish && !hinge.hasWhite) reasons.push("No white finish");

    const status: GateHardwareStatus =
      reasons.length > 0
        ? "fail"
        : hinge.ratingKg <= requiredRatingKg + 20
          ? "tight"
          : "fit";

    return {
      ...hinge,
      effectiveSku: effectiveHardwareSku(hinge, whiteFinish),
      status,
      reasons,
    };
  }).sort((a, b) => hardwareSort(a, b, requiredRatingKg));

  const recommended = [...ranked]
    .filter((hinge) => hinge.status !== "fail")
    .sort(
      (a, b) =>
        a.ratingKg - b.ratingKg ||
        preferredHingeOrder(a.sku) - preferredHingeOrder(b.sku) ||
        a.label.localeCompare(b.label),
    )[0];
  if (recommended) recommended.recommended = true;
  return ranked;
}

export function rankLatches({
  movement,
  whiteFinish,
  poolSafePreferred = false,
}: {
  movement: string;
  whiteFinish: boolean;
  poolSafePreferred?: boolean;
}): RankedHardware<LatchHardware>[] {
  const ranked: RankedHardware<LatchHardware>[] = LATCH_HARDWARE.map(
    (latch) => {
      const reasons: string[] = [];
      if (movement === "sliding" && latch.swingOnly && latch.sku !== "none") {
        reasons.push("Swing gates only");
      }
      if (whiteFinish && !latch.hasWhite && latch.sku !== "none")
        reasons.push("No white finish");
      if (poolSafePreferred && !latch.poolSafe && latch.sku !== "none")
        reasons.push("Not pool-safe");
      const status: GateHardwareStatus = reasons.length > 0 ? "fail" : "fit";
      return {
        ...latch,
        effectiveSku: effectiveHardwareSku(latch, whiteFinish),
        status,
        reasons,
      };
    },
  ).sort(
    (a, b) =>
      hardwareStatusRank(a.status) - hardwareStatusRank(b.status) ||
      a.label.localeCompare(b.label),
  );

  const recommended = ranked.find(
    (latch) => latch.status !== "fail" && latch.sku !== "none",
  );
  if (recommended) recommended.recommended = true;
  return ranked;
}

export function kitForHardwareSelection(
  hingeValue: unknown,
  latchValue: unknown,
) {
  const hingeSku = baseHardwareSku(hingeValue);
  const latchSku = String(latchValue ?? "");
  const latchBase = baseHardwareSku(latchSku);
  return HARDWARE_KITS.find((kit) => {
    const hingeMatches =
      kit.hingeSku === hingeSku || kit.hingeSku === String(hingeValue ?? "");
    const latchMatches =
      kit.latchSku === latchBase ||
      kit.latchSku === latchSku ||
      (kit.latchSku === "LL-DL-W" && latchSku === "LL-DL-W");
    return hingeMatches && latchMatches;
  });
}

export function isTruCloseHardware(value: unknown): boolean {
  const sku = String(value ?? "");
  return (
    sku.includes("TC-H-AT") || sku.includes("TCHD") || sku === "ML-TL-TC-H-AT"
  );
}

function hardwareStatusRank(status: GateHardwareStatus): number {
  if (status === "fit") return 0;
  if (status === "tight") return 1;
  return 2;
}

function hardwareSort(
  a: RankedHardware<HingeHardware>,
  b: RankedHardware<HingeHardware>,
  requiredRatingKg: number,
): number {
  const status = hardwareStatusRank(a.status) - hardwareStatusRank(b.status);
  if (status !== 0) return status;
  const aOver = Math.max(0, a.ratingKg - requiredRatingKg);
  const bOver = Math.max(0, b.ratingKg - requiredRatingKg);
  if (aOver !== bOver) return aOver - bOver;
  return a.label.localeCompare(b.label);
}

function preferredHingeOrder(sku: string): number {
  const order = [
    "TC-H-AT-B",
    "TC-H-AT-2L-B",
    "KF-H-FT",
    "KF-H-NT",
    "TC-H-AT-HD-B",
    "TC-H-AT-HD-2L-B",
    "KF-AH-AT",
    "SURECLOSE-HH",
    "SURECLOSE-NSC",
  ];
  const index = order.indexOf(sku);
  return index === -1 ? 99 : index;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
