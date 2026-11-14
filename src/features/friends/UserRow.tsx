import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { PresenceAvatar } from '@/features/presence/PresenceAvatar';
import { useStatusLabel } from '@/features/presence/useStatusLabel';
import { paths } from '@/routes/paths';
import type { Profile } from '@/types/models';

interface UserRowProps {
  profile: Profile;
  /** Small line under the name. Replaces the online status of friends. */
  meta?: string;
  /** Shown when there is neither `meta` nor an online status. */
  metaFallback?: string;
  /** Buttons on the right. */
  actions?: ReactNode;
}

/** One person in a list: avatar, name linking to their profile, actions. */
export function UserRow({ profile, meta, metaFallback, actions }: UserRowProps) {
  const statusLabel = useStatusLabel(profile.id);
  const shownMeta = meta ?? statusLabel ?? metaFallback;

  return (
    <li className="relative flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-overlay">
      <PresenceAvatar profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to={paths.user(profile.username)}
          className="truncate rounded font-semibold after:absolute after:inset-0"
        >
          {profile.username}
        </Link>
        {shownMeta && <span className="truncate text-sm text-fg-subtle">{shownMeta}</span>}
      </div>
      {actions && <div className="relative z-10 flex shrink-0 items-center gap-2">{actions}</div>}
    </li>
  );
}
