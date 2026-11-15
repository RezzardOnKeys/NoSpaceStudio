import { Play, Users } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonStyles } from '@/components/ui/button-styles';
import { useAuth } from '@/features/auth/auth-context';
import { paths } from '@/routes/paths';
import type { Game, Party } from '@/types/models';

import { useParty } from './queries';
import { useOpenPartyGame } from './useOpenPartyGame';

const bigButton = 'h-14 px-10 text-lg';

interface GamePlayActionsProps {
  game: Game;
  /** Shown under the button when nothing blocks playing. */
  note: string;
}

/**
 * Why a party cannot start this game, or null if the host can start it for
 * everybody. In a party nobody plays alone: games are played together.
 */
function partyBlocker(game: Game, party: Party, isHost: boolean): string | null {
  if (!isHost) return 'Only the party host can start games.';
  if (game.maxPlayers === 1) return 'Single player only. Leave the party to play it.';
  if (party.members.length > game.maxPlayers) {
    return `Up to ${game.maxPlayers} players. Your party has ${party.members.length}.`;
  }
  return null;
}

/**
 * The play button on a game page. Outside a party: "Play". In a party only
 * the host can start a game, and only one that fits the whole party; in
 * every other case the button is greyed out with the reason below it.
 */
export function GamePlayActions({ game, note }: GamePlayActionsProps) {
  const { userId } = useAuth();
  const { data: party } = useParty();
  const { open, pendingSlug } = useOpenPartyGame();

  // A party with only yourself left counts as no party.
  const inParty = party && party.members.length > 1;
  const blocker = inParty ? partyBlocker(game, party, party.hostId === userId) : null;

  let button;
  if (!inParty) {
    button = (
      <Link
        to={paths.play(game.slug)}
        className={buttonStyles({ size: 'lg', className: bigButton })}
      >
        <Play className="size-5 fill-current" aria-hidden="true" />
        Play
      </Link>
    );
  } else if (blocker) {
    button = (
      <Button
        size="lg"
        variant="secondary"
        className={bigButton}
        icon={<Play className="size-5 fill-current" aria-hidden="true" />}
        disabled
        aria-describedby="play-hint"
      >
        Play
      </Button>
    );
  } else {
    button = (
      <Button
        size="lg"
        className={bigButton}
        icon={<Users className="size-5" aria-hidden="true" />}
        loading={pendingSlug === game.slug}
        onClick={() => open(game.slug)}
      >
        Play with party
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {button}
      <p id="play-hint" className="text-center text-sm text-fg-muted sm:text-right">
        {blocker ?? note}
      </p>
    </div>
  );
}
