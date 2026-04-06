import type { FenceConfig } from '../schemas/fence.schema';
import type { GateConfig } from '../schemas/gate.schema';
import type { BOMResult } from './bom.types';
import type { ContactInfo } from '../schemas/contact.schema';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'expired';

export interface SavedQuote {
  id: string;
  org_id: string;
  user_id: string;
  quote_number: number;
  customer_ref: string;
  fence_config: FenceConfig;
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
