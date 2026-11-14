import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-context';
import { queryKeys } from '@/lib/query-keys';

import { uploadAvatar } from './api';

/** Uploads the signed-in user's profile picture (only possible once). */
export function useUploadAvatar() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (image: Blob) => {
      if (!userId) throw new Error('not_signed_in');
      return uploadAvatar(userId, image);
    },
    // The picture shows up in the sidebar, the menu and on the profile page.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.currentUser(userId) }),
        queryClient.invalidateQueries({ queryKey: ['playtime', 'user'] }),
      ]),
  });
}
