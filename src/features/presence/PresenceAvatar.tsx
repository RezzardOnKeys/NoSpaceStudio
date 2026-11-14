import { Avatar } from '@/components/ui/Avatar';
import type { Profile } from '@/types/models';

import { useFriendStatus } from './queries';

interface PresenceAvatarProps {
  profile: Profile;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/** Avatar with the online dot, shown for friends only. */
export function PresenceAvatar({ profile, size, className }: PresenceAvatarProps) {
  const status = useFriendStatus(profile.id);

  return (
    <Avatar
      username={profile.username}
      src={profile.avatarUrl}
      size={size}
      status={status?.state}
      className={className}
    />
  );
}
