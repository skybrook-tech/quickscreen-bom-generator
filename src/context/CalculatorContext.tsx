import { createContext, useContext, useReducer } from "react";
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
} from "../types/canonical.types";

// ─── State ───────────────────────────────────────────────────────────────────

export interface CalculatorState {
  /** Canonical BOM engine payload (canvas, runs, gates, job variables). */
  payload: CanonicalPayload | null;
  /** Last `bom-calculator` edge response JSON. */
  bomResult: Record<string, unknown> | null;
}

const initialState: CalculatorState = {
  payload: null,
  bomResult: null,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type CalculatorAction =
  | { type: "SET_PAYLOAD"; payload: CanonicalPayload }
  | { type: "SET_BOM_RESULT"; result: Record<string, unknown> }
  | { type: "UPSERT_RUN"; run: CanonicalRun }
  | { type: "UPSERT_SEGMENT"; runId: string; segment: CanonicalSegment }
  | { type: "REMOVE_SEGMENT"; runId: string; segmentId: string }
  | { type: "REMOVE_RUN"; runId: string };

// ─── Reducer ─────────────────────────────────────────────────────────────────

function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case "SET_PAYLOAD":
      return { ...state, payload: action.payload };
    case "SET_BOM_RESULT":
      return { ...state, bomResult: action.result };
    case "UPSERT_RUN": {
      if (!state.payload) return state;
      const runs = state.payload.runs;
      const idx = runs.findIndex((r) => r.runId === action.run.runId);
      const newRuns =
        idx >= 0
          ? runs.map((r, i) => (i === idx ? action.run : r))
          : [...runs, action.run];
      return {
        ...state,
        payload: { ...state.payload, runs: newRuns },
      };
    }
    case "UPSERT_SEGMENT": {
      if (!state.payload) return state;
      const runs = state.payload.runs.map((r) => {
        if (r.runId !== action.runId) return r;
        const segs = r.segments;
        const idx = segs.findIndex(
          (s) => s.segmentId === action.segment.segmentId,
        );
        const newSegs =
          idx >= 0
            ? segs.map((s, i) => (i === idx ? action.segment : s))
            : [...segs, action.segment];
        return { ...r, segments: newSegs };
      });
      return {
        ...state,
        payload: { ...state.payload, runs },
      };
    }
    case "REMOVE_SEGMENT": {
      if (!state.payload) return state;
      const runs = state.payload.runs.map((r) => {
        if (r.runId !== action.runId) return r;
        return {
          ...r,
          segments: r.segments.filter((s) => s.segmentId !== action.segmentId),
        };
      });
      return {
        ...state,
        payload: { ...state.payload, runs },
      };
    }
    case "REMOVE_RUN": {
      if (!state.payload) return state;
      return {
        ...state,
        payload: {
          ...state.payload,
          runs: state.payload.runs.filter((r) => r.runId !== action.runId),
        },
      };
    }
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface CalculatorContextValue {
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export function CalculatorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  return (
    <CalculatorContext.Provider value={{ state, dispatch }}>
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx)
    throw new Error("useCalculator must be used inside CalculatorProvider");
  return ctx;
}
