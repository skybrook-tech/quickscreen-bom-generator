// config/optionRules.ts — server-side product option logic + variable cascade.
//
// This is the encapsulated home for "what can a field be right now" and
// "what does a variables object normalise to" — the logic that previously
// lived client-side in src/lib/productOptionRules.ts (finish/slat/gap/colour
// option lists + normaliseVariablesForSystem). The v3 client no longer
// branches on product codes; it sends the current variables to
// get-calculator-config and receives a resolved config computed here.
//
// Functions take a CalculatorConfig and (where relevant) the current
// variables, so behaviour is driven by each product's config rather than a
// `productCode === "..."` switch — except for the legacy post_system "xpl"
// shape on XPL, which is genuinely product-specific and kept here as a
// backend-encapsulated branch.

import type { CalculatorConfig, FormFieldDef } from "./types.ts";
import {
  deriveHeights,
  derivedHeightForSlatCount,
  nearestDerivedHeight,
  type DerivedHeight,
} from "./heights.ts";

export type Variables = Record<string, string | number | boolean>;

const DEFAULT_SLAT_GAP_MM = 9;

function clampPostSpacing(
  config: CalculatorConfig,
  value: number,
  fallback: number,
): number {
  const n = Number(value);
  const resolved = Number.isFinite(n) ? n : fallback;
  return Math.min(
    config.panelRules.maxPostSpacingMm,
    Math.max(config.panelRules.minPostSpacingMm, Math.round(resolved)),
  );
}

function jobField(config: CalculatorConfig, key: string): FormFieldDef | undefined {
  return config.formFields.job.find((f) => f.field_key === key);
}

// ─── Option lists (resolved for the current variables) ───────────────────────

export function finishOptions(config: CalculatorConfig): string[] {
  return config.finishFamilies;
}

export function slatOptions(config: CalculatorConfig, variables: Variables): number[] {
  const field = jobField(config, "slat_size_mm");
  const base = Array.isArray(field?.options_json)
    ? (field!.options_json as number[])
    : [65, 90];
  const finish = String(variables.finish_family ?? "standard");
  if (finish === "economy") return base.includes(65) ? [65] : base;
  return base;
}

export function gapOptions(config: CalculatorConfig): number[] {
  const field = jobField(config, "slat_gap_mm");
  return Array.isArray(field?.options_json) ? (field!.options_json as number[]) : [];
}

export function colourOptions(config: CalculatorConfig, variables: Variables): string[] {
  const finish = String(variables.finish_family ?? "standard");
  const slatSize = Number(variables.slat_size_mm ?? 65);
  if (finish === "economy") return config.colours.economy;
  if (finish === "alumawood") {
    return slatSize === 90
      ? config.colours.alumawood.filter((c) => c === "WRC")
      : config.colours.alumawood;
  }
  return config.colours.standard;
}

export function postColourOptions(config: CalculatorConfig, variables: Variables): string[] {
  const finish = String(variables.finish_family ?? "standard");
  if (finish === "alumawood") {
    return [...config.colours.alumawood, ...config.colours.standard];
  }
  return config.colours.standard;
}

// ─── Height ladder for the current slat/gap ──────────────────────────────────

export function heightEntries(
  config: CalculatorConfig,
  variables: Variables,
): DerivedHeight[] {
  if (config.heightUi.mode === "freeform") return [];
  const slatSize = Number(variables.slat_size_mm ?? 65);
  const slatGap = Number(variables.slat_gap_mm ?? DEFAULT_SLAT_GAP_MM);
  if ((slatSize !== 65 && slatSize !== 90) || !Number.isFinite(slatGap) || slatGap < 0) {
    return [];
  }
  return deriveHeights(
    slatSize as 65 | 90,
    slatGap,
    { minN: 5, maxN: 40, minHeight: 300, maxHeight: 2400 },
    config.heightLadder.slatHeightDeductionMm,
  );
}

// ─── Defaults from declared form fields ──────────────────────────────────────

export function defaultVariablesFromFields(config: CalculatorConfig): Variables {
  const out: Variables = {};
  for (const field of [...config.formFields.job, ...config.formFields.run]) {
    if (field.default_value_json !== undefined) {
      const d = field.default_value_json;
      if (typeof d === "string" || typeof d === "number" || typeof d === "boolean") {
        out[field.field_key] = d;
      }
    }
  }
  return out;
}

export function initialVariables(config: CalculatorConfig): Variables {
  return normaliseVariables(config, defaultVariablesFromFields(config));
}

// ─── Variable cascade (port of client normaliseVariablesForSystem) ───────────

