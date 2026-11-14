import { Gamepad2 } from 'lucide-react';
import { Link } from 'react-router';

import { buttonStyles } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { ContinueCard } from '@/features/library/ContinueCard';
import { PlayedGameRow } from '@/features/library/PlayedGameRow';
import { usePlayedGames } from '@/features/library/usePlayedGames';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatPlaytime } from '@/lib/format';
import { paths } from '@/routes/paths';

const CONTINUE_COUNT = 3;

export function LibraryPage() {
  useDocumentTitle('Library');
  const { played, isPending, isError, refetch } = usePlayedGames();

  if (isError) {
    return <ErrorState title="We could not load your library" onRetry={refetch} />;
  }

  const totalSeconds = played?.reduce((sum, item) => sum + item.totalSeconds, 0) ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Library"
        description={
          played && played.length > 0
            ? `${played.length} ${played.length === 1 ? 'game' : 'games'} · ${formatPlaytime(totalSeconds)} played in total`
            : 'Every game you have played shows up here.'
        }
      />

      {isPending || !played ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: CONTINUE_COUNT }, (_, index) => (
              <Skeleton key={index} className="aspect-video rounded-xl" />
            ))}
          </div>
          <ListSkeleton rows={4} leading="cover" />
        </>
      ) : played.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 />}
          title="Your library is empty"
          description="Games appear here as soon as you play them. Pick one from the store to get started."
          action={
            <Link to={paths.store} className={buttonStyles()}>
              Browse the store
            </Link>
          }
        />
      ) : (
        <>
          <section aria-labelledby="continue-heading" className="flex flex-col gap-4">
            <h2 id="continue-heading" className="text-xl font-semibold">
              Continue playing
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {played.slice(0, CONTINUE_COUNT).map((item) => (
                <ContinueCard key={item.game.id} played={item} />
              ))}
            </div>
          </section>

          <section aria-labelledby="all-played-heading" className="flex flex-col gap-3">
            <h2 id="all-played-heading" className="text-xl font-semibold">
              All played games
            </h2>
            <ul className="-mx-2.5 flex flex-col gap-1">
              {played.map((item) => (
                <PlayedGameRow key={item.game.id} played={item} />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
