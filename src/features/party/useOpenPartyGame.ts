import { useNavigate } from 'react-router';

import { partyPlayPath } from './party-session';
import { useStartPartyGame } from './queries';

/**
 * Host only: starts a game for the whole party and opens it. The other
 * members are pulled along by PartyWatcher.
 */
export function useOpenPartyGame() {
  const start = useStartPartyGame();
  const navigate = useNavigate();

  return {
    open: (gameSlug: string) =>
      start.mutate(gameSlug, {
        onSuccess: (sessionId) => void navigate(partyPlayPath(gameSlug, sessionId)),
      }),
    pendingSlug: start.isPending ? start.variables : undefined,
  };
}
