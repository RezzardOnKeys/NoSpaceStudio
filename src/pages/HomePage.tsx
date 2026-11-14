import { Blocks, Gamepad2 } from 'lucide-react';
import { Link } from 'react-router';

import { Logo } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/button-styles';
import { brand } from '@/config/brand';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from '@/routes/paths';

/**
 * Temporary landing page for the foundation phase. It gets replaced by the
 * real store once the app shell exists.
 */
export function HomePage() {
  useDocumentTitle('Home');

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Soft accent glow behind the content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[140px]"
      />
      <div className="relative flex max-w-2xl animate-fade-in flex-col items-center gap-8 text-center">
        <Logo />
        <Badge variant="accent">
          <Gamepad2 aria-hidden="true" />
          Prototype in progress
        </Badge>
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold sm:text-6xl">{brand.slogan}</h1>
          <p className="text-lg text-fg-muted">
            {brand.name} is a game launcher that lives entirely in your browser. Create an account,
            browse the library and play instantly. Everything is free.
          </p>
        </div>
        <Link to={paths.uiKit} className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
          <Blocks className="size-5" aria-hidden="true" />
          View UI components
        </Link>
      </div>
    </main>
  );
}
