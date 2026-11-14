import { Play, User, Users } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonStyles } from '@/components/ui/button-styles';
import { useAuth } from '@/features/auth/auth-context';
import { paths } from '@/routes/paths';
import type { Game } from '@/types/models';

import { useParty } from './queries';
import { useOpenPartyGame } from './useOpenPartyGame';

const bigButton = 'h-14 px-10 text-lg';

interface GamePlayActionsProps {
  game: Game;
  /** Shown under the buttons when there is no party hint. */
  note: string;
}

/**
 * The play buttons on a game page. Outside a party: "Play". In a party:
 * the host can start multiplayer games for everybody, and single player
 * games say that the party does not come along.
 */
export function GamePlayActions({ game, note }: GamePlayActionsProps) {
  const { userId } = useAuth();
  const { data: party } = useParty();
  const { open, pendingSlug } = useOpenPartyGame();

  const inParty = party && party.members.length > 1;
  const isHost = party?.hostId === userId;
  const fitsParty = inParty && party.members.length <= game.maxPlayers;

  let hint = note;
  if (inParty && game.maxPlayers === 1) {
    hint = 'Single player only. Your party will not join you.';
  } else if (inParty && !fitsParty) {
    hint = `Up to ${game.maxPlayers} players. Your party has ${party.members.length}.`;
  } else if (inParty && !isHost) {
    hint = 'Only the party host can start it for everybody.';
  }

  const partyButton = inParty && isHost && fitsParty;

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {partyButton ? (
        <>
          <Button
            size="lg"
            className={bigButton}
            icon={<Users className="size-5" aria-hidden="true" />}
            loading={pendingSlug === game.slug}
            onClick={() => open(game.slug)}
          >
            Play with party
          </Button>
          <Link to={paths.play(game.slug)} className={buttonStyles({ variant: 'secondary' })}>
            <User className="size-4" aria-hidden="true" />
            Play alone
          </Link>
        </>
      ) : (
        <Link
          to={paths.play(game.slug)}
          className={buttonStyles({ size: 'lg', className: bigButton })}
        >
          <Play className="size-5 fill-current" aria-hidden="true" />
          Play
        </Link>
      )}
      <p className="text-center text-sm text-fg-muted sm:text-right">{hint}</p>
    </div>
  );
}
