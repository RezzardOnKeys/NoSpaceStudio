import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-context';
import { useFriends } from '@/features/friends/queries';
import { queryKeys } from '@/lib/query-keys';
import type { FriendStatus } from '@/types/models';

import { fetchFriendStatuses } from './api';

/**
 * Friends go offline without telling anybody (they just close the tab), so
 * the list is asked for again regularly. Starting a game shows up at once
 * through Realtime (PresenceReporter).
 */
const REFRESH_MS = 30_000;

/** All friends' statuses by user id. Empty for guests. */
export function useFriendStatuses() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.friendStatuses,
    queryFn: fetchFriendStatuses,
    enabled: userId !== null,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * One player's status, or undefined when they are not a friend (or yourself).
 * A friend without any report yet counts as offline, without "last seen".
 */
export function useFriendStatus(userId: string): FriendStatus | undefined {
  const { data } = useFriendStatuses();
  const { data: friends } = useFriends();

  const status = data?.get(userId);
  if (status) return status;
  if (!friends?.some((friend) => friend.profile.id === userId)) return undefined;
  return { userId, state: 'offline', gameSlug: null, lastSeenAt: null };
}

/** How many friends are online or playing right now. */
export function useOnlineFriendCount(): number {
  const { data } = useFriendStatuses();
  if (!data) return 0;
  return [...data.values()].filter((status) => status.state !== 'offline').length;
}
