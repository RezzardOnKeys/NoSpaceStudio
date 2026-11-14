import { Skeleton } from './Skeleton';

interface ListSkeletonProps {
  rows?: number;
  /** Shape of the leading placeholder: a cover image or a round avatar. */
  leading?: 'cover' | 'avatar';
}

/** Placeholder for a list of rows while it loads. */
export function ListSkeleton({ rows = 3, leading = 'avatar' }: ListSkeletonProps) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 p-2.5">
          {leading === 'cover' ? (
            <Skeleton className="h-20 w-15 rounded-lg" />
          ) : (
            <Skeleton className="size-10 rounded-full" />
          )}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
