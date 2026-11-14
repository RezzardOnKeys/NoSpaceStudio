import { useGames } from '@/features/games/queries';
import { formatRelative } from '@/lib/format';

import { useFriendStatus } from './queries';

/**
 * "Online", "Playing 99-Finger WPM Trainer" or "Offline · last seen 2 hours
 * ago". Undefined for players who are not friends (and for yourself).
 */
export function useStatusLabel(userId: string): string | undefined {
  const status = useFriendStatus(userId);
  const { data: games } = useGames();

  if (!status) return undefined;
  if (status.state === 'online') return 'Online';
  if (status.state === 'playing') {
    const title = games?.find((game) => game.slug === status.gameSlug)?.title;
    return title ? `Playing ${title}` : 'Playing';
  }
  return `Offline · last seen ${formatRelative(status.lastSeenAt)}`;
}

/** Sort order for lists of friends: playing, online, offline. */
export const PRESENCE_ORDER = { playing: 0, online: 1, offline: 2 } as const;
