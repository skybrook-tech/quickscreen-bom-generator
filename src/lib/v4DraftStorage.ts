import type { CanonicalPayload } from "../types/canonical.types";

/** Mirrors context shapes — avoid importing context into this module (cycles). */
interface ExtraItem {
  id: string;
  sku: string;
  description: string;
  qty: number;
  unitPrice: number;
}

interface AddedSuggestion {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export type V4DraftSnapshot = {
  jobName: string;
  payload: CanonicalPayload | null;
  bomResult: Record<string, unknown> | null;
  addedSuggestions: AddedSuggestion[];
  dismissedSuggestionSkus: Set<string>;
  removedSkus: Set<string>;
  extraItems: ExtraItem[];
  qtyOverrides: Record<string, number>;
};

export const V4_DRAFT_STORAGE_KEY = "glass-outlet-v4-calculator-draft";
export const V4_DRAFT_SCHEMA_VERSION = 1;

export interface PersistedV4DraftV1 {
  schemaVersion: typeof V4_DRAFT_SCHEMA_VERSION;
  savedAt: string;
  jobName: string;
  payload: CanonicalPayload | null;
  bomResult: Record<string, unknown> | null;
  addedSuggestions: AddedSuggestion[];
  dismissedSuggestionSkus: string[];
  removedSkus: string[];
  extraItems: ExtraItem[];
  qtyOverrides: Record<string, number>;
}

export function draftFromPersisted(d: PersistedV4DraftV1): V4DraftSnapshot {
  return {
    jobName: d.jobName,
    payload: d.payload,
    bomResult: d.bomResult,
    addedSuggestions: d.addedSuggestions,
    dismissedSuggestionSkus: new Set(d.dismissedSuggestionSkus),
    removedSkus: new Set(d.removedSkus),
    extraItems: d.extraItems,
    qtyOverrides: d.qtyOverrides ?? {},
  };
}

export function parseV4Draft(raw: string): PersistedV4DraftV1 | null {
  try {
    const data = JSON.parse(raw) as PersistedV4DraftV1;
    if (data.schemaVersion !== V4_DRAFT_SCHEMA_VERSION) return null;
    if (!data.payload || typeof data.jobName !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

export function loadV4Draft(): PersistedV4DraftV1 | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(V4_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return parseV4Draft(raw);
  } catch {
    return null;
  }
}

export function persistV4Draft(state: V4DraftSnapshot): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (!state.payload) {
    clearV4Draft();
    return;
  }
  const draft: PersistedV4DraftV1 = {
    schemaVersion: V4_DRAFT_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    jobName: state.jobName,
    payload: state.payload,
    bomResult: state.bomResult,
    addedSuggestions: state.addedSuggestions,
    dismissedSuggestionSkus: [...state.dismissedSuggestionSkus],
    removedSkus: [...state.removedSkus],
    extraItems: state.extraItems,
    qtyOverrides: state.qtyOverrides,
  };
  try {
    window.localStorage.setItem(V4_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // quota / private mode
  }
}

export function clearV4Draft(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(V4_DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
