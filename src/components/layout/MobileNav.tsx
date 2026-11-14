import { NavLink } from 'react-router';

import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';

import { mainNavItems } from './nav-items';
import { useIncomingRequestCount } from './useIncomingRequestCount';

/** Tab bar at the bottom. Replaces the sidebar on phones and tablets. */
export function MobileNav() {
  const requestCount = useIncomingRequestCount();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {mainNavItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'relative flex h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              isActive ? 'text-accent-bright' : 'text-fg-muted',
            )
          }
        >
          <span className="relative">
            <Icon className="size-5" aria-hidden="true" />
            {to === paths.friends && requestCount > 0 && (
              <span className="absolute -top-1 -right-1.5 size-2.5 rounded-full bg-accent-strong ring-2 ring-surface">
                <span className="sr-only">{`${requestCount} friend requests`}</span>
              </span>
            )}
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
