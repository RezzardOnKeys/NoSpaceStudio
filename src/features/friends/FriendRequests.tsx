import { Check, X } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatRelative } from '@/lib/format';
import type { FriendRequest } from '@/types/models';

import { useAcceptFriendRequest, useCancelFriendRequest, useDeclineFriendRequest } from './queries';
import { UserRow } from './UserRow';

interface FriendRequestsProps {
  requests: FriendRequest[];
}

/** Open requests: incoming ones to answer, outgoing ones to cancel. */
export function FriendRequests({ requests }: FriendRequestsProps) {
  const accept = useAcceptFriendRequest();
  const decline = useDeclineFriendRequest();
  const cancel = useCancelFriendRequest();

  return (
    <ul className="-mx-2.5 flex flex-col gap-1">
      {requests.map((request) =>
        request.direction === 'incoming' ? (
          <UserRow
            key={request.id}
            profile={request.profile}
            meta={`Wants to be friends · ${formatRelative(request.createdAt)}`}
            actions={
              <>
                <Button
                  size="sm"
                  icon={<Check className="size-4" aria-hidden="true" />}
                  loading={accept.isPending && accept.variables === request.id}
                  onClick={() => accept.mutate(request.id)}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<X className="size-4" aria-hidden="true" />}
                  loading={decline.isPending && decline.variables === request.id}
                  onClick={() => decline.mutate(request.id)}
                >
                  Decline
                </Button>
              </>
            }
          />
        ) : (
          <UserRow
            key={request.id}
            profile={request.profile}
            meta={`Request sent · ${formatRelative(request.createdAt)}`}
            actions={
              <>
                <Badge className="hidden sm:inline-flex">Pending</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={cancel.isPending && cancel.variables === request.id}
                  onClick={() => cancel.mutate(request.id)}
                >
                  Cancel
                </Button>
              </>
            }
          />
        ),
      )}
    </ul>
  );
}
