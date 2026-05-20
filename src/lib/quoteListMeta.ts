import type { CanonicalPayload } from '../types/canonical.types';
import type { GateConfig } from '../schemas/gate.schema';
import type {
  QuoteFenceConfig,
  SavedQuote,
} from '../types/quote.types';
import { isLegacyFenceConfig, isV3FenceConfig } from '../types/quote.types';

export interface QuoteDbRun {
  id: string;
  quote_run_segments: {
    id: string;
    segment_kind: string | null;
    segment_type: string | null;
  }[];
}

export interface ParsedQuoteNotes {
  v4_payload?: CanonicalPayload;
  bomResult?: Record<string, unknown>;
  quoteDetails?: { customer?: string; jobName?: string };
}

export interface LayoutCounts {
  runs: number;
  segments: number;
  gates: number;
}

export function parseQuoteNotes(notes: string): ParsedQuoteNotes | null {
  if (!notes?.trim()) return null;
  try {
    const parsed = JSON.parse(notes) as ParsedQuoteNotes;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export function getCanonicalPayload(
  quote: Pick<SavedQuote, 'notes' | 'fence_config'>,
): CanonicalPayload | null {
  const parsed = parseQuoteNotes(quote.notes);
  if (parsed?.v4_payload) return parsed.v4_payload;
  if (isV3FenceConfig(quote.fence_config) && quote.fence_config.payload) {
    return quote.fence_config.payload;
  }
  return null;
}

function countGatesFromPayload(payload: CanonicalPayload): number {
  let gates = 0;
  for (const run of payload.runs ?? []) {
    for (const seg of run.segments ?? []) {
      if (seg.kind === 'gate' || seg.segmentKind === 'gate_opening') {
        gates += 1;
      }
    }
  }
  gates += payload.job?.pendingGates?.length ?? 0;
  return gates;
}

function countGatesFromDbRuns(dbRuns: QuoteDbRun[]): number {
  return dbRuns.reduce((sum, run) => {
    const gateSegments = run.quote_run_segments.filter(
      (seg) =>
        seg.segment_kind === 'gate_opening' ||
        seg.segment_type === 'gate_opening',
    );
    return sum + gateSegments.length;
  }, 0);
}

function countLegacyGates(gates: GateConfig[]): number {
  return gates.reduce((sum, gate) => sum + (gate.qty ?? 1), 0);
}

function countLayoutFromDb(dbRuns: QuoteDbRun[]): LayoutCounts {
  const segments = dbRuns.reduce(
    (sum, run) => sum + run.quote_run_segments.length,
    0,
  );
  return {
    runs: dbRuns.length,
    segments,
    gates: countGatesFromDbRuns(dbRuns),
  };
}

export function getLayoutCounts(
  quote: Pick<SavedQuote, 'notes' | 'fence_config' | 'gates'>,
  dbRuns?: QuoteDbRun[],
): LayoutCounts {
  const payload = getCanonicalPayload(quote);
  if (payload) {
    const runs = payload.runs?.length ?? 0;
    const segments =
      payload.runs?.reduce((sum, run) => sum + (run.segments?.length ?? 0), 0) ??
      0;
    return {
      runs,
      segments,
      gates: countGatesFromPayload(payload),
    };
  }

  if (dbRuns && dbRuns.length > 0) {
    return countLayoutFromDb(dbRuns);
  }

  return {
    runs: 0,
    segments: 0,
    gates: countLegacyGates(quote.gates ?? []),
  };
}

export function formatLayoutLabel(counts: LayoutCounts): string {
  const { runs, segments, gates } = counts;
  if (runs === 0 && segments === 0 && gates === 0) return '—';

  const parts: string[] = [];
  if (runs > 0) parts.push(`${runs} run${runs !== 1 ? 's' : ''}`);
  if (segments > 0) parts.push(`${segments} segment${segments !== 1 ? 's' : ''}`);
  if (gates > 0) parts.push(`${gates} gate${gates !== 1 ? 's' : ''}`);
  return parts.join(' · ');
}

export function getQuoteSystemLabel(
  quote: Pick<SavedQuote, 'fence_config' | 'notes'>,
): string {
  const payload = getCanonicalPayload(quote);
  if (payload) {
    const codes = [
      ...new Set(
        (payload.runs ?? [])
          .map((run) => run.productCode)
          .filter((code): code is string => Boolean(code)),
      ),
    ];
    if (codes.length === 1) return codes[0]!;
    if (codes.length > 1) return codes.join(', ');
    if (payload.productCode) return payload.productCode;
  }

  const fenceConfig = quote.fence_config as QuoteFenceConfig;
  if (isLegacyFenceConfig(fenceConfig)) return fenceConfig.systemType;
  return '—';
}

export function getQuoteGrandTotal(
  quote: Pick<SavedQuote, 'bom' | 'notes'>,
): number | null {
  const bomTotal = quote.bom?.grandTotal;
  if (typeof bomTotal === 'number' && !Number.isNaN(bomTotal)) {
    return bomTotal;
  }

  const parsed = parseQuoteNotes(quote.notes);
  const bomResult = parsed?.bomResult;
  if (!bomResult) return null;

  const totals = bomResult.totals as { grandTotal?: number } | undefined;
  if (typeof totals?.grandTotal === 'number') return totals.grandTotal;

  if (typeof bomResult.grandTotal === 'number') return bomResult.grandTotal;

  return null;
}

export function getJobName(
  quote: Pick<SavedQuote, 'customer_ref' | 'fence_config' | 'notes' | 'quote_number'>,
): string {
  const ref = quote.customer_ref?.trim();
  if (ref) return ref;

  if (isV3FenceConfig(quote.fence_config)) {
    const jobName = quote.fence_config.jobName?.trim();
    if (jobName) return jobName;
  }

  const parsed = parseQuoteNotes(quote.notes);
  const customer = parsed?.quoteDetails?.customer?.trim();
  if (customer) return customer;
  const jobName = parsed?.quoteDetails?.jobName?.trim();
  if (jobName) return jobName;

  return `Quote #${quote.quote_number}`;
}

export function isJobNameFallback(jobName: string, quoteNumber: number): boolean {
  return jobName === `Quote #${quoteNumber}`;
}

/** Creator column: full name when set, otherwise email from profiles. */
export function formatCreatorLabel(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const name = fullName?.trim();
  if (name) return name;
  const mail = email?.trim();
  if (mail) return mail;
  return null;
}
