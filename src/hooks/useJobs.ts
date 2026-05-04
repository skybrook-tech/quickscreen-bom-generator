import { useCallback, useEffect, useState } from "react";
import type { ExtraItem } from "../types/bom.types";
import type { CanonicalPayload } from "../types/canonical.types";

const JOBS_KEY = "quickscreen-saved-jobs-v1";

export interface SavedJob {
  id: string;
  name: string;
  updatedAt: string;
  runCount: number;
  totalCost: number;
  payload: CanonicalPayload;
  bomResult: Record<string, unknown> | null;
  extraItems: ExtraItem[];
}

export interface SaveJobInput {
  id?: string;
  name: string;
  totalCost: number;
  payload: CanonicalPayload;
  bomResult: Record<string, unknown> | null;
  extraItems: ExtraItem[];
}

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readJobs(): SavedJob[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(JOBS_KEY);
    return raw ? (JSON.parse(raw) as SavedJob[]) : [];
  } catch {
    return [];
  }
}

function writeJobs(jobs: SavedJob[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

export function useJobs() {
  const [jobs, setJobs] = useState<SavedJob[]>([]);

  const refreshJobs = useCallback(() => {
    setJobs(readJobs());
  }, []);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  const saveJob = useCallback((input: SaveJobInput) => {
    const now = new Date().toISOString();
    const nextJob: SavedJob = {
      id: input.id ?? crypto.randomUUID(),
      name: input.name,
      updatedAt: now,
      runCount: input.payload.runs.length,
      totalCost: input.totalCost,
      payload: input.payload,
      bomResult: input.bomResult,
      extraItems: input.extraItems,
    };

    const nextJobs = [
      nextJob,
      ...readJobs().filter((job) => job.id !== nextJob.id),
    ].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    writeJobs(nextJobs);
    setJobs(nextJobs);
    return nextJob;
  }, []);

  const deleteJob = useCallback((id: string) => {
    const nextJobs = readJobs().filter((job) => job.id !== id);
    writeJobs(nextJobs);
    setJobs(nextJobs);
  }, []);

  return {
    jobs,
    saveJob,
    deleteJob,
    refreshJobs,
  };
}
