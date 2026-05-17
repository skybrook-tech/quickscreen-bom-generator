export type GateDiagramNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

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
