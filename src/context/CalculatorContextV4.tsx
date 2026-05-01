import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import {
  draftFromPersisted,
  loadV4Draft,
  persistV4Draft,
} from "../lib/v4DraftStorage";
import { normaliseVariablesForSystem } from "../lib/productOptionRules";
import { computeNewRunAnchor } from "../lib/canvasBbox";
import { removeSegmentFromRun } from "../lib/runSegmentRemove";
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
} from "../types/canonical.types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtraItem {
  id: string;
  sku: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export interface AddedSuggestion {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface CalculatorV4State {
  jobName: string;
  payload: CanonicalPayload | null;
  /** After ADD_RUN or initial job create, that run's card should open config; cleared once applied. */
  openRunConfigRunId: string | null;
  bomResult: Record<string, unknown> | null;
  /** Suggestions the user has accepted into the BOM (client-side only in v4 v1). */
  addedSuggestions: AddedSuggestion[];
  /** Suggestion SKUs the user has dismissed (added or otherwise hidden). */
  dismissedSuggestionSkus: Set<string>;
  /** SKUs from the engine BOM the user has manually removed. */
  removedSkus: Set<string>;
  /** Manual extra line items added by the user (post-BOM). */
  extraItems: ExtraItem[];
  /** Per-line qty edits (SKU for engine lines; `extra:${id}` for manual extras). */
  qtyOverrides: Record<string, number>;
}

const initialState: CalculatorV4State = {
  jobName: "",
  payload: null,
  openRunConfigRunId: null,
  bomResult: null,
  addedSuggestions: [],
  dismissedSuggestionSkus: new Set(),
  removedSkus: new Set(),
  extraItems: [],
  qtyOverrides: {},
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type CalculatorV4Action =
  | { type: "SET_JOB_NAME"; name: string }
  | { type: "INIT_PAYLOAD"; payload: CanonicalPayload }
  | {
      type: "SET_PAYLOAD";
      payload: CanonicalPayload;
      /** When set, RunCard opens config for this run (then cleared). Omitted → null. */
      openRunConfigRunId?: string | null;
    }
  | { type: "RESET_JOB" }
  | {
      type: "UPSERT_RUN_VARIABLES";
      runId: string;
      variables: Record<string, string | number | boolean>;
    }
  | { type: "SET_RUN_PRODUCT"; runId: string; productCode: string }
  | { type: "ADD_RUN" }
  | { type: "CLEAR_OPEN_RUN_CONFIG" }
  | { type: "REMOVE_RUN"; runId: string }
  | { type: "UPSERT_SEGMENT"; runId: string; segment: CanonicalSegment }
  | { type: "REMOVE_SEGMENT"; runId: string; segmentId: string }
  | { type: "DUPLICATE_SEGMENT"; runId: string; segmentId: string }
  | { type: "SET_BOM_RESULT"; result: Record<string, unknown> }
  | { type: "ADD_SUGGESTION"; suggestion: AddedSuggestion }
  | { type: "DISMISS_SUGGESTION"; sku: string }
  | { type: "REMOVE_ADDED_SUGGESTION"; sku: string }
  | { type: "REMOVE_BOM_LINE"; sku: string }
  | { type: "RESTORE_BOM_LINE"; sku: string }
  | { type: "RESTORE_ALL_BOM_LINES" }
  | { type: "ADD_EXTRA"; item: ExtraItem }
  | { type: "REMOVE_EXTRA"; id: string }
  | { type: "SET_QTY_OVERRIDE"; lineKey: string; qty: number }
  | {
      type: "HYDRATE_V4_DRAFT";
      snapshot: {
        jobName: string;
        payload: CanonicalPayload | null;
        bomResult: Record<string, unknown> | null;
        addedSuggestions: AddedSuggestion[];
        dismissedSuggestionSkus: Set<string>;
        removedSkus: Set<string>;
        extraItems: ExtraItem[];
        qtyOverrides: Record<string, number>;
      };
    };

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(
  state: CalculatorV4State,
  action: CalculatorV4Action,
): CalculatorV4State {
  switch (action.type) {
    case "SET_JOB_NAME":
      return { ...state, jobName: action.name };
    case "INIT_PAYLOAD":
      return {
        ...initialState,
        jobName: state.jobName,
        payload: action.payload,
        openRunConfigRunId: null,
        dismissedSuggestionSkus: new Set(),
        removedSkus: new Set(),
        qtyOverrides: {},
      };
    case "SET_PAYLOAD":
      return {
        ...state,
        payload: action.payload,
        openRunConfigRunId: action.openRunConfigRunId ?? null,
      };
    case "RESET_JOB":
      return initialState;
    case "CLEAR_OPEN_RUN_CONFIG":
      return { ...state, openRunConfigRunId: null };
    case "UPSERT_RUN_VARIABLES": {
      if (!state.payload) return state;
      const runs = state.payload.runs.map((r) =>
        r.runId === action.runId
          ? { ...r, variables: { ...(r.variables ?? {}), ...action.variables } }
          : r,
      );
      return { ...state, payload: { ...state.payload, runs } };
    }
    case "ADD_RUN": {
      if (!state.payload) return state;
      const prevRuns = state.payload.runs;
      const lastRun =
        prevRuns.length > 0 ? prevRuns[prevRuns.length - 1] : undefined;
      const [p0, p1] = computeNewRunAnchor(state.payload, prevRuns.length);
      const newRun: CanonicalRun = {
        runId: crypto.randomUUID(),
        productCode: lastRun?.productCode ?? state.payload.productCode,
        variables: lastRun?.variables ? { ...lastRun.variables } : {},
        segments: [],
        geometry: { points: [p0, p1] },
      };
      return {
        ...state,
        openRunConfigRunId: newRun.runId,
        payload: {
          ...state.payload,
          runs: [...state.payload.runs, newRun],
        },
      };
    }
    case "SET_RUN_PRODUCT": {
      const payload = state.payload;
      if (!payload) return state;
      const runs = payload.runs.map((r) =>
        r.runId === action.runId
          ? {
              ...r,
              productCode: action.productCode,
              variables: normaliseVariablesForSystem(action.productCode, {
                ...payload.variables,
                ...(r.variables ?? {}),
              }),
            }
          : r,
      );
      return { ...state, payload: { ...payload, runs } };
    }
    case "REMOVE_RUN": {
      if (!state.payload) return state;
      // Don't allow removing the last run
      if (state.payload.runs.length <= 1) return state;
      return {
        ...state,
        openRunConfigRunId:
          state.openRunConfigRunId === action.runId
            ? null
            : state.openRunConfigRunId,
        payload: {
          ...state.payload,
          runs: state.payload.runs.filter((r) => r.runId !== action.runId),
        },
      };
    }
    case "UPSERT_SEGMENT": {
      if (!state.payload) return state;
      const segment = action.segment;
      const runs = state.payload.runs.map((r) => {
        if (r.runId !== action.runId) return r;
        const segs = r.segments;
        const idx = segs.findIndex((s) => s.segmentId === segment.segmentId);

        let newSegs =
          idx >= 0
            ? segs.map((s, i) => (i === idx ? segment : s))
            : [...segs, segment];

        // Mirror termination changes to adjacent segments so shared boundaries
        // stay consistent. Only mirrors non-segment_join terminations (canvas-
        // drawn joins are owned by the canvas adapter).
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
      return { ...state, payload: { ...state.payload, runs } };
    }
    case "REMOVE_SEGMENT": {
      if (!state.payload) return state;
      const runs = state.payload.runs.map((r) => {
        if (r.runId !== action.runId) return r;
        return removeSegmentFromRun(r, action.segmentId);
      });
      return { ...state, payload: { ...state.payload, runs } };
    }
    case "DUPLICATE_SEGMENT": {
      if (!state.payload) return state;
      const runs = state.payload.runs.map((r) => {
        if (r.runId !== action.runId) return r;
        const idx = r.segments.findIndex(
          (s) => s.segmentId === action.segmentId,
        );
        if (idx === -1) return r;
        const original = r.segments[idx];
        const copy: CanonicalSegment = {
          ...original,
          segmentId: crypto.randomUUID(),
          sortOrder: original.sortOrder + 1,
          confirmed: false,
        };
        const before = r.segments.slice(0, idx + 1);
        const after = r.segments
          .slice(idx + 1)
          .map((s) => ({ ...s, sortOrder: s.sortOrder + 1 }));
        return { ...r, segments: [...before, copy, ...after] };
      });
      return { ...state, payload: { ...state.payload, runs } };
    }
    case "SET_BOM_RESULT":
      return {
        ...state,
        bomResult: action.result,
        // When a fresh BOM comes in, reset suggestion/removal state
        addedSuggestions: [],
        dismissedSuggestionSkus: new Set(),
        removedSkus: new Set(),
        extraItems: [],
        qtyOverrides: {},
      };
    case "ADD_SUGGESTION": {
      const exists = state.addedSuggestions.find(
        (s) => s.sku === action.suggestion.sku,
      );
      const next = exists
        ? state.addedSuggestions.map((s) =>
            s.sku === action.suggestion.sku
              ? { ...s, qty: s.qty + action.suggestion.qty }
              : s,
          )
        : [...state.addedSuggestions, action.suggestion];
      return {
        ...state,
        addedSuggestions: next,
        dismissedSuggestionSkus: new Set([
          ...state.dismissedSuggestionSkus,
          action.suggestion.sku,
        ]),
      };
    }
    case "DISMISS_SUGGESTION":
      return {
        ...state,
        dismissedSuggestionSkus: new Set([
          ...state.dismissedSuggestionSkus,
          action.sku,
        ]),
      };
    case "REMOVE_ADDED_SUGGESTION": {
      const nextDismissed = new Set(state.dismissedSuggestionSkus);
      nextDismissed.delete(action.sku);
      return {
        ...state,
        addedSuggestions: state.addedSuggestions.filter(
          (s) => s.sku !== action.sku,
        ),
        dismissedSuggestionSkus: nextDismissed,
      };
    }
    case "REMOVE_BOM_LINE":
      return {
        ...state,
        removedSkus: new Set([...state.removedSkus, action.sku]),
      };
    case "RESTORE_BOM_LINE": {
      const next = new Set(state.removedSkus);
      next.delete(action.sku);
      return { ...state, removedSkus: next };
    }
    case "RESTORE_ALL_BOM_LINES":
      return { ...state, removedSkus: new Set() };
    case "ADD_EXTRA":
      return { ...state, extraItems: [...state.extraItems, action.item] };
    case "REMOVE_EXTRA":
      return {
        ...state,
        extraItems: state.extraItems.filter((i) => i.id !== action.id),
      };
    case "SET_QTY_OVERRIDE": {
      const q = Math.max(0, action.qty);
      const next = { ...state.qtyOverrides };
      if (q === 0) delete next[action.lineKey];
      else next[action.lineKey] = q;
      return { ...state, qtyOverrides: next };
    }
    case "HYDRATE_V4_DRAFT": {
      const s = action.snapshot;
      return {
        jobName: s.jobName,
        payload: s.payload,
        openRunConfigRunId: null,
        bomResult: s.bomResult,
        addedSuggestions: s.addedSuggestions,
        dismissedSuggestionSkus: new Set(s.dismissedSuggestionSkus),
        removedSkus: new Set(s.removedSkus),
        extraItems: s.extraItems,
        qtyOverrides: { ...s.qtyOverrides },
      };
    }
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface CalculatorV4ContextValue {
  state: CalculatorV4State;
  dispatch: React.Dispatch<CalculatorV4Action>;
}

const Ctx = createContext<CalculatorV4ContextValue | null>(null);

export function CalculatorV4Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const d = loadV4Draft();
    if (d) {
      dispatch({
        type: "HYDRATE_V4_DRAFT",
        snapshot: draftFromPersisted(d),
      });
    }
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (!bootstrapped || typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      persistV4Draft({
        jobName: state.jobName,
        payload: state.payload,
        bomResult: state.bomResult,
        addedSuggestions: state.addedSuggestions,
        dismissedSuggestionSkus: state.dismissedSuggestionSkus,
        removedSkus: state.removedSkus,
        extraItems: state.extraItems,
        qtyOverrides: state.qtyOverrides,
      });
    }, 300);
    return () => window.clearTimeout(id);
  }, [state, bootstrapped]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useCalculatorV4() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useCalculatorV4 must be used inside CalculatorV4Provider");
  return ctx;
}
