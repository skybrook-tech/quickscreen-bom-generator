// config/project.ts — UI-safe projection of a merged CalculatorConfig.
//
// CalculatorConfig carries sensitive IP (internal SKU templates, geometry
// deductions, pack sizes, stock lengths, mounting SKUs) that must never reach
// the browser (see AGENTS.md §10). projectUiConfig() whitelists only the
// fields the v3 client needs to render forms and option lists.

import type { CalculatorConfig } from "./types.ts";

export type UiCalculatorConfig = {
  productCode: string;
  strategy: { fence: CalculatorConfig["strategy"]["fence"] };
  colours: Pick<CalculatorConfig["colours"], "standard" | "alumawood" | "gate" | "names" | "fallback">;
  panelRules: Pick<CalculatorConfig["panelRules"], "maxPanelWidthMm" | "minPostSpacingMm" | "maxPostSpacingMm">;
  postRules: Pick<CalculatorConfig["postRules"], "longPostThresholdMm">;
  defaults: CalculatorConfig["defaults"];
  formFields: CalculatorConfig["formFields"];
  postFixingMaterials: CalculatorConfig["postFixingMaterials"];
  heightLadder: CalculatorConfig["heightLadder"];
  gateRules: CalculatorConfig["gateRules"];
};

export function projectUiConfig(config: CalculatorConfig): UiCalculatorConfig {
  return {
    productCode: config.productCode,
    strategy: { fence: config.strategy.fence },
    colours: {
      standard: config.colours.standard,
      alumawood: config.colours.alumawood,
      gate: config.colours.gate,
      names: config.colours.names,
      fallback: config.colours.fallback,
    },
    panelRules: {
      maxPanelWidthMm: config.panelRules.maxPanelWidthMm,
      minPostSpacingMm: config.panelRules.minPostSpacingMm,
      maxPostSpacingMm: config.panelRules.maxPostSpacingMm,
    },
    postRules: {
      longPostThresholdMm: config.postRules.longPostThresholdMm,
    },
    defaults: config.defaults,
    formFields: config.formFields,
    postFixingMaterials: config.postFixingMaterials,
    heightLadder: config.heightLadder,
    gateRules: config.gateRules,
  };
}
