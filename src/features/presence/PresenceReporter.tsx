import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMatch } from 'react-router';

import { useAuth } from '@/features/auth/auth-context';
import { queryKeys } from '@/lib/query-keys';
import { getSupabaseOrNull } from '@/lib/supabase';
import { paths } from '@/routes/paths';

import { reportAway, reportAwayOnClose, reportStatus } from './api';
import { createActivityTracker } from './activity';

/** How often an active launcher says "I am here". The database allows 75 seconds. */
const HEARTBEAT_MS = 30_000;
/** How often the launcher checks whether the player is still active. */
const CHECK_MS = 5_000;

/**
 * Runs once for the whole app (see RootLayout). While someone is signed in
 * and really uses the launcher or a game (activity.ts), it reports their
 * status, including the game that is open. When they stop (tab hidden for
 * a moment, nobody at the keyboard for a few minutes, tab closed) it says
 * "I am away" once, so friends see "Offline" right away. It also listens
 * for friends' status changes so "is now playing" shows up at once.
 */
export function PresenceReporter() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const playMatch = useMatch(paths.play(':slug'));
  const gameSlug = playMatch?.params.slug ?? null;

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseOrNull();
    const tracker = createActivityTracker();

    // The access token for the "I am away" message when the tab closes.
    let accessToken: string | null = null;
    void supabase?.auth.getSession().then(({ data }) => {
      accessToken = data.session?.access_token ?? null;
    });
    const auth = supabase?.auth.onAuthStateChange((_event, session) => {
      accessToken = session?.access_token ?? null;
    });

    let away: boolean | null = null; // null: nothing reported yet on this page
    let lastReport = 0;
    // After a reload the "I am away" of the old page can arrive after the
    // first report of the new one. So the first report is repeated soon.
    let firstReport = true;

    function warn(error: unknown) {
      console.warn('Online status could not be saved:', error);
    }

    function check() {
      const now = Date.now();
      if (gameSlug) tracker.markFocusedActive();
      if (tracker.isActive(now)) {
        if (away !== false || now - lastReport >= HEARTBEAT_MS) {
          away = false;
          lastReport = firstReport ? now - HEARTBEAT_MS + 2 * CHECK_MS : now;
          firstReport = false;
          reportStatus(gameSlug).catch(warn);
        }
      } else if (away !== true) {
        away = true;
        // Another launcher tab is in use: that one keeps the player online.
        if (!tracker.activeElsewhere(now)) reportAway().catch(warn);
      }
    }

    check();
    const timer = window.setInterval(check, CHECK_MS);
    // Coming back to the tab or touching the mouse after a break: report at
    // once. These listeners are added after the tracker's own, so the
    // tracker has already noted the input when check() asks it.
    function wakeUp() {
      if (away) check();
    }
    const events = ['pointerdown', 'keydown', 'focus'] as const;
    for (const name of events) window.addEventListener(name, wakeUp);
    document.addEventListener('visibilitychange', wakeUp);

    // Closing or reloading the tab.
    function close() {
      if (accessToken && !tracker.activeElsewhere()) reportAwayOnClose(accessToken);
    }
    window.addEventListener('pagehide', close);

    return () => {
      window.clearInterval(timer);
      for (const name of events) window.removeEventListener(name, wakeUp);
      document.removeEventListener('visibilitychange', wakeUp);
      window.removeEventListener('pagehide', close);
      auth?.data.subscription.unsubscribe();
      tracker.stop();
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
