import { createContext, useContext, useReducer } from "react";
import { defaultRunConfig } from "../schemas/calculator.schema";
import type { RunConfig } from "../schemas/calculator.schema";
import type { ProductOptions, CalculatorDefaults } from "../schemas/calculator.schema";
import type { CalculatorBOMResult } from "../types/bom.types";

// ─── State ───────────────────────────────────────────────────────────────────

export interface CalculatorState {
  productId: string | null;
  systemType: string | null;
  productOptions: ProductOptions | null;
  defaults: CalculatorDefaults;
  runs: RunConfig[];
  bomResult: CalculatorBOMResult | null;
}

const initialState: CalculatorState = {
  productId: null,
  systemType: null,
  productOptions: null,
  defaults: { slatSize: "65", slatGap: "9", colour: "surfmist-matt" },
  runs: [{ ...defaultRunConfig, id: crypto.randomUUID() }],
  bomResult: null,
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
  | { type: "RESET" };

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
      return {
        ...state,
        runs: state.runs.filter((r) => r.id !== action.id),
        bomResult: null,
      };
    case "SET_BOM_RESULT":
      return { ...state, bomResult: action.result };
    case "RESET":
      return initialState;
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
