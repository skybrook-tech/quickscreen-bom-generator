// calculators/registry.ts — maps productCode to a Calculator function.
//
// Adding a new product system (e.g. Colorbond): create a new calculator file
// and register it here. No changes to engine.ts needed.

import type { CalcContext, CanonicalRun, CanonicalPayload, QtyLine } from "../config/types.ts";
import { quickScreenCalculator } from "./quickscreen.ts";
import { colorbondCalculator } from "./colorbond.ts";
import { timberPalingCalculator } from "./timber-paling.ts";

type Sink = { warnings: string[]; computed: Record<string, Record<string, Record<string, unknown>>> };

export type Calculator = (
  ctx: CalcContext,
  run: CanonicalRun,
  payload: CanonicalPayload,
  sink: Sink,
) => QtyLine[];

// BAYG and VS use the same QuickScreen calculator — config.strategy.fence
// determines which code path runs inside it.
const CALCULATORS: Record<string, Calculator> = {
  QSHS: quickScreenCalculator,
  BAYG: quickScreenCalculator,
  VS:   quickScreenCalculator,
  XPL:  quickScreenCalculator,
  // Colorbond steel fencing — bay-based, its own (non-slat) calculator.
  COLORBOND: colorbondCalculator,
  // Timber paling fencing — posts + rails + palings, its own calculator.
  TIMBER_PALING: timberPalingCalculator,
};

function unsupportedCalculator(productCode: string): Calculator {
  return (_ctx, _run, _payload, sink) => {
    sink.warnings.push(`No calculator registered for product code "${productCode}". BOM for this run is empty.`);
    return [];
  };
}

export function calculatorFor(productCode: string): Calculator {
  return CALCULATORS[productCode] ?? unsupportedCalculator(productCode);
}
