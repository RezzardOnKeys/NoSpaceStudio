import { Link } from 'react-router';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Markdown } from '@/components/ui/Markdown';
import { formatDate } from '@/lib/format';
import { paths } from '@/routes/paths';
import type { Game, NewsPost } from '@/types/models';

import { NEWS_TYPE_BADGES, NEWS_TYPE_LABELS } from './news-types';

interface NewsCardProps {
  post: NewsPost;
  /** The game this post is about, if any. */
  game?: Game;
}

export function NewsCard({ post, game }: NewsCardProps) {
  return (
    <Card className="flex flex-col gap-4 sm:p-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={NEWS_TYPE_BADGES[post.type]}>{NEWS_TYPE_LABELS[post.type]}</Badge>
          {post.version && <Badge variant="outline">v{post.version}</Badge>}
          <span className="text-sm text-fg-subtle">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> · by{' '}
            {post.authorName}
          </span>
        </div>
        <h2 className="text-xl font-semibold">{post.title}</h2>
      </header>

      <Markdown>{post.bodyMd}</Markdown>

      {game && (
        <Link
          to={paths.game(game.slug)}
          className="flex items-center gap-3 self-start rounded-lg border border-line p-2 pr-4 transition-colors hover:border-line-strong hover:bg-surface-overlay"
        >
          <img src={game.coverUrl} alt="" className="h-12 w-9 rounded object-cover" />
          <span className="flex flex-col">
            <span className="text-sm font-semibold">{game.title}</span>
            <span className="text-xs text-fg-subtle">View game</span>
          </span>
        </Link>
      )}
    </Card>
  );
}
