import { cn } from '@/lib/cn';
import type { Game, NewsPost } from '@/types/models';

import { NewsCard } from './NewsCard';

interface NewsTimelineProps {
  /** Newest first. */
  posts: NewsPost[];
  games: Game[] | undefined;
}

/**
 * News as a timeline from top to bottom: a line on the left with one dot
 * per post. The newest post's dot glows.
 */
export function NewsTimeline({ posts, games }: NewsTimelineProps) {
  return (
    <ol className="flex flex-col gap-6 border-l border-line pl-6 sm:pl-8">
      {posts.map((post, index) => (
        <li key={post.id} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-7 -left-[calc(1.5rem+0.3125rem)] size-2.5 rounded-full ring-4 ring-canvas sm:-left-[calc(2rem+0.3125rem)]',
              index === 0 ? 'bg-accent-bright shadow-glow' : 'bg-accent',
            )}
          />
          <NewsCard post={post} game={games?.find((game) => game.id === post.gameId)} />
        </li>
      ))}
    </ol>
  );
}
