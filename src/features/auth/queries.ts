import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchProfileById, isUsernameTaken } from '@/features/profile/api';
import { queryKeys } from '@/lib/query-keys';

import { requestPasswordReset, signIn, signOut, signUp, updatePassword } from './api';
import { useAuth } from './auth-context';
import { validateUsername } from './username';

/**
 * The signed-in user's profile. `data` is null for guests and undefined
 * while the session or the profile is still loading.
 */
export function useCurrentUser() {
  const { userId, isLoading } = useAuth();

  return useQuery({
    queryKey: queryKeys.currentUser(userId),
    queryFn: () => (userId ? fetchProfileById(userId) : null),
    enabled: !isLoading,
  });
}

/** Whether a (normalized) username is already in use. Only asks for valid names. */
export function useUsernameTaken(username: string) {
  return useQuery({
    queryKey: queryKeys.usernameTaken(username),
    queryFn: () => isUsernameTaken(username),
    enabled: validateUsername(username) === null,
    staleTime: 0,
    retry: false,
  });
}

export function useSignIn() {
  return useMutation({ mutationFn: signIn });
}

export function useSignUp() {
  return useMutation({ mutationFn: signUp });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: updatePassword });
}
