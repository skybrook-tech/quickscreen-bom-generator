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

export function hingeGapForSku(value: unknown): number {
  const sku = baseHardwareSku(value);
  const hinge = HINGE_HARDWARE.find((item) => item.sku === sku || item.skuW === sku);
  if (!hinge) return 20;
  return Math.round((hinge.gapMinMm + hinge.gapMaxMm) / 2);
}

export function latchGapForSku(value: unknown): number {
  const sku = baseHardwareSku(value);
  if (!sku || sku === "none") return 0;
  return 10;
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

export function effectiveHardwareSku<T extends { sku: string; skuW?: string; hasWhite: boolean }>(
  item: T,
  whiteFinish: boolean,
): string {
  return whiteFinish && item.hasWhite && item.skuW ? item.skuW : item.sku;
}

/** Returns all hinges with status 'fit' — no weight-based filtering (ranking happens server-side). */
export function listHinges(whiteFinish: boolean): RankedHardware<HingeHardware>[] {
  return HINGE_HARDWARE.map((hinge) => ({
    ...hinge,
    effectiveSku: effectiveHardwareSku(hinge, whiteFinish),
    status: "fit" as GateHardwareStatus,
    reasons: [],
  }));
}

/** Returns latches with swing-incompatible options flagged for sliding gates. */
export function listLatches(movement: string, whiteFinish: boolean): RankedHardware<LatchHardware>[] {
  return LATCH_HARDWARE.map((latch) => {
    const reasons: string[] = [];
    if (movement === "sliding" && latch.swingOnly && latch.sku !== "none") {
      reasons.push("Swing gates only");
    }
    return {
      ...latch,
      effectiveSku: effectiveHardwareSku(latch, whiteFinish),
      status: (reasons.length > 0 ? "fail" : "fit") as GateHardwareStatus,
      reasons,
    };
  });
}

export function kitForHardwareSelection(hingeValue: unknown, latchValue: unknown) {
  const hingeSku = baseHardwareSku(hingeValue);
  const latchSku = String(latchValue ?? "");
  const latchBase = baseHardwareSku(latchSku);
  return HARDWARE_KITS.find((kit) => {
    const hingeMatches = kit.hingeSku === hingeSku || kit.hingeSku === String(hingeValue ?? "");
    const latchMatches =
      kit.latchSku === latchBase ||
      kit.latchSku === latchSku ||
      (kit.latchSku === "LL-DL-W" && latchSku === "LL-DL-W");
    return hingeMatches && latchMatches;
  });
}

export function isTruCloseHardware(value: unknown): boolean {
  const sku = String(value ?? "");
  return sku.includes("TC-H-AT") || sku.includes("TCHD") || sku === "ML-TL-TC-H-AT";
}



