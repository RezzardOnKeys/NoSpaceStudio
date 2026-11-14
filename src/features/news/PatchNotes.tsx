import { Badge } from '@/components/ui/Badge';
import { Markdown } from '@/components/ui/Markdown';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/format';

import { useNews } from './queries';

interface PatchNotesProps {
  gameId: string;
}

/** Update history of one game, newest first. */
export function PatchNotes({ gameId }: PatchNotesProps) {
  const { data, isPending, isError } = useNews();

  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-fg-muted">
        The patch notes could not be loaded. Reload the page to try again.
      </p>
    );
  }

  const notes = data.filter((post) => post.type === 'game_update' && post.gameId === gameId);

  if (notes.length === 0) {
    return <p className="text-sm text-fg-muted">No patch notes yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-6 border-l border-line pl-5">
      {notes.map((post) => (
        <li key={post.id} className="relative flex flex-col gap-2">
          <span
            aria-hidden="true"
            className="absolute top-1.5 -left-[1.5625rem] size-2.5 rounded-full bg-accent ring-4 ring-canvas"
          />
          <div className="flex flex-wrap items-center gap-2">
            {post.version && <Badge variant="accent">v{post.version}</Badge>}
            <time dateTime={post.publishedAt} className="text-sm text-fg-subtle">
              {formatDate(post.publishedAt)}
            </time>
          </div>
          <h3 className="font-semibold">{post.title}</h3>
          <Markdown className="text-sm">{post.bodyMd}</Markdown>
        </li>
      ))}
    </ol>
  );
}
