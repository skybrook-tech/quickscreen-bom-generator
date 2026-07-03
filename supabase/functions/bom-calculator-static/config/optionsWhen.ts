// config/optionsWhen.ts — declarative conditional-options evaluator.
//
// Shared by normalise.ts (variable cascade snap) and resolve.ts (field
// resolution). The key difference from the client's isVisible(): comparisons
// are string-coerced here (String(actual) === String(expected)) to match the
// Number()/String() coercions in the old option functions. The client's
// visible_when_json semantics are UNCHANGED (still strict equality there).

import type { CalculatorConfig, FormFieldDef, OptionsWhenEntry } from "./types.ts";

// ─── Allowlisted config paths for options_ref ────────────────────────────────
// Only these paths may be projected into the UI payload via options_ref.

const REF_ALLOWLIST: Record<string, (c: CalculatorConfig) => unknown[]> = {
  "colours.standard":    (c) => c.colours.standard,
  "colours.economy":     (c) => c.colours.economy,
  "colours.alumawood":   (c) => c.colours.alumawood,
  "colours.gate":        (c) => c.colours.gate,
  "finishFamilies":      (c) => c.finishFamilies,
  "postFixingMaterials": (c) => c.postFixingMaterials,
};

export function optionValue(option: unknown): string {
  if (option && typeof option === "object" && "value" in option) {
    return String((option as { value: unknown }).value);
  }
  return String(option);
}

/** Get the native (non-coerced) value from an option entry. */
export function optionNativeValue(option: unknown): unknown {
  if (option && typeof option === "object" && "value" in option) {
    return (option as { value: unknown }).value;
  }
  return option;
}

/**
 * Evaluate a when-condition against the current variables.
 * All keys must match (AND). Comparison is string-coerced.
 */
export function matchesWhen(
  when: Record<string, unknown>,
  variables: Record<string, unknown>,
): boolean {
  for (const [key, condition] of Object.entries(when)) {
    const actual = String(variables[key] ?? "");
    if (Array.isArray(condition)) {
      if (!condition.some((v) => actual === String(v))) return false;
    } else if (condition && typeof condition === "object" && "not" in condition) {
      if (actual === String((condition as { not: unknown }).not)) return false;
    } else if (condition && typeof condition === "object" && "not_in" in condition) {
      const arr = (condition as { not_in: unknown[] }).not_in;
      if (arr.some((v) => actual === String(v))) return false;
    } else {
      if (actual !== String(condition)) return false;
    }
  }
  return true;
}

/**
 * Resolve a dotted config ref path (allowlisted). Returns [] for invalid paths.
 */
export function resolveConfigRef(config: CalculatorConfig, path: string): unknown[] {
  const resolver = REF_ALLOWLIST[path];
  if (!resolver) return [];
  const result = resolver(config);
  return Array.isArray(result) ? result : [];
}

/**
 * Resolve the options and any field-level overrides for a field given the
 * current variables. When options_when_json is absent, returns the field's
 * own options_json unchanged (today's default: branch behaviour).
 */
export function resolveOptionsForField(
  config: CalculatorConfig,
  field: FormFieldDef,
  variables: Record<string, unknown>,
): { options: unknown[]; set?: OptionsWhenEntry["set"] } {
  const whenList = field.options_when_json;
  if (!whenList || whenList.length === 0) {
    return { options: Array.isArray(field.options_json) ? field.options_json : [] };
  }

  // First-match-wins
  const entry = whenList.find((e) => !e.when || matchesWhen(e.when, variables));
  if (!entry) {
    return { options: Array.isArray(field.options_json) ? field.options_json : [] };
  }

  // Determine source
  let source: unknown[];
  if (entry.options !== undefined) {
    source = entry.options;
  } else if (entry.options_ref !== undefined) {
    const paths = Array.isArray(entry.options_ref) ? entry.options_ref : [entry.options_ref];
    source = paths.flatMap((p) => resolveConfigRef(config, p));
  } else {
    source = Array.isArray(field.options_json) ? field.options_json : [];
  }

  // Apply intersect filter
  let filtered = source;
  if (entry.intersect !== undefined) {
    const allowed = new Set(entry.intersect.map((v) => String(v)));
    filtered = source.filter((o) => allowed.has(optionValue(o)));
  } else if (entry.intersect_ref !== undefined) {
    const allowed = new Set(
      resolveConfigRef(config, entry.intersect_ref).map((v) => String(v)),
    );
    filtered = source.filter((o) => allowed.has(optionValue(o)));
  }

  return { options: filtered, set: entry.set };
}
