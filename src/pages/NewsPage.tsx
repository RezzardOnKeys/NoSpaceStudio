import { Newspaper } from 'lucide-react';
import { useState } from 'react';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useGames } from '@/features/games/queries';
import { NEWS_TYPE_LABELS } from '@/features/news/news-types';
import { NewsCard } from '@/features/news/NewsCard';
import { useNews } from '@/features/news/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { NewsType } from '@/types/models';

const FILTERS: { value: NewsType | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'game_update', label: `${NEWS_TYPE_LABELS.game_update}s` },
  { value: 'launcher_update', label: `${NEWS_TYPE_LABELS.launcher_update}s` },
  { value: 'announcement', label: `${NEWS_TYPE_LABELS.announcement}s` },
];

export function NewsPage() {
  useDocumentTitle('News');
  const { data: posts, isPending, isError, refetch } = useNews();
  const { data: games } = useGames();
  const [type, setType] = useState<NewsType | null>(null);

  const visiblePosts = posts?.filter((post) => type === null || post.type === type);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="News" description="Game updates, launcher updates and announcements." />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter news by type">
        {FILTERS.map((filter) => (
          <Chip
            key={filter.label}
            selected={type === filter.value}
            onClick={() => setType(filter.value)}
          >
            {filter.label}
          </Chip>
        ))}
      </div>

      {isError ? (
        <ErrorState title="We could not load the news" onRetry={() => void refetch()} />
      ) : isPending || !visiblePosts ? (
        <div className="flex flex-col gap-5" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <Card key={item} className="flex flex-col gap-3 sm:p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </Card>
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <EmptyState
          icon={<Newspaper />}
          title={type === null ? 'No news yet' : 'Nothing of this type yet'}
          description={
            type === null
              ? 'Game updates, launcher updates and announcements will show up here.'
              : 'There are no posts of this type so far. Pick another filter or check back later.'
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {visiblePosts.map((post) => (
            <NewsCard
              key={post.id}
              post={post}
              game={games?.find((game) => game.id === post.gameId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
