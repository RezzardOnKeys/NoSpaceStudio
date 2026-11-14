import { Navigate, Outlet, useLocation } from 'react-router';

import { paths } from '@/routes/paths';

import { useAuth } from './auth-context';
import { AuthGate } from './AuthGate';
import type { RedirectState } from './redirect-target';

/** Route wrapper: pages below it need an account. Guests go to the sign-in page. */
export function RequireAuth() {
  const { userId, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthGate />;

  if (!userId) {
    const state: RedirectState = { from: `${location.pathname}${location.search}` };
    return <Navigate to={paths.signIn} state={state} replace />;
  }

  return <Outlet />;
}
