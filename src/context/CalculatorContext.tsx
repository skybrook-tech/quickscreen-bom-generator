import { createContext, useContext, useReducer } from "react";
import { defaultRunConfig } from "../schemas/calculator.schema";
import type { RunConfig } from "../schemas/calculator.schema";
import type {
  ProductOptions,
  CalculatorDefaults,
} from "../schemas/calculator.schema";
import type { CalculatorBOMResult } from "../types/bom.types";
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
} from "../types/canonical.types";

// ─── State ───────────────────────────────────────────────────────────────────

export interface CalculatorState {
  productId: string | null;
  systemType: string | null;
  productOptions: ProductOptions | null;
  defaults: CalculatorDefaults;
  runs: RunConfig[];
  bomResult: CalculatorBOMResult | null;
  // v3 fields
  canonicalPayload: CanonicalPayload | null;
  v3BomResult: Record<string, unknown> | null;
}

const initialState: CalculatorState = {
  productId: null,
  systemType: null,
  productOptions: null,
  defaults: { slatSize: "65", slatGap: "9", colour: "surfmist-matt" },
  runs: [{ ...defaultRunConfig, id: crypto.randomUUID() }],
  bomResult: null,
  canonicalPayload: null,
  v3BomResult: null,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type CalculatorAction =
  | {
      type: "SET_PRODUCT";
      productId: string;
      systemType: string;
      productOptions: ProductOptions;
    }
  | { type: "SET_DEFAULTS"; defaults: Partial<CalculatorDefaults> }
  | { type: "ADD_RUN"; run: RunConfig }
  | { type: "UPDATE_RUN"; id: string; updates: Partial<RunConfig> }
  | { type: "REMOVE_RUN"; id: string }
  | { type: "SET_BOM_RESULT"; result: CalculatorBOMResult }
  | { type: "RESET" }
  | { type: "SET_CANONICAL_PAYLOAD"; payload: CanonicalPayload }
  | { type: "UPSERT_RUN"; run: CanonicalRun }
  | { type: "UPSERT_SEGMENT"; runId: string; segment: CanonicalSegment }
  | { type: "REMOVE_SEGMENT"; runId: string; segmentId: string }
  | { type: "SET_V3_BOM_RESULT"; result: Record<string, unknown> };

// ─── Reducer ─────────────────────────────────────────────────────────────────

function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case "SET_PRODUCT": {
      const opts = action.productOptions;
      return {
        ...state,
        productId: action.productId,
        systemType: action.systemType,
        productOptions: opts,
        defaults: {
          slatSize: opts.slatSize[0] ?? "65",
          slatGap: opts.slatGap[0] ?? "9",
          colour: opts.colour[0] ?? "surfmist-matt",
        },
        runs: [{ ...defaultRunConfig, id: crypto.randomUUID() }],
        bomResult: null,
      };
    }
    case "SET_DEFAULTS":
      return {
        ...state,
        defaults: { ...state.defaults, ...action.defaults },
        bomResult: null,
      };
    case "ADD_RUN":
      return {
        ...state,
        runs: [...state.runs, action.run],
        bomResult: null,
      };
    case "UPDATE_RUN":
      return {
        ...state,
        runs: state.runs.map((r) =>
          r.id === action.id ? { ...r, ...action.updates } : r,
        ),
        bomResult: null,
      };
    case "REMOVE_RUN":
      console.log("REMOVE_RUN", action.id);
      console.log("state.runs", state.runs);
      return {
        ...state,
        runs: state.runs.filter((r) => r.id !== action.id),
        bomResult: null,
      };
    case "SET_BOM_RESULT":
      return { ...state, bomResult: action.result };
    case "RESET":
      return initialState;
    case "SET_CANONICAL_PAYLOAD":
      return { ...state, canonicalPayload: action.payload };
    case "UPSERT_RUN": {
      if (!state.canonicalPayload) return state;
      const runs = state.canonicalPayload.runs;
      const idx = runs.findIndex((r) => r.runId === action.run.runId);
      const newRuns =
        idx >= 0
          ? runs.map((r, i) => (i === idx ? action.run : r))
          : [...runs, action.run];
      return {
        ...state,
        canonicalPayload: { ...state.canonicalPayload, runs: newRuns },
      };
    }
    case "UPSERT_SEGMENT": {
      if (!state.canonicalPayload) return state;
      const runs = state.canonicalPayload.runs.map((r) => {
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
        canonicalPayload: { ...state.canonicalPayload, runs },
      };
    }
    case "REMOVE_SEGMENT": {
      if (!state.canonicalPayload) return state;
      const runs = state.canonicalPayload.runs.map((r) => {
        if (r.runId !== action.runId) return r;
        return {
          ...r,
          segments: r.segments.filter((s) => s.segmentId !== action.segmentId),
        };
      });
      return {
        ...state,
        canonicalPayload: { ...state.canonicalPayload, runs },
      };
    }
    case "SET_V3_BOM_RESULT":
      return { ...state, v3BomResult: action.result };
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
