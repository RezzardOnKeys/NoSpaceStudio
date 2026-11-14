import { Outlet } from 'react-router';

import { PartyWatcher } from '@/features/party/PartyWatcher';

/**
 * Wraps every page, with or without the app shell. Things that must keep
 * running on all pages, like following the party into a game, live here.
 */
export function RootLayout() {
  return (
    <>
      <Outlet />
      <PartyWatcher />
    </>
  );
}
