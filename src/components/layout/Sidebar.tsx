import { LogIn } from 'lucide-react';
import { Link } from 'react-router';

import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/queries';
import { useParty } from '@/features/party/queries';
import { useFriendStatuses, useOnlineFriendCount } from '@/features/presence/queries';
import { paths } from '@/routes/paths';

import { mainNavItems } from './nav-items';
import { SidebarLink } from './SidebarLink';
import { useNavBadges } from './useNavBadges';

/** Fixed navigation on the left. Only shown on large screens. */
export function Sidebar() {
  const { data: user, isPending } = useCurrentUser();
  const badges = useNavBadges();
  const { data: party } = useParty();
  const partyMembers = party?.members.map((member) => member.profile) ?? [];
  const { data: statuses } = useFriendStatuses();
  const onlineFriends = useOnlineFriendCount();

  function trailingFor(to: string) {
    // Who is in the party, visible from every page.
    if (to === paths.party && partyMembers.length > 0) {
      return <AvatarStack profiles={partyMembers} statusOf={(id) => statuses?.get(id)?.state} />;
    }
    if (to === paths.friends && onlineFriends > 0) {
      return <span className="text-xs font-medium text-success">{onlineFriends} online</span>;
    }
    return undefined;
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
      <Link to={paths.store} className="mx-3 mt-3 flex h-12 items-center rounded-lg px-3">
        <Logo />
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3 pt-4">
        {mainNavItems.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            trailing={trailingFor(item.to)}
            count={badges[item.to]?.count}
            countLabel={badges[item.to]?.label}
          />
        ))}
      </nav>

      <nav aria-label="Account" className="flex flex-col gap-1 border-t border-line p-3">
        {user ? (
          <SidebarLink
            to={paths.profile}
            label={user.username}
            leading={
              <Avatar username={user.username} src={user.avatarUrl} size="sm" className="-ml-1.5" />
            }
          />
        ) : isPending ? (
          <div className="flex h-10 items-center gap-3 px-1.5" aria-busy="true">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ) : (
          <SidebarLink to={paths.signIn} label="Sign in" icon={LogIn} />
        )}
      </nav>
    </aside>
  );
}
