import type { ReactNode } from 'react';

interface GameGridProps {
  children: ReactNode;
  /** Set while placeholders are shown, so screen readers know to wait. */
  busy?: boolean;
}

export function GameGrid({ children, busy = false }: GameGridProps) {
  return (
    <div
      aria-busy={busy || undefined}
      className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
    >
      {children}
    </div>
  );
}
