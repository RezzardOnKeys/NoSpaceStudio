import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { paths } from '@/routes/paths';
import type { Profile } from '@/types/models';

interface UserRowProps {
  profile: Profile;
  /** Small line under the name, e.g. "Friends since Jun 12, 2026". */
  meta?: string;
  /** Buttons on the right. */
  actions?: ReactNode;
}

/** One person in a list: avatar, name linking to their profile, actions. */
export function UserRow({ profile, meta, actions }: UserRowProps) {
  return (
    <li className="relative flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-overlay">
      <Avatar username={profile.username} src={profile.avatarUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to={paths.user(profile.username)}
          className="truncate rounded font-semibold after:absolute after:inset-0"
        >
          {profile.username}
        </Link>
        {meta && <span className="truncate text-sm text-fg-subtle">{meta}</span>}
      </div>
      {actions && <div className="relative z-10 flex shrink-0 items-center gap-2">{actions}</div>}
    </li>
  );
}
