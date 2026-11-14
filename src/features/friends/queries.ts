import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast-context';
import { queryKeys } from '@/lib/query-keys';
import {
  acceptFriendRequest,
  deleteFriendRequest,
  fetchFriendRequests,
  fetchFriends,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from '@/mocks/api';

export function useFriends() {
  return useQuery({ queryKey: queryKeys.friends, queryFn: fetchFriends });
}

export function useFriendRequests() {
  return useQuery({ queryKey: queryKeys.friendRequests, queryFn: fetchFriendRequests });
}

export function useUserSearch(query: string) {
  const trimmed = query.trim().toLowerCase();
  return useQuery({
    queryKey: queryKeys.userSearch(trimmed),
    queryFn: () => searchUsers(trimmed),
    enabled: trimmed.length >= 2,
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
    onError: () => {
      toast({
        title: 'That did not work',
        description: 'Check your internet connection and try again.',
        variant: 'error',
      });
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.friends }),
        queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests }),
        queryClient.invalidateQueries({ queryKey: ['user-search'] }),
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
