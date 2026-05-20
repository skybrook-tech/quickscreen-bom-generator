import type { FenceConfig } from '../schemas/fence.schema';
import type { GateConfig } from '../schemas/gate.schema';
import type { BOMResult } from './bom.types';
import type { ContactInfo } from '../schemas/contact.schema';
import type { CanonicalPayload } from './canonical.types';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'expired';

/** v3 calculator snapshot stored in quotes.fence_config at save time */
export interface V3FenceConfig {
  calculator?: 'v3';
  jobName?: string;
  payload?: CanonicalPayload;
  layoutGeometry?: unknown;
}

export type QuoteFenceConfig = FenceConfig | V3FenceConfig;

export function isV3FenceConfig(config: QuoteFenceConfig): config is V3FenceConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'calculator' in config &&
    (config as V3FenceConfig).calculator === 'v3'
  );
}

export function isLegacyFenceConfig(config: QuoteFenceConfig): config is FenceConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'systemType' in config &&
    !isV3FenceConfig(config)
  );
}

export interface SavedQuote {
  id: string;
  org_id: string;
  user_id: string;
  quote_number: number;
  customer_ref: string;
  property_anchor?: {
    lat: number;
    lng: number;
    address: string;
  } | null;
  fence_config: QuoteFenceConfig;
  gates: GateConfig[];
  bom: BOMResult;
  contact: ContactInfo;
  notes: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
}

/** Shape sent to Supabase on insert — server assigns id, quote_number, and timestamps */
export type NewQuote = Omit<SavedQuote, 'id' | 'quote_number' | 'created_at' | 'updated_at'>;

/** Enriched row for the quotes index table */
export interface QuoteListItem extends SavedQuote {
  jobName: string;
  creatorName: string | null;
  runCount: number;
  segmentCount: number;
  gateCount: number;
  systemLabel: string;
  displayTotal: number | null;
  quote_runs?: {
    id: string;
    quote_run_segments: {
      id: string;
      segment_kind: string | null;
      segment_type: string | null;
    }[];
  }[];
}

export class LegacyQuoteError extends Error {
  constructor(message = 'This quote was created in the legacy calculator and cannot be opened here.') {
    super(message);
    this.name = 'LegacyQuoteError';
  }
}
