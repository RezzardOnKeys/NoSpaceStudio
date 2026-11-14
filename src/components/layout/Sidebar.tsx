import { LogIn } from 'lucide-react';
import { Link } from 'react-router';

import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/queries';
import { paths } from '@/routes/paths';

import { mainNavItems } from './nav-items';
import { SidebarLink } from './SidebarLink';
import { useNavBadges } from './useNavBadges';

/** Fixed navigation on the left. Only shown on large screens. */
export function Sidebar() {
  const { data: user, isPending } = useCurrentUser();
  const badges = useNavBadges();

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
