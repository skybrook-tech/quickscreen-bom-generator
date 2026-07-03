// config/normalise.ts — generic variable cascade normalisation.
//
// Replaces the per-product-code normaliseVariables in optionRules.ts with a
// fully data-driven approach: field processing order is derived from the JSON
// dependency graph (options_when_json.when keys, snap_unless_json keys,
// follows_field); snapping is driven by resolved options and field hints.
//
// What stays as code (residues — capability-driven, no productCode branches):
//   • post_system/post_size coupling   (snap_to_options:false; allowed set from declared field)
//   • slat_gap custom-gap machinery    (gapRules.allowCustom + slat_gap_mode)
//   • max_panel_width_mm clamp         (panelRules)
//   • target_height_mm/slat_count snap (heightUi.mode + height ladder)

import type { CalculatorConfig, FormFieldDef } from "./types.ts";
import {
  matchesWhen,
  optionNativeValue,
  optionValue,
  resolveOptionsForField,
} from "./optionsWhen.ts";
import { derivedHeightForSlatCount, heightEntries, nearestDerivedHeight } from "./heights.ts";

export type Variables = Record<string, string | number | boolean>;

const DEFAULT_SLAT_GAP_MM = 9;

// ─── Dependency-ordered field processing ─────────────────────────────────────

function extractWhenKeys(when: Record<string, unknown> | undefined): string[] {
  return when ? Object.keys(when) : [];
}

function depsForField(field: FormFieldDef, fieldKeySet: Set<string>): string[] {
  const deps = new Set<string>();

  // Dependencies from options_when_json conditions
  for (const entry of field.options_when_json ?? []) {
    for (const k of extractWhenKeys(entry.when)) {
      if (fieldKeySet.has(k)) deps.add(k);
    }
  }

  // Dependencies from snap_unless_json
  for (const k of extractWhenKeys(field.snap_unless_json)) {
    if (fieldKeySet.has(k)) deps.add(k);
  }

  // follows_field is a direct dependency
  if (field.follows_field && fieldKeySet.has(field.follows_field)) {
    deps.add(field.follows_field);
  }

  return [...deps];
}

function topoSort(fields: FormFieldDef[]): FormFieldDef[] {
  const keySet = new Set(fields.map((f) => f.field_key));
  const adjIn = new Map<string, Set<string>>();
  for (const f of fields) {
    adjIn.set(f.field_key, new Set(depsForField(f, keySet)));
  }

  // Kahn's algorithm — ties broken by sort_order
  const sorted: FormFieldDef[] = [];
  const ready = fields
    .filter((f) => adjIn.get(f.field_key)!.size === 0)
    .sort((a, b) => a.sort_order - b.sort_order);

  while (ready.length > 0) {
    ready.sort((a, b) => a.sort_order - b.sort_order);
    const node = ready.shift()!;
    sorted.push(node);

    for (const f of fields) {
      const inEdges = adjIn.get(f.field_key)!;
      if (inEdges.has(node.field_key)) {
        inEdges.delete(node.field_key);
        if (inEdges.size === 0) ready.push(f);
      }
    }
  }

  // Fallback: if cycle detected, append remaining in declaration order
  if (sorted.length < fields.length) {
    const sortedKeys = new Set(sorted.map((f) => f.field_key));
    for (const f of fields) {
      if (!sortedKeys.has(f.field_key)) sorted.push(f);
    }
  }

  return sorted;
}

// ─── Snap helpers ─────────────────────────────────────────────────────────────

function shouldDefaultSnap(field: FormFieldDef, options: unknown[]): boolean {
  if (field.snap_to_options !== undefined) return field.snap_to_options;
  return options.length > 0 && (field.data_type === "enum" || field.data_type === "number");
}

/** Find the native option value (preserving source type) that matches str. */
function findNativeOption(options: unknown[], str: string): unknown | undefined {
  const match = options.find((o) => optionValue(o) === str);
  return match !== undefined ? optionNativeValue(match) : undefined;
}

// ─── Main normalise ───────────────────────────────────────────────────────────

export function defaultVariablesFromFields(config: CalculatorConfig): Variables {
  const out: Variables = {};
  for (const field of config.fields) {
    if (!(field.settings_for ?? ["run", "segment"]).includes("run")) continue;
    const d = field.default_value_json;
    if (typeof d === "string" || typeof d === "number" || typeof d === "boolean") {
      out[field.field_key] = d;
    }
  }
  return out;
}

export function initialVariables(config: CalculatorConfig): Variables {
  return normaliseVariables(config, defaultVariablesFromFields(config));
}

