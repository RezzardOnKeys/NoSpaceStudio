import { useFriendRequests } from '@/features/friends/queries';

/** Number of friend requests waiting for an answer, for the navigation badge. */
export function useIncomingRequestCount(): number {
  const { data } = useFriendRequests();
  return data?.filter((request) => request.direction === 'incoming').length ?? 0;
}
