import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { queryKeys } from '@/lib/query-keys';

import {
  acceptFriendRequest,
  deleteFriendRequest,
  describeFriendError,
  fetchFriendships,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  type Friendships,
} from './api';

/** How often open requests are checked, so the badge in the menu stays current. */
const REFRESH_MS = 60_000;

/** Friends and requests share one request. Guests have neither. */
function useFriendships<T>(select: (data: Friendships) => T) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.friendships,
    queryFn: () => fetchFriendships(userId ?? ''),
    enabled: userId !== null,
    select,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

const selectFriends = (data: Friendships) => data.friends;
const selectRequests = (data: Friendships) => data.requests;

export function useFriends() {
  return useFriendships(selectFriends);
}

export function useFriendRequests() {
  return useFriendships(selectRequests);
}

export function useUserSearch(query: string) {
  const { userId } = useAuth();
  const trimmed = query.trim().toLowerCase();

  return useQuery({
    queryKey: queryKeys.userSearch(trimmed),
    queryFn: () => searchUsers(trimmed, userId ?? ''),
    enabled: userId !== null && trimmed.length >= 2,
  });
}

/**
 * Wraps a friendship action: refreshes everything friend related afterwards
 * and reports the outcome as a toast.
 */
function useFriendAction<TInput>(action: (input: TInput) => Promise<unknown>, success: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      toast({ title: success, variant: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'That did not work',
        description: describeFriendError(error),
        variant: 'error',
      });
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.friendships }),
        queryClient.invalidateQueries({ queryKey: ['user-search'] }),
        // Becoming friends (or not) changes whose playtime is visible.
        queryClient.invalidateQueries({ queryKey: ['playtime'] }),
      ]),
  });
}

export function useSendFriendRequest() {
  return useFriendAction(sendFriendRequest, 'Friend request sent');
}

export function useAcceptFriendRequest() {
  return useFriendAction(acceptFriendRequest, 'Friend request accepted');
}

export function useDeclineFriendRequest() {
  return useFriendAction(deleteFriendRequest, 'Friend request declined');
}

export function useCancelFriendRequest() {
  return useFriendAction(deleteFriendRequest, 'Friend request cancelled');
}

export function useRemoveFriend() {
  return useFriendAction(removeFriend, 'Friend removed');
}
