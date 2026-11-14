import { Crown, User } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';

interface PartyRoleBadgeProps {
  isHost: boolean;
}

/** "Host" with a crown, or "Member". */
export function PartyRoleBadge({ isHost }: PartyRoleBadgeProps) {
  return isHost ? (
    <Badge variant="warning">
      <Crown aria-hidden="true" />
      Host
    </Badge>
  ) : (
    <Badge>
      <User aria-hidden="true" />
      Member
    </Badge>
  );
}
