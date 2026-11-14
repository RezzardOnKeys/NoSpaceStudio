import { paths } from '@/routes/paths';
import type { Party } from '@/types/models';

/** Address of the player for a party game. */
export function partyPlayPath(gameSlug: string, sessionId: string): string {
  return `${paths.play(gameSlug)}?session=${sessionId}`;
}

/**
 * What a game gets in its address when it is started for a party. The
 * format is described in docs/PARTY-GAMES.md; games read it themselves.
 */
export function partyHash(
  party: Party,
  myId: string,
  myName: string,
  myAvatarUrl: string | null,
): string | null {
  if (!party.sessionId) return null;
  const params = new URLSearchParams({
    party: party.sessionId.replace(/-/g, ''),
    role: party.hostId === myId ? 'host' : 'guest',
    name: myName,
    players: String(party.members.length),
  });
  // Public link to the player's profile picture, so games can show it.
  if (myAvatarUrl) params.set('avatar', myAvatarUrl);
  return params.toString();
}
