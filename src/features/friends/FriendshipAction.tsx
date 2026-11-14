import { Check, Clock, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Profile } from '@/types/models';

import {
  useAcceptFriendRequest,
  useFriendRequests,
  useFriends,
  useSendFriendRequest,
} from './queries';

interface FriendshipActionProps {
  profile: Profile;
}

/**
 * The fitting friend button for another player's profile: add them, accept
 * their request, or show that a request is on its way.
 */
export function FriendshipAction({ profile }: FriendshipActionProps) {
  const friends = useFriends();
  const requests = useFriendRequests();
  const send = useSendFriendRequest();
  const accept = useAcceptFriendRequest();

  if (friends.isPending || requests.isPending) {
    return <Skeleton className="h-10 w-40 rounded-lg" />;
  }

  if (friends.data?.some((friend) => friend.profile.id === profile.id)) return null;

  const request = requests.data?.find((item) => item.profile.id === profile.id);

  if (request?.direction === 'incoming') {
    return (
      <Button
        icon={<Check className="size-4" aria-hidden="true" />}
        loading={accept.isPending}
        onClick={() => accept.mutate(request.id)}
      >
        Accept friend request
      </Button>
    );
  }

  if (request?.direction === 'outgoing') {
    return (
      <Button variant="secondary" disabled icon={<Clock className="size-4" aria-hidden="true" />}>
        Friend request sent
      </Button>
    );
  }

  return (
    <Button
      icon={<UserPlus className="size-4" aria-hidden="true" />}
      loading={send.isPending}
      onClick={() => send.mutate(profile.id)}
    >
      Add friend
    </Button>
  );
}
