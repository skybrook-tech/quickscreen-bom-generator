/**
 * CalculatorBomStateContext — publishes the `useCalculatorBom` result plus the
 * page-derived display values (run details, animated total, mobile totals,
 * errors/warnings) so the v3 BOM/job panes consume BOM state directly instead
 * of receiving it as drilled props.
 */
import { createContext, useContext } from "react";
import type { UseCalculatorBomResult } from "../hooks/useCalculatorBom";
import type { BomRunDetail } from "../lib/calculatorV3Helpers";

export interface CalculatorBomContextValue extends UseCalculatorBomResult {
  /** Per-run BOM summary blocks rendered above the BOM table. */
  bomRunDetails: BomRunDetail[];
  /** Grand total after the count-up animation, used for the header figure. */
  animatedGrandTotal: number;
  /** Mobile totals strip, or null when there is no BOM yet. */
  mobileBomTotals: { subtotal: number; gst: number; grandTotal: number } | null;
  /** Engine `errors[]`, surfaced in the job pane. */
  errors: string[];
  /** Engine `warnings[]` (angle-drawing warnings filtered out). */
  warnings: string[];
  /** Convenience flag: the last calculation raised an error. */
  isCalcError: boolean;
}

const CalculatorBomStateContext =
  createContext<CalculatorBomContextValue | null>(null);

export function CalculatorBomStateProvider({
  value,
  children,
}: {
  value: CalculatorBomContextValue;
  children: React.ReactNode;
}) {
  return (
    <CalculatorBomStateContext.Provider value={value}>
      {children}
    </CalculatorBomStateContext.Provider>
  );
}

export function useCalculatorBomState() {
  const ctx = useContext(CalculatorBomStateContext);
  if (!ctx)
    throw new Error(
      "useCalculatorBomState must be used inside CalculatorBomStateProvider",
    );
  return ctx;
}
