import { Suspense } from 'react';
import { Link, Outlet } from 'react-router';

import { Logo } from '@/components/brand/Logo';
import { PageFallback } from '@/components/layout/PageFallback';
import { Notice } from '@/components/ui/Notice';
import { brand } from '@/config/brand';
import { env } from '@/config/env';
import { paths } from '@/routes/paths';

const linkClass = 'hover:text-fg rounded transition-colors';

/** Frame around the account pages: logo on top, one centred card, legal links. */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-8 px-4 py-8 sm:py-12">
      <Link to={paths.store} className="rounded-lg" aria-label={`${brand.name} home`}>
        <Logo />
      </Link>

      <main className="flex w-full max-w-md flex-1 flex-col justify-center gap-4">
        {!env.isSupabaseConfigured && (
          <Notice variant="warning" title="Accounts are not connected yet">
            Add the Supabase values to the .env file and restart the dev server. The guide is in
            docs/SUPABASE-SETUP.md.
          </Notice>
        )}
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-subtle">
        <Link to={paths.store} className={linkClass}>
          Store
        </Link>
        <Link to={paths.imprint} className={linkClass}>
          Imprint
        </Link>
        <Link to={paths.privacy} className={linkClass}>
          Privacy
        </Link>
      </nav>
    </div>
  );
}
