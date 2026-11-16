import { Suspense } from 'react';
import { Outlet } from 'react-router';

import { PartyAlerts } from '@/features/party/PartyAlerts';
import { PartyWatcher } from '@/features/party/PartyWatcher';
import { PresenceReporter } from '@/features/presence/PresenceReporter';

import { PageFallback } from './PageFallback';

/**
 * Wraps every page, with or without the app shell. Things that must keep
 * running on all pages, like following the party into a game, reporting
 * the online status or showing party invitations, live here.
 */
export function RootLayout() {
  return (
    <>
      {/* Pages without a frame of their own (the player) load here. */}
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
      <PartyWatcher />
      <PartyAlerts />
      <PresenceReporter />
    </>
  );
}
