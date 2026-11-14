import { useEffect } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { useCurrentUser } from '@/features/auth/queries';

import { partyHash } from './party-session';
import { useParty, useStopPartyGame } from './queries';

export interface PartyLaunch {
  /** True while the party (or the user's name) is still loading. */
  isLoading: boolean;
  /** What the game gets after "#" in its address, or null for a normal game. */
  hash: string | null;
  isHost: boolean;
}

/**
 * Decides whether the player opens a game for the party. It does when the
 * address carries the session the party is playing right now
 * (?session=..., set by partyPlayPath). Otherwise the game runs alone.
 */
export function usePartyLaunch(gameSlug: string, session: string | null): PartyLaunch {
  const { userId } = useAuth();
  const party = useParty();
  const user = useCurrentUser();

  if (!session || !userId) return { isLoading: false, hash: null, isHost: false };
  if (party.isPending || user.isPending) return { isLoading: true, hash: null, isHost: false };

  const data = party.data;
  const matches = data && data.sessionId === session && data.gameSlug === gameSlug;
  if (!matches || !user.data) return { isLoading: false, hash: null, isHost: false };

  return {
    isLoading: false,
    hash: partyHash(data, userId, user.data.username),
    isHost: data.hostId === userId,
  };
}

/** A stop that is waiting to be sent; cancelled when the player mounts again. */
let pendingStop: number | undefined;

/**
 * When the host leaves a party game, the game is stopped for the party, so
 * the other launchers stop offering "Join game". The short delay ignores
 * React's development double mount and quick reloads of the player.
 */
export function useStopPartyGameOnLeave(isHost: boolean): void {
  const { mutate: stop } = useStopPartyGame();

  useEffect(() => {
    if (!isHost) return;
    window.clearTimeout(pendingStop);
    return () => {
      pendingStop = window.setTimeout(() => stop(), 1000);
    };
  }, [isHost, stop]);
}
