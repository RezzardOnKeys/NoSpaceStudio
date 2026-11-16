import { Check, Clock, Crown, PartyPopper, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/cn';

import { putInviteAside, useInvitesPutAside } from './invite-alerts';
import { useAcceptPartyInvite, useDeclinePartyInvite, useParty, usePartyInvites } from './queries';

/** How long the crown notice stays (milliseconds). */
const CROWN_MS = 7000;

/**
 * Floating party notices in the top right corner, on every screen of the
 * launcher, also while a game is open (mounted once in RootLayout):
 *   - a new party invitation, with "Join party", "Decline" and "Later",
 *   - a crown when the player has just become the party's host.
 */
export function PartyAlerts() {
  const { userId } = useAuth();
  const { data: invites } = usePartyInvites();
  const { data: party } = useParty();
  const putAside = useInvitesPutAside();
  const accept = useAcceptPartyInvite();
  const decline = useDeclinePartyInvite();
  const [crown, setCrown] = useState(false);

  // The host the launcher saw last, per party. The crown shows when the
  // host of the same party changes to this player (handed over, or the old
  // host left or went offline). Joining a party or starting one does not
  // count: then there was no other host before.
  const lastHost = useRef<{ partyId: string; hostId: string } | null>(null);
  const partyId = party?.id ?? null;
  const hostId = party?.hostId ?? null;
  useEffect(() => {
    if (party === undefined) return; // still loading
    const before = lastHost.current;
    lastHost.current = partyId && hostId ? { partyId, hostId } : null;
    if (before && partyId === before.partyId && hostId === userId && before.hostId !== userId) {
      setCrown(true);
    }
  }, [party, partyId, hostId, userId]);

  useEffect(() => {
    if (!crown) return;
    const timer = window.setTimeout(() => setCrown(false), CROWN_MS);
    return () => window.clearTimeout(timer);
  }, [crown]);
  // No longer host (or left the party) while the crown is showing: hide it.
  const showCrown = crown && hostId !== null && hostId === userId;

  const floating = (invites ?? []).filter((invite) => !putAside.has(invite.id));
  if (!userId) return null;

  return (
    <ol
      aria-label="Party notifications"
      // Under the top bar (z-20), so the profile menu opens above these cards.
      className="pointer-events-none fixed top-[4.5rem] right-0 z-[15] flex w-full max-w-sm flex-col gap-2 px-3 sm:px-4"
    >
      <AnimatePresence initial={false}>
        {showCrown && (
          <AlertCard key="crown" tone="crown" onDismiss={() => setCrown(false)}>
            <CrownBadge />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">You are now the party host</p>
              <p className="text-sm text-fg-muted">You choose and start the next game.</p>
            </div>
          </AlertCard>
        )}
        {floating.map((invite) => (
          <AlertCard key={invite.id} tone="invite" onDismiss={() => putInviteAside(invite.id)}>
            <div className="relative shrink-0">
              <Avatar username={invite.from.username} src={invite.from.avatarUrl} size="md" />
              <PartyPopper
                className="absolute -right-1.5 -bottom-1 size-4 text-accent-bright"
                aria-hidden="true"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <p className="text-sm">
                <span className="font-semibold">{invite.from.username}</span> invited you to their
                party.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  icon={<Check className="size-4" aria-hidden="true" />}
                  loading={accept.isPending && accept.variables === invite.id}
                  onClick={() => accept.mutate(invite.id)}
                >
                  Join party
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<X className="size-4" aria-hidden="true" />}
                  loading={decline.isPending && decline.variables === invite.id}
                  onClick={() => decline.mutate(invite.id)}
                >
                  Decline
                </Button>
              </div>
            </div>
          </AlertCard>
        ))}
      </AnimatePresence>
    </ol>
  );
}

interface AlertCardProps {
  tone: 'crown' | 'invite';
  /** The small button in the corner: closes the crown, puts an invitation aside. */
  onDismiss: () => void;
  children: ReactNode;
}

function AlertCard({ tone, onDismiss, children }: AlertCardProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.li
      layout={!reduceMotion}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-surface-overlay p-4 shadow-overlay',
        tone === 'crown' ? 'border-warning/50' : 'border-accent/50',
      )}
    >
      {children}
      {tone === 'crown' ? (
        <IconButton label="Close" onClick={onDismiss} className="-mt-1.5 -mr-1.5 size-8">
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      ) : (
        <IconButton label="Answer later" onClick={onDismiss} className="-mt-1.5 -mr-1.5 size-8">
          <Clock className="size-4" aria-hidden="true" />
        </IconButton>
      )}
    </motion.li>
  );
}

/** A golden crown in a soft circle that hops in once (not with reduced motion). */
function CrownBadge() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning"
      initial={reduceMotion ? false : { rotate: -25, scale: 0.4 }}
      animate={{ rotate: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 14 }}
      aria-hidden="true"
    >
      <Crown className="size-5" />
    </motion.span>
  );
}
