import { QueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from './supabase';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Multi-tenant cache hygiene: org-scoped queries (products, quotes, calculator
// configs, product search, …) are cached under user-agnostic keys, so data
// fetched under one login must never survive into another. Clear the whole
// cache whenever the authenticated user changes — including sign-out — but not
// on token refreshes for the same user (same id).
if (isSupabaseConfigured) {
  // undefined = "no auth event seen yet"; the INITIAL_SESSION callback on page
  // load just records the current user without clearing a still-empty cache.
  let lastUserId: string | null | undefined = undefined;
  supabase.auth.onAuthStateChange((_event, session) => {
    const userId = session?.user?.id ?? null;
    if (lastUserId !== undefined && lastUserId !== userId) {
      queryClient.clear();
    }
    lastUserId = userId;
  });
}
