import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    // Check if access_token and refresh_token are passed in URL for cross-origin SSO
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        if (error) {
          console.error('[useAuth] SSO setSession error:', error);
        }
        
        // Remove token parameters from URL to clean up browser history
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('access_token');
        cleanUrl.searchParams.delete('refresh_token');
        window.history.replaceState({}, '', cleanUrl.toString());

        setState({ 
          user: data.session?.user ?? null, 
          session: data.session, 
          loading: false 
        });
      });
    } else {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setState({ user: session?.user ?? null, session, loading: false });
      });
    }

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
