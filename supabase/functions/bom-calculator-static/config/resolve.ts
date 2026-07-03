// config/resolve.ts — variables-aware UI config resolver.
//
// Replaces the static projectUiConfig with a fully generic resolver: field
// options are resolved via the declarative options_when_json mechanism (no
// field_key or productCode switch). Authoring-only keys (options_when_json,
// snap_to_options, snap_unless_json, follows_field, aliases) are stripped
// before the payload is returned so the wire shape is identical to before.

import type { CalculatorConfig, FormFieldDef } from "./types.ts";
import type { DerivedHeight } from "./heights.ts";
import { heightEntries } from "./heights.ts";
import { resolveOptionsForField } from "./optionsWhen.ts";
import {
  defaultVariablesFromFields,
  initialVariables,
  normaliseVariables,
  type Variables,
} from "./normalise.ts";

export type UiFormGroup = { key: string; label: string; sort_order: number };

export type UiCalculatorConfig = {
  productCode: string;
  display: CalculatorConfig["display"];
  strategy: { fence: CalculatorConfig["strategy"]["fence"] };
  colours: Pick<
    CalculatorConfig["colours"],
    "standard" | "economy" | "alumawood" | "gate" | "names" | "fallback"
  >;
  finishFamilies: string[];
  panelRules: Pick<
    CalculatorConfig["panelRules"],
    "maxPanelWidthMm" | "minPostSpacingMm" | "maxPostSpacingMm"
  >;
  postRules: Pick<CalculatorConfig["postRules"], "longPostThresholdMm">;
  defaults: CalculatorConfig["defaults"];
  fields: FormFieldDef[];
  formGroups: UiFormGroup[];
  postFixingMaterials: CalculatorConfig["postFixingMaterials"];
  gapRules: CalculatorConfig["gapRules"];
  heightUi: CalculatorConfig["heightUi"];
  heightLadder: { slatHeightDeductionMm: number; entries: DerivedHeight[] };
  gateRules: CalculatorConfig["gateRules"];
  normalisedVariables: Variables;
};

/** Fields visible in Run Settings (also the source of run.variables defaults). */
export function runVisibleFields(fields: FormFieldDef[]): FormFieldDef[] {
  return fields.filter((f) => (f.settings_for ?? ["run", "segment"]).includes("run"));
}

/** Fields visible in the per-segment override UI. */
export function segmentVisibleFields(fields: FormFieldDef[]): FormFieldDef[] {
  return fields.filter((f) => (f.settings_for ?? ["run", "segment"]).includes("segment"));
}

// Re-export for callers that imported from resolve.ts (e.g. get-calculator-config)
export { defaultVariablesFromFields, initialVariables, normaliseVariables };
export type { Variables };

function resolveFields(
  config: CalculatorConfig,
  fields: FormFieldDef[],
  variables: Variables,
): FormFieldDef[] {
  return fields.map((field) => {
    const { options, set } = resolveOptionsForField(config, field, variables);
    // Strip authoring-only keys so wire payload is shape-identical to before.
    const {
      options_when_json: _owj,
      snap_to_options: _sto,
      snap_unless_json: _suj,
      follows_field: _ff,
      aliases: _al,
      ...rest
    } = field;
    return { ...rest, ...set, options_json: options };
  });
}

/**
 * Resolve a UI config for the given variables. When variables is omitted,
 * uses the product's declared field defaults — used by landing surfaces.
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
    fields: resolveFields(config, config.fields, normalised),
    formGroups: config.formGroups,
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
