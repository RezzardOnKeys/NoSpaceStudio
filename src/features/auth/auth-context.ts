import { createContext, useContext } from 'react';

export interface AuthContextValue {
  /** Id of the signed-in user, or null for guests. */
  userId: string | null;
  email: string | null;
  /** True until the stored session has been restored on page load. */
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** The raw sign-in state. For the profile (username, avatar) use useCurrentUser(). */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}
