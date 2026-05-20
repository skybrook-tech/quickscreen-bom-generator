import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import type { SavedQuote, NewQuote, QuoteListItem } from '../types/quote.types';
import {
  formatCreatorLabel,
  getJobName,
  getLayoutCounts,
  getQuoteGrandTotal,
  getQuoteSystemLabel,
  type QuoteDbRun,
} from '../lib/quoteListMeta';

function toQuoteListItem(
  quote: SavedQuote & { quote_runs?: QuoteDbRun[] },
  profileMap: Map<string, string | null>,
): QuoteListItem {
  const dbRuns = quote.quote_runs;
  const layout = getLayoutCounts(quote, dbRuns);

  return {
    ...quote,
    jobName: getJobName(quote),
    creatorName: profileMap.get(quote.user_id) ?? null,
    runCount: layout.runs,
    segmentCount: layout.segments,
    gateCount: layout.gates,
    systemLabel: getQuoteSystemLabel(quote),
    displayTotal: getQuoteGrandTotal(quote),
    quote_runs: dbRuns,
  };
}

export function useQuotes() {
  const quotesQuery = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_runs (
            id,
            quote_run_segments ( id, segment_kind, segment_type )
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as (SavedQuote & { quote_runs?: QuoteDbRun[] })[];
      const userIds = [...new Set(rows.map((q) => q.user_id))];

      const profileMap = new Map<string, string | null>();
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        if (profileError) throw profileError;
        for (const profile of profiles ?? []) {
          profileMap.set(
            profile.id,
            formatCreatorLabel(profile.full_name, profile.email),
          );
        }
      }

      return rows.map((quote) => toQuoteListItem(quote, profileMap));
    },
  });

  const saveQuote = useMutation({
    mutationFn: async (quote: NewQuote) => {
      const { data, error } = await supabase
        .from('quotes')
        .insert(quote)
        .select()
        .single();
      if (error) throw error;
      return data as SavedQuote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const updateQuote = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SavedQuote> }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SavedQuote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const deleteQuote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  return { quotesQuery, saveQuote, updateQuote, deleteQuote };
}
