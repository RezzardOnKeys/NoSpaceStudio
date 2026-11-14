import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { getSupabaseOrNull } from '@/lib/supabase';

import { AuthContext, type AuthContextValue } from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
}

/** Keeps track of who is signed in and shares it with the whole app. */
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthContextValue>(() => ({
    userId: null,
    email: null,
    // Without Supabase there is no session to wait for: everyone is a guest.
    isLoading: getSupabaseOrNull() !== null,
  }));

  useEffect(() => {
    const supabase = getSupabaseOrNull();
    if (!supabase) return;

    let knownUserId: string | null | undefined;

    // Fires once with the stored session, then on every sign-in and sign-out.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      const email = session?.user.email ?? null;
      setState((current) =>
        current.userId === userId && current.email === email && !current.isLoading
          ? current
          : { userId, email, isLoading: false },
      );

      const userChanged = knownUserId !== undefined && knownUserId !== userId;
      knownUserId = userId;
      if (userChanged) {
        // Cached data belongs to the previous user. Deferred, because Supabase
        // must not be called from inside this callback.
        window.setTimeout(() => void queryClient.resetQueries(), 0);
      }
    });

    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return <AuthContext value={state}>{children}</AuthContext>;
}
