/**
 * baseCalculatorConfigs.ts — client-side mirror of the edge function's config/base.ts.
 *
 * Only the UI-relevant fields are included here. Calculation constants (geometry,
 * pack sizes, stock lengths, internal SKUs) stay server-side — they're not needed
 * in the browser and should not be exposed.
 *
 * Values are copied from supabase/functions/bom-calculator-static/config/base.ts.
 * Keep in sync if base config changes (or phase 5 will move this to DB).
 */

export interface ClientCalculatorConfig {
  productCode: string;
  strategy: {
    fence: "horizontal_slat" | "vertical_slat" | "panel";
  };
  colours: {
    standard: string[];
    alumawood: string[];
    gate: string[];
    names: Record<string, string>;
    fallback: string;
  };
  panelRules: {
    maxPanelWidthMm: number;
    minPostSpacingMm: number;
    maxPostSpacingMm: number;
  };
  postRules: {
    longPostThresholdMm: number;
  };
  defaults: {
    slatSizeMm: number;
    slatGapMm: number;
    targetHeightMm: number;
    colour: string;
    mountingType: string;
    finishFamily: string;
  };
}

const STANDARD_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"];
const ALUMAWOOD_COLOURS = ["KWI", "WRC"];
const GATE_COLOURS = ["B", "BS", "D", "G", "M", "MN", "P", "PB", "S", "SM", "W"];

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
};

const SHARED_PANEL_RULES: ClientCalculatorConfig["panelRules"] = {
  maxPanelWidthMm: 2600,
  minPostSpacingMm: 100,
  maxPostSpacingMm: 3000,
};

const SHARED_POST_RULES: ClientCalculatorConfig["postRules"] = {
  longPostThresholdMm: 2400,
};

const SHARED_COLOURS: ClientCalculatorConfig["colours"] = {
  standard: STANDARD_COLOURS,
  alumawood: ALUMAWOOD_COLOURS,
  gate: GATE_COLOURS,
  names: COLOUR_NAMES,
  fallback: "MN",
};

const BASE_DEFAULTS: ClientCalculatorConfig["defaults"] = {
  slatSizeMm: 65,
  slatGapMm: 9,
  targetHeightMm: 1800,
  colour: "B",
  mountingType: "in_ground",
  finishFamily: "standard",
};

export const BASE_CLIENT_CONFIGS: Record<string, ClientCalculatorConfig> = {
  QSHS: {
    productCode: "QSHS",
    strategy: { fence: "horizontal_slat" },
    colours: SHARED_COLOURS,
    panelRules: SHARED_PANEL_RULES,
    postRules: SHARED_POST_RULES,
    defaults: BASE_DEFAULTS,
  },
  BAYG: {
    productCode: "BAYG",
    strategy: { fence: "panel" },
    colours: SHARED_COLOURS,
    panelRules: { ...SHARED_PANEL_RULES, maxPanelWidthMm: 3000 },
    postRules: SHARED_POST_RULES,
    defaults: BASE_DEFAULTS,
  },
  VS: {
    productCode: "VS",
    strategy: { fence: "vertical_slat" },
    colours: SHARED_COLOURS,
    panelRules: SHARED_PANEL_RULES,
    postRules: SHARED_POST_RULES,
    defaults: { ...BASE_DEFAULTS, slatGapMm: 20 },
  },
  XPL: {
    productCode: "XPL",
    strategy: { fence: "horizontal_slat" },
    colours: SHARED_COLOURS,
    panelRules: SHARED_PANEL_RULES,
    postRules: SHARED_POST_RULES,
    defaults: { ...BASE_DEFAULTS, slatSizeMm: 65 },
  },
};

/** Fallback config for unknown product codes. */
export const FALLBACK_CLIENT_CONFIG: ClientCalculatorConfig = BASE_CLIENT_CONFIGS.QSHS;

/**
 * Deep-merges a sparse override patch over a base config.
 * Arrays in the patch replace (not append) the base array.
 */
export function mergeCalculatorConfig(
  base: ClientCalculatorConfig,
  patch: Partial<ClientCalculatorConfig>,
): ClientCalculatorConfig {
  return {
    ...base,
    ...patch,
    strategy: { ...base.strategy, ...(patch.strategy ?? {}) },
    colours: { ...base.colours, ...(patch.colours ?? {}) },
    panelRules: { ...base.panelRules, ...(patch.panelRules ?? {}) },
    postRules: { ...base.postRules, ...(patch.postRules ?? {}) },
    defaults: { ...base.defaults, ...(patch.defaults ?? {}) },
  };
}
