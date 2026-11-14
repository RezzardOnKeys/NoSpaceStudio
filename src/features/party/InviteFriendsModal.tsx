import { Check, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonStyles } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { Modal } from '@/components/ui/Modal';
import { UserRow } from '@/features/friends/UserRow';
import { useFriends } from '@/features/friends/queries';
import { paths } from '@/routes/paths';
import type { Party } from '@/types/models';

import { useInviteToParty } from './queries';

interface InviteFriendsModalProps {
  open: boolean;
  onClose: () => void;
  /** The current party, or null when inviting will create one. */
  party: Party | null;
}

/** Friend list with an "Invite" button per friend. */
export function InviteFriendsModal({ open, onClose, party }: InviteFriendsModalProps) {
  const friends = useFriends();
  const invite = useInviteToParty();

  const memberIds = new Set(party?.members.map((member) => member.profile.id));
  const invitedIds = new Set(party?.invited.map((entry) => entry.profile.id));
  const candidates = friends.data?.filter((friend) => !memberIds.has(friend.profile.id)) ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite friends"
      description="Invited friends see the invitation in their launcher."
    >
      {friends.isPending ? (
        <ListSkeleton rows={3} />
      ) : friends.isError ? (
        <p className="text-sm text-fg-muted">
          Your friends could not be loaded. Close this window and try again.
        </p>
      ) : candidates.length === 0 ? (
        <EmptyState
          className="py-6"
          icon={<Users />}
          title={friends.data.length === 0 ? 'No friends yet' : 'Everybody is here'}
          description={
            friends.data.length === 0
              ? 'Add friends first, then you can invite them to your party.'
              : 'All your friends are already in your party.'
          }
          action={
            friends.data.length === 0 ? (
              <Link to={paths.friends} className={buttonStyles({ variant: 'secondary' })}>
                Go to friends
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="-mx-2.5 flex flex-col gap-1">
          {candidates.map(({ profile }) => {
            const invited = invitedIds.has(profile.id);
            return (
              <UserRow
                key={profile.id}
                profile={profile}
                actions={
                  invited ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      icon={<Check className="size-4" aria-hidden="true" />}
                    >
                      Invited
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      icon={<UserPlus className="size-4" aria-hidden="true" />}
                      loading={invite.isPending && invite.variables === profile.id}
                      onClick={() => invite.mutate(profile.id)}
                    >
                      Invite
                    </Button>
                  )
                }
              />
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
