import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMatch } from 'react-router';

import { useAuth } from '@/features/auth/auth-context';
import { queryKeys } from '@/lib/query-keys';
import { getSupabaseOrNull } from '@/lib/supabase';
import { paths } from '@/routes/paths';

import { reportStatus } from './api';

/** How often the launcher says "I am here". The database allows 75 seconds. */
const HEARTBEAT_MS = 30_000;

/**
 * Runs once for the whole app (see RootLayout). While someone is signed in
 * it reports their status, including the game that is open, and listens for
 * friends' status changes so "is now playing" shows up right away.
 */
export function PresenceReporter() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const playMatch = useMatch(paths.play(':slug'));
  const gameSlug = playMatch?.params.slug ?? null;

  // Report now (also whenever a game opens or closes) and then regularly.
  useEffect(() => {
    if (!userId) return;

    function report() {
      reportStatus(gameSlug).catch((error: unknown) => {
        console.warn('Online status could not be saved:', error);
      });
    }

    report();
    const timer = window.setInterval(report, HEARTBEAT_MS);
    // Coming back to a tab that the browser slowed down: report right away.
    function handleVisibility() {
      if (document.visibilityState === 'visible') report();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userId, gameSlug]);

  // A friend's row changed: ask for the statuses again.
  useEffect(() => {
    const supabase = getSupabaseOrNull();
    if (!supabase || !userId) return;

    const refresh = () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.friendStatuses });
    const channel = supabase
      .channel(`status-updates-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_status' }, refresh)
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [userId, queryClient]);

  return null;
}
