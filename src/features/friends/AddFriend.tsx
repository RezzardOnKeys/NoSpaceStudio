import { AtSign, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import { useSendFriendRequest, useUserSearch } from './queries';
import { UserRow } from './UserRow';

const MIN_QUERY_LENGTH = 2;

/** Search for players by username and send them a friend request. */
export function AddFriend() {
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim());
  const search = useUserSearch(query);
  const sendRequest = useSendFriendRequest();

  const isSearching = query.length >= MIN_QUERY_LENGTH;

  return (
    <Card className="flex flex-col gap-4">
      <Input
        label="Add a friend"
        placeholder="Enter a username"
        icon={<AtSign />}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.target.value)}
        hint={isSearching ? undefined : 'Type at least 2 characters of their username.'}
      />

      {isSearching && (
        <div aria-live="polite">
          {search.isPending ? (
            <ListSkeleton rows={2} />
          ) : search.isError ? (
            <p className="text-sm text-danger">
              The search failed. Check your internet connection and try again.
            </p>
          ) : search.data.length === 0 ? (
            <p className="text-sm text-fg-muted">
              No player found whose name starts with “{query}”. Check the spelling. Friends and open
              requests are not listed here.
            </p>
          ) : (
            <ul className="-mx-2.5 flex flex-col gap-1">
              {search.data.map((profile) => (
                <UserRow
                  key={profile.id}
                  profile={profile}
                  actions={
                    <Button
                      size="sm"
                      icon={<UserPlus className="size-4" aria-hidden="true" />}
                      loading={sendRequest.isPending && sendRequest.variables === profile.id}
                      onClick={() => sendRequest.mutate(profile.id)}
                    >
                      Add
                    </Button>
                  }
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
