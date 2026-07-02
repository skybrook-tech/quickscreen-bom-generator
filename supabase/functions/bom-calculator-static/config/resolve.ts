// config/resolve.ts — variables-aware UI config resolver.
//
// Replaces the static `projectUiConfig(config)` projection with a resolver
// that takes the current variables and returns a fully RESOLVED UiCalculatorConfig:
//   - formFields with options_json resolved for the current variables
//     (finish family → slat/colour lists, etc.), so the client renders fields
//     directly with no product-code branching or live option filtering;
//   - heightLadder.entries computed for the exact current slat/gap (custom gaps
//     included), so the client no longer derives heights;
//   - normalisedVariables echoed back so the client can reconcile cascade
//     corrections (economy finish snapping slat 90→65, colour subset, etc.);
//   - display names + capability flags (gapRules, heightUi, gateRules) so the
//     client never compares product codes.
//
// IP posture unchanged: only resolved option lists and already-public flags
// are projected; geometry (other than slatHeightDeductionMm), internal SKU
// templates, pack sizes, stock lengths, and pricing stay server-side.

import type { CalculatorConfig, FormFieldDef } from "./types.ts";
import type { DerivedHeight } from "./heights.ts";
import {
  colourOptions,
  finishOptions,
  gapOptions,
  heightEntries,
  initialVariables,
  normaliseVariables,
  postColourOptions,
  slatOptions,
  type Variables,
} from "./optionRules.ts";

export type UiFormFields = {
  job: FormFieldDef[];
  run: FormFieldDef[];
  segment: FormFieldDef[];
};

export type UiCalculatorConfig = {
  productCode: string;
  display: CalculatorConfig["display"];
  strategy: { fence: CalculatorConfig["strategy"]["fence"] };
  colours: Pick<
    CalculatorConfig["colours"],
    "standard" | "economy" | "alumawood" | "gate" | "names" | "fallback"
  >;
  finishFamilies: string[];
  panelRules: Pick<CalculatorConfig["panelRules"], "maxPanelWidthMm" | "minPostSpacingMm" | "maxPostSpacingMm">;
  postRules: Pick<CalculatorConfig["postRules"], "longPostThresholdMm">;
  defaults: CalculatorConfig["defaults"];
  formFields: UiFormFields;
  postFixingMaterials: CalculatorConfig["postFixingMaterials"];
  gapRules: CalculatorConfig["gapRules"];
  heightUi: CalculatorConfig["heightUi"];
  heightLadder: { slatHeightDeductionMm: number; entries: DerivedHeight[] };
  gateRules: CalculatorConfig["gateRules"];
  normalisedVariables: Variables;
};

function resolveFieldOptions(
  config: CalculatorConfig,
  field: FormFieldDef,
  variables: Variables,
): unknown[] {
  switch (field.field_key) {
    case "finish_family":
      return finishOptions(config);
    case "slat_size_mm":
      return slatOptions(config, variables);
    case "slat_gap_mm":
      return gapOptions(config);
    case "colour_code":
      return colourOptions(config, variables);
    case "post_colour_code":
      return postColourOptions(config, variables);
    default:
      return Array.isArray(field.options_json) ? field.options_json : [];
  }
}

function resolveFields(
  config: CalculatorConfig,
  fields: FormFieldDef[],
  variables: Variables,
): FormFieldDef[] {
  return fields.map((field) => ({
    ...field,
    options_json: resolveFieldOptions(config, field, variables),
  }));
}

/**
 * Resolve a UI config for the given variables. When `variables` is omitted
 * (or empty), the product's declared field defaults are normalised — used by
 * landing/product-select surfaces that need display names + default options
 * without a concrete run.
 */
export function resolveUiConfig(
  config: CalculatorConfig,
  variables?: Variables,
): UiCalculatorConfig {
  const normalised = normaliseVariables(config, variables ?? initialVariables(config));

  return {
    productCode: config.productCode,
    display: config.display,
    strategy: { fence: config.strategy.fence },
    colours: {
      standard: config.colours.standard,
      economy: config.colours.economy,
      alumawood: config.colours.alumawood,
      gate: config.colours.gate,
      names: config.colours.names,
      fallback: config.colours.fallback,
    },
    finishFamilies: config.finishFamilies,
    panelRules: {
      maxPanelWidthMm: config.panelRules.maxPanelWidthMm,
      minPostSpacingMm: config.panelRules.minPostSpacingMm,
      maxPostSpacingMm: config.panelRules.maxPostSpacingMm,
    },
    postRules: { longPostThresholdMm: config.postRules.longPostThresholdMm },
    defaults: config.defaults,
    formFields: {
      job: resolveFields(config, config.formFields.job, normalised),
      run: resolveFields(config, config.formFields.run, normalised),
      segment: config.formFields.segment,
    },
    postFixingMaterials: config.postFixingMaterials,
    gapRules: config.gapRules,
    heightUi: config.heightUi,
    heightLadder: {
      slatHeightDeductionMm: config.heightLadder.slatHeightDeductionMm,
      entries: heightEntries(config, normalised),
    },
    gateRules: config.gateRules,
    normalisedVariables: normalised,
  };
}
