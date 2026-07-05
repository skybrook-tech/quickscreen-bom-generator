// calculators/shared.ts — helpers shared by every product calculator.
//
// applyExtraRules is the typed extension hook: new rule TYPES are added here
// (in code, with tests); suppliers/products only supply parameter values via
// `config.extraRules`. This is the sanctioned alternative to a generic
// expression language — see AGENTS.md ("code owns algorithms, data owns facts").

import type { CalculatorConfig, QtyLine } from "../config/types.ts";

/** Per-segment context the rules can read. Provide what your calculator knows. */
export type ExtraRuleContext = {
  runId: string;
  segmentId: string;
  /** Achieved fence height for the segment (extra_component_above_height). */
  actualHeightMm?: number;
  /** Panel/bay count for qtyPerPanel-style rules. */
  numPanels?: number;
  /** Width inputs for the `warning` rule type. */
  panelWidthMm?: number;
  gateWidthMm?: number;
  /** Merged run+segment variables for the `variable_warning` rule type. */
  variables?: Record<string, unknown>;
};

function compare(value: number, op: ">" | ">=" | "<", threshold: number): boolean {
  return op === ">" ? value > threshold : op === ">=" ? value >= threshold : value < threshold;
}

/**
 * Evaluates `config.extraRules` for one segment: pushes component QtyLines onto
 * `lines` and de-duplicated messages onto `warnings`.
 */
export function applyExtraRules(
  rules: CalculatorConfig["extraRules"],
  ctx: ExtraRuleContext,
  lines: QtyLine[],
  warnings: string[],
): void {
  const warnOnce = (message: string) => {
    if (!warnings.includes(message)) warnings.push(message);
  };

  for (const rule of rules ?? []) {
    switch (rule.type) {
      case "extra_component_above_height": {
        if (ctx.actualHeightMm !== undefined && ctx.actualHeightMm > rule.aboveHeightMm) {
          const quantity = Math.ceil(rule.qtyPerPanel * (ctx.numPanels ?? 1));
          if (quantity > 0) {
            lines.push({
              runId: ctx.runId, segmentId: ctx.segmentId,
              sku: rule.internalSku, category: "accessory", quantity, unit: "each",
              notes: rule.notes ?? `Extra component above ${rule.aboveHeightMm}mm height`,
            });
          }
        }
        break;
      }
      case "warning": {
        const value = rule.when.field === "panelWidthMm" ? ctx.panelWidthMm : ctx.gateWidthMm;
        if (value !== undefined && compare(value, rule.when.op, rule.when.value)) {
          warnOnce(rule.message);
        }
        break;
      }
      case "variable_warning": {
        const value = ctx.variables?.[rule.when.variable];
        if (value !== undefined && rule.when.in.some((v) => String(v) === String(value))) {
          warnOnce(rule.message);
        }
        break;
      }
    }
  }
}
