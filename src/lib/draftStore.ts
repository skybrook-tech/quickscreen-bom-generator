import type { ExtraItem } from "../types/bom.types";
import type { CanonicalPayload } from "../types/canonical.types";

const DRAFT_KEY = "quickscreen-calculator-draft-v1";

export interface CalculatorDraft {
  jobName: string;
  payload: CanonicalPayload | null;
  bomResult: Record<string, unknown> | null;
  extraItems: ExtraItem[];
  savedAt: string;
}

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function readDraft(): CalculatorDraft | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as CalculatorDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: CalculatorDraft) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(DRAFT_KEY);
}

export function formatDraftAge(savedAt: string) {
  const ageMs = Date.now() - new Date(savedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return "just now";
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}
