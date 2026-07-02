/**
 * UiCalculatorConfig — response DTO for the `get-calculator-config` edge
 * function. Mirrors `supabase/functions/bom-calculator-static/config/project.ts`
 * on the server. This is a shape, not a data source: the base values live in
 * `config/base.ts` (Deno) and are merged with any supplier override + IP-stripped
 * server-side before being sent here.
 */

import type { SchemaField } from "../components/calculator-v3/SchemaDrivenForm";

export type UiCalculatorConfig = {
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
    postSizeMm: number;
    finishFamily: string;
    colour: string;
    mountingType: string;
  };
  formFields: {
    job: SchemaField[];
    run: SchemaField[];
    segment: SchemaField[];
  };
  postFixingMaterials: Array<{ sku: string; label: string; description: string }>;
  heightLadder: { slatHeightDeductionMm: number };
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
  };
};
