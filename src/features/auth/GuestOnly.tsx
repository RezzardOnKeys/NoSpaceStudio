import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from './auth-context';
import { AuthGate } from './AuthGate';
import { readRedirectTarget } from './redirect-target';

/**
 * Route wrapper for sign-in and sign-up. Whoever is signed in (or just
 * signed in) moves on to the page they came from.
 */
export function GuestOnly() {
  const { userId, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthGate />;
  if (userId) return <Navigate to={readRedirectTarget(location.state)} replace />;

  return <Outlet />;
}
