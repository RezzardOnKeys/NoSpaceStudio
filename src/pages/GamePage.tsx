import { Ghost, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/button-styles';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Markdown } from '@/components/ui/Markdown';
import { Skeleton } from '@/components/ui/Skeleton';
import { EngineBadge } from '@/features/games/EngineBadge';
import { FriendsPlaytime } from '@/features/games/FriendsPlaytime';
import { useGame } from '@/features/games/queries';
import { ScreenshotGallery } from '@/features/games/ScreenshotGallery';
import { useMyPlaytime } from '@/features/library/queries';
import { PatchNotes } from '@/features/news/PatchNotes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDate, formatPlaytime, formatRelative } from '@/lib/format';
import { paths } from '@/routes/paths';

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

interface FactProps {
  label: string;
  children: ReactNode;
}

function Fact({ label, children }: FactProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="text-sm text-fg-subtle">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

function GamePageSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading game">
      <Skeleton className="min-h-[22rem] w-full rounded-2xl sm:min-h-[28rem]" />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function GamePage() {
  const { slug } = useParams();
  const { data: game, isPending, isError, refetch } = useGame(slug);
  const { data: playtime } = useMyPlaytime();
  useDocumentTitle(game?.title ?? 'Game');

  if (isPending) return <GamePageSkeleton />;

  if (isError) {
    return <ErrorState title="We could not load this game" onRetry={() => void refetch()} />;
  }

  if (!game) {
    return (
      <EmptyState
        icon={<Ghost />}
        title="This game does not exist"
        description="It may have been removed or the link is wrong. The store has plenty of others."
        action={
          <Link to={paths.store} className={buttonStyles()}>
            Browse the store
          </Link>
        }
      />
    );
  }

  const myEntry = playtime?.find((entry) => entry.gameId === game.id);

  return (
    <article className="flex flex-col gap-10">
      <header className="relative isolate flex min-h-[22rem] items-end overflow-hidden rounded-2xl border border-line shadow-card sm:min-h-[28rem]">
        <img
          src={game.bannerUrl}
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-canvas via-canvas/55 to-transparent" />

        <div className="flex w-full flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
          <div className="flex max-w-2xl flex-col items-start gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <EngineBadge engine={game.engine} variant="overlay" />
              {game.genres.map((genre) => (
                <Badge key={genre} className="bg-black/65 text-white backdrop-blur-sm">
                  {genre}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl font-bold sm:text-5xl">{game.title}</h1>
            <p className="text-fg-muted sm:text-lg">{game.shortDescription}</p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Link
              to={paths.play(game.slug)}
              className={buttonStyles({ size: 'lg', className: 'h-14 px-10 text-lg' })}
            >
              <Play className="size-5 fill-current" aria-hidden="true" />
              Play
            </Link>
            <p className="text-center text-sm text-fg-muted sm:text-right">
              {myEntry
                ? `You played ${formatPlaytime(myEntry.totalSeconds)}`
                : 'Free. Runs in your browser.'}
            </p>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-10">
          <Section title="About this game">
            <Markdown>{game.description}</Markdown>
          </Section>

          {game.screenshots.length > 0 && (
            <Section title="Screenshots">
              <ScreenshotGallery gameTitle={game.title} screenshots={game.screenshots} />
            </Section>
          )}

          <Section title="Patch notes">
            <PatchNotes gameId={game.id} />
          </Section>
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <dl>
              <Fact label="Engine">{game.engine}</Fact>
              <Fact label="Version">{game.version}</Fact>
              <Fact label="Released">
                <time dateTime={game.publishedAt}>{formatDate(game.publishedAt)}</time>
              </Fact>
              <Fact label="Your playtime">
                {myEntry ? formatPlaytime(myEntry.totalSeconds) : 'Not played yet'}
              </Fact>
              {myEntry && <Fact label="Last played">{formatRelative(myEntry.lastPlayedAt)}</Fact>}
            </dl>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="font-semibold">Friends who play</h2>
            <FriendsPlaytime gameId={game.id} />
          </Card>
        </aside>
      </div>
    </article>
  );
}
