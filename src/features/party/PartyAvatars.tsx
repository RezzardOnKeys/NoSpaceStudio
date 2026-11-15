import { AvatarStack } from '@/components/ui/AvatarStack';
import { useFriendStatuses } from '@/features/presence/queries';
import { cn } from '@/lib/cn';

import { useParty } from './queries';

interface PartyAvatarsProps {
  className?: string;
}

/**
 * The party members as overlapping pictures, like next to "Party" in the
 * sidebar. Shows nothing while the user is not in a party.
 */
export function PartyAvatars({ className }: PartyAvatarsProps) {
  const { data: party } = useParty();
  const { data: statuses } = useFriendStatuses();
  const members = party?.members.map((member) => member.profile) ?? [];

  if (members.length === 0) return null;

  const names = members.map((profile) => profile.username).join(', ');

  return (
    <span className={cn('flex items-center', className)} title={`Party: ${names}`}>
      <span className="sr-only">{`Party: ${names}`}</span>
      <AvatarStack profiles={members} statusOf={(id) => statuses?.get(id)?.state} />
    </span>
  );
}
