import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { recordPlaytime } from '@/features/library/api';
import { queryKeys } from '@/lib/query-keys';

/** How often the playtime is saved while playing. */
const HEARTBEAT_SECONDS = 30;

/**
 * Saves the playtime of a running session for signed-in players.
 * `seconds` is the visible-only session clock (useSessionTimer). Every 30
 * seconds, when the tab is hidden and when the player is closed, the time
 * played since the last save is sent to the database.
 */
export function usePlaytimeTracker(gameSlug: string, seconds: number): void {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const secondsRef = useRef(seconds);
  const savedRef = useRef(0);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    if (!userId) return;

    function save(): Promise<void> {
      const unsaved = secondsRef.current - savedRef.current;
      if (unsaved <= 0) return Promise.resolve();
      savedRef.current = secondsRef.current;
      return recordPlaytime(gameSlug, unsaved).catch((error: unknown) => {
        // Losing a few seconds is not worth interrupting the game.
        console.warn('Playtime could not be saved:', error);
      });
    }

    const timer = window.setInterval(() => {
      if (secondsRef.current - savedRef.current >= HEARTBEAT_SECONDS) void save();
    }, 1000);

    function handleVisibility() {
      if (document.visibilityState === 'hidden') void save();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Leaving the player: save the rest, then refresh library, profile and store.
      void save().then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ['playtime'] }),
          queryClient.invalidateQueries({ queryKey: queryKeys.games }),
        ]),
      );
    };
  }, [userId, gameSlug, queryClient]);
}
