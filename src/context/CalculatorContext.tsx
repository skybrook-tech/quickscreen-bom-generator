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
  | { type: "SET_BOM_RESULT"; result: Record<string, unknown> | null }
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
      const vars = state.payload.variables;

      // Auto-fill top-level geometry fields from job-level variables so
      // canvas-drawn and form-created segments produce identical BOM inputs.
      // The spread puts the default first; action.segment wins if it has an
      // explicit value, preserving per-segment overrides set in SegmentRow.
      const segment: CanonicalSegment = {
        targetHeightMm:
          vars.target_height_mm != null
            ? Number(vars.target_height_mm)
            : 1800,
        ...action.segment,
      };

      const runs = state.payload.runs.map((r) => {
        if (r.runId !== action.runId) return r;
        const segs = r.segments;
        const idx = segs.findIndex(
          (s) => s.segmentId === segment.segmentId,
        );

        let newSegs =
          idx >= 0
            ? segs.map((s, i) => (i === idx ? segment : s))
            : [...segs, segment];

        // Mirror termination changes to adjacent segments so shared
        // boundaries stay consistent. Only mirrors non-segment_join
        // terminations (canvas-drawn joins are owned by the canvas adapter).
        if (idx >= 0) {
          const prev = segs[idx];
          const sorted = [...newSegs].sort((a, b) => a.sortOrder - b.sortOrder);
          const sortedIdx = sorted.findIndex(
            (s) => s.segmentId === segment.segmentId,
          );

          const rightChanged =
            JSON.stringify(segment.rightTermination) !==
            JSON.stringify(prev.rightTermination);
          const leftChanged =
            JSON.stringify(segment.leftTermination) !==
            JSON.stringify(prev.leftTermination);

          if (
            rightChanged &&
            segment.rightTermination.kind !== "segment_join" &&
            sortedIdx < sorted.length - 1
          ) {
            const nextSeg = sorted[sortedIdx + 1];
            const mirroredNext = {
              ...nextSeg,
              leftTermination: segment.rightTermination,
            };
            newSegs = newSegs.map((s) =>
              s.segmentId === nextSeg.segmentId ? mirroredNext : s,
            );
          }

          if (
            leftChanged &&
            segment.leftTermination.kind !== "segment_join" &&
            sortedIdx > 0
          ) {
            const prevSeg = sorted[sortedIdx - 1];
            const mirroredPrev = {
              ...prevSeg,
              rightTermination: segment.leftTermination,
            };
            newSegs = newSegs.map((s) =>
              s.segmentId === prevSeg.segmentId ? mirroredPrev : s,
            );
          }
        }

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
