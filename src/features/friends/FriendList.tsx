import { UserMinus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/format';
import type { Friend } from '@/types/models';

import { useRemoveFriend } from './queries';
import { UserRow } from './UserRow';

interface FriendListProps {
  friends: Friend[];
}

export function FriendList({ friends }: FriendListProps) {
  const removeFriend = useRemoveFriend();
  // The friend the "remove" dialog is asking about, if it is open.
  const [pendingRemoval, setPendingRemoval] = useState<Friend | null>(null);

  function confirmRemoval() {
    if (!pendingRemoval) return;
    removeFriend.mutate(pendingRemoval.profile.id, {
      onSettled: () => setPendingRemoval(null),
    });
  }

  return (
    <>
      <ul className="-mx-2.5 flex flex-col gap-1">
        {friends.map((friend) => (
          <UserRow
            key={friend.profile.id}
            profile={friend.profile}
            meta={`Friends since ${formatDate(friend.since)}`}
            actions={
              <IconButton
                label={`Remove ${friend.profile.username} from friends`}
                onClick={() => setPendingRemoval(friend)}
              >
                <UserMinus className="size-5" aria-hidden="true" />
              </IconButton>
            }
          />
        ))}
      </ul>

      <Modal
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        title={`Remove ${pendingRemoval?.profile.username ?? 'friend'}?`}
        description="You will no longer see each other's playtime. You can send a new request at any time."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingRemoval(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={removeFriend.isPending} onClick={confirmRemoval}>
              Remove
            </Button>
          </>
        }
      />
    </>
  );
}
