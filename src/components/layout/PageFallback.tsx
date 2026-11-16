import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Shown in the content area while the code of a page is still downloading.
 * Pages are loaded on demand (see routes/lazy-page.ts), so this appears only
 * the first time a page is opened, usually for a split second.
 */
export function PageFallback() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" role="status">
      <span className="sr-only">Loading page</span>
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
