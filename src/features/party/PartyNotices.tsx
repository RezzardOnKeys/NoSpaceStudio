import { Check, Gamepad2, PartyPopper, X } from 'lucide-react';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { buttonStyles } from '@/components/ui/button-styles';
import { useAuth } from '@/features/auth/auth-context';
import { useGames } from '@/features/games/queries';

import { useInvitesPutAside } from './invite-alerts';
import { partyPlayPath } from './party-session';
import { useAcceptPartyInvite, useDeclinePartyInvite, useParty, usePartyInvites } from './queries';

const boxClass =
  'flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3';

/**
 * Shown above the content of the regular pages: party invitations the
 * player put aside with "Later" on the floating card (PartyAlerts shows
 * new ones on every screen), and a way back into the party's game for
 * members who are not in it (e.g. after a reload).
 */
export function PartyNotices() {
  const { userId } = useAuth();
  const { data: allInvites } = usePartyInvites();
  const putAside = useInvitesPutAside();
  const invites = allInvites?.filter((invite) => putAside.has(invite.id));
  const { data: party } = useParty();
  const { data: games } = useGames();
  const accept = useAcceptPartyInvite();
  const decline = useDeclinePartyInvite();

  const runningGame =
    party?.gameSlug && party.sessionId && party.hostId !== userId
      ? games?.find((game) => game.slug === party.gameSlug)
      : undefined;
  const host = party?.members.find((member) => member.profile.id === party.hostId);

  if (!invites?.length && !runningGame) return null;

  return (
    <div className="mb-6 flex flex-col gap-3" aria-live="polite">
      {invites?.map((invite) => (
        <div key={invite.id} className={boxClass}>
          <PartyPopper className="size-5 shrink-0 text-accent-bright" aria-hidden="true" />
          <Avatar username={invite.from.username} src={invite.from.avatarUrl} size="sm" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">{invite.from.username}</span> invited you to their
            party.
          </p>
          <div className="flex gap-2">
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
      ))}

      {runningGame && party?.sessionId && (
        <div className={boxClass}>
          <Gamepad2 className="size-5 shrink-0 text-accent-bright" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm">
            Your party is playing <span className="font-semibold">{runningGame.title}</span>
            {host && ` with ${host.profile.username}`}.
          </p>
          <Link
            to={partyPlayPath(runningGame.slug, party.sessionId)}
            className={buttonStyles({ size: 'sm' })}
          >
            Join game
          </Link>
        </div>
      )}
    </div>
  );
}
