import { Outlet } from 'react-router';

import { PartyAlerts } from '@/features/party/PartyAlerts';
import { PartyWatcher } from '@/features/party/PartyWatcher';
import { PresenceReporter } from '@/features/presence/PresenceReporter';

/**
 * Wraps every page, with or without the app shell. Things that must keep
 * running on all pages, like following the party into a game, reporting
 * the online status or showing party invitations, live here.
 */
export function RootLayout() {
  return (
    <>
      <Outlet />
      <PartyWatcher />
      <PartyAlerts />
      <PresenceReporter />
    </>
  );
}
