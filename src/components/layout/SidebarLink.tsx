import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';

import { cn } from '@/lib/cn';

interface SidebarLinkProps {
  to: string;
  label: string;
  icon?: LucideIcon;
  /** Replaces the icon, e.g. with an avatar. */
  leading?: ReactNode;
  /** Small counter on the right, hidden when zero. */
  count?: number;
  countLabel?: string;
}

export function SidebarLink({
  to,
  label,
  icon: Icon,
  leading,
  count = 0,
  countLabel,
}: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
          isActive
            ? 'bg-accent-soft text-fg'
            : 'text-fg-muted hover:bg-surface-raised hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-accent"
            />
          )}
          {leading ??
            (Icon && (
              <Icon
                className={cn('size-5 shrink-0', isActive && 'text-accent-bright')}
                aria-hidden="true"
              />
            ))}
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {count > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-strong px-1.5 text-xs font-semibold text-on-accent">
              <span aria-hidden="true">{count}</span>
              <span className="sr-only">{`${count} ${countLabel ?? 'new'}`}</span>
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
