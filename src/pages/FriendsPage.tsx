import { Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { AddFriend } from '@/features/friends/AddFriend';
import { FriendList } from '@/features/friends/FriendList';
import { FriendRequests } from '@/features/friends/FriendRequests';
import { useFriendRequests, useFriends } from '@/features/friends/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface SectionProps {
  title: string;
  count?: number;
  children: ReactNode;
}

function Section({ title, count, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2.5 text-xl font-semibold">
        {title}
        {count !== undefined && <Badge>{count}</Badge>}
      </h2>
      {children}
    </section>
  );
}

export function FriendsPage() {
  useDocumentTitle('Friends');
  const friends = useFriends();
  const requests = useFriendRequests();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Friends"
        description="Friends can see each other's playtime. Nobody else can."
      />

      <AddFriend />

      {requests.data && requests.data.length > 0 && (
        <Section title="Requests" count={requests.data.length}>
          <FriendRequests requests={requests.data} />
        </Section>
      )}

      <Section title="Your friends" count={friends.data?.length}>
        {friends.isError ? (
          <ErrorState
            title="We could not load your friends"
            onRetry={() => void friends.refetch()}
          />
        ) : friends.isPending ? (
          <ListSkeleton rows={3} />
        ) : friends.data.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No friends yet"
            description="Add someone by username above to compare playtime and see what they are playing."
          />
        ) : (
          <FriendList friends={friends.data} />
        )}
      </Section>
    </div>
  );
}
