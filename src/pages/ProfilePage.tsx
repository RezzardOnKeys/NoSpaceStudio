import { useParams } from 'react-router';

import { ErrorState } from '@/components/ui/ErrorState';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { useCurrentUser } from '@/features/auth/queries';
import { ProfileView } from '@/features/profile/ProfileView';

/** Shows /u/:username, or the signed-in user's own profile on /profile. */
export function ProfilePage() {
  const { username } = useParams();
  const currentUser = useCurrentUser();

  if (currentUser.isError) {
    return (
      <ErrorState
        title="We could not load your account"
        onRetry={() => void currentUser.refetch()}
      />
    );
  }

  // Guests never get here (RequireAuth), so no data means it is still loading.
  if (!currentUser.data) return <ListSkeleton rows={3} />;

  const shownUsername = (username ?? currentUser.data.username).toLowerCase();

  return (
    <ProfileView
      key={shownUsername}
      username={shownUsername}
      isOwn={shownUsername === currentUser.data.username}
    />
  );
}
