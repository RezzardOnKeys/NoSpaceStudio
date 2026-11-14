import { createBrowserRouter } from 'react-router';

import { AppShell } from '@/components/layout/AppShell';
import { AdminPage } from '@/pages/AdminPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { GamePage } from '@/pages/GamePage';
import { LegalPage } from '@/pages/LegalPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { NewsPage } from '@/pages/NewsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlayerPage } from '@/pages/PlayerPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { StorePage } from '@/pages/StorePage';
import { UiKitPage } from '@/pages/UiKitPage';

import { paths } from './paths';

export const router = createBrowserRouter([
  {
    // Regular pages share the shell (sidebar, top bar, footer).
    element: <AppShell />,
    children: [
      { path: paths.store, element: <StorePage /> },
      { path: paths.game(':slug'), element: <GamePage /> },
      { path: paths.library, element: <LibraryPage /> },
      { path: paths.friends, element: <FriendsPage /> },
      { path: paths.news, element: <NewsPage /> },
      { path: paths.profile, element: <ProfilePage /> },
      { path: paths.user(':username'), element: <ProfilePage /> },
      { path: paths.admin, element: <AdminPage /> },
      { path: paths.imprint, element: <LegalPage kind="imprint" /> },
      { path: paths.privacy, element: <LegalPage kind="privacy" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // The player is distraction-free: no shell around it.
  { path: paths.play(':slug'), element: <PlayerPage /> },
  { path: paths.uiKit, element: <UiKitPage /> },
]);
