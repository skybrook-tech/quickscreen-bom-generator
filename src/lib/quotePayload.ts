import { canonicalPayloadSchema } from '../schemas/canonical.schema';
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
} from '../types/canonical.types';
import {
  isLegacyFenceConfig,
  isV3FenceConfig,
  LegacyQuoteError,
  type QuoteFenceConfig,
  type V3FenceConfig,
} from '../types/quote.types';

export type QuoteRunRow = {
  id: string;
  sort_order: number;
  variables_json: Record<string, unknown>;
  products?: { system_type: string } | null;
};

export type QuoteRunSegmentRow = {
  quote_run_id: string;
  sort_order: number;
  segment_type: string;
  segment_kind: string | null;
  length_mm: number | null;
  panel_width_mm: number | null;
  target_height_mm: number | null;
  bay_count: number | null;
  variables_json: Record<string, unknown>;
};

function segmentFromRow(row: QuoteRunSegmentRow): CanonicalSegment {
  const varsJson = row.variables_json ?? {};
  const segmentId = String(varsJson.segmentId ?? '');
  return {
    segmentId,
    sortOrder: row.sort_order,
    segmentKind: (row.segment_kind ?? row.segment_type) as CanonicalSegment['segmentKind'],
    segmentWidthMm: row.length_mm != null ? Number(row.length_mm) : undefined,
    targetHeightMm: row.target_height_mm != null ? Number(row.target_height_mm) : undefined,
    bayCount: row.bay_count != null ? Number(row.bay_count) : undefined,
    gateProductCode:
      varsJson.gateProductCode != null ? String(varsJson.gateProductCode) : undefined,
    variables:
      varsJson.variables && typeof varsJson.variables === 'object'
        ? (varsJson.variables as CanonicalSegment['variables'])
        : undefined,
  };
}

function runFromRow(
  row: QuoteRunRow,
  segments: CanonicalSegment[],
): CanonicalRun {
  const vars = row.variables_json ?? {};
  const productCode =
    (vars.productCode as string | undefined) ??
    row.products?.system_type ??
    'QSHS';
  return {
    runId: String(vars.runId ?? ''),
    productCode,
    variables:
      vars.variables && typeof vars.variables === 'object'
        ? (vars.variables as CanonicalRun['variables'])
        : undefined,
    leftBoundary: vars.leftBoundary as CanonicalRun['leftBoundary'],
    rightBoundary: vars.rightBoundary as CanonicalRun['rightBoundary'],
    corners: Array.isArray(vars.corners) ? (vars.corners as CanonicalRun['corners']) : [],
    geometry: vars.geometry as CanonicalRun['geometry'],
    segments,
  };
}

export function canonicalPayloadFromQuoteRuns(
  runs: QuoteRunRow[],
  segments: QuoteRunSegmentRow[],
): CanonicalPayload | null {
  if (runs.length === 0) return null;

  const segmentsByRunId = new Map<string, CanonicalSegment[]>();
  for (const seg of segments) {
    const list = segmentsByRunId.get(seg.quote_run_id) ?? [];
    list.push(segmentFromRow(seg));
    segmentsByRunId.set(seg.quote_run_id, list);
  }

  const canonicalRuns = runs.map((run) => {
    const segs = (segmentsByRunId.get(run.id) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    return runFromRow(run, segs);
  });

  const first = canonicalRuns[0];
  return {
    productCode: first.productCode,
    schemaVersion: 'v1',
    variables: first.variables ?? {},
    runs: canonicalRuns,
  };
}

export function payloadFromV3FenceConfig(config: V3FenceConfig): CanonicalPayload | null {
  if (!config.payload) return null;
  const parsed = canonicalPayloadSchema.safeParse(config.payload);
  if (!parsed.success) {
    console.warn('[quotePayload] canonical payload validation failed', parsed.error.flatten());
    return config.payload;
  }
  return parsed.data as CanonicalPayload;
}

export function resolveCanonicalPayload(
  fenceConfig: QuoteFenceConfig,
  runs: QuoteRunRow[],
  segments: QuoteRunSegmentRow[],
): CanonicalPayload {
  if (isLegacyFenceConfig(fenceConfig)) {
    throw new LegacyQuoteError();
  }

  if (isV3FenceConfig(fenceConfig)) {
    const fromConfig = payloadFromV3FenceConfig(fenceConfig);
    if (fromConfig) return fromConfig;
  }

  const fromRuns = canonicalPayloadFromQuoteRuns(runs, segments);
  if (fromRuns) return fromRuns;

  throw new Error('Quote has no v3 payload or run data to load.');
}

export function jobNameFromQuote(
  fenceConfig: QuoteFenceConfig,
  customerRef: string,
): string {
  if (isV3FenceConfig(fenceConfig) && fenceConfig.jobName?.trim()) {
    return fenceConfig.jobName.trim();
  }
  return customerRef?.trim() ?? '';
}
