import { z } from 'zod';

export const QuoteStatus = z.enum(['draft', 'sent', 'accepted', 'expired']);

// Minimal Zod schema used for validation when saving/loading quotes.
// The full SavedQuote interface (with nested types) lives in quote.types.ts.
export const QuoteSchema = z.object({
  customerRef: z.string().optional(),
  notes:       z.string().optional(),
  status:      QuoteStatus.default('draft'),
});

export type QuoteStatus = z.infer<typeof QuoteStatus>;
