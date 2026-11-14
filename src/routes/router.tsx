import { createBrowserRouter } from 'react-router';

import { AppShell } from '@/components/layout/AppShell';
import { RootLayout } from '@/components/layout/RootLayout';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { GuestOnly } from '@/features/auth/GuestOnly';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { GamePage } from '@/pages/GamePage';
import { LegalPage } from '@/pages/LegalPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { NewsPage } from '@/pages/NewsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlayerPage } from '@/pages/PlayerPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { StorePage } from '@/pages/StorePage';
import { UiKitPage } from '@/pages/UiKitPage';

import { paths } from './paths';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        // Regular pages share the shell (sidebar, top bar, footer).
        element: <AppShell />,
        children: [
          // Guests can browse the store, read the news and play.
          { path: paths.store, element: <StorePage /> },
          { path: paths.game(':slug'), element: <GamePage /> },
          { path: paths.news, element: <NewsPage /> },
          { path: paths.imprint, element: <LegalPage kind="imprint" /> },
          { path: paths.privacy, element: <LegalPage kind="privacy" /> },
          {
            // Everything personal needs an account.
            element: <RequireAuth />,
            children: [
              { path: paths.library, element: <LibraryPage /> },
              { path: paths.friends, element: <FriendsPage /> },
              { path: paths.profile, element: <ProfilePage /> },
              { path: paths.user(':username'), element: <ProfilePage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        // Account pages have their own slim frame.
        element: <AuthLayout />,
        children: [
          {
            element: <GuestOnly />,
            children: [
              { path: paths.signIn, element: <SignInPage /> },
              { path: paths.signUp, element: <SignUpPage /> },
              { path: paths.forgotPassword, element: <ForgotPasswordPage /> },
            ],
          },
          // Not guest-only: the link in the reset email signs the user in.
          { path: paths.resetPassword, element: <ResetPasswordPage /> },
        ],
      },
      // The player is distraction-free: no shell around it.
      { path: paths.play(':slug'), element: <PlayerPage /> },
      { path: paths.uiKit, element: <UiKitPage /> },
    ],
  },
]);
