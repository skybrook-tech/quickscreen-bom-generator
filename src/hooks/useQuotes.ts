import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import type { SavedQuote, NewQuote } from '../types/quote.types';

export function useQuotes() {
  const quotesQuery = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SavedQuote[];
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
