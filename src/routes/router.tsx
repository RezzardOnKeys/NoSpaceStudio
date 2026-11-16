import { createBrowserRouter } from 'react-router';

import { AppShell } from '@/components/layout/AppShell';
import { RootLayout } from '@/components/layout/RootLayout';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { GuestOnly } from '@/features/auth/GuestOnly';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { StorePage } from '@/pages/StorePage';

import { lazyPage } from './lazy-page';
import { paths } from './paths';

// The store is the start page and stays in the main file, so the first visit
// shows it without waiting. Every other page is downloaded the first time it
// is opened (see lazy-page.ts).
const ForgotPasswordPage = lazyPage(
  () => import('@/pages/ForgotPasswordPage'),
  'ForgotPasswordPage',
);
const FriendsPage = lazyPage(() => import('@/pages/FriendsPage'), 'FriendsPage');
const GamePage = lazyPage(() => import('@/pages/GamePage'), 'GamePage');
const LegalPage = lazyPage(() => import('@/pages/LegalPage'), 'LegalPage');
const LibraryPage = lazyPage(() => import('@/pages/LibraryPage'), 'LibraryPage');
const NewsPage = lazyPage(() => import('@/pages/NewsPage'), 'NewsPage');
const NotFoundPage = lazyPage(() => import('@/pages/NotFoundPage'), 'NotFoundPage');
const PartyPage = lazyPage(() => import('@/pages/PartyPage'), 'PartyPage');
const PlayerPage = lazyPage(() => import('@/pages/PlayerPage'), 'PlayerPage');
const ProfilePage = lazyPage(() => import('@/pages/ProfilePage'), 'ProfilePage');
const ResetPasswordPage = lazyPage(() => import('@/pages/ResetPasswordPage'), 'ResetPasswordPage');
const SignInPage = lazyPage(() => import('@/pages/SignInPage'), 'SignInPage');
const SignUpPage = lazyPage(() => import('@/pages/SignUpPage'), 'SignUpPage');
const UiKitPage = lazyPage(() => import('@/pages/UiKitPage'), 'UiKitPage');

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
              { path: paths.party, element: <PartyPage /> },
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
