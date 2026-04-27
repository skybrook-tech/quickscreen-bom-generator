import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ProfileContextValue {
  /** The Supabase auth user — same source as the provider's useAuth call. */
  user: User | null;
  role: string | null;
  orgId: string | null;
  isAdmin: boolean;
  /** True while auth OR profile are still resolving — safe to gate on. */
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextValue>({
  user: null,
  role: null,
  orgId: null,
  isAdmin: false,
  isLoading: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // isPending stays true until data exists OR the query is definitively disabled.
  // This prevents the one-render gap where isLoading flips false before the first
  // fetch fires (TanStack Query v5: isPending = status==='pending', regardless of
  // fetchStatus, whereas isLoading requires fetchStatus !== 'idle').
  const { data: profile, isPending: profilePending } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, org_id')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as { role: string; org_id: string };
    },
  });

  // Still loading if: auth hasn't resolved yet, OR user exists but profile
  // hasn't returned. If user is null (not logged in), treat as done loading.
  const isLoading = authLoading || (!!user && profilePending);

  return (
    <ProfileContext.Provider
      value={{
        user,
        role: profile?.role ?? null,
        orgId: profile?.org_id ?? null,
        isAdmin: profile?.role === 'admin',
        isLoading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfile() {
  return useContext(ProfileContext);
}
