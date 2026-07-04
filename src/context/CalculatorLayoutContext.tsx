/**
 * CalculatorLayoutContext — publishes the `useCalculatorLayout` result so the
 * v3 workspace subtree can consume layout state directly instead of receiving
 * it as drilled props. The hook still runs in CalculatorV3Content; this context
 * only re-publishes its return value.
 */
import { createContext, useContext } from "react";
import type { UseCalculatorLayoutResult } from "../hooks/useCalculatorLayout";

const CalculatorLayoutContext = createContext<UseCalculatorLayoutResult | null>(
  null,
);

export function CalculatorLayoutProvider({
  value,
  children,
}: {
  value: UseCalculatorLayoutResult;
  children: React.ReactNode;
}) {
  return (
    <CalculatorLayoutContext.Provider value={value}>
      {children}
    </CalculatorLayoutContext.Provider>
  );
}

export function useCalculatorLayoutContext() {
  const ctx = useContext(CalculatorLayoutContext);
  if (!ctx)
    throw new Error(
      "useCalculatorLayoutContext must be used inside CalculatorLayoutProvider",
    );
  return ctx;
}
