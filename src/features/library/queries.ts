import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { fetchFriendsPlaytimeForGame, fetchMyPlaytime, fetchUserPlaytime } from '@/mocks/api';

export function useMyPlaytime() {
  return useQuery({ queryKey: queryKeys.myPlaytime, queryFn: fetchMyPlaytime });
}

export function useUserPlaytime(username: string) {
  return useQuery({
    queryKey: queryKeys.userPlaytime(username),
    queryFn: () => fetchUserPlaytime(username),
  });
}

export function useFriendsPlaytimeForGame(gameId: string) {
  return useQuery({
    queryKey: queryKeys.friendsPlaytimeForGame(gameId),
    queryFn: () => fetchFriendsPlaytimeForGame(gameId),
  });
}
