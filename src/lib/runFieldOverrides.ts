// runFieldOverrides.ts — generic "can a segment override this run field"
// helpers, derived entirely from CalculatorConfig.fields (run-scope fields).
//
// The v3 config now ships a single flat `fields` array; each field carries a
// `settings_for` list declaring which UI surfaces it renders on. Segments
// inherit run values and may override any run-visible field. Previously this
// set of overridable keys was hand-typed in three separate places in
// SegmentRow.tsx (matchesMaster, rawDifferenceBits, resetToMaster) using
// QSHS-specific field names — any new product's own fields silently fell
// through all three. Deriving from `runFields(config)` keeps this correct for
// any product without touching SegmentRow.tsx again.

import type { UiCalculatorConfig } from "../types/calculatorConfig.types";
import { valueLabel, type SchemaField } from "../components/calculator-v3/SchemaDrivenForm";

/** Fields visible in Run Settings (also the source of run.variables defaults). */
export function runFields(config: Pick<UiCalculatorConfig, "fields">): SchemaField[] {
  return config.fields.filter((f) => (f.settings_for ?? ["run", "segment"]).includes("run"));
}

/** Fields visible in the per-segment override UI. */
export function segmentFields(config: Pick<UiCalculatorConfig, "fields">): SchemaField[] {
  return config.fields.filter((f) => (f.settings_for ?? ["run", "segment"]).includes("segment"));
}

/**
 * Fields that exist ONLY at segment scope (no run default to inherit). These
 * are the fields a freshly-added segment must be seeded with itself — e.g.
 * BAYG `panel_quantity`, or QS_GATE gate fields. Replaces the former
 * `config.formFields.segment` bucket.
 */
export function segmentOnlyFields(config: Pick<UiCalculatorConfig, "fields">): SchemaField[] {
  return config.fields.filter((f) => {
    const sf = f.settings_for ?? ["run", "segment"];
    return sf.includes("segment") && !sf.includes("run");
  });
}

/**
 * Some control types write an extra "companion" variable alongside their
 * declared field_key that isn't itself a separate config field (e.g.
 * control_type "combined_gap" writes slat_gap_mode next to slat_gap_mm — see
 * formRenderers/combinedGap.tsx). Registered here so overrides involving
 * these controls are cleared/compared correctly without hardcoding product
 * field names.
 */
const CONTROL_TYPE_COMPANION_KEYS: Record<string, string[]> = {
  combined_gap: ["slat_gap_mode"],
};

/** product_code is a structural per-segment override (which system a segment
 * uses), not a declared form field — always treated as overridable. */
const STRUCTURAL_OVERRIDE_KEYS = ["product_code"];

function masterScopeFields(config: UiCalculatorConfig): SchemaField[] {
  return runFields(config);
}

/** All variable keys (including companions) a segment may override from run defaults. */
export function segmentOverrideKeys(config: UiCalculatorConfig): string[] {
  const keys = new Set<string>(STRUCTURAL_OVERRIDE_KEYS);
  for (const field of masterScopeFields(config)) {
    keys.add(field.field_key);
    for (const companion of CONTROL_TYPE_COMPANION_KEYS[field.control_type] ?? []) {
      keys.add(companion);
    }
  }
  return Array.from(keys);
}

/** Null-patch clearing every run-scope override (+ companions) on a segment. */
export function clearSegmentOverridePatch(config: UiCalculatorConfig): Record<string, null> {
  return Object.fromEntries(segmentOverrideKeys(config).map((key) => [key, null]));
}

function sameValue(left: unknown, right: unknown) {
  if (left === undefined || left === null || left === "") {
    return right === undefined || right === null || right === "";
  }
  return String(left) === String(right ?? "");
}

export function unsetOrSame(vars: Record<string, unknown>, key: string, defaultValue: unknown) {
  return vars[key] === undefined || vars[key] === null || sameValue(vars[key], defaultValue);
}

/** True if none of the segment's run-scope keys diverge from the master (run) defaults. */
export function segmentMatchesRun(
  config: UiCalculatorConfig,
  segVars: Record<string, unknown>,
  masterVars: Record<string, unknown>,
): boolean {
  return segmentOverrideKeys(config).every((key) => unsetOrSame(segVars, key, masterVars[key]));
}

export type FieldDifferenceBit = {
  field_key: string;
  label: string;
  value: string;
  changed: boolean;
};

/**
 * Per-field {field_key, label, value, changed} bits for every run-scope
 * field, for display in a "settings that differ from run defaults" list.
 * Callers that already have a better bespoke presentation for a given field
 * (composite values, dedicated formatters like colour swatches, derived
 * quantities) should filter it out of this list by field_key and append
 * their own bit instead — this stays a plain per-field pass so it needs no
 * knowledge of any particular product's fields.
 */
export function segmentDifferenceBits(
  config: UiCalculatorConfig,
  segVars: Record<string, unknown>,
  masterVars: Record<string, unknown>,
): FieldDifferenceBit[] {
  return masterScopeFields(config).map((field) => {
    const segValue = segVars[field.field_key];
    const masterValue = masterVars[field.field_key];
    return {
      field_key: field.field_key,
      label: field.label,
      value: valueLabel(field, segValue ?? masterValue),
      changed: !sameValue(segValue, masterValue),
    };
  });
}
