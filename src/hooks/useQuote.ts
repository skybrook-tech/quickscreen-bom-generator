import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { resolveCanonicalPayload } from '../lib/quotePayload';
import type { QuoteRunRow, QuoteRunSegmentRow } from '../lib/quotePayload';
import type { CanonicalPayload } from '../types/canonical.types';
import { LegacyQuoteError, type SavedQuote } from '../types/quote.types';

export type LoadedQuote = {
  quote: SavedQuote;
  payload: CanonicalPayload | null;
};

export function useQuote(quoteId: string | undefined) {
  return useQuery({
    queryKey: ['quote', quoteId],
    enabled: !!quoteId,
    queryFn: async (): Promise<LoadedQuote> => {
      if (!quoteId) throw new Error('Missing quote id');

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;
      if (!quote) throw new Error('Quote not found');

      const { data: runs, error: runsError } = await supabase
        .from('quote_runs')
        .select('id, sort_order, variables_json, products(system_type)')
        .eq('quote_id', quoteId)
        .order('sort_order', { ascending: true });

      if (runsError) throw runsError;

      const runRows = (runs ?? []).map((row) => {
        const products = row.products as { system_type: string } | { system_type: string }[] | null;
        const product =
          products && !Array.isArray(products)
            ? products
            : Array.isArray(products)
              ? products[0]
              : null;
        return {
          id: row.id as string,
          sort_order: row.sort_order as number,
          variables_json: (row.variables_json ?? {}) as Record<string, unknown>,
          products: product ?? null,
        } satisfies QuoteRunRow;
      });
      const runIds = runRows.map((r) => r.id);

      let segmentRows: QuoteRunSegmentRow[] = [];
      if (runIds.length > 0) {
        const { data: segments, error: segmentsError } = await supabase
          .from('quote_run_segments')
          .select(
            'quote_run_id, sort_order, segment_type, segment_kind, length_mm, panel_width_mm, target_height_mm, bay_count, variables_json',
          )
          .in('quote_run_id', runIds)
          .order('sort_order', { ascending: true });

        if (segmentsError) throw segmentsError;
        segmentRows = (segments ?? []) as QuoteRunSegmentRow[];
      }

      const payload = resolveCanonicalPayload(
        quote.fence_config,
        runRows,
        segmentRows,
      );

      return { quote: quote as SavedQuote, payload };
    },
    retry: (failureCount, error) => {
      if (error instanceof LegacyQuoteError) return false;
      return failureCount < 2;
    },
  });
}
