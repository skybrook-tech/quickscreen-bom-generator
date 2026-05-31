export type GateDiagramNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type GateDiagramOrientation = "horizontal" | "vertical";

export const GATE_DIAGRAM_COMPONENTS: Record<GateDiagramNumber, string> = {
  1: "Gate side frame",
  2: "Horizontal gate rail",
  3: "Slat",
  4: "Gate infill / channel infill",
  5: "Gate screw cover",
  6: "Joiner block",
  7: "Slat spacers",
  8: "Rail screws",
  9: "16mm wafer screws",
  10: "Gate top cap",
  11: "Gate hinges",
  12: "Gate latch",
};

export interface GateDiagramDot {
  number: GateDiagramNumber;
  xPct: number;
  yPct: number;
}

export const GATE_DIAGRAM_IMAGES: Record<
  GateDiagramOrientation,
  { src: string; alt: string }
> = {
  horizontal: {
    src: "/gate-diagrams/qsg-horizontal-gate.png",
    alt: "Horizontal gate assembly with numbered component callouts",
  },
  vertical: {
    src: "/gate-diagrams/qsg-vertical-gate.png",
    alt: "Vertical gate assembly with numbered component callouts",
  },
};

export const GATE_DIAGRAM_DOTS: Record<GateDiagramOrientation, readonly GateDiagramDot[]> = {
  horizontal: [
    { number: 1, xPct: 9.03, yPct: 23.56 },
    { number: 2, xPct: 62.8, yPct: 8.01 },
    { number: 2, xPct: 62.8, yPct: 86.22 },
    { number: 3, xPct: 64.52, yPct: 44.07 },
    { number: 4, xPct: 39.14, yPct: 16.67 },
    { number: 5, xPct: 88.82, yPct: 11.62 },
    { number: 5, xPct: 22.37, yPct: 56.41 },
    { number: 6, xPct: 32.9, yPct: 14.1 },
    { number: 7, xPct: 32.69, yPct: 35.42 },
    { number: 8, xPct: 15.91, yPct: 14.74 },
    { number: 9, xPct: 17.42, yPct: 45.35 },
    { number: 10, xPct: 9.89, yPct: 10.58 },
    { number: 11, xPct: 27.96, yPct: 92.47 },
    { number: 12, xPct: 93.98, yPct: 31.57 },
  ],
  vertical: [
    { number: 1, xPct: 9.37, yPct: 21.45 },
    { number: 2, xPct: 63.83, yPct: 7.39 },
    { number: 2, xPct: 63.83, yPct: 78.12 },
    { number: 3, xPct: 65.58, yPct: 40 },
    { number: 4, xPct: 18.74, yPct: 46.09 },
    { number: 4, xPct: 25.27, yPct: 47.25 },
    { number: 5, xPct: 90.31, yPct: 10.65 },
    { number: 5, xPct: 18.95, yPct: 92.32 },
    { number: 6, xPct: 22.88, yPct: 15.51 },
    { number: 7, xPct: 49.67, yPct: 14.06 },
    { number: 8, xPct: 12.85, yPct: 16.16 },
    { number: 9, xPct: 57.95, yPct: 16.16 },
    { number: 10, xPct: 9.37, yPct: 11.3 },
    { number: 11, xPct: 28.65, yPct: 83.77 },
    { number: 12, xPct: 92.37, yPct: 32.17 },
  ],
};

type GateDiagramMatcher = {
  test: RegExp;
  numbers: GateDiagramNumber[];
};

const GATE_DIAGRAM_MATCHERS: GateDiagramMatcher[] = [
  { test: /^QSG-4200-GSF50-/i, numbers: [1] },
  { test: /^QSG-(4800-RAIL(65|90)|S-6100-(TR65|TR90|BR))-/i, numbers: [2] },
  { test: /^(XP-6100-S65|QS-6100-S90|XP-6500-E65)-/i, numbers: [3] },
  { test: /^QSG-(4800-INF|4200-CINF)-/i, numbers: [4] },
  { test: /^QSG-4200-COVER-/i, numbers: [5] },
  { test: /^QSG-JOINER(65|90)-/i, numbers: [6] },
  { test: /^QS-SPACER-/i, numbers: [7] },
  { test: /^AR-SCR-BR-/i, numbers: [8] },
  { test: /^QS-SCREWS-/i, numbers: [9] },
  { test: /^QSG-GFC-50X50-/i, numbers: [10] },
  { test: /^(KF-|TC-H-|SURECLOSE-|SS-BH|ZF-BBH|CB-HINGE)/i, numbers: [11] },
  { test: /^(ML-TL-KF|ML-TL-TC)/i, numbers: [11, 12] },
  { test: /^(ML-|LL-|T-L|SS-DL|MR-FMLSL)/i, numbers: [12] },
];

export function gateDiagramNumbersForSku(sku: string): GateDiagramNumber[] {
  const match = GATE_DIAGRAM_MATCHERS.find((item) => item.test.test(sku));
  return match?.numbers ?? [];
}

export function primaryGateDiagramNumberForSku(sku: string): GateDiagramNumber | undefined {
  return gateDiagramNumbersForSku(sku)[0];
}

export function gateDiagramTitle(number: GateDiagramNumber): string {
  return `${number}. ${GATE_DIAGRAM_COMPONENTS[number]}`;
}
