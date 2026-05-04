import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
} from "../types/canonical.types";

/** First fence segment in sort order — holds the full fence variable set for the run. */
export function getMasterFenceSegment(
  run: CanonicalRun,
): CanonicalSegment | undefined {
  const fence = run.segments
    .filter((s) => s.kind === "fence")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return fence[0];
}

function replaceMasterSegment(
  run: CanonicalRun,
  masterId: string,
  next: CanonicalSegment,
): CanonicalRun {
  return {
    ...run,
    segments: run.segments.map((s) =>
      s.segmentId === masterId ? next : s,
    ),
  };
}

/** Keep `run.variables` aligned with the master fence segment for bom-calculator + gate context. */
export function syncRunVariablesFromMaster(run: CanonicalRun): CanonicalRun {
  const master = getMasterFenceSegment(run);
  const vars = master?.variables ? { ...master.variables } : {};
  return { ...run, variables: vars };
}

/**
 * Draft / pre-v4 payloads may store defaults only on `run.variables`. Fold those into
 * the master fence segment and rely on sync for `run.variables`.
 */
export function mergeLegacyRunVariablesIntoMaster(run: CanonicalRun): CanonicalRun {
  const master = getMasterFenceSegment(run);
  if (!master) return run;
  const rv = run.variables ?? {};
  const mv = master.variables ?? {};
  if (Object.keys(rv).length === 0) return run;

  const merged =
    Object.keys(mv).length === 0
      ? { ...rv }
      : { ...rv, ...mv };

  return syncRunVariablesFromMaster(
    replaceMasterSegment(run, master.segmentId, {
      ...master,
      variables: Object.keys(merged).length ? merged : undefined,
    }),
  );
}

export function normalizeV4PayloadRuns(payload: CanonicalPayload): CanonicalPayload {
  return {
    ...payload,
    runs: payload.runs.map((r) =>
      syncRunVariablesFromMaster(mergeLegacyRunVariablesIntoMaster(r)),
    ),
  };
}

export function createInitialMasterFenceSegment(args: {
  segmentId: string;
  productCode: string;
  jobVariables: Record<string, string | number | boolean>;
  /** Copy variables from previous run’s master (or its legacy run.variables). */
  priorRun?: CanonicalRun;
  sortOrder?: number;
}): CanonicalSegment {
  const {
    segmentId,
    productCode,
    jobVariables,
    priorRun,
    sortOrder = 0,
  } = args;

  const priorMaster = priorRun ? getMasterFenceSegment(priorRun) : undefined;
  let variables: Record<string, string | number | boolean> | undefined;
  if (priorMaster?.variables && Object.keys(priorMaster.variables).length > 0) {
    variables = { ...priorMaster.variables };
  } else if (
    priorRun?.variables &&
    Object.keys(priorRun.variables).length > 0
  ) {
    variables = { ...priorRun.variables };
  }

  const targetH = Number(jobVariables["target_height_mm"] ?? 1800);

  return {
    segmentId,
    sortOrder,
    kind: "fence",
    productCode,
    segmentWidthMm: 3000,
    targetHeightMm: Number.isFinite(targetH) ? targetH : 1800,
    leftTermination: { kind: "system" },
    rightTermination: { kind: "system" },
    variables,
    confirmed: false,
  };
}
