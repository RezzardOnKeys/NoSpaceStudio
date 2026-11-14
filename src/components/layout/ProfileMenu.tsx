import { ChevronDown, Library, LogOut, UserRound, Users, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { buttonStyles } from '@/components/ui/button-styles';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast-context';
import { describeAuthError } from '@/features/auth/auth-errors';
import { useCurrentUser, useSignOut } from '@/features/auth/queries';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';

const itemClass =
  'text-fg-muted hover:bg-surface-raised hover:text-fg flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors';

const links: { label: string; to: string; icon: LucideIcon }[] = [
  { label: 'Profile', to: paths.profile, icon: UserRound },
  { label: 'Library', to: paths.library, icon: Library },
  { label: 'Friends', to: paths.friends, icon: Users },
];

/** Avatar button in the top bar with a small dropdown menu. Guests get a sign-in button. */
export function ProfileMenu() {
  const { data: user, isPending } = useCurrentUser();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (isPending) {
    return <Skeleton className="size-10 rounded-full" />;
  }

  if (!user) {
    return (
      <Link to={paths.signIn} className={buttonStyles({ size: 'sm' })}>
        Sign in
      </Link>
    );
  }

  function handleSignOut() {
    setOpen(false);
    signOut.mutate(undefined, {
      onSuccess: () => {
        toast({ title: 'Signed out', variant: 'success' });
        void navigate(paths.store);
      },
      onError: (error) => {
        toast({
          title: 'Signing out did not work',
          description: describeAuthError(error),
          variant: 'error',
        });
      },
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${user.username}`}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 items-center gap-2 rounded-full pr-2 pl-1 transition-colors hover:bg-surface-raised"
      >
        <Avatar username={user.username} src={user.avatarUrl} size="sm" />
        <span className="hidden text-sm font-medium text-fg sm:inline">{user.username}</span>
        <ChevronDown
          className={cn('size-4 text-fg-subtle transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 z-40 mt-2 w-52 origin-top-right animate-pop-in rounded-xl border border-line-strong bg-surface-overlay p-1.5 shadow-overlay"
        >
          {links.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              role="menuitem"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
          <div className="my-1.5 h-px bg-line" role="separator" />
          <button type="button" role="menuitem" className={itemClass} onClick={handleSignOut}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
