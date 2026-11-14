import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-context';
import { fetchProfileByUsername } from '@/features/profile/api';
import { queryKeys } from '@/lib/query-keys';
import type { UserPlaytime } from '@/types/models';

import { fetchFriendsPlaytimeForGame, fetchPlaytimeOfUser, isFriendOf } from './api';

/** The signed-in user's playtime. Stays empty (and idle) for guests. */
export function useMyPlaytime() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.myPlaytime,
    queryFn: () => fetchPlaytimeOfUser(userId ?? ''),
    enabled: userId !== null,
  });
}

/** A player's profile and playtime. `data` is null when nobody has this username. */
export function useUserPlaytime(username: string) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.userPlaytime(username),
    queryFn: async (): Promise<UserPlaytime | null> => {
      const profile = await fetchProfileByUsername(username);
      if (!profile) return null;
      const visible = profile.id === userId || (await isFriendOf(profile.id));
      return { profile, playtime: visible ? await fetchPlaytimeOfUser(profile.id) : null };
    },
  });
}

/** Which friends played a game. Guests have no friends, so it stays idle for them. */
export function useFriendsPlaytimeForGame(gameId: string) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.friendsPlaytimeForGame(gameId),
    queryFn: () => fetchFriendsPlaytimeForGame(gameId, userId ?? ''),
    enabled: userId !== null,
  });
}
