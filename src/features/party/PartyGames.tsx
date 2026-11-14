import { Play } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useGames } from '@/features/games/queries';
import type { Party } from '@/types/models';

import { useOpenPartyGame } from './useOpenPartyGame';

interface PartyGamesProps {
  party: Party;
  isHost: boolean;
}

/** Multiplayer games the host can start for everybody in the party. */
export function PartyGames({ party, isHost }: PartyGamesProps) {
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

  if (size < 2) {
    return (
      <p className="text-sm text-fg-muted">Invite at least one friend to start a game together.</p>
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
            <img
              src={game.coverUrl}
              alt=""
              className="h-16 w-12 shrink-0 rounded-md object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{game.title}</span>
              <span className="text-sm text-fg-subtle">
                {tooMany
                  ? `Up to ${game.maxPlayers} players, your party has ${size}`
                  : `Up to ${game.maxPlayers} players`}
              </span>
            </div>
            <Button
              size="sm"
              disabled={tooMany}
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
