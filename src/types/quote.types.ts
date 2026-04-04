import type { FenceConfig } from '../schemas/fence.schema';
import type { GateConfig } from '../schemas/gate.schema';
import type { BOMResult } from './bom.types';
import type { ContactInfo } from '../schemas/contact.schema';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'expired';

export interface SavedQuote {
  id: string;
  org_id: string;
  user_id: string;
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

/** Shape sent to Supabase on insert — server assigns id, org_id, user_id, timestamps */
export type NewQuote = Omit<SavedQuote, 'id' | 'org_id' | 'user_id' | 'created_at' | 'updated_at'> & {
  org_id: string;   // client must provide; RLS validates it matches profile
};
