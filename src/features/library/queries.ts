import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-context';
import { fetchProfileByUsername } from '@/features/profile/api';
import { queryKeys } from '@/lib/query-keys';
import { fetchFriendsPlaytimeForGame, fetchMyPlaytime, fetchPlaytimeOfUser } from '@/mocks/api';
import type { UserPlaytime } from '@/types/models';

export function useMyPlaytime() {
  return useQuery({ queryKey: queryKeys.myPlaytime, queryFn: fetchMyPlaytime });
}

/** A player's profile and playtime. `data` is null when nobody has this username. */
export function useUserPlaytime(username: string) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.userPlaytime(username),
    queryFn: async (): Promise<UserPlaytime | null> => {
      const profile = await fetchProfileByUsername(username);
      if (!profile) return null;
      const playtime =
        profile.id === userId ? await fetchMyPlaytime() : await fetchPlaytimeOfUser(profile.id);
      return { profile, playtime };
    },
  });
}

export function useFriendsPlaytimeForGame(gameId: string) {
  return useQuery({
    queryKey: queryKeys.friendsPlaytimeForGame(gameId),
    queryFn: () => fetchFriendsPlaytimeForGame(gameId),
  });
}
