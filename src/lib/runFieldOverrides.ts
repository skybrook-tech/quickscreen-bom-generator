// runFieldOverrides.ts — generic "can a segment override this job/run field"
// helpers, derived entirely from CalculatorConfig.formFields (job + run scope).
//
// Segments are the finest-grain scope in the canonical payload and may
// override any job- or run-level default. Previously this set of overridable
// keys was hand-typed in three separate places in SegmentRow.tsx (matchesMaster,
// rawDifferenceBits, resetToMaster) using QSHS-specific field names — any new
// product's own fields silently fell through all three. Deriving from
// config.formFields keeps this correct for any product without touching
// SegmentRow.tsx again.

import type { UiCalculatorConfig } from "../types/calculatorConfig.types";
import { valueLabel, type SchemaField } from "../components/calculator-v3/SchemaDrivenForm";

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
  return [...config.formFields.job, ...config.formFields.run];
}

/** All variable keys (including companions) a segment may override from job/run defaults. */
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

/** Null-patch clearing every job/run-scope override (+ companions) on a segment. */
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

/** True if none of the segment's job/run-scope keys diverge from the master (job+run) defaults. */
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
 * Per-field {field_key, label, value, changed} bits for every job/run-scope
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
