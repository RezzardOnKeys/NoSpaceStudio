import { cn } from '@/lib/cn';
import type { PresenceState, Profile } from '@/types/models';

import { Avatar } from './Avatar';

interface AvatarStackProps {
  profiles: Profile[];
  /** How many pictures are shown; the rest is summed up as "+3". */
  max?: number;
  /** Online dot per profile, e.g. for friends. */
  statusOf?: (profileId: string) => PresenceState | undefined;
  className?: string;
}

/** Profile pictures overlapping each other, e.g. the members of a party. */
export function AvatarStack({ profiles, max = 3, statusOf, className }: AvatarStackProps) {
  const shown = profiles.slice(0, max);
  const hidden = profiles.length - shown.length;

  return (
    <span className={cn('flex items-center -space-x-2', className)}>
      {shown.map((profile) => (
        <Avatar
          key={profile.id}
          username={profile.username}
          src={profile.avatarUrl}
          size="sm"
          status={statusOf?.(profile.id)}
          className="ring-2 ring-surface"
        />
      ))}
      {hidden > 0 && (
        <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-surface-overlay text-xs font-semibold text-fg-muted ring-2 ring-surface">
          +{hidden}
        </span>
      )}
    </span>
  );
}
