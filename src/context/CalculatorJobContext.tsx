/**
 * CalculatorJobContext — publishes the v3 page's job-level state and handlers
 * (job name, property anchor, describe/gate-position handlers, save button
 * state) so the job/BOM panes consume them directly instead of receiving them
 * as drilled props.
 */
import { createContext, useContext } from "react";
import type { CanonicalPayload } from "../types/canonical.types";
import type { ParseResult } from "../lib/describeFenceParser";
import type { PendingParsedGate } from "../lib/calculatorV3Helpers";

export interface CalculatorJobContextValue {
  jobName: string;
  onJobNameChange: (name: string) => void;
  autoOpenFirstSectionRunId: string | null;
  onAutoOpenConsumed: () => void;
  hasLegacyConfiguredPayload: boolean;
  propertyAnchorConfirmed: boolean;
  onAnchorConfirmed: (anchor: {
    anchorLat: number;
    anchorLng: number;
    formattedAddress: string;
    snapshot: NonNullable<CanonicalPayload["snapshot"]>;
  }) => void;
  onDescribeApply: (result: ParseResult) => void;
  onGatePositionRequest: (gate: PendingParsedGate) => void;
  saving: boolean;
  saveJobLabel: string;
  onSaveJob: () => void;
}

const CalculatorJobContext = createContext<CalculatorJobContextValue | null>(
  null,
);

export function CalculatorJobProvider({
  value,
  children,
}: {
  value: CalculatorJobContextValue;
  children: React.ReactNode;
}) {
  return (
    <CalculatorJobContext.Provider value={value}>
      {children}
    </CalculatorJobContext.Provider>
  );
}

export function useCalculatorJob() {
  const ctx = useContext(CalculatorJobContext);
  if (!ctx)
    throw new Error("useCalculatorJob must be used inside CalculatorJobProvider");
  return ctx;
}
