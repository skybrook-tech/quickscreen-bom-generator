/**
 * UiCalculatorConfig — response DTO for the `get-calculator-config` edge
 * function. Mirrors `supabase/functions/bom-calculator-static/config/resolve.ts`
 * on the server. This is a shape, not a data source: the base values live in
 * `config/base.ts` (Deno) and are merged with any supplier override +
 * variables-resolved + IP-stripped server-side before being sent here.
 *
 * The config is FULLY RESOLVED for the variables passed in the request:
 * `fields` carries concrete option lists, heightLadder.entries is computed for
 * the current slat/gap, and normalisedVariables echoes the cascade-corrected
 * variables so the client can reconcile. No product-code branching needed.
 */

import type { SchemaField } from "../components/calculator-v3/SchemaDrivenForm";

export type CanonicalVariables = Record<string, string | number | boolean>;

export type DerivedHeight = { N: number; height: number };

export type UiCalculatorConfig = {
  productCode: string;
  display: {
    name: string;
    shortName: string;
    description: string;
  };
  strategy: {
    fence: "horizontal_slat" | "vertical_slat" | "panel";
  };
  colours: {
    standard: string[];
    economy: string[];
    alumawood: string[];
    gate: string[];
    names: Record<string, string>;
    fallback: string;
  };
  finishFamilies: string[];
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
    postSizeMm: number;
    finishFamily: string;
    colour: string;
    mountingType: string;
  };
  fields: SchemaField[];
  formGroups: Array<{ key: string; label: string; sort_order: number }>;
  postFixingMaterials: Array<{ sku: string; label: string; description: string }>;
  gapRules: {
    allowCustom: boolean;
    customMinMm: number;
    customMaxMm: number;
  };
  heightUi: {
    mode: "ladder" | "freeform";
    freeformMinMm?: number;
    freeformMaxMm?: number;
    freeformStepMm?: number;
  };
  heightLadder: { slatHeightDeductionMm: number; entries: DerivedHeight[] };
  gateRules: {
    maxWidthMm: {
      pedestrianHorizontal: number;
      pedestrianVertical: number;
      slidingHorizontal: number;
      slidingVertical: number;
    };
    doubleSwingMaxLeafWidthMm: number;
    heightMinMm: number;
    heightMaxMm: number;
    supported: boolean;
    defaultInfill: "horizontal" | "vertical";
  };
  normalisedVariables: CanonicalVariables;
};
