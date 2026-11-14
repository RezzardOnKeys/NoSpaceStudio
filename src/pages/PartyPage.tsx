import { LogOut, PartyPopper, UserPlus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonStyles } from '@/components/ui/button-styles';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/features/auth/auth-context';
import { useGames } from '@/features/games/queries';
import { InviteFriendsModal } from '@/features/party/InviteFriendsModal';
import { partyPlayPath } from '@/features/party/party-session';
import { PartyMembers } from '@/features/party/PartyMembers';
import { useCreateParty, useLeaveParty, useParty } from '@/features/party/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { describeLoadError } from '@/lib/errors';
import type { Party } from '@/types/models';

/** Max size of a party; the same limit is enforced in the database. */
const MAX_MEMBERS = 8;

interface SectionProps {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

function Section({ title, actions, children }: SectionProps) {
  return (
    <Card className="flex flex-col gap-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-semibold">{title}</h2>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </Card>
  );
}

function NoParty() {
  const createParty = useCreateParty();

  return (
    <Card>
      <EmptyState
        icon={<PartyPopper />}
        title="You are not in a party"
        description="Start a party and invite friends. When the host starts a multiplayer game, everybody joins it automatically. Invitations from friends show up at the top of the page."
        action={
          <Button
            icon={<PartyPopper className="size-4" aria-hidden="true" />}
            loading={createParty.isPending}
            onClick={() => createParty.mutate()}
          >
            Start a party
          </Button>
        }
      />
    </Card>
  );
}

interface PartyDetailsProps {
  party: Party;
}

function PartyDetails({ party }: PartyDetailsProps) {
  const { userId } = useAuth();
  const { data: games } = useGames();
  const leaveParty = useLeaveParty();
  const [inviteOpen, setInviteOpen] = useState(false);

  const isHost = party.hostId === userId;
  const runningGame = party.gameSlug
    ? games?.find((game) => game.slug === party.gameSlug)
    : undefined;

  return (
    <>
      <Section
        title={
          <>
            Your party:
            <Badge>
              {party.members.length} / {MAX_MEMBERS}
            </Badge>
          </>
        }
        actions={
          <>
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
              Leave party
            </Button>
          </>
        }
      >
        <PartyMembers party={party} />
      </Section>

      {runningGame && party.sessionId && (
        <Card className="flex flex-wrap items-center gap-4 border-accent/40 bg-accent-soft">
          <img src={runningGame.coverUrl} alt="" className="h-16 w-12 rounded-md object-cover" />
          <p className="min-w-0 flex-1">
            Playing now: <span className="font-semibold">{runningGame.title}</span>
          </p>
          <Link to={partyPlayPath(runningGame.slug, party.sessionId)} className={buttonStyles()}>
            {isHost ? 'Back to game' : 'Join game'}
          </Link>
        </Card>
      )}

      <InviteFriendsModal open={inviteOpen} onClose={() => setInviteOpen(false)} party={party} />
    </>
  );
}

export function PartyPage() {
  useDocumentTitle('Party');
  const { data: party, isPending, isError, error, refetch } = useParty();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Party"
        description="Play multiplayer games together. The host picks the game, everybody joins."
      />
      {isError ? (
        <ErrorState
          title="We could not load your party"
          description={describeLoadError(error)}
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <Card>
          <ListSkeleton rows={3} />
        </Card>
      ) : party ? (
        <PartyDetails party={party} />
      ) : (
        <NoParty />
      )}
    </div>
  );
}