export function normaliseVariables(
  config: CalculatorConfig,
  variables: Variables,
): Variables {
  const originalVars: Record<string, unknown> = { ...variables };
  let next: Record<string, unknown> = { ...variables };

  const orderedFields = topoSort(config.fields);

  for (const field of orderedFields) {
    const fieldKey = field.field_key;
    const aliases = field.aliases ?? [];

    // 1. Read effective value (alias-first matches mounting_method ?? mounting_type)
    let effectiveValue: unknown = undefined;
    for (const key of [...aliases, fieldKey]) {
      if (next[key] !== undefined) {
        effectiveValue = next[key];
        break;
      }
    }

    // 2. Resolve options (and any set overrides)
    const { options, set } = resolveOptionsForField(config, field, next);
    const effectiveDefault = set?.default_value_json ?? field.default_value_json;

    // 3. Snap if applicable
    const snap =
      shouldDefaultSnap(field, options) &&
      !(field.snap_unless_json && matchesWhen(field.snap_unless_json, next));

    if (snap && options.length > 0) {
      const currentStr = String(effectiveValue ?? "");

      let newNative: unknown;

      if (field.follows_field) {
        // follows_field: mirror until explicitly diverged
        const originalFollowed = originalVars[field.follows_field];
        const originalOwn =
          originalVars[fieldKey] ??
          aliases.reduce<unknown>((v, a) => (v !== undefined ? v : originalVars[a]), undefined);
        const shouldMirror =
          !originalOwn || String(originalOwn) === String(originalFollowed);
        const currentFollowed = next[field.follows_field];

        if (shouldMirror) {
          newNative = findNativeOption(options, String(currentFollowed ?? ""));
          if (newNative === undefined && effectiveDefault !== undefined) {
            newNative = findNativeOption(options, String(effectiveDefault));
          }
          if (newNative === undefined) newNative = optionNativeValue(options[0]);
        } else {
          // Keep own value if valid, else prefer followed colour, then default, then first
          newNative = findNativeOption(options, currentStr);
          if (newNative === undefined) {
            newNative = findNativeOption(options, String(currentFollowed ?? ""));
          }
          if (newNative === undefined && effectiveDefault !== undefined) {
            newNative = findNativeOption(options, String(effectiveDefault));
          }
          if (newNative === undefined) newNative = optionNativeValue(options[0]);
        }
      } else {
        // Standard snap: prefer current value, then default, then first option
        newNative = findNativeOption(options, currentStr);
        if (newNative === undefined && effectiveDefault !== undefined) {
          newNative = findNativeOption(options, String(effectiveDefault));
        }
        if (newNative === undefined) newNative = optionNativeValue(options[0]);
      }

      // 4. Write field_key and all aliases
      next = { ...next, [fieldKey]: newNative };
      for (const alias of aliases) next = { ...next, [alias]: newNative };
    } else {
      // Not snapping — still write-back aliases for sync
      if (effectiveValue !== undefined) {
        next = { ...next, [fieldKey]: effectiveValue };
        for (const alias of aliases) next = { ...next, [alias]: effectiveValue };
      }
    }
  }

  // ─── Residues ─────────────────────────────────────────────────────────────
  // These run for EVERY product (unconditionally) — no productCode branches.

  // 1. post_system / post_size coupling
  //    Derives allowed set + fallback from the declared field (removes XPL branch).
  const postSystemField = config.fields.find((f) => f.field_key === "post_system");
  if (postSystemField) {
    const fieldOpts = Array.isArray(postSystemField.options_json)
      ? postSystemField.options_json.map(optionValue)
      : [];
    const fieldDefault = String(postSystemField.default_value_json ?? "standard_50");
    const allowed = new Set([...fieldOpts, fieldDefault]);
    const fallback = fieldDefault;
    const rawPostSystem = String(next.post_system ?? fallback);
    const validPostSystem = allowed.has(rawPostSystem) ? rawPostSystem : fallback;

    let postSize: number;
    if (validPostSystem === "standard_65") {
      postSize = 65;
    } else if (validPostSystem === "standard_50") {
      postSize = Number(next.post_size) === 65 ? 65 : 50;
    } else {
      // "xpl" or unknown → passthrough
      postSize = Number(next.post_size ?? 50);
    }
    next = { ...next, post_system: validPostSystem, post_size: postSize };
  }

  // 2. Slat-gap custom-gap machinery (depends on gapRules.allowCustom)
  const slatGapField = config.fields.find((f) => f.field_key === "slat_gap_mm");
  if (slatGapField) {
    const gapOpts = Array.isArray(slatGapField.options_json) ? slatGapField.options_json : [];
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
      // Generic pass already snapped slat_gap_mm; just ensure mode is set
      next = { ...next, slat_gap_mode: "spacer" };
    } else {
      // No declared options — round and clamp
      const gap = Number(next.slat_gap_mm);
      next = { ...next, slat_gap_mm: Number.isFinite(gap) && gap >= 0 ? Math.round(gap) : 0 };
    }
  }

  // 3. max_panel_width_mm clamp
  const maxPanel = config.panelRules.maxPanelWidthMm;
  const panelWidth = Number(next.max_panel_width_mm);
  next = {
    ...next,
    max_panel_width_mm:
      Number.isFinite(panelWidth) && panelWidth > 0
        ? Math.min(
            config.panelRules.maxPostSpacingMm,
            Math.max(config.panelRules.minPostSpacingMm, Math.round(panelWidth)),
          )
        : maxPanel,
  };

  // 4. Height ladder snap (only in ladder mode; freeform leaves target_height_mm as-is)
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

  return next as Variables;
}
