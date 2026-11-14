import { useFriendRequests } from '@/features/friends/queries';
import { usePartyInvites } from '@/features/party/queries';
import { paths } from '@/routes/paths';

export interface NavBadge {
  count: number;
  /** Read by screen readers, e.g. "2 friend requests". */
  label: string;
}

/** Counters for the navigation: open friend requests and party invitations. */
export function useNavBadges(): Partial<Record<string, NavBadge>> {
  const { data: requests } = useFriendRequests();
  const { data: invites } = usePartyInvites();

  return {
    [paths.friends]: {
      count: requests?.filter((request) => request.direction === 'incoming').length ?? 0,
      label: 'friend requests',
    },
    [paths.library]: { count: invites?.length ?? 0, label: 'party invitations' },
  };
}
