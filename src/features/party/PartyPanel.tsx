import { Crown, LogOut, Play, UserPlus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonStyles } from '@/components/ui/button-styles';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/auth-context';
import { useGames } from '@/features/games/queries';
import type { Party } from '@/types/models';

import { InviteFriendsModal } from './InviteFriendsModal';
import { partyPlayPath } from './party-session';
import { useCancelPartyInvite, useCreateParty, useLeaveParty, useParty } from './queries';
import { useOpenPartyGame } from './useOpenPartyGame';

/** Max size of a party; the same limit is enforced in the database. */
const MAX_MEMBERS = 8;

interface PartyGamesProps {
  party: Party;
  isHost: boolean;
}

/** Multiplayer games the host can start for everyone. */
function PartyGames({ party, isHost }: PartyGamesProps) {
  const { data: games } = useGames();
  const { open, pendingSlug } = useOpenPartyGame();
  const multiplayer = games?.filter((game) => game.maxPlayers > 1) ?? [];
  const size = party.members.length;

  if (!isHost) {
    return (
      <p className="text-sm text-fg-muted">
        The host picks the game. When they start one, it opens for you automatically.
      </p>
    );
  }

  if (multiplayer.length === 0) {
    return <p className="text-sm text-fg-muted">There are no multiplayer games yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {multiplayer.map((game) => {
        const tooMany = size > game.maxPlayers;
        return (
          <li key={game.id} className="flex items-center gap-3">
            <img src={game.coverUrl} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{game.title}</span>
              <span className="text-xs text-fg-subtle">
                {tooMany
                  ? `Up to ${game.maxPlayers} players, your party has ${size}`
                  : `Up to ${game.maxPlayers} players`}
              </span>
            </div>
            <Button
              size="sm"
              disabled={tooMany || size < 2}
              icon={<Play className="size-4" aria-hidden="true" />}
              loading={pendingSlug === game.slug}
              onClick={() => open(game.slug)}
            >
              Start
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The party box at the top of the library: who is in the party, inviting
 * friends, starting a game together, leaving.
 */
export function PartyPanel() {
  const { userId } = useAuth();
  const { data: party, isPending, isError } = useParty();
  const { data: games } = useGames();
  const createParty = useCreateParty();
  const leaveParty = useLeaveParty();
  const cancelInvite = useCancelPartyInvite();
  const [inviteOpen, setInviteOpen] = useState(false);

  if (isPending) return <Skeleton className="h-40 rounded-xl" />;

  if (isError) {
    return (
      <Card className="text-sm text-fg-muted">
        Your party could not be loaded. Reload the page to try again.
      </Card>
    );
  }

  if (!party) {
    return (
      <Card className="flex flex-wrap items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-bright">
          <Users className="size-6" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="font-semibold">Play together</h2>
          <p className="text-sm text-fg-muted">
            Start a party and invite friends. When the host starts a multiplayer game, everybody
            joins it automatically.
          </p>
        </div>
        <Button
          icon={<Users className="size-4" aria-hidden="true" />}
          loading={createParty.isPending}
          onClick={() => createParty.mutate()}
        >
          Start a party
        </Button>
      </Card>
    );
  }

  const isHost = party.hostId === userId;
  const runningGame = party.gameSlug
    ? games?.find((game) => game.slug === party.gameSlug)
    : undefined;

  return (
    <Card className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-semibold">
          Your party
          <Badge>
            {party.members.length} / {MAX_MEMBERS}
          </Badge>
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            icon={<UserPlus className="size-4" aria-hidden="true" />}
            disabled={party.members.length >= MAX_MEMBERS}
            onClick={() => setInviteOpen(true)}
          >
            Invite friends
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<LogOut className="size-4" aria-hidden="true" />}
            loading={leaveParty.isPending}
            onClick={() => leaveParty.mutate()}
          >
            Leave
          </Button>
        </div>
      </header>

      <ul className="flex flex-wrap gap-3">
        {party.members.map(({ profile }) => (
          <li
            key={profile.id}
            className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1 pr-4 pl-1"
          >
            <Avatar username={profile.username} src={profile.avatarUrl} size="sm" />
            <span className="text-sm font-medium">
              {profile.id === userId ? 'You' : profile.username}
            </span>
            {profile.id === party.hostId && (
              <Crown className="size-4 text-warning" aria-label="Host" />
            )}
          </li>
        ))}
        {party.invited.map(({ inviteId, profile }) => (
          <li
            key={inviteId}
            className="flex items-center gap-2 rounded-full border border-dashed border-line-strong py-1 pr-1 pl-1"
          >
            <Avatar
              username={profile.username}
              src={profile.avatarUrl}
              size="sm"
              className="opacity-60"
            />
            <span className="text-sm text-fg-muted">{profile.username} · invited</span>
            <IconButton
              label={`Take back the invitation for ${profile.username}`}
              onClick={() => cancelInvite.mutate(inviteId)}
              className="size-7"
            >
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>

      {runningGame && party.sessionId && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface px-3 py-2.5">
          <p className="min-w-0 flex-1 text-sm">
            Playing now: <span className="font-semibold">{runningGame.title}</span>
          </p>
          <Link
            to={partyPlayPath(runningGame.slug, party.sessionId)}
            className={buttonStyles({ size: 'sm' })}
          >
            {isHost ? 'Back to game' : 'Join game'}
          </Link>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-fg-muted">Play together</h3>
        {party.members.length < 2 && isHost ? (
          <p className="text-sm text-fg-muted">
            Invite at least one friend to start a game together.
          </p>
        ) : (
          <PartyGames party={party} isHost={isHost} />
        )}
      </section>

      <InviteFriendsModal open={inviteOpen} onClose={() => setInviteOpen(false)} party={party} />
    </Card>
  );
}