export function normaliseVariables(
  config: CalculatorConfig,
  variables: Variables,
): Variables {
  const productCode = config.productCode;

  const finishOpts = finishOptions(config);
  const finish = finishOpts.includes(String(variables.finish_family ?? ""))
    ? String(variables.finish_family)
    : finishOpts[0] ?? "standard";
  let next: Variables = { ...variables, finish_family: finish };

  // Post system — XPL has its own "xpl" post system shape.
  const postSystem = String(
    next.post_system ?? (productCode === "XPL" ? "xpl" : "standard_50"),
  );
  const validPostSystem = ["xpl", "standard_50", "standard_65"].includes(postSystem)
    ? postSystem
    : productCode === "XPL"
      ? "xpl"
      : "standard_50";
  next = {
    ...next,
    post_system: validPostSystem,
    post_size: validPostSystem === "standard_65" ? 65 : Number(next.post_size ?? 50),
  };
  if (validPostSystem === "standard_50" || productCode !== "XPL") {
    next = { ...next, post_size: Number(next.post_size) === 65 ? 65 : 50 };
  }

  // Mounting — mounting_type has a legacy mounting_method alias.
  const mounting = String(next.mounting_method ?? next.mounting_type ?? "in_ground");
  const validMounting = ["in_ground", "base_plate", "core_drill"].includes(mounting)
    ? mounting
    : "in_ground";
  next = { ...next, mounting_type: validMounting, mounting_method: validMounting };

  // Slat size must be in the (finish-aware) option list.
  const slatOpts = slatOptions(config, next);
  if (slatOpts.length > 0 && !slatOpts.map(String).includes(String(next.slat_size_mm))) {
    next = { ...next, slat_size_mm: slatOpts[0] };
  }

  // Colour + post colour (post colour follows fence colour until explicitly diverged).
  const previousColour = String(next.colour_code ?? "");
  const previousPostColour = String(next.post_colour_code ?? previousColour);
  const colourOpts = colourOptions(config, next);
  if (colourOpts.length > 0 && !colourOpts.includes(String(next.colour_code))) {
    next = { ...next, colour_code: colourOpts[0] };
  }

  const postColourOpts = postColourOptions(config, next);
  const keepPostMatchedToFence =
    !next.post_colour_code || previousPostColour === previousColour;
  const postColour = keepPostMatchedToFence
    ? String(next.colour_code)
    : String(next.post_colour_code ?? next.colour_code);
  if (keepPostMatchedToFence && next.post_colour_code !== next.colour_code) {
    next = { ...next, post_colour_code: String(next.colour_code) };
  }
  if (postColourOpts.length > 0 && !postColourOpts.includes(postColour)) {
    next = {
      ...next,
      post_colour_code: postColourOpts.includes(String(next.colour_code))
        ? String(next.colour_code)
        : postColourOpts[0],
    };
  }

  // Slat gap — custom mode only when the product allows it.
  const gapOpts = gapOptions(config);
  const supportsCustom = config.gapRules.allowCustom;
  const customGapMode = supportsCustom && next.slat_gap_mode === "custom";
  if (customGapMode) {
    const gap = Number(next.slat_gap_mm);
    next = {
      ...next,
      slat_gap_mode: "custom",
      slat_gap_mm: Number.isFinite(gap) && gap >= 0 ? Math.round(gap) : DEFAULT_SLAT_GAP_MM,
    };
  } else if (gapOpts.length > 0) {
    next = { ...next, slat_gap_mode: "spacer" };
    if (!gapOpts.map(String).includes(String(next.slat_gap_mm))) {
      next = {
        ...next,
        slat_gap_mm: gapOpts.includes(DEFAULT_SLAT_GAP_MM) ? DEFAULT_SLAT_GAP_MM : gapOpts[0],
      };
    }
  } else {
    const gap = Number(next.slat_gap_mm);
    next = { ...next, slat_gap_mm: Number.isFinite(gap) && gap >= 0 ? Math.round(gap) : 0 };
  }

  // Max panel width clamp.
  const maxPanel = config.panelRules.maxPanelWidthMm;
  const panelWidth = Number(next.max_panel_width_mm);
  next = {
    ...next,
    max_panel_width_mm:
      Number.isFinite(panelWidth) && panelWidth > 0
        ? clampPostSpacing(config, panelWidth, maxPanel)
        : maxPanel,
  };

  // Height snap to ladder (ladder mode only; freeform leaves target_height_mm alone).
  if (config.heightUi.mode === "ladder") {
    const entries = heightEntries(config, next);
    const requestedHeight = Number(next.target_height_mm ?? 1800);
    if (entries.length > 0) {
      const selected =
        derivedHeightForSlatCount(entries, next.slat_count) ??
        nearestDerivedHeight(entries, requestedHeight);
      if (selected) {
        next = { ...next, target_height_mm: selected.height, slat_count: selected.N };
      }
    }
  }

  return next;
}
