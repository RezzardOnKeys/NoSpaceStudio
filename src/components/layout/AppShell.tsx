import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';

import { PartyNotices } from '@/features/party/PartyNotices';

import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { PageFallback } from './PageFallback';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/** Frame around every regular page: sidebar, top bar, content, footer. */
export function AppShell() {
  return (
    <div className="lg:pl-60">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-accent-strong px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar />
      {/* Bottom padding keeps content clear of the mobile tab bar. */}
      <div className="flex min-h-dvh flex-col pb-14 lg:pb-0">
        <TopBar />
        <main
          id="main"
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <PartyNotices />
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
      </div>
      <MobileNav />
      <ScrollRestoration />
    </div>
  );
}
