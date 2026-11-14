import { Crown, UserMinus, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/features/auth/auth-context';
import { UserRow } from '@/features/friends/UserRow';
import { formatRelative } from '@/lib/format';
import type { Party, Profile } from '@/types/models';

import { PartyRoleBadge } from './PartyRoleBadge';
import { useCancelPartyInvite, useKickPartyMember, useTransferPartyHost } from './queries';

interface PartyMembersProps {
  party: Party;
}

/** What the host is about to do; asked in a confirmation dialog first. */
interface PendingAction {
  kind: 'kick' | 'host';
  profile: Profile;
}

/**
 * Everybody in the party, marked as host or member, plus open invitations.
 * The host can kick members and pass the host role on.
 */
export function PartyMembers({ party }: PartyMembersProps) {
  const { userId } = useAuth();
  const kick = useKickPartyMember();
  const transfer = useTransferPartyHost();
  const cancelInvite = useCancelPartyInvite();
  const [pending, setPending] = useState<PendingAction | null>(null);

  const iAmHost = party.hostId === userId;
  const running = kick.isPending || transfer.isPending;

  function confirm() {
    if (!pending) return;
    const action = pending.kind === 'kick' ? kick : transfer;
    action.mutate(pending.profile.id, { onSettled: () => setPending(null) });
  }

  return (
    <>
      <ul className="-mx-2.5 flex flex-col gap-1">
        {party.members.map(({ profile, joinedAt }) => {
          const isHost = profile.id === party.hostId;
          const isMe = profile.id === userId;
          return (
            <UserRow
              key={profile.id}
              profile={profile}
              meta={isMe ? 'You' : undefined}
              metaFallback={`Joined ${formatRelative(joinedAt)}`}
              actions={
                <>
                  <PartyRoleBadge isHost={isHost} />
                  {iAmHost && !isMe && (
                    <>
                      <IconButton
                        label={`Make ${profile.username} the host`}
                        onClick={() => setPending({ kind: 'host', profile })}
                      >
                        <Crown className="size-5" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Remove ${profile.username} from the party`}
                        onClick={() => setPending({ kind: 'kick', profile })}
                      >
                        <UserMinus className="size-5" aria-hidden="true" />
                      </IconButton>
                    </>
                  )}
                </>
              }
            />
          );
        })}

        {party.invited.map(({ inviteId, profile }) => (
          <UserRow
            key={inviteId}
            profile={profile}
            meta="Has not answered yet"
            actions={
              <>
                <Badge variant="outline">Invited</Badge>
                <IconButton
                  label={`Take back the invitation for ${profile.username}`}
                  onClick={() => cancelInvite.mutate(inviteId)}
                >
                  <X className="size-5" aria-hidden="true" />
                </IconButton>
              </>
            }
          />
        ))}
      </ul>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        size="sm"
        title={
          pending?.kind === 'kick'
            ? `Remove ${pending.profile.username}?`
            : `Make ${pending?.profile.username ?? 'them'} the host?`
        }
        description={
          pending?.kind === 'kick'
            ? 'They leave the party right away. You can invite them again later.'
            : 'They decide which game the party plays. You stay in the party as a member.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={running}>
              Cancel
            </Button>
            <Button
              variant={pending?.kind === 'kick' ? 'danger' : 'primary'}
              loading={running}
              onClick={confirm}
            >
              {pending?.kind === 'kick' ? 'Remove' : 'Make host'}
            </Button>
          </>
        }
      />
    </>
  );
}
